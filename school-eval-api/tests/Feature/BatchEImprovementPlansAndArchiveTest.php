<?php

namespace Tests\Feature;

use App\Models\DocumentVersion;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvidenceLink;
use App\Models\ImprovementArea;
use App\Models\ImprovementPlan;
use App\Models\Indicator;
use App\Models\PlanImprovementArea;
use App\Models\SchoolDocument;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * اختبارات إصلاحات الحزمة 1 العاجلة + الحزمة 2 + تحسينات UX:
 * - إصلاح multiLinkEvidence ودعم الوثائق غير المرتبطة في المستودع.
 * - تبويبات خطط التحسين الثلاث وقيد المفتاح المركب (plan_id, area_id).
 * - فلتر التقدير المستهدف (target_score=2 / 3) في مقترحات التحسين.
 * - استعراض الأرشيف التاريخي للقراءة فقط عبر X-Evaluation-Id وحظر التعديل (422).
 * - حقول تغطية المتطلبات في شجرة المعايير (UX-6).
 */
class BatchEImprovementPlansAndArchiveTest extends TestCase
{
    public function test_multi_link_and_unlinked_repository_state(): void
    {
        Storage::fake('local');

        $evaluator = User::where('username', 'quality_belqees')->firstOrFail();
        $indicators = Indicator::orderBy('indicator_id')->take(2)->get();
        $this->assertCount(2, $indicators);

        // 1. رفع ملف بدون ربط بمؤشر مباشرة في مستودع المدرسة
        $file = UploadedFile::fake()->create('unlinked_test.pdf', 120, 'application/pdf');
        $uploadRes = $this->actingAs($evaluator, 'sanctum')
            ->post('/api/v1/evidences/upload', [
                'file' => $file,
                'title' => 'ملف اختبار غير مرتبط',
            ]);
        $uploadRes->assertStatus(201);
        $docId = $uploadRes->json('data.documentId');
        $verId = $uploadRes->json('data.versionId');

        // 2. التحقق من ظهوره في المستودع بحالة غير مرتبط
        $repoRes = $this->actingAs($evaluator, 'sanctum')->getJson('/api/v1/evidences');
        $repoRes->assertStatus(200);
        $item = collect($repoRes->json('data.evidences'))->firstWhere('id', $verId);
        $this->assertNotNull($item);
        $this->assertTrue($item['isUnlinked']);
        $this->assertEquals('غير مرتبط بأي مؤشر', $item['indicatorTitle']);

        // 3. ربط متعدد باستخدام targetIndicatorIds و indicatorIds مع تحديد المتطلبات الإلزامية
        $req1 = \App\Models\IndicatorEvidenceRequirement::where('indicator_id', $indicators[0]->indicator_id)->where('required', true)->first();
        $req2 = \App\Models\IndicatorEvidenceRequirement::where('indicator_id', $indicators[1]->indicator_id)->where('required', true)->first();
        $coveredReqIds = array_values(array_filter([$req1?->requirement_id, $req2?->requirement_id]));

        $multiRes = $this->actingAs($evaluator, 'sanctum')
            ->postJson('/api/v1/evaluator/evidence-links/multi', [
                'documentId' => $docId,
                'versionId' => $verId,
                'targetIndicatorIds' => [$indicators[0]->indicator_id, $indicators[1]->indicator_id],
                'coveredRequirements' => $coveredReqIds,
                'justification' => 'اختبار ربط متعدد',
            ]);
        $multiRes->assertStatus(200)->assertJsonPath('data.linkedCount', 2);

        $linkIds = $multiRes->json('data.linkIds');
        $this->assertCount(2, $linkIds);

        // تنظيف ما بعد الاختبار
        EvidenceLink::whereIn('id', $linkIds)->delete();
        DocumentVersion::where('id', $verId)->delete();
        SchoolDocument::where('id', $docId)->delete();
    }

