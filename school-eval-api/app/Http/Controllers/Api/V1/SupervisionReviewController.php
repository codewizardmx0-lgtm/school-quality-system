<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesSupervisorScope;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\AuditLog;
use App\Models\CompletionRequest;
use App\Models\CompletionRequestItem;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\EvaluationSubmission;
use App\Models\EvidenceLink;
use App\Models\ImprovementPlan;
use App\Models\Indicator;
use App\Models\School;
use App\Models\SchoolDocument;
use App\Models\Standard;
use App\Models\StandardVersion;
use App\Models\SupervisorNote;
use App\Models\SupervisionDeficiencyNote;
use App\Models\User;
use App\Services\EvidenceSufficiencyService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * متحكم المراجعة الإشرافية وفحص المخرجات ورصد النواقص وسجل المتابعة الميداني.
 */
class SupervisionReviewController extends Controller
{
    use ResolvesSupervisorScope;

    /**
     * 3.1. قائمة المخرجات المتاحة للمراجعة الإشرافية في النطاق الجغرافي (الدخول المباشر)
     * GET /api/v1/evaluation-submissions/available-for-review
     */
    public function reviewableSubmissions(Request $request): JsonResponse
    {
        $supervisorGov = $this->getSupervisorGovernorate($request->user());
        $activeCycle = EvaluationCycle::where('status', 'Active')->latest('cycle_id')->first();

        $query = Evaluation::with(['school', 'cycle', 'reports.submissions' => fn ($q) => $q->orderBy('attempt_no', 'desc')])
            ->whereIn('status', ['Submitted', 'UnderReview', 'NeedsCompletion', 'Completed'])
            ->when($activeCycle, fn ($q) => $q->where('cycle_id', $activeCycle->cycle_id))
            ->when($supervisorGov, fn ($q) => $q->whereHas('school', fn ($sq) => $sq->where('governorate', $supervisorGov)));

        $items = $query->get()->map(function ($evaluation) {
            $submission = $evaluation->reports->flatMap->submissions->sortByDesc('attempt_no')->first();
            $status = $submission?->status ?? $evaluation->status;

            if (in_array($status, ['Draft', 'Drafting'])) {
                return null;
            }

            return [
                'evaluationId'     => $evaluation->evaluation_id,
                'submissionId'     => $submission?->submission_id ?? $evaluation->evaluation_id,
                'schoolId'         => $evaluation->school_id,
                'schoolName'       => $evaluation->school?->school_name ?? $evaluation->school?->name ?? 'مدرسة التقييم',
                'schoolCode'       => $evaluation->school?->school_code ?? "SCH-{$evaluation->school_id}",
                'governorate'      => $evaluation->school?->governorate ?? 'غير محدد',
                'directorate'      => $evaluation->school?->educational_district ?? $evaluation->school?->directorate ?? 'مركز المديرية',
                'educationalStage' => $evaluation->school?->educational_stage ?? 'التعليم العام',
                'status'           => $status,
                'statusArabic'     => match ($status) {
                    'NeedsCompletion' => 'يحتاج استكمال',
                    'Submitted'       => 'مرفوع جديد',
                    'UnderReview'     => 'قيد التدقيق الإشرافي',
                    'Completed'       => 'مكتمل المراجعة',
                    default           => 'مسودة',
                },
                'submittedAt' => $submission?->submitted_at?->toIso8601String() ?? $evaluation->updated_at->toIso8601String(),
                'attemptNo'   => $submission?->attempt_no ?? 1,
            ];
        })->filter()->sortBy(function ($item) {
            return match ($item['status']) {
                'Submitted'       => 1,
                'UnderReview'     => 2,
                'NeedsCompletion' => 3,
                'Completed'       => 4,
                default           => 5,
            };
        })->values();

        return ApiResponse::success($items, 'تم تحميل قائمة المخرجات المتاحة للمراجعة بنجاح.');
    }

    /**
     * 3. فحص وتدقيق مخرج التقييم المدرسي والـ 109 مؤشرات الحقيقية (Zero-Mock)
     * GET /api/v1/evaluation-submissions/{id}/review
     */
    public function reviewSubmission(int $id): JsonResponse
    {
        $submission = EvaluationSubmission::with([
            'report.evaluation.school',
            'report.evaluation.cycle.standardVersion',
            'completionRequests.items',
            'supervisorNotes',
        ])->find($id);

        $evaluation = $submission?->report?->evaluation;

        if (!$evaluation) {
            $evaluation = Evaluation::with([
                'school',
                'cycle.standardVersion',
                'reports.submissions.completionRequests.items',
            ])->find($id);

            $submission = $evaluation?->reports?->flatMap->submissions?->sortByDesc('attempt_no')->first();
        }

        if (!$evaluation) {
            $candidateSchool = School::find($id);
            if ($candidateSchool) {
                $evaluation = Evaluation::with([
                    'school',
                    'cycle.standardVersion',
                    'reports.submissions.completionRequests.items',
                ])->where('school_id', $candidateSchool->school_id)->latest('evaluation_id')->first();

                $submission = $evaluation?->reports?->flatMap->submissions?->sortByDesc('attempt_no')->first();
            }
        }

        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم أو مخرج المراجعة المطلوب غير موجود.');
        }

        $school = $evaluation->school;
        $cycle = $evaluation->cycle;

        if ($denied = $this->ensureSchoolInSupervisorScope(request()->user(), $school)) {
            return $denied;
        }

        $version = $cycle?->standardVersion
            ?? StandardVersion::where('status', 'Active')->first()
            ?? StandardVersion::where('status', 'Approved')->first()
            ?? StandardVersion::first();

        $results = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
            ->with(['scoreDescriptor', 'notes.author', 'evidenceLinks.documentVersion.document'])
            ->get()
            ->keyBy('indicator_id');

        $linksByIndicator = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
            ->with(['documentVersion.document'])
            ->get()
            ->groupBy('indicator_id');

        $openItems = CompletionRequestItem::whereHas('request', function ($q) use ($submission) {
            if ($submission) {
                $q->where('submission_id', $submission->submission_id)->where('status', 'Open');
            }
        })->get()->keyBy('indicator_id');

        $savedDeficiencies = SupervisionDeficiencyNote::where('evaluation_id', $evaluation->evaluation_id)
            ->get()
            ->keyBy('indicator_id');

        $openCompletionRequest = CompletionRequest::with('items.indicator')
            ->where(function ($q) use ($submission, $evaluation) {
                if ($submission) {
                    $q->where('submission_id', $submission->submission_id);
                } else {
                    $q->whereHas('submission.report', fn ($sq) => $sq->where('evaluation_id', $evaluation->evaluation_id));
                }
            })
            ->where('status', 'Open')
            ->latest('request_id')
            ->first();

        $openCompletionRequestData = null;
        if ($openCompletionRequest) {
            $deadline = $openCompletionRequest->completion_deadline;
            $daysRemaining = $deadline ? max(0, (int) now()->diffInDays(Carbon::parse($deadline), false)) : 0;
            $openCompletionRequestData = [
                'requestId'     => $openCompletionRequest->request_id,
                'notes'         => $openCompletionRequest->notes,
                'issuedAt'      => $openCompletionRequest->created_at->toIso8601String(),
                'deadline'      => $deadline ? Carbon::parse($deadline)->toDateString() : null,
                'daysRemaining' => $daysRemaining,
                'itemsCount'    => $openCompletionRequest->items->count(),
                'items'         => $openCompletionRequest->items->map(fn ($item) => [
                    'indicatorId'        => $item->indicator_id,
                    'code'               => $item->indicator?->code ?? '',
                    'title'              => $item->indicator?->name ?? $item->indicator?->title ?? 'مؤشر تقييمي',
                    'missingDescription' => $item->missing_description,
                ])->toArray(),
            ];
        }

