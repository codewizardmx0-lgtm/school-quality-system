<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\ImprovementAction;
use App\Models\ImprovementArea;
use App\Models\ImprovementPlan;
use App\Models\Indicator;
use App\Models\PlanImprovementArea;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class PlanVersionLifecycleTest extends TestCase
{
    use DatabaseTransactions;

    protected User $evaluator;
    protected School $school;
    protected EvaluationCycle $cycle;
    protected Evaluation $evaluation;
    protected EvaluationResult $resultLow;

    protected function setUp(): void
    {
        parent::setUp();

        $this->school = School::where('identification_data', 'SCH-AMANA-2026-001')->firstOrFail();
        $this->evaluator = User::where('username', 'quality_belqees')->firstOrFail();
        $this->cycle = EvaluationCycle::firstOrFail();

        $this->evaluation = Evaluation::firstOrCreate(
            [
                'cycle_id'  => $this->cycle->cycle_id,
                'school_id' => $this->school->school_id,
            ],
            [
                'created_by_user_id' => $this->evaluator->user_id,
                'status'             => 'InProgress',
            ]
        );

        $indicator = Indicator::firstOrFail();
        $desc = \App\Models\IndicatorScoreDescriptor::where('indicator_id', $indicator->indicator_id)->first();

        $this->resultLow = EvaluationResult::updateOrCreate(
            [
                'evaluation_id' => $this->evaluation->evaluation_id,
                'indicator_id'  => $indicator->indicator_id,
            ],
            [
                'cycle_id'            => $this->cycle->cycle_id,
                'standard_version_id' => $this->cycle->version_id,
                'evaluator_user_id'   => $this->evaluator->user_id,
                'score'               => 1,
                'score_descriptor_id' => $desc?->descriptor_id ?? 1,
                'completion_status'   => 'Completed',
            ]
        );
    }

    public function test_get_school_improvement_plans_returns_plans_with_metrics_and_versioning(): void
    {
        $res = $this->actingAs($this->evaluator, 'sanctum')
            ->getJson('/api/v1/evaluator/improvement-plans');

        $res->assertStatus(200);
        $res->assertJsonStructure([
            'data' => [
                '*' => [
                    'planId',
                    'planType',
                    'planTypeLabel',
                    'title',
                    'versionNumber',
                    'parentPlanId',
                    'versionTag',
                    'academicYear',
                    'startDate',
                    'endDate',
                    'status',
                    'statusArabic',
                    'overallProgressPercentage',
                    'areasCount',
                    'totalActions',
                    'doneActions',
                    'inProgressActions',
                    'pendingActions',
                    'delayedActions',
                    'createdAt',
                ],
            ],
        ]);
    }

    public function test_get_current_plan_returns_version_metadata_and_rich_available_areas(): void
    {
        $res = $this->actingAs($this->evaluator, 'sanctum')
            ->getJson('/api/v1/improvement-plans/current');

        $res->assertStatus(200);
        $data = $res->json('data');
        $this->assertArrayHasKey('versionNumber', $data);
        $this->assertArrayHasKey('parentPlanId', $data);
        $this->assertArrayHasKey('versionTag', $data);
        $this->assertArrayHasKey('availableAreas', $data);
    }

    public function test_clone_plan_version_creates_v2_archives_v1_and_clones_actions_and_areas(): void
    {
        // 1. جلب الخطة الحالية أو إنشائها
        $currentRes = $this->actingAs($this->evaluator, 'sanctum')->getJson('/api/v1/improvement-plans/current');
        $currentRes->assertStatus(200);
        $planId = $currentRes->json('data.planId');
        $this->assertGreaterThan(0, $planId);

        $sourcePlan = ImprovementPlan::with(['planImprovementAreas', 'actions'])->find($planId);
        $this->assertNotNull($sourcePlan);

        // إنشاء مجال وربطه
        $area = ImprovementArea::firstOrCreate(
            ['result_id' => $this->resultLow->result_id],
            [
                'indicator_id' => $this->resultLow->indicator_id,
                'name' => 'مجال اختبار الاستنساخ',
                'priority' => 'High',
                'target_score' => 3,
            ]
        );

        PlanImprovementArea::firstOrCreate([
            'plan_id' => $sourcePlan->plan_id,
            'area_id' => $area->area_id,
        ], ['created_at' => now()]);

        ImprovementAction::create([
            'plan_id' => $sourcePlan->plan_id,
            'area_id' => $area->area_id,
            'title' => 'إجراء تجريبي للاستنساخ',
            'responsible_person_description' => 'منسق الجودة والتحسين',
            'start_date' => now()->toDateString(),
            'due_date' => now()->addMonths(2)->toDateString(),
            'status' => 'InProgress',
            'completion_percentage' => 40,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $sourcePlan->refresh();

        // 2. استدعاء مسار الاستنساخ الذكي clone-version
        $cloneRes = $this->actingAs($this->evaluator, 'sanctum')
            ->postJson("/api/v1/evaluator/improvement-plans/{$planId}/clone-version");

        $cloneRes->assertStatus(201);
        $newPlanId = $cloneRes->json('data.planId');
        $this->assertNotEquals($planId, $newPlanId);
        $this->assertEquals(2, $cloneRes->json('data.versionNumber'));
        $this->assertEquals($planId, $cloneRes->json('data.parentPlanId'));
        $this->assertEquals('Active', $cloneRes->json('data.status'));

        // 3. التحقق من أرشفة الخطة المصدر v1
        $sourcePlan->refresh();
        $this->assertEquals('Archived', $sourcePlan->status);

        // 4. التحقق من استنساخ المجالات والإجراءات في الخطة الجديدة v2
        $newPlan = ImprovementPlan::with(['planImprovementAreas', 'actions'])->find($newPlanId);
        $this->assertNotNull($newPlan);
        $this->assertEquals($sourcePlan->planImprovementAreas->count(), $newPlan->planImprovementAreas->count());
        $this->assertEquals($sourcePlan->actions->count(), $newPlan->actions->count());
    }

    public function test_auto_link_area_in_create_improvement_action(): void
    {
        $area = ImprovementArea::firstOrCreate(
            ['result_id' => $this->resultLow->result_id],
            [
                'indicator_id' => $this->resultLow->indicator_id,
                'name' => 'مجال اختبار الربط التلقائي',
                'priority' => 'High',
                'target_score' => 3,
            ]
        );

        $planRes = $this->actingAs($this->evaluator, 'sanctum')->getJson('/api/v1/improvement-plans/current');
        $planId = $planRes->json('data.planId');

        PlanImprovementArea::where('plan_id', $planId)->where('area_id', $area->area_id)->delete();

        $actionRes = $this->actingAs($this->evaluator, 'sanctum')
            ->postJson('/api/v1/improvement-actions', [
                'planId' => $planId,
                'areaId' => $area->area_id,
                'title' => 'إجراء لاختبار الربط التلقائي بالمفتاح المركب',
                'leader' => 'لجنة التطوير والجودة',
            ]);

        $actionRes->assertStatus(201);

        $exists = PlanImprovementArea::where('plan_id', $planId)->where('area_id', $area->area_id)->exists();
        $this->assertTrue($exists);
    }

    public function test_improvement_suggestions_returns_adopted_plan_metadata(): void
    {
        $area = ImprovementArea::firstOrCreate(
            ['result_id' => $this->resultLow->result_id],
            [
                'indicator_id' => $this->resultLow->indicator_id,
                'name' => 'مجال مقترح متبنى',
                'priority' => 'High',
                'target_score' => 3,
            ]
        );

        $plan = ImprovementPlan::firstOrCreate([
            'school_id' => $this->school->school_id,
            'cycle_id' => $this->cycle->cycle_id,
            'status' => 'Active',
        ], [
            'title' => 'خطة تحسين نموذجية',
            'plan_type' => ImprovementPlan::TYPE_QUALITY_IMPROVEMENT,
            'version_number' => 1,
            'version_tag' => 'خطة أساسية',
            'created_by_user_id' => $this->evaluator->user_id,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonths(6)->toDateString(),
        ]);

        PlanImprovementArea::firstOrCreate([
            'plan_id' => $plan->plan_id,
            'area_id' => $area->area_id,
        ], ['created_at' => now()]);

        $res = $this->actingAs($this->evaluator, 'sanctum')
            ->getJson('/api/v1/evaluator/improvement-suggestions');

        $res->assertStatus(200);
        $suggestions = $res->json('data.suggestions') ?? [];
        $this->assertNotEmpty($suggestions);

        $adoptedItem = collect($suggestions)->firstWhere('resultId', $this->resultLow->result_id);
        $this->assertNotNull($adoptedItem);
        $this->assertTrue($adoptedItem['isAlreadyAdopted']);
        $this->assertNotNull($adoptedItem['adoptedPlan']);
        $this->assertEquals($plan->plan_id, $adoptedItem['adoptedPlan']['planId']);
    }
}
