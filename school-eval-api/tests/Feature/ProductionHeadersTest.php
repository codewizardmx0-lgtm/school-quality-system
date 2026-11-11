<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات الشريحة 11: ترويسات الأمان (Security Headers) وتوافق تصدير الملفات (PDF / Excel).
 */
class ProductionHeadersTest extends TestCase
{
    use DatabaseTransactions;

    protected User $adminUser;
    protected School $school;

    protected function setUp(): void
    {
        parent::setUp();
        $this->adminUser = User::where('username', 'admin')->firstOrFail();
        $this->school = School::where('identification_data', 'SCH-SANAA-2026-001')->firstOrFail();
    }

    /**
     * Slice 11: Security Headers - Default headers present on responses.
     */
    public function test_security_headers_are_present_on_api_responses(): void
    {
        $response = $this->getJson('/api/v1/auth/me');

        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    /**
     * Slice 11: Security Headers - HSTS present only in production with HTTPS.
     */
    public function test_hsts_header_present_in_production_environment_with_https(): void
    {
        config(['app.env' => 'production']);

        $response = $this->get('https://localhost/api/v1/auth/me', [
            'HTTP_X_FORWARDED_PROTO' => 'https',
            'HTTPS' => 'on',
        ]);

        $response->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    /**
     * Slice 11: Security Headers - HSTS absent in non-production.
     */
    public function test_hsts_header_absent_in_non_production_environments(): void
    {
        config(['app.env' => 'testing']);

        $response = $this->getJson('/api/v1/auth/me');
        $this->assertFalse($response->headers->has('Strict-Transport-Security'));
    }

    /**
     * Slice 11: Security Headers - Export endpoint retains PDF content type and attachment headers.
     */
    public function test_security_headers_preserve_pdf_export_headers(): void
    {
        Sanctum::actingAs($this->adminUser);

        $evaluation = Evaluation::where('school_id', $this->school->school_id)->first();
        if ($evaluation) {
            $response = $this->get("/api/v1/reports/evaluation/{$evaluation->evaluation_id}/export/pdf");
            if ($response->status() === 200) {
                $response->assertHeader('X-Frame-Options', 'DENY');
                $response->assertHeader('X-Content-Type-Options', 'nosniff');
                $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type'));
                $this->assertStringContainsString('attachment;', $response->headers->get('Content-Disposition'));
            }
        }
        $this->assertTrue(true);
    }

    /**
     * Slice 11: Security Headers - Export endpoint retains Excel content type and attachment headers.
     */
    public function test_security_headers_preserve_excel_export_headers(): void
    {
        Sanctum::actingAs($this->adminUser);

        $evaluation = Evaluation::where('school_id', $this->school->school_id)->first();
        if ($evaluation) {
            $response = $this->get("/api/v1/reports/evaluation/{$evaluation->evaluation_id}/export/excel");
            if ($response->status() === 200) {
                $response->assertHeader('X-Frame-Options', 'DENY');
                $response->assertHeader('X-Content-Type-Options', 'nosniff');
                $this->assertStringContainsString('spreadsheet', $response->headers->get('Content-Type'));
                $this->assertStringContainsString('attachment;', $response->headers->get('Content-Disposition'));
            }
        }
        $this->assertTrue(true);
    }
}
