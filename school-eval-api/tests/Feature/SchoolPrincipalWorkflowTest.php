<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\ImprovementPlan;
use App\Models\School;
use App\Models\User;
use Tests\TestCase;

class SchoolPrincipalWorkflowTest extends TestCase
{
    protected User $principalFarouq;
    protected User $principalBelqees;
    protected School $schoolFarouq;
    protected School $schoolBelqees;

    protected function setUp(): void
    {
        parent::setUp();

        $this->principalFarouq = User::where('username', 'principal_farouq')->firstOrFail();
        $this->principalBelqees = User::where('username', 'principal_belqees')->firstOrFail();
        $this->schoolFarouq = School::where('identification_data', 'SCH-TAIZ-2026-001')->firstOrFail();
        $this->schoolBelqees = School::where('identification_data', 'SCH-AMANA-2026-001')->firstOrFail();
    }

    /**
     * 1. مدير المدرسة يستطيع استعراض إحصائيات لوحة التحكم لمدرسته بنجاح
     */
    public function test_school_principal_can_fetch_dashboard_stats_for_own_school(): void
    {
        $res = $this->actingAs($this->principalFarouq, 'sanctum')
            ->getJson('/api/v1/evaluator/dashboard-stats');

        $res->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'schoolInfo' => [
                        'schoolId',
                        'schoolName',
                        'status',
                    ],
                    'kpis' => [
                        'completionPercentage',
                        'totalIndicators',
                        'scoredIndicators',
                    ],
                    'standardsProgress',
                ],
            ]);

        $this->assertEquals($this->schoolFarouq->school_id, $res->json('data.schoolInfo.schoolId'));
    }

    /**
     * 2. مدير المدرسة محظور من رصد درجات التقييم (403 Forbidden)
     */
    public function test_school_principal_cannot_score_indicator_returns_403(): void
    {
        $res = $this->actingAs($this->principalFarouq, 'sanctum')
            ->postJson('/api/v1/evaluation-results', [
                'indicatorId' => 1,
                'score'       => 3,
            ]);

        $res->assertStatus(403);
    }

    /**
     * 3. مدير المدرسة محظور من قفل واعتماد التقييم النهائي بالختم الرقمي (403 Forbidden)
     */
    public function test_school_principal_cannot_submit_final_evaluation_lock_returns_403(): void
    {
        $res = $this->actingAs($this->principalFarouq, 'sanctum')
            ->postJson('/api/v1/evaluation-submissions/submit', [
                'password' => 'DevTestPassword2026!',
                'notes'    => 'محاولة قفل غير مصرح بها من المدير',
            ]);

        $res->assertStatus(403);
    }

    /**
     * 4. مدير المدرسة يستطيع استعراض جرد الشواهد المدرسية
     */
    public function test_school_principal_can_fetch_evidence_inventory(): void
    {
        $res = $this->actingAs($this->principalFarouq, 'sanctum')
            ->getJson('/api/v1/evaluator/evidence-inventory');

        $res->assertStatus(200)
            ->assertJsonStructure([
                'data',
            ]);
    }

    /**
     * 5. مدير المدرسة يستطيع تدوين واعتماد الملاحظات الإدارية الداخلية
     */
    public function test_school_principal_can_store_and_view_internal_review_notes(): void
    {
        $noteText = 'تم استعراض ملف الشواهد واستمارة الرصد من قبل مدير المدرسة واعتمادها للإرسال.';

        $postRes = $this->actingAs($this->principalFarouq, 'sanctum')
            ->postJson('/api/v1/evaluator/internal-review-note', [
                'text' => $noteText,
            ]);

        $postRes->assertStatus(200)
            ->assertJsonPath('data.text', $noteText);

        $getRes = $this->actingAs($this->principalFarouq, 'sanctum')
            ->getJson('/api/v1/evaluator/internal-review-note');

        $getRes->assertStatus(200)
            ->assertJsonPath('data.text', $noteText)
            ->assertJsonPath('data.authorName', $this->principalFarouq->full_name);
    }

    /**
     * 6. مدير المدرسة يستطيع تدوين ملاحظة مراجعة على خطة التحسين وممنوع من تعديل الخطة (403)
     */
    public function test_school_principal_can_store_plan_review_note_but_cannot_modify_plan(): void
    {
        $plan = ImprovementPlan::where('school_id', $this->schoolFarouq->school_id)->first();
        if (!$plan) {
            $evalFarouq = Evaluation::where('school_id', $this->schoolFarouq->school_id)->firstOrFail();
            $plan = ImprovementPlan::create([
                'cycle_id'             => $evalFarouq->cycle_id,
                'school_id'            => $this->schoolFarouq->school_id,
                'created_by_user_id'   => $this->principalFarouq->user_id,
                'title'                => 'خطة تجريبية لاختبار ملاحظات المدير',
                'start_date'           => now()->toDateString(),
                'end_date'             => now()->addMonths(3)->toDateString(),
                'status'               => 'Draft',
                'progress_description' => 'NotStarted',
            ]);
        }

        // 1. كتابة ملاحظة مراجعة إدارية
        $noteRes = $this->actingAs($this->principalFarouq, 'sanctum')
            ->postJson("/api/v1/evaluator/improvement-plans/{$plan->plan_id}/review-notes", [
                'text' => 'تمت مراجعة خطة التحسين من قبل مدير المدرسة ونوصي بتركيز الجهود على الوسائل التعليمية.',
            ]);

        $noteRes->assertStatus(201)
            ->assertJsonPath('data.reviewerRole', 'school_principal');

        // 2. محاولة تعديل الخطة غير مصرح بها للمدير -> 403 Forbidden
        $modifyRes = $this->actingAs($this->principalFarouq, 'sanctum')
            ->patchJson("/api/v1/improvement-plans/{$plan->plan_id}", [
                'title' => 'عنوان معدل من المدير بشكل غير مصرح به',
            ]);

        $modifyRes->assertStatus(403);
    }

    /**
     * 7. العزل المؤسسي: مدير المدرسة محظور من الوصول أو التعليق على خطط مدرسة أخرى (404 Not Found)
     */
    public function test_school_principal_institutional_isolation_cannot_access_other_school(): void
    {
        $planBelqees = ImprovementPlan::where('school_id', $this->schoolBelqees->school_id)->first();
        if (!$planBelqees) {
            $evalBelqees = Evaluation::where('school_id', $this->schoolBelqees->school_id)->firstOrFail();
            $planBelqees = ImprovementPlan::create([
                'cycle_id'             => $evalBelqees->cycle_id,
                'school_id'            => $this->schoolBelqees->school_id,
                'created_by_user_id'   => $this->principalBelqees->user_id,
                'title'                => 'خطة بلقيس للعزل المؤسسي',
                'start_date'           => now()->toDateString(),
                'end_date'             => now()->addMonths(3)->toDateString(),
                'status'               => 'Draft',
                'progress_description' => 'NotStarted',
            ]);
        }

        // محاولة كتابة ملاحظة بواسطة مدير مدرسة الفاروق على خطة مدرسة بلقيس -> 404
        $crossRes = $this->actingAs($this->principalFarouq, 'sanctum')
            ->postJson("/api/v1/evaluator/improvement-plans/{$planBelqees->plan_id}/review-notes", [
                'text' => 'محاولة اختراق عزل مدرسي',
            ]);

        $crossRes->assertStatus(404);
    }
}
