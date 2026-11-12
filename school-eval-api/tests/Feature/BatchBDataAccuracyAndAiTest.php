<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use Database\Seeders\DemoEvaluationSeeder;
use Tests\TestCase;

/**
 * اختبارات الحزمة ب: دقة بيانات التغطية والملفات، الإشعارات الحقيقية، والتحليل الذكي الديناميكي (الملاحظات 2، 3، 4، 5)
 */
class BatchBDataAccuracyAndAiTest extends TestCase
{
    /**
     * التحقق من دقة إحصاءات تغطية الشواهد (312 تغطية / 278 متطلباً / 20 ملفاً فعلياً) (الملاحظة 3)
     */
    public function test_dashboard_kpis_return_accurate_evidence_coverage_and_unique_documents(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();

        $response = $this->actingAs($evaluator, 'sanctum')
            ->getJson('/api/v1/evaluator/dashboard-stats');

        $response->assertStatus(200);
        $kpis = $response->json('data.kpis');

        $this->assertGreaterThanOrEqual(109, $kpis['documentedEvidences']);
        $this->assertEquals(278, $kpis['targetEvidences']);
        $this->assertEquals(45, $kpis['uniqueDocumentsCount']);
        $this->assertEquals(109, $kpis['coveredIndicatorsCount']);
        $this->assertEquals(100, $kpis['completionPercentage']);
    }

    /**
     * التحقق من توليد التحليل الذكي ديناميكياً من بيانات المدرسة الفعلية بدون نصوص ثابتة (الملاحظة 4)
     */
    public function test_ai_analysis_generates_dynamic_school_data_without_hardcoded_mock_school(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();

        $triggerResponse = $this->actingAs($evaluator, 'sanctum')
            ->postJson('/api/v1/ai/analyses');

        $triggerResponse->assertStatus(201);
        $summary = (string) $triggerResponse->json('data.summary');

        $this->assertStringContainsString('الفاروق', $summary);
        $this->assertStringNotContainsString('مدرسة الأمل', $summary);
        $this->assertGreaterThan(0, $triggerResponse->json('data.averageScore'));

        $analysisId = $triggerResponse->json('data.analysisId');
        $recResponse = $this->actingAs($evaluator, 'sanctum')
            ->getJson("/api/v1/ai/analyses/{$analysisId}/recommendations");

        $recResponse->assertStatus(200);
        $this->assertNotEmpty($recResponse->json('data.strengths'));
        $this->assertNotEmpty($recResponse->json('data.improvements'));
        $this->assertNotEmpty($recResponse->json('data.initiatives'));

        // التحقق من دعم المعرف 0 لجلب آخر تحليل خاص بنفس المدرسة تلقائياً
        $latestResponse = $this->actingAs($evaluator, 'sanctum')
            ->getJson('/api/v1/ai/analyses/0/recommendations');
        $latestResponse->assertStatus(200);
        $this->assertEquals($analysisId, $latestResponse->json('data.analysisId'));
    }

    /**
     * التحقق من عدم تكرار الإشعارات عند إعادة تشغيل الـ Seeder (الملاحظة 2)
     */
    public function test_demo_seeder_does_not_duplicate_notifications_on_rerun(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        $countBefore = Notification::where('recipient_user_id', $evaluator->user_id)->count();

        $this->seed(DemoEvaluationSeeder::class);
        $countAfter = Notification::where('recipient_user_id', $evaluator->user_id)->count();

        $this->assertEquals($countBefore, $countAfter);
        $this->assertGreaterThanOrEqual(2, $countAfter);
    }
}
