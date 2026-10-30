<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\Evidence;
use App\Models\ImprovementAction;
use App\Models\ImprovementArea;
use App\Models\ImprovementPlan;
use App\Models\Indicator;
use App\Models\PlanImprovementArea;
use App\Models\PlanReviewNote;
use App\Models\School;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات الميزة للشريحة الثامنة (Slice 8):
 * الخطط التربوية والتطوير المهني ومتابعة التنفيذ (نسب الإنجاز، بنك الإجراءات، فصل الملاحظات، وربط الشواهد).
 */
class EducationalPlansFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $evaluatorBelqees;
    protected User $evaluatorFarouq;
    protected User $principalBelqees;
    protected User $supervisorMinistry;
    protected User $adminUser;
    protected School $schoolBelqees;
    protected School $schoolFarouq;
    protected EvaluationCycle $cycle;
    protected EvaluationCycle $anotherCycle;
    protected Evaluation $evaluationBelqees;
    protected Evaluation $evaluationFarouq;
    protected EvaluationResult $resultBelqees;
    protected EvaluationResult $resultFarouq;
    protected ImprovementArea $areaBelqees;
    protected ImprovementArea $areaFarouq;

    protected function setUp(): void
    {
        parent::setUp();

        $this->schoolBelqees = School::where('identification_data', 'SCH-SANAA-2026-001')->firstOrFail();
        $this->schoolFarouq  = School::where('identification_data', 'SCH-TAIZ-2026-002')->firstOrFail();

        $this->evaluatorBelqees = User::where('username', 'quality_belqees')->firstOrFail();
        $this->evaluatorFarouq  = User::where('username', 'quality_farouq')->firstOrFail();
        $this->principalBelqees = User::where('username', 'principal_belqees')->firstOrFail();
        $this->supervisorMinistry = User::where('username', 'supervisor_ministry')->firstOrFail();
        $this->adminUser        = User::where('username', 'admin')->firstOrFail();

        $this->cycle = EvaluationCycle::firstOrFail();

        // دورة تقييم ثانية لاختبار العزل الزمني
        $this->anotherCycle = EvaluationCycle::firstOrCreate(
            ['academic_year' => '2027-2028'],
            [
                'version_id' => $this->cycle->version_id,
                'start_date' => Carbon::now()->addYear(),
                'end_date'   => Carbon::now()->addYears(2),
                'status'     => 'Planned',
            ]
        );

        $this->evaluationBelqees = Evaluation::firstOrCreate(
            [
                'cycle_id'  => $this->cycle->cycle_id,
                'school_id' => $this->schoolBelqees->school_id,
            ],
            [
                'created_by_user_id' => $this->evaluatorBelqees->user_id,
                'status'             => 'InProgress',
                'created_at'         => now(),
            ]
        );

        $this->evaluationFarouq = Evaluation::firstOrCreate(
            [
                'cycle_id'  => $this->cycle->cycle_id,
                'school_id' => $this->schoolFarouq->school_id,
            ],
            [
                'created_by_user_id' => $this->evaluatorFarouq->user_id,
                'status'             => 'InProgress',
                'created_at'         => now(),
            ]
        );

        $indicator1 = Indicator::orderBy('indicator_id')->firstOrFail();
        $indicator2 = Indicator::orderBy('indicator_id')->skip(1)->firstOrFail();

        $stdVerId = $this->cycle->version_id ?? \App\Models\StandardVersion::value('version_id');
        $desc1 = \App\Models\IndicatorScoreDescriptor::where('indicator_id', $indicator1->indicator_id)->first();
        $desc2 = \App\Models\IndicatorScoreDescriptor::where('indicator_id', $indicator2->indicator_id)->first();

        $this->resultBelqees = EvaluationResult::updateOrCreate(
            [
                'evaluation_id' => $this->evaluationBelqees->evaluation_id,
                'indicator_id'  => $indicator1->indicator_id,
            ],
            [
                'cycle_id'            => $this->cycle->cycle_id,
                'standard_version_id' => $stdVerId,
                'evaluator_user_id'   => $this->evaluatorBelqees->user_id,
                'score'               => 2,
                'score_descriptor_id' => $desc1?->descriptor_id,
                'completion_status'   => 'Completed',
            ]
        );

        $this->resultFarouq = EvaluationResult::updateOrCreate(
            [
                'evaluation_id' => $this->evaluationFarouq->evaluation_id,
                'indicator_id'  => $indicator2->indicator_id,
            ],
            [
                'cycle_id'            => $this->cycle->cycle_id,
                'standard_version_id' => $stdVerId,
                'evaluator_user_id'   => $this->evaluatorFarouq->user_id,
                'score'               => 1,
                'score_descriptor_id' => $desc2?->descriptor_id,
                'completion_status'   => 'Completed',
            ]
        );

        $this->areaBelqees = ImprovementArea::firstOrCreate(
            [
                'result_id'    => $this->resultBelqees->result_id,
                'indicator_id' => $this->resultBelqees->indicator_id,
                'name'         => 'مجال تحسين تقنيات التعليم بلقيس',
            ],
            [
                'priority'    => 'High',
                'description' => 'رفع كفاءة تفعيل المنصات والمعامل.',
            ]
        );

        $this->areaFarouq = ImprovementArea::firstOrCreate(
            [
                'result_id'    => $this->resultFarouq->result_id,
                'indicator_id' => $this->resultFarouq->indicator_id,
                'name'         => 'مجال تحسين مدرسة الفاروق',
            ],
            [
                'priority'    => 'Medium',
                'description' => 'تطوير البيئة الصفية.',
            ]
        );
    }

    /**
     * 1. استعراض بنك الإجراءات النموذجية مع إمكانية الفلترة بالمعيار أو بنوع الخطة.
     */
    public function test_action_catalog_retrieval_and_filtering(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // استعراض القائمة كاملة
        $responseAll = $this->getJson('/api/v1/improvement-plans/action-catalog');
        $responseAll->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'catalog_id',
                        'sub_standard_code',
                        'plan_type',
                        'title',
                        'suggested_responsible_description',
                        'suggested_duration_days',
                    ],
                ],
            ]);

        $this->assertGreaterThanOrEqual(14, count($responseAll->json('data')));

        // فلترة بنوع الخطة StaffProfessionalDevelopment
        $responseFilterType = $this->getJson('/api/v1/improvement-plans/action-catalog?plan_type=StaffProfessionalDevelopment');
        $responseFilterType->assertStatus(200);
        foreach ($responseFilterType->json('data') as $item) {
            $this->assertEquals('StaffProfessionalDevelopment', $item['plan_type']);
        }

        // فلترة برمز المعيار الفرعي
        $responseFilterSub = $this->getJson('/api/v1/improvement-plans/action-catalog?sub_standard_code=TECH_EDU');
        $responseFilterSub->assertStatus(200);
        foreach ($responseFilterSub->json('data') as $item) {
            $this->assertEquals('TECH_EDU', $item['sub_standard_code']);
        }
    }

    /**
     * 2. إنشاء خطة بنوع StaffProfessionalDevelopment أو AnnualOperational والقيمة الافتراضية QualityImprovement.
     */
    public function test_create_educational_plans_with_plan_types(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // إنشاء خطة تطوير مهني
        $resStaffDev = $this->postJson('/api/v1/improvement-plans', [
            'cycleId'   => $this->cycle->cycle_id,
            'title'     => 'خطة الإنماء المهني لمعلمي العلوم والرياضيات',
            'startDate' => Carbon::today()->toDateString(),
            'endDate'   => Carbon::today()->addMonths(3)->toDateString(),
            'planType'  => 'StaffProfessionalDevelopment',
            'areaIds'   => [$this->areaBelqees->area_id],
        ]);

        $resStaffDev->assertStatus(201)
            ->assertJsonPath('data.planType', 'StaffProfessionalDevelopment')
            ->assertJsonPath('data.planTypeLabel', 'خطة التطوير المهني والتربوي');

        // إنشاء خطة بدون تحديد النوع -> افتراضياً QualityImprovement
        $resDefault = $this->postJson('/api/v1/improvement-plans', [
            'cycleId'   => $this->cycle->cycle_id,
            'title'     => 'خطة جودة عامة لمعايير الاعتماد المدرسي',
            'startDate' => Carbon::today()->toDateString(),
            'endDate'   => Carbon::today()->addMonths(2)->toDateString(),
            'areaIds'   => [$this->areaBelqees->area_id],
        ]);

        $resDefault->assertStatus(201)
            ->assertJsonPath('data.planType', 'QualityImprovement')
            ->assertJsonPath('data.planTypeLabel', 'خطة تحسين الجودة المدرسية');
    }

    /**
     * 3. التحقق من العزل الزمني والمؤسسي عند إنشاء الخطة (404 لمدرسة أخرى، 422 لدورة أخرى).
     */
    public function test_temporal_and_institutional_isolation_on_plan_creation(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // محاولة ربط مجال مدرسة الفاروق (مدرسة أخرى) -> 404
        $resOtherSchool = $this->postJson('/api/v1/improvement-plans', [
            'cycleId'   => $this->cycle->cycle_id,
            'title'     => 'خطة اختراق مؤسسي',
            'startDate' => Carbon::today()->toDateString(),
            'endDate'   => Carbon::today()->addMonths(1)->toDateString(),
            'areaIds'   => [$this->areaFarouq->area_id],
        ]);
        $resOtherSchool->assertStatus(404);

        // إعداد تقييم ومجال لدورة أخرى لنفس مدرسة بلقيس
        $evalCycle2 = Evaluation::create([
            'cycle_id'           => $this->anotherCycle->cycle_id,
            'school_id'          => $this->schoolBelqees->school_id,
            'created_by_user_id' => $this->evaluatorBelqees->user_id,
            'status'             => 'InProgress',
        ]);
        $stdVerId = $this->cycle->version_id ?? \App\Models\StandardVersion::value('version_id');
        $desc1 = \App\Models\IndicatorScoreDescriptor::where('indicator_id', $this->resultBelqees->indicator_id)->first();

        $resultCycle2 = EvaluationResult::create([
            'evaluation_id'       => $evalCycle2->evaluation_id,
            'indicator_id'        => $this->resultBelqees->indicator_id,
            'cycle_id'            => $this->anotherCycle->cycle_id,
            'standard_version_id' => $stdVerId,
            'evaluator_user_id'   => $this->evaluatorBelqees->user_id,
            'score'               => 2,
            'score_descriptor_id' => $desc1?->descriptor_id,
            'completion_status'   => 'Completed',
        ]);
        $areaCycle2 = ImprovementArea::create([
            'result_id'    => $resultCycle2->result_id,
            'indicator_id' => $resultCycle2->indicator_id,
            'name'         => 'مجال دورة مستقبلية',
            'priority'     => 'Low',
        ]);

        // محاولة ربط مجال دورة مستقبلية بخطة تتبع دورة سابقة -> 422
        $resOtherCycle = $this->postJson('/api/v1/improvement-plans', [
            'cycleId'   => $this->cycle->cycle_id,
            'title'     => 'خطة تخلط بين الدورات',
            'startDate' => Carbon::today()->toDateString(),
            'endDate'   => Carbon::today()->addMonths(1)->toDateString(),
            'areaIds'   => [$areaCycle2->area_id],
        ]);
        $resOtherCycle->assertStatus(422)
            ->assertJsonValidationErrors(['areaIds']);
    }

    /**
     * 4. التدرج في نسبة الإنجاز والتحول التلقائي للحالة إلى Done عند بلوغ 100%.
     */
    public function test_action_gradual_completion_and_auto_done_at_100_percent(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $plan = ImprovementPlan::create([
            'cycle_id'             => $this->cycle->cycle_id,
            'school_id'            => $this->schoolBelqees->school_id,
            'created_by_user_id'   => $this->evaluatorBelqees->user_id,
            'title'                => 'خطة تطوير الكادر التعليمي',
            'plan_type'            => 'StaffProfessionalDevelopment',
            'start_date'           => Carbon::today(),
            'end_date'             => Carbon::today()->addMonths(4),
            'status'               => 'Draft',
            'progress_description' => 'NotStarted',
        ]);

        PlanImprovementArea::create([
            'plan_id' => $plan->plan_id,
            'area_id' => $this->areaBelqees->area_id,
        ]);

        // إضافة إجراء بنسبة 0% افتراضياً
        $resAction = $this->postJson("/api/v1/improvement-plans/{$plan->plan_id}/actions", [
            'areaId'                       => $this->areaBelqees->area_id,
            'title'                        => 'ورشة عمل تصميم الحقائب الرقمية',
            'responsiblePersonDescription' => 'منسق التدريب - 15 معلماً',
            'startDate'                    => Carbon::today()->toDateString(),
            'dueDate'                      => Carbon::today()->addWeeks(2)->toDateString(),
            'completionPercentage'         => 0,
        ]);

        $resAction->assertStatus(201)
            ->assertJsonPath('data.completionPercentage', 0)
            ->assertJsonPath('data.status', 'Pending');

        $actionId = $resAction->json('data.actionId');

        // تحديث النسبة إلى 40% -> الحالة تتحول تلقائياً إلى InProgress
        $resUpdate40 = $this->patchJson("/api/v1/improvement-plans/{$plan->plan_id}/actions/{$actionId}", [
            'completionPercentage' => 40,
        ]);
        $resUpdate40->assertStatus(200)
            ->assertJsonPath('data.completionPercentage', 40)
            ->assertJsonPath('data.status', 'InProgress');

        // تحديث النسبة إلى 100% -> الحالة تتحول تلقائياً إلى Done
        $resUpdate100 = $this->patchJson("/api/v1/improvement-plans/{$plan->plan_id}/actions/{$actionId}", [
            'completionPercentage' => 100,
        ]);
        $resUpdate100->assertStatus(200)
            ->assertJsonPath('data.completionPercentage', 100)
            ->assertJsonPath('data.status', 'Done');

        // التراجع في النسبة إلى 80% بعد الإنجاز -> تعود الحالة إلى InProgress
        $resUpdate80 = $this->patchJson("/api/v1/improvement-plans/{$plan->plan_id}/actions/{$actionId}", [
            'completionPercentage' => 80,
        ]);
        $resUpdate80->assertStatus(200)
            ->assertJsonPath('data.completionPercentage', 80)
            ->assertJsonPath('data.status', 'InProgress');

        // تحديث الحالة يدوياً إلى Done -> النسبة تصبح 100% تلقائياً
        $resDone = $this->patchJson("/api/v1/improvement-plans/{$plan->plan_id}/actions/{$actionId}", [
            'status' => 'Done',
        ]);
        $resDone->assertStatus(200)
            ->assertJsonPath('data.completionPercentage', 100)
            ->assertJsonPath('data.status', 'Done');
    }

    /**
     * 5. احتساب متوسط نسبة الإنجاز الإجمالية واستبعاد الإجراءات الملغاة Cancelled.
     */
    public function test_plan_overall_progress_percentage_calculation(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $plan = ImprovementPlan::create([
            'cycle_id'             => $this->cycle->cycle_id,
            'school_id'            => $this->schoolBelqees->school_id,
            'created_by_user_id'   => $this->evaluatorBelqees->user_id,
            'title'                => 'خطة متابعة الإنجاز والتقدم',
            'plan_type'            => 'AnnualOperational',
            'start_date'           => Carbon::today(),
            'end_date'             => Carbon::today()->addMonths(6),
            'status'               => 'Active',
            'progress_description' => 'Moderate',
        ]);

        PlanImprovementArea::create([
            'plan_id' => $plan->plan_id,
            'area_id' => $this->areaBelqees->area_id,
        ]);

        // إجراء 1: 50%
        ImprovementAction::create([
            'plan_id'                        => $plan->plan_id,
            'area_id'                        => $this->areaBelqees->area_id,
            'title'                          => 'إجراء 1',
            'responsible_person_description' => 'فريق 1',
            'start_date'                     => Carbon::today(),
            'due_date'                       => Carbon::today()->addMonth(),
            'status'                         => 'InProgress',
            'completion_percentage'          => 50,
            'progress_description'           => 'Moderate',
        ]);

        // إجراء 2: 100%
        ImprovementAction::create([
            'plan_id'                        => $plan->plan_id,
            'area_id'                        => $this->areaBelqees->area_id,
            'title'                          => 'إجراء 2',
            'responsible_person_description' => 'فريق 2',
            'start_date'                     => Carbon::today(),
            'due_date'                       => Carbon::today()->addMonth(),
            'status'                         => 'Done',
            'completion_percentage'          => 100,
            'progress_description'           => 'Complete',
        ]);

        // متوسط: (50 + 100) / 2 = 75%
        $resShow = $this->getJson("/api/v1/improvement-plans/{$plan->plan_id}");
        $resShow->assertStatus(200);
        $this->assertEquals(75, $resShow->json('data.overallProgressPercentage'));

        // إجراء 3: ملغي Cancelled (يجب استبعاده من حساب المتوسط)
        ImprovementAction::create([
            'plan_id'                        => $plan->plan_id,
            'area_id'                        => $this->areaBelqees->area_id,
            'title'                          => 'إجراء 3 ملغي',
            'responsible_person_description' => 'فريق 3',
            'start_date'                     => Carbon::today(),
            'due_date'                       => Carbon::today()->addMonth(),
            'status'                         => 'Cancelled',
            'completion_percentage'          => 0,
            'progress_description'           => 'NotStarted',
        ]);

        $resShow2 = $this->getJson("/api/v1/improvement-plans/{$plan->plan_id}");
        $resShow2->assertStatus(200);
        $this->assertEquals(75, $resShow2->json('data.overallProgressPercentage'));
    }

    /**
     * 6. منع إغلاق الخطة (Completed) إلا إذا كانت كافة إجراءاتها منجزة 100% أو ملغاة Cancelled.
     */
    public function test_closure_guard_rejects_completed_when_actions_incomplete(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $plan = ImprovementPlan::create([
            'cycle_id'             => $this->cycle->cycle_id,
            'school_id'            => $this->schoolBelqees->school_id,
            'created_by_user_id'   => $this->evaluatorBelqees->user_id,
            'title'                => 'خطة قيد التدقيق النهائي',
            'plan_type'            => 'QualityImprovement',
            'start_date'           => Carbon::today(),
            'end_date'             => Carbon::today()->addMonths(2),
            'status'               => 'Active',
            'progress_description' => 'Significant',
        ]);

        PlanImprovementArea::create([
            'plan_id' => $plan->plan_id,
            'area_id' => $this->areaBelqees->area_id,
        ]);

        $action = ImprovementAction::create([
            'plan_id'                        => $plan->plan_id,
            'area_id'                        => $this->areaBelqees->area_id,
            'title'                          => 'إجراء غير مكتمل بنسبة 85%',
            'responsible_person_description' => 'فريق التطوير',
            'start_date'                     => Carbon::today(),
            'due_date'                       => Carbon::today()->addDays(10),
            'status'                         => 'InProgress',
            'completion_percentage'          => 85,
            'progress_description'           => 'Significant',
        ]);

        // محاولة إكمال الخطة -> 422
        $resFail = $this->patchJson("/api/v1/improvement-plans/{$plan->plan_id}", [
            'status' => 'Completed',
        ]);
        $resFail->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        // إكمال الإجراء إلى 100%
        $action->completion_percentage = 100;
        $action->status = 'Done';
        $action->save();

        // محاولة إكمال الخطة مجدداً -> نجاح 200 OK
        $resOk = $this->patchJson("/api/v1/improvement-plans/{$plan->plan_id}", [
            'status' => 'Completed',
        ]);
        $resOk->assertStatus(200)
            ->assertJsonPath('data.status', 'Completed');
    }

    /**
     * 7. حذف إجراء تنفيذي مسموح فقط في حالة المسودة Draft، وممنوع في الخطة النشطة Active (422).
     */
    public function test_action_deletion_allowed_in_draft_and_forbidden_in_active(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $plan = ImprovementPlan::create([
            'cycle_id'             => $this->cycle->cycle_id,
            'school_id'            => $this->schoolBelqees->school_id,
            'created_by_user_id'   => $this->evaluatorBelqees->user_id,
            'title'                => 'خطة اختبار حذف الإجراءات',
            'plan_type'            => 'QualityImprovement',
            'start_date'           => Carbon::today(),
            'end_date'             => Carbon::today()->addMonths(2),
            'status'               => 'Draft',
            'progress_description' => 'NotStarted',
        ]);

        PlanImprovementArea::create([
            'plan_id' => $plan->plan_id,
            'area_id' => $this->areaBelqees->area_id,
        ]);

        $action = ImprovementAction::create([
            'plan_id'                        => $plan->plan_id,
            'area_id'                        => $this->areaBelqees->area_id,
            'title'                          => 'إجراء سيتم حذفه أثناء المسودة',
            'responsible_person_description' => 'المشرف الداخلي',
            'start_date'                     => Carbon::today(),
            'due_date'                       => Carbon::today()->addDays(5),
            'status'                         => 'Pending',
            'completion_percentage'          => 0,
            'progress_description'           => 'NotStarted',
        ]);

        // حذف الإجراء في المسودة -> 200 OK
        $resDeleteOk = $this->deleteJson("/api/v1/improvement-plans/{$plan->plan_id}/actions/{$action->action_id}");
        $resDeleteOk->assertStatus(200);
        $this->assertDatabaseMissing('improvement_actions', ['action_id' => $action->action_id]);

        // إضافة إجراء جديد وتفعيل الخطة
        $action2 = ImprovementAction::create([
            'plan_id'                        => $plan->plan_id,
            'area_id'                        => $this->areaBelqees->area_id,
            'title'                          => 'إجراء في خطة مفعلة',
            'responsible_person_description' => 'المشرف الداخلي',
            'start_date'                     => Carbon::today(),
            'due_date'                       => Carbon::today()->addDays(5),
            'status'                         => 'InProgress',
            'completion_percentage'          => 20,
            'progress_description'           => 'Limited',
        ]);

        $plan->status = 'Active';
        $plan->save();

        // محاولة حذف الإجراء بعد التفعيل -> 422
        $resDeleteFail = $this->deleteJson("/api/v1/improvement-plans/{$plan->plan_id}/actions/{$action2->action_id}");
        $resDeleteFail->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
        $this->assertDatabaseHas('improvement_actions', ['action_id' => $action2->action_id]);
    }

    /**
     * 8. ربط شاهد تنفيذ بالإجراء واستعراضه ضمن تفاصيل الخطة.
     */
    public function test_execution_evidence_can_be_attached_to_action(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $plan = ImprovementPlan::create([
            'cycle_id'             => $this->cycle->cycle_id,
            'school_id'            => $this->schoolBelqees->school_id,
            'created_by_user_id'   => $this->evaluatorBelqees->user_id,
            'title'                => 'خطة شواهد التنفيذ',
            'plan_type'            => 'QualityImprovement',
            'start_date'           => Carbon::today(),
            'end_date'             => Carbon::today()->addMonths(2),
            'status'               => 'Active',
            'progress_description' => 'Moderate',
        ]);

        PlanImprovementArea::create([
            'plan_id' => $plan->plan_id,
            'area_id' => $this->areaBelqees->area_id,
        ]);

        $action = ImprovementAction::create([
            'plan_id'                        => $plan->plan_id,
            'area_id'                        => $this->areaBelqees->area_id,
            'title'                          => 'تجهيز معمل الحاسوب بالبرمجيات الحديثة',
            'responsible_person_description' => 'أخصائي التكنولوجيا',
            'start_date'                     => Carbon::today(),
            'due_date'                       => Carbon::today()->addWeeks(3),
            'status'                         => 'InProgress',
            'completion_percentage'          => 60,
            'progress_description'           => 'Moderate',
        ]);

        $evidence = Evidence::create([
            'result_id'    => $this->resultBelqees->result_id,
            'indicator_id' => $this->resultBelqees->indicator_id,
            'title'        => 'تقرير تركيب البرمجيات ومحضر الاستلام',
            'description'  => 'توثيق رسمي لاستلام وتجهيز المعمل.',
            'status'       => 'Approved',
        ]);

        // ربط الشاهد بالإجراء
        $resAttach = $this->postJson("/api/v1/improvement-plans/{$plan->plan_id}/actions/{$action->action_id}/evidences", [
            'evidenceId' => $evidence->evidence_id,
        ]);

        $resAttach->assertStatus(200)
            ->assertJsonPath('data.evidenceId', $evidence->evidence_id)
            ->assertJsonPath('data.actionId', $action->action_id);

        $this->assertEquals($action->action_id, $evidence->fresh()->action_id);

        // استعراض تفاصيل الخطة والتأكد من ظهور الشاهد
        $resDetails = $this->getJson("/api/v1/improvement-plans/{$plan->plan_id}");
        $resDetails->assertStatus(200);
        $actionData = collect($resDetails->json('data.actions'))->firstWhere('actionId', $action->action_id);
        $this->assertNotEmpty($actionData['evidences']);
        $this->assertEquals($evidence->evidence_id, $actionData['evidences'][0]['evidenceId']);
    }

    /**
     * 9. فصل الملاحظات بين المراجعة الداخلية (مدير المدرسة) والمراجعة الخارجية (مشرف وزاري).
     */
    public function test_review_notes_separation_between_principal_and_supervisor(): void
    {
        $plan = ImprovementPlan::create([
            'cycle_id'             => $this->cycle->cycle_id,
            'school_id'            => $this->schoolBelqees->school_id,
            'created_by_user_id'   => $this->evaluatorBelqees->user_id,
            'title'                => 'خطة خاضعة للمراجعة المزدوجة',
            'plan_type'            => 'QualityImprovement',
            'start_date'           => Carbon::today(),
            'end_date'             => Carbon::today()->addMonths(2),
            'status'               => 'Active',
            'progress_description' => 'Moderate',
        ]);

        // 1. مدير المدرسة يكتب ملاحظة مراجعة داخلية
        Sanctum::actingAs($this->principalBelqees);
        $resPrincipalNote = $this->postJson("/api/v1/improvement-plans/{$plan->plan_id}/review-notes", [
            'text' => 'ملاحظة مدير المدرسة: يرجى تسريع تنفيذ الإجراءات الخاصة بمعمل العلوم.',
        ]);
        $resPrincipalNote->assertStatus(201)
            ->assertJsonPath('data.reviewerRole', 'school_principal');

        // 2. المشرف الوزاري يكتب ملاحظة مراجعة خارجية
        Sanctum::actingAs($this->supervisorMinistry);
        $resSupervisorNote = $this->postJson("/api/v1/improvement-plans/{$plan->plan_id}/review-notes", [
            'text' => 'ملاحظة الإشراف الوزاري: الخطة مستوفية للشروط وسيتم تدقيق شواهد التنفيذ ميدانياً.',
        ]);
        $resSupervisorNote->assertStatus(201)
            ->assertJsonPath('data.reviewerRole', 'ministry_supervisor');

        // 3. استعراض تفاصيل الخطة والتأكد من تصنيف الملاحظات
        Sanctum::actingAs($this->evaluatorBelqees);
        $resShow = $this->getJson("/api/v1/improvement-plans/{$plan->plan_id}");
        $resShow->assertStatus(200)
            ->assertJsonCount(1, 'data.internalNotes')
            ->assertJsonCount(1, 'data.externalNotes')
            ->assertJsonCount(2, 'data.reviewNotes');

        $this->assertEquals('school_principal', $resShow->json('data.internalNotes.0.reviewerRole'));
        $this->assertEquals('ministry_supervisor', $resShow->json('data.externalNotes.0.reviewerRole'));
    }

    /**
     * 10. تصفية قائمة الخطط بنوع الخطة (plan_type) ودورة التقييم (cycle_id).
     */
    public function test_plan_listing_filters_by_plan_type_and_cycle(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // إنشاء خطة StaffProfessionalDevelopment
        ImprovementPlan::create([
            'cycle_id'             => $this->cycle->cycle_id,
            'school_id'            => $this->schoolBelqees->school_id,
            'created_by_user_id'   => $this->evaluatorBelqees->user_id,
            'title'                => 'خطة تطوير الكوادر التدريسية',
            'plan_type'            => 'StaffProfessionalDevelopment',
            'start_date'           => Carbon::today(),
            'end_date'             => Carbon::today()->addMonths(3),
            'status'               => 'Draft',
            'progress_description' => 'NotStarted',
        ]);

        // إنشاء خطة AnnualOperational
        ImprovementPlan::create([
            'cycle_id'             => $this->cycle->cycle_id,
            'school_id'            => $this->schoolBelqees->school_id,
            'created_by_user_id'   => $this->evaluatorBelqees->user_id,
            'title'                => 'الخطة التشغيلية السنوية للأنشطة',
            'plan_type'            => 'AnnualOperational',
            'start_date'           => Carbon::today(),
            'end_date'             => Carbon::today()->addMonths(5),
            'status'               => 'Draft',
            'progress_description' => 'NotStarted',
        ]);

        // استعلام بفلتر plan_type = StaffProfessionalDevelopment
        $resStaffFilter = $this->getJson('/api/v1/improvement-plans?plan_type=StaffProfessionalDevelopment');
        $resStaffFilter->assertStatus(200);
        foreach ($resStaffFilter->json('data') as $p) {
            $this->assertEquals('StaffProfessionalDevelopment', $p['planType']);
        }

        // استعلام بفلتر cycle_id
        $resCycleFilter = $this->getJson("/api/v1/improvement-plans?cycle_id={$this->cycle->cycle_id}");
        $resCycleFilter->assertStatus(200);
        foreach ($resCycleFilter->json('data') as $p) {
            $this->assertEquals($this->cycle->cycle_id, $p['cycleId']);
        }
    }
}
