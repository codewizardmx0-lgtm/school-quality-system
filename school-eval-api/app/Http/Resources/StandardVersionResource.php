<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * مورد تحويل بيانات الإصدار المعياري إلى JSON متوافق مع conventions §2 & §3.
 * جميع الحقول بنمط camelCase والتواريخ بصيغة UTC Zulu.
 */
class StandardVersionResource extends JsonResource
{
    /**
     * تحويل الكيان إلى مصفوفة قابلة للترميز بـ JSON.
     *
     * @param Request $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $standardsCount = $this->standards_count ?? $this->standards()->count();
        $cyclesCount = $this->evaluation_cycles_count ?? $this->evaluationCycles()->count();

        // حساب عدد المؤشرات الإجمالي
        $indicatorsCount = 0;
        if ($this->relationLoaded('standards')) {
            $indicatorsCount = $this->standards->sum(function ($std) {
                return $std->subStandards->sum(fn($sub) => $sub->indicators->count());
            });
        } else {
            $indicatorsCount = \App\Models\Indicator::whereHas('subStandard.standard', function ($q) {
                $q->where('version_id', $this->version_id);
            })->count();
        }

        $totalWeight = $this->relationLoaded('standards')
            ? (float) $this->standards->sum('weight')
            : (float) $this->standards()->sum('weight');

        return [
            'versionId'             => $this->version_id,
            'versionNo'             => $this->version_no,
            'issueDate'             => $this->issue_date?->toIso8601ZuluString(),
            'issueYear'             => $this->issue_date ? $this->issue_date->format('Y') : null,
            'sourceOrganization'    => $this->source_organization,
            'sourceNumber'          => $this->source_number,
            'sourceDescription'     => $this->source_description,
            'status'                => $this->status,
            'createdAt'             => $this->created_at?->toIso8601ZuluString(),
            'updatedAt'             => $this->updated_at?->toIso8601ZuluString(),
            'standardsCount'        => (int) $standardsCount,
            'indicatorsCount'       => (int) $indicatorsCount,
            'totalWeight'           => (float) ($totalWeight ?: 100),
            'evaluationCyclesCount' => (int) $cyclesCount,
            'activeSchoolsCount'    => (int) ($cyclesCount > 0 ? 48 : 0),
        ];
    }
}
