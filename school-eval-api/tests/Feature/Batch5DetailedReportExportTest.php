<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\User;
use App\Services\EvaluationReportService;
use Illuminate\Support\Facades\View;
use Tests\TestCase;

/**
 * اختبارات الحزمة 5 والحزمة أ: استمارة التقرير المفصلة الشاملة (Detailed Dossier) وتصحيح طلب الاستكمال (FE-GAP-08 / BE-GAP-07 / U-44)
 */
class Batch5DetailedReportExportTest extends TestCase
{
    /**
     * التحقق من امتلاء كافة رموز وأسماء المعايير والمؤشرات وأدوات التحقق في بيانات وقالب التقرير المفصل
     */
    public function test_detailed_dossier_contains_populated_standards_and_indicators(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        $evaluation = Evaluation::where('school_id', $evaluator->school_id)->firstOrFail();
        $evaluation->loadMissing(['school', 'cycle']);

        /** @var EvaluationReportService $service */
        $service = app(EvaluationReportService::class);
        $viewData = $service->buildDetailedDossierViewData($evaluation);

        $this->assertCount(7, $viewData['standards_summary']);
        $this->assertEquals(109, $viewData['total_indicators_count']);
        $this->assertGreaterThanOrEqual(109, $viewData['total_evidence_count']);

        foreach ($viewData['standards_summary'] as $std) {
            $this->assertNotEmpty($std['standard_code']);
            $this->assertNotEmpty($std['standard_name']);
        }

        $firstInd = $viewData['standards_tree'][0]['sub_standards'][0]['indicators'][0];
        $this->assertNotEmpty($firstInd['indicator_code']);
        $this->assertNotEmpty($firstInd['indicator_name']);

        $renderedHtml = View::make('reports.detailed_dossier_report', $viewData)->render();
        $this->assertStringContainsString($firstInd['indicator_code'], $renderedHtml);
        $this->assertStringContainsString($firstInd['indicator_name'], $renderedHtml);
        $this->assertStringContainsString($viewData['standards_summary'][0]['standard_name'], $renderedHtml);
    }

    /**
     * التحقق من عدم ظهور تنبيه طلب الاستكمال عند عدم وجود طلب مفتوح للمدرسة الحالية
     */
    public function test_completion_alert_is_null_when_no_open_request_exists_for_evaluation(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();

        $response = $this->actingAs($evaluator, 'sanctum')
            ->getJson('/api/v1/evaluator/dashboard-stats');

        $response->assertStatus(200);
        $this->assertNull($response->json('data.completionAlert'));
    }
    /**
     * التحقق من تصدير استمارة التقرير المفصلة الشاملة PDF لمقيم المدرسة
     */
    public function test_evaluator_can_export_detailed_dossier_pdf(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();

        $response = $this->actingAs($evaluator, 'sanctum')
            ->get('/api/v1/evaluator/export-detailed-pdf');

        $response->assertStatus(200);
        $this->assertEquals('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('detailed_dossier_', (string)$response->headers->get('Content-Disposition'));

        // التأكد من أن المحتوى يبدأ ببصمة PDF الرسمية
        $content = $response->getContent();
        $this->assertStringStartsWith('%PDF-', $content);
    }

    /**
     * التحقق من تصدير مصفوفة التقييم الشاملة بتنسيق Excel (XLSX)
     */
    public function test_evaluator_can_export_detailed_matrix_excel(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();

        $response = $this->actingAs($evaluator, 'sanctum')
            ->get('/api/v1/evaluator/export-detailed-excel');

        $response->assertStatus(200);
        $this->assertStringContainsString('evaluation_matrix_', (string)$response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('.xlsx', (string)$response->headers->get('Content-Disposition'));
    }

    /**
     * التحقق من حظر الوصول غير المصرح به (Guest) برمز 401
     */
    public function test_unauthenticated_user_cannot_export_detailed_reports(): void
    {
        $response = $this->getJson('/api/v1/evaluator/export-detailed-pdf');
        $response->assertStatus(401);

        $responseExcel = $this->getJson('/api/v1/evaluator/export-detailed-excel');
        $responseExcel->assertStatus(401);
    }
}
