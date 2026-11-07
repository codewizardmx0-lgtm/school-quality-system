<?php

namespace Tests\Feature;

use App\Models\School;
use App\Models\User;
use Tests\TestCase;

class EvaluatorSuiteFeatureTest extends TestCase
{
    /**
     * Test dashboard stats endpoint
     */
    public function test_evaluator_dashboard_stats_endpoint(): void
    {
        $user = User::where('username', 'quality_belqees')->first();
        if (!$user) {
            $user = User::factory()->create();
        }

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/evaluator/dashboard-stats');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'schoolInfo' => ['schoolId', 'schoolName', 'status', 'currentEvaluator'],
                'kpis' => ['completionPercentage', 'totalIndicators', 'scoredIndicators', 'documentedEvidences', 'targetEvidences'],
                'cycleSteps',
                'standardsProgress',
                'pendingIndicators',
            ],
            'message',
            'errors',
            'meta',
        ]);
    }

    /**
     * Test active standards tree endpoint
     */
    public function test_active_standards_tree_endpoint(): void
    {
        $user = User::where('username', 'quality_belqees')->first() ?? User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/standard-versions/active/tree');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'versionId',
                'versionCode',
                'title',
                'standards',
            ],
        ]);
    }

    /**
     * Test current improvement plan endpoint
     */
    public function test_current_improvement_plan_endpoint(): void
    {
        $user = User::where('username', 'quality_belqees')->first() ?? User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/improvement-plans/current');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'planId',
                'title',
                'summary' => ['totalActions', 'inProgressActions', 'doneActions'],
                'actions',
            ],
        ]);
    }

    /**
     * Test preflight check endpoint
     */
    public function test_preflight_check_endpoint(): void
    {
        $user = User::where('username', 'quality_belqees')->first() ?? User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/evaluations/current/preflight-check');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'canSubmit',
                'readinessPercentage',
                'checklist',
                'digitalSealInfo',
            ],
        ]);
    }

    /**
     * Test evaluator evidence inventory endpoint
     */
    public function test_evaluator_evidence_inventory_endpoint(): void
    {
        $user = User::where('username', 'quality_belqees')->first() ?? User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/evaluator/evidence-inventory');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'evaluationId',
                'standards',
                'summary' => [
                    'totalIndicators',
                    'indicatorsWithSufficientEvidence',
                    'indicatorsMissingEvidence',
                    'totalEvidencesUploaded',
                    'byType',
                    'byStatus',
                ],
            ],
            'message',
        ]);
    }

    /**
     * Test evaluator improvement suggestions endpoint
     */
    public function test_evaluator_improvement_suggestions_endpoint(): void
    {
        $user = User::where('username', 'quality_belqees')->first() ?? User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/evaluator/improvement-suggestions');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'targetScore',
                'suggestions',
                'meta' => [
                    'totalSuggestions',
                ],
            ],
        ]);
    }

    /**
     * Test evaluator action catalog endpoint
     */
    public function test_evaluator_action_catalog_endpoint(): void
    {
        $user = User::where('username', 'quality_belqees')->first() ?? User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/improvement-plans/action-catalog');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'catalog_id',
                    'sub_standard_code',
                    'plan_type',
                    'title',
                ],
            ],
        ]);
    }

    /**
     * Test evaluator export report PDF endpoint
     */
    public function test_evaluator_export_report_pdf_endpoint(): void
    {
        $user = User::where('username', 'quality_belqees')->first() ?? User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->get('/api/v1/evaluator/export-report-pdf');

        $response->assertStatus(200);
        $this->assertEquals('application/pdf', $response->headers->get('content-type'));
    }

    /**
     * Test evaluator multi-link endpoint
     */
    public function test_evaluator_multi_link_endpoint(): void
    {
        $user = User::where('username', 'quality_belqees')->first() ?? User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/evaluator/evidence-links/multi', [
                'targetIndicatorIds' => [1, 2],
            ]);

        $response->assertStatus(422); // document_id is required
    }

    /**
     * Test school principal cannot score indicators (403 Forbidden)
     */
    public function test_school_principal_cannot_score_indicators_403(): void
    {
        $principal = User::where('username', 'principal_farouq')->firstOrFail();

        $response = $this->actingAs($principal, 'sanctum')
            ->postJson('/api/v1/evaluation-results', [
                'indicatorId' => 1,
                'score'       => 3,
            ]);

        $response->assertStatus(403);
    }

    /**
     * Test school principal cannot submit final evaluation (403 Forbidden)
     */
    public function test_school_principal_cannot_submit_final_evaluation_403(): void
    {
        $principal = User::where('username', 'principal_farouq')->firstOrFail();

        $response = $this->actingAs($principal, 'sanctum')
            ->postJson('/api/v1/evaluation-submissions/submit', [
                'password' => 'DevTestPassword2026!',
            ]);

        $response->assertStatus(403);
    }
}
