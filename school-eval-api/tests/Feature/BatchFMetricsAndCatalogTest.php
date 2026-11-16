<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\School;
use App\Models\User;
use Tests\TestCase;

/**
 * اختبارات الحزمة 3:
 * - بطاقة السياق الاسترشادي للمؤشرات الكمية (indicators-context / SchoolMetricsService).
 * - كرت التدخلات المقترحة من بنك الإجراءات (action-recommendations / ActionCatalogService).
 * - إرجاع evaluationId في activeStandardsTree والعزل المؤسسي.
 */
class BatchFMetricsAndCatalogTest extends TestCase
{
    public function test_active_standards_tree_includes_evaluation_id(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();

        $res = $this->actingAs($evaluator, 'sanctum')
            ->getJson('/api/v1/standard-versions/active/tree');

        $res->assertStatus(200);
        $evalId = $res->json('data.evaluationId');
        $this->assertNotNull($evalId);
        $this->assertIsInt($evalId);
    }

    public function test_indicators_context_returns_school_metrics_and_enforces_isolation(): void
    {
        $evaluatorFarouq = User::where('username', 'quality_farouq')->firstOrFail();
        $evaluatorBelqees = User::where('username', 'quality_belqees')->firstOrFail();

        $farouqEval = Evaluation::where('school_id', $evaluatorFarouq->school_id)->latest('evaluation_id')->firstOrFail();

        // 1. وصول مصرح به لمدرسة الفاروق
        $okRes = $this->actingAs($evaluatorFarouq, 'sanctum')
            ->getJson("/api/v1/evaluations/{$farouqEval->evaluation_id}/indicators-context");

        $okRes->assertStatus(200)
            ->assertJsonStructure([
                'data' => ['indicators', 'is_snapshot'],
            ]);

        $indicators = $okRes->json('data.indicators');
        $this->assertIsArray($indicators);
        $this->assertNotEmpty($indicators);
        $this->assertArrayHasKey('1-1-2', $indicators);
        $this->assertArrayHasKey('suggested_level', $indicators['1-1-2']);
        $this->assertArrayHasKey('badge', $indicators['1-1-2']);

        // 2. عزل مؤسسي 404 عند محاولة مقيم بلقيس قراءة سياق الفاروق
        $crossRes = $this->actingAs($evaluatorBelqees, 'sanctum')
            ->getJson("/api/v1/evaluations/{$farouqEval->evaluation_id}/indicators-context");

        $crossRes->assertStatus(404);
    }

    public function test_action_recommendations_returns_catalog_for_weak_indicator_and_validates_params(): void
    {
        $evaluatorFarouq = User::where('username', 'quality_farouq')->firstOrFail();
        $evaluatorBelqees = User::where('username', 'quality_belqees')->firstOrFail();
        $farouqEval = Evaluation::where('school_id', $evaluatorFarouq->school_id)->latest('evaluation_id')->firstOrFail();

        // 1. بدون indicator_code => 422
        $missingRes = $this->actingAs($evaluatorFarouq, 'sanctum')
            ->getJson("/api/v1/evaluations/{$farouqEval->evaluation_id}/action-recommendations");
        $missingRes->assertStatus(422);

        // 2. مؤشر 1-1-1 (في الديمو مسجل بدرجة 0 => فجوة ضعيفة) => توصيات البنك
        $weakRes = $this->actingAs($evaluatorFarouq, 'sanctum')
            ->getJson("/api/v1/evaluations/{$farouqEval->evaluation_id}/action-recommendations?indicator_code=1-1-1");
        $weakRes->assertStatus(200);
        $this->assertTrue((bool) $weakRes->json('data.is_weak'));
        $this->assertNotEmpty($weakRes->json('data.recommendations'));
        $this->assertArrayHasKey('title', $weakRes->json('data.recommendations.0'));
        $this->assertArrayHasKey('plan_type', $weakRes->json('data.recommendations.0'));

        // 3. عزل مؤسسي 404
        $crossRes = $this->actingAs($evaluatorBelqees, 'sanctum')
            ->getJson("/api/v1/evaluations/{$farouqEval->evaluation_id}/action-recommendations?indicator_code=1-1-1");
        $crossRes->assertStatus(404);
    }
}
