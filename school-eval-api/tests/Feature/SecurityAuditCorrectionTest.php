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
class SecurityAuditCorrectionTest extends TestCase
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
        $this->school = School::where('identification_data', 'SCH-AMANA-2026-001')->firstOrFail();
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

        // 3. المشرف الوزاري يُقبل
        Sanctum::actingAs($this->supervisorUser);
        $response = $this->getJson('/api/v1/audit-logs');
        $response->assertStatus(200);

        // 4. مدير النظام يُقبل مع الفلترة
        Sanctum::actingAs($this->adminUser);
        $response = $this->getJson('/api/v1/audit-logs?school_id=' . $this->school->school_id . '&action=evaluation.scored');
        $response->assertStatus(200);
    }

    /**
     * U-08: تدقيق تسجيل الدخول الناجح والفاشل والخروج.
     */
    public function test_audit_logs_records_login_success_failed_and_logout(): void
    {
        // محاولة دخول فاشلة
        $this->postJson('/api/v1/auth/login', [
            'username' => 'non_existent_user',
            'password' => 'wrong_pass',
        ])->assertStatus(401);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'auth.login_failed',
        ]);

        // دخول ناجح
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'username' => 'admin',
            'password' => $this->defaultPassword,
        ])->assertStatus(200);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'auth.login_success',
            'user_id' => $this->adminUser->user_id,
        ]);

        $token = $loginRes->json('data.token');

        // خروج
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/auth/logout')
            ->assertStatus(200);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'auth.logout',
            'user_id' => $this->adminUser->user_id,
        ]);
    }

    /**
     * U-40: تغيير كلمة المرور للمستخدم المسجل وإبطال الجلسات الأخرى.
     */
    public function test_change_password_workflow(): void
    {
        // 1. تسجيل الدخول والحصول على رمز الجلسة 1
        $login1 = $this->postJson('/api/v1/auth/login', [
            'username' => 'quality_belqees',
            'password' => $this->defaultPassword,
        ])->assertStatus(200);
        $token1 = $login1->json('data.token');

        // تسجيل الدخول ثانية للحصول على رمز جلسة 2
        $login2 = $this->postJson('/api/v1/auth/login', [
            'username' => 'quality_belqees',
            'password' => $this->defaultPassword,
        ])->assertStatus(200);
        $token2 = $login2->json('data.token');

        // 2. محاولة تغيير كلمة المرور بكلمة حالية خاطئة
        $this->withHeader('Authorization', 'Bearer ' . $token2)
            ->postJson('/api/v1/auth/password/change', [
                'current_password' => 'WrongPassword',
                'new_password' => 'NewSecret@2026',
                'new_password_confirmation' => 'NewSecret@2026',
            ])->assertStatus(422);

        // 3. محاولة تغيير كلمة المرور بنفس كلمة المرور الحالية
        $this->withHeader('Authorization', 'Bearer ' . $token2)
            ->postJson('/api/v1/auth/password/change', [
                'current_password' => $this->defaultPassword,
                'new_password' => $this->defaultPassword,
                'new_password_confirmation' => $this->defaultPassword,
            ])->assertStatus(422);

        // 4. تغيير كلمة المرور بنجاح
        $successRes = $this->withHeader('Authorization', 'Bearer ' . $token2)
            ->postJson('/api/v1/auth/password/change', [
                'current_password' => $this->defaultPassword,
                'new_password' => 'NewQuality@2026',
                'new_password_confirmation' => 'NewQuality@2026',
            ]);
        $successRes->assertStatus(200);

        // التحقق من تسجيل حدث التدقيق
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'auth.password_changed',
            'user_id' => $this->evaluatorUser->user_id,
        ]);

        // التحقق من تحديث التجزئة
        $updatedUser = User::find($this->evaluatorUser->user_id);
        $this->assertTrue(Hash::check('NewQuality@2026', $updatedUser->password_hash));

        // الرمز الحالي token2 ما زال يعمل
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer ' . $token2)
            ->getJson('/api/v1/auth/me')
            ->assertStatus(200);

        // الرمز السابق token1 تم إبطاله
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer ' . $token1)
            ->getJson('/api/v1/auth/me')
            ->assertStatus(401);
    }

    /**
     * U-23: مرونة التقدير المستهدف في اقتراحات ومجالات التحسين.
     */
    public function test_flexible_target_score_in_improvement_suggestions_and_areas(): void
    {
        Sanctum::actingAs($this->evaluatorUser);

        // جلب تقييم للمدرسة
        $evaluation = Evaluation::where('school_id', $this->school->school_id)->first();
        if (!$evaluation) {
            $cycle = EvaluationCycle::first();
            $evaluation = Evaluation::create([
                'cycle_id' => $cycle->cycle_id,
                'school_id' => $this->school->school_id,
                'created_by_user_id' => $this->evaluatorUser->user_id,
                'status' => 'InProgress',
            ]);
        }

        // إنشاء نتيجة تقييم بدرجة 2
        $indicator = Indicator::first();
        $desc = \App\Models\IndicatorScoreDescriptor::where('indicator_id', $indicator->indicator_id)->first();
        $versionId = $evaluation->cycle?->standard_version_id ?? $evaluation->cycle?->version_id ?? StandardVersion::first()?->version_id;

        $result = EvaluationResult::updateOrCreate(
            ['evaluation_id' => $evaluation->evaluation_id, 'indicator_id' => $indicator->indicator_id],
            [
                'score' => 2,
                'evaluator_user_id' => $this->evaluatorUser->user_id,
                'score_descriptor_id' => $desc?->descriptor_id ?? 1,
                'standard_version_id' => $versionId,
                'completion_status' => 'Completed',
            ]
        );

        // 1. الافتراضي target_score=3 يشمل المؤشر (2 < 3)
        $resDefault = $this->getJson("/api/v1/evaluations/{$evaluation->evaluation_id}/improvement-suggestions");
        $resDefault->assertStatus(200);
        $this->assertEquals(3, $resDefault->json('data.targetScore'));
        $this->assertTrue(collect($resDefault->json('data.suggestions'))->contains('indicatorId', $indicator->indicator_id));

        // 2. تمرير target_score=2 يستبعد المؤشر لأن درجته 2 (ليس أقل من 2)
        $res2 = $this->getJson("/api/v1/evaluations/{$evaluation->evaluation_id}/improvement-suggestions?target_score=2");
        $res2->assertStatus(200);
        $this->assertEquals(2, $res2->json('data.targetScore'));
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
}
