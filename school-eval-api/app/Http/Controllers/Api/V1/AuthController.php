<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Http\Responses\ApiResponse;
use App\Models\Session;
use App\Models\User;
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
 */
class AuthController extends Controller
{
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
            return ApiResponse::unauthorized('بيانات الاعتماد غير صحيحة.');
        }

        // فحص حالة الحساب (BR-GEN: لا وصول للحساب المعطل)
        if ($user->status !== 'Active') {
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
}
