<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * مورد تحويل المدرسة إلى JSON بأسلوب camelCase (conventions §2).
 */
class SchoolResource extends JsonResource
{
    /**
     * تحويل الكيان إلى مصفوفة قابلة للترميز بـ JSON.
     *
     * @param Request $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'schoolId'            => $this->school_id,
            'schoolName'          => $this->school_name,
            'educationalStage'    => $this->educational_stage,
            'identificationData'  => $this->identification_data,
            'educationalDistrict' => $this->educational_district,
            'governorate'         => $this->governorate,
            'status'              => $this->status,
            'address'             => $this->address,
            'phone'               => $this->phone,
            'email'               => $this->email,
            'educationalAdmin'    => $this->educational_admin,
            'buildingType'        => $this->building_type,
            'shiftType'           => $this->shift_type,
            'totalArea'           => $this->total_area !== null ? (float) $this->total_area : null,
            'builtUpArea'         => $this->built_up_area !== null ? (float) $this->built_up_area : null,
        ];
    }
}
