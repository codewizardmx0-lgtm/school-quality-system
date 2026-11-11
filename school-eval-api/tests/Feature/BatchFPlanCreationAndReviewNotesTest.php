<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\ImprovementArea;
use App\Models\ImprovementPlan;
use App\Models\Indicator;
use App\Models\PlanImprovementArea;
use App\Models\PlanReviewNote;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * اختبارات الحزم 3 و 4 و 5:
 * - إنشاء خطط التحسين الجديدة عبر مسار المقيم (POST /api/v1/evaluator/improvement-plans).
 * - تسجيل واسترجاع ملاحظات المراجعة الداخلية على الخطة (POST & GET review-notes).
 * - استدعاء السياق الاسترشادي الكمي للمؤشرات (GET indicators-context).
 * - استدعاء توصيات بنك الإجراءات النموذجية (GET action-recommendations).
 * - حماية قفل التقييم والأرشيف (422) ضد إنشاء الخطط.
 */
class BatchFPlanCreationAndReviewNotesTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * اختبار إنشاء خطة تحسين جديدة وربط مجالاتها تلقائياً وحمايتها من القفل.
     */
    public function test_evaluator_can_create_new_improvement_plan_and_link_areas(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        $school = School::where('identification_data', 'SCH-TAIZ-2026-001')->firstOrFail();

        // 1. إنشاء خطة تطوير مهني جديدة
        $response = $this->actingAs($evaluator, 'sanctum')
            ->postJson('/api/v1/evaluator/improvement-plans', [
                'title'     => 'خطة تطوير الكادر التعليمي التجريبية 2026',
                'planType'  => 'StaffProfessionalDevelopment',
                'startDate' => '2026-11-01',
                'endDate'   => '2027-04-30',
            ]);

        $response->assertStatus(201);
        $planId = $response->json('data.planId');
        $this->assertGreaterThan(0, $planId);
        $this->assertEquals('StaffProfessionalDevelopment', $response->json('data.planType'));
        $this->assertGreaterThanOrEqual(1, $response->json('data.areaCount'));

        // 2. التحقق من وجود السجل في قاعدة البيانات وربطه بمجالات التحسين
        $this->assertDatabaseHas('improvement_plans', [
            'plan_id'   => $planId,
            'school_id' => $school->school_id,
            'plan_type' => 'StaffProfessionalDevelopment',
            'title'     => 'خطة تطوير الكادر التعليمي التجريبية 2026',
        ]);

        $linkedAreas = PlanImprovementArea::where('plan_id', $planId)->count();
        $this->assertGreaterThan(0, $linkedAreas);

        // 3. التحقق من فشل التحقق عند فقدان العنوان
        $failRes = $this->actingAs($evaluator, 'sanctum')
            ->postJson('/api/v1/evaluator/improvement-plans', [
                'title' => '',
            ]);
        $failRes->assertStatus(422);
    }

    /**
     * اختبار تسجيل ملاحظات المراجعة الداخلية واسترجاعها مع خطة التحسين الحالية.
     */
    public function test_store_and_retrieve_plan_review_notes(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        $principal = User::where('username', 'principal_farouq')->firstOrFail();

        // 1. جلب الخطة الحالية
        $planRes = $this->actingAs($evaluator, 'sanctum')
            ->getJson('/api/v1/improvement-plans/current');
        $planRes->assertStatus(200);
        $planId = $planRes->json('data.planId');
        $this->assertGreaterThan(0, $planId);

        // 2. تدوين ملاحظة مراجعة من مدير المدرسة
        $noteRes = $this->actingAs($principal, 'sanctum')
            ->postJson("/api/v1/evaluator/improvement-plans/{$planId}/review-notes", [
                'text' => 'يرجى مراجعة الجدول الزمني لورش التدريب وتكثيف المتابعة الميدانية.',
            ]);

        $noteRes->assertStatus(201);
        $noteId = $noteRes->json('data.noteId');
        $this->assertGreaterThan(0, $noteId);
        $this->assertEquals('مدير مدرسة', $noteRes->json('data.roleArabic'));

        // 3. التحقق من ظهور الملاحظة في مصفوفة reviewNotes داخل الخطة الحالية
        $recheckRes = $this->actingAs($evaluator, 'sanctum')
            ->getJson('/api/v1/improvement-plans/current');
        $recheckRes->assertStatus(200);
        $notes = $recheckRes->json('data.reviewNotes');
        $this->assertIsArray($notes);
        $found = collect($notes)->firstWhere('noteId', $noteId);
        $this->assertNotNull($found);
        $this->assertStringContainsString('ورش التدريب', $found['text']);
    }

    /**
     * اختبار استدعاء السياق الاسترشادي للمؤشرات الكمية وتوصيات بنك الإجراءات.
     */
    public function test_indicators_context_and_action_recommendations_endpoints(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        $school = School::where('identification_data', 'SCH-TAIZ-2026-001')->firstOrFail();
        $evaluation = Evaluation::where('school_id', $school->school_id)->firstOrFail();

        // 1. استدعاء السياق الاسترشادي للمدرسة
        $contextRes = $this->actingAs($evaluator, 'sanctum')
            ->getJson("/api/v1/evaluations/{$evaluation->evaluation_id}/indicators-context");

        $contextRes->assertStatus(200);
        $this->assertArrayHasKey('indicators', $contextRes->json('data'));

        // 2. استدعاء توصيات بنك الإجراءات لمؤشر محدد
        $actionRes = $this->actingAs($evaluator, 'sanctum')
            ->getJson("/api/v1/evaluations/{$evaluation->evaluation_id}/action-recommendations?indicator_code=1.1.2");

        $actionRes->assertStatus(200);
        $this->assertArrayHasKey('recommendations', $actionRes->json('data'));
    }

    /**
     * اختبار حظر إنشاء الخطط على التقييمات المقفلة أو المقدمة برمز 422.
     */
    public function test_cannot_create_plan_on_locked_evaluation(): void
    {
        $evaluator = User::where('username', 'quality_belqees')->firstOrFail();
        $school = School::where('identification_data', 'SCH-AMANA-2026-001')->firstOrFail();
        $evaluation = Evaluation::where('school_id', $school->school_id)->firstOrFail();

        // قفل التقييم
        $evaluation->update(['status' => 'Completed']);

        $res = $this->actingAs($evaluator, 'sanctum')
            ->postJson('/api/v1/evaluator/improvement-plans', [
                'title' => 'محاولة إنشاء خطة لتقييم مقفل',
            ]);

        $res->assertStatus(422);
        $this->assertStringContainsString('لا يمكن إنشاء خطة تحسين', $res->json('message'));
    }
}
