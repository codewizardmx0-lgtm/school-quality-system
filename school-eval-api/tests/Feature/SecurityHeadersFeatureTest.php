<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات وسيط ترويسات الأمان (Security Headers - الشريحة 11).
 *
 * تغطي:
 * 1. وجود الترويسات الأساسية الثلاث (X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
 * 2. ترويسة HSTS (Strict-Transport-Security) تظهر حصرياً في بيئة الإنتاج وعند الاتصال بـ HTTPS.
 * 3. عدم ظهور HSTS في بيئة التطوير/الاختبار عبر HTTP العادي.
 * 4. سلامة تصدير واستجابة ملفات PDF مع الترويسات الأمنية وعدم كسر Content-Type و Content-Disposition.
 * 5. سلامة تصدير ملفات Excel مع الترويسات الأمنية.
 */
class SecurityHeadersFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $evaluatorUser;
    protected Evaluation $evaluation;

    protected function setUp(): void
    {
        parent::setUp();

        $this->evaluatorUser = User::where('email', 'quality@belqees.edu.ye')->firstOrFail();
        $cycle = \App\Models\EvaluationCycle::first() ?? \App\Models\EvaluationCycle::create([
            'version_id'  => 1,
            'cycle_name'  => 'الدورة التجريبية 2026',
            'academic_year' => '2026/2027',
            'start_date'  => now()->toDateString(),
            'end_date'    => now()->addYear()->toDateString(),
            'status'      => 'Active',
        ]);

        $this->evaluation = Evaluation::firstOrCreate(
            ['school_id' => $this->evaluatorUser->school_id, 'cycle_id' => $cycle->cycle_id],
            [
                'created_by_user_id' => $this->evaluatorUser->user_id,
                'status'             => 'InProgress',
                'created_at'         => now(),
                'updated_at'         => now(),
            ]
        );
    }

    /**
     * اختبار حقن الترويسات الأساسية الثلاث في كافة استجابات الـ API.
     */
    public function test_api_responses_contain_three_base_security_headers(): void
    {
        $response = $this->postJson('/api/v1/auth/login', []);

        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    /**
     * اختبار عدم ظهور ترويسة HSTS في البيئة العادية غير الإنتاجية عبر HTTP.
     */
    public function test_hsts_header_is_absent_in_non_production_or_http_environment(): void
    {
        $response = $this->postJson('/api/v1/auth/login', []);

        $this->assertFalse($response->headers->has('Strict-Transport-Security'), 'ترويسة HSTS يجب ألا تُحقن في بيئة غير الإنتاج أو عبر HTTP.');
    }

    /**
     * اختبار ظهور ترويسة HSTS حصرياً عند محاكاة بيئة الإنتاج واتصال HTTPS.
     */
    public function test_hsts_header_is_present_in_production_with_https(): void
    {
        $originalEnv = config('app.env');
        config(['app.env' => 'production']);

        $response = $this->withHeaders(['X-Forwarded-Proto' => 'https'])
            ->postJson('https://localhost/api/v1/auth/login', []);

        $response->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

        // إعادة البيئة الأصلية
        config(['app.env' => $originalEnv]);
    }

    /**
     * اختبار سلامة تصدير PDF مع ترويسات الأمان وعدم تشويه Content-Type و Content-Disposition.
     */
    public function test_pdf_export_preserves_content_headers_with_security_headers(): void
    {
        Sanctum::actingAs($this->evaluatorUser);

        $response = $this->get("/api/v1/evaluations/{$this->evaluation->evaluation_id}/export-pdf");

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringContainsString('evaluation_card_', (string) $response->headers->get('Content-Disposition'));

        // الترويسات الأمنية موجودة أيضاً
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        // محتوى الملف هو PDF حقيقي
        $this->assertStringStartsWith('%PDF-', $response->getContent());
    }

    /**
     * اختبار سلامة تصدير Excel مع ترويسات الأمان.
     */
    public function test_excel_export_preserves_content_headers_with_security_headers(): void
    {
        Sanctum::actingAs($this->evaluatorUser);

        $response = $this->get("/api/v1/evaluations/{$this->evaluation->evaluation_id}/export-excel");

        $response->assertOk();
        $this->assertStringContainsString('.xlsx', (string) $response->headers->get('Content-Disposition'));

        // الترويسات الأمنية
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }
}