        $standardsData = Standard::where('version_id', $version->version_id)
            ->with([
                'subStandards.indicators.scoreDescriptors.scoreLevel',
                'subStandards.indicators.evidenceRequirements',
                'subStandards.indicators.verificationTools',
            ])
            ->orderBy('code')
            ->get();

        $allFlatIndicators = [];
        $totalScored = 0;
        $totalWithEvidence = 0;

        $standardsTree = $standardsData->map(function ($std) use ($results, $linksByIndicator, $savedDeficiencies, $openItems, &$allFlatIndicators, &$totalScored, &$totalWithEvidence) {
            $allStdIndicators = $std->subStandards->flatMap(fn ($sub) => $sub->indicators);
            $indIds = $allStdIndicators->pluck('indicator_id');
            $stdResults = $results->whereIn('indicator_id', $indIds);
            $totalInds = max(1, $indIds->count());
            $scoredCount = $stdResults->whereNotNull('score')->count();
            $unenteredCount = max(0, $totalInds - $scoredCount);
            $l3 = $stdResults->where('score', 3)->count();
            $l2 = $stdResults->where('score', 2)->count();
            $l1 = $stdResults->where('score', 1)->count();
            $l0 = $stdResults->where('score', 0)->count();

            $stdTotalEvidences = 0;
            $stdTotalMandatory = 0;
            $stdTotalCovered = 0;

            $subStandardsList = $std->subStandards->map(function ($sub) use ($results, $linksByIndicator, $savedDeficiencies, $openItems, $std, &$stdTotalEvidences, &$stdTotalMandatory, &$stdTotalCovered, &$allFlatIndicators, &$totalScored, &$totalWithEvidence) {
                $indicatorsList = $sub->indicators->map(function ($ind) use ($results, $linksByIndicator, $savedDeficiencies, $openItems, $std, $sub, &$stdTotalEvidences, &$stdTotalMandatory, &$stdTotalCovered, &$allFlatIndicators, &$totalScored, &$totalWithEvidence) {
                    $res = $results->get($ind->indicator_id);
                    $hasScore = $res && $res->score !== null;
                    if ($hasScore) {
                        $totalScored++;
                    }

                    $indLinks = $linksByIndicator->get($ind->indicator_id, collect());
                    $evCount = $indLinks->count();
                    $stdTotalEvidences += $evCount;
                    if ($evCount > 0) {
                        $totalWithEvidence++;
                    }

                    $mandatoryReqs = $ind->evidenceRequirements->where('required', true);
                    $mandatoryCnt = $mandatoryReqs->count();
                    $stdTotalMandatory += $mandatoryCnt;

                    $explicitIds = [];
                    $legacyCnt = 0;
                    foreach ($indLinks as $lnk) {
                        $cov = $lnk->covered_requirements;
                        if (is_array($cov)) {
                            foreach ($cov as $rid) {
                                $explicitIds[(int) $rid] = true;
                            }
                        } elseif ($cov === null) {
                            $legacyCnt++;
                        }
                    }
                    $coveredCnt = $mandatoryCnt > 0 ? min($mandatoryCnt, count($explicitIds) + $legacyCnt) : $evCount;
                    $stdTotalCovered += $coveredCnt;

                    $evidenceFiles = [];
                    foreach ($indLinks as $link) {
                        $docVersion = $link->documentVersion;
                        $doc = $docVersion?->document;
                        if ($docVersion) {
                            $sizeBytes = $docVersion->file_size_bytes ?? $docVersion->file_size ?? 1024;
                            $sizeMb = round($sizeBytes / 1048576, 2);
                            $formattedSize = $sizeMb > 0 ? "{$sizeMb} MB" : round($sizeBytes / 1024, 1) . ' KB';

                            $evidenceFiles[] = [
                                'id'                => $link->id,
                                'evidenceLinkId'    => $link->id,
                                'versionId'         => (int) $docVersion->id,
                                'documentVersionId' => (int) $docVersion->id,
                                'documentId'        => $doc?->id,
                                'fileName'          => $doc?->title ?? $docVersion->file_name ?? "وثيقة شاهد {$link->id}",
                                'fileUrl'           => url("/api/v1/document-versions/{$docVersion->id}/download"),
                                'fileSizeBytes'     => $sizeBytes,
                                'fileSizeFormatted' => $formattedSize,
                                'mimeType'          => $docVersion->mime_type ?? 'application/pdf',
                                'uploadedAt'        => $link->created_at?->toIso8601String() ?? now()->toIso8601String(),
                            ];
                        }
                    }

                    $savedDefect = $savedDeficiencies->get($ind->indicator_id);
                    $openItem = $openItems->get($ind->indicator_id);
                    $hasDefect = ($savedDefect !== null) || ($openItem !== null);
                    $defectCategory = $savedDefect?->deficiency_category ?? ($openItem ? 'نقص الشواهد الإلزامية المطلوبة في أداة التحقق' : null);
                    $defectCategories = $savedDefect?->deficiency_categories
                        ?: ($savedDefect?->deficiency_category ? [$savedDefect->deficiency_category] : ($openItem ? ['نقص الشواهد الإلزامية المطلوبة في أداة التحقق'] : []));
                    $defectReason = $savedDefect?->supervisor_note ?? $openItem?->missing_description;
                    $directives = $savedDefect?->directives ?? $openItem?->missing_description;

                    $scoreVal = $res?->score;
                    $levelName = match ($scoreVal) {
                        3       => 'متحقق (3)',
                        2       => 'متوسط (2)',
                        1       => 'ضعيف (1)',
                        0       => 'غير متوفر (0)',
                        default => 'غير مقيّم',
                    };

                    $descriptors = $ind->scoreDescriptors->sortBy('score_level_id')->map(function ($d) use ($scoreVal) {
                        $sVal = (int) ($d->scoreLevel?->score_value ?? $d->scoreLevel?->score ?? $d->score_level_id);
                        return [
                            'descriptorId' => $d->descriptor_id ?? $d->id,
                            'score'        => $sVal,
                            'level'        => $sVal,
                            'label'        => $d->label ?? ($d->scoreLevel?->name ?? "المستوى {$sVal}"),
                            'title'        => $d->label ?? ($d->scoreLevel?->name ?? "المستوى {$sVal}"),
                            'description'  => $d->description,
                            'isSelected'   => ($scoreVal !== null && (int) $scoreVal === $sVal),
                        ];
                    })->values()->toArray();

                    $indicatorData = [
                        'indicatorId'            => $ind->indicator_id,
                        'code'                   => $ind->code,
                        'indicatorNumber'        => $ind->indicator_number ?? 1,
                        'title'                  => $ind->name ?? $ind->title,
                        'name'                   => $ind->name ?? $ind->title,
                        'description'            => $ind->description ?? '',
                        'weight'                 => (float) ($ind->weight ?? 1),
                        'standardId'             => $std->standard_id,
                        'standardName'           => $std->name,
                        'subStandardId'          => $sub->sub_standard_id,
                        'subStandardName'        => $sub->name,
                        'schoolScore'            => $scoreVal,
                        'scoreLevelName'         => $levelName,
                        'scoreDescription'       => $res?->scoreDescriptor?->description ?? $res?->textual_result ?? 'لا يوجد تبرير مدخل من المدرسة',
                        'evaluatorJustification' => !empty($res?->textual_result)
                            ? $res->textual_result
                            : ($res?->notes->firstWhere('author_user_id', $res?->evaluator_user_id)?->text
                                ?? $res?->notes->first()?->text
                                ?? 'لا يوجد تبرير مدخل من المدرسة'),
                        'internalReviewNotes' => ($res && $res->relationLoaded('notes'))
                            ? $res->notes->unique(fn ($n) => trim((string) $n->text))->values()->map(fn ($n) => [
                                'noteId'     => $n->note_id,
                                'authorName' => $n->author?->full_name ?? $n->author?->name ?? 'المراجع الداخلي',
                                'authorRole' => ($n->author?->hasRole('school_principal') || $n->author?->user_type === 'school') ? 'مدير المدرسة' : 'مقيم المدرسة',
                                'text'       => $n->text,
                                'createdAt'  => $n->created_at?->toIso8601String(),
                            ])->toArray()
                            : [],
                        'evidenceCount'              => $evCount,
                        'mandatoryRequirementsCount' => $mandatoryCnt,
                        'coveredRequirementsCount'   => $coveredCnt,
                        'descriptors'                => $descriptors,
                        'verificationTools'          => $ind->verificationTools->map(fn ($vt) => [
                            'id'          => $vt->tool_id,
                            'name'        => $vt->name,
                            'toolType'    => $vt->tool_type ?? 'documentary',
                            'description' => $vt->description ?? '',
                        ])->toArray(),
                        'evidenceRequirements' => $ind->evidenceRequirements->map(function ($er) use ($indLinks, $explicitIds) {
                            $coveringDocs = [];
                            foreach ($indLinks as $lnk) {
                                $cov = $lnk->covered_requirements;
                                if ((is_array($cov) && in_array((int) $er->requirement_id, $cov)) || ($cov === null)) {
                                    $docTitle = $lnk->documentVersion?->document?->title ?? $lnk->documentVersion?->file_name ?? "وثيقة {$lnk->id}";
                                    $coveringDocs[] = $docTitle;
                                }
                            }
                            $uniqueDocs = array_values(array_unique($coveringDocs));

                            return [
                                'id'                       => $er->requirement_id,
                                'requirementId'            => $er->requirement_id,
                                'title'                    => $er->title,
                                'description'              => $er->description ?? '',
                                'required'                 => (bool) $er->required,
                                'isMandatory'              => (bool) $er->required,
                                'isCovered'                => isset($explicitIds[(int) $er->requirement_id]),
                                'coveringDocuments'        => $uniqueDocs,
                                'coveringDocumentsSummary' => count($uniqueDocs) > 0 ? implode('، ', $uniqueDocs) : 'لا يوجد شاهد مرتبط بهذا المتطلب بعد',
                            ];
                        })->toArray(),
                        'evidences'          => $evidenceFiles,
                        'hasDefect'          => $hasDefect,
                        'defectCategory'     => $defectCategory,
                        'defectCategories'   => $defectCategories,
                        'defectReason'       => $defectReason,
                        'directives'         => $directives,
                        'supervisorFeedback' => $savedDefect?->supervisor_note,
                    ];

                    $allFlatIndicators[] = $indicatorData;

                    return $indicatorData;
                });

                return [
                    'subStandardId' => $sub->sub_standard_id,
                    'code'          => $sub->code,
                    'title'         => $sub->name,
                    'description'   => $sub->description ?? '',
                    'weight'        => (float) ($sub->weight ?? 0.0),
                    'guidance'      => $sub->guidance ?? '',
                    'indicators'    => $indicatorsList,
                ];
            });

            return [
                'standardId'  => $std->standard_id,
                'code'        => $std->code,
                'title'       => $std->name,
                'name'        => $std->name,
                'description' => $std->description ?? '',
                'weight'      => (float) ($std->weight ?? 15),
                'stats'       => [
                    'totalIndicators'            => $totalInds,
                    'scoredIndicators'           => $scoredCount,
                    'unenteredIndicators'        => $unenteredCount,
                    'level3Count'                => $l3,
                    'level2Count'                => $l2,
                    'level1Count'                => $l1,
                    'level0Count'                => $l0,
                    'totalEvidences'             => $stdTotalEvidences,
                    'totalMandatoryRequirements' => $stdTotalMandatory,
                    'coveredRequirements'        => $stdTotalCovered,
                    'coveragePercentage'         => $stdTotalMandatory > 0 ? round(($stdTotalCovered / $stdTotalMandatory) * 100) : 100,
                ],
                'subStandards' => $subStandardsList,
            ];
        });

