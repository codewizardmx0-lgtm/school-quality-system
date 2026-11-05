<?php

namespace Tests\Feature;

use App\Models\School;
use App\Models\User;
use Database\Seeders\SchoolMetricsAndFacilitiesSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminPhase5DirectoratesAndPdfTest extends TestCase
{
    use DatabaseTransactions;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

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

        // تعديل مديرية المظفر (id: 9)
        $updateRes = $this->putJson('/api/v1/directorates/9', [
            'directorateName' => 'مديرية المظفر النموذجية',
            'governorate'     => 'محافظة تعز',
        ]);

        $updateRes->assertStatus(200);
        $this->assertEquals('مديرية المظفر النموذجية', $updateRes->json('data.directorateName'));

        // التحقق من تحديث المدارس التي كانت تابعة للمظفر لتصبح تابعة للاسم الجديد
        $school = School::where('school_name', 'مدرسة الفاروق الحديثة')->first();
        if ($school) {
            $this->assertEquals('مديرية المظفر النموذجية', $school->educational_district);
        }

        // اختبار منع تعديل المديرية لاسم مديرية أخرى موجودة (مثل: مديرية التحرير)
        $dupUpdate = $this->putJson('/api/v1/directorates/9', [
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
}
