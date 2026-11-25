<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesSupervisorScope;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\CompletionRequest;
use App\Models\EvaluationCycle;
use App\Models\EvaluationSubmission;
use App\Models\ImprovementPlan;
use App\Models\Indicator;
use App\Models\School;
use App\Models\StandardVersion;
use App\Services\EvidenceSufficiencyService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * وحدة الإشراف والمتابعة الوزارية المركزية (SupervisionController).
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي.
 *
 * يركز هذا المتحكم على لوحة القيادة المركزية، الإصدار المعياري النشط،
 * شجرة المعايير الوطنية، وسجل طلبات الاستكمال؛ بينما تم فصل
 * المراجعة الإشرافية والتحليلات المركزية إلى متحكمات متخصصة.
 */
class SupervisionController extends Controller
{
    use ResolvesSupervisorScope;

    /**
     * 1. لوحة المتابعة المركزية لحالة المدارس الميدانية
     * GET /api/v1/supervision/dashboard
     */
    public function dashboard(Request $request): JsonResponse
    {
        $requestedCycleId = $request->input('cycle_id') ?? $request->input('cycleId');
        $activeCycle = $requestedCycleId
            ? EvaluationCycle::find($requestedCycleId)
            : (EvaluationCycle::where('status', 'Active')->latest('cycle_id')->first()
                ?? EvaluationCycle::latest('cycle_id')->first());

        $isOverdueCycleThreshold = false;
        $overdueThresholdDate = null;
        if ($activeCycle && $activeCycle->start_date && $activeCycle->end_date) {
            $startDate = Carbon::parse($activeCycle->start_date);
            $endDate = Carbon::parse($activeCycle->end_date);
            $totalSeconds = $endDate->diffInSeconds($startDate);
            $elapsedSeconds = now()->diffInSeconds($startDate);

            if (now()->gte($startDate) && $totalSeconds > 0 && ($elapsedSeconds / $totalSeconds) >= 0.8) {
                $isOverdueCycleThreshold = true;
                $overdueThresholdDate = $startDate->copy()->addSeconds((int) ($totalSeconds * 0.8));
            }
        }

        $activeVersion = $activeCycle?->standardVersion
            ?? StandardVersion::where('status', 'Active')->first()
            ?? StandardVersion::where('status', 'Approved')->first();

        $totalStandardIndicators = Indicator::whereHas('subStandard.standard', function ($q) use ($activeVersion) {
            if ($activeVersion) {
                $q->where('version_id', $activeVersion->version_id);
            }
        })->count();

        if ($totalStandardIndicators === 0) {
            $totalStandardIndicators = 109;
        }

        $user = $request->user();
        $supervisorGovernorate = ($user && $user->hasRole('ministry_supervisor') && !empty($user->governorate))
            ? $user->governorate
            : null;

        $schoolsQuery = School::with([
            'principal',
            'evaluators',
            'documents',
            'evaluations' => function ($q) {
                $q->latest('evaluation_id');
            },
            'evaluations.cycle',
            'evaluations.creator',
            'evaluations.reports.submissions.completionRequests',
            'evaluations.reports.submissions.submittedBy',
            'evaluations.results',
            'evaluations.evidenceLinks',
        ]);

        if ($supervisorGovernorate) {
            $schoolsQuery->where('governorate', $supervisorGovernorate);
        }

        $schools = $schoolsQuery->get();

        $schoolsData = [];
        $totalSchools = $schools->count();
        $pendingReviewCount = 0;
        $openCompletionRequestsCount = 0;
        $completedReviewCount = 0;
        $delayedCount = 0;

        foreach ($schools as $school) {
            $eval = ($activeCycle ? $school->evaluations->firstWhere('cycle_id', $activeCycle->cycle_id) : null)
                ?? $school->evaluations->first();
            $submission = $eval?->reports?->flatMap->submissions?->sortByDesc('attempt_no')->first();
            $rawStatus = $submission?->status ?? ($eval?->status ?? 'Draft');
            $status = ($rawStatus === 'InProgress') ? 'Draft' : $rawStatus;

            $scoredCount = $eval ? $eval->results->whereNotNull('score')->count() : 0;
            $selfEvalProgress = in_array($status, ['Submitted', 'UnderReview', 'Completed'], true)
                ? 100
                : ($totalStandardIndicators > 0 ? min(100, (int) round(($scoredCount / $totalStandardIndicators) * 100)) : 0);

            $isDelayed = false;
            if ($status === 'Draft') {
                $evalCycle = $eval?->cycle ?? $activeCycle;
                if ($evalCycle && $evalCycle->start_date && $evalCycle->end_date) {
                    $cStart = Carbon::parse($evalCycle->start_date);
                    $cEnd = Carbon::parse($evalCycle->end_date);
                    $cTotal = $cEnd->timestamp - $cStart->timestamp;
                    $cElapsed = now()->timestamp - $cStart->timestamp;
                    if (now()->gte($cStart) && $cTotal > 0 && ($cElapsed / $cTotal) >= 0.8) {
                        $isDelayed = true;
                        $delayedCount++;
                    }
                }
            }

            $principalName = $school->principal?->full_name ?? $school->principal?->name ?? 'غير محدد';
            $evaluatorName = $submission?->submittedBy?->full_name
                ?? $submission?->submittedBy?->name
                ?? $eval?->creator?->full_name
                ?? $school->evaluators->first()?->full_name
                ?? 'غير محدد';

            $totalIndicatorsCount = $totalStandardIndicators;
            $scoredIndicatorsCount = $scoredCount;
            $totalRequirementsCount = 278;
            $evidenceCount = $eval ? $eval->evidenceLinks->count() : 0;
            $documentsCount = $school->documents ? $school->documents->count() : 0;

            $coveredRequirementsCount = 0;
            if ($eval) {
                try {
                    $sufficiencyData = app(EvidenceSufficiencyService::class)->evaluateEvaluation($eval);
                    $coveredRequirementsCount = (int) collect($sufficiencyData['standards'] ?? [])
                        ->flatMap(fn ($s) => $s['indicators'] ?? [])
                        ->sum('effective_covered_count');
                } catch (\Throwable $e) {
                    $coveredRequirementsCount = $evidenceCount;
                }
            }

            $statusArabic = match ($status) {
                'NeedsCompletion' => 'يحتاج استكمال',
                'Submitted'       => 'مرفوع جديد',
                'UnderReview'     => 'قيد التدقيق الإشرافي',
                'Completed'       => 'مكتمل',
                default           => ($isDelayed ? 'متأخرة عن التسليم' : 'مسودة قيد الإعداد'),
            };

            $allCompletionRequests = $submission?->completionRequests ?? collect();
            $completionRequestsCount = $allCompletionRequests->count();
            $openRequest = $allCompletionRequests->where('status', 'Open')->first();
            $openCompletionRequestId = $openRequest?->request_id ?? null;

            $plan = ImprovementPlan::with('actions')
                ->where('school_id', $school->school_id)
                ->when($eval?->cycle_id, fn ($q, $cid) => $q->where('cycle_id', $cid))
                ->latest('plan_id')
                ->first();

            $planStatusText = 'غير منشأة';
            $planProgressPercentage = 0;
            if ($plan) {
                $actionsTotal = $plan->actions->count();
                $actionsDone = $plan->actions->where('status', 'Finished')->count();
                $planProgressPercentage = $actionsTotal > 0 ? (int) round(($actionsDone / $actionsTotal) * 100) : 0;

                $planStatusText = match ($plan->status) {
                    'Completed'  => 'مكتملة التنفيذ',
                    'InProgress' => ($planProgressPercentage > 0 ? "قيد التنفيذ ({$planProgressPercentage}%)" : 'قيد التنفيذ'),
                    'Approved'   => 'معتمدة للتنفيذ',
                    'Draft'      => 'مسودة قيد الصياغة',
                    default      => 'قيد الإعداد',
                };
            }

            if (in_array($status, ['Submitted', 'UnderReview'], true)) {
                $pendingReviewCount++;
            } elseif ($status === 'NeedsCompletion') {
                $openCompletionRequestsCount++;
            } elseif ($status === 'Completed') {
                $completedReviewCount++;
            }

            $lastActionDate = $submission?->submitted_at
                ?? $eval?->updated_at
                ?? $school->updated_at
                ?? now();

            $schoolsData[] = [
                'schoolId'                 => $school->school_id,
                'schoolCode'               => $school->school_code ?? "SCH-{$school->school_id}",
                'schoolName'               => $school->name ?? $school->school_name ?? "مدرسة {$school->school_id}",
                'educationalStage'         => $school->educational_stage ?? 'أساسي / ثانوي',
                'governorate'              => $school->governorate ?? 'غير محدد',
                'directorate'              => $school->educational_district ?? 'غير محدد',
                'principalName'            => $principalName,
                'evaluatorName'            => $evaluatorName,
                'selfEvaluationProgress'   => $selfEvalProgress,
                'scoredIndicatorsCount'    => $scoredIndicatorsCount,
                'totalIndicatorsCount'     => $totalIndicatorsCount,
                'coveredRequirementsCount' => $coveredRequirementsCount,
                'totalRequirementsCount'   => $totalRequirementsCount,
                'evidenceCount'            => $evidenceCount,
                'documentsCount'           => $documentsCount,
                'outputStatus'             => $status,
                'outputStatusArabic'       => $statusArabic,
                'isDelayed'                => $isDelayed,
                'completionRequestsCount'  => $completionRequestsCount,
                'openCompletionRequestId'  => $openCompletionRequestId,
                'improvementPlanStatus'    => $planStatusText,
                'improvementPlanProgress'  => $planProgressPercentage,
                'hasImprovementPlan'       => $plan !== null,
                'lastActionDate'           => $lastActionDate instanceof Carbon ? $lastActionDate->toIso8601String() : Carbon::parse($lastActionDate)->toIso8601String(),
                'latestSubmissionId'       => $submission?->submission_id ?? ($eval?->evaluation_id ?? $school->school_id),
                'evaluationId'             => $eval?->evaluation_id ?? null,
            ];
        }

        return ApiResponse::success([
            'kpis' => [
                'totalSchools'               => $totalSchools,
                'pendingReviewCount'         => $pendingReviewCount,
                'openCompletionRequestsCount'=> $openCompletionRequestsCount,
                'completedReviewCount'       => $completedReviewCount,
                'delayedSchoolsCount'        => $delayedCount,
            ],
            'governanceCallout' => [
                'ruleCode'    => 'BR-MIN-03',
                'title'       => 'حوكمة المراجعة الإشرافية الوزارية',
                'description' => 'إجراءات المشرف تنحصر في المراجعة الإشرافية وطلب الاستكمال بمهلة زمنية أو إغلاق المراجعة كمكتمل؛ ولا يملك المشرف صلاحية تعديل درجات المدرسة أو إعادة تقييمها أو ترتيب المدارس تنافسياً.',
            ],
            'scope' => [
                'name'                      => $supervisorGovernorate ? "نطاق محافظة {$supervisorGovernorate}" : 'الإدارة العامة لتقويم الجودة المدرسية',
                'governorate'               => $supervisorGovernorate ?: 'كافة المحافظات (إشراف مركزي عام)',
                'totalSchools'              => $totalSchools,
                'activeCycle'               => $activeCycle?->academic_year ?? '2026/2027',
                'activeCycleId'             => $activeCycle?->cycle_id,
                'activeCycleName'           => $activeCycle?->name ?? 'الدورة الوطنية للتقييم الذاتي المدرسي',
                'cycleStatus'               => $activeCycle?->status ?? 'Active',
                'startDate'                 => $activeCycle?->start_date ? Carbon::parse($activeCycle->start_date)->toDateString() : null,
                'endDate'                   => $activeCycle?->end_date ? Carbon::parse($activeCycle->end_date)->toDateString() : null,
                'daysRemaining'             => ($activeCycle && $activeCycle->end_date) ? max(0, (int) now()->diffInDays(Carbon::parse($activeCycle->end_date), false)) : 0,
                'hasActiveCycle'            => ($activeCycle && $activeCycle->status === 'Active'),
                'isOverdueThresholdReached' => $isOverdueCycleThreshold,
                'overdueThresholdDate'      => $overdueThresholdDate?->toIso8601String(),
                'standardVersion'           => [
                    'versionId'    => $activeVersion?->version_id,
                    'versionNo'    => $activeVersion?->version_number ?? '1.0',
                    'versionTitle' => $activeVersion?->version_title ?? $activeVersion?->title ?? 'الوثيقة الوطنية لمعايير جودة التعليم المدرسي',
                ],
            ],
            'schools' => $schoolsData,
        ], 'تم تحميل لوحة المتابعة الإشرافية المركزية بنجاح.');
    }

