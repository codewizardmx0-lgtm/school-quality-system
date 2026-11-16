<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Http\Responses\ApiResponse;
use App\Models\Session;
use App\Models\User;
use App\Services\AuditLoggerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/**
 * متحكم المصادقة والجلسات (AuthController).
 *
 * يوفر نقاط النهاية المعتمدة في الفصل الرابع واتفاقيات conventions.md:
 * 1. POST /api/v1/auth/login: تسجيل الدخول وإصدار رمز Sanctum مع تسجيل جلسة وظيفية (FR-GEN-01/02).
 * 2. POST /api/v1/auth/logout: تسجيل الخروج وإلغاء الرمز وإغلاق الجلسة الوظيفية (FR-GEN-02).
 * 3. GET  /api/v1/auth/me: جلب بيانات المستخدم المصادق مع أدواره وصلاحياته (FR-GEN-03).
 * 4. POST /api/v1/auth/password/change: تغيير كلمة المرور للمستخدم المصادق وإبطال الجلسات الأخرى (FR-GEN-01).
 */
class AuthController extends Controller
{
    public function __construct(
        protected AuditLoggerService $auditLogger
    ) {}
    /**
     * تسجيل الدخول، التحقق من كلمة المرور، إصدار الرمز، وتسجيل الجلسة الوظيفية.
     *
     * @param LoginRequest $request
     * @return JsonResponse
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        $user = User::where('username', $credentials['username'])->first();

        // فحص وجود المستخدم وصحة كلمة المرور المشفرة
        if (!$user || !Hash::check($credentials['password'], $user->password_hash)) {
            $this->auditLogger->log(
                action: 'auth.login_failed',
                targetType: 'User',
                targetId: $user?->user_id,
                oldValues: null,
                newValues: ['attempted_username' => $credentials['username'], 'reason' => 'invalid_credentials'],
                userId: $user?->user_id,
                schoolId: $user?->school_id
            );

            return ApiResponse::unauthorized('بيانات الاعتماد غير صحيحة.');
        }

        // فحص حالة الحساب (BR-GEN: لا وصول للحساب المعطل)
        if ($user->status !== 'Active') {
            $this->auditLogger->log(
                action: 'auth.login_failed',
                targetType: 'User',
                targetId: $user->user_id,
                oldValues: null,
                newValues: ['attempted_username' => $credentials['username'], 'reason' => 'account_inactive'],
                userId: $user->user_id,
                schoolId: $user->school_id
            );

            return ApiResponse::unauthorized('الحساب معطل. يرجى التواصل مع مسؤول النظام.');
        }

        // إصدار رمز وصول Bearer Token عبر Sanctum
        $tokenName = 'auth_token_' . $user->username . '_' . now()->timestamp;
        $tokenResult = $user->createToken($tokenName);
        $plainTextToken = $tokenResult->plainTextToken;
        $accessToken = $tokenResult->accessToken;

        // تسجيل الجلسة الوظيفية في جدول sessions وحفظ بصمة التجزئة لرمز Sanctum
        $tokenHash = hash('sha256', (string) $accessToken->id);

        // إغلاق أي جلسات نشطة سابقة للمستخدم لضمان جلسة واحدة نشطة
        Session::where('user_id', $user->user_id)
            ->where('active', true)
            ->update([
                'active'   => false,
                'ended_at' => now(),
            ]);

        // إنشاء سجل الجلسة الوظيفية الجديدة
        $session = Session::create([
            'user_id'       => $user->user_id,
            'session_token' => $tokenHash,
            'started_at'    => now(),
            'ended_at'      => null,
            'active'        => true,
        ]);

        // تسجيل عملية الدخول الناجحة في سجل التدقيق
        $this->auditLogger->log(
            action: 'auth.login_success',
            targetType: 'User',
            targetId: $user->user_id,
            oldValues: null,
            newValues: ['session_id' => $session->session_id],
            userId: $user->user_id,
            schoolId: $user->school_id,
            descriptionAr: "تسجيل دخول ناجح للمستخدم ({$user->full_name}) إلى المنصة"
        );

        $responseData = [
            'token'     => $plainTextToken,
            'tokenType' => 'Bearer',
            'sessionId' => $session->session_id,
            'user'      => (new UserResource($user))->resolve($request),
        ];

        return ApiResponse::success(
            data: $responseData,
            message: 'تم تسجيل الدخول بنجاح.',
            status: 200
        );
    }

    /**
     * تسجيل الخروج، إلغاء رمز الوصول، وإغلاق الجلسة الوظيفية.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            $this->auditLogger->log(
                action: 'auth.logout',
                targetType: 'User',
                targetId: $user->user_id,
                oldValues: null,
                newValues: null,
                userId: $user->user_id,
                schoolId: $user->school_id
            );

            $currentToken = $user->currentAccessToken();

            if ($currentToken) {
                $tokenHash = hash('sha256', (string) $currentToken->id);

                // إغلاق الجلسة الوظيفية المقابلة في جدول sessions
                Session::where('user_id', $user->user_id)
                    ->where('session_token', $tokenHash)
                    ->where('active', true)
                    ->update([
                        'active'   => false,
                        'ended_at' => now(),
                    ]);

                // إلغاء رمز Sanctum الحالي
                $currentToken->delete();
            } else {
                // إغلاق أي جلسة نشطة للمستخدم
                Session::where('user_id', $user->user_id)
                    ->where('active', true)
                    ->update([
                        'active'   => false,
                        'ended_at' => now(),
                    ]);
            }

            // تفريغ المستخدم من حارس المصادقة لضمان عدم بقائه في الذاكرة
            if (auth()->guard('sanctum') && method_exists(auth()->guard('sanctum'), 'forgetUser')) {
                auth()->guard('sanctum')->forgetUser();
            }
        }

        return ApiResponse::success(
            data: null,
            message: 'تم تسجيل الخروج بنجاح.'
        );
    }

    /**
     * تغيير كلمة المرور للمستخدم المسجل وإبطال الجلسات الأخرى (FR-GEN-01).
     *
     * @param ChangePasswordRequest $request
     * @return JsonResponse
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        // التحقق من صحة كلمة المرور الحالية
        if (!Hash::check($request->current_password, $user->password_hash)) {
            return ApiResponse::validationError([
                'current_password' => ['كلمة المرور الحالية غير صحيحة.'],
            ], 'كلمة المرور الحالية غير صحيحة.');
        }

        // تحديث كلمة المرور
        $user->password_hash = Hash::make($request->new_password);
        $user->save();

        // إبطال جميع التوكنات الأخرى مع الإبقاء على التوكن الحالي
        $currentTokenId = $user->currentAccessToken()?->id;
        if ($currentTokenId) {
            $user->tokens()->where('id', '!=', $currentTokenId)->delete();

            // إغلاق الجلسات الوظيفية الأخرى في جدول sessions
            $currentTokenHash = hash('sha256', (string) $currentTokenId);
            Session::where('user_id', $user->user_id)
                ->where('session_token', '!=', $currentTokenHash)
                ->where('active', true)
                ->update([
                    'active'   => false,
                    'ended_at' => now(),
                ]);
        }

        // تسجيل العملية في سجل التدقيق (بدون بيانات حساسة)
        $this->auditLogger->log(
            action: 'auth.password_changed',
            targetType: 'User',
            targetId: $user->user_id,
            oldValues: null,
            newValues: ['revoked_other_sessions' => true],
            userId: $user->user_id,
            schoolId: $user->school_id
        );

        return ApiResponse::success(
            data: null,
            message: 'تم تغيير كلمة المرور بنجاح وإلغاء الجلسات الأخرى.'
        );
    }

    /**
     * استرجاع الملف الشخصي للمستخدم المصادق وأدواره وصلاحياته.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return ApiResponse::success(
            data: (new UserResource($user))->resolve($request),
            message: null
        );
    }

    /**
     * تحديث البيانات الشخصية للمستخدم المصادق.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return ApiResponse::unauthorized();
        }

        $validated = $request->validate([
            'fullName' => 'required|string|min:3|max:150',
            'email'    => 'nullable|email|max:150',
        ], [
            'fullName.required' => 'الاسم الكامل مطلوب.',
            'fullName.min'      => 'يجب ألا يقل الاسم عن 3 أحرف.',
            'fullName.max'      => 'يجب ألا يزيد الاسم عن 150 حرفاً.',
            'email.email'       => 'صيغة البريد الإلكتروني غير صالحة.',
        ]);

        $user->full_name = $validated['fullName'];
        if (array_key_exists('email', $validated) && !empty($validated['email'])) {
            $user->email = $validated['email'];
        }
        $user->save();

        return ApiResponse::success(
            data: (new UserResource($user))->resolve($request),
            message: 'تم تحديث البيانات الشخصية بنجاح.'
        );
    }
}
