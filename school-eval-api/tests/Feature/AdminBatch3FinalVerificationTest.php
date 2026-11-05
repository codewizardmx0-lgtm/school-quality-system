<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\School;
use App\Models\User;
use App\Services\AuditLoggerService;
use Database\Seeders\AuditLogSeeder;
use Database\Seeders\SchoolMetricsAndFacilitiesSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminBatch3FinalVerificationTest extends TestCase
{
    use DatabaseTransactions;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(SchoolMetricsAndFacilitiesSeeder::class);
        $this->seed(AuditLogSeeder::class);

        $this->admin = User::where('username', 'admin')->firstOrFail();
    }

    /**
     * 1. التحقق من تعريب الأدوار في RoleResource و users/meta و users list.
     */
    public function test_roles_arabic_names_in_meta_and_user_resource(): void
    {
        Sanctum::actingAs($this->admin);

        // 1. users/meta
        $metaRes = $this->getJson('/api/v1/users/meta');
        $metaRes->assertStatus(200);

        $roles = $metaRes->json('data.roles');
        $this->assertNotEmpty($roles);

        $expectedArabicRoles = [
            'admin'                      => 'مدير النظام المركزي',
            'school_evaluator'           => 'مقيم المدرسة',
            'school_principal'           => 'مدير المدرسة',
            'ministry_standards_manager' => 'مسؤول إدارة المعايير',
            'ministry_supervisor'        => 'مشرف وزاري معتمد',
        ];

        foreach ($roles as $r) {
            $this->assertArrayHasKey('roleNameAr', $r);
            $this->assertArrayHasKey('roleCode', $r);
            if (isset($expectedArabicRoles[$r['roleName']])) {
                $this->assertEquals($expectedArabicRoles[$r['roleName']], $r['roleNameAr']);
            }
        }

        // 2. users index
        $usersRes = $this->getJson('/api/v1/users');
        $usersRes->assertStatus(200);
        $users = $usersRes->json('data');
        $this->assertNotEmpty($users);

        $firstUser = $users[0];
        $this->assertArrayHasKey('roleNameAr', $firstUser);
        $this->assertNotEmpty($firstUser['roleNameAr']);
    }

    /**
     * 2. التحقق من سجل التدقيق: Pagination لأكثر من 20 سجل، وتصفية الفاعل والحدث.
     */
    public function test_audit_logs_pagination_and_real_event_filters(): void
    {
        Sanctum::actingAs($this->admin);

        // التأكد من وجود أكثر من 20 سجلاً
        $totalDbLogs = AuditLog::count();
        $this->assertGreaterThan(20, $totalDbLogs);

        // اختبار الصفحة الأولى (perPage = 15)
        $page1Res = $this->getJson('/api/v1/admin/audit-logs?perPage=15&page=1');
        $page1Res->assertStatus(200);
        $page1Data = $page1Res->json('data');
        $this->assertCount(15, $page1Data);
        $this->assertEquals(1, $page1Res->json('meta.page'));
        $this->assertEquals(15, $page1Res->json('meta.perPage'));
        $this->assertEquals($totalDbLogs, $page1Res->json('meta.total'));
        $this->assertGreaterThanOrEqual(2, $page1Res->json('meta.lastPage'));

        // اختبار الصفحة الثانية
        $page2Res = $this->getJson('/api/v1/admin/audit-logs?perPage=15&page=2');
        $page2Res->assertStatus(200);
        $page2Data = $page2Res->json('data');
        $this->assertNotEmpty($page2Data);
        $this->assertNotEquals($page1Data[0]['logId'], $page2Data[0]['logId']);

        // اختبار فلتر نوع الحدث الفعلي من AuditLoggerService
        $actionFilterRes = $this->getJson('/api/v1/admin/audit-logs?actionType=' . AuditLoggerService::ACTION_LOGIN_SUCCESS);
        $actionFilterRes->assertStatus(200);
        $filteredEvents = $actionFilterRes->json('data');
        $this->assertNotEmpty($filteredEvents);
        foreach ($filteredEvents as $ev) {
            $this->assertEquals(AuditLoggerService::ACTION_LOGIN_SUCCESS, $ev['eventType']);
        }

        // اختبار فلتر الفاعل بالمستخدم الحقيقي
        $userFilterRes = $this->getJson('/api/v1/admin/audit-logs?userId=' . $this->admin->user_id);
        $userFilterRes->assertStatus(200);
        $userFilteredLogs = $userFilterRes->json('data');
        $this->assertNotEmpty($userFilteredLogs);
        foreach ($userFilteredLogs as $ev) {
            $this->assertEquals($this->admin->user_id, $ev['actorUserId']);
        }
    }

    /**
     * 3. التحقق من الإحصائيات الحقيقية في dashboard-stats و directorates.
     */
    public function test_real_statistics_and_directorate_counts(): void
    {
        Sanctum::actingAs($this->admin);

        // 1. فحص directorates
        $dirRes = $this->getJson('/api/v1/directorates');
        $dirRes->assertStatus(200);
        $directorates = $dirRes->json('data');
        $this->assertCount(9, $directorates);

        $totalSchoolsInDirs = array_sum(array_column($directorates, 'schoolCount'));
        $totalSchoolsInDb = School::count();
        $this->assertEquals($totalSchoolsInDb, $totalSchoolsInDirs);

        // التحقق من عدم وجود تكرار في أسماء المديريات
        $dirNames = array_column($directorates, 'directorateName');
        $this->assertCount(count($dirNames), array_unique($dirNames), 'لا يوجد تكرار في أسماء المديريات');

        // 2. فحص dashboard-stats
        $statsRes = $this->getJson('/api/v1/admin/dashboard-stats');
        $statsRes->assertStatus(200);
        $stats = $statsRes->json('data');

        $this->assertEquals($totalSchoolsInDb, $stats['totalSchools']);
        $this->assertEquals(User::count(), $stats['totalUsers']);
        $this->assertEquals(User::where('status', 'Active')->count(), $stats['activeUsers']);

        // حساب المدارس الجاهزة (مدير ومقيم مسندان معاً)
        $expectedReadySchools = School::whereHas('users', fn ($q) => $q->whereHas('roles', fn ($r) => $r->where('roles.role_name', 'school_principal')))
            ->whereHas('users', fn ($q) => $q->whereHas('roles', fn ($r) => $r->where('roles.role_name', 'school_evaluator')))
            ->count();

        $expectedRate = $totalSchoolsInDb > 0 ? round(($expectedReadySchools / $totalSchoolsInDb) * 100, 1) : 0.0;
        $this->assertEquals($expectedRate, $stats['schoolsReadinessRate']);
    }

    /**
     * 4. فحص ظهور كافة المدارس الـ 10 ونوع المدرسة.
     */
    public function test_all_10_schools_present_with_correct_types(): void
    {
        Sanctum::actingAs($this->admin);

        $schoolsRes = $this->getJson('/api/v1/schools');
        $schoolsRes->assertStatus(200);
        $schools = $schoolsRes->json('data');

        $this->assertCount(10, $schools);

        $govCount = count(array_filter($schools, fn ($s) => $s['schoolType'] === 'government'));
        $pvtCount = count(array_filter($schools, fn ($s) => $s['schoolType'] === 'private'));

        $this->assertEquals(7, $govCount);
        $this->assertEquals(3, $pvtCount);

        // التأكد من وجود كود المدرسة والمديرية والنوع والمدير والمقيمين في كل مورد
        foreach ($schools as $s) {
            $this->assertArrayHasKey('schoolName', $s);
            $this->assertArrayHasKey('schoolCode', $s);
            $this->assertArrayHasKey('schoolType', $s);
            $this->assertArrayHasKey('directorate', $s);
            $this->assertArrayHasKey('governorate', $s);
            $this->assertArrayHasKey('principal', $s);
            $this->assertArrayHasKey('evaluators', $s);
        }
    }
}