        $schoolDocs = SchoolDocument::where('school_id', $school?->school_id)
            ->with([
                'currentVersion',
                'creator:user_id,full_name,email',
                'evidenceLinks.indicator',
            ])
            ->get();

        $vaultDocuments = $schoolDocs->map(function ($doc) {
            $ver = $doc->currentVersion;
            $linkedInds = $doc->evidenceLinks->map(fn ($el) => [
                'indicatorId' => $el->indicator_id,
                'code'        => $el->indicator?->code ?? "IND-{$el->indicator_id}",
                'title'       => $el->indicator?->title ?? $el->indicator?->name ?? 'مؤشر',
            ])->unique('indicatorId')->values()->toArray();

            $sizeBytes = $ver?->file_size_bytes ?? $ver?->file_size ?? 1024;
            $sizeMb = round($sizeBytes / 1048576, 2);
            $sizeFormatted = $sizeMb > 0 ? "{$sizeMb} MB" : round($sizeBytes / 1024, 1) . ' KB';

            $docTypeArabic = match (strtolower($doc->document_type ?? '')) {
                'plan'        => 'خطة تشغيلية / إجرائية',
                'minutes'     => 'محضر اجتماع',
                'report'      => 'تقرير دوري / ختامي',
                'circular'    => 'تعميم / قرار إداري',
                'schedule'    => 'جدول دراسي / حصص',
                'list'        => 'كشف / بيان مدرسي',
                'policy'      => 'سياسة / لائحة',
                'survey'      => 'استبيان / استطلاع',
                'certificate' => 'شهادة / إفادة',
                default       => $doc->document_type ?: 'وثيقة عامة',
            };

            return [
                'id'                 => $doc->id,
                'documentId'         => $doc->id,
                'versionId'          => $ver?->id,
                'documentVersionId'  => $ver?->id,
                'title'              => $doc->title,
                'documentType'       => $doc->document_type ?? 'أخرى',
                'documentTypeArabic' => $docTypeArabic,
                'description'        => $doc->description ?? '',
                'versionNumber'      => $ver?->version_number ?? 1,
                'createdAt'          => $doc->created_at?->toIso8601String(),
                'linksCount'         => count($linkedInds),
                'linkedIndicators'   => $linkedInds,
                'fileName'           => $ver?->file_name ?? $doc->title,
                'fileSize'           => $sizeBytes,
                'fileSizeFormatted'  => $sizeFormatted,
                'mimeType'           => $ver?->mime_type ?? 'application/pdf',
                'downloadUrl'        => $ver ? url("/api/v1/document-versions/{$ver->id}/download") : null,
                'previewUrl'         => $ver ? url("/api/v1/document-versions/{$ver->id}/preview") : null,
            ];
        });

        $vaultStats = [
            'totalDocuments'     => $vaultDocuments->count(),
            'totalLinks'         => $vaultDocuments->sum('linksCount'),
            'totalSizeBytes'     => $vaultDocuments->sum('fileSize'),
            'documentTypesCount' => $vaultDocuments->pluck('documentType')->unique()->count(),
        ];

        $evidenceSufficiency = null;
        try {
            $sufficiencyService = app(EvidenceSufficiencyService::class);
            $evidenceSufficiency = $sufficiencyService->evaluateEvaluation($evaluation);
        } catch (\Throwable $e) {
            $evidenceSufficiency = null;
        }

