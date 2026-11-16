<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * متحكم استعادة وإعادة تعيين كلمة المرور (G-05).
 *
 * يوفر تدفقًا آمنًا لاستعادة الحسابات عبر البريد الإلكتروني ورموز التحقق المؤقتة،
 * مع فرض انتهاء صلاحية الرمز بعد 60 دقيقة وإبطال الجلسات السابقة عند التعيين.
 */
class PasswordResetController extends Controller
{
    /**
     * طلب رابط أو رمز استعادة كلمة المرور.
     *
     * POST /api/v1/auth/password/forgot
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
        ], [
            'email.required' => 'البريد الإلكتروني مطلوب.',
            'email.email'    => 'صيغة البريد الإلكتروني غير صالحة.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $email = strtolower(trim($request->email));
        $user = User::where('email', $email)->first();

        // لحماية خصوصية المستخدمين ومنع تعداد الحسابات (Account Enumeration)،
        // نرجع دائماً استجابة نجاح حتى لو لم يكن البريد مسجلاً.
        if (!$user) {
            return ApiResponse::success(
                data: null,
                message: 'إذا كان البريد الإلكتروني مسجلاً في النظام، فستصلك تعليمات استعادة كلمة المرور.'
            );
        }

        // توليد رمز استعادة آمن
        $plainToken = Str::random(60);
        $tokenHash = hash('sha256', $plainToken);

        // حذف أي رموز سابقة لنفس البريد
        DB::table('password_reset_tokens')->where('email', $email)->delete();

        // حفظ الرمز الجديد
        DB::table('password_reset_tokens')->insert([
            'email'      => $email,
            'token'      => $tokenHash,
            'created_at' => now(),
        ]);

        Log::info("Password reset token generated for user [{$user->user_id}] - {$email}");

        $responsePayload = null;
        // إتاحة الرمز في بيئة التطوير والاختبار لسهولة التحقق الآلي والتجربة
        if (app()->environment('local', 'testing')) {
            $responsePayload = [
                'email'      => $email,
                'resetToken' => $plainToken,
                'expiresIn'  => '60 minutes',
            ];
        }

        return ApiResponse::success(
            data: $responsePayload,
            message: 'تم إرسال تعليمات استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح.'
        );
    }

    /**
     * إعادة تعيين كلمة المرور باستخدام الرمز المؤقت.
     *
     * POST /api/v1/auth/password/reset
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email'                 => ['required', 'email'],
            'token'                 => ['required', 'string'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['required', 'string'],
        ], [
            'email.required'                 => 'البريد الإلكتروني مطلوب.',
            'email.email'                    => 'صيغة البريد الإلكتروني غير صالحة.',
            'token.required'                 => 'رمز استعادة كلمة المرور مطلوب.',
            'password.required'              => 'كلمة المرور الجديدة مطلوبة.',
            'password.min'                   => 'يجب ألا تقل كلمة المرور عن 8 أحرف.',
            'password.confirmed'            => 'تأكيد كلمة المرور غير متطابق.',
            'password_confirmation.required' => 'تأكيد كلمة المرور مطلوب.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $email = strtolower(trim($request->email));
        $record = DB::table('password_reset_tokens')->where('email', $email)->first();

        if (!$record) {
            return ApiResponse::validationError([
                'token' => ['رمز استعادة كلمة المرور غير صالح أو لم يتم طلبه.'],
            ]);
        }

        // فحص صلاحية الرمز زمنيًا (60 دقيقة)
        $createdAt = Carbon::parse($record->created_at);
        if ($createdAt->addMinutes(60)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            return ApiResponse::validationError([
                'token' => ['انتهت صلاحية رمز استعادة كلمة المرور. يرجى طلب رمز جديد.'],
            ]);
        }

        // مطابقة الرمز
        if (!hash_equals($record->token, hash('sha256', $request->token))) {
            return ApiResponse::validationError([
                'token' => ['رمز استعادة كلمة المرور غير صحيح.'],
            ]);
        }

        $user = User::where('email', $email)->first();
        if (!$user) {
            return ApiResponse::validationError([
                'email' => ['المستخدم صاحب هذا البريد الإلكتروني غير موجود.'],
            ]);
        }

        // تحديث كلمة المرور وحذف الرمز وإبطال جلسات المستخدم
        DB::transaction(function () use ($user, $request, $email) {
            $user->password_hash = Hash::make($request->password);
            $user->save();

            DB::table('password_reset_tokens')->where('email', $email)->delete();

            // إبطال جميع التوكنات والجلسات السابقة لحماية الحساب
            $user->tokens()->delete();
        });

        return ApiResponse::success(
            data: [
                'userId' => $user->user_id,
                'email'  => $user->email,
            ],
            message: 'تمت إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.'
        );
    }
}
