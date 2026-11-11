<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\ImprovementArea;
use App\Models\Indicator;
use App\Models\School;
use App\Models\Session;
use App\Models\StandardVersion;
use App\Models\User;
use App\Services\AuditLoggerService;
use App\Services\EvaluationTrendService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use LogicException;
use Tests\TestCase;

/**
 * اختبارات تصحيح 3: سجل التدقيق، مرونة التقدير المستهدف، التحليل التاريخي، وتغيير كلمة المرور.
 *
 * تغطي الملاحظات:
 * - U-08: سجل التدقيق للعمليات الحساسة، والعزل والصلاحيات، وعدم التعديل، وتصفية البيانات الحساسة.
 * - U-23: مرونة التقدير المستهدف في اقتراحات ومجالات التحسين (target_score).
 * - U-27: معالجة المؤشرات المحذوفة وتغير نصوص المؤشرات في المقارنة التاريخية.
 * - U-40: مسار تغيير كلمة المرور للمستخدم المسجل وإبطال الجلسات الأخرى.
 */
class AuditTrailCorrection3Test extends TestCase
{
    use DatabaseTransactions;

    protected User $adminUser;
    protected User $supervisorUser;
    protected User $principalUser;
    protected User $evaluatorUser;
    protected School $school;
    protected string $defaultPassword;

    protected function setUp(): void
    {
        parent::setUp();

        $this->defaultPassword = env('SEED_DEFAULT_PASSWORD') ?: 'ChangeMeDevPassword@2026';
        $this->adminUser = User::where('username', 'admin')->firstOrFail();
        $this->supervisorUser = User::where('username', 'supervisor_ministry')->firstOrFail();
        $this->principalUser = User::where('username', 'principal_belqees')->firstOrFail();
        $this->evaluatorUser = User::where('username', 'quality_belqees')->firstOrFail();
        $this->school = School::where('identification_data', 'SCH-SANAA-2026-001')->firstOrFail();
    }

    /**
     * U-08: فحص منع التعديل والحذف على نموذج AuditLog (Immutability).
     */
    public function test_audit_logs_are_immutable_and_cannot_be_updated_or_deleted(): void
    {
        $log = AuditLog::create([
            'user_id' => $this->adminUser->user_id,
            'school_id' => $this->school->school_id,
            'action' => 'evaluation.scored',
            'target_type' => 'EvaluationResult',
            'target_id' => 123,
            'created_at' => now(),
        ]);

        $this->expectException(LogicException::class);
        $log->update(['action' => 'tampered.action']);
    }

    public function test_audit_logs_cannot_be_deleted(): void
    {
        $log = AuditLog::create([
            'user_id' => $this->adminUser->user_id,
            'school_id' => $this->school->school_id,
            'action' => 'evaluation.scored',
            'target_type' => 'EvaluationResult',
            'target_id' => 124,
            'created_at' => now(),
        ]);

        $this->expectException(LogicException::class);
        $log->delete();
    }

    /**
     * U-08: تصفية البيانات الحساسة (عدم تسجيل كلمات المرور والتوكنات).
     */
    public function test_audit_logger_sanitizes_sensitive_keys(): void
    {
        $logger = app(AuditLoggerService::class);
        $log = $logger->log(
            action: 'auth.test',
            targetType: 'User',
            targetId: $this->adminUser->user_id,
            oldValues: ['password' => 'secret123', 'safe_field' => 'visible'],
            newValues: ['token' => 'plain_text_token', 'username' => 'admin_user'],
            userId: $this->adminUser->user_id,
            schoolId: $this->school->school_id
        );

        $this->assertArrayNotHasKey('password', $log->old_values);
        $this->assertEquals('visible', $log->old_values['safe_field']);
        $this->assertArrayNotHasKey('token', $log->new_values);
        $this->assertEquals('admin_user', $log->new_values['username']);
    }

    /**
     * U-08: صلاحية استعراض سجل التدقيق (مدير النظام والمشرف الوزاري 200، مدير المدرسة 403).
     */
    public function test_audit_logs_endpoint_authorization(): void
    {
        // 1. مدير المدرسة يرفض بالرمز 403
        Sanctum::actingAs($this->principalUser);
        $response = $this->getJson('/api/v1/audit-logs');
        $response->assertStatus(403);

        // 2. مقيم المدرسة يرفض بالرمز 403
        Sanctum::actingAs($this->evaluatorUser);
        $response = $this->getJson('/api/v1/audit-logs');
        $response->assertStatus(403);

        // 3. المشرف الوزاري مسموح 200
        Sanctum::actingAs($this->supervisorUser);
        $resSup = $this->getJson('/api/v1/audit-logs');
        $resSup->assertStatus(200);

        // 4. مدير النظام مسموح 200
        Sanctum::actingAs($this->adminUser);
        $resAdm = $this->getJson('/api/v1/audit-logs');
        $resAdm->assertStatus(200);
    }

