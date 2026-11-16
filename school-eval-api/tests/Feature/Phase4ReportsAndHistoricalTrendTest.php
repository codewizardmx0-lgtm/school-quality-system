<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Phase4ReportsAndHistoricalTrendTest extends TestCase
{
    use DatabaseTransactions;

    public function test_export_seal_certificate_pdf_returns_pdf_stream(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        Sanctum::actingAs($evaluator);

        $response = $this->get('/api/v1/evaluator/export-seal-certificate-pdf');

        $response->assertOk();
        $this->assertEquals('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('digital_seal_certificate_', (string) $response->headers->get('Content-Disposition'));
    }

    public function test_export_evidences_zip_creates_and_streams_archive(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        Sanctum::actingAs($evaluator);

        // خيار 1: الإصدار الأخير فقط
        $responseLatest = $this->get('/api/v1/evaluator/export-evidences-zip?mode=latest');
        $responseLatest->assertOk();
        $this->assertStringContainsString('attachment', (string) $responseLatest->headers->get('Content-Disposition'));
        $this->assertStringContainsString('evidence_dossier_latest_', (string) $responseLatest->headers->get('Content-Disposition'));

        // خيار 2: كافة الإصدارات التاريخية
        $responseAll = $this->get('/api/v1/evaluator/export-evidences-zip?mode=all');
        $responseAll->assertOk();
        $this->assertStringContainsString('attachment', (string) $responseAll->headers->get('Content-Disposition'));
        $this->assertStringContainsString('evidence_dossier_all_versions_', (string) $responseAll->headers->get('Content-Disposition'));
    }

    public function test_export_evidence_inventory_excel_streams_spreadsheet(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        Sanctum::actingAs($evaluator);

        $response = $this->get('/api/v1/evaluator/export-evidence-inventory-excel');

        $response->assertOk();
        $this->assertStringContainsString('evidence_inventory_', (string) $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('.xlsx', (string) $response->headers->get('Content-Disposition'));
    }

    public function test_evaluator_historical_trend_endpoint_returns_trend_data(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        Sanctum::actingAs($evaluator);

        $response = $this->getJson('/api/v1/evaluator/trend');

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                'has_previous_cycle',
                'school_id',
                'current_cycle',
                'notice',
            ],
        ]);
    }
}
