<?php

namespace App\Http\Controllers\Api\V1\Concerns;

use App\Http\Responses\ApiResponse;
use App\Models\School;
use App\Models\User;
use Illuminate\Http\JsonResponse;

/**
 * سمة مشتركة لضبط والتحقق من النطاق الجغرافي للمشرف الوزاري (FR-SUP-02 & NFR-SEC-03).
 */
trait ResolvesSupervisorScope
{
    /**
     * استخراج المحافظة المسندة للمشرف الوزاري، أو null للمشرف المركزي العام.
     */
    protected function getSupervisorGovernorate(?User $user): ?string
    {
        if (!$user || empty($user->governorate)) {
            return null;
        }

        $isSupervisor = $user->hasRole('ministry_supervisor')
            || $user->roles()
                ->where('roles.role_name', 'ministry_supervisor')
                ->where('user_roles.active', true)
                ->exists();

        return $isSupervisor ? $user->governorate : null;
    }

    /**
     * التحقق من أن المدرسة تقع ضمن النطاق الجغرافي للمشرف الوزاري.
     */
    protected function ensureSchoolInSupervisorScope(?User $user, ?School $school): ?JsonResponse
    {
        if ($user && $user->hasRole('ministry_supervisor') && !empty($user->governorate)) {
            $schoolGov = $school?->governorate;
            if ($schoolGov && $schoolGov !== $user->governorate) {
                return ApiResponse::forbidden(
                    'غير مصرح: المدرسة تقع خارج النطاق الجغرافي المسند إليك (' . $user->governorate . ').'
                );
            }
        }

        return null;
    }
}
