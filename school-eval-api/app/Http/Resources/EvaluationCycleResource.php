<?php

namespace App\Http\Resources;

use App\Models\Evaluation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * مورد تحويل دورة التقييم إلى كائن JSON بنمط camelCase المعتمد.
 */
class EvaluationCycleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $schoolId = $user?->school_id;

        $isEnrolled = false;
        $evaluation = null;
        $canStart = false;

        if ($schoolId) {
            $isEnrolled = $this->participations()->where('school_id', $schoolId)->exists();
            $evaluation = Evaluation::where('cycle_id', $this->cycle_id)->where('school_id', $schoolId)->first();
            $today = now()->toDateString();
            $isDateValid = $today >= $this->start_date->toDateString() && $today <= $this->end_date->toDateString();
            $canStart = $isEnrolled && !$evaluation && $this->status === 'Active' && $isDateValid && $user->hasPermission('evaluations.create');
        }

        return [
            'cycleId'             => $this->cycle_id,
            'name'                => $this->name ?? "الدورة التقييمية {$this->academic_year}",
            'academicYear'        => $this->academic_year,
            'versionId'           => $this->version_id,
            'startDate'           => $this->start_date?->format('Y-m-d'),
            'endDate'             => $this->end_date?->format('Y-m-d'),
            'status'              => $this->status,
            'createdAt'           => $this->created_at?->toIso8601ZuluString(),
            'updatedAt'           => $this->updated_at?->toIso8601ZuluString(),
            'version'             => $this->version ? [
                'versionId'     => $this->version->version_id,
                'versionName'   => $this->version->version_name,
                'versionNumber' => $this->version->version_number,
                'status'        => $this->version->status,
            ] : null,
            'participationsCount' => $this->participations()->count(),
            'evaluationsCount'    => $this->evaluations()->count(),
            'participatingSchools'=> $this->when(
                $user && ($user->hasRole('ministry_supervisor') || $user->hasRole('admin') || $user->hasPermission('cycles.manage')),
                fn () => $this->schools->map(fn ($s) => [
                    'schoolId'   => $s->school_id,
                    'schoolName' => $s->school_name,
                    'stage'      => $s->educational_stage,
                    'district'   => $s->educational_district,
                ])
            ),
            'schoolContext'       => $schoolId ? [
                'isEnrolled'         => $isEnrolled,
                'evaluationId'       => $evaluation?->evaluation_id,
                'evaluationStatus'   => $evaluation?->status,
                'canStartEvaluation' => $canStart,
            ] : null,
        ];
    }
}