        $schoolPlans = ImprovementPlan::with([
            'areas.indicator',
            'actions.area',
            'actions.evidenceLinks.documentVersion.document',
        ])
        ->where('school_id', $school?->school_id)
        ->orderBy('plan_id', 'asc')
        ->get();

        $matchingPlans = $cycle?->cycle_id ? $schoolPlans->where('cycle_id', $cycle->cycle_id) : collect();
        $plansToUse = $matchingPlans->isNotEmpty() ? $matchingPlans : $schoolPlans;

        $formatPlan = function ($p) use ($results) {
            if (!$p) {
                return null;
            }

            $areas = $p->areas->map(function ($a) use ($p, $results) {
                $areaActions = $p->actions->where('area_id', $a->area_id);
                $avgProg = $areaActions->count() > 0 ? round($areaActions->avg('completion_percentage'), 1) : 0;
                $currScore = $results->get($a->indicator_id)?->score ?? 0;
                $targetScore = $a->target_score ?? 3;
                $gap = max(0, $targetScore - $currScore);

                return [
                    'areaId'          => $a->area_id,
                    'indicatorId'     => $a->indicator_id,
                    'indicatorCode'   => $a->indicator?->code ?? '',
                    'indicatorTitle'  => $a->indicator?->title ?? $a->indicator?->name ?? $a->name,
                    'name'            => $a->name,
                    'description'     => $a->description,
                    'priority'        => $a->priority ?? 'medium',
                    'priorityLabel'   => match ($a->priority) {
                        'high'   => 'أولوية قصوى',
                        'medium' => 'أولوية متوسطة',
                        default  => 'أولوية اعتيادية',
                    },
                    'currentScore'    => $currScore,
                    'targetScore'     => $targetScore,
                    'gap'             => $gap,
                    'status'          => $a->status,
                    'actionsCount'    => $areaActions->count(),
                    'averageProgress' => $avgProg,
                ];
            })->values()->toArray();

            $actions = $p->actions->map(function ($act) {
                $actEvidences = $act->evidenceLinks->map(function ($el) {
                    $ver = $el->documentVersion;
                    $doc = $ver?->document;
                    $sizeBytes = $ver?->file_size_bytes ?? $ver?->file_size ?? 1024;
                    $sizeMb = round($sizeBytes / 1048576, 2);
                    $sizeFormatted = $sizeMb > 0 ? "{$sizeMb} MB" : round($sizeBytes / 1024, 1) . ' KB';
                    return [
                        'id'                => $el->id,
                        'evidenceLinkId'    => $el->id,
                        'versionId'         => (int) ($el->document_version_id ?: $ver?->id),
                        'documentVersionId' => (int) ($el->document_version_id ?: $ver?->id),
                        'documentTitle'     => $doc?->title ?? $ver?->file_name ?? "شاهد تنفيذ {$el->id}",
                        'fileName'          => $ver?->file_name ?? $doc?->title ?? "شاهد_{$el->id}.pdf",
                        'fileSizeBytes'     => $sizeBytes,
                        'fileSizeFormatted' => $sizeFormatted,
                        'mimeType'          => $ver?->mime_type ?? 'application/pdf',
                        'downloadUrl'       => $ver ? url("/api/v1/document-versions/{$ver->id}/download") : null,
                        'previewUrl'        => $ver ? url("/api/v1/document-versions/{$ver->id}/preview") : null,
                        'uploadedAt'        => $el->created_at?->toIso8601String(),
                    ];
                })->values()->toArray();

                return [
                    'actionId'             => $act->action_id,
                    'areaId'               => $act->area_id,
                    'areaTitle'            => $act->area?->name ?? 'مجال تحسين',
                    'title'                => $act->title,
                    'responsible'          => $act->responsible_person_description ?? 'فريق التطوير المدرسي',
                    'startDate'            => $act->start_date?->toDateString(),
                    'dueDate'              => $act->due_date?->toDateString(),
                    'completionPercentage' => (int) $act->completion_percentage,
                    'progressDescription'  => $act->progress_description,
                    'status'               => $act->status,
                    'statusArabic'         => match (strtolower($act->status)) {
                        'completed', 'done'           => 'مكتمل',
                        'in_progress', 'inprogress'   => 'قيد التنفيذ',
                        'cancelled'                   => 'ملغي',
                        default                       => 'معلق / لم يبدأ',
                    },
                    'baselineScore' => $act->baseline_score,
                    'targetScore'   => $act->baseline_target_score ?? 3,
                    'gap'           => $act->baseline_gap ?? 1,
                    'evidenceCount' => count($actEvidences),
                    'evidenceLinks' => $actEvidences,
                ];
            })->values()->toArray();

            $planTypeLabel = match ($p->plan_type) {
                'QualityImprovement'         => 'خطة تحسين الجودة المدرسية الشاملة',
                'StaffProfessionalDevelopment' => 'خطة التطوير المهني والتربوي للكوادر',
                'AnnualOperational'          => 'الخطة التشغيلية السنوية',
                default                      => 'خطة تحسين وتطوير الأداء',
            };

            return [
                'planId'        => $p->plan_id,
                'title'         => $p->title,
                'status'        => $p->status,
                'statusArabic'  => match ($p->status) {
                    'Completed'              => 'مكتملة التنفيذ',
                    'Approved'               => 'معتمدة ومرفقة',
                    'InProgress', 'Active'   => 'قيد التنفيذ',
                    default                  => 'مسودة مرفقة',
                },
                'planType'      => $p->plan_type ?? 'QualityImprovement',
                'planTypeLabel' => $planTypeLabel,
                'versionNumber' => $p->version_number ?? 1,
                'academicYear'  => $p->academic_year ?? '2026/2027',
                'startDate'     => $p->start_date?->toDateString(),
                'endDate'       => $p->end_date?->toDateString(),
                'areas'         => $areas,
                'actions'       => $actions,
                'stats'         => [
                    'totalAreas'        => count($areas),
                    'totalActions'      => count($actions),
                    'completedActions'  => collect($actions)->whereIn('status', ['completed', 'Done', 'done'])->count(),
                    'inProgressActions' => collect($actions)->whereIn('status', ['in_progress', 'InProgress'])->count(),
                    'averageProgress'   => count($actions) > 0 ? round(collect($actions)->avg('completionPercentage'), 1) : 0,
                ],
            ];
        };

        $allFormattedPlans = $plansToUse->map($formatPlan)->values()->toArray();

        $primaryPlan = $plansToUse->firstWhere('plan_type', 'QualityImprovement')
            ?? $plansToUse->firstWhere('plan_type', 'AnnualOperational')
            ?? $plansToUse->first();
        $planData = $formatPlan($primaryPlan);

        $lowScoringIndicators = collect($allFlatIndicators)->filter(fn ($i) => $i['schoolScore'] !== null && (int) $i['schoolScore'] <= 2);

        $allPlanAreas = $plansToUse->flatMap(fn ($p) => $p->areas->map(fn ($a) => [
            'planId'    => $p->plan_id,
            'planType'  => $p->plan_type,
            'planTitle' => $p->title,
            'area'      => $a,
            'actions'   => $p->actions->where('area_id', $a->area_id),
        ]));

