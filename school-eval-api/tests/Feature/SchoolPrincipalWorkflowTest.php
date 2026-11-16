<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\ImprovementPlan;
use App\Models\Indicator;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class SchoolPrincipalWorkflowTest extends TestCase
{
    use DatabaseTransactions;
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

    /**
     * 8. التحقق من بيانات البذر التجريبية (إجراءات 25% و 60% مع وجود مجال غير مجدول للشريط التنبيهي)
     */
    public function test_demo_seeder_populates_realistic_actions_and_preserves_unscheduled_area(): void
    {
        $planQuality = ImprovementPlan::where('school_id', $this->schoolFarouq->school_id)
            ->where('plan_type', ImprovementPlan::TYPE_QUALITY_IMPROVEMENT)
            ->firstOrFail();

        $res = $this->actingAs($this->principalFarouq, 'sanctum')
            ->getJson("/api/v1/improvement-plans/{$planQuality->plan_id}");

        $res->assertStatus(200);
        $actions = $res->json('data.actions');
        $areas = $res->json('data.areas');

        $this->assertNotEmpty($actions, 'يجب أن تحتوي خطة الجودة على إجراءات تجريبية واقعية.');
        $percentages = array_column($actions, 'completionPercentage');
        $this->assertContains(60, $percentages, 'يجب أن تتضمن الإجراءات نسبة إنجاز 60%.');
        $this->assertContains(25, $percentages, 'يجب أن تتضمن الإجراءات نسبة إنجاز 25%.');

        // التحقق من وجود مجال واحد على الأقل بانتظار صياغة الإجراءات (الخيار ب)
        $scheduledAreaIds = array_column($actions, 'areaId');
        $unscheduledAreas = array_filter($areas, fn($a) => !in_array($a['areaId'], $scheduledAreaIds));
        $this->assertNotEmpty($unscheduledAreas, 'يجب أن يتبقى مجال تحسين واحد على الأقل بانتظار صياغة إجراءاته لاختبار الشريط التنبيهي.');
    }

    /**
     * 9. حوكمة الصلاحيات: مدير المدرسة ممنوع من إنشاء إجراء تنفيذي (403) بينما المقيم المعتمد مصرح له (201)
     */
    public function test_principal_cannot_create_improvement_action_while_evaluator_can(): void
    {
        $planQuality = ImprovementPlan::where('school_id', $this->schoolFarouq->school_id)
            ->where('plan_type', ImprovementPlan::TYPE_QUALITY_IMPROVEMENT)
            ->firstOrFail();

        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        $area = $planQuality->areas()->firstOrFail();

        // 1. محاولة المدير إضافة إجراء -> 403 Forbidden
        $principalRes = $this->actingAs($this->principalFarouq, 'sanctum')
            ->postJson("/api/v1/improvement-plans/{$planQuality->plan_id}/actions", [
                'areaId'                       => $area->area_id,
                'title'                        => 'محاولة غير مصرح بها من المدير لإضافة إجراء',
                'responsiblePersonDescription' => 'مدير المدرسة',
                'startDate'                    => now()->toDateString(),
                'dueDate'                      => now()->addMonths(2)->toDateString(),
            ]);

        $principalRes->assertStatus(403);

        // 2. المقيم المعتمد يضيف الإجراء بنجاح -> 201 Created
        $evaluatorRes = $this->actingAs($evaluator, 'sanctum')
            ->postJson("/api/v1/improvement-plans/{$planQuality->plan_id}/actions", [
                'areaId'                       => $area->area_id,
                'title'                        => 'إجراء تنفيذي مضاف من المقيم المعتمد لمعالجة الفجوة',
                'responsiblePersonDescription' => 'فريق التطوير والتحسين المدرسي',
                'startDate'                    => now()->toDateString(),
                'dueDate'                      => now()->addMonths(2)->toDateString(),
                'completionPercentage'         => 10,
                'status'                       => 'InProgress',
            ]);

        $evaluatorRes->assertStatus(201)
            ->assertJsonPath('data.title', 'إجراء تنفيذي مضاف من المقيم المعتمد لمعالجة الفجوة');
    }

    /**
     * 10. التحقق من الحالة الصريحة للمجال (status) وانتقالاتها التلقائية (pending_action -> in_progress -> completed)
     */
    public function test_improvement_area_explicit_status_transitions_and_api_payload(): void
    {
        $planQuality = ImprovementPlan::where('school_id', $this->schoolFarouq->school_id)
            ->where('plan_type', ImprovementPlan::TYPE_QUALITY_IMPROVEMENT)
            ->firstOrFail();

        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();

        // 1. استعلام الخطة والتحقق من وجود حقل status في مصفوفة areas
        $res = $this->actingAs($evaluator, 'sanctum')
            ->getJson("/api/v1/improvement-plans/{$planQuality->plan_id}");

        $res->assertStatus(200);
        $areas = $res->json('data.areas');
        $this->assertNotEmpty($areas);
        foreach ($areas as $areaItem) {
            $this->assertArrayHasKey('status', $areaItem, 'يجب أن يتضمن كل مجال حالة صريحة (status)');
            $this->assertContains($areaItem['status'], ['pending_action', 'in_progress', 'completed']);
        }

        // 2. التحقق من وجود مجال بحالة pending_action
        $pendingArea = collect($areas)->firstWhere('status', 'pending_action');
        $this->assertNotNull($pendingArea, 'يجب أن يتوفر مجال تحسين بحالة pending_action لاختبار الانتقال');

        // 3. إضافة إجراء لهذا المجال -> ينتقل تلقائياً إلى in_progress
        $actionRes = $this->actingAs($evaluator, 'sanctum')
            ->postJson("/api/v1/improvement-plans/{$planQuality->plan_id}/actions", [
                'areaId'                       => $pendingArea['areaId'],
                'title'                        => 'إجراء تجريبي لاختبار انتقال حالة المجال',
                'responsiblePersonDescription' => 'منسق الجودة',
                'startDate'                    => now()->toDateString(),
                'dueDate'                      => now()->addMonths(1)->toDateString(),
                'completionPercentage'         => 30,
                'status'                       => 'InProgress',
            ]);

        $actionRes->assertStatus(201);
        $actionId = $actionRes->json('data.actionId');

        $areaModel = \App\Models\ImprovementArea::find($pendingArea['areaId']);
        $this->assertEquals('in_progress', $areaModel->status, 'إضافة إجراء يجب أن تنقل حالة المجال إلى in_progress');

        // 4. تحديث الإجراء ليكتمل بنسبة 100% -> ينتقل المجال إلى completed
        $updateRes = $this->actingAs($evaluator, 'sanctum')
            ->patchJson("/api/v1/improvement-plans/{$planQuality->plan_id}/actions/{$actionId}", [
                'completionPercentage' => 100,
                'status'               => 'Done',
            ]);

        $updateRes->assertStatus(200);
        $areaModel->refresh();
        $this->assertEquals('completed', $areaModel->status, 'اكتمال كافة إجراءات المجال يجب أن ينقل حالته إلى completed');
    }

    /**
     * 11. قفل الخطط المؤرشفة والمرفوعة: منع التعديل وإضافة أو تعديل الإجراءات التنفيذية (422 Unprocessable Entity)
     */
    public function test_archived_or_submitted_plan_is_locked_against_modifications(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        $planQuality = ImprovementPlan::where('school_id', $this->schoolFarouq->school_id)
            ->where('plan_type', ImprovementPlan::TYPE_QUALITY_IMPROVEMENT)
            ->firstOrFail();

        // تحويل الخطة إلى مؤرخة لاختبار القفل الصارم
        $planQuality->update(['status' => 'Archived']);
        $area = $planQuality->areas()->firstOrFail();

        // 1. محاولة تعديل بيانات الخطة المؤرشفة -> 422
        $updatePlanRes = $this->actingAs($evaluator, 'sanctum')
            ->patchJson("/api/v1/improvement-plans/{$planQuality->plan_id}", [
                'title' => 'عنوان معدل لخطة مؤرشفة',
            ]);
        $updatePlanRes->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        // 2. محاولة إضافة إجراء تنفيذي لخطة مؤرشفة -> 422
        $storeActionRes = $this->actingAs($evaluator, 'sanctum')
            ->postJson("/api/v1/improvement-plans/{$planQuality->plan_id}/actions", [
                'areaId'                       => $area->area_id,
                'title'                        => 'إجراء محظور على خطة مؤرشفة',
                'responsiblePersonDescription' => 'فريق الجودة',
                'startDate'                    => now()->toDateString(),
                'dueDate'                      => now()->addMonths(1)->toDateString(),
            ]);
        $storeActionRes->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        // 3. محاولة تعديل إجراء في خطة مؤرشفة -> 422
        $action = $planQuality->actions()->first();
        if ($action) {
            $updateActionRes = $this->actingAs($evaluator, 'sanctum')
                ->patchJson("/api/v1/improvement-plans/{$planQuality->plan_id}/actions/{$action->action_id}", [
                    'title' => 'تعديل محظور لإجراء',
                ]);
            $updateActionRes->assertStatus(422)
                ->assertJsonValidationErrors(['status']);
        }
    }

    /**
     * 12. مقترحات AI: تمييز التبني بالخطة النشطة (isAlreadyAdopted) عن التبني السابق بالخطة المؤرشفة (isPreviouslyAdopted)
     */
    public function test_suggestions_api_distinguishes_active_vs_archived_plan_adoption(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        $evaluation = Evaluation::where('school_id', $this->schoolFarouq->school_id)->firstOrFail();

        $res = $this->actingAs($evaluator, 'sanctum')
            ->getJson("/api/v1/evaluations/{$evaluation->evaluation_id}/improvement-suggestions");

        $res->assertStatus(200);
        $suggestions = $res->json('data.suggestions') ?? [];
        $this->assertNotEmpty($suggestions);

        // التحقق من بنية حقول التبني والإصدار
        foreach ($suggestions as $sugg) {
            $this->assertArrayHasKey('isAlreadyAdopted', $sugg);
            $this->assertArrayHasKey('isPreviouslyAdopted', $sugg);
            if ($sugg['isAlreadyAdopted'] && $sugg['adoptedPlan']) {
                $this->assertArrayHasKey('versionNumber', $sugg['adoptedPlan']);
                $this->assertTrue($sugg['adoptedPlan']['isCurrentPlan']);
            }
        }
    }

    /**
     * 13. مركز التدقيق والمراجعة الشاملة (Audit Hub): استرجاع المؤشرات الـ 109 والخطط والإقرار الإداري
     */
    public function test_audit_hub_endpoint_returns_comprehensive_data_for_principal_and_evaluator(): void
    {
        $principal = User::where('username', 'principal_farouq')->firstOrFail();
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();

        // فحص وصول مدير المدرسة للمركز
        $resPrincipal = $this->actingAs($principal, 'sanctum')
            ->getJson('/api/v1/evaluator/audit-hub');

        $resPrincipal->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'schoolId',
                    'schoolName',
                    'summary' => [
                        'totalIndicators',
                        'reviewedIndicatorsCount',
                        'pendingIndicatorsCount',
                        'reviewCoveragePercentage',
                        'plansCount',
                        'reviewedPlansCount',
                        'hasOpenCompletionRequest',
                        'finalReviewAcknowledged',
                    ],
                    'indicators',
                    'plans',
                    'completionRequest',
                    'finalReview' => [
                        'reportId',
                        'isGenerated',
                        'isLocked',
                        'hasPrincipalAcknowledgment',
                    ],
                ],
            ]);

        $summary = $resPrincipal->json('data.summary');
        $this->assertEquals(109, $summary['totalIndicators']);
        $this->assertGreaterThan(0, $summary['reviewedIndicatorsCount']);
        $this->assertNotEmpty($resPrincipal->json('data.plans'));

        // فحص وصول مقيم المدرسة لسجل التدقيق
        $resEvaluator = $this->actingAs($evaluator, 'sanctum')
            ->getJson('/api/v1/evaluator/audit-hub');

        $resEvaluator->assertStatus(200);
        $this->assertEquals($summary['totalIndicators'], $resEvaluator->json('data.summary.totalIndicators'));
    }

    /**
     * 14. مركز التدقيق والمراجعة: المدير يدون مراجعة إدارية سريعة بنجاح والمستخدم غير المصرح يُمنع
     */
    public function test_principal_can_submit_quick_review_note_from_audit_hub_and_unauthorized_user_is_forbidden(): void
    {
        $principal = User::where('username', 'principal_farouq')->firstOrFail();
        $indicator = Indicator::firstOrFail();

        // 1. تدوين ملاحظة مراجعة سريعة ناجحة من قبل المدير
        $res = $this->actingAs($principal, 'sanctum')
            ->postJson("/api/v1/evaluator/audit-hub/indicators/{$indicator->indicator_id}/review-note", [
                'text' => 'تم تدقيق هذا المؤشر إدارياً والتأكد من مطابقة شواهد البيئة المدرسية.',
            ]);

        $res->assertStatus(200)
            ->assertJsonPath('data.text', 'تم تدقيق هذا المؤشر إدارياً والتأكد من مطابقة شواهد البيئة المدرسية.')
            ->assertJsonPath('data.authorRole', 'مدير المدرسة');

        // 2. التحقق من فشل التحقق في حال كان النص فارغاً أو قصيراً جداً
        $resValidation = $this->actingAs($principal, 'sanctum')
            ->postJson("/api/v1/evaluator/audit-hub/indicators/{$indicator->indicator_id}/review-note", [
                'text' => 'لا',
            ]);
        $resValidation->assertStatus(422)
            ->assertJsonValidationErrors(['text']);

        // 3. مستخدم بدون صلاحية reviews.write أو evaluations.edit
        $guestUser = User::create([
            'school_id'     => $this->schoolFarouq->school_id,
            'username'      => 'guest_audit_' . uniqid(),
            'full_name'     => 'مستخدم ضيف',
            'email'         => 'guest_audit_' . uniqid() . '@example.com',
            'user_type'     => 'school',
            'password_hash' => bcrypt('password'),
            'status'        => 'active',
        ]);

        $resForbidden = $this->actingAs($guestUser, 'sanctum')
            ->postJson("/api/v1/evaluator/audit-hub/indicators/{$indicator->indicator_id}/review-note", [
                'text' => 'محاولة تدوين مراجعة غير مصرحة',
            ]);
        $resForbidden->assertStatus(403);
    }
}