    /**
     * U-08: فلترة سجل التدقيق بالمدرسة للمشرف ومدير النظام فقط.
     */
    public function test_audit_logs_filtering_by_school(): void
    {
        Sanctum::actingAs($this->supervisorUser);

        // تسجيل حدث للمدرسة الحالية
        AuditLog::create([
            'user_id' => $this->principalUser->user_id,
            'school_id' => $this->school->school_id,
            'action' => 'evaluation.scored',
            'created_at' => now(),
        ]);

        $res = $this->getJson("/api/v1/audit-logs?school_id={$this->school->school_id}");
        $res->assertStatus(200);
        $this->assertTrue($res->json('data.total') >= 1);
    }

    /**
     * U-40: تغيير كلمة المرور للمستخدم المسجل (نجاح وإبطال التوكنات الأخرى).
     */
    public function test_change_password_success_and_revokes_other_tokens(): void
    {
        Sanctum::actingAs($this->principalUser);

        // إنشاء توكن وجلسة إضافية لمحاكاة جهاز آخر
        $otherToken = $this->principalUser->createToken('other-device');
        $tokenHash = hash('sha256', (string) $otherToken->accessToken->id);

        Session::create([
            'user_id' => $this->principalUser->user_id,
            'session_token' => $tokenHash,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'OtherBrowser/1.0',
            'active' => true,
            'started_at' => now(),
        ]);

        $newPassword = 'NewSecretPassword@2026';

        $response = $this->postJson('/api/v1/auth/password/change', [
            'current_password' => $this->defaultPassword,
            'new_password' => $newPassword,
            'new_password_confirmation' => $newPassword,
        ]);

        $response->assertStatus(200);

        // التحقق من تحديث كلمة المرور في قاعدة البيانات
        $this->principalUser->refresh();
        $this->assertTrue(Hash::check($newPassword, $this->principalUser->password_hash));

        // التحقق من إبطال التوكنات والجلسات الأخرى
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $otherToken->accessToken->id,
        ]);

        $this->assertDatabaseHas('sessions', [
            'session_token' => $tokenHash,
            'active' => false,
        ]);

        // التحقق من تسجيل auth.password_changed في audit_logs
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->principalUser->user_id,
            'action' => 'auth.password_changed',
        ]);
    }

    /**
     * U-40: تغيير كلمة المرور يفشل إذا كانت الحالية خاطئة أو الجديدة مطابقة للحالية أو ضعيفة.
     */
    public function test_change_password_validations(): void
    {
        Sanctum::actingAs($this->principalUser);

        // 1. كلمة المرور الحالية خاطئة 422
        $res1 = $this->postJson('/api/v1/auth/password/change', [
            'current_password' => 'WrongPassword123!',
            'new_password' => 'ValidNewPassword@2026',
            'new_password_confirmation' => 'ValidNewPassword@2026',
        ]);
        $res1->assertStatus(422);

        // 2. كلمة المرور الجديدة مطابقة للحالية 422
        $res2 = $this->postJson('/api/v1/auth/password/change', [
            'current_password' => $this->defaultPassword,
            'new_password' => $this->defaultPassword,
            'new_password_confirmation' => $this->defaultPassword,
        ]);
        $res2->assertStatus(422);

        // 3. كلمة المرور الجديدة ضعيفة 422
        $res3 = $this->postJson('/api/v1/auth/password/change', [
            'current_password' => $this->defaultPassword,
            'new_password' => 'short',
            'new_password_confirmation' => 'short',
        ]);
        $res3->assertStatus(422);
    }

    /**
     * U-23: مرونة target_score في اقتراحات ومجالات التحسين.
     */
    public function test_target_score_flexibility_in_suggestions_and_areas(): void
    {
        Sanctum::actingAs($this->evaluatorUser);

        // جلب تقييم ومؤشر بدرجة 1
        $evaluation = Evaluation::where('school_id', $this->school->school_id)->first();
        $indicator = Indicator::first();
        $descriptor = \App\Models\IndicatorScoreDescriptor::where('indicator_id', $indicator->indicator_id)->first();

        $result = EvaluationResult::updateOrCreate(
            ['evaluation_id' => $evaluation->evaluation_id, 'indicator_id' => $indicator->indicator_id],
            [
                'evaluator_user_id' => $this->evaluatorUser->user_id,
                'score' => 1,
                'score_descriptor_id' => $descriptor?->descriptor_id ?? 1,
                'standard_version_id' => 1,
                'completion_status' => 'Completed',
            ]
        );

        // 1. طلب الاقتراحات مع target_score=2 -> يجب أن يظهر المؤشر لأن درجته (1) أقل من 2
        $res1 = $this->getJson("/api/v1/evaluations/{$evaluation->evaluation_id}/improvement-suggestions?target_score=2");
        $res1->assertStatus(200);
        $this->assertTrue(collect($res1->json('data.suggestions'))->contains('indicatorId', $indicator->indicator_id));

        // 2. إذا كانت درجة المؤشر 2 وطلبنا target_score=2 -> يجب ألا يظهر
        $result->update(['score' => 2]);
        $res2 = $this->getJson("/api/v1/evaluations/{$evaluation->evaluation_id}/improvement-suggestions?target_score=2");
        $res2->assertStatus(200);
        $this->assertFalse(collect($res2->json('data.suggestions'))->contains('indicatorId', $indicator->indicator_id));

        // 3. رفض قيمة غير صالحة 422
        $resInvalid = $this->getJson("/api/v1/evaluations/{$evaluation->evaluation_id}/improvement-suggestions?target_score=5");
        $resInvalid->assertStatus(422);

        // 4. حفظ مجال تحسين مع target_score مخصص
        $areaRes = $this->postJson('/api/v1/improvement-areas', [
            'resultId' => $result->result_id,
            'name' => 'مجال تحسين اختباري',
            'description' => 'وصف التحسين',
            'priority' => 'High',
            'target_score' => 2,
        ]);
        $areaRes->assertStatus(201);
        $this->assertEquals(2, $areaRes->json('data.targetScore'));

        $areaId = $areaRes->json('data.areaId');

        // 5. تعديل target_score
        $updateRes = $this->patchJson("/api/v1/improvement-areas/{$areaId}", [
            'target_score' => 3,
        ]);
        $updateRes->assertStatus(200);
        $this->assertEquals(3, $updateRes->json('data.targetScore'));
    }

    /**
     * U-27: معالجة المؤشرات المحذوفة وتغير النصوص في التحليل التاريخي.
     */
    public function test_evaluation_trend_service_handles_deprecated_indicators_and_text_changes(): void
    {
        $version = StandardVersion::first();
        $cycle1 = EvaluationCycle::first();
        $cycle2 = EvaluationCycle::skip(1)->first() ?? EvaluationCycle::create([
            'academic_year' => '2026-2027',
            'version_id' => $version->version_id,
            'standard_version_id' => $version->version_id,
            'status' => 'Open',
            'start_date' => now()->addYear(),
            'end_date' => now()->addYears(2),
            'created_by_user_id' => $this->adminUser->user_id,
        ]);

        // تقييم سابق مكتمل
        $evalPrev = Evaluation::create([
            'cycle_id' => $cycle1->cycle_id,
            'school_id' => $this->school->school_id,
            'created_by_user_id' => $this->evaluatorUser->user_id,
            'status' => 'Completed',
            'created_at' => now()->subMonths(6),
        ]);

        // تقييم حالي
        $evalCurr = Evaluation::create([
            'cycle_id' => $cycle2->cycle_id,
            'school_id' => $this->school->school_id,
            'created_by_user_id' => $this->evaluatorUser->user_id,
            'status' => 'InProgress',
            'created_at' => now(),
        ]);

        $indicators = Indicator::take(2)->get();
        $ind1 = $indicators[0];
        $ind2 = $indicators[1];

        $desc1 = \App\Models\IndicatorScoreDescriptor::where('indicator_id', $ind1->indicator_id)->first();
        $desc2 = \App\Models\IndicatorScoreDescriptor::where('indicator_id', $ind2->indicator_id)->first();

        // في التقييم السابق رصدنا مؤشرين
        EvaluationResult::create([
            'evaluation_id' => $evalPrev->evaluation_id,
            'indicator_id' => $ind1->indicator_id,
            'evaluator_user_id' => $this->evaluatorUser->user_id,
            'score' => 2,
            'score_descriptor_id' => $desc1?->descriptor_id ?? 1,
            'standard_version_id' => $version->version_id,
            'completion_status' => 'Completed',
        ]);
        EvaluationResult::create([
            'evaluation_id' => $evalPrev->evaluation_id,
            'indicator_id' => $ind2->indicator_id,
            'evaluator_user_id' => $this->evaluatorUser->user_id,
            'score' => 1,
            'score_descriptor_id' => $desc2?->descriptor_id ?? 1,
            'standard_version_id' => $version->version_id,
            'completion_status' => 'Completed',
        ]);

        // في التقييم الحالي: رصدنا مؤشر 1 فقط بدرجة 3، ومؤشر 2 استبعد/لم يرصد
        EvaluationResult::create([
            'evaluation_id' => $evalCurr->evaluation_id,
            'indicator_id' => $ind1->indicator_id,
            'evaluator_user_id' => $this->evaluatorUser->user_id,
            'score' => 3,
            'score_descriptor_id' => $desc1?->descriptor_id ?? 1,
            'standard_version_id' => $version->version_id,
            'completion_status' => 'Completed',
        ]);

        $trendService = app(EvaluationTrendService::class);
        $trend = $trendService->calculateTrend($evalCurr);

        $this->assertTrue($trend['has_previous_cycle']);
        $this->assertEquals(1, $trend['trend']['improved_count']);
        $this->assertEquals(1, $trend['trend']['deprecated_count']);

        // التحقق من وجود المؤشر المستبعد في deprecated_indicators
        $deprecated = collect($trend['trend']['deprecated_indicators']);
        $this->assertTrue($deprecated->contains('indicator_code', $ind2->code ?? (string) $ind2->indicator_id));
    }

    // =========================================================================
    // اختبارات وسيط ترويسات الأمان وتكامل التصدير (Security Headers - الشريحة 11)
    // =========================================================================

    /**
     * اختبار حقن الترويسات الأساسية الثلاث في كافة استجابات الـ API (الشريحة 11).
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

        config(['app.env' => $originalEnv]);
    }

    /**
     * اختبار سلامة تصدير PDF مع ترويسات الأمان وعدم تشويه Content-Type و Content-Disposition.
     */
    public function test_pdf_export_preserves_content_headers_with_security_headers(): void
    {
        Sanctum::actingAs($this->evaluatorUser);

        $cycle = EvaluationCycle::first() ?? EvaluationCycle::create([
            'version_id'    => 1,
            'cycle_name'    => 'الدورة التجريبية 2026',
            'academic_year' => '2026/2027',
            'start_date'    => now()->toDateString(),
            'end_date'      => now()->addYear()->toDateString(),
            'status'        => 'Active',
        ]);

        $evaluation = Evaluation::firstOrCreate(
            ['school_id' => $this->evaluatorUser->school_id, 'cycle_id' => $cycle->cycle_id],
            [
                'created_by_user_id' => $this->evaluatorUser->user_id,
                'status'             => 'InProgress',
                'created_at'         => now(),
                'updated_at'         => now(),
            ]
        );

        $response = $this->get("/api/v1/evaluations/{$evaluation->evaluation_id}/export-pdf");

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringContainsString('evaluation_card_', (string) $response->headers->get('Content-Disposition'));

        // الترويسات الأمنية موجودة أيضاً
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        $this->assertStringStartsWith('%PDF-', $response->getContent());
    }

    /**
     * اختبار سلامة تصدير Excel مع ترويسات الأمان.
     */
    public function test_excel_export_preserves_content_headers_with_security_headers(): void
    {
        Sanctum::actingAs($this->evaluatorUser);

        $cycle = EvaluationCycle::first() ?? EvaluationCycle::create([
            'version_id'    => 1,
            'cycle_name'    => 'الدورة التجريبية 2026',
            'academic_year' => '2026/2027',
            'start_date'    => now()->toDateString(),
            'end_date'      => now()->addYear()->toDateString(),
            'status'        => 'Active',
        ]);

        $evaluation = Evaluation::firstOrCreate(
            ['school_id' => $this->evaluatorUser->school_id, 'cycle_id' => $cycle->cycle_id],
            [
                'created_by_user_id' => $this->evaluatorUser->user_id,
                'status'             => 'InProgress',
                'created_at'         => now(),
                'updated_at'         => now(),
            ]
        );

        $response = $this->get("/api/v1/evaluations/{$evaluation->evaluation_id}/export-excel");

        $response->assertOk();
        $this->assertStringContainsString('.xlsx', (string) $response->headers->get('Content-Disposition'));

        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }
}
