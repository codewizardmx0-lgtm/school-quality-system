<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * مورد تحويل التقييم الذاتي مع نتائجه وشواهده إلى JSON بنمط camelCase.
 */
class EvaluationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'evaluationId' => $this->evaluation_id,
            'cycleId'      => $this->cycle_id,
            'schoolId'     => $this->school_id,
            'status'       => $this->status,
            'createdAt'    => $this->created_at?->toIso8601ZuluString(),
            'school'       => $this->school ? [
                'schoolId'            => $this->school->school_id,
                'schoolName'          => $this->school->school_name,
                'educationalStage'    => $this->school->educational_stage,
                'educationalDistrict' => $this->school->educational_district,
                'governorate'         => $this->school->governorate,
            ] : null,
            'cycle'        => $this->cycle ? [
                'cycleId'      => $this->cycle->cycle_id,
                'academicYear' => $this->cycle->academic_year,
                'status'       => $this->cycle->status,
            ] : null,
            'creator'      => $this->creator ? [
                'userId'   => $this->creator->user_id,
                'fullName' => $this->creator->full_name,
                'username' => $this->creator->username,
            ] : null,
            'resultsCount' => $this->results()->count(),
            'results'      => $this->results ? $this->results->map(function ($res) {
                return [
                    'resultId'         => $res->result_id,
                    'indicatorId'      => $res->indicator_id,
                    'indicatorCode'    => $res->indicator?->code,
                    'indicatorName'    => $res->indicator?->name,
                    'score'            => $res->score,
                    'descriptorLabel'  => $res->scoreDescriptor?->label,
                    'textualResult'    => $res->textual_result,
                    'completionStatus' => $res->completion_status,
                    'evidences'        => $res->evidences ? $res->evidences->map(function ($ev) {
                        return [
                            'evidenceId'  => $ev->evidence_id,
                            'title'       => $ev->title,
                            'description' => $ev->description,
                        ];
                    }) : [],
                ];
            }) : [],
        ];
    }
}
