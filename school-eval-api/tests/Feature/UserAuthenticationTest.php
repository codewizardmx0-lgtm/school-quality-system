<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class UserAuthenticationTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * اختبار تخزين كلمة المرور مشفرة بطريقة التجزئة (Hash) وليس كنص صريح
     */
    public function test_user_password_is_hashed_and_not_plain_text(): void
    {
        $plainPassword = 'SecretPassword@2026';

        $user = User::create([
            'username' => 'auth_user_' . substr(uniqid(), -8),
            'password_hash' => Hash::make($plainPassword),
            'full_name' => 'مستخدم مصادقة تجريبي',
            'email' => 'auth_' . substr(uniqid(), -8) . '@example.com',
            'user_type' => 'system',
            'status' => 'Active',
        ]);

        // التحقق من أن القيمة المخزنة ليست النص الصريح
        $this->assertNotEquals($plainPassword, $user->password_hash);

        // التحقق من أن القيمة تجزئة Bcrypt صالحة
        $this->assertTrue(Hash::check($plainPassword, $user->password_hash));

        // التحقق من استبعاد password_hash من المصفوفة عند تحويل الموديل لـ Array أو JSON
        $userArray = $user->toArray();
        $this->assertArrayNotHasKey('password_hash', $userArray, 'يجب أن يكون password_hash مخفياً من مصفوفة النموذج.');
    }

    /**
     * اختبار نجاح المصادقة ببيانات صحيحة عبر Auth::attempt()
     */
    public function test_auth_attempt_succeeds_with_correct_credentials(): void
    {
        $username = 'valid_user_' . substr(uniqid(), -8);
        $plainPassword = 'ValidPassword@123';

        User::create([
            'username' => $username,
            'password_hash' => Hash::make($plainPassword),
            'full_name' => 'مستخدم تسجيل دخول',
            'email' => 'valid_' . substr(uniqid(), -8) . '@example.com',
            'user_type' => 'system',
            'status' => 'Active',
        ]);

        $attempt = Auth::attempt([
            'username' => $username,
            'password' => $plainPassword,
        ]);

        $this->assertTrue($attempt, 'فشلت عملية المصادقة ببيانات صحيحة.');
        $this->assertNotNull(Auth::user());
        $this->assertEquals($username, Auth::user()->username);

        Auth::logout();
    }

    /**
     * اختبار فشل المصادقة عند إدخال كلمة مرور خاطئة
     */
    public function test_auth_attempt_fails_with_wrong_password(): void
    {
        $username = 'wrong_pwd_user_' . substr(uniqid(), -8);
        $correctPassword = 'RealPassword@123';
        $wrongPassword = 'WrongPassword@999';

        User::create([
            'username' => $username,
            'password_hash' => Hash::make($correctPassword),
            'full_name' => 'مستخدم كلمة خاطئة',
            'email' => 'wrong_' . substr(uniqid(), -8) . '@example.com',
            'user_type' => 'system',
            'status' => 'Active',
        ]);

        $attempt = Auth::attempt([
            'username' => $username,
            'password' => $wrongPassword,
        ]);

        $this->assertFalse($attempt, 'يجب أن تفشل المصادقة عند إدخال كلمة مرور غير مطابقة.');
        $this->assertNull(Auth::user());
    }
}
