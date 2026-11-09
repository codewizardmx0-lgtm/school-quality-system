<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

/**
 * اختبارات الحزمة 5: استمارة التقرير المفصلة الشاملة (Detailed Dossier) بتنسيق PDF و Excel (FE-GAP-08 / BE-GAP-07 / U-44)
 */
class Batch5DetailedReportExportTest extends TestCase
{
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
