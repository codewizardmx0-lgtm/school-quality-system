<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\EvaluationResult;
use App\Models\ImprovementArea;
use App\Models\User;
use Tests\TestCase;

class Batch6SuggestionsAndDiscrepancyAuditTest extends TestCase
{
    /**
     * التحقق من مسار استبعاد مقترح التحسين واستعادته وحقل isExcluded
     */
    public function test_exclude_and_restore_suggestion_lifecycle(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->first()
            ?? User::where('username', 'quality_belqees')->firstOrFail();

        $evaluation = Evaluation::where('school_id', $evaluator->school_id)->firstOrFail();

        // إيجاد نتيجة مؤشر غير متبناة ولها فجوة (درجة أقل من 3)
        $result = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
            ->whereNotNull('score')
            ->where('score', '<', 3)
            ->whereNotIn('result_id', ImprovementArea::pluck('result_id'))
            ->firstOrFail();

        // 1. استبعاد المقترح
        $excludeResponse = $this->actingAs($evaluator, 'sanctum')
            ->postJson("/api/v1/evaluator/suggestions/{$result->result_id}/exclude");

        $excludeResponse->assertStatus(200)
            ->assertJsonPath('data.isExcluded', true);

        $this->assertDatabaseHas('evaluation_results', [
            'result_id' => $result->result_id,
            'is_excluded' => 1,
        ]);

        // 2. التحقق من ظهور حالة الاستبعاد في قائمة المقترحات
        $suggestionsResponse = $this->actingAs($evaluator, 'sanctum')
            ->getJson("/api/v1/evaluations/{$evaluation->evaluation_id}/improvement-suggestions");

        $suggestionsResponse->assertStatus(200);
        $sugs = $suggestionsResponse->json('data.suggestions');
        $matching = collect($sugs)->firstWhere('resultId', $result->result_id);
        $this->assertNotNull($matching);
        $this->assertTrue($matching['isExcluded']);

        // 3. استعادة المقترح المستبعد
        $restoreResponse = $this->actingAs($evaluator, 'sanctum')
            ->postJson("/api/v1/evaluator/suggestions/{$result->result_id}/restore");

        $restoreResponse->assertStatus(200)
            ->assertJsonPath('data.isExcluded', false);

        $this->assertDatabaseHas('evaluation_results', [
            'result_id' => $result->result_id,
            'is_excluded' => 0,
        ]);
    }

    /**
     * التحقق من قيد منع استبعاد مقترح تم تبنيه كإجراء تحسين مسبقاً (خطأ 422)
     */
    public function test_cannot_exclude_already_adopted_suggestion(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->first()
            ?? User::where('username', 'quality_belqees')->firstOrFail();

        $adoptedArea = ImprovementArea::whereNotNull('result_id')->first();
        if (!$adoptedArea) {
            $this->markTestSkipped('لا توجد مجالات تحسين متبناة لاختبار القيد.');
        }

        $response = $this->actingAs($evaluator, 'sanctum')
            ->postJson("/api/v1/evaluator/suggestions/{$adoptedArea->result_id}/exclude");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'لا يمكن استبعاد مقترح تم تبنيه كإجراء تحسين مسبقاً. يجب إلغاء تبني الإجراء أولاً.');
    }

    /**
     * التحقق من محرك التدقيق المنطقي الحتمي للمفارقات (Deterministic Discrepancy Auditor)
     */
    public function test_discrepancy_auditor_endpoint_returns_expected_cases(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->first()
            ?? User::where('username', 'quality_belqees')->firstOrFail();

        $response = $this->actingAs($evaluator, 'sanctum')
            ->getJson('/api/v1/evaluator/discrepancies/audit');

        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertArrayHasKey('summary', $data);
        $this->assertArrayHasKey('cases', $data);

        $summary = $data['summary'];
        $this->assertArrayHasKey('totalDiscrepancies', $summary);
        $this->assertArrayHasKey('criticalCount', $summary);
        $this->assertArrayHasKey('mediumCount', $summary);
        $this->assertArrayHasKey('warningCount', $summary);
        $this->assertArrayHasKey('auditPassed', $summary);

        $cases = collect($data['cases']);
        $this->assertCount(5, $cases);

        $caseIds = $cases->pluck('caseId')->all();
        $this->assertEquals(['case_1', 'case_2', 'case_3', 'case_4', 'case_5'], $caseIds);

        foreach ($cases as $c) {
            $this->assertArrayHasKey('title', $c);
            $this->assertArrayHasKey('severity', $c);
            $this->assertArrayHasKey('severityLabel', $c);
            $this->assertArrayHasKey('description', $c);
            $this->assertArrayHasKey('count', $c);
            $this->assertArrayHasKey('items', $c);
        }
    }
}