        $lowIndicatorsMatrix = $lowScoringIndicators->map(function ($ind) use ($allPlanAreas) {
            $matchingAreas = $allPlanAreas->where('area.indicator_id', $ind['indicatorId']);
            $isCovered = $matchingAreas->isNotEmpty();

            $coveringPlans = $matchingAreas->map(function ($match) {
                $actions = $match['actions'];
                $avgProg = $actions->count() > 0 ? round($actions->avg('completion_percentage'), 1) : 0;
                return [
                    'planId'          => $match['planId'],
                    'planType'        => $match['planType'],
                    'planTitle'       => $match['planTitle'],
                    'areaId'          => $match['area']->area_id,
                    'areaTitle'       => $match['area']->name,
                    'actionsCount'    => $actions->count(),
                    'averageProgress' => $avgProg,
                ];
            })->values()->toArray();

            return [
                'indicatorId'     => $ind['indicatorId'],
                'code'            => $ind['code'],
                'title'           => $ind['title'],
                'standardName'    => $ind['standardName'],
                'subStandardName' => $ind['subStandardName'],
                'schoolScore'     => $ind['schoolScore'],
                'scoreLevelName'  => match ($ind['schoolScore']) {
                    2       => 'متوسط (2)',
                    1       => 'ضعيف (1)',
                    0       => 'غير متوفر (0)',
                    default => 'غير مقيّم',
                },
                'isCovered'         => $isCovered,
                'isAddressed'       => $isCovered,
                'coveringPlans'     => $coveringPlans,
                'unaddressedReason' => $isCovered ? null : 'فجوة معيارية لم تُدرج في أي خطة تحسين بعد',
            ];
        })->values()->toArray();

        $unaddressedLowCount = collect($lowIndicatorsMatrix)->where('isCovered', false)->count();

        $deficienciesList = $savedDeficiencies->map(function ($def) use ($allFlatIndicators) {
            $ind = collect($allFlatIndicators)->firstWhere('indicatorId', $def->indicator_id);
            if (!$ind) {
                $dbInd = Indicator::with('subStandard.standard')->find($def->indicator_id);
                if ($dbInd) {
                    $matchingCurrent = collect($allFlatIndicators)->firstWhere('code', $dbInd->code);
                    $indId = $matchingCurrent['indicatorId'] ?? $dbInd->indicator_id;
                    $code = $dbInd->code;
                    $title = $dbInd->name ?? $dbInd->title ?? 'مؤشر تقييمي';
                    $stdName = $matchingCurrent['standardName'] ?? $dbInd->subStandard?->standard?->name ?? 'معيار عام';
                } else {
                    $indId = $def->indicator_id;
                    $code = "IND-{$def->indicator_id}";
                    $title = 'مؤشر تقييمي';
                    $stdName = 'معيار عام';
                }
            } else {
                $indId = $ind['indicatorId'] ?? $def->indicator_id;
                $code = $ind['code'] ?? "IND-{$def->indicator_id}";
                $title = $ind['title'] ?? $ind['name'] ?? 'مؤشر تقييمي';
                $stdName = $ind['standardName'] ?? 'معيار عام';
            }

            return [
                'id'             => $def->id,
                'indicatorId'    => $indId,
                'indicatorCode'  => $code,
                'indicatorTitle' => $title,
                'standardName'   => $stdName,
                'category'       => $def->deficiency_category,
                'categories'     => $def->deficiency_categories ?: ($def->deficiency_category ? [$def->deficiency_category] : []),
                'note'           => $def->supervisor_note,
                'directives'     => $def->directives,
                'allowedActions' => $def->allowed_actions ?: ['upload_replace_evidence'],
                'createdAt'      => $def->created_at?->toIso8601String(),
            ];
        })->values()->toArray();

        $allIndicatorsCount = count($allFlatIndicators) ?: 109;
        $isCompleteRubric = $totalScored >= $allIndicatorsCount;
        $compliancePct = $allIndicatorsCount > 0 ? round(($totalScored / $allIndicatorsCount) * 100, 1) : 0;

        $principalUser = $school ? User::where('school_id', $school->school_id)
            ->whereHas('roles', fn ($r) => $r->where('role_name', 'like', '%principal%'))
            ->first() : null;
        $principalName = $principalUser?->full_name ?? 'إدارة المدرسة';

        $schoolData = [
            'schoolId'         => $school?->school_id ?? 1,
            'schoolCode'       => $school?->school_code ?? "SCH-{$school?->school_id}",
            'schoolName'       => $school?->school_name ?? $school?->name ?? 'مدرسة التقييم',
            'educationalStage' => $school?->educational_stage ?? 'أساسي / ثانوي',
            'directorate'      => $school?->educational_district ?? 'غير محدد',
            'governorate'      => $school?->governorate ?? 'غير محدد',
            'principalName'    => $principalName,
            'cycleYear'        => $cycle?->academic_year ?? '2026/2027',
        ];

        $schoolInfoData = [
            'id'            => $school?->school_id ?? 1,
            'code'          => $school?->school_code ?? "SCH-{$school?->school_id}",
            'name'          => $school?->school_name ?? $school?->name ?? 'مدرسة التقييم',
            'stage'         => $school?->educational_stage ?? 'أساسي / ثانوي',
            'directorate'   => $school?->educational_district ?? 'غير محدد',
            'governorate'   => $school?->governorate ?? 'غير محدد',
            'principalName' => $principalName,
            'cycleYear'     => $cycle?->academic_year ?? '2026/2027',
        ];

        $summaryData = [
            'totalStandards'         => 7,
            'totalIndicators'        => $allIndicatorsCount,
            'totalElements'          => $allIndicatorsCount,
            'scoredIndicators'       => $totalScored,
            'evidencesAttachedCount' => $totalWithEvidence,
            'attachedEvidencesCount' => $totalWithEvidence,
            'actionsCount'           => $primaryPlan ? $primaryPlan->actions->count() : 0,
            'compliancePercentage'   => $compliancePct,
        ];

        $attemptNo = $submission?->attempt_no ?? 1;
        $isReReview = $attemptNo > 1;

        $deficienciesCount = $savedDeficiencies->count() > 0 ? $savedDeficiencies->count() : $openItems->count();
        $avgScore = $totalScored > 0 ? round(collect($allFlatIndicators)->whereNotNull('schoolScore')->avg('schoolScore'), 2) : 0;

        $automatedChecks = [
            'rubricCompleteness'            => $isCompleteRubric,
            'allEvidencesAttached'          => $totalWithEvidence > 0,
            'minEvidenceMet'                => $evidenceSufficiency ? (bool) ($evidenceSufficiency['overall']['is_sufficient'] ?? true) : ($totalWithEvidence > 0),
            'flagsCount'                    => $deficienciesCount,
            'totalIndicators'               => $allIndicatorsCount,
            'scoredIndicators'              => $totalScored,
            'missingIndicatorsCount'        => max(0, $allIndicatorsCount - $totalScored),
            'missingMandatoryEvidenceCount' => $evidenceSufficiency ? (int) ($evidenceSufficiency['overall']['mandatory_missing_count'] ?? 0) : 0,
            'unaddressedLowIndicatorsCount' => $unaddressedLowCount,
            'averageScore'                  => $avgScore,
            'notes'                         => $isCompleteRubric
                ? "تم فحص الرصد لـ {$allIndicatorsCount} مؤشراً كاملاً بنجاح."
                : "تنبيه فحص آلي: رصدت المدرسة {$totalScored} من أصل {$allIndicatorsCount} مؤشراً.",
        ];

