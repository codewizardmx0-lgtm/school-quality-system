<?php

namespace App\Http\Middleware;

use App\Http\Responses\ApiResponse;
use App\Models\Session;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * وسيط تتبع النشاط وفرض الخمول على الجلسات الوظيفية (FR-GEN-02 والقرار 14).
 *
 * القواعد:
 * 1. فحص رمز الجلسة الوظيفية المرتبطة بالمستخدم عبر جدول `sessions`.
 * 2. إذا تجاوزت المدة منذ آخر نشاط (updated_at) 30 دقيقة خمول:
 *    - إنهاء الجلسة الوظيفية (ended_at = now(), active = false).
 *    - إلغاء رمز الوصول الحالي للمستخدم عبر Sanctum ($user->currentAccessToken()->delete()).
 *    - إرجاع خطأ 401: «انتهت الجلسة لعدم النشاط. يجب تسجيل الدخول للمتابعة.».
 * 3. في حال استمرار النشاط ضمن 30 دقيقة:
 *    - تحديث طابع آخر نشاط للجلسة الوظيفية ($session->touch() أو updated_at = now()).
 */
class EnforceSessionTimeout
{
    /**
     * المهلة الزمنية للخمول بالدقائق (30 دقيقة وفق FR-GEN-02).
     */
    public const TIMEOUT_MINUTES = 30;

    /**
     * معالجة الطلب الوارد.
     *
     * @param Request $request
     * @param Closure(Request): Response $next
     * @return Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return $next($request);
        }

        $currentToken = $user->currentAccessToken();

        if ($currentToken) {
            $tokenHash = hash('sha256', (string) $currentToken->id);

            // البحث عن الجلسة الوظيفية النشطة المطابقة لرمز التوكن الحالي
            $session = Session::where('user_id', $user->user_id)
                ->where('session_token', $tokenHash)
                ->where('active', true)
                ->first();

            // في حال عدم العثور عليها بالرمز، ابحث عن آخر جلسة نشطة للمستخدم
            if (!$session) {
                $session = Session::where('user_id', $user->user_id)
                    ->where('active', true)
                    ->latest('updated_at')
                    ->first();
            }

            if ($session) {
                $lastActivity = $session->updated_at ?? $session->started_at;
                $isExpired = $lastActivity->copy()->addMinutes(self::TIMEOUT_MINUTES)->isPast();

                if ($isExpired) {
                    // إلغاء الجلسة الوظيفية وإلغاء رمز Sanctum
                    $session->update([
                        'active'   => false,
                        'ended_at' => now(),
                    ]);

                    $currentToken->delete();

                    if (auth()->guard('sanctum') && method_exists(auth()->guard('sanctum'), 'forgetUser')) {
                        auth()->guard('sanctum')->forgetUser();
                    }

                    return ApiResponse::unauthorized('انتهت الجلسة لعدم النشاط. يجب تسجيل الدخول للمتابعة.');
                }

                // تحديث طابع آخر نشاط للجلسة
                $session->touch();
            }
        }

        return $next($request);
    }
}
