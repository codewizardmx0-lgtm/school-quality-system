<?php

namespace App\Http\Middleware;

use App\Http\Responses\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class CheckMaintenanceMode
{
    /**
     * التحقق من حالة وضع الصيانة للنظام وحظر غير الإداريين مع استثناء الدخول والخروج.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // استثناء مسارات تسجيل الدخول والخروج
        $route = $request->route();
        $routeName = $route ? $route->getName() : '';
        if (in_array($routeName, ['api.v1.auth.login', 'api.v1.auth.logout'], true)) {
            return $next($request);
        }

        $settings = Cache::get('admin_system_settings');
        $isMaintenance = $settings['maintenanceMode']['isEnabled'] ?? false;

        if ($isMaintenance) {
            $user = $request->user();

            // إذا كان المستخدم مصادقاً ويحمل دور مسؤول نظام مركزي (admin)، يُسمح له بالمرور
            if ($user && ($user->hasRole('admin') || $user->hasPermission('users.manage'))) {
                return $next($request);
            }

            // حظر بقية الأدوار والمستخدمين غير الإداريين برمز 503 ورسالة صريحة
            return ApiResponse::error(
                message: 'منصة ارتقاء للتقييم الذاتي والتحسين المدرسي في وضع الصيانة المجدولة حالياً لتحديث الخدمات. يرجى المحاولة لاحقاً.',
                status: 503,
                errors: [
                    'maintenance' => true,
                    'scheduledAt' => $settings['maintenanceMode']['scheduledAt'] ?? null,
                    'reason'      => $settings['maintenanceMode']['reason'] ?? 'أعمال صيانة وتحديث مجدولة',
                ]
            );
        }

        return $next($request);
    }
}
