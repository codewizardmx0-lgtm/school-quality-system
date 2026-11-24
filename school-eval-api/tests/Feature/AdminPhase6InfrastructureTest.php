<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Directorate;
use App\Models\Governorate;
use App\Models\School;
use App\Models\User;
use Database\Seeders\DirectorateSeeder;
use Database\Seeders\GovernorateSeeder;
use Database\Seeders\SchoolMetricsAndFacilitiesSeeder;
use Database\Seeders\SchoolSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminPhase6InfrastructureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $admin;
    protected User $evaluator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(GovernorateSeeder::class);
        $this->seed(DirectorateSeeder::class);
        $this->seed(SchoolSeeder::class);
        $this->seed(SchoolMetricsAndFacilitiesSeeder::class);

        $this->admin = User::where('username', 'admin')->firstOrFail();
        $this->evaluator = User::where('username', 'quality_belqees')->firstOrFail();

        Cache::forget('admin_directorates');
        Cache::forget('admin_system_settings');
    }

    /**
     * اختبار جلب كافة المحافظات اليمنية الـ22 بالكامل مع إحصاء عدد المديريات.
     */
    public function test_governorates_endpoint_returns_22_governorates(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/governorates');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertIsArray($data);
        $this->assertCount(22, $data);

        $first = $data[0];
        $this->assertArrayHasKey('governorateId', $first);
        $this->assertArrayHasKey('code', $first);
        $this->assertArrayHasKey('nameAr', $first);
        $this->assertArrayHasKey('nameEn', $first);
        $this->assertArrayHasKey('directoratesCount', $first);

        $capital = collect($data)->firstWhere('code', 'AMANA');
        $this->assertNotNull($capital);
        $this->assertEquals('أمانة العاصمة', $capital['nameAr']);
        $this->assertGreaterThanOrEqual(10, $capital['directoratesCount']);
    }

    /**
     * اختبار جلب تفاصيل محافظة محددة مع مديرياتها.
     */
    public function test_governorates_show_endpoint(): void
    {
        Sanctum::actingAs($this->admin);

        $capital = Governorate::where('code', 'AMANA')->firstOrFail();
        $response = $this->getJson("/api/v1/governorates/{$capital->governorate_id}");

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertEquals($capital->governorate_id, $data['governorateId']);
        $this->assertEquals('أمانة العاصمة', $data['nameAr']);
        $this->assertCount(10, $data['directorates']);
    }

    /**
     * اختبار فلترة المديريات حسب معرف المحافظة (10 مديريات لأمانة العاصمة).
     */
    public function test_directorates_filtering_by_governorate_id(): void
    {
        Sanctum::actingAs($this->admin);

        $capital = Governorate::where('code', 'AMANA')->firstOrFail();
        $response = $this->getJson("/api/v1/directorates?governorateId={$capital->governorate_id}");

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertIsArray($data);
        $this->assertCount(10, $data);

        foreach ($data as $item) {
            $this->assertEquals($capital->governorate_id, $item['governorateId']);
            $this->assertEquals('أمانة العاصمة', $item['governorateName']);
        }
    }

    /**
     * اختبار وسيط وضع الصيانة (CheckMaintenanceMode):
     * حظر المستخدم العادي برمز 503 مع السماح لمدير النظام.
     */
    public function test_maintenance_mode_blocks_non_admin_and_allows_admin(): void
    {
        // 1. تفعيل وضع الصيانة
        Cache::put('admin_system_settings', [
            'maintenanceMode' => [
                'isEnabled' => true,
                'scheduledAt' => now()->toIso8601ZuluString(),
                'reason' => 'أعمال تحديث وصيانة مجدولة',
            ],
        ], now()->addHour());

        // 2. مستخدم غير إداري (مقيّم مدرسة) يتلقى 503
        Sanctum::actingAs($this->evaluator);
        $evaluatorResponse = $this->getJson('/api/v1/schools');
        $evaluatorResponse->assertStatus(503);
        $this->assertStringContainsString('وضع الصيانة', $evaluatorResponse->json('message'));

        // 3. مسؤول النظام المركزي يدخل بشكل طبيعي دون حظر
        Sanctum::actingAs($this->admin);
        $adminResponse = $this->getJson('/api/v1/schools');
        $adminResponse->assertStatus(200);

        // تنظيف الكاش
        Cache::forget('admin_system_settings');
    }

    /**
     * اختبار استثناء مسارات الدخول أثناء وضع الصيانة.
     */
    public function test_maintenance_mode_allows_login_route(): void
    {
        // تعيين كلمة مرور صريحة للمسؤول
        $this->admin->password_hash = Hash::make('AdminTestPass@123');
        $this->admin->status = 'Active';
        $this->admin->save();

        Cache::put('admin_system_settings', [
            'maintenanceMode' => [
                'isEnabled' => true,
                'scheduledAt' => now()->toIso8601ZuluString(),
                'reason' => 'صيانة استثنائية',
            ],
        ], now()->addHour());

        $response = $this->postJson('/api/v1/auth/login', [
            'username' => 'admin',
            'password' => 'AdminTestPass@123',
        ]);

        // مسار تسجيل الدخول مستثنى ولا يتم حظره بـ 503
        $this->assertNotEquals(503, $response->status());
        $response->assertStatus(200);

        Cache::forget('admin_system_settings');
    }

    /**
     * اختبار تسجيل description_ar في قاعدة البيانات عبر AuditLoggerService وسجلات التدقيق.
     */
    public function test_audit_logs_persisted_with_arabic_description(): void
    {
        Sanctum::actingAs($this->admin);

        // تبديل وضع الصيانة عبر الـ endpoint
        $toggleRes = $this->postJson('/api/v1/system-settings/maintenance');
        $toggleRes->assertStatus(200);

        // التحقق من إنشاء سجل تدقيق في جدول audit_logs مع الوصف العربي
        $latestLog = AuditLog::where('action', 'system.maintenance_mode_toggled')->latest('log_id')->first();
        $this->assertNotNull($latestLog);
        $this->assertNotEmpty($latestLog->description_ar);
        $this->assertStringContainsString('وضع الصيانة', $latestLog->description_ar);
        $this->assertEquals($this->admin->user_id, $latestLog->user_id);
    }

    /**
     * اختبار إنشاء مدرسة وتحديثها مع ربط governorate_id و directorate_id.
     */
    public function test_school_creation_and_update_with_governorate_and_directorate_ids(): void
    {
        Sanctum::actingAs($this->admin);

        $capital = Governorate::where('code', 'AMANA')->firstOrFail();
        $tahreer = Directorate::where('name_ar', 'مديرية التحرير')->firstOrFail();

        $createPayload = [
            'schoolName'       => 'مدرسة النور النموذجية التجريبية',
            'schoolType'       => 'government',
            'educationalStage' => 'أساسي وثانوي',
            'governorateId'    => $capital->governorate_id,
            'directorateId'    => $tahreer->directorate_id,
            'status'           => 'Active',
        ];

        $createRes = $this->postJson('/api/v1/schools', $createPayload);
        $createRes->assertStatus(201);
        $schoolId = $createRes->json('data.schoolId');

        $this->assertDatabaseHas('schools', [
            'school_id'      => $schoolId,
            'governorate_id' => $capital->governorate_id,
            'directorate_id' => $tahreer->directorate_id,
        ]);

        $createdSchool = School::findOrFail($schoolId);
        $this->assertEquals($capital->governorate_id, $createdSchool->governorate_id);
        $this->assertEquals($tahreer->directorate_id, $createdSchool->directorate_id);
    }

    /**
     * اختبار إضافة مشرف وزاري جغرافي خاص بمحافظة تعز بدون اشتراط مديرية (شامل للمحافظة).
     */
    public function test_create_ministry_supervisor_for_taiz_without_mandatory_directorate(): void
    {
        Sanctum::actingAs($this->admin);

        $role = \App\Models\Role::where('role_name', 'ministry_supervisor')->firstOrFail();

        $payload = [
            'fullName'    => 'د. أنور أحمد المخلافي (مشرف تعز)',
            'username'    => 'sup_taiz_general_' . time(),
            'email'       => 'taiz_sup_' . time() . '@arteqa.edu.ye',
            'password'    => 'Secret_Password_2026!',
            'userType'    => 'ministry',
            'roleId'      => $role->role_id,
            'governorate' => 'محافظة تعز',
            'directorateId' => null, // اختياري - شامل للمحافظة
            'status'      => 'Active',
        ];

        $res = $this->postJson('/api/v1/users', $payload);
        $res->assertStatus(201);
        $res->assertJsonPath('data.governorate', 'محافظة تعز');
        $res->assertJsonPath('data.directorateId', null);
        $res->assertJsonPath('data.userType', 'ministry');

        $userId = $res->json('data.userId');
        $this->assertDatabaseHas('users', [
            'user_id'        => $userId,
            'user_type'      => 'ministry',
            'governorate'    => 'محافظة تعز',
            'directorate_id' => null,
        ]);
    }

    /**
     * اختبار إضافة مشرف وزاري بنطاق مديرية محددة داخل محافظة تعز.
     */
    public function test_create_ministry_supervisor_with_specific_directorate_in_taiz(): void
    {
        Sanctum::actingAs($this->admin);

        $role = \App\Models\Role::where('role_name', 'ministry_supervisor')->firstOrFail();
        $mudhaffar = Directorate::where('name_ar', 'مديرية المظفر')->firstOrFail();

        $payload = [
            'fullName'      => 'أ. صهيب جمال الشميري',
            'username'      => 'sup_mudhaffar_' . time(),
            'email'         => 'mudhaffar_' . time() . '@arteqa.edu.ye',
            'password'      => 'Secret_Password_2026!',
            'userType'      => 'ministry',
            'roleId'        => $role->role_id,
            'governorate'   => 'محافظة تعز',
            'directorateId' => $mudhaffar->directorate_id,
            'status'        => 'Active',
        ];

        $res = $this->postJson('/api/v1/users', $payload);
        $res->assertStatus(201);
        $res->assertJsonPath('data.governorate', 'محافظة تعز');
        $res->assertJsonPath('data.directorateId', $mudhaffar->directorate_id);
        $res->assertJsonPath('data.directorate', 'مديرية المظفر');

        $userId = $res->json('data.userId');
        $this->assertDatabaseHas('users', [
            'user_id'        => $userId,
            'user_type'      => 'ministry',
            'governorate'    => 'محافظة تعز',
            'directorate_id' => $mudhaffar->directorate_id,
        ]);
    }

    /**
     * اختبار إضافة مشرف وزاري عام شامل لكافة المحافظات / النظام.
     */
    public function test_create_ministry_supervisor_system_wide_without_governorate(): void
    {
        Sanctum::actingAs($this->admin);

        $role = \App\Models\Role::where('role_name', 'ministry_supervisor')->firstOrFail();

        $payload = [
            'fullName'      => 'د. كمال يحيى العماد (إشراف مركزي عام)',
            'username'      => 'sup_central_' . time(),
            'email'         => 'central_' . time() . '@arteqa.edu.ye',
            'password'      => 'Secret_Password_2026!',
            'userType'      => 'ministry',
            'roleId'        => $role->role_id,
            'governorate'   => null,
            'directorateId' => null,
            'status'        => 'Active',
        ];

        $res = $this->postJson('/api/v1/users', $payload);
        $res->assertStatus(201);
        $res->assertJsonPath('data.governorate', null);
        $res->assertJsonPath('data.directorateId', null);

        $userId = $res->json('data.userId');
        $this->assertDatabaseHas('users', [
            'user_id'        => $userId,
            'user_type'      => 'ministry',
            'governorate'    => null,
            'directorate_id' => null,
        ]);
    }

    /**
     * اختبار تعديل مستخدم مع الإبقاء على نفس الدور أو تغييره دون حدوث خطأ المفتاح المكرر (Duplicate entry user_roles.PRIMARY).
     */
    public function test_update_user_does_not_fail_with_duplicate_role_key(): void
    {
        Sanctum::actingAs($this->admin);

        $roleSupervisor = \App\Models\Role::where('role_name', 'ministry_supervisor')->firstOrFail();
        $roleStandards = \App\Models\Role::where('role_name', 'ministry_standards_manager')->firstOrFail();

        // 1. إنشاء مستخدم
        $createPayload = [
            'fullName'      => 'مشرف للاختبار التعديل',
            'username'      => 'test_edit_dup_' . time(),
            'email'         => 'edit_dup_' . time() . '@arteqa.edu.ye',
            'password'      => 'Secret_Password_2026!',
            'userType'      => 'ministry',
            'roleId'        => $roleSupervisor->role_id,
            'governorate'   => 'محافظة تعز',
            'directorateId' => null,
            'status'        => 'Active',
        ];

        $createRes = $this->postJson('/api/v1/users', $createPayload);
        $createRes->assertStatus(201);
        $userId = $createRes->json('data.userId');

        // 2. تعديل المستخدم مع تمرير نفس الدور roleSupervisor (المحاكاة الدقيقة لحالة الخطأ التي أبلغ عنها المستخدم)
        $updateSameRolePayload = [
            'fullName'      => 'مشرف تم تحديث اسمه',
            'roleId'        => $roleSupervisor->role_id,
            'governorate'   => 'محافظة تعز',
            'directorateId' => null,
            'userType'      => 'ministry',
        ];

        $updateRes1 = $this->putJson("/api/v1/users/{$userId}", $updateSameRolePayload);
        $updateRes1->assertStatus(200);
        $updateRes1->assertJsonPath('data.fullName', 'مشرف تم تحديث اسمه');

        // التأكد من أن الدور نشط في جدول user_roles
        $this->assertDatabaseHas('user_roles', [
            'user_id' => $userId,
            'role_id' => $roleSupervisor->role_id,
            'active'  => 1,
        ]);

        // 3. تعديل المستخدم وتغيير دوره إلى دور آخر (roleStandards)
        $updateDiffRolePayload = [
            'fullName' => 'مشرف بدور جديد',
            'roleId'   => $roleStandards->role_id,
            'userType' => 'ministry',
        ];

        $updateRes2 = $this->putJson("/api/v1/users/{$userId}", $updateDiffRolePayload);
        $updateRes2->assertStatus(200);

        // الدور السابق تم إلغاء تفعيله
        $this->assertDatabaseHas('user_roles', [
            'user_id' => $userId,
            'role_id' => $roleSupervisor->role_id,
            'active'  => 0,
        ]);

        // الدور الجديد مفعل
        $this->assertDatabaseHas('user_roles', [
            'user_id' => $userId,
            'role_id' => $roleStandards->role_id,
            'active'  => 1,
        ]);

        // 4. إعادة التعديل مرة أخرى وإرجاعه إلى الدور الأول roleSupervisor للتأكد من إعادة التفعيل بسلاسة
        $updateBackPayload = [
            'roleId'   => $roleSupervisor->role_id,
            'userType' => 'ministry',
        ];

        $updateRes3 = $this->putJson("/api/v1/users/{$userId}", $updateBackPayload);
        $updateRes3->assertStatus(200);

        $this->assertDatabaseHas('user_roles', [
            'user_id' => $userId,
            'role_id' => $roleSupervisor->role_id,
            'active'  => 1,
        ]);
        $this->assertDatabaseHas('user_roles', [
            'user_id' => $userId,
            'role_id' => $roleStandards->role_id,
            'active'  => 0,
        ]);
    }
}
