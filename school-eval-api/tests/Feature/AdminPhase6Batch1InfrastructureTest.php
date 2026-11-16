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
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminPhase6Batch1InfrastructureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $admin;
    protected User $evaluator;
    protected string $defaultPassword;

    protected function setUp(): void
    {
        parent::setUp();

        $this->defaultPassword = env('SEED_DEFAULT_PASSWORD') ?: 'ChangeMeDevPassword@2026';
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
     * اختبار جلب كافة المحافظات اليمنية الـ22 بالكامل.
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
        Cache::put('admin_system_settings', [
            'maintenanceMode' => [
                'isEnabled' => true,
                'scheduledAt' => now()->toIso8601ZuluString(),
                'reason' => 'صيانة استثنائية',
            ],
        ], now()->addHour());

        $response = $this->postJson('/api/v1/auth/login', [
            'username' => 'admin',
            'password' => $this->defaultPassword,
        ]);

        // يجب ألا يحظر برمز 503
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

        // التحقق من إنشاء سجل تدقيق في جدول audit_logs
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
            'schoolName' => 'مدرسة النور النموذجية التجريبية',
            'schoolType' => 'حكومي',
            'educationalLevel' => 'أساسي وثانوي',
            'genderType' => 'بنين',
            'governorateId' => $capital->governorate_id,
            'directorateId' => $tahreer->directorate_id,
            'region' => 'أمانة العاصمة',
            'address' => 'التحرير، صنعاء',
            'studentCount' => 650,
            'teacherCount' => 40,
            'classCount' => 18,
            'establishedYear' => 2012,
        ];

        $createRes = $this->postJson('/api/v1/schools', $createPayload);
        $createRes->assertStatus(201);
        $schoolId = $createRes->json('data.schoolId');

        $this->assertDatabaseHas('schools', [
            'school_id' => $schoolId,
            'governorate_id' => $capital->governorate_id,
            'directorate_id' => $tahreer->directorate_id,
        ]);

        $createdSchool = School::findOrFail($schoolId);
        $this->assertEquals($capital->governorate_id, $createdSchool->governorate_id);
        $this->assertEquals($tahreer->directorate_id, $createdSchool->directorate_id);
    }
}
