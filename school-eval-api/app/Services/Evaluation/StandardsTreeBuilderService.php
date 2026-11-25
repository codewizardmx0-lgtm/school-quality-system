<?php

namespace App\Services\Evaluation;

use App\Models\Evaluation;
use App\Models\EvaluationResult;
use App\Models\StandardVersion;

class StandardsTreeBuilderService
{
    /**
     * Build the full standards tree payload and progress metadata for an evaluation.
     *
     * @return array{data: array<string, mixed>, meta: array<string, mixed>}|null
     */
    public function buildForEvaluation(Evaluation $evaluation): ?array
    {
        $versionId = $evaluation->cycle?->version_id;
        $version = StandardVersion::with([
            'standards' => function ($q) {
                $q->orderBy('standard_id', 'asc');
            },
            'standards.subStandards' => function ($q) {
                $q->orderBy('sub_standard_id', 'asc');
            },
            'standards.subStandards.indicators' => function ($q) {
                $q->orderBy('indicator_id', 'asc');
            },
            'standards.subStandards.indicators.scoreDescriptors' => function ($q) {
                $q->orderBy('display_order', 'asc');
            },
            'standards.subStandards.indicators.scoreDescriptors.scoreLevel',
            'standards.subStandards.indicators.verificationTools',
            'standards.subStandards.indicators.evidenceRequirements' => function ($q) {
                $q->orderBy('display_order', 'asc');
            },
        ])->find($versionId);

        if (!$version) {
            return null;
        }

        // جلب نتائج التقييم المسجلة لهذه المدرسة ومفهرسة برقم المؤشر
        $existingResults = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
            ->with([
                'scoreDescriptor',
                'evidenceLinks',
                'verificationTools',
                'notes' => function ($q) {
                    $q->orderBy('note_id', 'desc')->with('author');
                },
            ])
            ->get()
            ->keyBy('indicator_id');

        $totalActiveIndicators = 0;
        $completedResultsCount = 0;

        $standardsData = $version->standards->map(function ($std) use ($existingResults, &$totalActiveIndicators, &$completedResultsCount) {
            return [
                'standardId'   => $std->standard_id,
                'code'         => $std->code,
                'name'         => $std->name,
                'description'  => $std->description,
                'weight'       => (float) $std->weight,
                'subStandards' => $std->subStandards->map(function ($sub) use ($std, $existingResults, &$totalActiveIndicators, &$completedResultsCount) {
                    return [
                        'subStandardId' => $sub->sub_standard_id,
                        'code'          => $sub->code,
                        'name'          => $sub->name,
                        'description'   => $sub->description,
                        'weight'        => (float) ($sub->weight ?? 0.0),
                        'indicators'    => $sub->indicators->map(function ($ind) use ($std, $sub, $existingResults, &$totalActiveIndicators, &$completedResultsCount) {
                            $isActive = $ind->status === 'Active';
                            if ($isActive) {
                                $totalActiveIndicators++;
                            }

                            $result = $existingResults->get($ind->indicator_id);
                            if ($result && $result->completion_status === 'Completed') {
                                $completedResultsCount++;
                            }

                            $notes = $result ? $result->notes->take(5)->map(function ($n) {
                                return [
                                    'noteId'       => $n->note_id,
                                    'text'         => $n->text,
                                    'authorUserId' => $n->author_user_id,
                                    'authorName'   => $n->author?->full_name ?? '',
                                    'createdAt'    => $n->created_at?->toIso8601ZuluString(),
                                ];
                            })->values()->all() : [];

                            return [
                                'indicatorId'            => $ind->indicator_id,
                                'code'                   => $ind->code,
                                'name'                   => $ind->name,
                                'description'            => $ind->description,
                                'standardName'           => $std->name,
                                'standardDescription'    => $std->description,
                                'subStandardName'        => $sub->name,
                                'subStandardDescription' => $sub->description,
                                'weight'                 => (float) $ind->weight,
                                'subStandardWeight'      => (float) ($sub->weight ?? 0.0),
                                'status'                 => $ind->status,
                                'resultId'               => $result?->result_id,
                                'score'                  => ($result && $result->completion_status === 'Completed') ? $result->score : null,
                                'scoreDescriptorId'      => ($result && $result->completion_status === 'Completed') ? $result->score_descriptor_id : null,
                                'scoreDescriptorLabel'   => ($result && $result->completion_status === 'Completed') ? $result->scoreDescriptor?->label : null,
                                'completionStatus'       => $result?->completion_status,
                                'textualResult'          => $result?->textual_result,
                                'evidenceCount'          => $result ? $result->evidenceLinks->count() : 0,
                                'notesCount'             => $result ? $result->notes->count() : 0,
                                'notes'                  => $notes,
                                'verificationToolIds'    => $result ? $result->verificationTools->pluck('tool_id')->all() : [],
                                'verificationTools'      => $ind->verificationTools->map(function ($tool) {
                                    return [
                                        'toolId'        => $tool->tool_id,
                                        'name'          => $tool->name,
                                        'toolType'      => $tool->tool_type,
                                        'required'      => (bool) $tool->pivot?->required,
                                        'usageGuidance' => $tool->pivot?->usage_guidance,
                                    ];
                                })->values(),
                                'evidenceRequirements'   => $ind->evidenceRequirements->map(function ($req) {
                                    return [
                                        'requirementId' => $req->requirement_id,
                                        'title'         => $req->title,
                                        'description'   => $req->description,
                                        'required'      => (bool) $req->required,
                                        'displayOrder'  => $req->display_order,
                                    ];
                                })->values(),
                                'scoreDescriptors'       => $ind->scoreDescriptors->map(function ($desc) {
                                    return [
                                        'descriptorId' => $desc->descriptor_id,
                                        'scoreLevelId' => $desc->score_level_id,
                                        'scoreValue'   => $desc->scoreLevel?->score_value,
                                        'label'        => $desc->label,
                                        'description'  => $desc->description,
                                        'displayOrder' => $desc->display_order,
                                    ];
                                }),
                            ];
                        }),
                    ];
                }),
            ];
        });

        $completionPercentage = $totalActiveIndicators > 0
            ? round(($completedResultsCount / $totalActiveIndicators) * 100, 2)
            : 0.0;

        return [
            'data' => [
                'evaluationId' => $evaluation->evaluation_id,
                'schoolId'     => $evaluation->school_id,
                'schoolName'   => $evaluation->school?->school_name,
                'cycleId'      => $evaluation->cycle_id,
                'academicYear' => $evaluation->cycle?->academic_year,
                'versionId'    => $version->version_id,
                'versionName'  => $version->version_name,
                'versionNo'    => $version->version_no,
                'approvalCode' => $version->source_number ?? 'DEC-2026-QA-01',
                'approvedAt'   => $version->updated_at?->toIso8601ZuluString() ?? now()->toIso8601ZuluString(),
                'effectiveFrom'=> $version->issue_date?->toDateString() ?? '2026-01-01',
                'integrityHash'=> hash('sha256', "VERSION_{$version->version_id}_{$version->version_no}_{$version->status}"),
                'standards'    => $standardsData,
            ],
            'meta' => [
                'totalActiveIndicators' => $totalActiveIndicators,
                'completedResults'      => $completedResultsCount,
                'completionPercentage'  => $completionPercentage,
            ],
        ];
    }
}
