<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * مورد تحويل الأدوار إلى JSON مع دعم الاسم المعرب (roleNameAr).
 */
class RoleResource extends JsonResource
{
    /**
     * @param Request $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $arabicNameMap = [
            'admin'                       => 'مدير النظام المركزي',
            'school_evaluator'            => 'مقيم المدرسة',
            'school_principal'            => 'مدير المدرسة',
            'ministry_standards_manager'  => 'مسؤول إدارة المعايير',
            'ministry_supervisor'         => 'مشرف وزاري معتمد',
        ];

        $codeMap = [
            'admin'                       => 'SYS',
            'school_evaluator'            => 'S1',
            'school_principal'            => 'P1',
            'ministry_standards_manager'  => 'M2',
            'ministry_supervisor'         => 'A3',
        ];

        return [
            'roleId'      => $this->role_id,
            'roleName'    => $this->role_name,
            'roleNameAr'  => $arabicNameMap[$this->role_name] ?? $this->role_name,
            'roleCode'    => $codeMap[$this->role_name] ?? ('R-' . $this->role_id),
            'description' => $this->description ?? '',
        ];
    }
}
