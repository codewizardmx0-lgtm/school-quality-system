<?php

namespace Tests\Feature;

use App\Models\DocumentVersion;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvidenceLink;
use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\SchoolDocument;
use App\Models\User;
use App\Services\EvidenceSufficiencyService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * اختبارات الحزمة 1 (IMP-01, IMP-02, IMP-03):
 * - ديناميكية أدوات التحقق في شجرة المعايير.
 * - مرونة الشاهد الشامل لتغطية أكثر من متطلب إلزامي بملف واحد دون فك قيد التفرّد.
 * - تحديث المتطلبات المغطاة عبر PATCH وحماية القفل والصلاحيات.
 * - تطابق بيانات مدرسة الفاروق مع المتطلبات المعيارية الـ 278.
 */
class BatchDVerificationAndSufficiencyTest extends TestCase
{
    public function test_active_standards_tree_returns_dynamic_verification_methods_per_indicator(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();

        $response = $this->actingAs($evaluator, 'sanctum')
            ->getJson('/api/v1/standard-versions/active/tree');

        $response->assertStatus(200);
        $standards = $response->json('data.standards');
        $this->assertNotEmpty($standards);

        $foundWithMethods = false;
        foreach ($standards as $std) {
            foreach ($std['subStandards'] as $sub) {
                foreach ($sub['indicators'] as $ind) {
                    $this->assertArrayHasKey('verificationMethods', $ind);
                    if (count($ind['verificationMethods']) > 0) {
                        $foundWithMethods = true;
                        $this->assertArrayHasKey('id', $ind['verificationMethods'][0]);
                        $this->assertArrayHasKey('name', $ind['verificationMethods'][0]);
                        break 3;
                    }
                }
            }
        }

        $this->assertTrue($foundWithMethods, 'يجب أن يعيد المسار أساليب التحقق الديناميكية للمؤشرات من قاعدة البيانات.');
    }

    public function test_single_document_covering_multiple_mandatory_requirements_is_sufficient(): void
    {
        Storage::fake('local');

        $evaluator = User::where('username', 'quality_belqees')->firstOrFail();

        // اختيار مؤشر له متطلبان إلزاميان على الأقل
        $targetIndId = IndicatorEvidenceRequirement::where('required', true)
            ->selectRaw('indicator_id, COUNT(*) as cnt')
            ->groupBy('indicator_id')
            ->having('cnt', '>=', 2)
            ->value('indicator_id');

        $this->assertNotNull($targetIndId);
        $indicator = Indicator::with('evidenceRequirements')->findOrFail($targetIndId);
        $mandatoryIds = $indicator->evidenceRequirements
            ->where('required', true)
            ->pluck('requirement_id')
            ->values()
            ->all();

        $this->assertGreaterThanOrEqual(2, count($mandatoryIds));

        // التأكد من نظافة روابط هذا المؤشر لتقييم بلقيس أولاً
        $evaluation = Evaluation::where('school_id', $evaluator->school_id)
            ->orderBy('evaluation_id', 'desc')
            ->first();
        if (!$evaluation) {
            $cycle = EvaluationCycle::where('status', 'Active')->firstOrFail();
            $evaluation = Evaluation::create([
                'school_id' => $evaluator->school_id,
                'cycle_id' => $cycle->cycle_id,
                'created_by_user_id' => $evaluator->user_id,
                'status' => 'InProgress',
            ]);
        }

        EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
            ->where('indicator_id', $indicator->indicator_id)
            ->delete();

        // رفع ملف واحد فقط يغطي كافة المتطلبات الإلزامية لهذا المؤشر
        $file = UploadedFile::fake()->create('comprehensive_plan_and_vision.pdf', 150, 'application/pdf');
        $uploadRes = $this->actingAs($evaluator, 'sanctum')
            ->post('/api/v1/evidences/upload', [
                'file' => $file,
                'title' => 'الخطة الاستراتيجية والرؤية الشاملة',
                'indicatorId' => $indicator->indicator_id,
                'coveredRequirements' => json_encode($mandatoryIds),
            ]);

        $uploadRes->assertStatus(201);
        $linkId = $uploadRes->json('data.linkId');
        $this->assertNotNull($linkId);

        $link = EvidenceLink::findOrFail($linkId);
        $this->assertEquals($mandatoryIds, $link->covered_requirements);

        // التحقق من حساب الكفاية عبر الخدمة الموحدة: ملف واحد يغطي كل المتطلبات => مكتمل 100%
        $sufficiencyService = app(EvidenceSufficiencyService::class);
        $evalReport = $sufficiencyService->evaluateEvaluation($evaluation);

        $indEval = collect($evalReport['standards'])
            ->flatMap(fn ($s) => $s['indicators'])
            ->firstWhere('indicator_id', $indicator->indicator_id);

        $this->assertNotNull($indEval);
        $this->assertEquals(1, $indEval['valid_evidence_count']);
        $this->assertEquals(count($mandatoryIds), $indEval['effective_covered_count']);
        $this->assertTrue($indEval['is_sufficient']);
        $this->assertEquals(0, $indEval['missing_count']);
        $this->assertEquals(100.0, $indEval['completion_rate']);

        // تنظيف ما بعد الاختبار
        $link->delete();
    }

    public function test_update_covered_requirements_endpoint_and_security_guards(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        $principal = User::where('username', 'principal_farouq')->firstOrFail();

        $evaluation = Evaluation::where('school_id', $evaluator->school_id)
            ->orderBy('evaluation_id', 'desc')
            ->firstOrFail();

        $link = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)->firstOrFail();
        $reqIds = IndicatorEvidenceRequirement::where('indicator_id', $link->indicator_id)
            ->where('required', true)
            ->pluck('requirement_id')
            ->values()
            ->all();

        // 1. مدير المدرسة ممنوع من التعديل (403)
        $this->actingAs($principal, 'sanctum')
            ->patchJson("/api/v1/evidence-links/{$link->id}/covered-requirements", [
                'coveredRequirements' => $reqIds,
            ])
            ->assertStatus(403);

        // 2. المقيم ينجح في التحديث، مع تجاهل أي معرف متطلب لا يتبع المؤشر
        $res = $this->actingAs($evaluator, 'sanctum')
            ->patchJson("/api/v1/evidence-links/{$link->id}/covered-requirements", [
                'coveredRequirements' => array_merge($reqIds, [999999]),
            ]);

        $res->assertStatus(200)
            ->assertJsonPath('data.coveredRequirements', $reqIds);

        // 3. منع التعديل إذا كان التقييم مقفلاً (422)
        $origStatus = $evaluation->status;
        $evaluation->status = 'Submitted';
        $evaluation->save();

        $this->actingAs($evaluator, 'sanctum')
            ->patchJson("/api/v1/evidence-links/{$link->id}/covered-requirements", [
                'coveredRequirements' => $reqIds,
            ])
            ->assertStatus(422);

        $evaluation->status = $origStatus;
        $evaluation->save();
    }

    public function test_farouq_seeder_generates_exact_278_requirement_matched_evidences(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();

        $response = $this->actingAs($evaluator, 'sanctum')
            ->getJson('/api/v1/evaluator/dashboard-stats');

        $response->assertStatus(200);
        $kpis = $response->json('data.kpis');

        $this->assertGreaterThanOrEqual(109, $kpis['documentedEvidences']);
        $this->assertEquals(278, $kpis['targetEvidences']);
        $this->assertEquals(109, $kpis['coveredIndicatorsCount']);
        $this->assertEquals(45, $kpis['uniqueDocumentsCount']);
    }
}