        return ApiResponse::success([
            'submissionId' => $submission?->submission_id ?? $evaluation->evaluation_id,
            'evaluationId' => $evaluation->evaluation_id,
            'reportId'     => $submission?->report_id ?? 1,
            'attemptNumber'=> $attemptNo,
            'attemptNo'    => $attemptNo,
            'isReReview'   => $isReReview,
            'status'       => $submission?->status ?? $evaluation->status,
            'statusArabic' => match ($submission?->status ?? $evaluation->status) {
                'NeedsCompletion' => 'يحتاج استكمال',
                'Submitted'       => 'مرفوع جديد',
                'UnderReview'     => 'قيد التدقيق الإشرافي',
                'Completed'       => 'مكتمل المراجعة',
                default           => 'مسودة',
            },
            'submittedAt' => $submission?->submitted_at?->toIso8601String() ?? $evaluation->updated_at->toIso8601String(),
            'closedAt'    => ($evaluation->status === 'Completed') ? $evaluation->updated_at->toIso8601String() : null,
            'school'      => $schoolData,
            'schoolInfo'  => $schoolInfoData,
            'summary'     => $summaryData,
            'standards'   => $standardsTree,
            'vault'       => [
                'documents' => $vaultDocuments,
                'stats'     => $vaultStats,
            ],
            'evidenceInventory'  => $evidenceSufficiency,
            'planDetails'        => $planData,
            'plans'              => $allFormattedPlans,
            'allPlans'           => $allFormattedPlans,
            'lowIndicatorsMatrix'=> $lowIndicatorsMatrix,
            'deficienciesList'   => $deficienciesList,
            'automatedChecks'    => $automatedChecks,
            'improvementPlan'    => [
                'planId' => $primaryPlan?->plan_id,
                'status' => $primaryPlan ? match ($primaryPlan->status) {
                    'Completed'            => 'مكتملة التنفيذ',
                    'Approved'             => 'معتمدة ومرفقة',
                    'InProgress', 'Active' => 'قيد التنفيذ',
                    default                => 'مسودة مرفقة',
                } : 'غير منشأة بعد',
                'title'        => $primaryPlan?->title ?? 'خطة التحسين والتطوير المدرسي',
                'actionsCount' => $primaryPlan ? $primaryPlan->actions->count() : 0,
                'priorities'   => $primaryPlan ? $primaryPlan->actions->pluck('title')->take(4)->toArray() : [],
            ],
            'indicators'             => $allFlatIndicators,
            'openCompletionRequest'  => $openCompletionRequestData,
            'deficienciesCount'      => $deficienciesCount,
            'exportPdfUrl'           => "/api/v1/evaluations/{$evaluation->evaluation_id}/export-pdf",
            'exportExcelUrl'         => "/api/v1/evaluations/{$evaluation->evaluation_id}/export-excel",
            'packageDownloadUrl'     => "/api/v1/evaluations/{$evaluation->evaluation_id}/export-pdf",
            'cycleEndDate'           => $cycle?->end_date ? Carbon::parse($cycle->end_date)->toDateString() : null,
            'cycleMaxCompletionDays' => (int) ($cycle?->max_completion_days ?? 14),
        ], 'تم تحميل حزمة مراجعة المخرج بنجاح.');
    }

    /**
     * 3.2. حفظ أو تحديث رصد نقص في مؤشر تقييم محدد (FR-SUP-04, BR-MIN-02)
     * POST /api/v1/evaluation-submissions/{id}/deficiency-notes
     */
    public function saveDeficiencyNote(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $submission = EvaluationSubmission::with('report.evaluation.school')->find($id);
        $evaluation = $submission?->report?->evaluation ?? Evaluation::with('school')->find($id);

        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم أو مخرج المراجعة المطلوب غير موجود.');
        }

        if ($denied = $this->ensureSchoolInSupervisorScope($user, $evaluation->school)) {
            return $denied;
        }

        $validated = $request->validate([
            'indicator_id'           => 'required|integer|exists:indicators,indicator_id',
            'deficiency_category'    => 'nullable|string|max:255',
            'deficiency_categories'  => 'nullable|array',
            'deficiency_categories.*'=> 'string|max:150',
            'supervisor_note'        => 'nullable|string|max:2000',
            'directives'             => 'nullable|string|max:2000',
            'allowed_actions'        => 'nullable|array',
            'allowed_actions.*'      => 'string|max:100',
        ]);

        $categories = $validated['deficiency_categories'] ?? [];
        if (empty($categories) && !empty($validated['deficiency_category'])) {
            $categories = [$validated['deficiency_category']];
        }
        $primaryCategory = !empty($categories) ? $categories[0] : ($validated['deficiency_category'] ?? 'أسباب أخرى');

        $latestSubmission = $submission ?? EvaluationSubmission::whereHas('report', fn ($q) => $q->where('evaluation_id', $evaluation->evaluation_id))
            ->latest('submission_id')
            ->first();

        $deficiency = SupervisionDeficiencyNote::updateOrCreate(
            [
                'evaluation_id' => $evaluation->evaluation_id,
                'indicator_id'  => $validated['indicator_id'],
            ],
            [
                'submission_id'         => $latestSubmission?->submission_id,
                'deficiency_category'   => $primaryCategory,
                'deficiency_categories' => $categories,
                'supervisor_note'       => $validated['supervisor_note'] ?? null,
                'directives'            => $validated['directives'] ?? null,
                'allowed_actions'       => $validated['allowed_actions'] ?? null,
                'created_by'            => $user->user_id,
            ]
        );

        return ApiResponse::success([
            'id'                   => $deficiency->id,
            'evaluationId'         => $deficiency->evaluation_id,
            'indicatorId'          => $deficiency->indicator_id,
            'deficiencyCategory'   => $deficiency->deficiency_category,
            'deficiencyCategories' => $deficiency->deficiency_categories ?: [$deficiency->deficiency_category],
            'supervisorNote'       => $deficiency->supervisor_note,
            'directives'           => $deficiency->directives,
        ], 'تم حفظ رصد النقص وتوجيه المشرف للمؤشر بنجاح.');
    }

    /**
     * 3.3. إلغاء رصد النقص عن مؤشر محدد
     * DELETE /api/v1/evaluation-submissions/{id}/deficiency-notes/{indicatorId}
     */
    public function deleteDeficiencyNote(Request $request, int $id, int $indicatorId): JsonResponse
    {
        $user = $request->user();

        $submission = EvaluationSubmission::with('report.evaluation.school')->find($id);
        $evaluation = $submission?->report?->evaluation ?? Evaluation::with('school')->find($id);

        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم غير موجود.');
        }

        if ($denied = $this->ensureSchoolInSupervisorScope($user, $evaluation->school)) {
            return $denied;
        }

        SupervisionDeficiencyNote::where('evaluation_id', $evaluation->evaluation_id)
            ->where('indicator_id', $indicatorId)
            ->delete();

        return ApiResponse::success(null, 'تم إلغاء رصد النقص عن المؤشر بنجاح.');
    }

    /**
     * 5. سجل إجراءات المتابعة والخط الزمني الميداني للمدرسة (FR-SUP-16)
     * GET /api/v1/schools/{id}/tracking-log
     */
    public function schoolTrackingLog(Request $request, int $id): JsonResponse
    {
        $school = School::with([
            'evaluations.cycle',
            'evaluations.reports.submissions.completionRequests.items',
        ])->findOrFail($id);

        if ($denied = $this->ensureSchoolInSupervisorScope($request->user(), $school)) {
            return $denied;
        }

        $evaluations = $school->evaluations;
        $submissionIds = [];
        $milestones = [];

        foreach ($evaluations as $eval) {
            $cycle = $eval->cycle;
            $reports = $eval->reports ?? collect();
            foreach ($reports as $rep) {
                $submissions = $rep->submissions ?? collect();
                foreach ($submissions as $sub) {
                    $submissionIds[] = $sub->submission_id;

                    $prevStatus = $sub->attempt_no > 1 ? 'يحتاج استكمال' : 'مسودة قيد الإعداد';
                    $newStatus = $sub->attempt_no > 1 ? "مرفوع بعد الاستكمال (المحاولة {$sub->attempt_no})" : "مرفوع جديد (المحاولة {$sub->attempt_no})";

                    $milestones[] = [
                        'id'             => "sub-{$sub->submission_id}",
                        'eventType'      => 'submission',
                        'title'          => "المحاولة {$sub->attempt_no}: تسليم التقييم الذاتي للمراجعة الإشرافية",
                        'description'    => 'قام مقيم المدرسة المعتمد بختم وتسليم التقرير الذاتي والمرفقات الشاهدية للمراجعة الوزارية.',
                        'actorName'      => 'مقيم المدرسة المعتمد',
                        'actorRole'      => 'مقيم المدرسة',
                        'actorType'      => 'school',
                        'timestamp'      => $sub->submitted_at?->toIso8601String() ?? $sub->created_at->toIso8601String(),
                        'statusBadge'    => 'مسلّم للمراجعة',
                        'badgeColor'     => 'blue',
                        'cycleId'        => $cycle?->cycle_id,
                        'cycleName'      => $cycle?->name,
                        'submissionId'   => $sub->submission_id,
                        'stateTransition'=> [
                            'from' => $prevStatus,
                            'to'   => $newStatus,
                        ],
                    ];

                    foreach ($sub->completionRequests as $cr) {
                        $itemsCount = $cr->items->count();
                        $deadlineStr = $cr->completion_deadline ? Carbon::parse($cr->completion_deadline)->format('Y/m/d') : 'غير محددة';
                        $milestones[] = [
                            'id'                  => "cr-{$cr->request_id}",
                            'eventType'           => 'completion_request',
                            'title'               => "إصدار طلب استكمال بمهلة زمنية (المحاولة {$sub->attempt_no})",
                            'description'         => "أصدر المشرف الوزاري طلب استكمال لـ {$itemsCount} بنود مع مهلة استكمال حتى {$deadlineStr}.",
                            'actorName'           => 'المشرف الوزاري',
                            'actorRole'           => 'المشرف الوزاري',
                            'actorType'           => 'supervisor',
                            'timestamp'           => $cr->created_at->toIso8601String(),
                            'statusBadge'         => $cr->status === 'Open' ? 'يحتاج استكمال' : 'معالج ومغلق',
                            'badgeColor'          => 'amber',
                            'cycleId'             => $cycle?->cycle_id,
                            'cycleName'           => $cycle?->name,
                            'submissionId'        => $sub->submission_id,
                            'completionRequestId' => $cr->request_id,
                            'stateTransition'     => [
                                'from' => "مرفوع للمراجعة (المحاولة {$sub->attempt_no})",
                                'to'   => "يحتاج استكمال ({$itemsCount} بنود)",
                            ],
                        ];
                    }
                }
            }
        }

        $auditDecisions = AuditLog::where('school_id', $id)
            ->whereIn('action', ['evaluation.direct_closed', 'completion.closed'])
            ->with('user')
            ->get();

        foreach ($auditDecisions as $decision) {
            $milestones[] = [
                'id'              => "audit-{$decision->log_id}",
                'eventType'       => 'decision',
                'title'           => 'إغلاق المراجعة الإشرافية بنجاح',
                'description'     => 'تم استيفاء المتطلبات وإغلاق المراجعة الإشرافية للملف ونقل الحالة إلى مكتمل (Completed).',
                'actorName'       => $decision->user?->name ?? 'المشرف الوزاري',
                'actorRole'       => 'المشرف الوزاري',
                'actorType'       => 'supervisor',
                'timestamp'       => $decision->created_at->toIso8601String(),
                'statusBadge'     => 'مكتمل ومغلق',
                'badgeColor'      => 'emerald',
                'cycleId'         => null,
                'cycleName'       => null,
                'stateTransition' => [
                    'from' => 'قيد التدقيق الإشرافي',
                    'to'   => 'مكتمل المراجعة ومغلق نهائياً',
                ],
            ];
        }

        $notes = SupervisorNote::with('author')
            ->where(function ($q) use ($id, $submissionIds) {
                $q->where('school_id', $id);
                if (!empty($submissionIds)) {
                    $q->orWhereIn('submission_id', $submissionIds);
                }
            })
            ->orderByDesc('created_at')
            ->get();

        foreach ($notes as $note) {
            $badgeColor = match ($note->memo_type) {
                'field_visit', 'زيارة ميدانية'                 => 'purple',
                'phone_call', 'اتصال هاتفي'                    => 'teal',
                'corrective_memo', 'مذكرة تصحيحية / تعقيبية'   => 'amber',
                default                                        => 'indigo',
            };

            $milestones[] = [
                'id'        => "memo-{$note->note_id}",
                'eventType' => match ($note->memo_type) {
                    'field_visit', 'زيارة ميدانية'               => 'field_visit',
                    'phone_call', 'اتصال هاتفي'                  => 'phone_call',
                    'corrective_memo', 'مذكرة تصحيحية / تعقيبية' => 'corrective_memo',
                    default                                      => 'supervisor_memo',
                },
                'title'       => $note->subject ?? 'مذكرة إشرافية وتوجيه ميداني',
                'description' => $note->text,
                'actorName'   => $note->author?->name ?? 'المشرف الوزاري',
                'actorRole'   => 'المشرف الوزاري',
                'actorType'   => 'supervisor',
                'timestamp'   => $note->created_at->toIso8601String(),
                'statusBadge' => match ($note->memo_type) {
                    'field_visit', 'زيارة ميدانية'               => 'زيارة ميدانية',
                    'phone_call', 'اتصال هاتفي'                  => 'اتصال هاتفي',
                    'corrective_memo', 'مذكرة تصحيحية / تعقيبية' => 'مذكرة تصحيحية / تعقيبية',
                    default                                      => 'مذكرة إشرافية',
                },
                'badgeColor'          => $badgeColor,
                'cycleId'             => $note->cycle_id,
                'submissionId'        => $note->submission_id,
                'completionRequestId' => $note->completion_request_id,
                'stateTransition'     => [
                    'from' => 'إجراء متابعة ميداني',
                    'to'   => $note->is_visible_to_school ? 'موثق ومعلن للمدرسة' : 'موثق للمتابعة الداخلية',
                ],
            ];
        }

        usort($milestones, fn ($a, $b) => strcmp($b['timestamp'], $a['timestamp']));

        $memosList = $notes->map(function ($n) {
            return [
                'id'       => $n->note_id,
                'memoType' => match ($n->memo_type) {
                    'field_visit', 'زيارة ميدانية'               => 'زيارة ميدانية',
                    'phone_call', 'اتصال هاتفي'                  => 'اتصال هاتفي',
                    'corrective_memo', 'مذكرة تصحيحية / تعقيبية' => 'مذكرة تصحيحية / تعقيبية',
                    default                                      => 'مذكرة إشرافية',
                },
                'subject'             => $n->subject ?? 'مذكرة إشرافية',
                'details'             => $n->text,
                'isVisibleToSchool'   => (bool) $n->is_visible_to_school,
                'authorName'          => $n->author?->name ?? 'المشرف الوزاري',
                'createdAt'           => $n->created_at->toIso8601String(),
                'cycleId'             => $n->cycle_id,
                'submissionId'        => $n->submission_id,
                'completionRequestId' => $n->completion_request_id,
            ];
        })->values()->toArray();

        $latestEval = $school->evaluations->first();
        $latestSubmission = $latestEval?->reports?->flatMap->submissions?->sortByDesc('attempt_no')->first();
        $rawStatus = $latestSubmission?->status ?? ($latestEval?->status ?? 'Draft');
        $outputStatus = ($rawStatus === 'InProgress') ? 'Draft' : $rawStatus;
        $outputStatusArabic = match ($outputStatus) {
            'NeedsCompletion' => 'يحتاج استكمال',
            'Submitted'       => 'مرفوع جديد',
            'UnderReview'     => 'قيد التدقيق الإشرافي',
            'Completed'       => 'مكتمل المراجعة',
            default           => 'مسودة قيد الإعداد',
        };

        $kpis = [
            'totalMilestones'    => count($milestones),
            'submissionAttempts' => count(array_filter($milestones, fn ($m) => $m['eventType'] === 'submission')),
            'completionRequests' => count(array_filter($milestones, fn ($m) => $m['eventType'] === 'completion_request')),
            'memosAndVisits'     => count(array_filter($milestones, fn ($m) => in_array($m['eventType'], ['supervisor_memo', 'field_visit', 'phone_call', 'corrective_memo', 'زيارة ميدانية', 'اتصال هاتفي', 'مذكرة إشرافية', 'مذكرة تصحيحية / تعقيبية']))),
            'currentDecision'    => $outputStatusArabic,
        ];

        $availableSubmissions = $evaluations->flatMap->reports->flatMap->submissions->map(fn ($s) => [
            'submissionId' => $s->submission_id,
            'attemptNo'    => $s->attempt_no,
            'label'        => "محاولة التسليم {$s->attempt_no} (" . ($s->submitted_at ? Carbon::parse($s->submitted_at)->format('Y/m/d') : 'تاريخ غير محدد') . ')',
        ])->unique('submissionId')->values()->toArray();

        $availableCompletionRequests = $evaluations->flatMap->reports->flatMap->submissions->flatMap->completionRequests->map(fn ($cr) => [
            'requestId' => $cr->request_id,
            'status'    => $cr->status === 'Open' ? 'مفتوح قيد الاستكمال' : 'معالج ومغلق',
            'deadline'  => $cr->completion_deadline ? Carbon::parse($cr->completion_deadline)->format('Y/m/d') : 'غير محددة',
            'label'     => "طلب استكمال #{$cr->request_id} (مهلة: " . ($cr->completion_deadline ? Carbon::parse($cr->completion_deadline)->format('Y/m/d') : 'غير محددة') . ')',
        ])->unique('requestId')->values()->toArray();

        $availableCycles = $evaluations->map(fn ($e) => [
            'cycleId'      => $e->cycle?->cycle_id,
            'name'         => $e->cycle?->name,
            'academicYear' => $e->cycle?->academic_year,
            'label'        => $e->cycle?->name ?? "الدورة للعام {$e->cycle?->academic_year}",
        ])->filter(fn ($c) => !empty($c['cycleId']))->unique('cycleId')->values()->toArray();

        return ApiResponse::success([
            'school' => [
                'schoolId'           => $school->school_id,
                'schoolCode'         => $school->school_code ?? "SCH-{$school->school_id}",
                'schoolName'         => $school->name ?? $school->school_name,
                'outputStatus'       => $outputStatus,
                'outputStatusArabic' => $outputStatusArabic,
                'educationalStage'   => $school->educational_stage ?? 'أساسي / ثانوي',
                'directorate'        => $school->educational_district ?? 'غير محدد',
                'governorate'        => $school->governorate ?? 'غير محدد',
                'totalMilestones'    => count($milestones),
            ],
            'schoolId'                    => $school->school_id,
            'schoolCode'                  => $school->school_code ?? "SCH-{$school->school_id}",
            'schoolName'                  => $school->name ?? $school->school_name,
            'educationalStage'            => $school->educational_stage ?? 'أساسي / ثانوي',
            'directorate'                 => $school->educational_district ?? 'غير محدد',
            'governorate'                 => $school->governorate ?? 'غير محدد',
            'activeCycle'                 => $school->evaluations->first()?->cycle?->academic_year ?? '2026/2027',
            'kpis'                        => $kpis,
            'milestones'                  => $milestones,
            'memos'                       => $memosList,
            'availableSubmissions'        => $availableSubmissions,
            'availableCompletionRequests' => $availableCompletionRequests,
            'availableCycles'             => $availableCycles,
        ], 'تم تحميل سجل متابعة المدرسة بنجاح.');
    }

    /**
     * 6. تسجيل مذكرة أو زيارة إشرافية ميدانية موثقة (FR-SUP-16)
     * POST /api/v1/schools/{id}/supervisor-notes
     */
    public function addSupervisorMemo(Request $request, int $id): JsonResponse
    {
        $school = School::findOrFail($id);
        $user = $request->user();

        if ($denied = $this->ensureSchoolInSupervisorScope($user, $school)) {
            return $denied;
        }

        $validator = Validator::make($request->all(), [
            'memoType'              => 'required|string|in:مذكرة إشرافية,زيارة ميدانية,اتصال هاتفي,مذكرة تصحيحية / تعقيبية,supervisor_memo,field_visit,phone_call,corrective_memo',
            'subject'               => 'required|string|max:255',
            'details'               => 'required|string|max:2000',
            'cycle_id'              => 'nullable|integer|exists:evaluation_cycles,cycle_id',
            'submission_id'         => 'nullable|integer|exists:evaluation_submissions,submission_id',
            'completion_request_id' => 'nullable|integer|exists:completion_requests,request_id',
            'isVisibleToSchool'     => 'nullable|boolean',
        ], [
            'memoType.required' => 'نوع الإجراء مطلوب.',
            'subject.required'  => 'موضوع المذكرة مطلوب.',
            'details.required'  => 'تفاصيل الإجراء الإشرافي مطلوبة.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $submissionId = $request->input('submission_id');
        $cycleId = $request->input('cycle_id');

        if (!$submissionId && !$cycleId) {
            $cycleId = EvaluationCycle::where('status', 'Active')->value('cycle_id')
                ?? EvaluationCycle::latest('cycle_id')->value('cycle_id');
        }

        $memoType = match ($request->input('memoType')) {
            'field_visit', 'زيارة ميدانية'               => 'زيارة ميدانية',
            'phone_call', 'اتصال هاتفي'                  => 'اتصال هاتفي',
            'corrective_memo', 'مذكرة تصحيحية / تعقيبية' => 'مذكرة تصحيحية / تعقيبية',
            default                                      => 'مذكرة إشرافية',
        };

        $note = SupervisorNote::create([
            'school_id'             => $school->school_id,
            'cycle_id'              => $cycleId,
            'submission_id'         => $submissionId,
            'completion_request_id' => $request->input('completion_request_id'),
            'author_user_id'        => $user?->user_id ?? 1,
            'memo_type'             => $memoType,
            'subject'               => $request->input('subject'),
            'text'                  => $request->input('details'),
            'is_visible_to_school'  => (bool) $request->input('isVisibleToSchool', true),
        ]);

        AuditLog::create([
            'school_id'      => $school->school_id,
            'user_id'        => $user?->user_id ?? 1,
            'action'         => 'supervisor_note.created',
            'target_type'    => SupervisorNote::class,
            'target_id'      => $note->note_id,
            'description_ar' => "تم تسجيل إجراء متابعة إشرافي ({$memoType}) بعنوان: {$note->subject}",
            'ip_address'     => $request->ip(),
            'user_agent'     => $request->userAgent(),
            'created_at'     => now(),
        ]);

        return ApiResponse::success([
            'id'                => $note->note_id,
            'memoType'          => $memoType,
            'subject'           => $note->subject,
            'details'           => $note->text,
            'isVisibleToSchool' => $note->is_visible_to_school,
            'authorName'        => $user?->name ?? 'المشرف الوزاري',
            'createdAt'         => $note->created_at->toIso8601String(),
        ], 'تم حفظ المذكرة الإشرافية الميدانية بنجاح.');
    }
}
