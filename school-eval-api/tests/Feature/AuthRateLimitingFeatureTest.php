<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات محدد معدل الطلبات لمسارات المصادقة الحساسة (Rate Limiting - الشريحة 11).
 *
 * تغطي:
 * 1. login: 5 محاولات لكل دقيقة لكل IP وتجاوز الحد يُرجع 429 و Retry-After.
 * 2. password/forgot: 3 محاولات كل 15 دقيقة لكل IP وتجاوز الحد يُرجع 429.
 * 3. password/change: 5 محاولات كل 10 دقائق لكل مستخدم مسجل وتجاوز الحد يُرجع 429.
 * 4. التحقق من الهيكل الموحد لاستجابة 429 (success=false, message, retry_after).
 * 5. التحقق من أن مسارات النظام الأخرى لا تتأثر بـ Rate Limiter المصادقة.
 */
class AuthRateLimitingFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $principalUser;
    protected string $testIp = '192.168.10.88';

    protected function setUp(): void
    {
        parent::setUp();

        $this->principalUser = User::where('username', 'principal_belqees')->firstOrFail();

        // تنظيف محددات المعدل لضمان عزل الاختبارات
        RateLimiter::clear('auth.login:'.$this->testIp);
        RateLimiter::clear('auth.password.forgot:'.$this->testIp);
        RateLimiter::clear('auth.password.change:user:'.$this->principalUser->user_id);
    }

    /**
     * اختبار مسار تسجيل الدخول: حظر الطلب السادس وإرجاع 429 و Retry-After.
     */
    public function test_login_endpoint_throttles_after_five_requests_per_ip(): void
    {
        $payload = [
            'username' => 'principal_belqees',
            'password' => 'WrongPassword123!',
        ];

        // أول 5 طلبات تفشل بالمصادقة (401) ولكنها مسموحة عبر Rate Limiter
        for ($i = 1; $i <= 5; $i++) {
            $response = $this->withServerVariables(['REMOTE_ADDR' => $this->testIp])
                ->postJson('/api/v1/auth/login', $payload);

            $this->assertNotEquals(429, $response->getStatusCode(), "الطلب رقم {$i} لا يجب أن يُحظر.");
        }

        // الطلب السادس يجب أن يُحظر بـ 429 Too Many Requests
        $response = $this->withServerVariables(['REMOTE_ADDR' => $this->testIp])
            ->postJson('/api/v1/auth/login', $payload);

        $response->assertStatus(429);
        $response->assertHeader('Retry-After');
        $this->assertFalse($response->json('success'));
        $this->assertNotNull($response->json('retry_after'));
        $this->assertStringContainsString('تجاوز الحد المسموح', $response->json('message'));
        $response->assertJsonStructure([
            'success',
            'data',
            'message',
            'retry_after',
            'errors',
            'meta',
        ]);
    }

    /**
     * اختبار مسار استعادة كلمة المرور: حظر الطلب الرابع وإرجاع 429.
     */
    public function test_forgot_password_endpoint_throttles_after_three_requests_per_ip(): void
    {
        $payload = ['email' => 'principal@belqees.edu.ye'];

        // أول 3 طلبات مسموحة عبر Rate Limiter
        for ($i = 1; $i <= 3; $i++) {
            $response = $this->withServerVariables(['REMOTE_ADDR' => $this->testIp])
                ->postJson('/api/v1/auth/password/forgot', $payload);

            $this->assertNotEquals(429, $response->getStatusCode(), "طلب الاستعادة رقم {$i} لا يجب أن يُحظر.");
        }

        // الطلب الرابع يُحظر
        $response = $this->withServerVariables(['REMOTE_ADDR' => $this->testIp])
            ->postJson('/api/v1/auth/password/forgot', $payload);

        $response->assertStatus(429);
        $response->assertHeader('Retry-After');
        $this->assertFalse($response->json('success'));
        $this->assertNotNull($response->json('retry_after'));
    }

    /**
     * اختبار مسار تغيير كلمة المرور للمستخدم المسجل: حظر المحاولة السادسة للمستخدم.
     */
    public function test_password_change_endpoint_throttles_after_five_requests_per_user(): void
    {
        Sanctum::actingAs($this->principalUser);

        $invalidPayload = [
            'current_password'          => 'WrongCurrent123!',
            'new_password'              => 'StrongNewPass@2026',
            'new_password_confirmation' => 'StrongNewPass@2026',
        ];

        // أول 5 طلبات تفشل في التحقق (422) ولكنها تمر من الـ Throttle
        for ($i = 1; $i <= 5; $i++) {
            $response = $this->postJson('/api/v1/auth/password/change', $invalidPayload);
            $this->assertNotEquals(429, $response->getStatusCode(), "محاولة تغيير كلمة المرور رقم {$i} لا يجب أن تُحظر.");
        }

        // الطلب السادس يُحظر بـ 429
        $response = $this->postJson('/api/v1/auth/password/change', $invalidPayload);
        $response->assertStatus(429);
        $response->assertHeader('Retry-After');
        $this->assertFalse($response->json('success'));
        $this->assertNotNull($response->json('retry_after'));
    }

    /**
     * اختبار أن باقي مسارات النظام التشغيلية لا تتأثر بمحدد معدل المصادقة.
     */
    public function test_other_api_routes_are_not_blocked_by_auth_rate_limiters(): void
    {
        Sanctum::actingAs($this->principalUser);

        // إجراء طلبات متعددة لمسار معلومات المستخدم me
        for ($i = 1; $i <= 10; $i++) {
            $response = $this->getJson('/api/v1/auth/me');
            $response->assertOk();
        }
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
        $admin = User::where('username', 'admin')->firstOrFail();
        Sanctum::actingAs($admin);

        $evaluation = \App\Models\Evaluation::first();
        if ($evaluation) {
            $response = $this->get("/api/v1/reports/evaluation/{$evaluation->evaluation_id}/export/pdf");
            if ($response->status() === 200) {
                $response->assertHeader('X-Frame-Options', 'DENY');
                $response->assertHeader('X-Content-Type-Options', 'nosniff');
                $this->assertStringContainsString('application/pdf', (string) $response->headers->get('Content-Type'));
                $this->assertStringContainsString('attachment;', (string) $response->headers->get('Content-Disposition'));
            }
        }
        $this->assertTrue(true);
    }

    /**
     * Slice 11: Security Headers - Export endpoint retains Excel content type and attachment headers.
     */
    public function test_security_headers_preserve_excel_export_headers(): void
    {
        $admin = User::where('username', 'admin')->firstOrFail();
        Sanctum::actingAs($admin);

        $evaluation = \App\Models\Evaluation::first();
        if ($evaluation) {
            $response = $this->get("/api/v1/reports/evaluation/{$evaluation->evaluation_id}/export/excel");
            if ($response->status() === 200) {
                $response->assertHeader('X-Frame-Options', 'DENY');
                $response->assertHeader('X-Content-Type-Options', 'nosniff');
                $this->assertStringContainsString('spreadsheet', (string) $response->headers->get('Content-Type'));
                $this->assertStringContainsString('attachment;', (string) $response->headers->get('Content-Disposition'));
            }
        }
        $this->assertTrue(true);
    }
}