    public function test_improvement_plans_three_types_and_composite_area_key_enforcement(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();

        // 1. اختبار التبويبات الثلاثة
        foreach ([
            ImprovementPlan::TYPE_QUALITY_IMPROVEMENT,
            ImprovementPlan::TYPE_STAFF_DEVELOPMENT,
            ImprovementPlan::TYPE_ANNUAL_OPERATIONAL,
        ] as $type) {
            $res = $this->actingAs($evaluator, 'sanctum')
                ->getJson("/api/v1/improvement-plans/current?plan_type={$type}");
            $res->assertStatus(200)
                ->assertJsonPath('data.planType', $type);
        }

        // 2. اختبار المفتاح المركب (plan_id, area_id)
        $planRes = $this->actingAs($evaluator, 'sanctum')
            ->getJson('/api/v1/improvement-plans/current?plan_type=QualityImprovement');
        $planId = $planRes->json('data.planId');
        $areas = $planRes->json('data.areas');
        $this->assertNotEmpty($areas);
        $validAreaId = $areas[0]['areaId'];

        // إنشاء مجال خارج هذه الخطة لمدرسة أخرى أو غير مربوط
        $outsideArea = ImprovementArea::create([
            'indicator_id' => Indicator::first()->indicator_id,
            'name' => 'مجال خارج الخطة للاختبار',
            'priority' => 'Low',
            'target_score' => 3,
        ]);

        // رفض ربط إجراء بمجال خارج الخطة (422)
        $badRes = $this->actingAs($evaluator, 'sanctum')
            ->postJson('/api/v1/improvement-actions', [
                'planId' => $planId,
                'areaId' => $outsideArea->area_id,
                'title' => 'إجراء غير شرعي',
            ]);
        $badRes->assertStatus(422)->assertJsonValidationErrors(['areaId']);

        // قبول ربط إجراء بمجال منتمٍ للخطة (201)
        $goodRes = $this->actingAs($evaluator, 'sanctum')
            ->postJson('/api/v1/improvement-actions', [
                'planId' => $planId,
                'areaId' => $validAreaId,
                'title' => 'إجراء تنفيذي مطابق للمفتاح المركب',
                'leader' => 'مسؤول الجودة',
            ]);
        $goodRes->assertStatus(201)
            ->assertJsonPath('data.areaId', $validAreaId);

        // تنظيف الإجراء والمجال الاختباري
        \App\Models\ImprovementAction::where('action_id', $goodRes->json('data.actionId'))->delete();
        $outsideArea->delete();
    }

    public function test_improvement_suggestions_target_score_filter(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();

        $res3 = $this->actingAs($evaluator, 'sanctum')
            ->getJson('/api/v1/evaluator/improvement-suggestions?target_score=3');
        $res2 = $this->actingAs($evaluator, 'sanctum')
            ->getJson('/api/v1/evaluator/improvement-suggestions?target_score=2');

        $res3->assertStatus(200);
        $res2->assertStatus(200);

        $count3 = count($res3->json('data.suggestions') ?? []);
        $count2 = count($res2->json('data.suggestions') ?? []);

        $this->assertGreaterThanOrEqual($count2, $count3);
        foreach (($res2->json('data.suggestions') ?? []) as $sugg) {
            $this->assertLessThan(2, $sugg['score']);
        }
    }

    public function test_archive_cycle_selection_is_read_only_and_tree_has_coverage_counts(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();

        // 1. فحص شجرة المعايير وحقول تغطية المتطلبات (UX-6)
        $treeRes = $this->actingAs($evaluator, 'sanctum')
            ->getJson('/api/v1/standard-versions/active/tree');
        $treeRes->assertStatus(200);
        $firstStd = $treeRes->json('data.standards.0');
        $this->assertArrayHasKey('totalMandatoryRequirements', $firstStd['stats']);
        $this->assertArrayHasKey('coveredRequirements', $firstStd['stats']);

        $firstInd = $firstStd['subStandards'][0]['indicators'][0];
        $this->assertArrayHasKey('mandatoryRequirementsCount', $firstInd);
        $this->assertArrayHasKey('coveredRequirementsCount', $firstInd);

        // 2. اختبار اختيار دورة سابقة مغلقة للأرشيف وحظر التعديل عليها
        $closedCycle = EvaluationCycle::create([
            'academic_year' => '2024/2025',
            'start_date' => '2024-09-01',
            'end_date' => '2025-06-30',
            'standard_version_id' => EvaluationCycle::first()->standard_version_id,
            'version_id' => EvaluationCycle::first()->version_id,
            'status' => 'Closed',
        ]);

        $archivedEval = Evaluation::create([
            'school_id' => $evaluator->school_id,
            'cycle_id' => $closedCycle->cycle_id,
            'created_by_user_id' => $evaluator->user_id,
            'status' => 'Completed',
        ]);

        // قراءة لوحة التحكم للدورة المؤرشفة تنجح (200)
        $dashRes = $this->actingAs($evaluator, 'sanctum')
            ->withHeaders(['X-Evaluation-Id' => (string) $archivedEval->evaluation_id])
            ->getJson('/api/v1/evaluator/dashboard-stats');
        $dashRes->assertStatus(200)
            ->assertJsonPath('data.schoolInfo.academicYear', '2024/2025');

        // محاولة التعديل على الدورة المؤرشفة تُرفض بحظر القراءة فقط (422)
        $editRes = $this->actingAs($evaluator, 'sanctum')
            ->withHeaders(['X-Evaluation-Id' => (string) $archivedEval->evaluation_id])
            ->postJson('/api/v1/evaluation-results', [
                'indicatorId' => $firstInd['indicatorId'],
                'score' => 3,
            ]);
        $editRes->assertStatus(422);

        // تنظيف الأرشيف الاختباري
        $archivedEval->delete();
        $closedCycle->delete();
    }
}
