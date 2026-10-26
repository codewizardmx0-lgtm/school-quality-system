<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\ImprovementAction;
use App\Models\ImprovementArea;
use App\Models\ImprovementPlan;
use App\Models\Indicator;
use App\Models\IndicatorScoreDescriptor;
use App\Models\PlanImprovementArea;
use App\Models\PlanReviewNote;
use App\Models\School;
use App\Models\StandardVersion;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات الميزة للشريحة الثالثة:
 * خطط التحسين المدرسي وإجراءاتها وملاحظات المراجعة واقتراحات التحسين.
 */
class ImprovementPlanFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $evaluatorBelqees;
    protected User $evaluatorFarouq;
    protected User $principalBelqees;
    protected User $principalFarouq;
    protected User $adminUser;
    protected School $schoolBelqees;
    protected School $schoolFarouq;
    protected EvaluationCycle $cycle;
    protected Evaluation $evaluationBelqees;
    protected EvaluationResult $resultBelqeesLow;
    protected EvaluationResult $resultBelqeesMed;
    protected EvaluationResult $resultBelqeesHigh;

    protected function setUp(): void
    {
        parent::setUp();

        $this->schoolBelqees = School::where('identification_data', 'SCH-SANAA-2026-001')->firstOrFail();
        $this->schoolFarouq  = School::where('identification_data', 'SCH-TAIZ-2026-002')->firstOrFail();

        $this->evaluatorBelqees = User::where('username', 'quality_belqees')->firstOrFail();
        $this->evaluatorFarouq  = User::where('username', 'quality_farouq')->firstOrFail();
        $this->principalBelqees = User::where('username', 'principal_belqees')->firstOrFail();
        $this->principalFarouq  = User::where('username', 'principal_farouq')->firstOrFail();
        $this->adminUser        = User::where('username', 'admin')->firstOrFail();

        $this->cycle = EvaluationCycle::firstOrFail();

        // إعداد تقييم لمدرسة بلقيس
        $this->evaluationBelqees = Evaluation::firstOrCreate(
            [
                'cycle_id'  => $this->cycle->cycle_id,
                'school_id' => $this->schoolBelqees->school_id,
            ],
            [
                'created_by_user_id' => $this->evaluatorBelqees->user_id,
                'status'             => 'InProgress',
            ]
        );

        $indicators = Indicator::orderBy('indicator_id')->take(3)->get();

        // نتيجة تقييم منخفضة (درجة 1 -> High Priority)
        $desc1 = IndicatorScoreDescriptor::where('indicator_id', $indicators[0]->indicator_id)->first();

        $stdVerId = $this->cycle->version_id ?? StandardVersion::value('version_id');

        $this->resultBelqeesLow = EvaluationResult::updateOrCreate(
            [
                'evaluation_id' => $this->evaluationBelqees->evaluation_id,
                'indicator_id'  => $indicators[0]->indicator_id,
            ],
            [
                'cycle_id'            => $this->cycle->cycle_id,
                'standard_version_id' => $stdVerId,
                'evaluator_user_id'   => $this->evaluatorBelqees->user_id,
                'score'               => 1,
                'score_descriptor_id' => $desc1?->descriptor_id,
                'completion_status'   => 'Completed',
            ]
        );

        // نتيجة تقييم متوسطة (درجة 2 -> Medium Priority)
        $desc2 = IndicatorScoreDescriptor::where('indicator_id', $indicators[1]->indicator_id)->first();

        $this->resultBelqeesMed = EvaluationResult::updateOrCreate(
            [
                'evaluation_id' => $this->evaluationBelqees->evaluation_id,
                'indicator_id'  => $indicators[1]->indicator_id,
            ],
            [
                'cycle_id'            => $this->cycle->cycle_id,
                'standard_version_id' => $stdVerId,
                'evaluator_user_id'   => $this->evaluatorBelqees->user_id,
                'score'               => 2,
                'score_descriptor_id' => $desc2?->descriptor_id,
                'completion_status'   => 'Completed',
            ]
        );

        // نتيجة تقييم مستهدفة (درجة 3 -> لا تدخل ضمن الاقتراحات)
        $desc3 = IndicatorScoreDescriptor::where('indicator_id', $indicators[2]->indicator_id)->first();

        $this->resultBelqeesHigh = EvaluationResult::updateOrCreate(
            [
                'evaluation_id' => $this->evaluationBelqees->evaluation_id,
                'indicator_id'  => $indicators[2]->indicator_id,
            ],
            [
                'cycle_id'            => $this->cycle->cycle_id,
                'standard_version_id' => $stdVerId,
                'evaluator_user_id'   => $this->evaluatorBelqees->user_id,
                'score'               => 3,
                'score_descriptor_id' => $desc3?->descriptor_id,
                'completion_status'   => 'Completed',
            ]
        );
    }

    /**
     * 1. مصفوفة الصلاحيات: رفض وصول المستخدم غير المخول (403 Forbidden).
     */
    public function test_unauthorized_user_cannot_manage_plans_and_areas(): void
    {
        Sanctum::actingAs($this->adminUser); // مسؤول النظام لا يملك plans.manage

        $resAreas = $this->postJson('/api/v1/improvement-areas', [
            'resultId' => $this->resultBelqeesLow->result_id,
            'name'     => 'مجال تجريبي',
            'priority' => 'High',
        ]);
        $resAreas->assertStatus(403);

        $resPlans = $this->postJson('/api/v1/improvement-plans', [
            'cycleId'   => $this->cycle->cycle_id,
            'title'     => 'خطة تجريبية',
            'startDate' => '2026-10-01',
            'endDate'   => '2026-12-31',
            'areaIds'   => [1],
        ]);
        $resPlans->assertStatus(403);
    }

    /**
     * 2. العزل المؤسسي (القرار 9): إرجاع 404 عند محاولة الوصول لموارد مدرسة أخرى.
     */
    public function test_tenant_isolation_returns_404_for_cross_school_access(): void
    {
        Sanctum::actingAs($this->evaluatorFarouq); // مقيم مدرسة الفاروق

        // محاولة جلب اقتراحات تقييم مدرسة بلقيس -> 404
        $res = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/improvement-suggestions");
        $res->assertStatus(404);

        // محاولة إنشاء مجال تحسين معتمد على نتيجة مدرسة بلقيس -> 404
        $resArea = $this->postJson('/api/v1/improvement-areas', [
            'resultId' => $this->resultBelqeesLow->result_id,
            'name'     => 'محاولة اختراق عزل',
            'priority' => 'High',
        ]);
        $resArea->assertStatus(404);
    }

    /**
     * 3. اقتراحات التحسين: احتساب الاقتراحات للدرجات الأقل من 3 مع الأولويات المقترحة.
     */
    public function test_improvement_suggestions_generated_for_scores_below_target(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $res = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/improvement-suggestions");
        $res->assertStatus(200)
            ->assertJsonPath('data.targetScore', 3)
            ->assertJsonPath('data.meta.totalSuggestions', 2); // درجتا 1 و 2 فقط دون 3

        $suggestions = collect($res->json('data.suggestions'));

        $lowSuggestion = $suggestions->firstWhere('resultId', $this->resultBelqeesLow->result_id);
        $this->assertNotNull($lowSuggestion);
        $this->assertEquals('High', $lowSuggestion['suggestedPriority']);
        $this->assertFalse($lowSuggestion['isAlreadyAdopted']);

        $medSuggestion = $suggestions->firstWhere('resultId', $this->resultBelqeesMed->result_id);
        $this->assertNotNull($medSuggestion);
        $this->assertEquals('Medium', $medSuggestion['suggestedPriority']);
    }

    /**
     * 4. تغيير الإعداد: تغيير target_score ينعكس فوراً على توليد الاقتراحات.
     */
    public function test_target_score_config_change_affects_suggestions(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        config(['evaluation.target_score' => 2]);

        $res = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/improvement-suggestions");
        $res->assertStatus(200)
            ->assertJsonPath('data.targetScore', 2)
            ->assertJsonPath('data.meta.totalSuggestions', 1); // فقط درجة 1
    }

    /**
     * 5. إنشاء وتحديث مجال التحسين وتبني الاقتراح (improvement_areas).
     */
    public function test_create_and_update_improvement_area(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // إنشاء مجال بالتبني
        $createRes = $this->postJson('/api/v1/improvement-areas', [
            'resultId'    => $this->resultBelqeesLow->result_id,
            'name'        => 'تطوير القيادة التربوية والإدارية',
            'description' => 'رفع كفاءة التوثيق والمتابعة الدورية',
            'priority'    => 'High',
        ]);

        $createRes->assertStatus(201)
            ->assertJsonPath('data.resultId', $this->resultBelqeesLow->result_id)
            ->assertJsonPath('data.priority', 'High');

        $areaId = $createRes->json('data.areaId');

        // التحقق من أن الاقتراح أصبح معلماً كـ isAlreadyAdopted = true
        $suggRes = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/improvement-suggestions");
        $lowSuggestion = collect($suggRes->json('data.suggestions'))->firstWhere('resultId', $this->resultBelqeesLow->result_id);
        $this->assertTrue($lowSuggestion['isAlreadyAdopted']);

        // تحديث مجال التحسين
        $updateRes = $this->patchJson("/api/v1/improvement-areas/{$areaId}", [
            'name'     => 'تطوير القيادة التربوية (محدث)',
            'priority' => 'Medium',
        ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('data.name', 'تطوير القيادة التربوية (محدث)')
            ->assertJsonPath('data.priority', 'Medium');
    }

    /**
     * 6. التحقق من صحة المدخلات: إنشاء خطة يشترط مجالاً واحداً على الأقل (422).
     */
    public function test_create_improvement_plan_requires_at_least_one_area_422(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $res = $this->postJson('/api/v1/improvement-plans', [
            'cycleId'   => $this->cycle->cycle_id,
            'title'     => 'خطة بدون مجالات',
            'startDate' => '2026-11-01',
            'endDate'   => '2026-12-31',
            'areaIds'   => [],
        ]);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['areaIds']);
    }

    /**
     * 7. إنشاء خطة تحسين متكاملة بمسودة أولية وربط المجالات (plan_improvement_areas).
     */
    public function test_create_improvement_plan_success(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // إنشاء مجال أولاً
        $area = ImprovementArea::create([
            'result_id'    => $this->resultBelqeesLow->result_id,
            'indicator_id' => $this->resultBelqeesLow->indicator_id,
            'name'         => 'مجال خطة التجربة',
            'priority'     => 'High',
        ]);

        $res = $this->postJson('/api/v1/improvement-plans', [
            'cycleId'   => $this->cycle->cycle_id,
            'title'     => 'خطة التطوير الشاملة للفصل الأول',
            'startDate' => '2026-11-01',
            'endDate'   => '2027-01-31',
            'areaIds'   => [$area->area_id],
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('data.status', 'Draft')
            ->assertJsonPath('data.overallProgress', 'NotStarted')
            ->assertJsonPath('data.overview.totalAreas', 1);

        $planId = $res->json('data.planId');

        $this->assertDatabaseHas('plan_improvement_areas', [
            'plan_id' => $planId,
            'area_id' => $area->area_id,
        ]);
    }

    /**
     * 8. قيد المفتاح الأجنبي المركب (plan_id, area_id): رفض ربط إجراء بمجال خارج مجالات الخطة (422).
     */
    public function test_action_composite_key_enforcement(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // إنشاء مجالين: الأول في الخطة والثاني خارجها
        $areaInPlan = ImprovementArea::create([
            'result_id'    => $this->resultBelqeesLow->result_id,
            'indicator_id' => $this->resultBelqeesLow->indicator_id,
            'name'         => 'مجال داخل الخطة',
            'priority'     => 'High',
        ]);

        $areaOutsidePlan = ImprovementArea::create([
            'result_id'    => $this->resultBelqeesMed->result_id,
            'indicator_id' => $this->resultBelqeesMed->indicator_id,
            'name'         => 'مجال خارج الخطة',
            'priority'     => 'Medium',
        ]);

        $plan = ImprovementPlan::create([
            'cycle_id'             => $this->cycle->cycle_id,
            'school_id'            => $this->schoolBelqees->school_id,
            'created_by_user_id'   => $this->evaluatorBelqees->user_id,
            'title'                => 'خطة اختبار المفتاح المركب',
            'start_date'           => '2026-11-01',
            'end_date'             => '2027-01-31',
            'status'               => 'Draft',
            'progress_description' => 'NotStarted',
        ]);

        PlanImprovementArea::create([
            'plan_id'    => $plan->plan_id,
            'area_id'    => $areaInPlan->area_id,
            'created_at' => now(),
        ]);

        // محاولة ربط إجراء بالمجال الخارج عن الخطة -> 422
        $resInvalid = $this->postJson("/api/v1/improvement-plans/{$plan->plan_id}/actions", [
            'areaId'                       => $areaOutsidePlan->area_id,
            'title'                        => 'إجراء غير شرعي',
            'responsiblePersonDescription' => 'منسق التدريب',
            'startDate'                    => '2026-11-05',
            'dueDate'                      => '2026-11-20',
        ]);

        $resInvalid->assertStatus(422)
            ->assertJsonValidationErrors(['areaId']);

        // ربط إجراء بالمجال المعتمد في الخطة -> 201 نجاح
        $resValid = $this->postJson("/api/v1/improvement-plans/{$plan->plan_id}/actions", [
            'areaId'                       => $areaInPlan->area_id,
            'title'                        => 'إجراء شرعي ومعتمد',
            'responsiblePersonDescription' => 'رئيس قسم الجودة بالمدرسة',
            'startDate'                    => '2026-11-05',
            'dueDate'                      => '2026-11-20',
        ]);

        $resValid->assertStatus(201)
            ->assertJsonPath('data.areaId', $areaInPlan->area_id)
            ->assertJsonPath('data.status', 'Pending');
    }

    /**
     * 9. احتساب حالة التأخر ديناميكياً (isDelayed) والتحقق من التواريخ.
     */
    public function test_action_is_delayed_computed_dynamically(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $area = ImprovementArea::create([
            'result_id'    => $this->resultBelqeesLow->result_id,
            'indicator_id' => $this->resultBelqeesLow->indicator_id,
            'name'         => 'مجال اختبار التأخر',
            'priority'     => 'High',
        ]);

        $plan = ImprovementPlan::create([
            'cycle_id'             => $this->cycle->cycle_id,
            'school_id'            => $this->schoolBelqees->school_id,
            'created_by_user_id'   => $this->evaluatorBelqees->user_id,
            'title'                => 'خطة اختبار التأخر',
            'start_date'           => '2026-09-01',
            'end_date'             => '2026-12-31',
            'status'               => 'Draft',
            'progress_description' => 'NotStarted',
        ]);

        PlanImprovementArea::create([
            'plan_id'    => $plan->plan_id,
            'area_id'    => $area->area_id,
            'created_at' => now(),
        ]);

        // إجراء منتهي الصلاحية بحالة Pending -> isDelayed = true
        $action = ImprovementAction::create([
            'plan_id'                        => $plan->plan_id,
            'area_id'                        => $area->area_id,
            'title'                          => 'إجراء متأخر',
            'responsible_person_description' => 'مسؤول المعامل',
            'start_date'                     => '2026-09-01',
            'due_date'                       => '2026-10-01', // قبل تاريخ اليوم (2026-10-26)
            'status'                         => 'Pending',
            'progress_description'           => 'NotStarted',
        ]);

        $showRes = $this->getJson("/api/v1/improvement-plans/{$plan->plan_id}");
        $showRes->assertStatus(200)
            ->assertJsonPath('data.overview.delayedActions', 1)
            ->assertJsonPath('data.actions.0.isDelayed', true);

        // عند تحديث الإجراء إلى Done -> isDelayed = false
        $updateActionRes = $this->patchJson("/api/v1/improvement-plans/{$plan->plan_id}/actions/{$action->action_id}", [
            'status' => 'Done',
        ]);

        $updateActionRes->assertStatus(200)
            ->assertJsonPath('data.isDelayed', false);
    }

    /**
     * 10. دورة حياة الخطة: قيود التفعيل (Active) والإكمال (Completed).
     */
    public function test_plan_lifecycle_transitions_and_rules(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $area = ImprovementArea::create([
            'result_id'    => $this->resultBelqeesLow->result_id,
            'indicator_id' => $this->resultBelqeesLow->indicator_id,
            'name'         => 'مجال دورة الحياة',
            'priority'     => 'High',
        ]);

        $plan = ImprovementPlan::create([
            'cycle_id'             => $this->cycle->cycle_id,
            'school_id'            => $this->schoolBelqees->school_id,
            'created_by_user_id'   => $this->evaluatorBelqees->user_id,
            'title'                => 'خطة دورة الحياة',
            'start_date'           => '2026-11-01',
            'end_date'             => '2027-02-28',
            'status'               => 'Draft',
            'progress_description' => 'NotStarted',
        ]);

        PlanImprovementArea::create([
            'plan_id'    => $plan->plan_id,
            'area_id'    => $area->area_id,
            'created_at' => now(),
        ]);

        // 1. محاولة التفعيل دون وجود إجراءات -> 422
        $resActivateFail = $this->patchJson("/api/v1/improvement-plans/{$plan->plan_id}", [
            'status' => 'Active',
        ]);
        $resActivateFail->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        // إضافة إجراء تنفيذي
        $action = ImprovementAction::create([
            'plan_id'                        => $plan->plan_id,
            'area_id'                        => $area->area_id,
            'title'                          => 'إجراء أولي',
            'responsible_person_description' => 'مسؤول التدريب',
            'start_date'                     => '2026-11-01',
            'due_date'                       => '2026-12-01',
            'status'                         => 'Pending',
            'progress_description'           => 'NotStarted',
        ]);

        // 2. تفعيل الخطة بعد توفر المجال والإجراء -> نجاح 200
        $resActivateOk = $this->patchJson("/api/v1/improvement-plans/{$plan->plan_id}", [
            'status' => 'Active',
        ]);
        $resActivateOk->assertStatus(200)
            ->assertJsonPath('data.status', 'Active');

        // 3. محاولة إكمال الخطة بينما الإجراء ما زال Pending -> 422
        $resCompleteFail = $this->patchJson("/api/v1/improvement-plans/{$plan->plan_id}", [
            'status' => 'Completed',
        ]);
        $resCompleteFail->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        // إنجاز الإجراء
        $action->status = 'Done';
        $action->progress_description = 'Complete';
        $action->save();

        // 4. إكمال الخطة بنجاح بعد إنجاز كافة الإجراءات -> 200
        $resCompleteOk = $this->patchJson("/api/v1/improvement-plans/{$plan->plan_id}", [
            'status' => 'Completed',
        ]);
        $resCompleteOk->assertStatus(200)
            ->assertJsonPath('data.status', 'Completed');
    }

    /**
     * 11. مدير المدرسة: استعراض الخطة وكتابة ملاحظات المراجعة (reviews.write) ومنعه من التعديل (403).
     */
    public function test_school_principal_can_read_and_review_but_cannot_modify(): void
    {
        // إعداد خطة لمدرسة بلقيس
        $area = ImprovementArea::create([
            'result_id'    => $this->resultBelqeesLow->result_id,
            'indicator_id' => $this->resultBelqeesLow->indicator_id,
            'name'         => 'مجال المراجعة',
            'priority'     => 'High',
        ]);

        $plan = ImprovementPlan::create([
            'cycle_id'             => $this->cycle->cycle_id,
            'school_id'            => $this->schoolBelqees->school_id,
            'created_by_user_id'   => $this->evaluatorBelqees->user_id,
            'title'                => 'خطة للمراجعة الإدارية',
            'start_date'           => '2026-11-01',
            'end_date'             => '2027-02-28',
            'status'               => 'Draft',
            'progress_description' => 'NotStarted',
        ]);

        PlanImprovementArea::create([
            'plan_id'    => $plan->plan_id,
            'area_id'    => $area->area_id,
            'created_at' => now(),
        ]);

        // دخول مدير مدرسة بلقيس
        Sanctum::actingAs($this->principalBelqees);

        // 1. المدير يستعرض الخطة بنجاح (plans.view)
        $showRes = $this->getJson("/api/v1/improvement-plans/{$plan->plan_id}");
        $showRes->assertStatus(200)
            ->assertJsonPath('data.title', 'خطة للمراجعة الإدارية');

        // 2. المدير يدوّن ملاحظة مراجعة بنجاح (reviews.write)
        $noteRes = $this->postJson("/api/v1/improvement-plans/{$plan->plan_id}/review-notes", [
            'text' => 'تمت المراجعة الأولية وتوجد حاجة لزيادة الدعم في المعامل ومصادر التعلم.',
        ]);
        $noteRes->assertStatus(201)
            ->assertJsonPath('data.authorName', $this->principalBelqees->full_name);

        $this->assertDatabaseHas('plan_review_notes', [
            'plan_id'        => $plan->plan_id,
            'author_user_id' => $this->principalBelqees->user_id,
        ]);

        // 3. المدير يحاول تعديل الخطة أو تفعيلها -> 403 Forbidden (لا يملك plans.manage)
        $modifyRes = $this->patchJson("/api/v1/improvement-plans/{$plan->plan_id}", [
            'title' => 'محاولة تعديل غير مسموحة من المدير',
        ]);
        $modifyRes->assertStatus(403);

        // 4. مدير مدرسة الفاروق يحاول كتابة ملاحظة على خطة مدرسة بلقيس -> 404 (عزل مؤسسي)
        Sanctum::actingAs($this->principalFarouq);
        $crossNoteRes = $this->postJson("/api/v1/improvement-plans/{$plan->plan_id}/review-notes", [
            'text' => 'محاولة اختراق ملاحظات مدرسة أخرى',
        ]);
        $crossNoteRes->assertStatus(404);
    }
}
