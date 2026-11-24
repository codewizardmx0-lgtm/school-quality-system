<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\UserRoleSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminBackupFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $admin;
    protected User $evaluator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\MinistrySeeder::class);
        $this->seed(\Database\Seeders\GovernorateSeeder::class);
        $this->seed(\Database\Seeders\DirectorateSeeder::class);
        $this->seed(\Database\Seeders\SchoolSeeder::class);
        $this->seed(RoleSeeder::class);
        $this->seed(PermissionSeeder::class);
        $this->seed(RolePermissionSeeder::class);
        $this->seed(UserSeeder::class);
        $this->seed(UserRoleSeeder::class);

        $this->admin = User::where('username', 'admin')->firstOrFail();
        $this->evaluator = User::where('username', 'quality_farouq')->firstOrFail();

        Cache::forget('admin_backups');
    }

    /**
     * اختبار إنشاء نسخة احتياطية حقيقية وتشفيرها وحساب بصمة SHA-256.
     */
    public function test_admin_can_trigger_real_encrypted_backup(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backups', [
            'backupType' => 'full',
        ]);

        $response->assertStatus(201);
        $data = $response->json('data');

        $this->assertNotNull($data);
        $this->assertArrayHasKey('backupId', $data);
        $this->assertArrayHasKey('fileName', $data);
        $this->assertArrayHasKey('sizeBytes', $data);
        $this->assertArrayHasKey('sha256Hash', $data);
        $this->assertGreaterThan(0, $data['sizeBytes']);
        $this->assertEquals(64, strlen($data['sha256Hash']));

        // التحقق من وجود الملف في مجلد التخزين storage/app/backups/
        $filePath = storage_path('app/backups/' . $data['fileName']);
        $this->assertFileExists($filePath);
        $this->assertEquals($data['sha256Hash'], hash_file('sha256', $filePath));

        // التحقق من ترويسة التشفير
        $content = file_get_contents($filePath);
        $this->assertStringStartsWith("SQS-AES256-V1\n", $content);
    }

    /**
     * اختبار التحقق من النزاهة الرقمية وتطابق البصمة SHA-256.
     */
    public function test_admin_can_verify_backup_integrity(): void
    {
        Sanctum::actingAs($this->admin);

        $createRes = $this->postJson('/api/v1/backups', [
            'backupType' => 'db_only',
        ]);
        $backupId = $createRes->json('data.backupId');

        $verifyRes = $this->postJson("/api/v1/backups/{$backupId}/verify");
        $verifyRes->assertStatus(200);
        $this->assertTrue($verifyRes->json('data.verified'));
        $this->assertEquals('SHA-256', $verifyRes->json('data.algorithm'));
    }

    /**
     * اختبار تنزيل النسخة الاحتياطية لمسؤول النظام.
     */
    public function test_admin_can_download_backup(): void
    {
        Sanctum::actingAs($this->admin);

        $createRes = $this->postJson('/api/v1/backups', [
            'backupType' => 'full',
        ]);
        $backupId = $createRes->json('data.backupId');

        $downloadRes = $this->get("/api/v1/backups/{$backupId}/download");
        $downloadRes->assertStatus(200);
        $downloadRes->assertHeader('Content-Type', 'application/octet-stream');
    }

    /**
     * اختبار حظر المستخدم غير المصرح من إطلاق أو تنزيل النسخ الاحتياطية.
     */
    public function test_unauthorized_user_is_forbidden_from_backup_operations(): void
    {
        Sanctum::actingAs($this->evaluator);

        $this->postJson('/api/v1/backups', ['backupType' => 'full'])
            ->assertStatus(403);

        $this->get('/api/v1/backups/1/download')
            ->assertStatus(403);
    }
}
