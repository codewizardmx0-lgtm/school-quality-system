<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminBackupFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $adminUser;
    protected User $evaluatorUser;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['role_name' => 'admin'], ['role_title' => 'مدير النظام']);
        $permission = Permission::firstOrCreate(['permission_code' => 'users.manage'], ['permission_name' => 'إدارة المستخدمين']);
        $role->permissions()->syncWithoutDetaching([$permission->permission_id => ['assigned_at' => now()]]);

        $this->adminUser = User::create([
            'username'      => 'admin_test_' . substr(uniqid(), -8),
            'password_hash' => Hash::make('Secret123!'),
            'full_name'     => 'مدير نظام تجريبي',
            'email'         => 'admin_test_' . substr(uniqid(), -8) . '@example.com',
            'user_type'     => 'system',
            'status'        => 'Active',
        ]);
        $this->adminUser->roles()->attach($role->role_id, ['assigned_at' => now(), 'active' => true]);

        $evalRole = Role::firstOrCreate(['role_name' => 'school_evaluator'], ['role_title' => 'مقيم المدرسة']);
        $this->evaluatorUser = User::create([
            'username'      => 'eval_test_' . substr(uniqid(), -8),
            'password_hash' => Hash::make('Secret123!'),
            'full_name'     => 'مقيم تجريبي',
            'email'         => 'eval_test_' . substr(uniqid(), -8) . '@example.com',
            'user_type'     => 'school',
            'status'        => 'Active',
        ]);
        $this->evaluatorUser->roles()->attach($evalRole->role_id, ['assigned_at' => now(), 'active' => true]);
    }

    /**
     * التحقق من أن مجلد النسخ الاحتياطي محمي وليس داخل public (BE-GAP-03).
     */
    public function test_backup_storage_directory_is_protected_and_outside_public(): void
    {
        $backupDir = storage_path('app/backups');
        $publicDir = public_path();

        $this->assertFalse(str_starts_with($backupDir, $publicDir), 'مجلد النسخ الاحتياطية يجب ألا يكون داخل مجلد public.');
        $this->assertFileExists($backupDir . DIRECTORY_SEPARATOR . '.htaccess', 'يجب أن يحتوي مجلد النسخ على ملف .htaccess يمنع الوصول المباشر.');
        $this->assertFileExists($backupDir . DIRECTORY_SEPARATOR . '.gitignore', 'يجب أن يحتوي مجلد النسخ على .gitignore لمنع تسريب النسخ الاحتياطية.');
    }

    /**
     * اختبار إنشاء نسخة احتياطية محلية وتوليد البصمة الرقمية الحقيقية (SHA-256).
     */
    public function test_admin_can_trigger_local_backup_with_real_sha256(): void
    {
        Sanctum::actingAs($this->adminUser);

        $response = $this->postJson('/api/v1/backups', [
            'backupType' => 'db_only',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.backupType', 'db_only');

        $backupData = $response->json('data');
        $this->assertNotEmpty($backupData['sha256Hash']);
        $this->assertNotEmpty($backupData['fileName']);

        $filePath = storage_path('app/backups' . DIRECTORY_SEPARATOR . $backupData['fileName']);
        $this->assertFileExists($filePath);
        $this->assertSame(hash_file('sha256', $filePath), $backupData['sha256Hash']);
    }

    /**
     * اختبار التحقق من سلامة البصمة الرقمية للنسخة وتنزيلها.
     */
    public function test_admin_can_verify_and_download_backup(): void
    {
        Sanctum::actingAs($this->adminUser);

        // 1. إنشاء نسخة
        $createRes = $this->postJson('/api/v1/backups', [
            'backupType' => 'full',
        ]);
        $createRes->assertStatus(201);
        $backupId = $createRes->json('data.backupId');

        // 2. التحقق من سلامة البصمة
        $verifyRes = $this->postJson("/api/v1/backups/{$backupId}/verify");

        $verifyRes->assertStatus(200)
            ->assertJsonPath('data.verified', true)
            ->assertJsonPath('data.algorithm', 'SHA-256');

        // 3. تنزيل النسخة
        $downloadRes = $this->get("/api/v1/backups/{$backupId}/download");

        $downloadRes->assertStatus(200)
            ->assertHeader('content-type', 'application/octet-stream');
    }

    /**
     * اختبار حظر غير المصرح لهم (المقيم المدرسي) من إدارة أو تنزيل النسخ الاحتياطية (403 Forbidden).
     */
    public function test_non_admin_cannot_trigger_or_download_backup(): void
    {
        Sanctum::actingAs($this->evaluatorUser);

        // محاولة إنشاء نسخة من قبل مقيم المدرسة
        $this->postJson('/api/v1/backups', [
            'backupType' => 'full',
        ])
        ->assertStatus(403);

        // محاولة تنزيل نسخة
        $this->get('/api/v1/backups/1/download')
            ->assertStatus(403);
    }
}
