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
}