    /**
     * 2. الإصدار المعياري النشط المعتمد
     * GET /api/v1/standard-versions/active
     */
    public function activeStandardVersion(): JsonResponse
    {
        $version = StandardVersion::with(['standards.subStandards.indicators'])
            ->where('status', 'Active')
            ->first()
            ?? StandardVersion::where('status', 'Approved')->first()
            ?? StandardVersion::first();

        if (!$version) {
            return ApiResponse::notFound('لا يوجد إصدار معياري نشط حالياً.');
        }

        $indicatorsCount = 0;
        foreach ($version->standards as $std) {
            foreach ($std->subStandards as $sub) {
                $indicatorsCount += $sub->indicators->count();
            }
        }

        return ApiResponse::success([
            'versionId'       => $version->version_id,
            'versionNumber'   => $version->version_number,
            'title'           => $version->title,
            'status'          => $version->status,
            'standardsCount'  => $version->standards->count(),
            'indicatorsCount' => $indicatorsCount,
            'totalWeight'     => (float) $version->standards->sum('weight'),
            'isLocked'        => (bool) $version->is_locked,
            'lockedAt'        => $version->locked_at?->toIso8601String() ?? $version->updated_at->toIso8601String(),
            'checksum'        => $version->digital_hash ?? hash('sha256', "ACTIVE_STANDARDS_{$version->version_id}"),
            'governanceNote'  => 'إصدار معتمد رسمياً بقرار وزاري — يُحظر أي تعديل عليه أو على أوزانه أثناء سريان الدورة.',
        ], 'تم جلب بيانات الإصدار المعياري النشط بنجاح.');
    }

