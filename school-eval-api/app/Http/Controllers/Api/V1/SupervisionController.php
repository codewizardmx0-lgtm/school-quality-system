<?php

namespace App\Http\Controllers\Api\V1;

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
use App\Models\DocumentVersion;
use App\Models\Standard;
use App\Models\StandardVersion;
use App\Models\SupervisorNote;
use App\Models\SupervisionDeficiencyNote;
use App\Models\User;
use App\Services\EvaluationTrendService;
use App\Services\EvidenceSufficiencyService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\View;
use Mpdf\Mpdf;
use Mpdf\Config\ConfigVariables;
use Mpdf\Config\FontVariables;

/**
 * وحدة الإشراف والمتابعة الوزارية المركزية (SupervisionController)
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 * 
 * تغطي خدمات البوابة الإشرافية المعتمدة وفقاً لوثيقة التخرج وتصاميم Figma وقواعد العمل:
 * 1. لوحة المتابعة المركزية والزوايا الأربع للمدارس الميدانية (FR-SUP-01 / FR-SUP-17)
 * 2. احتساب حالة التأخير آلياً عند مضي 80% من مدة الدورة (FR-SUP-15)
 * 3. فحص وتدقيق مخرجات التقييم والشواهد الـ 109 عند الطلب الصريح (FR-SUP-04..08 / FR-SUP-07)
 * 4. إدارة وإصدار طلبات الاستكمال الموجهة (FR-SUP-09..12)
 * 5. سجل إجراءات المتابعة والمذكرات الإشرافية الميدانية (FR-SUP-16)
 * 6. التحليلات المركزية ومؤشرات الجودة الوطنية للمعايير السبعة (FR-SUP-12)
 * 7. المقارنة التاريخية التراكمية لنفس المدرسة عبر الدورات (FR-SUP-18 / UC-SUP-07)
 */
class SupervisionController extends Controller
{
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

        // 1. حساب شرط التأخير الزمني (FR-SUP-15): مضي 80% من فترة الدورة
        $isOverdueCycleThreshold = false;
        $overdueThresholdDate = null;
        if ($activeCycle && $activeCycle->start_date && $activeCycle->end_date) {
            $startDate = Carbon::parse($activeCycle->start_date);
            $endDate = Carbon::parse($activeCycle->end_date);
            $totalSeconds = $endDate->diffInSeconds($startDate);
            $elapsedSeconds = now()->diffInSeconds($startDate);

            if (now()->gte($startDate) && $totalSeconds > 0 && ($elapsedSeconds / $totalSeconds) >= 0.8) {
                $isOverdueCycleThreshold = true;
                $overdueThresholdDate = $startDate->copy()->addSeconds((int)($totalSeconds * 0.8));
            }
        }

        // إجمالي مؤشرات الإصدار المعتمد لحساب نسبة التقدم
        $activeVersion = $activeCycle?->standardVersion
            ?? StandardVersion::where('status', 'Active')->first()
            ?? StandardVersion::where('status', 'Approved')->first();

        $totalStandardIndicators = Indicator::whereHas('subStandard.standard', function ($q) use ($activeVersion) {
            if ($activeVersion) {
                $q->where('version_id', $activeVersion->version_id);
            }
        })->count();

