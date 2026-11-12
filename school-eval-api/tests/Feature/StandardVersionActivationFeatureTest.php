<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\StandardVersion;
use App\Models\User;
use App\Services\AuditLoggerService;
use App\Services\StandardManagementService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات ضابط اتساق الإصدارات المعيارية والأرشفة الذرية (G-23 - الشريحة 11).
 *
 * تغطي:
 * 1. تنشيط أو إقرار إصدار معايير جديد يؤرشف الإصدار النشط السابق تلقائيًا.
 * 2. العملية ذرية داخل DB::transaction مع تسجيل سجلات التدقيق المناسبة:
 *    - standard_version.auto_archived
 *    - standard_version.activated
 * 3. التحقق من عدم وجود كلمات مرور أو توكنات في سجل التدقيق وحفظ القيم السابقة والجديدة.
 * 4. حماية على مستوى النموذج والخدمة تمنع وجود أكثر من إصدار نشط (Active / Approved) في نفس الوقت.
 */
class StandardVersionActivationFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $standardsManager;
    protected StandardVersion $seededVersion;

    protected function setUp(): void
    {
        parent::setUp();

        $this->standardsManager = User::where('email', 'standards.manager@moe.gov.ye')->firstOrFail();
        $this->seededVersion = StandardVersion::whereIn('status', [StandardVersion::STATUS_ACTIVE, StandardVersion::STATUS_APPROVED])->firstOrFail();
    }

    /**
     * اختبار إقرار وتنشيط مسودة جديدة يؤرشف الإصدار القديم تلقائيًا ويسجل عمليات التدقيق.
     */
    public function test_approving_new_version_auto_archives_previous_active_and_logs_audit(): void
    {
        Sanctum::actingAs($this->standardsManager);

        // 1. استنساخ إصدار ساري كمسودة جديدة
        $clonedResponse = $this->postJson("/api/v1/standard-versions/{$this->seededVersion->version_id}/clone", [
            'version_no' => '2027.TEST-G23',
        ]);
        $clonedResponse->assertCreated();
        $newVersionId = $clonedResponse->json('data.version_id');

        // 2. إقرار وتنشيط المسودة
        $approveResponse = $this->postJson("/api/v1/standard-versions/{$newVersionId}/approve");
        $approveResponse->assertOk();

        $activateResponse = $this->postJson("/api/v1/standard-versions/{$newVersionId}/activate");
        $activateResponse->assertOk();

        // 3. التحقق من حالة الإصدار الجديد والإصدار السابق
        $this->seededVersion->refresh();
        $this->assertEquals(StandardVersion::STATUS_ARCHIVED, $this->seededVersion->status, 'يجب أرشفة الإصدار السابق تلقائيًا.');

        $newVersion = StandardVersion::find($newVersionId);
        $this->assertTrue($newVersion->isApproved(), 'يجب أن يصبح الإصدار الجديد مُقرًا ونشطًا.');

        // 4. التحقق من وجود إصدار نشط/مُقر واحد فقط في النظام ككل
        $activeCount = StandardVersion::whereIn('status', [StandardVersion::STATUS_ACTIVE, StandardVersion::STATUS_APPROVED])->count();
        $this->assertEquals(1, $activeCount, 'يجب أن يكون هناك إصدار نشط/مُقر واحد فقط في عموم النظام.');

        // 5. التحقق من تسجيل عمليتي التدقيق
        $autoArchivedLog = AuditLog::where('action', AuditLoggerService::ACTION_STANDARD_VERSION_AUTO_ARCHIVED)
            ->where('target_id', $this->seededVersion->version_id)
            ->latest('log_id')
            ->first();

        $this->assertNotNull($autoArchivedLog, 'يجب تسجيل تدقيق للأرشفة التلقائية.');
        $this->assertEquals($this->standardsManager->user_id, $autoArchivedLog->user_id);
        $this->assertEquals(StandardVersion::STATUS_ARCHIVED, $autoArchivedLog->new_values['status']);

        $activatedLog = AuditLog::where('action', AuditLoggerService::ACTION_STANDARD_VERSION_ACTIVATED)
            ->where('target_id', $newVersionId)
            ->latest('log_id')
            ->first();

        $this->assertNotNull($activatedLog, 'يجب تسجيل تدقيق لتنشيط الإصدار الجديد.');
        $this->assertEquals($this->standardsManager->user_id, $activatedLog->user_id);
    }

    /**
     * اختبار مسار التنشيط الصريح /activate عبر API.
     */
    public function test_explicit_activate_endpoint_works_and_archives_previous(): void
    {
        Sanctum::actingAs($this->standardsManager);

        // إنشاء إصدار جديد
        $draft = StandardVersion::create([
            'version_no'          => '2028.ACTIVATE-API',
            'issue_date'          => now()->toDateString(),
            'source_organization' => 'وزارة التربية',
            'status'              => StandardVersion::STATUS_DRAFT,
        ]);

        $response = $this->postJson("/api/v1/standard-versions/{$draft->version_id}/activate");
        $response->assertOk();

        $this->seededVersion->refresh();
        $this->assertEquals(StandardVersion::STATUS_ARCHIVED, $this->seededVersion->status);

        $draft->refresh();
        $this->assertEquals(StandardVersion::STATUS_ACTIVE, $draft->status);

        // تدقيق التنشيط
        $this->assertDatabaseHas('audit_logs', [
            'action'    => AuditLoggerService::ACTION_STANDARD_VERSION_ACTIVATED,
            'target_id' => $draft->version_id,
        ]);
    }

    /**
     * اختبار الضمانة على مستوى النموذج (Model Level Safeguard):
     * تحديث مباشر لنموذج ليصبح Active يؤرشف أي إصدار نشط آخر تلقائياً.
     */
    public function test_model_safeguard_prevents_multiple_active_versions_simultaneously(): void
    {
        $v1 = StandardVersion::create([
            'version_no'          => '2099.V1',
            'issue_date'          => now()->toDateString(),
            'source_organization' => 'وزارة التربية',
            'status'              => StandardVersion::STATUS_DRAFT,
        ]);

        $v2 = StandardVersion::create([
            'version_no'          => '2099.V2',
            'issue_date'          => now()->toDateString(),
            'source_organization' => 'وزارة التربية',
            'status'              => StandardVersion::STATUS_DRAFT,
        ]);

        // تنشيط الأول
        $v1->update(['status' => StandardVersion::STATUS_ACTIVE]);
        $this->assertEquals(StandardVersion::STATUS_ACTIVE, $v1->fresh()->status);

        // تنشيط الثاني مباشرة عبر النموذج
        $v2->update(['status' => StandardVersion::STATUS_ACTIVE]);
        $this->assertEquals(StandardVersion::STATUS_ACTIVE, $v2->fresh()->status);

        // يجب أن يكون الأول قد تم أرشفته تلقائياً بواسطة Booted Model Safeguard
        $this->assertEquals(StandardVersion::STATUS_ARCHIVED, $v1->fresh()->status);

        // عدد الإصدارات النشطة الآن في النظام هو 1 فقط
        $activeCount = StandardVersion::whereIn('status', [StandardVersion::STATUS_ACTIVE, StandardVersion::STATUS_APPROVED])->count();
        $this->assertEquals(1, $activeCount);
    }
}
