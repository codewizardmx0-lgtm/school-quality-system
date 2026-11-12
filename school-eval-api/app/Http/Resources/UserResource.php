<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * مورد تحويل بيانات المستخدم إلى JSON متوافق مع conventions §2 & §3.
 *
 * الحقول بأسلوب camelCase، والتواريخ بصيغة UTC المنتهية بـ Z.
 */
class UserResource extends JsonResource
{
    /**
     * تحويل الكيان إلى مصفوفة قابلة للترميز بـ JSON.
     *
     * @param Request $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $activeRoles = $this->activeRoles ?? $this->roles()->wherePivot('active', true)->get();
        $permissions = $this->getPermissionCodes();

        $firstRole = $activeRoles->first();
        $roleResource = $firstRole ? (new RoleResource($firstRole))->toArray($request) : null;

        return [
            'userId'      => $this->user_id,
            'schoolId'    => $this->school_id,
            'ministryId'  => $this->ministry_id,
            'username'    => $this->username,
            'fullName'    => $this->full_name,
            'email'       => $this->email,
            'userType'    => $this->user_type,
            'status'      => $this->status,
            'roleId'      => $firstRole?->role_id,
            'roleName'    => $firstRole?->role_name,
            'roleNameAr'  => $roleResource['roleNameAr'] ?? null,
            'roleCode'    => $roleResource['roleCode'] ?? null,
            'school'      => $this->school ? [
                'schoolId'   => $this->school->school_id,
                'schoolName' => $this->school->school_name,
                'schoolCode' => $this->school->school_code,
                'status'     => $this->school->status,
            ] : null,
            'ministry'    => $this->ministry ? [
                'ministryId'   => $this->ministry->ministry_id,
                'ministryName' => $this->ministry->ministry_name,
            ] : null,
            'roles'       => $activeRoles->map(function ($role) use ($request) {
                return (new RoleResource($role))->toArray($request);
            })->values()->all(),
            'permissions' => $permissions,
            'createdAt'   => $this->created_at?->toIso8601ZuluString(),
            'updatedAt'   => $this->updated_at?->toIso8601ZuluString(),
        ];
    }
}
