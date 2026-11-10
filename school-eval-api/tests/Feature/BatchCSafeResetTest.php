<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\EvaluationResult;
use App\Models\EvidenceLink;
use App\Models\Indicator;
use App\Models\SchoolDocument;
use App\Models\Standard;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * اختبارات الحزمة ج: ميزة التصفير الآمن للمؤشر والمعيار (الملاحظتان 7 و 11)
 */
class BatchCSafeResetTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * التحقق من نجاح تصفير مؤشر واحد مع الإبقاء على الشواهد وظهوره في قائمة الاستيفاء
     */
    public function test_evaluator_can_reset_single_indicator_keeping_evidences(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        $evaluation = Evaluation::where('school_id', $evaluator->school_id)->firstOrFail();
        $indicator = Indicator::orderBy('indicator_id')->firstOrFail();
        $indId = $indicator->indicator_id;

        $linksBefore = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
            ->where('indicator_id', $indId)
            ->count();
        $docsBefore = SchoolDocument::where('school_id', $evaluator->school_id)->count();

        $this->assertGreaterThan(0, $linksBefore);

        $response = $this->actingAs($evaluator, 'sanctum')
            ->postJson("/api/v1/evaluator/indicators/{$indId}/reset", [
                'unlinkEvidences' => false,
            ]);

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('data.resetResultsCount'));
        $this->assertEquals(0, $response->json('data.unlinkedEvidencesCount'));

        // تم مسح النتيجة فقط مع بقاء روابط الشواهد والملفات دون مساس
        $this->assertNull(
            EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)->where('indicator_id', $indId)->first()
        );
        $this->assertEquals(
            $linksBefore,
            EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)->where('indicator_id', $indId)->count()
        );
        $this->assertEquals($docsBefore, SchoolDocument::where('school_id', $evaluator->school_id)->count());

        // التحقق من عودة المؤشر إلى قائمة العناصر بانتظار الاستيفاء
        $stats = $this->actingAs($evaluator, 'sanctum')->getJson('/api/v1/evaluator/dashboard-stats');
        $stats->assertStatus(200);
        $this->assertEquals(108, $stats->json('data.kpis.scoredIndicators'));
        $pendingIds = collect($stats->json('data.pendingIndicators'))->pluck('indicatorId')->all();
        $this->assertContains($indId, $pendingIds);
    }

    /**
     * التحقق من تصفير مؤشر مع خيار فك ارتباط الشواهد دون حذف الملفات الفيزيائية من المستودع
     */
    public function test_evaluator_can_reset_indicator_and_unlink_evidences_without_deleting_files(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        $evaluation = Evaluation::where('school_id', $evaluator->school_id)->firstOrFail();
        $indicator = Indicator::orderBy('indicator_id')->skip(1)->firstOrFail();
        $indId = $indicator->indicator_id;
        $docsBefore = SchoolDocument::where('school_id', $evaluator->school_id)->count();

        $response = $this->actingAs($evaluator, 'sanctum')
            ->postJson("/api/v1/evaluator/indicators/{$indId}/reset", [
                'unlinkEvidences' => true,
            ]);

        $response->assertStatus(200);
        $this->assertGreaterThan(0, $response->json('data.unlinkedEvidencesCount'));
        $this->assertEquals(
            0,
            EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)->where('indicator_id', $indId)->count()
        );
        // الملفات الأصلية بالوثائق لا تُحذف أبداً
        $this->assertEquals($docsBefore, SchoolDocument::where('school_id', $evaluator->school_id)->count());
    }

    /**
     * التحقق من نجاح تصفير معيار وطني كامل وعودة مؤشراته لقائمة الاستيفاء
     */
    public function test_evaluator_can_reset_entire_standard_safely(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        $standard = Standard::with('subStandards.indicators')->orderBy('standard_id', 'desc')->firstOrFail();
        $expectedCount = $standard->subStandards->flatMap(fn($s) => $s->indicators)->count();

        $response = $this->actingAs($evaluator, 'sanctum')
            ->postJson("/api/v1/evaluator/standards/{$standard->standard_id}/reset", [
                'unlinkEvidences' => false,
            ]);

        $response->assertStatus(200);
        $this->assertEquals($expectedCount, $response->json('data.affectedIndicatorsCount'));
        $this->assertEquals($expectedCount, $response->json('data.resetResultsCount'));

        $stats = $this->actingAs($evaluator, 'sanctum')->getJson('/api/v1/evaluator/dashboard-stats');
        $stats->assertStatus(200);
        $this->assertEquals(109 - $expectedCount, $stats->json('data.kpis.scoredIndicators'));
    }

    /**
     * التحقق من منع التصفير (للمؤشر والمعيار) برمز 422 عند قفل ملف التقييم
     */
    public function test_reset_is_blocked_with_422_when_evaluation_is_locked(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        $evaluation = Evaluation::where('school_id', $evaluator->school_id)->firstOrFail();
        $evaluation->update(['status' => 'Completed']);

        $indicator = Indicator::orderBy('indicator_id')->firstOrFail();
        $standard = Standard::orderBy('standard_id')->firstOrFail();

        $resInd = $this->actingAs($evaluator, 'sanctum')
            ->postJson("/api/v1/evaluator/indicators/{$indicator->indicator_id}/reset");
        $resInd->assertStatus(422);

        $resStd = $this->actingAs($evaluator, 'sanctum')
            ->postJson("/api/v1/evaluator/standards/{$standard->standard_id}/reset");
        $resStd->assertStatus(422);
    }

    /**
     * التحقق من منع مدير المدرسة من تصفير المؤشرات أو المعايير برمز 403
     */
    public function test_principal_cannot_reset_indicator_or_standard(): void
    {
        $principal = User::where('username', 'principal_farouq')->firstOrFail();
        $indicator = Indicator::orderBy('indicator_id')->firstOrFail();
        $standard = Standard::orderBy('standard_id')->firstOrFail();

        $resInd = $this->actingAs($principal, 'sanctum')
            ->postJson("/api/v1/evaluator/indicators/{$indicator->indicator_id}/reset");
        $resInd->assertStatus(403);

        $resStd = $this->actingAs($principal, 'sanctum')
            ->postJson("/api/v1/evaluator/standards/{$standard->standard_id}/reset");
        $resStd->assertStatus(403);
    }
}
