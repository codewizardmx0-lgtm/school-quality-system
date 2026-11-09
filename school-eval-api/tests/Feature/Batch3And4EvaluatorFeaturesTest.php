<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\School;
use App\Models\User;
use Database\Seeders\DemoEvaluationSeeder;
use Tests\TestCase;

class Batch3And4EvaluatorFeaturesTest extends TestCase
{
    /**
     * التحقق من توفر توزيع الدرجات (scoreDistribution) داخل كل معيار في standardsProgress لدعم التصفية المتعددة
     */
    public function test_dashboard_standards_progress_includes_score_distribution(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->first()
            ?? User::where('username', 'quality_belqees')->firstOrFail();

        $response = $this->actingAs($evaluator, 'sanctum')
            ->getJson('/api/v1/evaluator/dashboard-stats');

        $response->assertStatus(200);

        $standardsProgress = $response->json('data.standardsProgress');
        $this->assertNotEmpty($standardsProgress);

        foreach ($standardsProgress as $std) {
            $this->assertArrayHasKey('scoreDistribution', $std);
            $dist = $std['scoreDistribution'];
            $this->assertArrayHasKey('level3', $dist);
            $this->assertArrayHasKey('level2', $dist);
            $this->assertArrayHasKey('level1', $dist);
            $this->assertArrayHasKey('level0', $dist);
            $this->assertArrayHasKey('unscored', $dist);
        }
    }

    /**
     * التحقق من إرجاع إحصائيات المعايير (stats) والدرجات والشواهد على المؤشرات في شجرة المعايير
     */
    public function test_active_standards_tree_includes_stats_and_indicator_evaluation(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->first()
            ?? User::where('username', 'quality_belqees')->firstOrFail();

        $response = $this->actingAs($evaluator, 'sanctum')
            ->getJson('/api/v1/standard-versions/active/tree');

        $response->assertStatus(200);

        $standards = $response->json('data.standards');
        $this->assertNotEmpty($standards);

        $firstStd = $standards[0];
        $this->assertArrayHasKey('stats', $firstStd);
        $this->assertArrayHasKey('totalIndicators', $firstStd['stats']);
        $this->assertArrayHasKey('scoredIndicators', $firstStd['stats']);
        $this->assertArrayHasKey('level3Count', $firstStd['stats']);
        $this->assertArrayHasKey('totalEvidences', $firstStd['stats']);

        // فحص المؤشرات
        $firstSub = $firstStd['subStandards'][0] ?? null;
        $this->assertNotNull($firstSub);
        $firstInd = $firstSub['indicators'][0] ?? null;
        $this->assertNotNull($firstInd);

        $this->assertArrayHasKey('score', $firstInd);
        $this->assertArrayHasKey('evidenceCount', $firstInd);
    }

    /**
     * التحقق من ضبط هامش تقرير الـ PDF إلى 54 مم لمنع تداخل الترويسة مع المحتوى
     */
    public function test_admin_executive_report_pdf_margin_is_expanded_to_54mm(): void
    {
        $viewPath = resource_path('views/reports/admin_executive_report.blade.php');
        $this->assertFileExists($viewPath);

        $content = file_get_contents($viewPath);
        $this->assertStringContainsString('margin-top: 54mm', $content);

        $servicePath = app_path('Services/AdminExecutiveReportService.php');
        $this->assertFileExists($servicePath);

        $serviceContent = file_get_contents($servicePath);
        $this->assertMatchesRegularExpression("/'margin_top'\s*=>\s*54/", $serviceContent);
    }
}