    /**
     * شجرة المعايير الوطنية السبعة ومؤشراتها الـ 109 لاختيار بنود الاستكمال
     * GET /api/v1/supervision/standards-tree
     */
    public function nationalStandardsTree(): JsonResponse
    {
        $version = StandardVersion::with(['standards.subStandards.indicators'])
            ->where('status', 'Active')
            ->first()
            ?? StandardVersion::where('status', 'Approved')->first()
            ?? StandardVersion::first();

        if (!$version) {
            return ApiResponse::notFound('لا يوجد إصدار معياري نشط حالياً.');
        }

        $tree = $version->standards->map(function ($std) {
            return [
                'standardId'   => $std->standard_id,
                'name'         => $std->name,
                'code'         => $std->code ?? "STD-{$std->standard_id}",
                'weight'       => (float) $std->weight,
                'subStandards' => $std->subStandards->map(function ($sub) {
                    return [
                        'subStandardId' => $sub->sub_standard_id,
                        'name'          => $sub->name,
                        'code'          => $sub->code ?? "SUB-{$sub->sub_standard_id}",
                        'indicators'    => $sub->indicators->map(function ($ind) {
                            return [
                                'indicatorId' => $ind->indicator_id,
                                'code'        => $ind->code ?? "IND-{$ind->indicator_id}",
                                'title'       => $ind->name ?? $ind->title ?? 'مؤشر تقييمي',
                                'weight'      => (float) $ind->weight,
                            ];
                        })->values()->toArray(),
                    ];
                })->values()->toArray(),
            ];
        })->values()->toArray();

        return ApiResponse::success($tree, 'تم جلب شجرة المعايير الوطنية بنجاح.');
    }

