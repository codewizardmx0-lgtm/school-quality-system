<?php

namespace App\Http\Middleware;

use App\Http\Responses\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * وسيط التحقق من الصلاحيات الوظيفية الصارمة (RBAC Permission Gate).
 *
 * الاستخدام في المسارات:
 * ->middleware('permission:evaluations.view')
 * ->middleware('permission:evaluations.view,evaluations.create') // أو أي منهما
 */
class CheckPermission
{
    /**
     * معالجة الطلب والتأكد من امتلاك المستخدم للصلاحية المطلوبة.
     *
     * @param Request $request
     * @param Closure(Request): Response $next
     * @param string ...$permissions
     * @return Response
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (!$user) {
            return ApiResponse::unauthorized();
        }

        // التحقق من حالة تفعيل حساب المستخدم (status = Active)
        if ($user->status !== 'Active') {
            return ApiResponse::unauthorized('الحساب معطل.');
        }

        // إذا طُلبت صلاحيات، نتحقق من امتلاك المستخدم لواحدة منها على الأقل
        if (!empty($permissions)) {
            $hasAnyPermission = false;
            foreach ($permissions as $permission) {
                if ($user->hasPermission($permission)) {
                    $hasAnyPermission = true;
                    break;
                }
            }

            if (!$hasAnyPermission) {
                return ApiResponse::forbidden('غير مصرح');
            }
        }

        return $next($request);
    }
}
