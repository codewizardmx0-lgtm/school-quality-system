<?php

namespace App\Http\Middleware;

use App\Http\Responses\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * وسيط التحقق من الدور الوظيفي للمستخدم (RBAC Role Gate).
 *
 * الاستخدام في المسارات:
 * ->middleware('role:school_principal')
 * ->middleware('role:school_principal,school_evaluator')
 */
class CheckRole
{
    /**
     * معالجة الطلب والتأكد من امتلاك المستخدم للدور المطلوب.
     *
     * @param Request $request
     * @param Closure(Request): Response $next
     * @param string ...$roles
     * @return Response
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return ApiResponse::unauthorized();
        }

        if ($user->status !== 'Active') {
            return ApiResponse::unauthorized('الحساب معطل.');
        }

        if (!empty($roles)) {
            $hasAnyRole = false;
            foreach ($roles as $role) {
                if ($user->hasRole($role)) {
                    $hasAnyRole = true;
                    break;
                }
            }

            if (!$hasAnyRole) {
                return ApiResponse::forbidden('غير مصرح');
            }
        }

        return $next($request);
    }
}
