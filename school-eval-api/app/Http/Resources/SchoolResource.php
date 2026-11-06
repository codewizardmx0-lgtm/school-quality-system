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
        $principal = $this->relationLoaded('principal')
            ? $this->principal
            : $this->users()->whereHas('roles', fn ($q) => $q->where('role_name', 'school_principal'))->first();

        $evaluators = $this->relationLoaded('evaluators')
            ? $this->evaluators
            : $this->users()->whereHas('roles', fn ($q) => $q->where('role_name', 'school_evaluator'))->get();

        $firstEvaluator = $evaluators->first();

        return [
            'schoolId'            => $this->school_id,
            'schoolName'          => $this->school_name,
            'schoolCode'          => $this->identification_data ?? ('SCH-' . $this->school_id),
            'schoolType'          => $this->school_type ?? 'government',
            'educationalStage'    => $this->educational_stage,
            'identificationData'  => $this->identification_data,
            'educationalDistrict' => $this->educational_district,
            'directorate'         => $this->directorateModel?->name_ar ?? $this->educational_district,
            'governorate'         => $this->governorateModel?->name_ar ?? $this->governorate,
            'governorateId'       => $this->governorate_id,
            'directorateId'       => $this->directorate_id,
            'status'              => $this->status,
            'address'             => $this->address,
            'phone'               => $this->phone,
            'email'               => $this->email,
            'educationalAdmin'    => $this->educational_admin,
            'buildingType'        => $this->building_type,
            'shiftType'           => $this->shift_type,
            'totalArea'           => $this->total_area !== null ? (float) $this->total_area : null,
            'builtUpArea'         => $this->built_up_area !== null ? (float) $this->built_up_area : null,
            // Principal Details
            'principal'           => $principal ? [
                'userId'   => $principal->user_id,
                'fullName' => $principal->full_name,
                'email'    => $principal->email,
                'phone'    => $principal->phone ?? null,
            ] : null,
            // Evaluators List
            'evaluators'          => $evaluators->map(fn ($ev) => [
                'userId'   => $ev->user_id,
                'fullName' => $ev->full_name,
                'email'    => $ev->email,
                'phone'    => $ev->phone ?? null,
            ])->values()->all(),
            // Backward-compatible evaluator fields
            'evaluatorUserId'     => $firstEvaluator?->user_id,
            'evaluatorName'       => $firstEvaluator?->full_name,
            'evaluatorEmail'      => $firstEvaluator?->email,
            'isLinked'            => (bool) ($firstEvaluator !== null || $principal !== null),
        ];
    }
}
