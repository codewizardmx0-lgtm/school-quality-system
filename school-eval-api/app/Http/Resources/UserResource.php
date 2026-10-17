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

        return [
            'userId'      => $this->user_id,
            'schoolId'    => $this->school_id,
            'ministryId'  => $this->ministry_id,
            'username'    => $this->username,
            'fullName'    => $this->full_name,
            'email'       => $this->email,
            'userType'    => $this->user_type,
            'status'      => $this->status,
            'school'      => $this->school ? [
                'schoolId'   => $this->school->school_id,
                'schoolName' => $this->school->school_name,
                'status'     => $this->school->status,
            ] : null,
            'ministry'    => $this->ministry ? [
                'ministryId'   => $this->ministry->ministry_id,
                'ministryName' => $this->ministry->ministry_name,
            ] : null,
            'roles'       => $activeRoles->map(function ($role) {
                return [
                    'roleId'      => $role->role_id,
                    'roleName'    => $role->role_name,
                    'description' => $role->description,
                ];
            })->values()->all(),
            'permissions' => $permissions,
            'createdAt'   => $this->created_at?->toIso8601ZuluString(),
            'updatedAt'   => $this->updated_at?->toIso8601ZuluString(),
        ];
    }
}