    /**
     * 3.2. سجل ومتابعة طلبات الاستكمال في النطاق الجغرافي للمشرف (Screen 5 Tracker)
     * GET /api/v1/supervision/completion-requests
     */
    public function completionRequestsTracker(Request $request): JsonResponse
    {
        $supervisorGov = $this->getSupervisorGovernorate($request->user());

        $cycleId = $request->query('cycle_id');
        $activeCycle = $cycleId
            ? EvaluationCycle::find($cycleId)
            : EvaluationCycle::where('status', 'Active')->latest('cycle_id')->first();

        $query = CompletionRequest::with([
            'submission.report.evaluation.school',
            'submission.report.evaluation.cycle',
            'items.indicator.subStandard.standard',
            'issuedBy',
        ])
        ->when($activeCycle, function ($q) use ($activeCycle) {
            $q->whereHas('submission.report.evaluation', fn ($sq) => $sq->where('cycle_id', $activeCycle->cycle_id));
        })
        ->when($supervisorGov, function ($q) use ($supervisorGov) {
            $q->whereHas('submission.report.evaluation.school', fn ($sq) => $sq->where('governorate', $supervisorGov));
        })
        ->orderBy('request_id', 'desc');

        $allRequests = $query->get();

        $totalCount = $allRequests->count();
        $openCount = 0;
        $resubmittedCount = 0;
        $overdueCount = 0;

        $items = $allRequests->map(function ($cr) use (&$openCount, &$resubmittedCount, &$overdueCount) {
            $submission = $cr->submission;
            $evaluation = $submission?->report?->evaluation;
            $school = $evaluation?->school;
            $cycle = $evaluation?->cycle;

            $status = $cr->status;
            $subStatus = $submission?->status ?? 'NeedsCompletion';
            $attemptNo = (int) ($submission?->attempt_no ?? 1);

            $deadline = $cr->completion_deadline ? Carbon::parse($cr->completion_deadline) : null;
            $isOverdue = $status === 'Open' && $deadline && now()->gt($deadline);
            $isResubmitted = ($attemptNo > 1 && ($subStatus === 'Submitted' || $subStatus === 'UnderReview' || $status === 'UnderReview'));

            if ($status === 'Open') {
                $openCount++;
                if ($isOverdue) {
                    $overdueCount++;
                }
            }
            if ($isResubmitted) {
                $resubmittedCount++;
            }

            $daysRemaining = $deadline ? (int) now()->diffInDays($deadline, false) : 0;

            $statusDisplay = match (true) {
                $isResubmitted                         => 'أُعيد رفعها للمراجعة',
                $isOverdue                             => 'متأخر عن المهلة',
                $status === 'Open'                     => 'قيد الاستيفاء بالمدرسة',
                $status === 'Resolved' || $status === 'Closed' => 'مكتمل الاستيفاء',
                default                                => $status,
            };

            $formattedItems = $cr->items->map(function ($item) {
                return [
                    'id'                 => $item->request_item_id,
                    'indicatorId'        => $item->indicator_id,
                    'code'               => $item->indicator?->code ?? "IND-{$item->indicator_id}",
                    'title'              => $item->indicator?->name ?? $item->indicator?->title ?? 'مؤشر تقييمي',
                    'standardName'       => $item->indicator?->subStandard?->standard?->name ?? 'معيار عام',
                    'missingDescription' => $item->missing_description,
                    'allowedActions'     => $item->allowed_actions ?: ['upload_replace_evidence'],
                    'status'             => $item->status,
                ];
            })->values()->toArray();

            return [
                'requestId'              => $cr->request_id,
                'evaluationId'           => $evaluation?->evaluation_id,
                'submissionId'           => $submission?->submission_id,
                'schoolId'               => $school?->school_id,
                'schoolName'             => $school?->school_name ?? $school?->name ?? 'مدرسة التقييم',
                'schoolCode'             => $school?->school_code ?? "SCH-{$school?->school_id}",
                'governorate'            => $school?->governorate ?? 'غير محدد',
                'directorate'            => $school?->educational_district ?? 'غير محدد',
                'attemptNo'              => $attemptNo,
                'status'                 => $status,
                'submissionStatus'       => $subStatus,
                'statusDisplay'          => $statusDisplay,
                'isOverdue'              => $isOverdue,
                'isResubmitted'          => $isResubmitted,
                'issuedAt'               => $cr->created_at?->toIso8601String(),
                'deadline'               => $deadline?->toDateString(),
                'deadlineFormatted'      => $deadline?->format('Y-m-d'),
                'deadlineExtendedAt'     => $cr->deadline_extended_at?->toIso8601String(),
                'extensionsCount'        => (int) $cr->deadline_extensions_count,
                'daysRemaining'          => $daysRemaining,
                'itemsCount'             => $cr->items->count(),
                'items'                  => $formattedItems,
                'notes'                  => $cr->notes ?? '',
                'cycleEndDate'           => $cycle?->end_date ? Carbon::parse($cycle->end_date)->toDateString() : null,
                'cycleMaxCompletionDays' => (int) ($cycle?->max_completion_days ?? 14),
                'cycleName'              => $cycle?->name ?? 'الدورة الحالية',
                'issuedByName'           => $cr->issuedBy?->full_name ?? $cr->issuedBy?->name ?? 'المشرف الوزاري',
            ];
        })->values()->toArray();

        return ApiResponse::success([
            'summary' => [
                'totalRequests'       => $totalCount,
                'openRequests'        => $openCount,
                'resubmittedRequests' => $resubmittedCount,
                'overdueRequests'     => $overdueCount,
            ],
            'requests' => $items,
        ], 'تم استرجاع سجل طلبات الاستكمال بنجاح.');
    }

    /**
     * 4. إصدار طلب استكمال موجه للمدرسة (تفويض كامل إلى المحرك الموحد CompletionRequestController)
     * POST /api/v1/evaluation-submissions/{id}/completion-requests
     */
    public function createCompletionRequest(Request $request, int $id): JsonResponse
    {
        $submission = EvaluationSubmission::with('report.evaluation')->find($id);
        $evalId = $submission?->report?->evaluation?->evaluation_id ?? $id;

        return app(CompletionRequestController::class)->store($request, $evalId);
    }
}