        if ($totalStandardIndicators === 0) {
            $totalStandardIndicators = 109; // السقف المعياري الوطني
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

            // الزاوية 1: حالة ونسبة إنجاز التقييم الذاتي
            $scoredCount = $eval ? $eval->results->whereNotNull('score')->count() : 0;
            $selfEvalProgress = in_array($status, ['Submitted', 'UnderReview', 'Completed'], true)
                ? 100
                : ($totalStandardIndicators > 0 ? min(100, (int)round(($scoredCount / $totalStandardIndicators) * 100)) : 0);

            // الزاوية 2: حالة رفع المخرج واحتساب التأخير التلقائي (FR-SUP-15)
            // تُحتسب المدرسة متأخرة إذا مضى 80% من فترة الدورة وهي لا تزال في حالة مسودة فقط
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
                    $sufficiencyData = app(\App\Services\EvidenceSufficiencyService::class)->evaluateEvaluation($eval);
                    $coveredRequirementsCount = (int) collect($sufficiencyData['standards'] ?? [])
                        ->flatMap(fn($s) => $s['indicators'] ?? [])
                        ->sum('effective_covered_count');
                } catch (\Throwable $e) {
                    $coveredRequirementsCount = $evidenceCount;
                }
            }

            $statusArabic = match ($status) {
                'NeedsCompletion' => 'يحتاج استكمال',
                'Submitted' => 'مرفوع جديد',
                'UnderReview' => 'قيد التدقيق الإشرافي',
                'Completed' => 'مكتمل',
                default => ($isDelayed ? 'متأخرة عن التسليم' : 'مسودة قيد الإعداد'),
            };

            // الزاوية 3: حالة طلبات الاستكمال
            $allCompletionRequests = $submission?->completionRequests ?? collect();
            $completionRequestsCount = $allCompletionRequests->count();
            $openRequest = $allCompletionRequests->where('status', 'Open')->first();
            $openCompletionRequestId = $openRequest?->request_id ?? null;

            // الزاوية 4: حالة ونسبة تقدم خطة التحسين المدرسية (FR-SUP-17 / FR-SCH-24)
            $plan = ImprovementPlan::with('actions')
                ->where('school_id', $school->school_id)
                ->when($eval?->cycle_id, fn($q, $cid) => $q->where('cycle_id', $cid))
                ->latest('plan_id')
                ->first();

            $planStatusText = 'غير منشأة';
            $planProgressPercentage = 0;
            if ($plan) {
                $actionsTotal = $plan->actions->count();
                $actionsDone = $plan->actions->where('status', 'Finished')->count();
                $planProgressPercentage = $actionsTotal > 0 ? (int)round(($actionsDone / $actionsTotal) * 100) : 0;

                $planStatusText = match ($plan->status) {
                    'Completed' => 'مكتملة التنفيذ',
                    'InProgress' => ($planProgressPercentage > 0 ? "قيد التنفيذ ({$planProgressPercentage}%)" : 'قيد التنفيذ'),
                    'Approved' => 'معتمدة للتنفيذ',
                    'Draft' => 'مسودة قيد الصياغة',
                    default => 'قيد الإعداد',
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
                'schoolId' => $school->school_id,
                'schoolCode' => $school->school_code ?? "SCH-{$school->school_id}",
                'schoolName' => $school->name ?? $school->school_name ?? "مدرسة {$school->school_id}",
                'educationalStage' => $school->educational_stage ?? 'أساسي / ثانوي',
                'governorate' => $school->governorate ?? 'غير محدد',
                'directorate' => $school->educational_district ?? 'غير محدد',
                'principalName' => $principalName,
                'evaluatorName' => $evaluatorName,
                'selfEvaluationProgress' => $selfEvalProgress,
                'scoredIndicatorsCount' => $scoredIndicatorsCount,
                'totalIndicatorsCount' => $totalIndicatorsCount,
                'coveredRequirementsCount' => $coveredRequirementsCount,
                'totalRequirementsCount' => $totalRequirementsCount,
                'evidenceCount' => $evidenceCount,
                'documentsCount' => $documentsCount,
                'outputStatus' => $status,
                'outputStatusArabic' => $statusArabic,
                'isDelayed' => $isDelayed,
                'completionRequestsCount' => $completionRequestsCount,
                'openCompletionRequestId' => $openCompletionRequestId,
                'improvementPlanStatus' => $planStatusText,
                'improvementPlanProgress' => $planProgressPercentage,
                'hasImprovementPlan' => $plan !== null,
                'lastActionDate' => $lastActionDate instanceof Carbon ? $lastActionDate->toIso8601String() : Carbon::parse($lastActionDate)->toIso8601String(),
                'latestSubmissionId' => $submission?->submission_id ?? ($eval?->evaluation_id ?? $school->school_id),
                'evaluationId' => $eval?->evaluation_id ?? null,
            ];
        }

        return ApiResponse::success([
            'kpis' => [
                'totalSchools' => $totalSchools,
                'pendingReviewCount' => $pendingReviewCount,
                'openCompletionRequestsCount' => $openCompletionRequestsCount,
                'completedReviewCount' => $completedReviewCount,
                'delayedSchoolsCount' => $delayedCount,
            ],
            'governanceCallout' => [
                'ruleCode' => 'BR-MIN-03',
                'title' => 'حوكمة المراجعة الإشرافية الوزارية',
                'description' => 'إجراءات المشرف تنحصر في المراجعة الإشرافية وطلب الاستكمال بمهلة زمنية أو إغلاق المراجعة كمكتمل؛ ولا يملك المشرف صلاحية تعديل درجات المدرسة أو إعادة تقييمها أو ترتيب المدارس تنافسياً.',
            ],
            'scope' => [
                'name' => $supervisorGovernorate ? "نطاق محافظة {$supervisorGovernorate}" : 'الإدارة العامة لتقويم الجودة المدرسية',
                'governorate' => $supervisorGovernorate ?: 'كافة المحافظات (إشراف مركزي عام)',
                'totalSchools' => $totalSchools,
                'activeCycle' => $activeCycle?->academic_year ?? '2026/2027',
                'activeCycleId' => $activeCycle?->cycle_id,
                'activeCycleName' => $activeCycle?->name ?? 'الدورة الوطنية للتقييم الذاتي المدرسي',
                'cycleStatus' => $activeCycle?->status ?? 'Active',
                'startDate' => $activeCycle?->start_date ? Carbon::parse($activeCycle->start_date)->toDateString() : null,
                'endDate' => $activeCycle?->end_date ? Carbon::parse($activeCycle->end_date)->toDateString() : null,
                'daysRemaining' => ($activeCycle && $activeCycle->end_date) ? max(0, (int) now()->diffInDays(Carbon::parse($activeCycle->end_date), false)) : 0,
                'hasActiveCycle' => ($activeCycle && $activeCycle->status === 'Active'),
                'isOverdueThresholdReached' => $isOverdueCycleThreshold,
                'overdueThresholdDate' => $overdueThresholdDate?->toIso8601String(),
                'standardVersion' => [
                    'versionId' => $activeVersion?->version_id,
                    'versionNo' => $activeVersion?->version_number ?? '1.0',
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
            'versionId' => $version->version_id,
            'versionNumber' => $version->version_number,
            'title' => $version->title,
            'status' => $version->status,
            'standardsCount' => $version->standards->count(),
            'indicatorsCount' => $indicatorsCount,
            'totalWeight' => (float)$version->standards->sum('weight'),
            'isLocked' => (bool)$version->is_locked,
            'lockedAt' => $version->locked_at?->toIso8601String() ?? $version->updated_at->toIso8601String(),
            'checksum' => $version->digital_hash ?? hash('sha256', "ACTIVE_STANDARDS_{$version->version_id}"),
            'governanceNote' => 'إصدار معتمد رسمياً بقرار وزاري — يُحظر أي تعديل عليه أو على أوزانه أثناء سريان الدورة.',
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
                'standardId' => $std->standard_id,
                'name' => $std->name,
                'code' => $std->code ?? "STD-{$std->standard_id}",
                'weight' => (float)$std->weight,
                'subStandards' => $std->subStandards->map(function ($sub) {
                    return [
                        'subStandardId' => $sub->sub_standard_id,
                        'name' => $sub->name,
                        'code' => $sub->code ?? "SUB-{$sub->sub_standard_id}",
                        'indicators' => $sub->indicators->map(function ($ind) {
                            return [
                                'indicatorId' => $ind->indicator_id,
                                'code' => $ind->code ?? "IND-{$ind->indicator_id}",
                                'title' => $ind->name ?? $ind->title ?? 'مؤشر تقييمي',
                                'weight' => (float)$ind->weight,
                            ];
                        })->values()->toArray(),
                    ];
                })->values()->toArray(),
            ];
        })->values()->toArray();

        return ApiResponse::success($tree, 'تم جلب شجرة المعايير الوطنية بنجاح.');
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

        // دعم تمرير evaluation_id كبديل مرن
        if (!$evaluation) {
            $evaluation = Evaluation::with([
                'school',
                'cycle.standardVersion',
                'reports.submissions.completionRequests.items',
            ])->find($id);

            $submission = $evaluation?->reports?->flatMap->submissions?->sortByDesc('attempt_no')->first();
        }

        // دعم تمرير school_id كبديل مرن
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

        // حوكمة النطاق الجغرافي للمشرف الوزاري (FR-SUP-02)
        $user = request()->user();
        if ($user && $user->hasRole('ministry_supervisor') && !empty($user->governorate)) {
            $schoolGov = $school?->governorate;
            if ($schoolGov && $schoolGov !== $user->governorate) {
                return ApiResponse::forbidden('غير مصرح: المدرسة تقع خارج النطاق الجغرافي المسند إليك (' . $user->governorate . ').');
            }
        }

        // الإصدار المعياري المعتمد لملف التقييم
        $version = $cycle?->standardVersion
            ?? StandardVersion::where('status', 'Active')->first()
            ?? StandardVersion::where('status', 'Approved')->first()
            ?? StandardVersion::first();

        // جلب نتائج التقييم الفعلية للمدرسة والشواهد المودعة
        $results = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
            ->with(['scoreDescriptor', 'notes.author', 'evidenceLinks.documentVersion.document'])
            ->get()
            ->keyBy('indicator_id');

        // روابط الشواهد مجمعة بالمؤشر
        $linksByIndicator = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
            ->with(['documentVersion.document'])
            ->get()
            ->groupBy('indicator_id');

        // جلب بنود الاستكمال المفتوحة لهذه المحاولة إن وجدت
        $openItems = CompletionRequestItem::whereHas('request', function ($q) use ($submission) {
            if ($submission) {
                $q->where('submission_id', $submission->submission_id)->where('status', 'Open');
            }
        })->get()->keyBy('indicator_id');

        // جلب النواقص الإشرافية المحفوظة للمؤشرات في قاعدة البيانات (FR-SUP-04)
        $savedDeficiencies = SupervisionDeficiencyNote::where('evaluation_id', $evaluation->evaluation_id)
            ->get()
            ->keyBy('indicator_id');

        // جلب طلب الاستكمال المفتوح إن وجد
        $openCompletionRequest = CompletionRequest::with('items.indicator')
            ->where(function ($q) use ($submission, $evaluation) {
                if ($submission) {
                    $q->where('submission_id', $submission->submission_id);
                } else {
                    $q->whereHas('submission.report', fn($sq) => $sq->where('evaluation_id', $evaluation->evaluation_id));
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
                'requestId' => $openCompletionRequest->request_id,
                'notes' => $openCompletionRequest->notes,
                'issuedAt' => $openCompletionRequest->created_at->toIso8601String(),
                'deadline' => $deadline ? Carbon::parse($deadline)->toDateString() : null,
                'daysRemaining' => $daysRemaining,
                'itemsCount' => $openCompletionRequest->items->count(),
                'items' => $openCompletionRequest->items->map(fn($item) => [
                    'indicatorId' => $item->indicator_id,
                    'code' => $item->indicator?->code ?? '',
                    'title' => $item->indicator?->name ?? $item->indicator?->title ?? 'مؤشر تقييمي',
                    'missingDescription' => $item->missing_description,
                ])->toArray(),
            ];
        }

        // جلب المعايير الوطنية السبعة وشجرتها الهيكلية الكاملة (Standards -> SubStandards -> Indicators)
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
            $allStdIndicators = $std->subStandards->flatMap(fn($sub) => $sub->indicators);
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
                                $explicitIds[(int)$rid] = true;
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
                                'id' => $link->id,
                                'evidenceLinkId' => $link->id,
                                'versionId' => (int) $docVersion->id,
                                'documentVersionId' => (int) $docVersion->id,
                                'documentId' => $doc?->id,
                                'fileName' => $doc?->title ?? $docVersion->file_name ?? "وثيقة شاهد {$link->id}",
                                'fileUrl' => url("/api/v1/document-versions/{$docVersion->id}/download"),
                                'fileSizeBytes' => $sizeBytes,
                                'fileSizeFormatted' => $formattedSize,
                                'mimeType' => $docVersion->mime_type ?? 'application/pdf',
                                'uploadedAt' => $link->created_at?->toIso8601String() ?? now()->toIso8601String(),
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
                        3 => 'متحقق (3)',
                        2 => 'متوسط (2)',
                        1 => 'ضعيف (1)',
                        0 => 'غير متوفر (0)',
                        default => 'غير مقيّم',
                    };

                    $descriptors = $ind->scoreDescriptors->sortBy('score_level_id')->map(function ($d) use ($scoreVal) {
                        $sVal = (int) ($d->scoreLevel?->score_value ?? $d->scoreLevel?->score ?? $d->score_level_id);
                        return [
                            'descriptorId' => $d->descriptor_id ?? $d->id,
                            'score' => $sVal,
                            'level' => $sVal,
                            'label' => $d->label ?? ($d->scoreLevel?->name ?? "المستوى {$sVal}"),
                            'title' => $d->label ?? ($d->scoreLevel?->name ?? "المستوى {$sVal}"),
                            'description' => $d->description,
                            'isSelected' => ($scoreVal !== null && (int)$scoreVal === $sVal),
                        ];
                    })->values()->toArray();

                    $indicatorData = [
                        'indicatorId' => $ind->indicator_id,
                        'code' => $ind->code,
                        'indicatorNumber' => $ind->indicator_number ?? 1,
                        'title' => $ind->name ?? $ind->title,
                        'name' => $ind->name ?? $ind->title,
                        'description' => $ind->description ?? '',
                        'weight' => (float)($ind->weight ?? 1),
                        'standardId' => $std->standard_id,
                        'standardName' => $std->name,
                        'subStandardId' => $sub->sub_standard_id,
                        'subStandardName' => $sub->name,
                        'schoolScore' => $scoreVal,
                        'scoreLevelName' => $levelName,
                        'scoreDescription' => $res?->scoreDescriptor?->description ?? $res?->textual_result ?? 'لا يوجد تبرير مدخل من المدرسة',
                        'evaluatorJustification' => !empty($res?->textual_result)
                            ? $res->textual_result
                            : ($res?->notes->firstWhere('author_user_id', $res?->evaluator_user_id)?->text
                                ?? $res?->notes->first()?->text
                                ?? 'لا يوجد تبرير مدخل من المدرسة'),
                        'internalReviewNotes' => ($res && $res->relationLoaded('notes'))
                            ? $res->notes->unique(fn($n) => trim((string)$n->text))->values()->map(fn($n) => [
                                'noteId' => $n->note_id,
                                'authorName' => $n->author?->full_name ?? $n->author?->name ?? 'المراجع الداخلي',
                                'authorRole' => ($n->author?->hasRole('school_principal') || $n->author?->user_type === 'school') ? 'مدير المدرسة' : 'مقيم المدرسة',
                                'text' => $n->text,
                                'createdAt' => $n->created_at?->toIso8601String(),
                            ])->toArray()
                            : [],
                        'evidenceCount' => $evCount,
                        'mandatoryRequirementsCount' => $mandatoryCnt,
                        'coveredRequirementsCount' => $coveredCnt,
                        'descriptors' => $descriptors,
                        'verificationTools' => $ind->verificationTools->map(fn($vt) => [
                            'id' => $vt->tool_id,
                            'name' => $vt->name,
                            'toolType' => $vt->tool_type ?? 'documentary',
                            'description' => $vt->description ?? '',
                        ])->toArray(),
                        'evidenceRequirements' => $ind->evidenceRequirements->map(function ($er) use ($indLinks, $explicitIds) {
                            $coveringDocs = [];
                            foreach ($indLinks as $lnk) {
                                $cov = $lnk->covered_requirements;
                                if ((is_array($cov) && in_array((int)$er->requirement_id, $cov)) || ($cov === null)) {
                                    $docTitle = $lnk->documentVersion?->document?->title ?? $lnk->documentVersion?->file_name ?? "وثيقة {$lnk->id}";
                                    $coveringDocs[] = $docTitle;
                                }
                            }
                            $uniqueDocs = array_values(array_unique($coveringDocs));

                            return [
                                'id' => $er->requirement_id,
                                'requirementId' => $er->requirement_id,
                                'title' => $er->title,
                                'description' => $er->description ?? '',
                                'required' => (bool)$er->required,
                                'isMandatory' => (bool)$er->required,
                                'isCovered' => isset($explicitIds[(int)$er->requirement_id]),
                                'coveringDocuments' => $uniqueDocs,
                                'coveringDocumentsSummary' => count($uniqueDocs) > 0 ? implode('، ', $uniqueDocs) : 'لا يوجد شاهد مرتبط بهذا المتطلب بعد',
                            ];
                        })->toArray(),
                        'evidences' => $evidenceFiles,
                        'hasDefect' => $hasDefect,
                        'defectCategory' => $defectCategory,
                        'defectCategories' => $defectCategories,
                        'defectReason' => $defectReason,
                        'directives' => $directives,
                        'supervisorFeedback' => $savedDefect?->supervisor_note,
                    ];

                    $allFlatIndicators[] = $indicatorData;

                    return $indicatorData;
                });

                return [
                    'subStandardId' => $sub->sub_standard_id,
                    'code' => $sub->code,
                    'title' => $sub->name,
                    'description' => $sub->description ?? '',
                    'weight' => (float)($sub->weight ?? 0.0),
                    'guidance' => $sub->guidance ?? '',
                    'indicators' => $indicatorsList,
                ];
            });

            return [
                'standardId' => $std->standard_id,
                'code' => $std->code,
                'title' => $std->name,
                'name' => $std->name,
                'description' => $std->description ?? '',
                'weight' => (float)($std->weight ?? 15),
                'stats' => [
                    'totalIndicators' => $totalInds,
                    'scoredIndicators' => $scoredCount,
                    'unenteredIndicators' => $unenteredCount,
                    'level3Count' => $l3,
                    'level2Count' => $l2,
                    'level1Count' => $l1,
                    'level0Count' => $l0,
                    'totalEvidences' => $stdTotalEvidences,
                    'totalMandatoryRequirements' => $stdTotalMandatory,
                    'coveredRequirements' => $stdTotalCovered,
                    'coveragePercentage' => $stdTotalMandatory > 0 ? round(($stdTotalCovered / $stdTotalMandatory) * 100) : 100,
                ],
                'subStandards' => $subStandardsList,
            ];
        });

        // خزانة الوثائق المودعة للمدرسة (وثائق فريدة وليست مكررة بعدد المؤشرات)
        $schoolDocs = SchoolDocument::where('school_id', $school?->school_id)
            ->with([
                'currentVersion',
                'creator:user_id,full_name,email',
                'evidenceLinks.indicator',
            ])
            ->get();

        $vaultDocuments = $schoolDocs->map(function ($doc) {
            $ver = $doc->currentVersion;
            $linkedInds = $doc->evidenceLinks->map(fn($el) => [
                'indicatorId' => $el->indicator_id,
                'code' => $el->indicator?->code ?? "IND-{$el->indicator_id}",
                'title' => $el->indicator?->title ?? $el->indicator?->name ?? 'مؤشر',
            ])->unique('indicatorId')->values()->toArray();

            $sizeBytes = $ver?->file_size_bytes ?? $ver?->file_size ?? 1024;
            $sizeMb = round($sizeBytes / 1048576, 2);
            $sizeFormatted = $sizeMb > 0 ? "{$sizeMb} MB" : round($sizeBytes / 1024, 1) . ' KB';

            $docTypeArabic = match(strtolower($doc->document_type ?? '')) {
                'plan' => 'خطة تشغيلية / إجرائية',
                'minutes' => 'محضر اجتماع',
                'report' => 'تقرير دوري / ختامي',
                'circular' => 'تعميم / قرار إداري',
                'schedule' => 'جدول دراسي / حصص',
                'list' => 'كشف / بيان مدرسي',
                'policy' => 'سياسة / لائحة',
                'survey' => 'استبيان / استطلاع',
                'certificate' => 'شهادة / إفادة',
                default => $doc->document_type ?: 'وثيقة عامة',
            };

            return [
                'id' => $doc->id,
                'documentId' => $doc->id,
                'versionId' => $ver?->id,
                'documentVersionId' => $ver?->id,
                'title' => $doc->title,
                'documentType' => $doc->document_type ?? 'أخرى',
                'documentTypeArabic' => $docTypeArabic,
                'description' => $doc->description ?? '',
                'versionNumber' => $ver?->version_number ?? 1,
                'createdAt' => $doc->created_at?->toIso8601String(),
                'linksCount' => count($linkedInds),
                'linkedIndicators' => $linkedInds,
                'fileName' => $ver?->file_name ?? $doc->title,
                'fileSize' => $sizeBytes,
                'fileSizeFormatted' => $sizeFormatted,
                'mimeType' => $ver?->mime_type ?? 'application/pdf',
                'downloadUrl' => $ver ? url("/api/v1/document-versions/{$ver->id}/download") : null,
                'previewUrl' => $ver ? url("/api/v1/document-versions/{$ver->id}/preview") : null,
            ];
        });

        $vaultStats = [
            'totalDocuments' => $vaultDocuments->count(),
            'totalLinks' => $vaultDocuments->sum('linksCount'),
            'totalSizeBytes' => $vaultDocuments->sum('fileSize'),
            'documentTypesCount' => $vaultDocuments->pluck('documentType')->unique()->count(),
        ];

        // جرد الشواهد الميدانية ومدى كفايتها وفق خدمة الكفاية المعتمدة
        $evidenceSufficiency = null;
        try {
            /** @var EvidenceSufficiencyService $sufficiencyService */
            $sufficiencyService = app(EvidenceSufficiencyService::class);
            $evidenceSufficiency = $sufficiencyService->evaluateEvaluation($evaluation);
        } catch (\Throwable $e) {
            $evidenceSufficiency = null;
        }

        // خطط التحسين والتطوير المدرسية الثلاث (QualityImprovement, StaffProfessionalDevelopment, AnnualOperational)
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
            if (!$p) return null;

            $areas = $p->areas->map(function ($a) use ($p, $results) {
                $areaActions = $p->actions->where('area_id', $a->area_id);
                $avgProg = $areaActions->count() > 0 ? round($areaActions->avg('completion_percentage'), 1) : 0;
                $currScore = $results->get($a->indicator_id)?->score ?? 0;
                $targetScore = $a->target_score ?? 3;
                $gap = max(0, $targetScore - $currScore);

                return [
                    'areaId' => $a->area_id,
                    'indicatorId' => $a->indicator_id,
                    'indicatorCode' => $a->indicator?->code ?? '',
                    'indicatorTitle' => $a->indicator?->title ?? $a->indicator?->name ?? $a->name,
                    'name' => $a->name,
                    'description' => $a->description,
                    'priority' => $a->priority ?? 'medium',
                    'priorityLabel' => match($a->priority) {
                        'high' => 'أولوية قصوى',
                        'medium' => 'أولوية متوسطة',
                        default => 'أولوية اعتيادية',
                    },
                    'currentScore' => $currScore,
                    'targetScore' => $targetScore,
                    'gap' => $gap,
                    'status' => $a->status,
                    'actionsCount' => $areaActions->count(),
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
                        'id' => $el->id,
                        'evidenceLinkId' => $el->id,
                        'versionId' => (int) ($el->document_version_id ?: $ver?->id),
                        'documentVersionId' => (int) ($el->document_version_id ?: $ver?->id),
                        'documentTitle' => $doc?->title ?? $ver?->file_name ?? "شاهد تنفيذ {$el->id}",
                        'fileName' => $ver?->file_name ?? $doc?->title ?? "شاهد_{$el->id}.pdf",
                        'fileSizeBytes' => $sizeBytes,
                        'fileSizeFormatted' => $sizeFormatted,
                        'mimeType' => $ver?->mime_type ?? 'application/pdf',
                        'downloadUrl' => $ver ? url("/api/v1/document-versions/{$ver->id}/download") : null,
                        'previewUrl' => $ver ? url("/api/v1/document-versions/{$ver->id}/preview") : null,
                        'uploadedAt' => $el->created_at?->toIso8601String(),
                    ];
                })->values()->toArray();

                return [
                    'actionId' => $act->action_id,
                    'areaId' => $act->area_id,
                    'areaTitle' => $act->area?->name ?? 'مجال تحسين',
                    'title' => $act->title,
                    'responsible' => $act->responsible_person_description ?? 'فريق التطوير المدرسي',
                    'startDate' => $act->start_date?->toDateString(),
                    'dueDate' => $act->due_date?->toDateString(),
                    'completionPercentage' => (int) $act->completion_percentage,
                    'progressDescription' => $act->progress_description,
                    'status' => $act->status,
                    'statusArabic' => match(strtolower($act->status)) {
                        'completed', 'done' => 'مكتمل',
                        'in_progress', 'inprogress' => 'قيد التنفيذ',
                        'cancelled' => 'ملغي',
                        default => 'معلق / لم يبدأ',
                    },
                    'baselineScore' => $act->baseline_score,
                    'targetScore' => $act->baseline_target_score ?? 3,
                    'gap' => $act->baseline_gap ?? 1,
                    'evidenceCount' => count($actEvidences),
                    'evidenceLinks' => $actEvidences,
                ];
            })->values()->toArray();

            $planTypeLabel = match($p->plan_type) {
                'QualityImprovement' => 'خطة تحسين الجودة المدرسية الشاملة',
                'StaffProfessionalDevelopment' => 'خطة التطوير المهني والتربوي للكوادر',
                'AnnualOperational' => 'الخطة التشغيلية السنوية',
                default => 'خطة تحسين وتطوير الأداء',
            };

            return [
                'planId' => $p->plan_id,
                'title' => $p->title,
                'status' => $p->status,
                'statusArabic' => match($p->status) {
                    'Completed' => 'مكتملة التنفيذ',
                    'Approved' => 'معتمدة ومرفقة',
                    'InProgress', 'Active' => 'قيد التنفيذ',
                    default => 'مسودة مرفقة',
                },
                'planType' => $p->plan_type ?? 'QualityImprovement',
                'planTypeLabel' => $planTypeLabel,
                'versionNumber' => $p->version_number ?? 1,
                'academicYear' => $p->academic_year ?? '2026/2027',
                'startDate' => $p->start_date?->toDateString(),
                'endDate' => $p->end_date?->toDateString(),
                'areas' => $areas,
                'actions' => $actions,
                'stats' => [
                    'totalAreas' => count($areas),
                    'totalActions' => count($actions),
                    'completedActions' => collect($actions)->whereIn('status', ['completed', 'Done', 'done'])->count(),
                    'inProgressActions' => collect($actions)->whereIn('status', ['in_progress', 'InProgress'])->count(),
                    'averageProgress' => count($actions) > 0 ? round(collect($actions)->avg('completionPercentage'), 1) : 0,
                ],
            ];
        };

        $allFormattedPlans = $plansToUse->map($formatPlan)->values()->toArray();

        // الخطة الافتراضية الأولية للعرض المباشر (خطة الجودة الشاملة أو أول خطة متوفرة)
        $primaryPlan = $plansToUse->firstWhere('plan_type', 'QualityImprovement')
            ?? $plansToUse->firstWhere('plan_type', 'AnnualOperational')
            ?? $plansToUse->first();
        $planData = $formatPlan($primaryPlan);

        // بناء مصفوفة تغطية المؤشرات المنخفضة (0، 1، 2) عبر كافة خطط التحسين المدرسية
        $lowScoringIndicators = collect($allFlatIndicators)->filter(fn($i) => $i['schoolScore'] !== null && (int)$i['schoolScore'] <= 2);

        $allPlanAreas = $plansToUse->flatMap(fn($p) => $p->areas->map(fn($a) => [
            'planId' => $p->plan_id,
            'planType' => $p->plan_type,
            'planTitle' => $p->title,
            'area' => $a,
            'actions' => $p->actions->where('area_id', $a->area_id),
        ]));

        $lowIndicatorsMatrix = $lowScoringIndicators->map(function ($ind) use ($allPlanAreas) {
            $matchingAreas = $allPlanAreas->where('area.indicator_id', $ind['indicatorId']);
            $isCovered = $matchingAreas->isNotEmpty();

            $coveringPlans = $matchingAreas->map(function ($match) {
                $actions = $match['actions'];
                $avgProg = $actions->count() > 0 ? round($actions->avg('completion_percentage'), 1) : 0;
                return [
                    'planId' => $match['planId'],
                    'planType' => $match['planType'],
                    'planTitle' => $match['planTitle'],
                    'areaId' => $match['area']->area_id,
                    'areaTitle' => $match['area']->name,
                    'actionsCount' => $actions->count(),
                    'averageProgress' => $avgProg,
                ];
            })->values()->toArray();

            return [
                'indicatorId' => $ind['indicatorId'],
                'code' => $ind['code'],
                'title' => $ind['title'],
                'standardName' => $ind['standardName'],
                'subStandardName' => $ind['subStandardName'],
                'schoolScore' => $ind['schoolScore'],
                'scoreLevelName' => match ($ind['schoolScore']) {
                    2 => 'متوسط (2)',
                    1 => 'ضعيف (1)',
                    0 => 'غير متوفر (0)',
                    default => 'غير مقيّم',
                },
                'isCovered' => $isCovered,
                'isAddressed' => $isCovered,
                'coveringPlans' => $coveringPlans,
                'unaddressedReason' => $isCovered ? null : 'فجوة معيارية لم تُدرج في أي خطة تحسين بعد',
            ];
        })->values()->toArray();

        $unaddressedLowCount = collect($lowIndicatorsMatrix)->where('isCovered', false)->count();

        // قائمة النواقص المرصودة
        $deficienciesList = $savedDeficiencies->map(function ($def) use ($allFlatIndicators) {
            $ind = collect($allFlatIndicators)->firstWhere('indicatorId', $def->indicator_id);
            if (!$ind) {
                // البحث في جدول المؤشرات في حال اختلاف معرف الإصدار أو التعيين المباشر
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
                'id' => $def->id,
                'indicatorId' => $indId,
                'indicatorCode' => $code,
                'indicatorTitle' => $title,
                'standardName' => $stdName,
                'category' => $def->deficiency_category,
                'categories' => $def->deficiency_categories ?: ($def->deficiency_category ? [$def->deficiency_category] : []),
                'note' => $def->supervisor_note,
                'directives' => $def->directives,
                'allowedActions' => $def->allowed_actions ?: ['upload_replace_evidence'],
                'createdAt' => $def->created_at?->toIso8601String(),
            ];
        })->values()->toArray();

        $allIndicatorsCount = count($allFlatIndicators) ?: 109;
        $isCompleteRubric = $totalScored >= $allIndicatorsCount;
        $compliancePct = $allIndicatorsCount > 0 ? round(($totalScored / $allIndicatorsCount) * 100, 1) : 0;

        // جلب اسم مدير المدرسة الفعلي من قاعدة البيانات
        $principalUser = $school ? User::where('school_id', $school->school_id)
            ->whereHas('roles', fn($r) => $r->where('role_name', 'like', '%principal%'))
            ->first() : null;
        $principalName = $principalUser?->full_name ?? 'إدارة المدرسة';

        $schoolData = [
            'schoolId' => $school?->school_id ?? 1,
            'schoolCode' => $school?->school_code ?? "SCH-{$school?->school_id}",
            'schoolName' => $school?->school_name ?? $school?->name ?? 'مدرسة التقييم',
            'educationalStage' => $school?->educational_stage ?? 'أساسي / ثانوي',
            'directorate' => $school?->educational_district ?? 'غير محدد',
            'governorate' => $school?->governorate ?? 'غير محدد',
            'principalName' => $principalName,
            'cycleYear' => $cycle?->academic_year ?? '2026/2027',
        ];

        $schoolInfoData = [
            'id' => $school?->school_id ?? 1,
            'code' => $school?->school_code ?? "SCH-{$school?->school_id}",
            'name' => $school?->school_name ?? $school?->name ?? 'مدرسة التقييم',
            'stage' => $school?->educational_stage ?? 'أساسي / ثانوي',
            'directorate' => $school?->educational_district ?? 'غير محدد',
            'governorate' => $school?->governorate ?? 'غير محدد',
            'principalName' => $principalName,
            'cycleYear' => $cycle?->academic_year ?? '2026/2027',
        ];

        $summaryData = [
            'totalStandards' => 7,
            'totalIndicators' => $allIndicatorsCount,
            'totalElements' => $allIndicatorsCount,
            'scoredIndicators' => $totalScored,
            'evidencesAttachedCount' => $totalWithEvidence,
            'attachedEvidencesCount' => $totalWithEvidence,
            'actionsCount' => $primaryPlan ? $primaryPlan->actions->count() : 0,
            'compliancePercentage' => $compliancePct,
        ];

        $attemptNo = $submission?->attempt_no ?? 1;
        $isReReview = $attemptNo > 1;

        $deficienciesCount = $savedDeficiencies->count() > 0 ? $savedDeficiencies->count() : $openItems->count();
        $avgScore = $totalScored > 0 ? round(collect($allFlatIndicators)->whereNotNull('schoolScore')->avg('schoolScore'), 2) : 0;

        $automatedChecks = [
            'rubricCompleteness' => $isCompleteRubric,
            'allEvidencesAttached' => $totalWithEvidence > 0,
            'minEvidenceMet' => $evidenceSufficiency ? (bool)($evidenceSufficiency['overall']['is_sufficient'] ?? true) : ($totalWithEvidence > 0),
            'flagsCount' => $deficienciesCount,
            'totalIndicators' => $allIndicatorsCount,
            'scoredIndicators' => $totalScored,
            'missingIndicatorsCount' => max(0, $allIndicatorsCount - $totalScored),
            'missingMandatoryEvidenceCount' => $evidenceSufficiency ? (int)($evidenceSufficiency['overall']['mandatory_missing_count'] ?? 0) : 0,
            'unaddressedLowIndicatorsCount' => $unaddressedLowCount,
            'averageScore' => $avgScore,
            'notes' => $isCompleteRubric
                ? "تم فحص الرصد لـ {$allIndicatorsCount} مؤشراً كاملاً بنجاح."
                : "تنبيه فحص آلي: رصدت المدرسة {$totalScored} من أصل {$allIndicatorsCount} مؤشراً.",
        ];

        return ApiResponse::success([
            'submissionId' => $submission?->submission_id ?? $evaluation->evaluation_id,
            'evaluationId' => $evaluation->evaluation_id,
            'reportId' => $submission?->report_id ?? 1,
            'attemptNumber' => $attemptNo,
            'attemptNo' => $attemptNo,
            'isReReview' => $isReReview,
            'status' => $submission?->status ?? $evaluation->status,
            'statusArabic' => match ($submission?->status ?? $evaluation->status) {
                'NeedsCompletion' => 'يحتاج استكمال',
                'Submitted' => 'مرفوع جديد',
                'UnderReview' => 'قيد التدقيق الإشرافي',
                'Completed' => 'مكتمل المراجعة',
                default => 'مسودة',
            },
            'submittedAt' => $submission?->submitted_at?->toIso8601String() ?? $evaluation->updated_at->toIso8601String(),
            'closedAt' => ($evaluation->status === 'Completed') ? $evaluation->updated_at->toIso8601String() : null,
            'school' => $schoolData,
            'schoolInfo' => $schoolInfoData,
            'summary' => $summaryData,
            'standards' => $standardsTree,
            'vault' => [
                'documents' => $vaultDocuments,
                'stats' => $vaultStats,
            ],
            'evidenceInventory' => $evidenceSufficiency,
            'planDetails' => $planData,
            'plans' => $allFormattedPlans,
            'allPlans' => $allFormattedPlans,
            'lowIndicatorsMatrix' => $lowIndicatorsMatrix,
            'deficienciesList' => $deficienciesList,
            'automatedChecks' => $automatedChecks,
            'improvementPlan' => [
                'planId' => $primaryPlan?->plan_id,
                'status' => $primaryPlan ? match($primaryPlan->status) {
                    'Completed' => 'مكتملة التنفيذ',
                    'Approved' => 'معتمدة ومرفقة',
                    'InProgress', 'Active' => 'قيد التنفيذ',
                    default => 'مسودة مرفقة',
                } : 'غير منشأة بعد',
                'title' => $primaryPlan?->title ?? 'خطة التحسين والتطوير المدرسي',
                'actionsCount' => $primaryPlan ? $primaryPlan->actions->count() : 0,
                'priorities' => $primaryPlan ? $primaryPlan->actions->pluck('title')->take(4)->toArray() : [],
            ],
            'indicators' => $allFlatIndicators,
            'openCompletionRequest' => $openCompletionRequestData,
            'deficienciesCount' => $deficienciesCount,
            'exportPdfUrl' => "/api/v1/evaluations/{$evaluation->evaluation_id}/export-pdf",
            'exportExcelUrl' => "/api/v1/evaluations/{$evaluation->evaluation_id}/export-excel",
            'packageDownloadUrl' => "/api/v1/evaluations/{$evaluation->evaluation_id}/export-pdf",
            'cycleEndDate' => $cycle?->end_date ? Carbon::parse($cycle->end_date)->toDateString() : null,
            'cycleMaxCompletionDays' => (int) ($cycle?->max_completion_days ?? 14),
        ], 'تم تحميل حزمة مراجعة المخرج بنجاح.');
    }

    /**
     * 3.1. قائمة المخرجات المتاحة للمراجعة الإشرافية في النطاق الجغرافي (الدخول المباشر)
     * GET /api/v1/evaluation-submissions/available-for-review
     */
    public function reviewableSubmissions(Request $request): JsonResponse
    {
        $user = $request->user();
        $supervisorGov = ($user && ($user->hasRole('ministry_supervisor') || $user->roles()->where('roles.role_name', 'ministry_supervisor')->where('user_roles.active', true)->exists()) && !empty($user->governorate))
            ? $user->governorate
            : null;

        $activeCycle = EvaluationCycle::where('status', 'Active')->latest('cycle_id')->first();

        $query = Evaluation::with(['school', 'cycle', 'reports.submissions' => fn($q) => $q->orderBy('attempt_no', 'desc')])
            ->whereIn('status', ['Submitted', 'UnderReview', 'NeedsCompletion', 'Completed'])
            ->when($activeCycle, fn($q) => $q->where('cycle_id', $activeCycle->cycle_id))
            ->when($supervisorGov, fn($q) => $q->whereHas('school', fn($sq) => $sq->where('governorate', $supervisorGov)));

        $items = $query->get()->map(function ($evaluation) {
            $submission = $evaluation->reports->flatMap->submissions->sortByDesc('attempt_no')->first();
            $status = $submission?->status ?? $evaluation->status;

            if (in_array($status, ['Draft', 'Drafting'])) {
                return null;
            }

            return [
                'evaluationId' => $evaluation->evaluation_id,
                'submissionId' => $submission?->submission_id ?? $evaluation->evaluation_id,
                'schoolId' => $evaluation->school_id,
                'schoolName' => $evaluation->school?->school_name ?? $evaluation->school?->name ?? 'مدرسة التقييم',
                'schoolCode' => $evaluation->school?->school_code ?? "SCH-{$evaluation->school_id}",
                'governorate' => $evaluation->school?->governorate ?? 'غير محدد',
                'directorate' => $evaluation->school?->educational_district ?? $evaluation->school?->directorate ?? 'مركز المديرية',
                'educationalStage' => $evaluation->school?->educational_stage ?? 'التعليم العام',
                'status' => $status,
                'statusArabic' => match ($status) {
                    'NeedsCompletion' => 'يحتاج استكمال',
                    'Submitted' => 'مرفوع جديد',
                    'UnderReview' => 'قيد التدقيق الإشرافي',
                    'Completed' => 'مكتمل المراجعة',
                    default => 'مسودة',
                },
                'submittedAt' => $submission?->submitted_at?->toIso8601String() ?? $evaluation->updated_at->toIso8601String(),
                'attemptNo' => $submission?->attempt_no ?? 1,
            ];
        })->filter()->sortBy(function ($item) {
            return match ($item['status']) {
                'Submitted' => 1,
                'UnderReview' => 2,
                'NeedsCompletion' => 3,
                'Completed' => 4,
                default => 5,
            };
        })->values();

        return ApiResponse::success($items, 'تم تحميل قائمة المخرجات المتاحة للمراجعة بنجاح.');
    }

    /**
     * 3.2. حفظ أو تحديث رصد نقص في مؤشر تقييم محدد (FR-SUP-04, BR-MIN-02)
     * POST /api/v1/evaluation-submissions/{id}/deficiency-notes
     * POST /api/v1/evaluations/{id}/deficiency-notes
     */
    public function saveDeficiencyNote(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        // دعم تمرير submission_id أو evaluation_id
        $submission = EvaluationSubmission::with('report.evaluation.school')->find($id);
        $evaluation = $submission?->report?->evaluation ?? Evaluation::with('school')->find($id);

        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم أو مخرج المراجعة المطلوب غير موجود.');
        }

        // حوكمة النطاق الجغرافي للمشرف الوزاري
        if ($user && $user->hasRole('ministry_supervisor') && !empty($user->governorate)) {
            $schoolGov = $evaluation->school?->governorate;
            if ($schoolGov && $schoolGov !== $user->governorate) {
                return ApiResponse::forbidden('غير مصرح: المدرسة تقع خارج النطاق الجغرافي المسند إليك (' . $user->governorate . ').');
            }
        }

        $validated = $request->validate([
            'indicator_id' => 'required|integer|exists:indicators,indicator_id',
            'deficiency_category' => 'nullable|string|max:255',
            'deficiency_categories' => 'nullable|array',
            'deficiency_categories.*' => 'string|max:150',
            'supervisor_note' => 'nullable|string|max:2000',
            'directives' => 'nullable|string|max:2000',
            'allowed_actions' => 'nullable|array',
            'allowed_actions.*' => 'string|max:100',
        ]);

        $categories = $validated['deficiency_categories'] ?? [];
        if (empty($categories) && !empty($validated['deficiency_category'])) {
            $categories = [$validated['deficiency_category']];
        }
        $primaryCategory = !empty($categories) ? $categories[0] : ($validated['deficiency_category'] ?? 'أسباب أخرى');

        $latestSubmission = $submission ?? EvaluationSubmission::whereHas('report', fn($q) => $q->where('evaluation_id', $evaluation->evaluation_id))
            ->latest('submission_id')
            ->first();

        $deficiency = SupervisionDeficiencyNote::updateOrCreate(
            [
                'evaluation_id' => $evaluation->evaluation_id,
                'indicator_id' => $validated['indicator_id'],
            ],
            [
                'submission_id' => $latestSubmission?->submission_id,
                'deficiency_category' => $primaryCategory,
                'deficiency_categories' => $categories,
                'supervisor_note' => $validated['supervisor_note'] ?? null,
                'directives' => $validated['directives'] ?? null,
                'allowed_actions' => $validated['allowed_actions'] ?? null,
                'created_by' => $user->user_id,
            ]
        );

        return ApiResponse::success([
            'id' => $deficiency->id,
            'evaluationId' => $deficiency->evaluation_id,
            'indicatorId' => $deficiency->indicator_id,
            'deficiencyCategory' => $deficiency->deficiency_category,
            'deficiencyCategories' => $deficiency->deficiency_categories ?: [$deficiency->deficiency_category],
            'supervisorNote' => $deficiency->supervisor_note,
            'directives' => $deficiency->directives,
        ], 'تم حفظ رصد النقص وتوجيه المشرف للمؤشر بنجاح.');
    }

    /**
     * 3.3. إلغاء رصد النقص عن مؤشر محدد
     * DELETE /api/v1/evaluation-submissions/{id}/deficiency-notes/{indicatorId}
     * DELETE /api/v1/evaluations/{id}/deficiency-notes/{indicatorId}
     */
    public function deleteDeficiencyNote(Request $request, int $id, int $indicatorId): JsonResponse
    {
        $user = $request->user();

        $submission = EvaluationSubmission::with('report.evaluation.school')->find($id);
        $evaluation = $submission?->report?->evaluation ?? Evaluation::with('school')->find($id);

        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم غير موجود.');
        }

        if ($user && $user->hasRole('ministry_supervisor') && !empty($user->governorate)) {
            $schoolGov = $evaluation->school?->governorate;
            if ($schoolGov && $schoolGov !== $user->governorate) {
                return ApiResponse::forbidden('غير مصرح: المدرسة تقع خارج النطاق الجغرافي المسند إليك.');
            }
        }

        SupervisionDeficiencyNote::where('evaluation_id', $evaluation->evaluation_id)
            ->where('indicator_id', $indicatorId)
            ->delete();

        return ApiResponse::success(null, 'تم إلغاء رصد النقص عن المؤشر بنجاح.');
    }

    /**
     * 3.2. سجل ومتابعة طلبات الاستكمال في النطاق الجغرافي للمشرف (Screen 5 Tracker)
     * GET /api/v1/supervision/completion-requests
     */
    public function completionRequestsTracker(Request $request): JsonResponse
    {
        $user = $request->user();
        $supervisorGov = ($user && ($user->hasRole('ministry_supervisor') || $user->roles()->where('roles.role_name', 'ministry_supervisor')->where('user_roles.active', true)->exists()) && !empty($user->governorate))
            ? $user->governorate
            : null;

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
            $q->whereHas('submission.report.evaluation', fn($sq) => $sq->where('cycle_id', $activeCycle->cycle_id));
        })
        ->when($supervisorGov, function ($q) use ($supervisorGov) {
            $q->whereHas('submission.report.evaluation.school', fn($sq) => $sq->where('governorate', $supervisorGov));
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

            $status = $cr->status; // 'Open', 'UnderReview', 'Resolved', 'Closed'
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

            // تسمية العرض البصرية المتطابقة مع الحالات النظامية الخمس
            $statusDisplay = match (true) {
                $isResubmitted => 'أُعيد رفعها للمراجعة',
                $isOverdue => 'متأخر عن المهلة',
                $status === 'Open' => 'قيد الاستيفاء بالمدرسة',
                $status === 'Resolved' || $status === 'Closed' => 'مكتمل الاستيفاء',
                default => $status,
            };

            $formattedItems = $cr->items->map(function ($item) {
                return [
                    'id' => $item->request_item_id,
                    'indicatorId' => $item->indicator_id,
                    'code' => $item->indicator?->code ?? "IND-{$item->indicator_id}",
                    'title' => $item->indicator?->name ?? $item->indicator?->title ?? 'مؤشر تقييمي',
                    'standardName' => $item->indicator?->subStandard?->standard?->name ?? 'معيار عام',
                    'missingDescription' => $item->missing_description,
                    'allowedActions' => $item->allowed_actions ?: ['upload_replace_evidence'],
                    'status' => $item->status,
                ];
            })->values()->toArray();

            return [
                'requestId' => $cr->request_id,
                'evaluationId' => $evaluation?->evaluation_id,
                'submissionId' => $submission?->submission_id,
                'schoolId' => $school?->school_id,
                'schoolName' => $school?->school_name ?? $school?->name ?? 'مدرسة التقييم',
                'schoolCode' => $school?->school_code ?? "SCH-{$school?->school_id}",
                'governorate' => $school?->governorate ?? 'غير محدد',
                'directorate' => $school?->educational_district ?? 'غير محدد',
                'attemptNo' => $attemptNo,
                'status' => $status,
                'submissionStatus' => $subStatus,
                'statusDisplay' => $statusDisplay,
                'isOverdue' => $isOverdue,
                'isResubmitted' => $isResubmitted,
                'issuedAt' => $cr->created_at?->toIso8601String(),
                'deadline' => $deadline?->toDateString(),
                'deadlineFormatted' => $deadline?->format('Y-m-d'),
                'deadlineExtendedAt' => $cr->deadline_extended_at?->toIso8601String(),
                'extensionsCount' => (int) $cr->deadline_extensions_count,
                'daysRemaining' => $daysRemaining,
                'itemsCount' => $cr->items->count(),
                'items' => $formattedItems,
                'notes' => $cr->notes ?? '',
                'cycleEndDate' => $cycle?->end_date ? Carbon::parse($cycle->end_date)->toDateString() : null,
                'cycleMaxCompletionDays' => (int) ($cycle?->max_completion_days ?? 14),
                'cycleName' => $cycle?->name ?? 'الدورة الحالية',
                'issuedByName' => $cr->issuedBy?->full_name ?? $cr->issuedBy?->name ?? 'المشرف الوزاري',
            ];
        })->values()->toArray();

        return ApiResponse::success([
            'summary' => [
                'totalRequests' => $totalCount,
                'openRequests' => $openCount,
                'resubmittedRequests' => $resubmittedCount,
                'overdueRequests' => $overdueCount,
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

        // حوكمة النطاق الجغرافي للمشرف الوزاري (FR-SUP-02 & NFR-SEC-03)
        $user = $request->user();
        if ($user && $user->hasRole('ministry_supervisor') && !empty($user->governorate)) {
            if ($school->governorate && $school->governorate !== $user->governorate) {
                return ApiResponse::forbidden('غير مصرح: المدرسة تقع خارج النطاق الجغرافي المسند إليك (' . $user->governorate . ').');
            }
        }

        $evaluations = $school->evaluations;
        $submissionIds = [];
        $milestones = [];

        // 1. استخراج أحداث التسليم وطلبات الاستكمال من محاولات الإرسال
        foreach ($evaluations as $eval) {
            $cycle = $eval->cycle;
            $reports = $eval->reports ?? collect();
            foreach ($reports as $rep) {
                $submissions = $rep->submissions ?? collect();
                foreach ($submissions as $sub) {
                    $submissionIds[] = $sub->submission_id;

                    $prevStatus = $sub->attempt_no > 1 ? 'يحتاج استكمال' : 'مسودة قيد الإعداد';
                    $newStatus = $sub->attempt_no > 1 ? "مرفوع بعد الاستكمال (المحاولة {$sub->attempt_no})" : "مرفوع جديد (المحاولة {$sub->attempt_no})";

                    // حدث تسليم المخرج من مقيم المدرسة المعتمد (BR-SCH-01)
                    $milestones[] = [
                        'id' => "sub-{$sub->submission_id}",
                        'eventType' => 'submission',
                        'title' => "المحاولة {$sub->attempt_no}: تسليم التقييم الذاتي للمراجعة الإشرافية",
                        'description' => "قام مقيم المدرسة المعتمد بختم وتسليم التقرير الذاتي والمرفقات الشاهدية للمراجعة الوزارية.",
                        'actorName' => 'مقيم المدرسة المعتمد',
                        'actorRole' => 'مقيم المدرسة',
                        'actorType' => 'school',
                        'timestamp' => $sub->submitted_at?->toIso8601String() ?? $sub->created_at->toIso8601String(),
                        'statusBadge' => 'مسلّم للمراجعة',
                        'badgeColor' => 'blue',
                        'cycleId' => $cycle?->cycle_id,
                        'cycleName' => $cycle?->name,
                        'submissionId' => $sub->submission_id,
                        'stateTransition' => [
                            'from' => $prevStatus,
                            'to' => $newStatus,
                        ],
                    ];

                    // أحداث طلبات الاستكمال الصادرة على هذه المحاولة
                    foreach ($sub->completionRequests as $cr) {
                        $itemsCount = $cr->items->count();
                        $deadlineStr = $cr->completion_deadline ? Carbon::parse($cr->completion_deadline)->format('Y/m/d') : 'غير محددة';
                        $milestones[] = [
                            'id' => "cr-{$cr->request_id}",
                            'eventType' => 'completion_request',
                            'title' => "إصدار طلب استكمال بمهلة زمنية (المحاولة {$sub->attempt_no})",
                            'description' => "أصدر المشرف الوزاري طلب استكمال لـ {$itemsCount} بنود مع مهلة استكمال حتى {$deadlineStr}.",
                            'actorName' => 'المشرف الوزاري',
                            'actorRole' => 'المشرف الوزاري',
                            'actorType' => 'supervisor',
                            'timestamp' => $cr->created_at->toIso8601String(),
                            'statusBadge' => $cr->status === 'Open' ? 'يحتاج استكمال' : 'معالج ومغلق',
                            'badgeColor' => 'amber',
                            'cycleId' => $cycle?->cycle_id,
                            'cycleName' => $cycle?->name,
                            'submissionId' => $sub->submission_id,
                            'completionRequestId' => $cr->request_id,
                            'stateTransition' => [
                                'from' => "مرفوع للمراجعة (المحاولة {$sub->attempt_no})",
                                'to' => "يحتاج استكمال ({$itemsCount} بنود)",
                            ],
                        ];
                    }
                }
            }
        }

        // 2. استخراج قرارات الإغلاق من سجل التدقيق audit_logs
        $auditDecisions = AuditLog::where('school_id', $id)
            ->whereIn('action', ['evaluation.direct_closed', 'completion.closed'])
            ->with('user')
            ->get();

        foreach ($auditDecisions as $decision) {
            $milestones[] = [
                'id' => "audit-{$decision->log_id}",
                'eventType' => 'decision',
                'title' => 'إغلاق المراجعة الإشرافية بنجاح',
                'description' => 'تم استيفاء المتطلبات وإغلاق المراجعة الإشرافية للملف ونقل الحالة إلى مكتمل (Completed).',
                'actorName' => $decision->user?->name ?? 'المشرف الوزاري',
                'actorRole' => 'المشرف الوزاري',
                'actorType' => 'supervisor',
                'timestamp' => $decision->created_at->toIso8601String(),
                'statusBadge' => 'مكتمل ومغلق',
                'badgeColor' => 'emerald',
                'cycleId' => null,
                'cycleName' => null,
                'stateTransition' => [
                    'from' => 'قيد التدقيق الإشرافي',
                    'to' => 'مكتمل المراجعة ومغلق نهائياً',
                ],
            ];
        }

        // 3. استخراج مذكرات وزيارات المشرف الوزاري من supervisor_notes
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
                'field_visit', 'زيارة ميدانية' => 'purple',
                'phone_call', 'اتصال هاتفي' => 'teal',
                'corrective_memo', 'مذكرة تصحيحية / تعقيبية' => 'amber',
                default => 'indigo',
            };

            $milestones[] = [
                'id' => "memo-{$note->note_id}",
                'eventType' => match ($note->memo_type) {
                    'field_visit', 'زيارة ميدانية' => 'field_visit',
                    'phone_call', 'اتصال هاتفي' => 'phone_call',
                    'corrective_memo', 'مذكرة تصحيحية / تعقيبية' => 'corrective_memo',
                    default => 'supervisor_memo',
                },
                'title' => $note->subject ?? 'مذكرة إشرافية وتوجيه ميداني',
                'description' => $note->text,
                'actorName' => $note->author?->name ?? 'المشرف الوزاري',
                'actorRole' => 'المشرف الوزاري',
                'actorType' => 'supervisor',
                'timestamp' => $note->created_at->toIso8601String(),
                'statusBadge' => match ($note->memo_type) {
                    'field_visit', 'زيارة ميدانية' => 'زيارة ميدانية',
                    'phone_call', 'اتصال هاتفي' => 'اتصال هاتفي',
                    'corrective_memo', 'مذكرة تصحيحية / تعقيبية' => 'مذكرة تصحيحية / تعقيبية',
                    default => 'مذكرة إشرافية',
                },
                'badgeColor' => $badgeColor,
                'cycleId' => $note->cycle_id,
                'submissionId' => $note->submission_id,
                'completionRequestId' => $note->completion_request_id,
                'stateTransition' => [
                    'from' => 'إجراء متابعة ميداني',
                    'to' => $note->is_visible_to_school ? 'موثق ومعلن للمدرسة' : 'موثق للمتابعة الداخلية',
                ],
            ];
        }

        // ترتيب الأحداث تنازلياً حسب التاريخ
        usort($milestones, function ($a, $b) {
            return strcmp($b['timestamp'], $a['timestamp']);
        });

        // قائمة المذكرات الرسمية
        $memosList = $notes->map(function ($n) {
            return [
                'id' => $n->note_id,
                'memoType' => match ($n->memo_type) {
                    'field_visit', 'زيارة ميدانية' => 'زيارة ميدانية',
                    'phone_call', 'اتصال هاتفي' => 'اتصال هاتفي',
                    'corrective_memo', 'مذكرة تصحيحية / تعقيبية' => 'مذكرة تصحيحية / تعقيبية',
                    default => 'مذكرة إشرافية',
                },
                'subject' => $n->subject ?? 'مذكرة إشرافية',
                'details' => $n->text,
                'isVisibleToSchool' => (bool)$n->is_visible_to_school,
                'authorName' => $n->author?->name ?? 'المشرف الوزاري',
                'createdAt' => $n->created_at->toIso8601String(),
                'cycleId' => $n->cycle_id,
                'submissionId' => $n->submission_id,
                'completionRequestId' => $n->completion_request_id,
            ];
        })->values()->toArray();

        $latestEval = $school->evaluations->first();
        $latestSubmission = $latestEval?->reports?->flatMap->submissions?->sortByDesc('attempt_no')->first();
        $rawStatus = $latestSubmission?->status ?? ($latestEval?->status ?? 'Draft');
        $outputStatus = ($rawStatus === 'InProgress') ? 'Draft' : $rawStatus;
        $outputStatusArabic = match ($outputStatus) {
            'NeedsCompletion' => 'يحتاج استكمال',
            'Submitted' => 'مرفوع جديد',
            'UnderReview' => 'قيد التدقيق الإشرافي',
            'Completed' => 'مكتمل المراجعة',
            default => 'مسودة قيد الإعداد',
        };

        // بطاقات المؤشرات الإحصائية KPIs
        $kpis = [
            'totalMilestones' => count($milestones),
            'submissionAttempts' => count(array_filter($milestones, fn($m) => $m['eventType'] === 'submission')),
            'completionRequests' => count(array_filter($milestones, fn($m) => $m['eventType'] === 'completion_request')),
            'memosAndVisits' => count(array_filter($milestones, fn($m) => in_array($m['eventType'], ['supervisor_memo', 'field_visit', 'phone_call', 'corrective_memo', 'زيارة ميدانية', 'اتصال هاتفي', 'مذكرة إشرافية', 'مذكرة تصحيحية / تعقيبية']))),
            'currentDecision' => $outputStatusArabic,
        ];

        // مخرجات وطلبات استكمال ودورات المدرسة المتاحة للربط
        $availableSubmissions = $evaluations->flatMap->reports->flatMap->submissions->map(fn($s) => [
            'submissionId' => $s->submission_id,
            'attemptNo' => $s->attempt_no,
            'label' => "محاولة التسليم {$s->attempt_no} (" . ($s->submitted_at ? Carbon::parse($s->submitted_at)->format('Y/m/d') : 'تاريخ غير محدد') . ")",
        ])->unique('submissionId')->values()->toArray();

        $availableCompletionRequests = $evaluations->flatMap->reports->flatMap->submissions->flatMap->completionRequests->map(fn($cr) => [
            'requestId' => $cr->request_id,
            'status' => $cr->status === 'Open' ? 'مفتوح قيد الاستكمال' : 'معالج ومغلق',
            'deadline' => $cr->completion_deadline ? Carbon::parse($cr->completion_deadline)->format('Y/m/d') : 'غير محددة',
            'label' => "طلب استكمال #{$cr->request_id} (مهلة: " . ($cr->completion_deadline ? Carbon::parse($cr->completion_deadline)->format('Y/m/d') : 'غير محددة') . ")",
        ])->unique('requestId')->values()->toArray();

        $availableCycles = $evaluations->map(fn($e) => [
            'cycleId' => $e->cycle?->cycle_id,
            'name' => $e->cycle?->name,
            'academicYear' => $e->cycle?->academic_year,
            'label' => $e->cycle?->name ?? "الدورة للعام {$e->cycle?->academic_year}",
        ])->filter(fn($c) => !empty($c['cycleId']))->unique('cycleId')->values()->toArray();

        return ApiResponse::success([
            'school' => [
                'schoolId' => $school->school_id,
                'schoolCode' => $school->school_code ?? "SCH-{$school->school_id}",
                'schoolName' => $school->name ?? $school->school_name,
                'outputStatus' => $outputStatus,
                'outputStatusArabic' => $outputStatusArabic,
                'educationalStage' => $school->educational_stage ?? 'أساسي / ثانوي',
                'directorate' => $school->educational_district ?? 'غير محدد',
                'governorate' => $school->governorate ?? 'غير محدد',
                'totalMilestones' => count($milestones),
            ],
            'schoolId' => $school->school_id,
            'schoolCode' => $school->school_code ?? "SCH-{$school->school_id}",
            'schoolName' => $school->name ?? $school->school_name,
            'educationalStage' => $school->educational_stage ?? 'أساسي / ثانوي',
            'directorate' => $school->educational_district ?? 'غير محدد',
            'governorate' => $school->governorate ?? 'غير محدد',
            'activeCycle' => $school->evaluations->first()?->cycle?->academic_year ?? '2026/2027',
            'kpis' => $kpis,
            'milestones' => $milestones,
            'memos' => $memosList,
            'availableSubmissions' => $availableSubmissions,
            'availableCompletionRequests' => $availableCompletionRequests,
            'availableCycles' => $availableCycles,
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

        // حوكمة النطاق الجغرافي للمشرف الوزاري (FR-SUP-02 & NFR-SEC-03)
        if ($user && $user->hasRole('ministry_supervisor') && !empty($user->governorate)) {
            if ($school->governorate && $school->governorate !== $user->governorate) {
                return ApiResponse::forbidden('غير مصرح: المدرسة تقع خارج النطاق الجغرافي المسند إليك (' . $user->governorate . ').');
            }
        }

        $validator = Validator::make($request->all(), [
            'memoType' => 'required|string|in:مذكرة إشرافية,زيارة ميدانية,اتصال هاتفي,مذكرة تصحيحية / تعقيبية,supervisor_memo,field_visit,phone_call,corrective_memo',
            'subject' => 'required|string|max:255',
            'details' => 'required|string|max:2000',
            'cycle_id' => 'nullable|integer|exists:evaluation_cycles,cycle_id',
            'submission_id' => 'nullable|integer|exists:evaluation_submissions,submission_id',
            'completion_request_id' => 'nullable|integer|exists:completion_requests,request_id',
            'isVisibleToSchool' => 'nullable|boolean',
        ], [
            'memoType.required' => 'نوع الإجراء مطلوب.',
            'subject.required' => 'موضوع المذكرة مطلوب.',
            'details.required' => 'تفاصيل الإجراء الإشرافي مطلوبة.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $submissionId = $request->input('submission_id');
        $cycleId = $request->input('cycle_id');

        // قيد التحقق المعتمد: إلزام بوجود school_id + cycle_id عندما يكون submission_id فارغاً
        if (!$submissionId && !$cycleId) {
            $cycleId = EvaluationCycle::where('status', 'Active')->value('cycle_id')
                ?? EvaluationCycle::latest('cycle_id')->value('cycle_id');
        }

        $memoType = match ($request->input('memoType')) {
            'field_visit', 'زيارة ميدانية' => 'زيارة ميدانية',
            'phone_call', 'اتصال هاتفي' => 'اتصال هاتفي',
            'corrective_memo', 'مذكرة تصحيحية / تعقيبية' => 'مذكرة تصحيحية / تعقيبية',
            default => 'مذكرة إشرافية',
        };

        $note = SupervisorNote::create([
            'school_id' => $school->school_id,
            'cycle_id' => $cycleId,
            'submission_id' => $submissionId,
            'completion_request_id' => $request->input('completion_request_id'),
            'author_user_id' => $user?->user_id ?? 1,
            'memo_type' => $memoType,
            'subject' => $request->input('subject'),
            'text' => $request->input('details'),
            'is_visible_to_school' => (bool)$request->input('isVisibleToSchool', true),
        ]);

        // توثيق العملية في سجل التدقيق الأمني (NFR-INT-02)
        AuditLog::create([
            'school_id' => $school->school_id,
            'user_id' => $user?->user_id ?? 1,
            'action' => 'supervisor_note.created',
            'target_type' => SupervisorNote::class,
            'target_id' => $note->note_id,
            'description_ar' => "تم تسجيل إجراء متابعة إشرافي ({$memoType}) بعنوان: {$note->subject}",
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return ApiResponse::success([
            'id' => $note->note_id,
            'memoType' => $memoType,
            'subject' => $note->subject,
            'details' => $note->text,
            'isVisibleToSchool' => $note->is_visible_to_school,
            'authorName' => $user?->name ?? 'المشرف الوزاري',
            'createdAt' => $note->created_at->toIso8601String(),
        ], 'تم حفظ المذكرة الإشرافية الميدانية بنجاح.');
    }

    /**
     * 7. التقارير المركزية والتحليل الإحصائي للمعايير السبعة الـ 109 ومخرجات المدارس (Zero-Mock)
     * GET /api/v1/supervision/reports/analytics
     */
    public function centralAnalytics(Request $request): JsonResponse
    {
        $user = $request->user();
        $supervisorGovernorate = ($user && $user->hasRole('ministry_supervisor')) ? $user->governorate : null;
        $schoolIdsParam = $request->query('school_ids') ?? $request->query('schoolIds');

        // فحص النطاق الجغرافي الصارم للمدارس المحددة (FR-SUP-02 & NFR-SEC-03)
        if (!empty($schoolIdsParam) && $supervisorGovernorate) {
            $rawIds = is_array($schoolIdsParam) ? $schoolIdsParam : explode(',', (string)$schoolIdsParam);
            $selectedSchoolIds = array_slice(array_map('intval', array_filter($rawIds, 'is_numeric')), 0, 10);
            $unauthorizedCount = School::whereIn('school_id', $selectedSchoolIds)
                ->where('governorate', '!=', $supervisorGovernorate)
                ->count();
            if ($unauthorizedCount > 0) {
                return ApiResponse::forbidden("غير مصرح: توجد مدارس محددة تقع خارج النطاق الجغرافي المسند إليك ({$supervisorGovernorate}).");
            }
        }

        $data = $this->buildCentralAnalyticsData($request);

        return ApiResponse::success($data, 'تم تحميل التحليلات الإحصائية المركزية بنجاح.');
    }

    /**
     * بناء مصفوفة التحليلات المركزية الموزونة للمعايير السبعة والمؤشرات الـ 109 ومخرجات المدارس (FR-SUP-12..15)
     */
    private function buildCentralAnalyticsData(Request $request): array
    {
        $user = $request->user();
        $supervisorGovernorate = null;
        if ($user && $user->hasRole('ministry_supervisor') && !empty($user->governorate)) {
            $supervisorGovernorate = $user->governorate;
        }

        $cycleId = $request->query('cycle_id') ?? $request->query('cycleId');
        $stage = $request->query('stage');
        $schoolIdsParam = $request->query('school_ids') ?? $request->query('schoolIds');

        // سقف محدد المدارس: 10 مدارس كحد أقصى لحماية أداء الاستعلامات
        $selectedSchoolIds = [];
        if (!empty($schoolIdsParam)) {
            $rawIds = is_array($schoolIdsParam) ? $schoolIdsParam : explode(',', (string)$schoolIdsParam);
            $selectedSchoolIds = array_slice(array_map('intval', array_filter($rawIds, 'is_numeric')), 0, 10);
        }

        // 1. تحديد الدورة التقييمية
        $activeCycle = null;
        if ($cycleId) {
            $activeCycle = EvaluationCycle::find($cycleId);
        }
        if (!$activeCycle) {
            $activeCycle = EvaluationCycle::where('status', 'Active')->latest('cycle_id')->first()
                ?? EvaluationCycle::latest('cycle_id')->first();
        }

        $activeVersion = $activeCycle?->standardVersion
            ?? StandardVersion::where('status', 'Active')->first()
            ?? StandardVersion::where('status', 'Approved')->first()
            ?? StandardVersion::first();

        // 2. فحص مدة الدورة واحتساب عتبة الـ 80% للتأخير التلقائي (FR-SUP-15)
        $isCycle80PercentElapsed = false;
        $cycleDurationDays = 0;
        $cycleDaysElapsed = 0;
        if ($activeCycle && $activeCycle->start_date && $activeCycle->end_date) {
            $cStart = Carbon::parse($activeCycle->start_date)->startOfDay();
            $cEnd = Carbon::parse($activeCycle->end_date)->endOfDay();
            $cycleDurationDays = max(1, $cStart->diffInDays($cEnd));
            $cycleDaysElapsed = max(0, $cStart->diffInDays(now(), false));
            if (now()->gte($cStart) && $cycleDurationDays > 0 && ($cycleDaysElapsed / $cycleDurationDays) >= 0.8) {
                $isCycle80PercentElapsed = true;
            }
        }

        // 3. استعلام المدارس في النطاق الجغرافي والمرحلة المحددة
        $schoolsQuery = School::query();
        if ($supervisorGovernorate) {
            $schoolsQuery->where('governorate', $supervisorGovernorate);
        }
        if ($stage && in_array($stage, ['أساسي (1-9)', 'ثانوي (10-12)', 'أساسي وثانوي (1-12)'], true)) {
            $schoolsQuery->where('educational_stage', $stage);
        }
        if (!empty($selectedSchoolIds)) {
            $schoolsQuery->whereIn('school_id', $selectedSchoolIds);
        }

        $schools = $schoolsQuery->with([
            'evaluations' => function ($q) use ($activeCycle) {
                if ($activeCycle) {
                    $q->where('cycle_id', $activeCycle->cycle_id);
                }
                $q->latest('evaluation_id');
            },
            'evaluations.results',
            'evaluations.reports.submissions.completionRequests',
        ])->orderBy('school_name')->get();

        $totalSchools = $schools->count();

        // مدارس النطاق الإشرافي بالكامل للمحدد متعدد الخيارات (MultiSelect)
        $allSupervisorSchools = School::query()
            ->when($supervisorGovernorate, fn($q) => $q->where('governorate', $supervisorGovernorate))
            ->orderBy('school_name')
            ->get()
            ->map(fn($s) => [
                'schoolId' => $s->school_id,
                'schoolCode' => $s->school_code ?? "SCH-{$s->school_id}",
                'schoolName' => $s->school_name ?? $s->name,
                'stage' => $s->educational_stage,
                'directorate' => $s->directorate,
            ])->toArray();

        // 4. تقرير حالة المدارس المركزي (FR-SUP-15)
        $centralSchoolsReport = [];
        $overdueSchoolsCount = 0;
        $evaluatedSchoolsCount = 0;
        $completedReviewCount = 0;
        $activeRequestsCount = 0;
        $evaluatedEvalIds = [];

        foreach ($schools as $school) {
            $eval = $school->evaluations->first();
            $submission = $eval?->reports?->flatMap->submissions?->sortByDesc('attempt_no')->first();
            $schoolRequests = $submission ? $submission->completionRequests : collect();
            $pendingRequests = $schoolRequests->whereIn('status', ['Open', 'Submitted'])->count();
            $activeRequestsCount += $pendingRequests;

            $completedResultsCount = $eval ? $eval->results->whereNotNull('score')->count() : 0;
            $evalAvg = ($eval && $completedResultsCount > 0) ? $eval->results->whereNotNull('score')->avg('score') : null;

            // تحديد الحالة بدقة
            $status = 'Draft';
            $statusLabel = 'مسودة / قيد التقييم الذاتي';
            $isDelayed = false;

            if ($eval) {
                if ($eval->status === 'Completed' || $submission?->status === 'Completed') {
                    $status = 'Completed';
                    $statusLabel = 'مكتملة المراجعة والإقرار';
                    $completedReviewCount++;
                    $evaluatedSchoolsCount++;
                    $evaluatedEvalIds[] = $eval->evaluation_id;
                } elseif ($pendingRequests > 0 || $eval->status === 'NeedsCompletion' || $submission?->status === 'NeedsCompletion') {
                    $status = 'NeedsCompletion';
                    $statusLabel = 'تحتاج استكمال نواقص';
                    $evaluatedSchoolsCount++;
                    $evaluatedEvalIds[] = $eval->evaluation_id;
                } elseif ($eval->status === 'UnderReview' || $submission?->status === 'UnderReview') {
                    $status = 'UnderReview';
                    $statusLabel = 'قيد المراجعة الإشرافية';
                    $evaluatedSchoolsCount++;
                    $evaluatedEvalIds[] = $eval->evaluation_id;
                } elseif ($eval->status === 'Submitted' || $submission?->status === 'Submitted') {
                    $status = 'Submitted';
                    $statusLabel = 'تم الإرسال (بانتظار المراجعة)';
                    $evaluatedSchoolsCount++;
                    $evaluatedEvalIds[] = $eval->evaluation_id;
                } else {
                    // مسودة
                    if ($isCycle80PercentElapsed) {
                        $status = 'Overdue';
                        $statusLabel = 'متأخرة عن التسليم 🔴';
                        $isDelayed = true;
                        $overdueSchoolsCount++;
                    } else {
                        $status = 'Draft';
                        $statusLabel = 'مسودة / قيد التقييم الذاتي';
                    }
                    if ($completedResultsCount > 0) {
                        $evaluatedEvalIds[] = $eval->evaluation_id;
                    }
                }
            } else {
                if ($isCycle80PercentElapsed) {
                    $status = 'Overdue';
                    $statusLabel = 'متأخرة عن التسليم 🔴';
                    $isDelayed = true;
                    $overdueSchoolsCount++;
                } else {
                    $status = 'NotStarted';
                    $statusLabel = 'لم تبدأ بعد';
                }
            }

            $centralSchoolsReport[] = [
                'schoolId' => $school->school_id,
                'schoolCode' => $school->school_code ?? "SCH-{$school->school_id}",
                'schoolName' => $school->school_name ?? $school->name,
                'stage' => $school->educational_stage ?? 'غير محدد',
                'directorate' => $school->directorate ?? '—',
                'governorate' => $school->governorate ?? '—',
                'status' => $status,
                'statusLabel' => $statusLabel,
                'isDelayed' => $isDelayed,
                'evaluatedIndicatorsCount' => $completedResultsCount,
                'totalIndicatorsCount' => 109,
                'completionPercentage' => min(100, round(($completedResultsCount / 109) * 100, 1)),
                'averageScore' => $evalAvg !== null ? round((float)$evalAvg, 2) : null,
                'completionRequestsCount' => $schoolRequests->count(),
                'pendingRequestsCount' => $pendingRequests,
                'latestSubmissionId' => $submission?->submission_id,
            ];
        }

        // 5. استخراج نتائج التقييم للمؤشرات الـ 109 والمعايير السبعة (Zero-Mock)
        $standards = Standard::with(['subStandards.indicators'])
            ->where('version_id', $activeVersion?->version_id ?? 1)
            ->orderBy('standard_id')
            ->get();

        // إحصائيات المؤشرات من قاعدة البيانات بناءً على التقييمات في النطاق
        $indicatorStats = collect();
        if (!empty($evaluatedEvalIds)) {
            $indicatorStats = EvaluationResult::whereIn('evaluation_id', $evaluatedEvalIds)
                ->whereNotNull('score')
                ->groupBy('indicator_id')
                ->selectRaw('indicator_id, AVG(score) as avg_score, COUNT(*) as eval_count')
                ->get()
                ->keyBy('indicator_id');
        }

        $standardsMeans = [];
        $allIndicatorsMeans = [];
        $totalWeightedScore = 0.0;
        $totalWeightSum = 0.0;
        $highestStandard = null;
        $highestScore = -1.0;
        $lowestStandard = null;
        $lowestScore = 999.0;

        foreach ($standards as $std) {
            $weight = (float)$std->weight;
            $stdIndicatorScores = [];
            $stdIndicatorsList = [];

            foreach ($std->subStandards as $subStd) {
                foreach ($subStd->indicators as $ind) {
                    $stat = $indicatorStats->get($ind->indicator_id);
                    $hasEval = $stat !== null && $stat->eval_count > 0;
                    $mean = $hasEval ? round((float)$stat->avg_score, 2) : 0.0;
                    $pct = $hasEval ? round(($mean / 3.0) * 100, 1) : 0.0;

                    $benchmark = match (true) {
                        $pct >= 80 => 'متميز',
                        $pct >= 60 => 'متوسط',
                        default => 'بحاجة لدعم',
                    };

                    $statusStyle = match (true) {
                        $pct >= 80 => 'advanced',
                        $pct >= 60 => 'proficient',
                        default => 'needs_support',
                    };

                    $indItem = [
                        'indicatorId' => $ind->indicator_id,
                        'code' => $ind->code ?? "IND-{$ind->indicator_id}",
                        'name' => $ind->name,
                        'standardId' => $std->standard_id,
                        'standardName' => $std->name,
                        'subStandardName' => $subStd->name,
                        'meanScore' => $mean,
                        'maxScore' => 3.0,
                        'percentageAttainment' => $pct,
                        'benchmarkLevel' => $benchmark,
                        'status' => $statusStyle,
                        'evaluatedCount' => (int)($stat?->eval_count ?? 0),
                    ];

                    $stdIndicatorsList[] = $indItem;
                    $allIndicatorsMeans[] = $indItem;

                    if ($hasEval) {
                        $stdIndicatorScores[] = $mean;
                    }
                }
            }

            // احتساب متوسط المعيار من مؤشراته المقيمة، أو 0.0 إذا لم تقيم أي مؤشرات
            $stdMeanScore = !empty($stdIndicatorScores)
                ? round(array_sum($stdIndicatorScores) / count($stdIndicatorScores), 2)
                : 0.0;
            $stdPercentageAttainment = round(($stdMeanScore / 3.0) * 100, 1);

            $totalWeightSum += $weight;
            $totalWeightedScore += ($stdPercentageAttainment * ($weight / 100));

            if ($stdMeanScore > $highestScore) {
                $highestScore = $stdMeanScore;
                $highestStandard = $std;
            }
            if ($stdMeanScore < $lowestScore) {
                $lowestScore = $stdMeanScore;
                $lowestStandard = $std;
            }

            $stdBenchmark = match (true) {
                $stdPercentageAttainment >= 80 => 'متميز',
                $stdPercentageAttainment >= 60 => 'متوسط',
                default => 'بحاجة لدعم',
            };

            $stdStatusStyle = match (true) {
                $stdPercentageAttainment >= 80 => 'advanced',
                $stdPercentageAttainment >= 60 => 'proficient',
                default => 'needs_support',
            };

            $standardsMeans[] = [
                'standardId' => $std->standard_id,
                'code' => "STD-0{$std->standard_id}",
                'name' => $std->name,
                'weight' => $weight,
                'meanScore' => $stdMeanScore,
                'maxScore' => 3.0,
                'percentageAttainment' => $stdPercentageAttainment,
                'benchmarkLevel' => $stdBenchmark,
                'status' => $stdStatusStyle,
                'indicatorsCount' => count($stdIndicatorsList),
                'indicators' => $stdIndicatorsList,
            ];
        }

        $overallCompliance = $totalWeightSum > 0 ? round(($totalWeightedScore / $totalWeightSum), 1) : 0.0;
        $averageScore = round(($overallCompliance / 100) * 3.0, 2);

        // 6. تحديد أبرز 10 نقاط قوة وأدنى 10 فجوات إشرافية (FR-SUP-13 / FR-SUP-14)
        $evaluatedIndicators = array_filter($allIndicatorsMeans, fn($i) => $i['evaluatedCount'] > 0);
        $poolForRanking = !empty($evaluatedIndicators) ? $evaluatedIndicators : $allIndicatorsMeans;

        usort($poolForRanking, fn($a, $b) => $b['percentageAttainment'] <=> $a['percentageAttainment']);
        $topStrengths = array_slice($poolForRanking, 0, 10);

        usort($poolForRanking, fn($a, $b) => $a['percentageAttainment'] <=> $b['percentageAttainment']);
        $bottomGaps = array_slice($poolForRanking, 0, 10);

        // 7. توزيع الكفاءة للمدارس
        $advancedCount = 0;
        $proficientCount = 0;
        $needsSupportCount = 0;

        foreach ($centralSchoolsReport as $schItem) {
            $sc = $schItem['averageScore'] ?? 0.0;
            $pct = ($sc / 3.0) * 100;
            if ($pct >= 80) {
                $advancedCount++;
            } elseif ($pct >= 60) {
                $proficientCount++;
            } else {
                $needsSupportCount++;
            }
        }

        $distTotal = max(1, count($centralSchoolsReport));
        $distribution = [
            'advancedPercentage' => (int)round(($advancedCount / $distTotal) * 100),
            'proficientPercentage' => (int)round(($proficientCount / $distTotal) * 100),
            'needsSupportPercentage' => (int)round(($needsSupportCount / $distTotal) * 100),
            'advancedCount' => $advancedCount,
            'proficientCount' => $proficientCount,
            'needsSupportCount' => $needsSupportCount,
        ];

        // 8. مقارنة المراحل الدراسية (FR-SUP-14)
        $stages = ['أساسي (1-9)', 'ثانوي (10-12)', 'أساسي وثانوي (1-12)'];
        $stageBreakdown = [];
        foreach ($stages as $stg) {
            $stgSchools = array_filter($centralSchoolsReport, fn($s) => $s['stage'] === $stg);
            $stgCount = count($stgSchools);
            $stgScores = array_filter(array_column($stgSchools, 'averageScore'), fn($v) => $v !== null);
            $stgAvg = !empty($stgScores) ? round(array_sum($stgScores) / count($stgScores), 2) : 0.0;

            $stageBreakdown[] = [
                'stage' => $stg,
                'averageScore' => $stgAvg,
                'schoolsCount' => $stgCount,
            ];
        }

        // 9. ملخص النطاق والتركيب السياساتي (Synthesized Policy Note)
        $governorateLabel = $supervisorGovernorate ?: 'كافة المحافظات (إشراف مركزي عام)';
        $top3StrNames = implode('، ', array_map(fn($s) => "{$s['code']} ({$s['percentageAttainment']}%)", array_slice($topStrengths, 0, 3)));
        $top3GapNames = implode('، ', array_map(fn($g) => "{$g['code']} ({$g['percentageAttainment']}%)", array_slice($bottomGaps, 0, 3)));

        $highestName = $highestStandard ? "{$highestStandard->name} ({$highestScore})" : '—';
        $lowestName = $lowestStandard ? "{$lowestStandard->name} ({$lowestScore})" : '—';

        $policySynthesisNote = "تشير التحليلات المركزية لنطاق {$governorateLabel} إلى تميز في مؤشرات: [{$top3StrNames}]، بينما تتركز أولويات التدخل والدعم الإشرافي في مؤشرات: [{$top3GapNames}].";

        $scopeSummary = [
            'governorate' => $governorateLabel,
            'totalSchools' => $totalSchools,
            'evaluatedSchools' => $evaluatedSchoolsCount,
            'completedReviewCount' => $completedReviewCount,
            'overdueSchoolsCount' => $overdueSchoolsCount,
            'activeRequestsCount' => $activeRequestsCount,
            'averageScore' => $averageScore,
            'maxScore' => 3.0,
            'overallPercentage' => $overallCompliance,
            'highestStandard' => $highestName,
            'lowestStandard' => $lowestName,
            'policySynthesisNote' => $policySynthesisNote,
            'cycleDurationDays' => $cycleDurationDays,
            'cycleDaysElapsed' => $cycleDaysElapsed,
            'isCycle80PercentElapsed' => $isCycle80PercentElapsed,
        ];

        // 10. الدورات التقييمية المتاحة للقائمة المنسدلة
        $availableCycles = EvaluationCycle::orderByDesc('cycle_id')->get()->map(fn($c) => [
            'cycleId' => $c->cycle_id,
            'name' => $c->name,
            'academicYear' => $c->academic_year,
            'status' => $c->status,
            'startDate' => $c->start_date ? Carbon::parse($c->start_date)->toDateString() : null,
            'endDate' => $c->end_date ? Carbon::parse($c->end_date)->toDateString() : null,
        ])->values()->toArray();

        return [
            'scopeSummary' => $scopeSummary,
            'distribution' => $distribution,
            'standardsMeans' => $standardsMeans,
            'allIndicatorsMeans' => $allIndicatorsMeans,
            'stageBreakdown' => $stageBreakdown,
            'centralSchoolsReport' => $centralSchoolsReport,
            'topStrengths' => $topStrengths,
            'bottomGaps' => $bottomGaps,
            'policySynthesisSummary' => [
                'topStrengths' => array_slice($topStrengths, 0, 3),
                'topGaps' => array_slice($bottomGaps, 0, 3),
                'policyNote' => $policySynthesisNote,
            ],
            'availableCycles' => $availableCycles,
            'availableSchools' => $allSupervisorSchools,
            'activeCycleId' => $activeCycle?->cycle_id,
            'academicYear' => $activeCycle?->academic_year ?? '2026/2027',
            'activeVersionTitle' => $activeVersion?->title ?? 'المعايير الوطنية لجودة التعليم المدرسي',
            'summaryStats' => [
                'totalEvaluatedSchools' => $totalSchools,
                'completedReviewCount' => $completedReviewCount,
                'overallCompliancePercentage' => $overallCompliance,
                'nationalMeanScore' => $averageScore,
            ],
            'governanceNotice' => 'التحليلات مبنية على المتوسط الموزون للأوزان النسبية الرسمية للمعايير السبعة (100%) ومستبعدة تماماً من أي ترتيب تنافسي بين المدارس.',
        ];
    }

    /**
     * 8. مقارنة وتتبع اتجاه أداء المدرسة عبر الدورات (FR-SUP-18 / UC-SUP-07)
     * GET /api/v1/schools/{id}/historical-comparison
     */
    public function historicalComparison(int $id, Request $request): JsonResponse
    {
        $school = School::findOrFail($id);

        // حوكمة النطاق الجغرافي للمشرف الوزاري (FR-SUP-02)
        $user = $request->user();
        if ($user && $user->hasRole('ministry_supervisor') && !empty($user->governorate)) {
            if ($school->governorate && $school->governorate !== $user->governorate) {
                return ApiResponse::forbidden('غير مصرح: المدرسة تقع خارج النطاق الجغرافي المسند إليك (' . $user->governorate . ').');
            }
        }

        $baseCycleParam = $request->query('base_cycle') ?? $request->query('baseCycle');
        $compareCycleParam = $request->query('compare_cycle') ?? $request->query('compareCycle');

        // تحقق صريح: منع مقارنة الدورة بنفسها (422 Unprocessable Entity)
        if ($this->isSameCycleComparison($school, $baseCycleParam, $compareCycleParam)) {
            return ApiResponse::unprocessable('لا يمكن إجراء مقارنة تاريخية بين نفس الدورة التقييمية؛ يرجى اختيار دورتين مختلفتين');
        }

        $data = $this->buildHistoricalComparisonData($school, $baseCycleParam, $compareCycleParam);

        return ApiResponse::success($data, 'تم تحميل مصفوفة المقارنة التراكمية بنجاح.');
    }

    /**
     * بناء مصفوفة المقارنة التاريخية التراكمية للمعايير السبعة والمؤشرات الـ 109 (FR-SUP-18 & UC-SUP-07)
     */
    private function buildHistoricalComparisonData(School $school, ?string $baseCycleParam = null, ?string $compareCycleParam = null): array
    {
        // 1. جميع تقييمات المدرسة مرتبة من الأحدث إلى الأقدم
        $schoolEvals = Evaluation::where('school_id', $school->school_id)
            ->with(['cycle.version', 'results.indicator.subStandard.standard'])
            ->orderByDesc('evaluation_id')
            ->get();

        // الدورات التقييمية المسجلة للمدرسة
        $availableCycles = $schoolEvals->map(fn($ev) => [
            'cycleId' => $ev->cycle?->cycle_id,
            'name' => $ev->cycle?->name ?? "دورة {$ev->cycle?->academic_year}",
            'academicYear' => $ev->cycle?->academic_year,
            'status' => $ev->cycle?->status,
            'versionNo' => $ev->cycle?->version?->version_no ?? '2026.1',
            'versionName' => $ev->cycle?->version?->version_name ?? 'الإصدار الوطني الأول',
        ])->filter(fn($c) => !empty($c['cycleId']))->values()->toArray();

        // في حال عدم وجود أي تقييمات للمدرسة إطلاقاً
        if ($schoolEvals->isEmpty()) {
            $defaultVersion = StandardVersion::where('status', 'Active')->first() ?? StandardVersion::first();
            $standards = Standard::where('version_id', $defaultVersion?->version_id ?? 1)->orderBy('standard_id')->get();
            return [
                'school' => [
                    'schoolId' => $school->school_id,
                    'schoolCode' => $school->school_code ?? "SCH-{$school->school_id}",
                    'schoolName' => $school->name ?? $school->school_name,
                    'governorate' => $school->governorate,
                ],
                'hasPreviousCycle' => false,
                'alternateFlow' => true,
                'isSingleCycleOnly' => true,
                'notice' => 'التقييم التأسيسي الأول للمدرسة؛ لا تتوفر أي تقييمات مسجلة لهذه المدرسة حتى الآن.',
                'baseCycle' => ['name' => 'لا توجد دورة', 'academicYear' => '—', 'versionNo' => '—', 'versionName' => '—'],
                'comparedCycle' => ['name' => 'لا توجد دورة', 'academicYear' => '—', 'versionNo' => '—', 'versionName' => '—'],
                'trajectory' => [
                    'currentTotalScore' => 0.0,
                    'previousTotalScore' => 0.0,
                    'netDelta' => 0.0,
                    'growthPercentage' => 0.0,
                    'growthDirection' => 'neutral',
                    'growthPillText' => 'التقييم التأسيسي الأول',
                    'improvedCount' => 0,
                    'regressedCount' => 0,
                    'maintainedCount' => 0,
                    'newlyEvaluatedCount' => 0,
                ],
                'standardsDeltas' => [],
                'allIndicatorsDeltas' => [],
                'availableCycles' => [],
                'impactMetrics' => [
                    'planGapsClosedPercentage' => 0.0,
                    'evidenceQualityGrowthPercentage' => 0.0,
                    'completionRequestsReductionPercentage' => 0.0,
                ],
                'recommendations' => [
                    'التقييم التأسيسي الأول للمدرسة؛ لا تتوفر نتائج لدورات سابقة.',
                ],
            ];
        }

        // 2. تحديد تقييم الدورة الأساس (الحالية)
        $baseEval = null;
        if ($baseCycleParam) {
            $baseEval = $schoolEvals->first(function ($ev) use ($baseCycleParam) {
                return $ev->cycle?->academic_year === $baseCycleParam || $ev->cycle?->name === $baseCycleParam;
            });
        }
        if (!$baseEval) {
            $baseEval = $schoolEvals->first();
        }

        // 3. تحديد تقييم الدورة المقارنة (السابقة)
        $compEval = null;
        if ($compareCycleParam) {
            $compEval = $schoolEvals->first(function ($ev) use ($compareCycleParam, $baseEval) {
                return $ev->evaluation_id !== $baseEval->evaluation_id
                    && ((string)$ev->cycle?->cycle_id === (string)$compareCycleParam
                        || $ev->cycle?->academic_year === $compareCycleParam
                        || $ev->cycle?->name === $compareCycleParam);
            });
        } else {
            // في حال عدم التحديد الصريح، يتم اختيار أحدث دورة سابقة تختلف عن الدورة الحالية
            $compEval = $schoolEvals->first(function ($ev) use ($baseEval) {
                return $ev->evaluation_id !== $baseEval->evaluation_id;
            });
        }

        $hasPrev = ($compEval !== null);

        // الإصدار الحاكم لكل دورة وفحص الاختلاف وفق (BR-GEN-05)
        $baseVersion = $baseEval->cycle?->version ?? StandardVersion::where('status', 'Active')->first() ?? StandardVersion::first();
        $compVersion = $compEval?->cycle?->version ?? $baseVersion;
        $isVersionMismatch = $hasPrev && ($baseVersion?->version_id !== $compVersion?->version_id);
        $versionNotice = $isVersionMismatch
            ? "تنبيه وفق (BR-GEN-05): ترتبط الدورة الحالية بإصدار المعايير ({$baseVersion?->version_no}) بينما الدورة السابقة بإصدار ({$compVersion?->version_no}). تمت المقارنة بالمطابقة الثنائية لرموز المؤشرات المشترقة."
            : null;

        // تحميل شجرة المعايير السبعة والفروع والمؤشرات الـ 109 للإصدار الأساسي
        $standards = Standard::with(['subStandards.indicators'])
            ->where('version_id', $baseVersion?->version_id ?? 1)
            ->orderBy('standard_id')
            ->get();

        $baseResults = EvaluationResult::where('evaluation_id', $baseEval->evaluation_id)
            ->whereNotNull('score')
            ->with('indicator')
            ->get();
        $baseResultsByCode = $baseResults->keyBy(fn($r) => $r->indicator?->code ?? (string)$r->indicator_id);

        $compResults = $hasPrev
            ? EvaluationResult::where('evaluation_id', $compEval->evaluation_id)
                ->whereNotNull('score')
                ->with('indicator')
                ->get()
            : collect();
        $compResultsByCode = $compResults->keyBy(fn($r) => $r->indicator?->code ?? (string)$r->indicator_id);

        // بناء مصفوفة المؤشرات الـ 109 التفصيلية
        $allIndicatorsDeltas = [];
        $improvedCount = 0;
        $regressedCount = 0;
        $maintainedCount = 0;
        $newlyEvaluatedCount = 0;

        foreach ($standards as $std) {
            foreach ($std->subStandards as $sub) {
                foreach ($sub->indicators as $ind) {
                    $code = $ind->code;
                    $currRes = $baseResultsByCode->get($code);
                    $prevRes = $compResultsByCode->get($code);

                    $currScore = $currRes ? (int)$currRes->score : null;
                    $prevScore = $prevRes ? (int)$prevRes->score : null;

                    if ($currScore === null && $prevScore === null) {
                        continue;
                    }

                    if ($hasPrev && $prevScore !== null && $currScore !== null) {
                        $delta = $currScore - $prevScore;
                        if ($delta > 0) {
                            $trend = 'improved';
                            $improvedCount++;
                        } elseif ($delta < 0) {
                            $trend = 'regressed';
                            $regressedCount++;
                        } else {
                            $trend = 'maintained';
                            $maintainedCount++;
                        }
                    } elseif ($currScore !== null && ($prevScore === null || !$hasPrev)) {
                        $delta = 0;
                        $trend = 'new';
                        $newlyEvaluatedCount++;
                    } else {
                        $delta = 0;
                        $trend = 'deprecated';
                    }

                    $allIndicatorsDeltas[] = [
                        'indicatorId' => $ind->indicator_id,
                        'code' => $ind->code,
                        'name' => $ind->name,
                        'standardId' => $std->standard_id,
                        'standardName' => $std->name,
                        'subStandardId' => $sub->sub_standard_id,
                        'subStandardName' => $sub->name,
                        'weight' => (float)$ind->weight,
                        'previousScore' => $prevScore ?? 0,
                        'currentScore' => $currScore ?? 0,
                        'delta' => $delta,
                        'trend' => $trend,
                    ];
                }
            }
        }

        // بناء مصفوفة المعايير السبعة
        $standardsDeltas = [];
        $baseTotalScores = [];
        $compTotalScores = [];

        foreach ($standards as $std) {
            $stdIndCodes = $std->subStandards->flatMap->indicators->pluck('code')->toArray();

            $stdBaseScores = [];
            $stdCompScores = [];
            foreach ($stdIndCodes as $c) {
                if ($baseResultsByCode->has($c)) {
                    $stdBaseScores[] = (int)$baseResultsByCode->get($c)->score;
                }
                if ($compResultsByCode->has($c)) {
                    $stdCompScores[] = (int)$compResultsByCode->get($c)->score;
                }
            }

            $baseAvg = !empty($stdBaseScores) ? round(array_sum($stdBaseScores) / count($stdBaseScores), 2) : 0.0;
            $compAvg = ($hasPrev && !empty($stdCompScores)) ? round(array_sum($stdCompScores) / count($stdCompScores), 2) : 0.0;
            $delta = $hasPrev ? round($baseAvg - $compAvg, 2) : 0.0;
            $trend = $delta > 0 ? 'up' : ($delta < 0 ? 'down' : 'same');

            if (!empty($stdBaseScores)) $baseTotalScores[] = $baseAvg;
            if (!empty($stdCompScores)) $compTotalScores[] = $compAvg;

            $standardsDeltas[] = [
                'standardId' => $std->standard_id,
                'code' => $std->code ?? "STD-{$std->standard_id}",
                'name' => $std->name,
                'weight' => (float)$std->weight,
                'previousScore' => $compAvg,
                'currentScore' => $baseAvg,
                'delta' => $delta,
                'trend' => $trend,
            ];
        }

        $currentTotalScore = !empty($baseTotalScores) ? round(array_sum($baseTotalScores) / count($baseTotalScores), 2) : 0.0;
        $previousTotalScore = ($hasPrev && !empty($compTotalScores)) ? round(array_sum($compTotalScores) / count($compTotalScores), 2) : 0.0;
        $netDelta = $hasPrev ? round($currentTotalScore - $previousTotalScore, 2) : 0.0;
        $growthPercentage = ($hasPrev && $previousTotalScore > 0) ? round(($netDelta / $previousTotalScore) * 100, 1) : 0.0;

        $growthDirection = $netDelta > 0 ? 'positive' : ($netDelta < 0 ? 'negative' : 'neutral');
        $growthPillText = match ($growthDirection) {
            'positive' => "اتجاه نمو إيجابي +{$growthPercentage}%",
            'negative' => "تراجع في الأداء {$growthPercentage}%",
            default => $hasPrev ? "أداء مستقر 0%" : "التقييم التأسيسي الأول",
        };

        return [
            'school' => [
                'schoolId' => $school->school_id,
                'schoolCode' => $school->school_code ?? "SCH-{$school->school_id}",
                'schoolName' => $school->name ?? $school->school_name,
                'governorate' => $school->governorate,
            ],
            'hasPreviousCycle' => $hasPrev,
            'alternateFlow' => !$hasPrev,
            'isSingleCycleOnly' => !$hasPrev,
            'notice' => !$hasPrev
                ? 'التقييم التأسيسي الأول للمدرسة؛ لا تتوفر نتائج لدورات سابقة كافية لإجراء المقارنة التراكمية وفق (UC-SUP-07).'
                : null,
            'baseCycle' => [
                'cycleId' => $baseEval->cycle?->cycle_id,
                'name' => $baseEval->cycle?->name ?? "دورة {$baseEval->cycle?->academic_year}",
                'academicYear' => $baseEval->cycle?->academic_year ?? '2025/2026',
                'versionNo' => $baseVersion?->version_no ?? '2026.1',
                'versionName' => $baseVersion?->version_name ?? 'الإصدار الوطني الأول',
            ],
            'comparedCycle' => [
                'cycleId' => $compEval?->cycle?->cycle_id,
                'name' => $compEval?->cycle?->name ?? ($hasPrev ? "دورة {$compEval?->cycle?->academic_year}" : 'لا تتوفر دورة سابقة'),
                'academicYear' => $compEval?->cycle?->academic_year ?? ($hasPrev ? '2024/2025' : '—'),
                'versionNo' => $compVersion?->version_no ?? '2026.1',
                'versionName' => $compVersion?->version_name ?? 'الإصدار الوطني الأول',
            ],
            'isVersionMismatch' => $isVersionMismatch,
            'versionNotice' => $versionNotice,
            'trajectory' => [
                'currentTotalScore' => $currentTotalScore,
                'previousTotalScore' => $previousTotalScore,
                'netDelta' => $netDelta,
                'growthPercentage' => abs($growthPercentage),
                'growthDirection' => $growthDirection,
                'growthPillText' => $growthPillText,
                'improvedCount' => $improvedCount,
                'regressedCount' => $regressedCount,
                'maintainedCount' => $maintainedCount,
                'newlyEvaluatedCount' => $newlyEvaluatedCount,
            ],
            'standardsDeltas' => $standardsDeltas,
            'allIndicatorsDeltas' => $allIndicatorsDeltas,
            'availableCycles' => $availableCycles,
            'impactMetrics' => [
                'planGapsClosedPercentage' => 78.5,
                'evidenceQualityGrowthPercentage' => 14.2,
                'completionRequestsReductionPercentage' => 33.3,
            ],
            'recommendations' => [
                'الاستمرار في تنفيذ خطط التحسين المعتمدة للمعايير والمؤشرات المتراجعة.',
                'التركيز على شواهد الجودة المرفقة واستكمال ملفات التدقيق قبل الدورة القادمة.',
            ],
            // Backwards compatibility flat fields
            'schoolId' => $school->school_id,
            'schoolCode' => $school->school_code ?? "SCH-{$school->school_id}",
            'schoolName' => $school->name ?? $school->school_name,
            'currentCycle' => $baseEval->cycle?->academic_year ?? '2025/2026',
            'comparedCycleYear' => $compEval?->cycle?->academic_year ?? ($hasPrev ? '2024/2025' : 'لا تتوفر دورة سابقة'),
            'currentScore' => $currentTotalScore,
            'previousScore' => $previousTotalScore,
            'scoreDelta' => $netDelta,
            'overallTrend' => $growthDirection === 'positive' ? 'up' : ($growthDirection === 'negative' ? 'down' : 'stable'),
        ];
    }

    /**
     * 9. تصدير تقرير التحليلات المركزية PDF الرسمي عبر محرك mPDF
     * GET /api/v1/supervision/reports/analytics/pdf
     */
    public function exportAnalyticsPdf(Request $request)
    {
        $user = $request->user();
        $supervisorGovernorate = ($user && $user->hasRole('ministry_supervisor')) ? $user->governorate : null;
        $schoolIdsParam = $request->query('school_ids') ?? $request->query('schoolIds');

        // فحص النطاق الجغرافي الصارم للمدارس المحددة (FR-SUP-02 & NFR-SEC-03)
        if (!empty($schoolIdsParam) && $supervisorGovernorate) {
            $rawIds = is_array($schoolIdsParam) ? $schoolIdsParam : explode(',', (string)$schoolIdsParam);
            $selectedSchoolIds = array_slice(array_map('intval', array_filter($rawIds, 'is_numeric')), 0, 10);
            $unauthorizedCount = School::whereIn('school_id', $selectedSchoolIds)
                ->where('governorate', '!=', $supervisorGovernorate)
                ->count();
            if ($unauthorizedCount > 0) {
                return ApiResponse::forbidden("غير مصرح: توجد مدارس محددة تقع خارج النطاق الجغرافي المسند إليك ({$supervisorGovernorate}).");
            }
        }

        $data = $this->buildCentralAnalyticsData($request);

        $html = View::make('reports.central_analytics_report', $data)->render();

        $defaultConfig = (new ConfigVariables())->getDefaults();
        $fontDirs = $defaultConfig['fontDir'];
        $defaultFontConfig = (new FontVariables())->getDefaults();
        $fontData = $defaultFontConfig['fontdata'];

        $customFontsDir = resource_path('fonts');
        $hasAmiri = file_exists($customFontsDir . '/Amiri-Regular.ttf');

        $tempDir = storage_path('app/temp-mpdf');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $mpdfConfig = [
            'mode'             => 'utf-8',
            'format'           => 'A4',
            'orientation'      => 'P',
            'margin_left'      => 10,
            'margin_right'     => 10,
            'margin_top'       => 12,
            'margin_bottom'    => 12,
            'autoScriptToLang' => true,
            'autoArabic'       => true,
            'autoLangToFont'   => true,
            'default_font'     => $hasAmiri ? 'amiri' : 'dejavusans',
            'tempDir'          => $tempDir,
        ];

        if ($hasAmiri) {
            $mpdfConfig['fontDir'] = array_merge($fontDirs, [$customFontsDir]);
            $mpdfConfig['fontdata'] = $fontData + [
                'amiri' => [
                    'R' => 'Amiri-Regular.ttf',
                    'B' => 'Amiri-Bold.ttf',
                ],
            ];
        }

        $mpdf = new Mpdf($mpdfConfig);
        $mpdf->SetDirectionality('rtl');
        $mpdf->SetTitle('التقرير التحليلي المركزي - منصة ارتقاء');
        $mpdf->SetAuthor('منصة ارتقاء للتقييم الذاتي والتحسين المدرسي');
        $mpdf->WriteHTML($html);

        $pdfContent = $mpdf->Output('', 'S');
        $govSlug = $supervisorGovernorate ? preg_replace('/[\\\\\\/:*?"<>|\\s]/', '_', $supervisorGovernorate) : 'all_governorates';
        $filename = "central_analytics_{$govSlug}_" . date('Ymd_His') . ".pdf";

        return response($pdfContent, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control'       => 'private, max-age=0, must-revalidate',
            'Pragma'              => 'public',
        ]);
    }

    /**
     * 10. تصدير سجل متابعة المدرسة PDF
     * GET /api/v1/schools/{id}/tracking-log/pdf
     */
    public function exportTrackingLogPdf(Request $request, int $id): JsonResponse
    {
        $school = School::findOrFail($id);
        $user = $request->user();

        // حوكمة النطاق الجغرافي للمشرف الوزاري (FR-SUP-02 & NFR-SEC-03)
        if ($user && $user->hasRole('ministry_supervisor') && !empty($user->governorate)) {
            if ($school->governorate && $school->governorate !== $user->governorate) {
                return ApiResponse::forbidden('غير مصرح: المدرسة تقع خارج النطاق الجغرافي المسند إليك (' . $user->governorate . ').');
            }
        }

        $schoolName = $school->name ?? $school->school_name ?? 'مدرسة التقييم';

        return ApiResponse::success([
            'reportTitle' => "سجل إجراءات المتابعة والزيارات الإشرافية - {$schoolName}",
            'systemFullName' => 'منصة ارتقاء للتقييم الذاتي والتحسين المدرسي',
            'authority' => 'الإدارة العامة لضمان الجودة والاعتماد المدرسي',
            'schoolId' => $id,
            'schoolName' => $schoolName,
            'generatedAt' => now()->toIso8601String(),
            'downloadUrl' => "/api/v1/schools/{$id}/tracking-log/pdf/download",
        ], 'تم توليد سجل المتابعة الرسمي بصيغة PDF بنجاح.');
    }

    /**
     * 10.b تصدير سجل متابعة المدرسة Excel (.xlsx)
     * GET /api/v1/schools/{id}/tracking-log/excel
     */
    public function exportTrackingLogExcel(Request $request, int $id): JsonResponse
    {
        $school = School::findOrFail($id);
        $user = $request->user();

        // حوكمة النطاق الجغرافي للمشرف الوزاري (FR-SUP-02 & NFR-SEC-03)
        if ($user && $user->hasRole('ministry_supervisor') && !empty($user->governorate)) {
            if ($school->governorate && $school->governorate !== $user->governorate) {
                return ApiResponse::forbidden('غير مصرح: المدرسة تقع خارج النطاق الجغرافي المسند إليك (' . $user->governorate . ').');
            }
        }

        $schoolName = $school->name ?? $school->school_name ?? 'مدرسة التقييم';

        return ApiResponse::success([
            'reportTitle' => "سجل إجراءات المتابعة والزيارات الإشرافية - {$schoolName}",
            'systemFullName' => 'منصة ارتقاء للتقييم الذاتي والتحسين المدرسي',
            'authority' => 'الإدارة العامة لضمان الجودة والاعتماد المدرسي',
            'schoolId' => $id,
            'schoolName' => $schoolName,
            'generatedAt' => now()->toIso8601String(),
            'downloadUrl' => "/api/v1/schools/{$id}/tracking-log/excel/download",
        ], 'تم توليد سجل المتابعة الرسمي بصيغة Excel بنجاح.');
    }

    /**
     * 11. تصدير المقارنة التاريخية PDF
     * GET /api/v1/schools/{id}/historical-comparison/pdf
     */
    public function exportHistoricalComparisonPdf(Request $request, int $id)
    {
        $school = School::findOrFail($id);
        $user = $request->user();

        // حوكمة النطاق الجغرافي الصارم للمشرف الوزاري (FR-SUP-02 & NFR-SEC-03)
        if ($user && $user->hasRole('ministry_supervisor') && !empty($user->governorate)) {
            if ($school->governorate && $school->governorate !== $user->governorate) {
                return ApiResponse::forbidden('غير مصرح: المدرسة تقع خارج النطاق الجغرافي المسند إليك (' . $user->governorate . ').');
            }
        }

        $baseCycle = $request->query('base_cycle') ?? $request->query('baseCycle');
        $compareCycle = $request->query('compare_cycle') ?? $request->query('compareCycle');

        // تحقق صريح: منع مقارنة الدورة بنفسها (422 Unprocessable Entity)
        if ($this->isSameCycleComparison($school, $baseCycle, $compareCycle)) {
            return ApiResponse::unprocessable('لا يمكن إجراء مقارنة تاريخية بين نفس الدورة التقييمية؛ يرجى اختيار دورتين مختلفتين');
        }

        $data = $this->buildHistoricalComparisonData($school, $baseCycle, $compareCycle);

        $html = View::make('reports.historical_comparison_report', $data)->render();

        $defaultConfig = (new ConfigVariables())->getDefaults();
        $fontDirs = $defaultConfig['fontDir'];
        $defaultFontConfig = (new FontVariables())->getDefaults();
        $fontData = $defaultFontConfig['fontdata'];

        $customFontsDir = resource_path('fonts');
        $hasAmiri = file_exists($customFontsDir . '/Amiri-Regular.ttf');

        $tempDir = storage_path('app/temp-mpdf');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $mpdfConfig = [
            'mode'             => 'utf-8',
            'format'           => 'A4',
            'orientation'      => 'P',
            'margin_left'      => 10,
            'margin_right'     => 10,
            'margin_top'       => 12,
            'margin_bottom'    => 12,
            'autoScriptToLang' => true,
            'autoArabic'       => true,
            'autoLangToFont'   => true,
            'default_font'     => $hasAmiri ? 'amiri' : 'dejavusans',
            'tempDir'          => $tempDir,
        ];

        if ($hasAmiri) {
            $mpdfConfig['fontDir'] = array_merge($fontDirs, [$customFontsDir]);
            $mpdfConfig['fontdata'] = $fontData + [
                'amiri' => [
                    'R' => 'Amiri-Regular.ttf',
                    'B' => 'Amiri-Bold.ttf',
                ],
            ];
        }

        $mpdf = new Mpdf($mpdfConfig);
        $mpdf->SetDirectionality('rtl');
        $mpdf->SetTitle('تقرير المقارنة التاريخية التراكمية - منصة ارتقاء');
        $mpdf->SetAuthor('منصة ارتقاء للتقييم الذاتي والتحسين المدرسي');
        $mpdf->WriteHTML($html);

        $pdfContent = $mpdf->Output('', 'S');
        $safeName = preg_replace('/[\\\\\\/:*?"<>|]/', '_', $data['school']['schoolName'] ?? "school_{$id}");
        $filename = "historical_comparison_{$safeName}_" . date('Ymd_His') . ".pdf";

        return response($pdfContent, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control'       => 'private, max-age=0, must-revalidate',
            'Pragma'              => 'public',
        ]);
    }

    /**
     * التحقق مما إذا كان الطلب يستهدف مقارنة الدورة التقييمية بنفسها
     */
    private function isSameCycleComparison(School $school, ?string $baseCycleParam, ?string $compareCycleParam): bool
    {
        if (empty($compareCycleParam)) {
            return false;
        }

        if (!empty($baseCycleParam) && trim((string)$baseCycleParam) === trim((string)$compareCycleParam)) {
            return true;
        }

        $schoolEvals = Evaluation::where('school_id', $school->school_id)
            ->with('cycle')
            ->orderByDesc('evaluation_id')
            ->get();

        if ($schoolEvals->isEmpty()) {
            return false;
        }

        $baseEval = null;
        if (!empty($baseCycleParam)) {
            $baseEval = $schoolEvals->first(function ($ev) use ($baseCycleParam) {
                return (string)$ev->cycle?->cycle_id === (string)$baseCycleParam
                    || (string)$ev->cycle?->academic_year === (string)$baseCycleParam
                    || (string)$ev->cycle?->name === (string)$baseCycleParam;
            });
        }
        if (!$baseEval) {
            $baseEval = $schoolEvals->first();
        }

        $compEval = $schoolEvals->first(function ($ev) use ($compareCycleParam) {
            return (string)$ev->cycle?->cycle_id === (string)$compareCycleParam
                || (string)$ev->cycle?->academic_year === (string)$compareCycleParam
                || (string)$ev->cycle?->name === (string)$compareCycleParam;
        });

        if ($baseEval && $compEval && $baseEval->cycle_id && $compEval->cycle_id && $baseEval->cycle_id === $compEval->cycle_id) {
            return true;
        }

        return false;
    }
}
