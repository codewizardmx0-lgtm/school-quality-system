<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Directorate;
use App\Models\Governorate;
use App\Models\School;
use App\Models\User;
use Database\Seeders\SchoolMetricsAndFacilitiesSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminPhase5DirectoratesAndPdfTest extends TestCase
{
    use DatabaseTransactions;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\GovernorateSeeder::class);
        $this->seed(\Database\Seeders\DirectorateSeeder::class);
        $this->seed(SchoolMetricsAndFacilitiesSeeder::class);

        $this->admin = User::where('username', 'admin')->firstOrFail();
        Cache::forget('admin_directorates');
    }

    /**
     * اختبار جلب قائمة المديريات التعليمية مع حساب عدد المدارس الفعلي.
     */
    public function test_get_directorates_with_school_counts(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/directorates');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertIsArray($data);
        $this->assertGreaterThanOrEqual(9, count($data));

        $altahreer = collect($data)->firstWhere('directorateName', 'مديرية التحرير');
        $this->assertNotNull($altahreer);
        $this->assertGreaterThan(0, $altahreer['schoolCount']);
    }

    /**
     * اختبار إضافة مديرية جديدة ومنع تكرار الاسم.
     */
    public function test_store_directorate_and_prevent_duplicate_name(): void
    {
        Sanctum::actingAs($this->admin);

        // 1. إضافة مديرية جديدة بنجاح
        $createRes = $this->postJson('/api/v1/directorates', [
            'directorateName' => 'مديرية سنحان',
            'governorate'     => 'محافظة صنعاء',
        ]);

        $createRes->assertStatus(201);
        $this->assertEquals('مديرية سنحان', $createRes->json('data.directorateName'));
        $this->assertEquals('محافظة صنعاء', $createRes->json('data.governorate'));

        // 2. منع إضافة مديرية مكررة بنفس الاسم
        $dupRes = $this->postJson('/api/v1/directorates', [
            'directorateName' => 'مديرية سنحان',
            'governorate'     => 'محافظة صنعاء',
        ]);

        $dupRes->assertStatus(422);
        $dupRes->assertJsonValidationErrors(['directorateName']);
    }

    /**
     * اختبار تعديل مديرية وتحديث ارتباط المدارس بها ومنع تكرار الاسم مع مديرية أخرى.
     */
    public function test_update_directorate_and_cascade_schools(): void
    {
        Sanctum::actingAs($this->admin);

        // تعديل مديرية المظفر
        $mudhaffar = \App\Models\Directorate::where('name_ar', 'مديرية المظفر')->first();
        $mudhaffarId = $mudhaffar ? $mudhaffar->directorate_id : 11;

        $updateRes = $this->putJson("/api/v1/directorates/{$mudhaffarId}", [
            'directorateName' => 'مديرية المظفر النموذجية',
            'governorate'     => 'محافظة تعز',
        ]);

        $updateRes->assertStatus(200);
        $this->assertEquals('مديرية المظفر النموذجية', $updateRes->json('data.directorateName'));

        // التحقق من تحديث المدارس التي كانت تابعة للمظفر لتصبح تابعة للاسم الجديد
        $school = School::where('school_name', 'مدرسة الفاروق الأساسية للبنين')->first();
        if ($school) {
            $this->assertEquals('مديرية المظفر النموذجية', $school->educational_district);
        }

        // اختبار منع تعديل المديرية لاسم مديرية أخرى موجودة (مثل: مديرية التحرير)
        $dupUpdate = $this->putJson("/api/v1/directorates/{$mudhaffarId}", [
            'directorateName' => 'مديرية التحرير',
            'governorate'     => 'أمانة العاصمة',
        ]);

        $dupUpdate->assertStatus(422);
        $dupUpdate->assertJsonValidationErrors(['directorateName']);
    }

    /**
     * اختبار منع حذف مديرية مرتبطة بمدارس مع ظهور الرسالة الإلزامية.
     */
    public function test_prevent_deleting_directorate_linked_to_schools(): void
    {
        Sanctum::actingAs($this->admin);

        // مديرية التحرير (id: 1) مرتبطة بمدارس مثل بلقيس ورواد اليمن
        $deleteRes = $this->deleteJson('/api/v1/directorates/1');

        $deleteRes->assertStatus(422);
        $deleteRes->assertJsonFragment([
            'message' => 'لا يمكن حذف المديرية لأنها مرتبطة بمدارس',
        ]);
        $this->assertStringContainsString('لا يمكن حذف المديرية لأنها مرتبطة بمدارس', json_encode($deleteRes->json(), JSON_UNESCAPED_UNICODE));
    }

    /**
     * اختبار نجاح حذف مديرية غير مرتبطة بأي مدارس وتحديث الكاش.
     */
    public function test_delete_unlinked_directorate_succeeds(): void
    {
        Sanctum::actingAs($this->admin);

        // 1. إنشاء مديرية غير مرتبطة
        $createRes = $this->postJson('/api/v1/directorates', [
            'directorateName' => 'مديرية ذمار القديمة',
            'governorate'     => 'محافظة ذمار',
        ]);
        $createRes->assertStatus(201);
        $id = $createRes->json('data.directorateId');

        // 2. حذف المديرية غير المرتبطة
        $deleteRes = $this->deleteJson("/api/v1/directorates/{$id}");
        $deleteRes->assertStatus(200);

        // 3. التحقق من اختفائها من قائمة المديريات
        $listRes = $this->getJson('/api/v1/directorates');
        $listRes->assertStatus(200);
        $ids = collect($listRes->json('data'))->pluck('directorateId')->toArray();
        $this->assertNotContains($id, $ids);
    }

    /**
     * اختبار تصدير التقرير التنفيذي الرسمي بتنسيق PDF.
     */
    public function test_export_admin_executive_report_pdf(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->get('/api/v1/admin/export-report-pdf');

        $response->assertStatus(200);
        $this->assertEquals('application/pdf', $response->headers->get('content-type'));
        $this->assertStringContainsString('attachment; filename="erteqa_executive_report_', $response->headers->get('content-disposition'));

        $content = $response->getContent();
        $this->assertNotEmpty($content);
        // التحقق من بداية الملف القياسية لملفات PDF
        $this->assertStringStartsWith('%PDF-', $content);
    }

    /**
     * Phase 6: اختبار جلب كافة المحافظات اليمنية الـ22 بالكامل مع إحصاء عدد المديريات.
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
     * Phase 6: اختبار جلب تفاصيل محافظة محددة مع مديرياتها.
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
     * Phase 6: اختبار فلترة المديريات حسب معرف المحافظة (10 مديريات لأمانة العاصمة).
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
     * Phase 6: اختبار وسيط وضع الصيانة (CheckMaintenanceMode):
     * حظر المستخدم العادي برمز 503 مع السماح لمدير النظام.
     */
    public function test_maintenance_mode_blocks_non_admin_and_allows_admin(): void
    {
        $evaluator = User::where('username', 'quality_belqees')->firstOrFail();

        // 1. تفعيل وضع الصيانة
        Cache::put('admin_system_settings', [
            'maintenanceMode' => [
                'isEnabled' => true,
                'scheduledAt' => now()->toIso8601ZuluString(),
                'reason' => 'أعمال تحديث وصيانة مجدولة',
            ],
        ], now()->addHour());

        // 2. مستخدم غير إداري (مقيّم مدرسة) يتلقى 503
        Sanctum::actingAs($evaluator);
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
     * Phase 6: اختبار استثناء مسارات الدخول أثناء وضع الصيانة.
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
     * Phase 6: اختبار تسجيل description_ar في قاعدة البيانات عبر AuditLoggerService وسجلات التدقيق.
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
     * Phase 6: اختبار إنشاء مدرسة وتحديثها مع ربط governorate_id و directorate_id.
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
     * Phase 6 Batch 2: التحقق من تسمية ملف PDF بالتاريخ والوقت لمنع التداخل.
     */
    public function test_pdf_export_filename_contains_date_and_time(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->get('/api/v1/admin/export-report-pdf');

        $response->assertStatus(200);
        $contentDisposition = $response->headers->get('content-disposition');
        $this->assertNotNull($contentDisposition);

        // الصيغة: erteqa_executive_report_YYYY-MM-DD_HH-mm.pdf
        $this->assertMatchesRegularExpression(
            '/attachment; filename="erteqa_executive_report_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.pdf"/',
            $contentDisposition
        );
    }

    /**
     * Phase 6 Batch 2: تصدير سجل التدقيق الكامل بدون فلاتر (all=true) يعيد كافة السجلات دون حصر بصفحة واحدة.
     */
    public function test_audit_logs_export_all_without_filters(): void
    {
        Sanctum::actingAs($this->admin);

        // إنشاء سجلات تدقيق متعددة لتجاوز حجم الصفحة العادي
        for ($i = 0; $i < 25; $i++) {
            (new \App\Services\AuditLoggerService())->log(
                action: 'school.updated',
                targetType: 'School',
                targetId: 1,
                userId: $this->admin->user_id,
                descriptionAr: "عملية اختبار التصدير الشامل رقم {$i}"
            );
        }

        $totalInDb = AuditLog::count();
        $this->assertGreaterThanOrEqual(25, $totalInDb);

        // 1. طلب عادي بالصفحة (perPage=20 كافتراضي)
        $paginatedRes = $this->getJson('/api/v1/audit-logs?perPage=10');
        $paginatedRes->assertStatus(200);
        $this->assertCount(10, $paginatedRes->json('data'));

        // 2. طلب تصدير شامل (all=true)
        $exportRes = $this->getJson('/api/v1/audit-logs?all=true');
        $exportRes->assertStatus(200);
        $exportData = $exportRes->json('data');

        $this->assertCount($totalInDb, $exportData, 'التصدير يعيد كافة السجلات الموجودة في قاعدة البيانات');
    }

    /**
     * Phase 6 Batch 2: تصدير سجل التدقيق المطابق لفلتر محدد يعيد كل السجلات المطابقة دون حصر بصفحة.
     */
    public function test_audit_logs_export_all_filtered_by_action(): void
    {
        Sanctum::actingAs($this->admin);

        for ($i = 0; $i < 15; $i++) {
            (new \App\Services\AuditLoggerService())->log(
                action: 'directorate.created',
                targetType: 'Directorate',
                targetId: 99,
                userId: $this->admin->user_id,
                descriptionAr: "إنشاء مديرية تجريبية رقم {$i}"
            );
        }

        $matchingCount = AuditLog::where('action', 'directorate.created')->count();
        $this->assertGreaterThanOrEqual(15, $matchingCount);

        // طلب تصدير السجلات المفلترة بـ all=true
        $response = $this->getJson('/api/v1/audit-logs?actionType=directorate.created&all=true');
        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertCount($matchingCount, $data);
        foreach ($data as $item) {
            $actionVal = $item['eventType'] ?? $item['action'] ?? null;
            $this->assertEquals('directorate.created', $actionVal);
        }
    }
    /**
     * Phase 6 Batch 3: اختبار نقطة اقتراح كود المدرسة التلقائي وفق المحافظة.
     */
    public function test_suggest_school_code_endpoint(): void
    {
        Sanctum::actingAs($this->admin);

        $capital = Governorate::where('code', 'AMANA')->firstOrFail();
        $response = $this->getJson("/api/v1/schools/suggest-code?governorateId={$capital->governorate_id}");

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertNotNull($data);
        $this->assertEquals('AMANA', $data['govCode']);
        $this->assertStringStartsWith('SCH-AMANA-2026-', $data['code']);
        $this->assertGreaterThanOrEqual(1, $data['nextSerial']);
    }

    /**
     * Phase 6 Batch 3: اختبار تحديث اسم المستخدم (username) عبر نقطة تحديث المستخدم.
     */
    public function test_user_update_allows_editing_username(): void
    {
        Sanctum::actingAs($this->admin);

        $targetUser = User::create([
            'username' => 'temp_user_test_1',
            'full_name' => 'مستخدم للتعديل',
            'email' => 'temp_user_test_1@example.com',
            'password_hash' => bcrypt('password123'),
            'user_type' => 'school',
            'status' => 'Active',
        ]);

        $updatePayload = [
            'username' => 'updated_username_99',
            'fullName' => 'مستخدم محدث الاسم',
            'email' => 'temp_user_test_1@example.com',
            'userType' => 'school',
            'status' => 'Active',
        ];

        $response = $this->putJson("/api/v1/users/{$targetUser->user_id}", $updatePayload);
        $response->assertStatus(200);

        $this->assertDatabaseHas('users', [
            'user_id' => $targetUser->user_id,
            'username' => 'updated_username_99',
            'full_name' => 'مستخدم محدث الاسم',
        ]);
    }
    /**
     * Phase 6 الدفعة الختامية: اختبار تغيير كلمة المرور بنجاح للمستخدم الحالي.
     */
    public function test_change_password_success(): void
    {
        $user = User::create([
            'username' => 'pw_test_user_1',
            'full_name' => 'مستخدم فحص كلمة المرور',
            'email' => 'pw_test_user_1@example.com',
            'password_hash' => bcrypt('OldSecret123'),
            'user_type' => 'school',
            'status' => 'Active',
        ]);

        Sanctum::actingAs($user);

        $payload = [
            'currentPassword' => 'OldSecret123',
            'newPassword' => 'NewSecret456',
            'newPasswordConfirmation' => 'NewSecret456',
        ];

        $response = $this->postJson('/api/v1/auth/change-password', $payload);
        $response->assertStatus(200);

        $freshUser = $user->fresh();
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('NewSecret456', $freshUser->password_hash));

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->user_id,
            'action' => 'auth.password_changed',
        ]);
    }

    /**
     * Phase 6 الدفعة الختامية: فشل تغيير كلمة المرور بكلمة مرور قديمة خاطئة.
     */
    public function test_change_password_fail_wrong_current(): void
    {
        $user = User::create([
            'username' => 'pw_test_user_2',
            'full_name' => 'مستخدم فحص خطأ كلمة المرور',
            'email' => 'pw_test_user_2@example.com',
            'password_hash' => bcrypt('OldSecret123'),
            'user_type' => 'school',
            'status' => 'Active',
        ]);

        Sanctum::actingAs($user);

        $payload = [
            'currentPassword' => 'WrongCurrentPassword999',
            'newPassword' => 'NewSecret456',
            'newPasswordConfirmation' => 'NewSecret456',
        ];

        $response = $this->postJson('/api/v1/auth/change-password', $payload);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['current_password']);
    }

    /**
     * Phase 6 الدفعة الختامية: فشل تغيير كلمة المرور عند عدم تطابق التأكيد.
     */
    public function test_change_password_fail_unconfirmed(): void
    {
        $user = User::create([
            'username' => 'pw_test_user_3',
            'full_name' => 'مستخدم فحص عدم التطابق',
            'email' => 'pw_test_user_3@example.com',
            'password_hash' => bcrypt('OldSecret123'),
            'user_type' => 'school',
            'status' => 'Active',
        ]);

        Sanctum::actingAs($user);

        $payload = [
            'currentPassword' => 'OldSecret123',
            'newPassword' => 'NewSecret456',
            'newPasswordConfirmation' => 'DifferentSecret789',
        ];

        $response = $this->postJson('/api/v1/auth/change-password', $payload);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['new_password']);
    }

    /**
     * Phase 6 الدفعة الختامية: اختبار فلترة المديريات المترابطة لكل محافظة بدقة:
     * أمانة العاصمة = 10 مديريات، تعز = 1 مديرية، عدن أو صعدة = 0 مديريات.
     */
    public function test_directorates_cascade_filtering_per_governorate(): void
    {
        Sanctum::actingAs($this->admin);

        // 1. أمانة العاصمة
        $amana = Governorate::where('code', 'AMANA')->firstOrFail();
        $resAmana = $this->getJson("/api/v1/directorates?governorateId={$amana->governorate_id}");
        $resAmana->assertStatus(200);
        $this->assertCount(10, $resAmana->json('data'));

        // 2. محافظة تعز
        $taiz = Governorate::where('code', 'TAIZ')->firstOrFail();
        $resTaiz = $this->getJson("/api/v1/directorates?governorateId={$taiz->governorate_id}");
        $resTaiz->assertStatus(200);
        $this->assertCount(3, $resTaiz->json('data'), 'محافظة تعز تضم 3 مديريات مسجلة');

        // 3. محافظة بدون مديريات مسجلة بعد (مثلاً عدن أو صعدة)
        $aden = Governorate::where('code', 'ADEN')->firstOrFail();
        $resAden = $this->getJson("/api/v1/directorates?governorateId={$aden->governorate_id}");
        $resAden->assertStatus(200);
        $this->assertCount(0, $resAden->json('data'), 'المحافظة التي لم تسجل لها مديريات تعيد مصفوفة فارغة');
    }
}
