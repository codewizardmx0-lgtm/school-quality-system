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
use App\Models\IndicatorScoreDescriptor;
use App\Models\PlanImprovementArea;
use App\Models\School;
use App\Models\Standard;
use App\Models\StandardVersion;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات الميزة الشاملة للشريحة 4:
 * التقارير والتحليلات وحساب النتائج (Reports, Analytics, and Score Calculation).
 */
class ReportsAnalyticsFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $adminUser;
    protected User $principalBelqees;
    protected User $evaluatorBelqees;
    protected User $principalFarouq;
    protected User $evaluatorFarouq;
    protected User $supervisorMinistry;
    protected User $standardsManagerMinistry;

    protected School $schoolBelqees;
    protected School $schoolFarouq;
    protected EvaluationCycle $cycle;
    protected Evaluation $evaluationBelqees;
    protected StandardVersion $standardVersion;

    protected function setUp(): void
    {
        parent::setUp();

        // جلب المدارس المعتمدة
        $this->schoolBelqees = School::where('identification_data', 'SCH-SANAA-2026-001')->firstOrFail();
        $this->schoolFarouq = School::where('identification_data', 'SCH-TAIZ-2026-002')->firstOrFail();

        // جلب المستخدمين بمختلف الأدوار والصلاحيات
        $this->adminUser = User::where('username', 'admin')->firstOrFail();
        $this->principalBelqees = User::where('username', 'principal_belqees')->firstOrFail();
        $this->evaluatorBelqees = User::where('username', 'quality_belqees')->firstOrFail();
        $this->principalFarouq = User::where('username', 'principal_farouq')->firstOrFail();
        $this->evaluatorFarouq = User::where('username', 'quality_farouq')->firstOrFail();
        $this->supervisorMinistry = User::where('username', 'supervisor_ministry')->firstOrFail();
        $this->standardsManagerMinistry = User::where('username', 'standards_manager_ministry')->firstOrFail();

        $this->cycle = EvaluationCycle::firstOrFail();
        $this->standardVersion = StandardVersion::firstOrFail();

        $this->evaluationBelqees = Evaluation::firstOrCreate(
            [
                'cycle_id' => $this->cycle->cycle_id,
                'school_id' => $this->schoolBelqees->school_id,
            ],
            [
                'created_by_user_id' => $this->evaluatorBelqees->user_id,
                'status' => 'InProgress',
            ]
        );
    }

    /**
     * اختبار القاعدة 8: منع حساب النتائج النهائية لتقييم غير مكتمل (422).
     */
    public function test_cannot_calculate_final_results_for_incomplete_evaluation(): void
    {
        Sanctum::actingAs($this->principalBelqees);

        // التقييم في السيدرز يحتوي 3 نتائج فقط من أصل 109 مؤشر فهو غير مكتمل
        $response = $this->getJson("/api/v1/schools/{$this->schoolBelqees->school_id}/assessments/{$this->evaluationBelqees->evaluation_id}/results");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'لا يمكن حساب النتائج النهائية لتقييم غير مكتمل.')
            ->assertJsonStructure([
                'data',
                'message',
                'errors' => ['evaluation'],
                'meta',
            ]);
    }

    /**
     * اختبار القاعدة 8: منع تصدير تقرير التقييم لملف غير مكتمل (422).
     */
    public function test_cannot_export_report_for_incomplete_evaluation(): void
    {
        Sanctum::actingAs($this->principalBelqees);

        $response = $this->getJson("/api/v1/schools/{$this->schoolBelqees->school_id}/assessments/{$this->evaluationBelqees->evaluation_id}/export");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'لا يمكن تصدير تقرير التقييم لملف غير مكتمل.');
    }

    /**
     * اختبار القاعدة 8: منع حساب نتيجة معيار محدد إذا كانت بعض مؤشراته غير مرصودة (422).
     */
    public function test_cannot_calculate_standard_results_when_standard_is_incomplete(): void
    {
        Sanctum::actingAs($this->principalBelqees);

        // المعيار الأول STD-01 يحتوي 24 مؤشر، والمرصود منه 3 فقط فهو غير مكتمل
        $response = $this->getJson("/api/v1/schools/{$this->schoolBelqees->school_id}/assessments/{$this->evaluationBelqees->evaluation_id}/standards/STD-01/results");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'لا يمكن حساب نتيجة المعيار لأن بعض مؤشراته لم تُقيّم بعد.')
            ->assertJsonStructure([
                'data',
                'message',
                'errors' => ['standard'],
            ]);
    }

    /**
     * اختبار حساب النتيجة المفصلة لمعيار محدد عند اكتمال كافة مؤشراته (200).
     */
    public function test_calculates_standard_results_when_standard_is_fully_evaluated(): void
    {
        Sanctum::actingAs($this->principalBelqees);

        // نجلب المعيار السادس (الشراكة المجتمعية) الذي يحوي 6 مؤشرات فقط ووزنه 5%
        $stdCommunity = Standard::where('code', 'STD-06')->firstOrFail();
        $this->scoreAllIndicatorsForStandard($stdCommunity, 2); // نمنح جميع مؤشراته درجة 2 (66.67%)

        $response = $this->getJson("/api/v1/schools/{$this->schoolBelqees->school_id}/assessments/{$this->evaluationBelqees->evaluation_id}/standards/STD-06/results");

        $response->assertStatus(200)
            ->assertJsonPath('message', 'تم حساب نتيجة المعيار بنجاح.')
            ->assertJsonPath('data.code', 'STD-06')
            ->assertJsonPath('data.weight', 5)
            ->assertJsonPath('data.raw_score', 2)
            ->assertJsonPath('data.percentage', 66.67)
            ->assertJsonPath('data.weighted_score', 3.33) // 66.67 * 0.05 = 3.3335 -> 3.33
            ->assertJsonPath('data.performance_level.key', 'satisfactory')
            ->assertJsonPath('data.performance_level.label', 'متوسط')
            ->assertJsonPath('data.is_complete', true)
            ->assertJsonStructure([
                'data' => [
                    'standard_id',
                    'code',
                    'name',
                    'weight',
                    'raw_score',
                    'percentage',
                    'weighted_score',
                    'performance_level',
                    'sub_standards' => [
                        '*' => [
                            'sub_standard_id',
                            'code',
                            'name',
                            'indicators' => [
                                '*' => ['indicator_id', 'code', 'name', 'weight', 'score', 'percentage', 'level_label'],
                            ],
                        ],
                    ],
                ],
            ]);
    }

    /**
     * اختبار حساب النتائج الإجمالية للمدرسة والأوزان الرسمية لجميع المعايير عند اكتمال التقييم.
     */
    public function test_calculates_overall_school_results_with_official_weights(): void
    {
        Sanctum::actingAs($this->principalBelqees);

        // رصد جميع المؤشرات الـ 109 بدرجة 3 (100% مستوفٍ كلياً)
        $this->scoreAllActiveIndicators(3);

        $response = $this->getJson("/api/v1/schools/{$this->schoolBelqees->school_id}/assessments/{$this->evaluationBelqees->evaluation_id}/results");

        $response->assertStatus(200)
            ->assertJsonPath('message', 'تم حساب نتائج التقييم بنجاح.')
            ->assertJsonPath('data.is_complete', true)
            ->assertJsonPath('data.final_score', 100)
            ->assertJsonPath('data.performance_level.key', 'outstanding')
            ->assertJsonPath('data.performance_level.label', 'متميز')
            ->assertJsonPath('data.standards_total_weight', 100);

        // التحقق من أن جميع المعايير السبعة معروضة بأوزانها الرسمية الصحيحة
        $standards = collect($response->json('data.standards'));
        $this->assertCount(7, $standards);

        $expectedWeights = [
            'STD-01' => 15,
            'STD-02' => 20,
            'STD-03' => 15,
            'STD-04' => 20,
            'STD-05' => 15,
            'STD-06' => 5,
            'STD-07' => 10,
        ];

        foreach ($expectedWeights as $code => $weight) {
            $std = $standards->firstWhere('code', $code);
            $this->assertNotNull($std, "Standard {$code} not found");
            $this->assertEquals($weight, (float) $std['weight']);
            $this->assertEquals(100.0, (float) $std['percentage']);
            $this->assertEquals($weight, (float) $std['weighted_score']);
        }
    }

    /**
     * اختبار حساب ملخص الشواهد ونسب الاكتمال للمؤشرات والمعايير (evidence-summary).
     */
    public function test_evidence_summary_calculation(): void
    {
        Sanctum::actingAs($this->principalBelqees);

        $response = $this->getJson("/api/v1/schools/{$this->schoolBelqees->school_id}/assessments/{$this->evaluationBelqees->evaluation_id}/evidence-summary");

        $response->assertStatus(200)
            ->assertJsonPath('message', 'تم حساب ملخص الشواهد بنجاح.')
            ->assertJsonStructure([
                'data' => [
                    'evaluation_id',
                    'school_id',
                    'total_indicators',
                    'indicators_with_evidence',
                    'indicators_complete_evidence',
                    'indicators_missing_evidence',
                    'total_required_evidences',
                    'total_uploaded_evidences',
                    'overall_evidence_completion_rate',
                    'standards' => [
                        '*' => [
                            'standard_id',
                            'code',
                            'name',
                            'total_indicators',
                            'indicators_with_evidence',
                            'total_required_evidences',
                            'total_uploaded_evidences',
                            'completion_rate',
                            'indicators' => [
                                '*' => ['indicator_id', 'code', 'name', 'required_count', 'uploaded_count', 'missing_count', 'completion_rate', 'is_satisfied'],
                            ],
                        ],
                    ],
                ],
            ]);

        $this->assertEquals(109, $response->json('data.total_indicators'));
        $this->assertGreaterThan(0, $response->json('data.total_required_evidences'));
    }

    /**
     * اختبار ملخص خطط التحسين وحالاتها وتحديد المتأخرة منها وإجراءاتها (improvement-plans/summary).
     */
    public function test_improvement_plans_summary_with_delayed_plans_and_actions(): void
    {
        Sanctum::actingAs($this->principalBelqees);

        // إنشاء خطة متأخرة لمدرسة بلقيس (تاريخ نهايتها في الماضي وحالتها قيد التنفيذ)
        $overduePlan = ImprovementPlan::create([
            'cycle_id' => $this->cycle->cycle_id,
            'school_id' => $this->schoolBelqees->school_id,
            'created_by_user_id' => $this->evaluatorBelqees->user_id,
            'title' => 'خطة اختبار متأخرة',
            'start_date' => Carbon::now()->subMonths(3)->toDateString(),
            'end_date' => Carbon::now()->subMonth()->toDateString(), // تاريخ في الماضي
            'status' => 'Active',
        ]);

        // ربط مجال تحسين بالخطة
        $indicator = Indicator::firstOrFail();
        $area = ImprovementArea::create([
            'indicator_id' => $indicator->indicator_id,
            'name' => 'مجال تحسين اختباري',
            'priority' => 'High',
        ]);

        PlanImprovementArea::create([
            'plan_id' => $overduePlan->plan_id,
            'area_id' => $area->area_id,
            'created_at' => Carbon::now(),
        ]);

        // إجراء متأخر
        ImprovementAction::create([
            'plan_id' => $overduePlan->plan_id,
            'area_id' => $area->area_id,
            'title' => 'إجراء تنفيذي متأخر',
            'responsible_person_description' => 'منسق الجودة',
            'start_date' => Carbon::now()->subMonths(2)->toDateString(),
            'due_date' => Carbon::now()->subDays(10)->toDateString(), // موعد نهائي منقضٍ
            'status' => 'InProgress',
        ]);

        // إجراء منجز
        ImprovementAction::create([
            'plan_id' => $overduePlan->plan_id,
            'area_id' => $area->area_id,
            'title' => 'إجراء تنفيذي منجز',
            'responsible_person_description' => 'مدير المدرسة',
            'start_date' => Carbon::now()->subMonths(2)->toDateString(),
            'due_date' => Carbon::now()->addDays(10)->toDateString(),
            'status' => 'Done',
        ]);

        $response = $this->getJson("/api/v1/schools/{$this->schoolBelqees->school_id}/improvement-plans/summary");

        $response->assertStatus(200)
            ->assertJsonPath('message', 'تم حساب ملخص خطط التحسين بنجاح.')
            ->assertJsonStructure([
                'data' => [
                    'school_id',
                    'school_name',
                    'plans_summary' => [
                        'total_plans',
                        'in_progress_plans',
                        'completed_plans',
                        'draft_plans',
                        'cancelled_plans',
                        'delayed_plans',
                    ],
                    'actions_summary' => [
                        'total_actions',
                        'pending_actions',
                        'in_progress_actions',
                        'completed_actions',
                        'cancelled_actions',
                        'delayed_actions',
                        'overall_completion_rate',
                    ],
                    'plans' => [
                        '*' => [
                            'plan_id',
                            'title',
                            'status',
                            'is_delayed',
                            'total_actions',
                            'delayed_actions',
                            'completion_rate',
                        ],
                    ],
                ],
            ]);

        $data = $response->json('data');
        $this->assertGreaterThanOrEqual(1, $data['plans_summary']['delayed_plans']);
        $this->assertGreaterThanOrEqual(1, $data['actions_summary']['delayed_actions']);
    }

    /**
     * اختبار لوحة معلومات المدرسة الموحدة (dashboard).
     */
    public function test_school_dashboard_overview(): void
    {
        Sanctum::actingAs($this->principalBelqees);

        $response = $this->getJson("/api/v1/schools/{$this->schoolBelqees->school_id}/dashboard");

        $response->assertStatus(200)
            ->assertJsonPath('message', 'تم تحميل لوحة بيانات المدرسة بنجاح.')
            ->assertJsonPath('data.school.school_id', $this->schoolBelqees->school_id)
            ->assertJsonPath('data.school.school_name', $this->schoolBelqees->school_name)
            ->assertJsonStructure([
                'data' => [
                    'school' => ['school_id', 'school_name', 'educational_stage', 'status'],
                    'assessment',
                    'evidence_overview',
                    'improvement_plans_overview' => ['total_plans', 'in_progress_plans', 'completed_plans', 'delayed_plans', 'actions_completion_rate'],
                ],
            ]);
    }

    /**
     * اختبار تصدير تقرير التقييم المكتمل بصيغة JSON مهيكلة للفرونت إند (export).
     */
    public function test_export_assessment_report_as_structured_json(): void
    {
        Sanctum::actingAs($this->principalBelqees);

        // رصد جميع المؤشرات لاكتمال التقييم
        $this->scoreAllActiveIndicators(3);

        $response = $this->getJson("/api/v1/schools/{$this->schoolBelqees->school_id}/assessments/{$this->evaluationBelqees->evaluation_id}/export");

        $response->assertStatus(200)
            ->assertJsonPath('message', 'تم تصدير تقرير التقييم بنجاح.')
            ->assertJsonPath('data.report_metadata.report_type', 'SelfEvaluationReport')
            ->assertJsonPath('data.report_metadata.export_format', 'JSON')
            ->assertJsonPath('data.school_information.school_id', $this->schoolBelqees->school_id)
            ->assertJsonPath('data.executive_summary.final_score', 100)
            ->assertJsonPath('data.executive_summary.total_standards', 7)
            ->assertJsonPath('data.executive_summary.total_indicators', 109)
            ->assertJsonStructure([
                'data' => [
                    'report_metadata',
                    'school_information',
                    'evaluation_context',
                    'executive_summary' => [
                        'final_score',
                        'performance_level',
                        'total_standards',
                        'total_indicators',
                        'strengths_count',
                        'improvement_opportunities_count',
                        'top_strengths',
                        'priority_improvement_areas',
                    ],
                    'standards_results',
                    'evidence_completion',
                ],
            ]);
    }

    /**
     * اختبار الصلاحية: مسؤول النظام يرى تقارير ولوحات جميع المدارس.
     */
    public function test_system_admin_can_access_all_schools_reports(): void
    {
        Sanctum::actingAs($this->adminUser);

        // استعراض لوحة مدرسة بلقيس (1)
        $resp1 = $this->getJson("/api/v1/schools/{$this->schoolBelqees->school_id}/dashboard");
        $resp1->assertStatus(200);

        // استعراض لوحة مدرسة الفاروق (2)
        $resp2 = $this->getJson("/api/v1/schools/{$this->schoolFarouq->school_id}/dashboard");
        $resp2->assertStatus(200);

        // استعراض ملخص شواهد مدرسة الفاروق
        $evalFarouq = Evaluation::firstOrCreate(
            [
                'school_id' => $this->schoolFarouq->school_id,
                'cycle_id' => $this->cycle->cycle_id,
            ],
            [
                'created_by_user_id' => $this->evaluatorFarouq->user_id,
                'status' => 'InProgress',
            ]
        );
        $resp3 = $this->getJson("/api/v1/schools/{$this->schoolFarouq->school_id}/assessments/{$evalFarouq->evaluation_id}/evidence-summary");
        $resp3->assertStatus(200);
    }

    /**
     * اختبار الصلاحية: المشرف الوزاري يرى تقارير المدارس.
     */
    public function test_ministry_supervisor_can_access_school_reports(): void
    {
        Sanctum::actingAs($this->supervisorMinistry);

        $resp = $this->getJson("/api/v1/schools/{$this->schoolBelqees->school_id}/dashboard");
        $resp->assertStatus(200);
    }

    /**
     * اختبار العزل المؤسسي (القرار المعماري 9): محاولة مدير مدرسة الوصول لمدرسة أخرى ترجع 404.
     */
    public function test_school_principal_cannot_access_other_school_returns_404(): void
    {
        Sanctum::actingAs($this->principalBelqees);

        // مدير مدرسة بلقيس يحاول استعراض لوحة مدرسة الفاروق
        $resp = $this->getJson("/api/v1/schools/{$this->schoolFarouq->school_id}/dashboard");
        $resp->assertStatus(404)
            ->assertJsonPath('message', 'المدرسة المطلوبة غير موجودة.');
    }

    /**
     * اختبار العزل المؤسسي (القرار المعماري 9): محاولة مقيم مدرسة الوصول لمدرسة أخرى ترجع 404.
     */
    public function test_school_evaluator_cannot_access_other_school_returns_404(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // مقيم مدرسة بلقيس يحاول استعراض ملخص خطط مدرسة الفاروق
        $resp = $this->getJson("/api/v1/schools/{$this->schoolFarouq->school_id}/improvement-plans/summary");
        $resp->assertStatus(404)
            ->assertJsonPath('message', 'المدرسة المطلوبة غير موجودة.');
    }

    /**
     * اختبار فصل السلطات (BR-MIN-01): مسؤول المعايير بالوزارة ممنوع من الاطلاع على تقارير المدارس (403).
     */
    public function test_ministry_standards_manager_is_forbidden_from_reports(): void
    {
        Sanctum::actingAs($this->standardsManagerMinistry);

        $resp = $this->getJson("/api/v1/schools/{$this->schoolBelqees->school_id}/dashboard");
        $resp->assertStatus(403)
            ->assertJsonPath('message', 'غير مصرح');
    }

    /**
     * اختبار المسارات البديلة بدون البادئة v1 (/api/schools/...).
     */
    public function test_alias_routes_without_v1_prefix_work_identically(): void
    {
        Sanctum::actingAs($this->principalBelqees);

        $resp1 = $this->getJson("/api/schools/{$this->schoolBelqees->school_id}/dashboard");
        $resp1->assertStatus(200);

        $resp2 = $this->getJson("/api/schools/{$this->schoolBelqees->school_id}/improvement-plans/summary");
        $resp2->assertStatus(200);

        $resp3 = $this->getJson("/api/schools/{$this->schoolBelqees->school_id}/assessments/{$this->evaluationBelqees->evaluation_id}/evidence-summary");
        $resp3->assertStatus(200);
    }

    /**
     * دالة مساعدة لرصد جميع مؤشرات معيار محدد.
     */
    protected function scoreAllIndicatorsForStandard(Standard $standard, int $score): void
    {
        $indicators = Indicator::where('status', 'Active')
            ->whereHas('subStandard', function ($q) use ($standard) {
                $q->where('standard_id', $standard->standard_id);
            })
            ->with('scoreDescriptors')
            ->get();

        $scoreLevel = \App\Models\ScoreLevel::where('score_value', $score)->first();
        $targetLevelId = $scoreLevel ? $scoreLevel->score_level_id : 1;

        foreach ($indicators as $ind) {
            $descriptor = $ind->scoreDescriptors->firstWhere('score_level_id', $targetLevelId) ?? $ind->scoreDescriptors->first();
            EvaluationResult::updateOrCreate(
                [
                    'evaluation_id' => $this->evaluationBelqees->evaluation_id,
                    'indicator_id' => $ind->indicator_id,
                ],
                [
                    'standard_version_id' => $this->standardVersion->version_id,
                    'evaluator_user_id' => $this->evaluatorBelqees->user_id,
                    'score_descriptor_id' => $descriptor->descriptor_id,
                    'score' => $score,
                    'completion_status' => 'Completed',
                ]
            );
        }
    }

    /**
     * دالة مساعدة لرصد كافة المؤشرات الفعالة الـ 109 في النظام لتقييم بلقيس.
     */
    protected function scoreAllActiveIndicators(int $score): void
    {
        $indicators = Indicator::where('status', 'Active')
            ->with('scoreDescriptors')
            ->get();

        $scoreLevel = \App\Models\ScoreLevel::where('score_value', $score)->first();
        $targetLevelId = $scoreLevel ? $scoreLevel->score_level_id : 1;

        foreach ($indicators as $ind) {
            $descriptor = $ind->scoreDescriptors->firstWhere('score_level_id', $targetLevelId) ?? $ind->scoreDescriptors->first();
            EvaluationResult::updateOrCreate(
                [
                    'evaluation_id' => $this->evaluationBelqees->evaluation_id,
                    'indicator_id' => $ind->indicator_id,
                ],
                [
                    'standard_version_id' => $this->standardVersion->version_id,
                    'evaluator_user_id' => $this->evaluatorBelqees->user_id,
                    'score_descriptor_id' => $descriptor->descriptor_id,
                    'score' => $score,
                    'completion_status' => 'Completed',
                ]
            );
        }
    }
}
