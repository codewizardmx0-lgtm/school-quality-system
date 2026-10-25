<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\ImprovementPlan;
use App\Models\Role;
use App\Models\School;
use App\Models\Session;
use App\Models\StandardVersion;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات الميزة لطبقة المصادقة والصلاحيات والعزل بين المدارس (Auth, RBAC, Tenant Isolation).
 *
 * تغطي:
 * 1. تسجيل الدخول بنجاح وإصدار Bearer Token وجلسة وظيفية (FR-GEN-01/02).
 * 2. التحقق من صيغة مغلف الاستجابة JSON الموحد (data, message, errors, meta) و camelCase وتواريخ UTC Z.
 * 3. منع الدخول بكلمة مرور خاطئة أو اسم مستخدم غير موجود (401).
 * 4. منع الدخول لحساب معطل (status = Disabled) برسالة 401.
 * 5. فحص مسار /api/v1/auth/me مع استخراج بيانات المدرسة والأدوار والصلاحيات.
 * 6. فحص تسجيل الخروج وإلغاء Bearer Token وإنهاء الجلسة الوظيفية (ended_at, active=false).
 * 7. فحص انتهاء الجلسة بعد 30 دقيقة خمول وإلغاء الرمز (401) عبر الوسيط session.timeout.
 * 8. فحص العزل المؤسسي بين المدارس: مستخدم مدرسة بلقيس يطلب مورد الفاروق فيحصل على 404 (القرار 9).
 * 9. فحص مصفوفة صلاحيات الأدوار الخمسة عبر Policies و CheckPermission:
 *    - مسؤول النظام: يملك schools.manage ولا يملك صلاحيات تقييم (BR-GEN-06).
 *    - مسؤول المعايير: يملك standards.manage ولا يراجع المخرجات (BR-MIN-01).
 *    - مستخدم التقييم: يملك evaluations.submit وحده (BR-SCH-02).
 *    - مدير المدرسة: يملك reviews.write و reports.view ولا ينفذ الإرسال النهائي.
 *    - المشرف الوزاري: يملك supervision.review و completion.request و cycles.launch.
 */
class AuthenticationAndAuthorizationFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $adminUser;
    protected User $principalBelqees;
    protected User $evaluatorBelqees;
    protected User $principalFarouq;
    protected User $evaluatorFarouq;
    protected User $supervisorMinistry;
    protected User $standardsManagerMinistry;
    protected School $schoolBelqees;
    protected School $schoolFarouq;
    protected string $defaultPassword = 'ChangeMeDevPassword@2026';

    protected function setUp(): void
    {
        parent::setUp();

        $this->defaultPassword = env('SEED_DEFAULT_PASSWORD') ?: 'ChangeMeDevPassword@2026';

        // استرجاع المدارس التجريبية
        $this->schoolBelqees = School::where('identification_data', 'SCH-SANAA-2026-001')->firstOrFail();
        $this->schoolFarouq  = School::where('identification_data', 'SCH-TAIZ-2026-002')->firstOrFail();

        // استرجاع المستخدمين السبعة المهيئين في Seeders
        $this->adminUser                = User::where('username', 'admin')->firstOrFail();
        $this->principalBelqees         = User::where('username', 'principal_belqees')->firstOrFail();
        $this->evaluatorBelqees         = User::where('username', 'quality_belqees')->firstOrFail();
        $this->principalFarouq          = User::where('username', 'principal_farouq')->firstOrFail();
        $this->evaluatorFarouq          = User::where('username', 'quality_farouq')->firstOrFail();
        $this->supervisorMinistry       = User::where('username', 'supervisor_ministry')->firstOrFail();
        $this->standardsManagerMinistry = User::where('username', 'standards_manager_ministry')->firstOrFail();
    }

    /**
     * 1. نجاح تسجيل الدخول وإصدار رمز Bearer Token وجلسة وظيفية
     */
    public function test_user_can_login_with_valid_credentials(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'username' => 'quality_belqees',
            'password' => $this->defaultPassword,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'token',
                    'tokenType',
                    'sessionId',
                    'user' => [
                        'userId',
                        'schoolId',
                        'username',
                        'fullName',
                        'email',
                        'userType',
                        'status',
                        'roles',
                        'permissions',
                    ],
                ],
                'message',
                'errors',
                'meta',
            ]);

        $responseData = $response->json('data');
        $this->assertNotEmpty($responseData['token']);
        $this->assertEquals('Bearer', $responseData['tokenType']);
        $this->assertNotNull($responseData['sessionId']);
        $this->assertEquals('quality_belqees', $responseData['user']['username']);
        $this->assertEquals($this->schoolBelqees->school_id, $responseData['user']['schoolId']);

        // التحقق من إنشاء سجل جلسة وظيفية نشطة
        $this->assertDatabaseHas('sessions', [
            'session_id' => $responseData['sessionId'],
            'user_id'    => $this->evaluatorBelqees->user_id,
            'active'     => true,
            'ended_at'   => null,
        ]);
    }

    /**
     * 2. فشل تسجيل الدخول عند تقديم كلمة مرور خاطئة
     */
    public function test_login_fails_with_invalid_password(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'username' => 'quality_belqees',
            'password' => 'WrongPassword@999',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'data'    => null,
                'message' => 'بيانات الاعتماد غير صحيحة.',
                'errors'  => null,
                'meta'    => null,
            ]);
    }

    /**
     * 3. فشل تسجيل الدخول عند تقديم اسم مستخدم غير موجود
     */
    public function test_login_fails_with_non_existent_username(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'username' => 'unknown_user_123',
            'password' => 'AnyPassword@123',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'data'    => null,
                'message' => 'بيانات الاعتماد غير صحيحة.',
                'errors'  => null,
                'meta'    => null,
            ]);
    }

    /**
     * 4. فشل التحقق 422 عند إرسال حقول ناقصة
     */
    public function test_login_validation_errors_comply_with_standard_envelope(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'username' => '',
            'password' => '',
        ]);

        $response->assertStatus(422)
            ->assertJsonStructure([
                'data',
                'message',
                'errors' => ['username', 'password'],
                'meta',
            ])
            ->assertJson([
                'data' => null,
                'meta' => null,
            ]);
    }

    /**
     * 5. منع تسجيل الدخول للحسابات المعطلة (status = Disabled)
     */
    public function test_disabled_user_cannot_login(): void
    {
        $disabledUser = User::create([
            'username'      => 'disabled_evaluator_' . substr(uniqid(), -6),
            'password_hash' => Hash::make($this->defaultPassword),
            'full_name'     => 'مستخدم معطل تجريبي',
            'email'         => 'disabled_' . substr(uniqid(), -6) . '@example.com',
            'user_type'     => 'school',
            'school_id'     => $this->schoolBelqees->school_id,
            'status'        => 'Disabled',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'username' => $disabledUser->username,
            'password' => $this->defaultPassword,
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'data'    => null,
                'message' => 'الحساب معطل. يرجى التواصل مع مسؤول النظام.',
                'errors'  => null,
                'meta'    => null,
            ]);
    }

    /**
     * 6. التحقق من مسار /api/v1/auth/me بالمصادقة وجلب الصلاحيات والأدوار
     */
    public function test_authenticated_user_can_access_me_endpoint(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'userId',
                    'username',
                    'fullName',
                    'roles',
                    'permissions',
                ],
                'message',
                'errors',
                'meta',
            ]);

        $userData = $response->json('data');
        $this->assertEquals('quality_belqees', $userData['username']);
        $this->assertContains('evaluations.submit', $userData['permissions']);
        $this->assertContains('evaluations.create', $userData['permissions']);
    }

    /**
     * 7. تسجيل الخروج وإلغاء الرمز وإنهاء الجلسة الوظيفية
     */
    public function test_user_can_logout_and_revoke_token_and_session(): void
    {
        // تسجيل دخول رسمي عبر الـ API
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'username' => 'quality_belqees',
            'password' => $this->defaultPassword,
        ]);

        $token = $loginRes->json('data.token');
        $sessionId = $loginRes->json('data.sessionId');

        // استدعاء تسجيل الخروج بالرمز
        $logoutRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/auth/logout');

        $logoutRes->assertStatus(200)
            ->assertJson([
                'data'    => null,
                'message' => 'تم تسجيل الخروج بنجاح.',
                'errors'  => null,
                'meta'    => null,
            ]);

        // التحقق من إغلاق الجلسة في جدول sessions
        $session = Session::find($sessionId);
        $this->assertFalse((bool) $session->active);
        $this->assertNotNull($session->ended_at);

        // محاولة استخدام نفس الرمز بعد الخروج يجب أن تفشل بـ 401
        $this->app['auth']->forgetGuards();
        $subsequentRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/auth/me');

        $subsequentRes->assertStatus(401);
    }

    /**
     * 8. فرض انتهاء الجلسة بعد 30 دقيقة خمول (FR-GEN-02 والقرار 14)
     */
    public function test_session_expires_after_30_minutes_of_inactivity(): void
    {
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'username' => 'quality_belqees',
            'password' => $this->defaultPassword,
        ]);

        $token = $loginRes->json('data.token');
        $sessionId = $loginRes->json('data.sessionId');

        // محاكاة مرور 31 دقيقة من الخمول على الجلسة بتحديث طابع النشاط مباشرة
        \Illuminate\Support\Facades\DB::table('sessions')
            ->where('session_id', $sessionId)
            ->update([
                'updated_at' => now()->subMinutes(31),
            ]);

        $this->app['auth']->forgetGuards();

        // إرسال طلب جديد مع الرمز
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/auth/me');

        $response->assertStatus(401)
            ->assertJson([
                'data'    => null,
                'message' => 'انتهت الجلسة لعدم النشاط. يجب تسجيل الدخول للمتابعة.',
                'errors'  => null,
                'meta'    => null,
            ]);

        // التأكد من إغلاق الجلسة الوظيفية
        $session = Session::find($sessionId);
        $this->assertFalse((bool) $session->active);
        $this->assertNotNull($session->ended_at);
    }

    /**
     * 9. العزل بين المدارس: مستخدم مدرسة بلقيس يطلب مدرسة الفاروق فيحصل على 404 (القرار 9)
     */
    public function test_school_tenant_isolation_returns_404_when_accessing_another_school(): void
    {
        // مستخدم مدرسة بلقيس يستعلم عن مدرسته: مسموح 200
        Sanctum::actingAs($this->evaluatorBelqees);

        $ownSchoolRes = $this->getJson('/api/v1/schools/' . $this->schoolBelqees->school_id);
        $ownSchoolRes->assertStatus(200)
            ->assertJsonPath('data.schoolId', $this->schoolBelqees->school_id);

        // مستخدم مدرسة بلقيس يستعلم عن مدرسة الفاروق: يُرجع 404 لحجب وجودها وحماية الخصوصية
        $otherSchoolRes = $this->getJson('/api/v1/schools/' . $this->schoolFarouq->school_id);
        $otherSchoolRes->assertStatus(404)
            ->assertJson([
                'data'    => null,
                'message' => 'المدرسة المطلوبة غير موجودة.',
                'errors'  => null,
                'meta'    => null,
            ]);

        // المشرف الوزاري يستعلم عن مدرسة الفاروق: مسموح 200
        Sanctum::actingAs($this->supervisorMinistry);
        $supervisorRes = $this->getJson('/api/v1/schools/' . $this->schoolFarouq->school_id);
        $supervisorRes->assertStatus(200)
            ->assertJsonPath('data.schoolId', $this->schoolFarouq->school_id);

        // مسؤول النظام يستعلم عن مدرسة بلقيس: مسموح 200
        Sanctum::actingAs($this->adminUser);
        $adminRes = $this->getJson('/api/v1/schools/' . $this->schoolBelqees->school_id);
        $adminRes->assertStatus(200)
            ->assertJsonPath('data.schoolId', $this->schoolBelqees->school_id);
    }

    /**
     * 10. العزل في قائمة المدارس: مستخدم المدرسة لا يرى في القائمة إلا مدرسته فقط
     */
    public function test_school_index_list_is_isolated_to_users_own_school(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->getJson('/api/v1/schools');

        $response->assertStatus(200);
        $schools = $response->json('data');

        $this->assertCount(1, $schools);
        $this->assertEquals($this->schoolBelqees->school_id, $schools[0]['schoolId']);

        // المشرف الوزاري يرى كافة المدارس (بلقيس والفاروق)
        Sanctum::actingAs($this->supervisorMinistry);
        $supResponse = $this->getJson('/api/v1/schools');
        $supResponse->assertStatus(200);
        $this->assertGreaterThanOrEqual(2, count($supResponse->json('data')));
    }

    /**
     * 11. اختبار سياسة التقييم وعزل المدارس في EvaluationPolicy
     */
    public function test_evaluation_policy_enforces_school_isolation_and_roles(): void
    {
        $cycle = EvaluationCycle::firstOrCreate(
            ['academic_year' => '2026/2027'],
            [
                'version_id' => StandardVersion::first()->version_id,
                'start_date' => '2026-09-01',
                'end_date'   => '2027-06-30',
                'status'     => 'Active',
            ]
        );

        $evalBelqees = Evaluation::firstOrCreate(
            [
                'cycle_id'  => $cycle->cycle_id,
                'school_id' => $this->schoolBelqees->school_id,
            ],
            [
                'created_by_user_id' => $this->evaluatorBelqees->user_id,
                'status'             => 'InProgress',
            ]
        );

        // مقيم بلقيس يملك حق الاطلاع على تقييم مدرسته
        $this->assertTrue($this->evaluatorBelqees->can('view', $evalBelqees));
        $this->assertTrue($this->evaluatorBelqees->can('update', $evalBelqees));
        $this->assertTrue($this->evaluatorBelqees->can('submit', $evalBelqees));

        // مدير مدرسة بلقيس: يملك حق الاطلاع ولا يملك حق التعديل أو الإرسال النهائي
        $this->assertTrue($this->principalBelqees->can('view', $evalBelqees));
        $this->assertFalse($this->principalBelqees->can('update', $evalBelqees));
        $this->assertFalse($this->principalBelqees->can('submit', $evalBelqees));

        // مقيم مدرسة الفاروق: محظور قطعياً من تقييم مدرسة بلقيس (العزل المدرسي)
        $this->assertFalse($this->evaluatorFarouq->can('view', $evalBelqees));
        $this->assertFalse($this->evaluatorFarouq->can('update', $evalBelqees));
        $this->assertFalse($this->evaluatorFarouq->can('submit', $evalBelqees));

        // المشرف الوزاري: يملك حق الاطلاع
        $this->assertTrue($this->supervisorMinistry->can('view', $evalBelqees));
        // المشرف لا يعدل تقييم المدرسة
        $this->assertFalse($this->supervisorMinistry->can('update', $evalBelqees));

        // مسؤول النظام: محظور قطعياً من التقييم (BR-GEN-06)
        $this->assertFalse($this->adminUser->can('view', $evalBelqees));
        $this->assertFalse($this->adminUser->can('update', $evalBelqees));
    }

    /**
     * 12. اختبار قيود مسؤول المعايير ومسؤول النظام (BR-MIN-01 & BR-GEN-06)
     */
    public function test_negative_permission_rules_for_standards_manager_and_admin(): void
    {
        // BR-MIN-01: مسؤول المعايير لا يملك أي صلاحيات مراجعة أو إشراف أو تقارير
        $this->assertFalse($this->standardsManagerMinistry->hasPermission('supervision.review'));
        $this->assertFalse($this->standardsManagerMinistry->hasPermission('reports.view'));
        $this->assertFalse($this->standardsManagerMinistry->hasPermission('evaluations.view'));
        $this->assertTrue($this->standardsManagerMinistry->hasPermission('standards.manage'));

        // BR-GEN-06: مسؤول النظام لا يملك أي صلاحيات تقييم أو استعراض تقارير
        $this->assertFalse($this->adminUser->hasPermission('evaluations.create'));
        $this->assertFalse($this->adminUser->hasPermission('evaluations.view'));
        $this->assertFalse($this->adminUser->hasPermission('reports.view'));
        $this->assertTrue($this->adminUser->hasPermission('schools.manage'));
        $this->assertTrue($this->adminUser->hasPermission('users.manage'));
    }
}
