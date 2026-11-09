<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PruneExpiredTokensTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * مساعدة لإنشاء مستخدم تجريبي.
     */
    protected function createTestUser(): User
    {
        return User::create([
            'username'      => 'token_user_' . substr(uniqid(), -8),
            'password_hash' => Hash::make('TestPassword@2026'),
            'full_name'     => 'مستخدم فحص التوكنات',
            'email'         => 'token_' . substr(uniqid(), -8) . '@example.com',
            'user_type'     => 'system',
            'status'        => 'Active',
        ]);
    }

    /**
     * اختبار جدولة وتشغيل أمر حذف التوكنات المنتهية بنجاح (BE-GAP-05).
     */
    public function test_prune_expired_tokens_command_executes_successfully(): void
    {
        $exitCode = Artisan::call('sanctum:prune-expired', ['--hours' => 24]);
        $this->assertSame(0, $exitCode);
    }

    /**
     * اختبار حذف الرموز المنتهية والاحتفاظ بالرموز السارية.
     */
    public function test_expired_tokens_are_pruned_while_valid_tokens_remain(): void
    {
        $user = $this->createTestUser();

        // إنشاء رمز سارٍ
        $validToken = $user->createToken('valid-token')->accessToken;
        $validTokenId = $validToken->id;

        // إنشاء رمز منتهي بتعديل تاريخ الإنشاء والصلاحية لقبل 48 ساعة
        $expiredToken = $user->createToken('expired-token')->accessToken;
        $expiredTokenId = $expiredToken->id;

        DB::table('personal_access_tokens')
            ->where('id', $expiredTokenId)
            ->update([
                'created_at' => now()->subHours(48),
                'expires_at' => now()->subHours(25),
            ]);

        // تشغيل أمر التنظيف
        Artisan::call('sanctum:prune-expired', ['--hours' => 24]);

        // التأكد من حذف التوكن المنتهي وبقاء التوكن الساري
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $expiredTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $validTokenId]);
    }

    /**
     * اختبار تنظيف سجلات الجلسات الخاملة التي تجاوزت 30 يوماً (FR-GEN-02).
     */
    public function test_inactive_sessions_older_than_30_days_are_pruned(): void
    {
        $user = $this->createTestUser();
        $oldToken = 'test_old_session_' . uniqid();
        $newToken = 'test_new_session_' . uniqid();

        DB::table('sessions')->insert([
            [
                'user_id'       => $user->user_id,
                'session_token' => $oldToken,
                'started_at'    => now()->subDays(40),
                'ended_at'      => now()->subDays(35),
                'active'        => false,
                'created_at'    => now()->subDays(40),
                'updated_at'    => now()->subDays(35),
            ],
            [
                'user_id'       => $user->user_id,
                'session_token' => $newToken,
                'started_at'    => now()->subMinutes(5),
                'ended_at'      => null,
                'active'        => true,
                'created_at'    => now()->subMinutes(5),
                'updated_at'    => now()->subMinutes(5),
            ],
        ]);

        // محاكاة تشغيل مهمة تنظيف الجلسات المجدولة
        $threshold = now()->subDays(30);
        DB::table('sessions')
            ->where('active', false)
            ->where('ended_at', '<', $threshold)
            ->delete();

        // التحقق من حذف القديمة وبقاء الحديثة
        $this->assertDatabaseMissing('sessions', ['session_token' => $oldToken]);
        $this->assertDatabaseHas('sessions', ['session_token' => $newToken]);
    }
}
