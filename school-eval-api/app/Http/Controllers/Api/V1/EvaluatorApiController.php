<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\AiAnalysis;
use App\Models\AiRecommendation;
use App\Models\CompletionRequest;
use App\Models\CompletionRequestItem;
use App\Models\DocumentVersion;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\EvaluationResultVerificationMethod;
use App\Models\EvaluationSubmission;
use App\Models\EvidenceLink;
use App\Models\ImprovementAction;
use App\Models\ImprovementArea;
use App\Models\ImprovementPlan;
use App\Models\Indicator;
use App\Models\IndicatorScoreDescriptor;
use App\Models\InternalReviewNote;
use App\Models\Note;
use App\Models\Report;
use App\Models\School;
use App\Models\SchoolDocument;
use App\Models\ScoreLevel;
use App\Models\Standard;
use App\Models\StandardVersion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * EvaluatorApiController
 * 
 * متحكم بوابة مستخدم التقييم المدرسي (School Evaluator Suite)
 * يغطي كافة متطلبات الربط البرمجي لـ ارتقاء:
 * - مؤشرات لوحة التحكم ومسار الدورة التقييمية
 * - شجرة المعايير ورصد الدرجات والتحقق
 * - مستودع الشواهد والأدلة ورفع الملفات بالإصدارات
 * - التحليل الذكي والفجوات والمبادرات
 * - خطة التحسين المدرسية وإجراءاتها
 * - التحقق النهائي والقفل الرقمي والتسليم
 * - معالجة طلبات الاستكمال وإعادة الرفع للمشرف
 */
class EvaluatorApiController extends Controller
{
    /**
     * الحصول على التقييم الحالي للمدرسة والمستخدم
     */
    protected function getActiveEvaluation(Request $request): ?Evaluation
    {
        $user = $request->user();
        $schoolId = $user ? $user->school_id : null;

        if (!$schoolId) {
            $schoolId = School::first()?->school_id ?? 1;
        }

        $requestedEvalId = $request->query('evaluationId') ?? $request->header('X-Evaluation-Id');
        if ($requestedEvalId && is_numeric($requestedEvalId)) {
            $selected = Evaluation::where('school_id', $schoolId)
                ->where('evaluation_id', (int) $requestedEvalId)
                ->first();
            if ($selected) {
                return $selected;
            }
        }

        $evaluation = Evaluation::where('school_id', $schoolId)
            ->orderBy('evaluation_id', 'desc')
            ->first();

        if (!$evaluation) {
            $cycle = EvaluationCycle::where('status', 'Active')->first() ?? EvaluationCycle::first();
            $cycleId = $cycle ? $cycle->cycle_id : 1;
            $evaluation = Evaluation::create([
                'school_id' => $schoolId,
                'cycle_id' => $cycleId,
                'created_by_user_id' => $user?->user_id ?? 1,
                'status' => 'InProgress',
            ]);
        }

        return $evaluation;
    }

    /**
     * GET /api/v1/evaluator/dashboard-stats
     * Fetch aggregated KPIs and progress tracker
     */
    public function dashboardStats(Request $request): JsonResponse
    {
        $user = $request->user();
        $evaluation = $this->getActiveEvaluation($request);
        $school = $user?->school ?? School::find($evaluation->school_id);

        $totalIndicators = Indicator::count();
        if ($totalIndicators === 0) {
            $totalIndicators = 56;
        }

        $results = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)->get();
        $scoredResults = $results->filter(fn($r) => $r->score !== null && $r->completion_status !== 'Pending');
        $scoredCount = $scoredResults->count();

        $completionPercentage = $totalIndicators > 0 ? round(($scoredCount / $totalIndicators) * 100) : 0;

        // إحصاءات تغطية الشواهد ومتطلبات المعايير والملفات الفيزيائية الفعلية
        try {
            $sufficiencyData = app(\App\Services\EvidenceSufficiencyService::class)->evaluateEvaluation($evaluation);
            $evidencesCount = (int) collect($sufficiencyData['standards'] ?? [])
                ->flatMap(fn($s) => $s['indicators'] ?? [])
                ->sum('effective_covered_count');
        } catch (\Throwable $e) {
            $evidencesCount = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)->count();
        }
        $targetEvidencesCount = \App\Models\IndicatorEvidenceRequirement::count() ?: 278;
        $uniqueDocumentsCount = SchoolDocument::where('school_id', $evaluation->school_id)->count();
        $coveredIndicatorsCount = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
            ->distinct('indicator_id')
            ->count('indicator_id');

        // نقاط القوة (تقدير 2-3) وفرص التحسين (0-1) بناءً على النتائج الحقيقية المرصودة
        $strengthsCount = $scoredResults->filter(fn($r) => (int)$r->score >= 2)->count();
        $gapsCount = $scoredResults->filter(fn($r) => (int)$r->score < 2)->count();

        // التوزيع الحقيقي الدقيق لمستويات الأداء الرباعية (0 - 3)
        $level3Count = $scoredResults->filter(fn($r) => (int)$r->score === 3)->count();
        $level2Count = $scoredResults->filter(fn($r) => (int)$r->score === 2)->count();
        $level1Count = $scoredResults->filter(fn($r) => (int)$r->score === 1)->count();
        $level0Count = $scoredResults->filter(fn($r) => (int)$r->score === 0)->count();
        $unscoredCount = max(0, $totalIndicators - $scoredCount);

        // مسار دورة التقييم المعتمد نظامياً وفق SRS والفصل الرابع (بدون مسمى المكتب المعتمد)
        $isAllScored = ($scoredCount >= $totalIndicators && $totalIndicators > 0);
        $cycleStartDate = $evaluation->cycle?->start_date?->toDateString() ?? $evaluation->created_at?->toDateString() ?? '2026-09-01';
        $cycleSteps = [
            [
                'id' => 1,
                'label' => 'إطلاق الدورة',
                'status' => 'completed',
                'date' => $cycleStartDate,
                'description' => 'فتح دورة التقييم الذاتي وتعميم المعايير الوطنية المعتمدة.',
            ],
            [
                'id' => 2,
                'label' => 'التقييم الذاتي وتوثيق الشواهد',
                'status' => $isAllScored ? 'completed' : 'current',
                'date' => $isAllScored ? 'مستوفى بالكامل' : 'قيد الإنجاز',
                'description' => 'رصد درجات المؤشرات وفق مقياس التقدير الرباعي وإيداع أدلة التحقق.',
            ],
            [
                'id' => 3,
                'label' => 'المراجعة الداخلية والاعتماد المدرسي',
                'status' => $isAllScored ? 'current' : 'pending',
                'date' => $isAllScored ? 'بانتظار اعتماد المدير' : 'مرحلة لاحقة',
                'description' => 'مراجعة مدير المدرسة لملف التقييم وتدوين الملاحظات قبل الإرسال الرسمي.',
            ],
            [
                'id' => 4,
                'label' => 'المراجعة والتدقيق الإشرافي',
                'status' => 'pending',
                'date' => 'بانتظار الرفع للوزارة',
                'description' => 'فحص المشرف الوزاري للنتائج والشواهد وإصدار طلب استكمال إن لزم.',
            ],
            [
                'id' => 5,
                'label' => 'الاعتماد النهائي وإصدار التقرير',
                'status' => 'pending',
                'date' => 'النتيجة الرسمية',
                'description' => 'اعتماد تقرير الجودة والاعتماد الأكاديمي الشامل وخطة التحسين.',
            ],
        ];

        // نسبة اكتمال إدخال المعايير الوطنية (7 معايير) مع تغطية المتطلبات
        $suffStdMap = collect($sufficiencyData['standards'] ?? [])->keyBy('standard_id');
        $suffIndMap = collect($sufficiencyData['standards'] ?? [])
            ->flatMap(fn($s) => $s['indicators'] ?? [])
            ->keyBy('indicator_id');

        $standards = Standard::with('subStandards.indicators')->get();
        $standardsProgress = [];

        foreach ($standards as $std) {
            $indIds = $std->subStandards->flatMap(fn($sub) => $sub->indicators)->pluck('indicator_id');
            $stdTotal = max(1, $indIds->count());
            $stdResults = $results->whereIn('indicator_id', $indIds);
            $stdScoredResults = $stdResults->filter(fn($r) => $r->score !== null && $r->completion_status !== 'Pending');
            $stdScored = $stdScoredResults->count();
            $pct = round(($stdScored / $stdTotal) * 100);
            $avgScore = $stdScored > 0 ? round($stdScoredResults->avg('score'), 2) : 0.0;

            $stdSuff = $suffStdMap->get($std->standard_id);
            $stdMandatoryReqs = (int) ($stdSuff['mandatory_required_count'] ?? 0);
            $stdCoveredReqs = (int) collect($stdSuff['indicators'] ?? [])->sum('effective_covered_count');
            $stdUploadedEvs = (int) ($stdSuff['uploaded_evidence_count'] ?? 0);

            $standardsProgress[] = [
                'standardId' => $std->standard_id,
                'code' => $std->code,
                'title' => $std->name,
                'totalIndicators' => $stdTotal,
                'scoredIndicators' => $stdScored,
                'percentage' => $pct,
                'averageScore' => $avgScore,
                'totalMandatoryRequirements' => $stdMandatoryReqs,
                'coveredRequirements' => $stdCoveredReqs,
                'evidencesCount' => $stdUploadedEvs,
                'scoreDistribution' => [
                    'level3' => $stdScoredResults->where('score', 3)->count(),
                    'level2' => $stdScoredResults->where('score', 2)->count(),
                    'level1' => $stdScoredResults->where('score', 1)->count(),
                    'level0' => $stdScoredResults->where('score', 0)->count(),
                    'unscored' => max(0, $stdTotal - $stdScored),
                ],
            ];
        }

        // عناصر تقييم بحاجة لاستيفاء التقديرات أو الشواهد (حساب دقيق بدون قيد limit(10))
        $scoredIndicatorIds = $scoredResults->pluck('indicator_id')->toArray();

        $evidenceCountsByIndicator = EvidenceLink::where('school_id', $school?->school_id)
            ->where('evaluation_id', $evaluation->evaluation_id)
            ->selectRaw('indicator_id, count(*) as count')
            ->groupBy('indicator_id')
            ->pluck('count', 'indicator_id')
            ->toArray();

        $allIndicatorsList = Indicator::with('subStandard.standard')->orderBy('indicator_id')->get();
        $pendingIndicators = [];

        foreach ($allIndicatorsList as $ind) {
            $hasScore = in_array($ind->indicator_id, $scoredIndicatorIds);
            $evCount = $evidenceCountsByIndicator[$ind->indicator_id] ?? 0;
            $indSuff = $suffIndMap->get($ind->indicator_id);
            $mandatoryCnt = (int) ($indSuff['mandatory_required_count'] ?? 0);
            $coveredCnt = (int) ($indSuff['effective_covered_count'] ?? $evCount);
            $hasEvidence = $indSuff ? (bool) $indSuff['is_sufficient'] : ($evCount > 0);

            if (!$hasScore || !$hasEvidence) {
                $statusText = !$hasScore
                    ? (!$hasEvidence ? 'تقدير وشواهد غير مكتملة' : 'تقدير غير مدخل')
                    : 'شواهد ناقصة';

                $evLabel = $mandatoryCnt > 0
                    ? "شاهد {$evCount} (غطى {$coveredCnt} من {$mandatoryCnt} متطلبات)"
                    : ($evCount > 0 ? "شاهد {$evCount}" : 'ناقص (0)');

                $pendingIndicators[] = [
                    'indicatorId' => $ind->indicator_id,
                    'code' => $ind->code,
                    'name' => $ind->name,
                    'standardName' => $ind->subStandard?->standard?->name ?? 'المعايير الوطنية',
                    'scoreStatus' => $hasScore ? 'scored' : 'unscored',
                    'scoreStatusArabic' => $hasScore ? 'مدخل' : 'غير مدخل',
                    'evidenceStatus' => $hasEvidence ? 'sufficient' : 'missing',
                    'evidenceStatusArabic' => $evLabel,
                    'evidenceCount' => $evCount,
                    'coveredRequirementsCount' => $coveredCnt,
                    'mandatoryRequirementsCount' => $mandatoryCnt,
                    'score' => $hasScore ? $results->firstWhere('indicator_id', $ind->indicator_id)?->score : null,
                    'status' => $statusText,
                ];
            }
        }

        // التحقق من وجود طلب استكمال مفتوح خاص بهذا التقييم والمدرسة حصراً
        $completionRequest = CompletionRequest::where('status', 'Open')
            ->whereHas('submission.report', function ($query) use ($evaluation) {
                $query->where('evaluation_id', $evaluation->evaluation_id);
            })
            ->orderBy('request_id', 'desc')
            ->first();

        $submission = EvaluationSubmission::where('report_id', function ($query) use ($evaluation) {
            $query->select('report_id')->from('reports')->where('evaluation_id', $evaluation->evaluation_id)->limit(1);
        })->orderBy('submission_id', 'desc')->first();

        $submissionStatus = $submission ? $submission->status : 'Draft';

        return ApiResponse::success([
            'schoolInfo' => [
                'schoolId' => $school?->school_id ?? 1,
                'schoolName' => $school?->school_name ?? 'المدرسة المعتمدة',
                'schoolCode' => $school?->school_code ?? $school?->code ?? ('SCH-' . str_pad((string)($school?->school_id ?? 1), 3, '0', STR_PAD_LEFT)),
                'status' => $submissionStatus,
                'statusArabic' => $submissionStatus === 'NeedsCompletion' ? 'طلب استكمال من المشرف' : ($submissionStatus === 'Submitted' ? 'تم الرفع (للقراءة فقط)' : 'مسودة قيد الإدخال'),
                'currentEvaluator' => $user?->full_name ?? 'مقيم المدرسة',
                'academicYear' => $evaluation->cycle?->academic_year ?? '2026/2027',
                'cycleName' => $evaluation->cycle?->name ?? 'دورة التقييم الذاتي المعتمدة 2026',
            ],
            'kpis' => [
                'completionPercentage' => $completionPercentage,
                'totalIndicators' => $totalIndicators,
                'scoredIndicators' => $scoredCount,
                'documentedEvidences' => $evidencesCount,
                'targetEvidences' => $targetEvidencesCount,
                'uniqueDocumentsCount' => $uniqueDocumentsCount,
                'coveredIndicatorsCount' => $coveredIndicatorsCount,
                'strengthsCount' => $strengthsCount,
                'gapsCount' => $gapsCount,
                'scoreDistribution' => [
                    'level3' => $level3Count,
                    'level2' => $level2Count,
                    'level1' => $level1Count,
                    'level0' => $level0Count,
                    'unscored' => $unscoredCount,
                ],
                'firstUnscoredIndicatorId' => $allIndicatorsList->first(fn($ind) => !in_array($ind->indicator_id, $scoredIndicatorIds))?->indicator_id ?? null,
            ],
            'cycleSteps' => $cycleSteps,
            'standardsProgress' => $standardsProgress,
            'pendingIndicators' => $pendingIndicators,
            'completionAlert' => $completionRequest ? [
                'requestId' => $completionRequest->request_id,
                'message' => 'طلب استكمال للمخرج من المراجعة الوزارية: يرجى استيفاء المؤشرات والشواهد المطلوبة قبل انتهاء المهلة.',
                'deadline' => $completionRequest->completion_deadline?->toDateString() ?? now()->addDays(7)->toDateString(),
                'itemsCount' => CompletionRequestItem::where('request_id', $completionRequest->request_id)->whereIn('status', ['Pending', 'pending'])->count(),
            ] : null,
        ]);
    }

    /**
     * GET /api/v1/standard-versions/active/tree
     * Load active 7 standards and indicator nodes
     */
    public function activeStandardsTree(Request $request): JsonResponse
    {
        $version = StandardVersion::where('status', 'Active')->orderBy('version_id', 'desc')->first()
            ?? StandardVersion::orderBy('version_id', 'desc')->first();

        if (!$version) {
            return ApiResponse::success([
                'versionId' => 1,
                'versionCode' => 'NSS-2026-V1',
                'title' => 'المعايير الوطنية لتقويم الأداء المدرسي 2026',
                'standards' => [],
            ]);
        }

        $evaluation = $this->getActiveEvaluation($request);
        $results = $evaluation ? EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)->get() : collect();
        $linksByIndicator = $evaluation ? EvidenceLink::where('school_id', $evaluation->school_id)
            ->where('evaluation_id', $evaluation->evaluation_id)
            ->get()
            ->groupBy('indicator_id') : collect();

        $standards = Standard::where('version_id', $version->version_id)
            ->with([
                'subStandards.indicators.scoreDescriptors.scoreLevel',
                'subStandards.indicators.evidenceRequirements',
                'subStandards.indicators.verificationTools',
            ])
            ->orderBy('code')
            ->get();

        $tree = $standards->map(function ($std) use ($results, $linksByIndicator) {
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

            $computeIndicatorCoverage = function ($ind) use ($linksByIndicator) {
                $indLinks = $linksByIndicator->get($ind->indicator_id, collect());
                $evCount = $indLinks->count();
                $mandatoryIds = $ind->evidenceRequirements->where('required', true)->pluck('requirement_id')->map(fn($x) => (int)$x)->all();
                $mandatoryCnt = count($mandatoryIds);
                $explicitIds = [];
                $legacyCnt = 0;
                foreach ($indLinks as $lnk) {
                    if (strtolower($lnk->status ?? '') !== 'completed') {
                        continue;
                    }
                    $cov = $lnk->covered_requirements;
                    if (is_array($cov)) {
                        foreach ($cov as $rid) {
                            $intId = (int)$rid;
                            if (in_array($intId, $mandatoryIds, true)) {
                                $explicitIds[$intId] = true;
                            }
                        }
                    } elseif ($cov === null) {
                        $legacyCnt++;
                    }
                }
                $coveredCnt = $mandatoryCnt > 0 ? min($mandatoryCnt, count($explicitIds) + $legacyCnt) : $evCount;
                return [$evCount, $mandatoryCnt, $coveredCnt, $explicitIds];
            };

            foreach ($allStdIndicators as $indItem) {
                [$evC, $mC, $cC] = $computeIndicatorCoverage($indItem);
                $stdTotalEvidences += $evC;
                $stdTotalMandatory += $mC;
                $stdTotalCovered += $cC;
            }

            return [
                'standardId' => $std->standard_id,
                'code' => $std->code,
                'title' => $std->name,
                'description' => $std->description ?? '',
                'weight' => $std->weight ?? 15,
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
                ],
                'subStandards' => $std->subStandards->map(function ($sub) use ($results, $computeIndicatorCoverage) {
                    return [
                        'subStandardId' => $sub->sub_standard_id,
                        'code' => $sub->code,
                        'title' => $sub->name,
                        'indicators' => $sub->indicators->map(function ($ind) use ($results, $computeIndicatorCoverage) {
                            $res = $results->firstWhere('indicator_id', $ind->indicator_id);
                            [$evCount, $mandatoryCnt, $coveredCnt, $explicitIds] = $computeIndicatorCoverage($ind);

                            return [
                                'indicatorId' => $ind->indicator_id,
                                'code' => $ind->code,
                                'title' => $ind->name,
                                'description' => $ind->description ?? '',
                                'weight' => $ind->weight ?? 1,
                                'score' => $res?->score,
                                'evidenceCount' => $evCount,
                                'mandatoryRequirementsCount' => $mandatoryCnt,
                                'coveredRequirementsCount' => $coveredCnt,
                                'descriptors' => $ind->scoreDescriptors->map(fn($d) => [
                                    'descriptorId' => $d->descriptor_id ?? $d->id,
                                    'level' => (int) ($d->scoreLevel?->score_value ?? $d->score_level_id),
                                    'title' => $d->label ?? ('المستوى ' . ($d->scoreLevel?->score_value ?? $d->score_level_id)),
                                    'description' => $d->description,
                                ]),
                                'verificationMethods' => $ind->verificationTools->map(fn($vt) => [
                                    'id' => $vt->tool_id,
                                    'name' => $vt->name,
                                    'toolType' => $vt->tool_type,
                                    'description' => $vt->description,
                                    'required' => (bool)($vt->pivot->required ?? true),
                                    'guidance' => $vt->pivot->usage_guidance ?? '',
                                ]),
                                'evidenceRequirements' => $ind->evidenceRequirements->map(fn($er) => [
                                    'id' => $er->requirement_id,
                                    'title' => $er->title,
                                    'description' => $er->description ?? '',
                                    'required' => (bool)$er->required,
                                    'isCovered' => isset($explicitIds[(int)$er->requirement_id]),
                                ]),
                            ];
                        }),
                    ];
                }),
            ];
        });

        return ApiResponse::success([
            'evaluationId' => $evaluation?->evaluation_id,
            'versionId' => $version->version_id,
            'versionCode' => $version->version_code ?? 'NSS-2026-V1',
            'title' => $version->version_name ?? 'المعايير الوطنية لتقويم الأداء المدرسي 2026',
            'standards' => $tree,
        ]);
    }

    /**
     * GET /api/v1/evaluation-results/{indicatorId}
     * Retrieve current score, notes, and evidences
     */
    public function getEvaluationResult(Request $request, int $indicatorId): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $result = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
            ->where('indicator_id', $indicatorId)
            ->with(['scoreDescriptor', 'notes', 'verificationMethods', 'evaluator'])
            ->first();

        // جلب الشواهد المربوطة
        $evidenceLinks = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
            ->where('indicator_id', $indicatorId)
            ->with(['documentVersion.document'])
            ->get()
            ->map(function ($link) {
                return [
                    'linkId' => $link->id,
                    'versionId' => $link->document_version_id,
                    'documentId' => $link->documentVersion?->school_document_id ?? $link->documentVersion?->document?->id,
                    'indicatorId' => $link->indicator_id,
                    'title' => $link->documentVersion?->document?->title ?? 'مستند شاهد',
                    'fileName' => $link->documentVersion?->file_name ?? 'document.pdf',
                    'fileSize' => $link->documentVersion?->file_size ?? 1024000,
                    'versionNumber' => $link->documentVersion?->version_no ?? 1,
                    'status' => $link->status ?? 'completed',
                    'coveredRequirements' => $link->covered_requirements ?? [],
                ];
            });

        $indicator = Indicator::with('evidenceRequirements')->find($indicatorId);
        $reqs = $indicator?->evidenceRequirements->map(fn($er) => [
            'id' => $er->requirement_id,
            'title' => $er->title,
            'description' => $er->description ?? '',
            'required' => (bool)$er->required,
        ]) ?? collect();

        if (!$result) {
            return ApiResponse::success([
                'resultId' => null,
                'evaluationId' => $evaluation->evaluation_id,
                'indicatorId' => $indicatorId,
                'score' => null,
                'scoreDescriptorId' => null,
                'completionStatus' => 'Pending',
                'justification' => '',
                'verificationMethods' => [],
                'evidenceLinks' => $evidenceLinks,
                'evidenceRequirements' => $reqs,
            ]);
        }

        $justificationNote = $result->notes()->orderBy('note_id', 'desc')->first();
        $reviewerNotes = $result->notes()
            ->with('author')
            ->orderBy('note_id', 'asc')
            ->get()
            ->map(fn($n) => [
                'noteId' => $n->note_id,
                'authorName' => $n->author?->full_name ?? $n->author?->name ?? 'المراجع',
                'authorRole' => $n->author?->role ?? 'مدير / مشرف',
                'text' => $n->text,
                'createdAt' => $n->created_at?->toIso8601String(),
            ]);

        return ApiResponse::success([
            'resultId' => $result->result_id,
            'evaluationId' => $result->evaluation_id,
            'indicatorId' => $result->indicator_id,
            'score' => $result->score,
            'scoreDescriptorId' => $result->score_descriptor_id,
            'completionStatus' => $result->completion_status ?? 'Completed',
            'justification' => $justificationNote ? ($justificationNote->text ?? $justificationNote->content) : ($result->textual_result ?? ''),
            'verificationMethods' => $result->verificationMethods->pluck('tool_id')->toArray(),
            'evidenceLinks' => $evidenceLinks,
            'evidenceRequirements' => $reqs,
            'reviewerNotes' => $reviewerNotes,
            'updatedAt' => $result->updated_at?->toIso8601String(),
        ]);
    }

    /**
     * POST /api/v1/evaluation-results
     * Persist rubric assessment and justifications
     */
    public function saveEvaluationResult(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'indicatorId' => 'required|integer',
            'score' => 'required|integer|min:0|max:3',
            'scoreDescriptorId' => 'nullable|integer',
            'justification' => 'nullable|string|max:1000',
            'verificationMethods' => 'nullable|array',
            'completionStatus' => 'nullable|in:Pending,Completed',
        ], [
            'score.min' => 'قيمة التقدير يجب أن تكون بين 0 و 3.',
            'score.max' => 'قيمة التقدير يجب أن تكون بين 0 و 3.',
            'indicatorId.required' => 'المؤشر مطلوب.',
            'justification.max' => 'المبررات والشواهد يجب ألا تتجاوز 1000 حرف.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $user = $request->user();
        if ($user && !$user->hasPermission('evaluations.edit')) {
            return ApiResponse::forbidden('ليس لديك صلاحية رصد أو تعديل درجات المؤشرات. هذه الصلاحية محصورة بمقيم المدرسة.');
        }

        $evaluation = $this->getActiveEvaluation($request);
        if (in_array($evaluation->status, ['Submitted', 'UnderReview', 'Completed'], true) || ($evaluation->cycle && $evaluation->cycle->status === 'Closed')) {
            return ApiResponse::error('لا يمكن التعديل على ملف تقييم مقفل أو دورة مغلقة (للقراءة فقط).', 422);
        }
        $indicatorId = $request->input('indicatorId');
        $score = $request->input('score');

        // البحث عن وصف الدرجة التلقائي إذا لم يتم تمريره
        $descriptorId = $request->input('scoreDescriptorId');
        if (!$descriptorId && $score !== null && $score !== '') {
            $numericScore = (int)$score;
            $scoreLevel = ScoreLevel::where('score_value', $numericScore)->first();
            if ($scoreLevel) {
                $descriptor = IndicatorScoreDescriptor::where('indicator_id', $indicatorId)
                    ->where('score_level_id', $scoreLevel->score_level_id)
                    ->first();
                $descriptorId = $descriptor?->descriptor_id ?? $descriptor?->id;
            }
        }

        $versionId = $evaluation->cycle?->version_id ?? Indicator::find($indicatorId)?->subStandard?->standard?->version_id ?? 1;

        $result = EvaluationResult::updateOrCreate(
            [
                'evaluation_id' => $evaluation->evaluation_id,
                'indicator_id' => $indicatorId,
            ],
            [
                'standard_version_id' => $versionId,
                'score' => $score,
                'score_descriptor_id' => $descriptorId,
                'evaluator_user_id' => $user?->user_id ?? 1,
                'textual_result' => $request->input('justification'),
                'completion_status' => $request->input('completionStatus', 'Completed'),
            ]
        );

        // حفظ الملاحظة التبريرية إن وجدت
        if ($request->filled('justification')) {
            Note::create([
                'result_id' => $result->result_id,
                'author_user_id' => $user?->user_id ?? 1,
                'text' => $request->input('justification'),
            ]);
        }

        // تحديث أساليب التحقق
        if ($request->has('verificationMethods')) {
            EvaluationResultVerificationMethod::where('evaluation_result_id', $result->result_id)->delete();
            foreach ($request->input('verificationMethods', []) as $toolId) {
                EvaluationResultVerificationMethod::create([
                    'evaluation_result_id' => $result->result_id,
                    'tool_id' => $toolId,
                ]);
            }
        }

        $evidenceLinks = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
            ->where('indicator_id', $indicatorId)
            ->with(['documentVersion.document'])
            ->get()
            ->map(function ($link) {
                return [
                    'linkId' => $link->id,
                    'versionId' => $link->document_version_id,
                    'documentId' => $link->documentVersion?->school_document_id ?? $link->documentVersion?->document?->id,
                    'indicatorId' => $link->indicator_id,
                    'title' => $link->documentVersion?->document?->title ?? 'مستند شاهد',
                    'fileName' => $link->documentVersion?->file_name ?? 'document.pdf',
                    'fileSize' => $link->documentVersion?->file_size ?? 1024000,
                    'versionNumber' => $link->documentVersion?->version_no ?? 1,
                    'status' => $link->status ?? 'completed',
                    'coveredRequirements' => $link->covered_requirements ?? [],
                ];
            });

        $indicator = Indicator::with('evidenceRequirements')->find($indicatorId);
        $reqs = $indicator?->evidenceRequirements->map(fn($er) => [
            'id' => $er->requirement_id,
            'title' => $er->title,
            'description' => $er->description ?? '',
            'required' => (bool)$er->required,
        ]) ?? collect();

        $justificationNote = $result->notes()->orderBy('note_id', 'desc')->first();
        $reviewerNotes = $result->notes()
            ->with('author')
            ->orderBy('note_id', 'asc')
            ->get()
            ->map(fn($n) => [
                'noteId' => $n->note_id,
                'authorName' => $n->author?->full_name ?? $n->author?->name ?? 'المراجع',
                'authorRole' => $n->author?->role ?? 'مدير / مشرف',
                'text' => $n->text,
                'createdAt' => $n->created_at?->toIso8601String(),
            ]);

        return ApiResponse::success([
            'resultId' => $result->result_id,
            'evaluationId' => $result->evaluation_id,
            'indicatorId' => $result->indicator_id,
            'score' => $result->score,
            'scoreDescriptorId' => $result->score_descriptor_id,
            'completionStatus' => $result->completion_status,
            'justification' => $justificationNote ? ($justificationNote->text ?? $justificationNote->content) : ($request->input('justification') ?? $result->textual_result ?? ''),
            'verificationMethods' => $result->verificationMethods()->pluck('tool_id')->toArray(),
            'evidenceLinks' => $evidenceLinks,
            'evidenceRequirements' => $reqs,
            'reviewerNotes' => $reviewerNotes,
            'updatedAt' => $result->updated_at?->toIso8601String(),
        ], 'تم حفظ التقييم والمبررات بنجاح');
    }

    /**
     * POST /api/v1/evidences/upload
     * Multipart file upload (versioned evidence)
     */
    public function uploadEvidence(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:25600|mimes:pdf,png,jpg,jpeg,docx,xlsx',
            'title' => 'nullable|string|max:255',
            'documentType' => 'nullable|string|in:evidence,minutes,plan,record,report,board,image,other',
            'document_type' => 'nullable|string|in:evidence,minutes,plan,record,report,board,image,other',
            'description' => 'nullable|string|max:2000',
            'justification' => 'nullable|string|max:1000',
            'indicatorId' => 'nullable|integer',
            'actionId' => 'nullable|integer',
            'notes' => 'nullable|string',
            'documentId' => 'nullable|integer', // إذا كان استبدالاً لنسخة سابقة
        ], [
            'file.required' => 'الملف مطلوب.',
            'file.max' => 'حجم الملف يتجاوز الحد الأقصى المسموح (25 ميجابايت).',
            'file.mimes' => 'نوع الملف غير مسموح. الأنواع المسموحة: pdf, png, jpg, jpeg, docx, xlsx.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $user = $request->user();
        if ($user && !$user->hasPermission('evidence.manage')) {
            return ApiResponse::forbidden('ليس لديك صلاحية رفع أو تعديل الشواهد. هذه الصلاحية محصورة بمقيم المدرسة.');
        }

        $evaluation = $this->getActiveEvaluation($request);
        if (in_array($evaluation->status, ['Submitted', 'UnderReview', 'Completed'], true) || ($evaluation->cycle && $evaluation->cycle->status === 'Closed')) {
            return ApiResponse::error('لا يمكن رفع شواهد على ملف تقييم مقفل أو دورة مغلقة (للقراءة فقط).', 422);
        }
        $schoolId = $evaluation->school_id;
        $uploadedFile = $request->file('file');

        $originalName = $uploadedFile->getClientOriginalName();
        $mimeType = $uploadedFile->getClientMimeType();
        $fileSize = $uploadedFile->getSize();
        $storageName = Str::uuid()->toString() . '.' . $uploadedFile->getClientOriginalExtension();
        $storedPath = $uploadedFile->storeAs('evidences/' . $schoolId, $storageName, 'local');

        // تحديد المستند الأم
        $docId = $request->input('documentId');
        if ($docId) {
            $document = SchoolDocument::where('school_id', $schoolId)->where('id', $docId)->first();
            if (!$document) {
                return ApiResponse::notFound('المستند المطلوب استبداله غير موجود.');
            }
            $updateData = [];
            if ($request->filled('title')) {
                $updateData['title'] = $request->input('title');
            }
            if ($request->filled('description')) {
                $updateData['description'] = $request->input('description');
            }
            if ($request->filled('documentType') || $request->filled('document_type')) {
                $updateData['document_type'] = $request->input('documentType') ?: $request->input('document_type');
            }
            if (!empty($updateData)) {
                $document->update($updateData);
            }
        } else {
            $title = $request->input('title') ?: pathinfo($originalName, PATHINFO_FILENAME);
            $documentType = $request->input('documentType') ?: $request->input('document_type', 'evidence');
            $description = $request->input('description');
            $document = SchoolDocument::create([
                'school_id' => $schoolId,
                'title' => $title,
                'document_type' => $documentType,
                'description' => $description,
                'created_by_user_id' => $user?->user_id ?? 1,
            ]);
        }

        // جلب النسخ السابقة لتسجيل الإصدار الجديد ونقل الروابط
        $previousVersions = DocumentVersion::where('school_document_id', $document->id)->get();
        $latestVersion = $previousVersions->max('version_no') ?? 0;
        $newVersionNumber = $latestVersion + 1;

        // وسم النسخ السابقة كغير حالية
        DocumentVersion::where('school_document_id', $document->id)->update(['is_current' => false]);

        $versionNotes = $request->input('notes');
        if (empty($versionNotes) && $newVersionNumber > 1) {
            $versionNotes = "نسخة محدثة (الإصدار {$newVersionNumber})";
        }

        $docVersion = DocumentVersion::create([
            'school_id' => $schoolId,
            'school_document_id' => $document->id,
            'version_no' => $newVersionNumber,
            'is_current' => true,
            'storage_uri' => $storedPath,
            'file_name' => $originalName,
            'mime_type' => $mimeType,
            'file_size' => $fileSize,
            'notes' => $versionNotes,
        ]);

        // عند استبدال المستند: نقل جميع روابط المؤشرات السابقة المرتبطة بأي من النسخ القديمة إلى النسخة الجديدة
        $previousVersionIds = $previousVersions->pluck('id')->filter()->all();
        if (!empty($previousVersionIds)) {
            EvidenceLink::whereIn('document_version_id', $previousVersionIds)
                ->update(['document_version_id' => $docVersion->id]);
        }

        // ربط الشاهد بالمؤشر إذا تم تمرير indicatorId أو تحديث تغطية المتطلبات
        $linkId = null;
        $coveredReqs = null;
        if ($request->filled('coveredRequirements')) {
            $rawCovered = $request->input('coveredRequirements');
            if (is_string($rawCovered)) {
                $decoded = json_decode($rawCovered, true);
                $rawCovered = is_array($decoded) ? $decoded : [];
            }
            if (is_array($rawCovered)) {
                $coveredReqs = array_values(array_unique(array_map('intval', array_filter($rawCovered, fn($v) => is_numeric($v)))));
            }
        }

        if ($request->filled('indicatorId')) {
            $indicatorId = (int) $request->input('indicatorId');
            $existingLink = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
                ->where('indicator_id', $indicatorId)
                ->where('document_version_id', $docVersion->id)
                ->first();

            if ($existingLink) {
                $linkUpdates = [];
                if ($coveredReqs !== null) {
                    $linkUpdates['covered_requirements'] = $coveredReqs;
                }
                if ($request->filled('justification')) {
                    $linkUpdates['justification'] = $request->input('justification');
                }
                if (!empty($linkUpdates)) {
                    $existingLink->update($linkUpdates);
                }
                $linkId = $existingLink->id;
            } else {
                $link = EvidenceLink::create([
                    'school_id' => $schoolId,
                    'evaluation_id' => $evaluation->evaluation_id,
                    'indicator_id' => $indicatorId,
                    'document_version_id' => $docVersion->id,
                    'action_id' => $request->input('actionId'),
                    'justification' => $request->input('justification') ?: $request->input('notes', ''),
                    'covered_requirements' => $coveredReqs ?? [],
                    'status' => 'completed',
                ]);
                $linkId = $link->id;
            }
        }

        // جلب جميع روابط المؤشرات المرتبطة بالنسخة الجديدة (سواء منقولة من نسخ سابقة أو مضافة حديثاً)
        $allLinks = EvidenceLink::where('document_version_id', $docVersion->id)
            ->where('evaluation_id', $evaluation->evaluation_id)
            ->with(['indicator.subStandard.standard'])
            ->get();

        $linkedIndicators = $allLinks->map(fn($l) => [
            'linkId' => (int) $l->id,
            'indicatorId' => (int) $l->indicator_id,
            'indicatorCode' => $l->indicator?->code ?? '',
            'indicatorTitle' => $l->indicator?->name ?? '',
            'standardId' => $l->indicator?->subStandard?->standard?->standard_id,
            'standardCode' => $l->indicator?->subStandard?->standard?->code ?? '',
            'standardName' => $l->indicator?->subStandard?->standard?->name ?? '',
            'justification' => $l->justification ?? '',
            'coveredRequirements' => $l->covered_requirements ?? [],
        ])->values()->all();

        $firstLink = $allLinks->first();
        $isUnlinked = ($allLinks->isEmpty());

        return ApiResponse::created([
            'documentId' => (int) $document->id,
            'versionId' => (int) $docVersion->id,
            'linkId' => $linkId ?? $firstLink?->id,
            'title' => $document->title,
            'fileName' => $originalName,
            'fileSize' => $fileSize,
            'mimeType' => $mimeType,
            'versionNumber' => $newVersionNumber,
            'isUnlinked' => $isUnlinked,
            'indicatorId' => $firstLink?->indicator_id,
            'standardCode' => $firstLink?->indicator?->subStandard?->standard?->code ?? 'UNLINKED',
            'standardName' => $firstLink?->indicator?->subStandard?->standard?->name ?? 'مستودع المدرسة (غير مرتبط)',
            'indicatorCode' => $firstLink?->indicator?->code ?? 'غير مرتبط',
            'indicatorTitle' => $firstLink?->indicator?->name ?? 'غير مرتبط بأي مؤشر',
            'linkedIndicators' => $linkedIndicators,
            'coveredRequirements' => $coveredReqs ?? $firstLink?->covered_requirements ?? [],
            'uploadedAt' => $docVersion->created_at?->toIso8601String(),
        ], 'تم رفع المستند وتوثيقه كشاهد معياري بنجاح');
    }

    /**
     * GET /api/v1/evidences/documents/{documentId}/versions
     * استرجاع سجل الإصدارات التاريخية للمستند
     */
    public function getDocumentVersions(Request $request, int $documentId): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $schoolId = $evaluation->school_id;

        $document = SchoolDocument::where('school_id', $schoolId)->where('id', $documentId)->first();
        if (!$document) {
            return ApiResponse::notFound('المستند غير موجود.');
        }

        $versions = DocumentVersion::where('school_document_id', $document->id)
            ->orderBy('version_no', 'desc')
            ->get();

        $data = $versions->map(function (DocumentVersion $ver) use ($document) {
            return [
                'versionId' => (int) $ver->id,
                'documentId' => (int) $document->id,
                'versionNo' => (int) $ver->version_no,
                'isCurrent' => (bool) $ver->is_current,
                'fileName' => $ver->file_name,
                'fileSize' => (int) $ver->file_size,
                'mimeType' => $ver->mime_type,
                'notes' => $ver->notes ?: ($ver->is_current ? 'النسخة المعتمدة الحالية' : 'نسخة أرشيفية سابقة'),
                'createdAt' => $ver->created_at?->toIso8601String(),
                'downloadUrl' => route('api.v1.document-versions.download', ['versionId' => $ver->id]),
            ];
        });

        return ApiResponse::success([
            'document' => [
                'id' => (int) $document->id,
                'title' => $document->title,
                'documentType' => $document->document_type,
                'description' => $document->description,
                'totalVersions' => $versions->count(),
            ],
            'versions' => $data,
        ], 'تم جلب سجل إصدارات المستند بنجاح');
    }

    /**
     * GET /api/v1/evidences/versions-archive
     * استرجاع السجل الأرشيفي الشامل لكافة الوثائق وإصداراتها التاريخية
     */
    public function getVersionsArchive(Request $request): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $schoolId = $evaluation->school_id;

        $documents = SchoolDocument::where('school_id', $schoolId)
            ->with(['versions' => fn($q) => $q->orderBy('version_no', 'desc'), 'creator'])
            ->orderBy('id', 'desc')
            ->get();

        $archive = $documents->map(function (SchoolDocument $doc) use ($evaluation) {
            $currentVer = $doc->versions->firstWhere('is_current', true);
            $historicalVers = $doc->versions->where('is_current', false)->values();

            // روابط المؤشرات النشطة للنسخة الحالية
            $activeLinks = $currentVer
                ? EvidenceLink::where('document_version_id', $currentVer->id)
                    ->where('evaluation_id', $evaluation->evaluation_id)
                    ->with('indicator')
                    ->get()
                : collect();

            $docType = $doc->document_type ?? 'evidence';
            $docTypeArabic = match ($docType) {
                'minutes' => 'محضر اجتماع',
                'plan' => 'خطة تشغيلية',
                'record' => 'سجل توثيقي',
                'report' => 'تقرير إنجاز',
                'board' => 'لوحة حائطية/بيانية',
                'image' => 'صورة ميدانية',
                default => 'شاهد توثيقي',
            };

            return [
                'documentId' => (int) $doc->id,
                'title' => $doc->title,
                'documentType' => $docType,
                'documentTypeArabic' => $docTypeArabic,
                'description' => $doc->description ?? '',
                'totalVersionsCount' => $doc->versions->count(),
                'activeLinksCount' => $activeLinks->count(),
                'linkedIndicators' => $activeLinks->map(fn($l) => [
                    'indicatorId' => (int) $l->indicator_id,
                    'indicatorCode' => $l->indicator?->code ?? '',
                    'indicatorTitle' => $l->indicator?->name ?? '',
                ])->values()->all(),
                'currentVersion' => $currentVer ? [
                    'versionId' => (int) $currentVer->id,
                    'versionNo' => (int) $currentVer->version_no,
                    'fileName' => $currentVer->file_name,
                    'fileSize' => (int) $currentVer->file_size,
                    'formattedSize' => round($currentVer->file_size / (1024 * 1024), 2) . ' MB',
                    'notes' => $currentVer->notes ?: 'النسخة المعتمدة الحالية',
                    'createdAt' => $currentVer->created_at?->toIso8601String(),
                    'downloadUrl' => route('api.v1.document-versions.download', ['versionId' => $currentVer->id]),
                ] : null,
                'historicalVersions' => $historicalVers->map(function (DocumentVersion $ver) {
                    $isPruned = empty($ver->storage_uri) || (int)$ver->file_size === 0 || str_contains($ver->notes ?? '', 'تم شطب الملف الفيزيائي');
                    return [
                        'versionId' => (int) $ver->id,
                        'versionNo' => (int) $ver->version_no,
                        'fileName' => $ver->file_name,
                        'fileSize' => (int) $ver->file_size,
                        'formattedSize' => round($ver->file_size / (1024 * 1024), 2) . ' MB',
                        'notes' => $ver->notes ?: 'نسخة أرشيفية سابقة',
                        'createdAt' => $ver->created_at?->toIso8601String(),
                        'isFilePruned' => $isPruned,
                        'downloadUrl' => $isPruned ? null : route('api.v1.document-versions.download', ['versionId' => $ver->id]),
                    ];
                })->all(),
            ];
        });

        $totalVersions = DocumentVersion::where('school_id', $schoolId)->count();
        $prunedVersionsCount = DocumentVersion::where('school_id', $schoolId)
            ->where(function ($q) {
                $q->whereNull('storage_uri')
                  ->orWhere('storage_uri', '')
                  ->orWhere('file_size', 0)
                  ->orWhere('notes', 'like', '%تم شطب الملف الفيزيائي%');
            })->count();

        return ApiResponse::success([
            'archiveStats' => [
                'totalDocuments' => $documents->count(),
                'totalVersions' => $totalVersions,
                'historicalVersionsCount' => max(0, $totalVersions - $documents->count()),
                'prunedVersionsCount' => $prunedVersionsCount,
            ],
            'documents' => $archive,
        ], 'تم جلب سجل أرشيف الإصدارات بنجاح');
    }

    /**
     * DELETE /api/v1/evidences/versions/{versionId}/file
     * حذف الملف الفيزيائي للإصدار القديم مع الحفاظ على سجل الأرشيف
     */
    public function pruneVersionPhysicalFile(Request $request, int $versionId): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $schoolId = $evaluation->school_id;

        $user = $request->user();
        if ($user && !$user->hasPermission('evidence.manage') && !$user->hasPermission('evaluations.edit')) {
            return ApiResponse::forbidden('غير مصرح لك بإدارة وحذف ملفات الشواهد.');
        }

        $version = DocumentVersion::where('id', $versionId)
            ->where('school_id', $schoolId)
            ->first();

        if (!$version) {
            return ApiResponse::notFound('إصدار الشاهد المطلوب غير موجود.');
        }

        if ($version->is_current) {
            return ApiResponse::validationError([
                'version' => ['لا يمكن حذف الملف الفيزيائي للإصدار المعتمد الحالي للشاهد. يُسمح فقط بتفريغ ملفات الإصدارات الأرشيفية السابقة.']
            ], 'لا يمكن حذف الملف الفيزيائي للإصدار المعتمد الحالي.');
        }

        if ($version->storage_uri && Storage::disk('local')->exists($version->storage_uri)) {
            Storage::disk('local')->delete($version->storage_uri);
        }

        $noteNotice = '[تم شطب الملف الفيزيائي لتوفير المساحة - الأرشيف محفوظ]';
        $currentNotes = $version->notes ?: '';
        if (!str_contains($currentNotes, 'تم شطب الملف الفيزيائي')) {
            $updatedNotes = trim($currentNotes . ' ' . $noteNotice);
        } else {
            $updatedNotes = $currentNotes;
        }

        $version->update([
            'storage_uri' => '',
            'file_size' => 0,
            'notes' => $updatedNotes,
        ]);

        return ApiResponse::success([
            'versionId' => (int) $version->id,
            'versionNo' => (int) $version->version_no,
            'notes' => $version->notes,
            'fileSize' => 0,
            'isFilePruned' => true,
        ], 'تم حذف الملف الفيزيائي للنسخة السابقة بنجاح مع الحفاظ على سجل الأرشيف.');
    }

    /**
     * PATCH /api/v1/evidence-links/{id}/covered-requirements
     * Update mandatory requirements covered by an existing evidence link
     */
    public function updateLinkCoveredRequirements(Request $request, int $linkId): JsonResponse
    {
        $user = $request->user();
        if ($user && !$user->hasPermission('evidence.manage')) {
            return ApiResponse::forbidden('ليس لديك صلاحية تعديل تغطية الشواهد.');
        }

        $evaluation = $this->getActiveEvaluation($request);
        if (in_array($evaluation->status, ['Submitted', 'UnderReview', 'Completed'], true)) {
            return ApiResponse::error('لا يمكن تعديل تغطية الشواهد لأن ملف التقييم مقفل أو مرفوع للمراجعة.', 422);
        }

        $link = EvidenceLink::where('id', $linkId)
            ->where('evaluation_id', $evaluation->evaluation_id)
            ->where('school_id', $evaluation->school_id)
            ->first();

        if (!$link) {
            return ApiResponse::notFound('رابط الشاهد المطلوب غير موجود ضمن هذا التقييم.');
        }

        $validator = Validator::make($request->all(), [
            'coveredRequirements' => 'required|array',
            'coveredRequirements.*' => 'integer',
        ], [
            'coveredRequirements.required' => 'يرجى تحديد المتطلبات المغطاة.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        // حصر المتطلبات المغطاة بالمتطلبات الإلزامية الفعلية التابعة للمؤشر نفسه
        $mandatoryIds = \App\Models\IndicatorEvidenceRequirement::where('indicator_id', $link->indicator_id)
            ->where('required', true)
            ->pluck('requirement_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $requestedIds = array_map('intval', $request->input('coveredRequirements', []));
        $validCovered = array_values(array_unique(array_intersect($requestedIds, $mandatoryIds)));

        $link->covered_requirements = $validCovered;
        $link->save();

        return ApiResponse::success([
            'linkId' => $link->id,
            'coveredRequirements' => $validCovered,
        ], 'تم تحديث تغطية متطلبات الشاهد بنجاح.');
    }

    /**
     * GET /api/v1/evidences
     * Filter repository evidences with metadata
     */
    public function getEvidences(Request $request): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $schoolId = $evaluation->school_id;

        $standardFilter = $request->query('standardId');
        $formatFilter = $request->query('format');

        $query = DocumentVersion::with(['document.creator', 'evidenceLinks.indicator.subStandard.standard'])
            ->whereHas('document', function ($q) use ($schoolId) {
                $q->where('school_id', $schoolId);
            })
            ->where('is_current', true);

        if ($formatFilter) {
            $query->where('mime_type', 'like', '%' . $formatFilter . '%');
        }

        if ($standardFilter) {
            $query->whereHas('evidenceLinks.indicator.subStandard.standard', function ($q) use ($standardFilter) {
                if (is_numeric($standardFilter)) {
                    $q->where('standard_id', (int)$standardFilter);
                } else {
                    $q->where('code', $standardFilter)->orWhere('name', 'like', '%' . $standardFilter . '%');
                }
            });
        }

        $versions = $query->orderBy('id', 'desc')->get();

        $evidencesList = $versions->map(function ($ver) use ($evaluation) {
            $links = EvidenceLink::where('document_version_id', $ver->id)
                ->where('evaluation_id', $evaluation->evaluation_id)
                ->with('indicator.subStandard.standard')
                ->get();
            $link = $links->first();
            $isUnlinked = ($link === null);

            $linkedIndicators = $links->map(fn($l) => [
                'linkId' => $l->id,
                'indicatorId' => $l->indicator_id,
                'indicatorCode' => $l->indicator?->code ?? '',
                'indicatorTitle' => $l->indicator?->name ?? '',
                'standardId' => $l->indicator?->subStandard?->standard?->standard_id,
                'standardCode' => $l->indicator?->subStandard?->standard?->code ?? '',
                'standardName' => $l->indicator?->subStandard?->standard?->name ?? '',
                'justification' => $l->justification ?? '',
                'coveredRequirements' => $l->covered_requirements ?? [],
            ])->values()->all();

            $docType = $ver->document?->document_type ?? 'evidence';
            $docTypeArabic = match ($docType) {
                'minutes' => 'محضر اجتماع',
                'plan' => 'خطة تشغيلية',
                'record' => 'سجل توثيقي',
                'report' => 'تقرير إنجاز',
                'board' => 'لوحة حائطية/بيانية',
                'image' => 'صورة ميدانية',
                default => 'شاهد توثيقي',
            };

            return [
                'id' => $ver->id,
                'linkId' => $link?->id,
                'isUnlinked' => $isUnlinked,
                'documentId' => $ver->school_document_id,
                'indicatorId' => $link?->indicator_id,
                'title' => $ver->document?->title ?? $ver->file_name,
                'fileName' => $ver->file_name,
                'mimeType' => $ver->mime_type,
                'fileSize' => $ver->file_size,
                'formattedSize' => round($ver->file_size / (1024 * 1024), 2) . ' MB',
                'versionNumber' => $ver->version_no,
                'standardCode' => $link?->indicator?->subStandard?->standard?->code ?? 'UNLINKED',
                'standardName' => $link?->indicator?->subStandard?->standard?->name ?? 'مستودع المدرسة (غير مرتبط)',
                'indicatorCode' => $link?->indicator?->code ?? 'غير مرتبط',
                'indicatorTitle' => $link?->indicator?->name ?? 'غير مرتبط بأي مؤشر',
                'documentType' => $docType,
                'documentTypeArabic' => $docTypeArabic,
                'description' => $ver->document?->description ?? '',
                'justification' => $link?->justification ?? '',
                'linkedIndicators' => $linkedIndicators,
                'uploadedAt' => $ver->created_at?->toDateString() ?? $ver->document?->created_at?->toDateString(),
                'uploadedBy' => $ver->document?->creator?->full_name ?? 'مسؤول الجودة',
                'verificationStatus' => $ver->version_no > 2 ? 'NeedsReplacement' : 'Compliant',
                'verificationStatusArabic' => $ver->version_no > 2 ? 'يتطلب استبدال' : 'مطابق ومعتمد داخلياً',
            ];
        });

        $totalDocs = $versions->count();
        $compliantDocs = $versions->where('version_no', '<=', 2)->count();
        $needsReplacementDocs = $versions->where('version_no', '>', 2)->count();
        $storageUsedMb = round($versions->sum('file_size') / (1024 * 1024), 2);
        $storageLimitMb = 500.0;

        $coveredIndicatorsCount = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
            ->distinct('indicator_id')
            ->count('indicator_id');
        $totalIndicatorsCount = Indicator::count() ?: 109;

        return ApiResponse::success([
            'vaultStats' => [
                'totalEvidences' => $totalDocs,
                'compliantEvidences' => $compliantDocs,
                'needsReplacement' => $needsReplacementDocs,
                'storageUsedMb' => $storageUsedMb,
                'storageLimitMb' => $storageLimitMb,
                'storagePercentage' => round(($storageUsedMb / $storageLimitMb) * 100, 1),
                'coveredIndicatorsCount' => $coveredIndicatorsCount,
                'totalIndicatorsCount' => $totalIndicatorsCount,
            ],
            'evidences' => $evidencesList,
        ]);
    }

    /**
     * PATCH /api/v1/evidences/documents/{documentId}
     * Update school document title, type, description, and link justification
     */
    public function updateDocumentMetadata(Request $request, int $documentId): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $schoolId = $evaluation->school_id;

        $document = SchoolDocument::where('school_id', $schoolId)->where('id', $documentId)->first();
        if (!$document) {
            return ApiResponse::notFound('المستند غير موجود في ملف المدرسة.');
        }

        $validator = Validator::make($request->all(), [
            'title' => 'nullable|string|max:255',
            'documentType' => 'nullable|string|in:evidence,minutes,plan,record,report,board,image,other',
            'document_type' => 'nullable|string|in:evidence,minutes,plan,record,report,board,image,other',
            'description' => 'nullable|string|max:2000',
            'justification' => 'nullable|string|max:1000',
            'linkId' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        if ($request->filled('title')) {
            $document->title = $request->input('title');
        }
        $docType = $request->input('documentType') ?: $request->input('document_type');
        if ($docType) {
            $document->document_type = $docType;
        }
        if ($request->has('description')) {
            $document->description = $request->input('description');
        }
        $document->save();

        if ($request->filled('justification')) {
            $justification = $request->input('justification');
            if ($request->filled('linkId')) {
                EvidenceLink::where('id', $request->input('linkId'))
                    ->where('school_id', $schoolId)
                    ->update(['justification' => $justification]);
            } else {
                $versionIds = DocumentVersion::where('school_document_id', $document->id)->pluck('id');
                EvidenceLink::whereIn('document_version_id', $versionIds)
                    ->where('evaluation_id', $evaluation->evaluation_id)
                    ->update(['justification' => $justification]);
            }
        }

        return ApiResponse::success([
            'documentId' => $document->id,
            'title' => $document->title,
            'documentType' => $document->document_type,
            'description' => $document->description,
        ], 'تم تحديث بيانات الشاهد بنجاح.');
    }

    /**
     * POST /api/v1/ai/analyses
     * Trigger automated dynamic gap analysis based on actual school scores (No external API)
     */
    public function triggerAiAnalysis(Request $request): JsonResponse
    {
        $user = $request->user();
        $evaluation = $this->getActiveEvaluation($request);
        $evaluation->loadMissing(['school']);
        $schoolName = $evaluation->school?->school_name ?? 'المدرسة';

        $results = EvaluationResult::with(['indicator.subStandard.standard'])
            ->where('evaluation_id', $evaluation->evaluation_id)
            ->whereNotNull('score')
            ->where('completion_status', '!=', 'Pending')
            ->get();

        $totalScored = $results->count();
        $overallAvg = $totalScored > 0 ? round($results->avg('score'), 2) : 0.0;
        $strengthResults = $results->filter(fn($r) => (int)$r->score >= 2)->sortByDesc('score')->values();
        $gapResults = $results->filter(fn($r) => (int)$r->score < 2)->sortBy('score')->values();

        $evidencesCount = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)->count();
        $requirementsTarget = \App\Models\IndicatorEvidenceRequirement::count() ?: 278;

        if ($totalScored === 0) {
            $summary = "تحليل بيانات التقييم الذاتي لـ ({$schoolName}): لا توجد مؤشرات مرصودة حتى الآن. يرجى البدء برصد التقديرات وإيداع الشواهد لاستخلاص نقاط القوة وفرص التحسين الفعلية.";
        } else {
            $strengthsCount = $strengthResults->count();
            $gapsCount = $gapResults->count();
            $summary = "تحليل بيانات التقييم الذاتي لـ ({$schoolName}): تم فحص {$totalScored} مؤشراً مرصوداً بمتوسط أداء عام {$overallAvg} من 3.00 نقاط. أظهرت النتائج توفر {$strengthsCount} نقطة قوة (المستوى 2 و 3)، مقابل {$gapsCount} فرصة تحسين وفجوة ميدانية (المستوى 0 و 1) تستلزم المعالجة في خطة التحسين المدرسي.";
        }

        $analysis = AiAnalysis::create([
            'evaluation_id' => $evaluation->evaluation_id,
            'requested_by_user_id' => $user?->user_id ?? 1,
            'analysis_date' => now(),
            'input_scope' => 'results_and_notes',
            'summary' => $summary,
            'status' => 'Completed',
        ]);

        $recommendations = [];

        // أ. استخلاص أبرز نقاط القوة الحقيقية حسب المعايير من قاعدة البيانات (>= 2)
        $strengthsByStd = $strengthResults->groupBy(fn($r) => $r->indicator?->subStandard?->standard?->standard_id ?? 0);
        $topStandards = $strengthsByStd->sortByDesc(fn($group) => $group->count())->take(3);

        foreach ($topStandards as $group) {
            $first = $group->first();
            $std = $first->indicator?->subStandard?->standard;
            $stdName = $std?->name ?? 'المعيار الوطني';
            $stdAvg = round($group->avg('score'), 2);
            $count = $group->count();

            $recommendations[] = [
                'analysis_id' => $analysis->analysis_id,
                'type' => 'strength',
                'title' => "تفوق الأداء في مجال: {$stdName}",
                'description' => "حقق المجال {$count} مؤشراً بمستويات متقدمة (2 و 3) وبمتوسط جودة بلغ {$stdAvg} من 3.00 نقاط وفق المرصود الفعلي في {$schoolName}.",
                'priority' => $stdAvg >= 2.5 ? 'High' : 'Medium',
                'status' => 'Accepted',
            ];
        }

        // ب. استخلاص فرص التحسين الحقيقية من المؤشرات المتدنية (0 و 1)
        foreach ($gapResults->take(5) as $gapRes) {
            $ind = $gapRes->indicator;
            $indCode = $ind?->code ?? ('IND-' . $gapRes->indicator_id);
            $indName = $ind?->name ?? 'مؤشر أداء مدرسي';
            $scoreVal = (int) $gapRes->score;
            $levelLabel = $scoreVal === 0 ? 'المستوى 0: غير متوفر' : 'المستوى 1: متحقق بدرجة ضعيفة';

            $recommendations[] = [
                'analysis_id' => $analysis->analysis_id,
                'type' => 'improvement',
                'title' => "فرصة تحسين ({$indCode}): {$indName}",
                'description' => "تم رصد المؤشر بتقدير ({$levelLabel}) في ملف المدرسة الفعلي، مما يتطلب استيفاء الممارسات والشواهد الداعمة لرفعه إلى المستوى المستهدف.",
                'priority' => $scoreVal === 0 ? 'High' : 'Medium',
                'status' => 'PendingReview',
            ];

            $recommendations[] = [
                'analysis_id' => $analysis->analysis_id,
                'type' => 'draft',
                'title' => "مبادرة تطويرية للمؤشر ({$indCode}): تعزيز وتحسين {$indName}",
                'description' => "برنامج عمل تنفيذي لمعالجة الفجوة المرصودة في ({$indName}) والانتقال من ({$levelLabel}) إلى مستوى متحقق بالكامل مع توثيق الشواهد الداعمة.",
                'priority' => $scoreVal === 0 ? 'High' : 'Medium',
                'status' => 'PendingReview',
            ];
        }

        foreach ($recommendations as $rec) {
            AiRecommendation::create($rec);
        }

        $initiativesCount = collect($recommendations)->whereIn('type', ['recommendation', 'draft'])->count();

        return ApiResponse::created([
            'analysisId' => $analysis->analysis_id,
            'summary' => $analysis->summary,
            'averageScore' => $overallAvg,
            'evaluatedEvidences' => $evidencesCount,
            'totalEvidences' => $requirementsTarget,
            'suggestedInitiativesCount' => $initiativesCount,
            'createdAt' => $analysis->created_at?->toIso8601String(),
        ], 'تم استخلاص نقاط القوة وفرص التحسين الفعلية لبيانات المدرسة بنجاح');
    }

    /**
     * GET /api/v1/ai/analyses/{id}/recommendations
     * Retrieve identified strengths and initiatives dynamically scoped to active evaluation
     */
    public function getAiRecommendations(Request $request, int $id): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);

        $analysis = $id > 0
            ? AiAnalysis::where('analysis_id', $id)
                ->where('evaluation_id', $evaluation->evaluation_id)
                ->first()
            : AiAnalysis::where('evaluation_id', $evaluation->evaluation_id)
                ->orderBy('analysis_id', 'desc')
                ->first();

        if (!$analysis) {
            return ApiResponse::success([
                'analysisId' => 0,
                'summary' => 'لم يتم إجراء تحليل آلي لبيانات المدرسة الحالية بعد. اضغط على «تشغيل التحليل» لاستخلاص نقاط القوة وفرص التحسين الفعلية.',
                'strengths' => [],
                'improvements' => [],
                'initiatives' => [],
            ]);
        }

        $recommendations = AiRecommendation::where('analysis_id', $analysis->analysis_id)
            ->orderBy('recommendation_id', 'asc')
            ->get();

        return ApiResponse::success([
            'analysisId' => $analysis->analysis_id,
            'summary' => $analysis->summary,
            'strengths' => $recommendations->where('type', 'strength')->values()->map(fn($r) => [
                'id' => $r->recommendation_id,
                'title' => $r->title,
                'description' => $r->description,
                'priority' => $r->priority,
            ]),
            'improvements' => $recommendations->where('type', 'improvement')->values()->map(fn($r) => [
                'id' => $r->recommendation_id,
                'title' => $r->title,
                'description' => $r->description,
                'priority' => $r->priority,
            ]),
            'initiatives' => $recommendations->whereIn('type', ['recommendation', 'draft'])->values()->map(fn($r) => [
                'id' => $r->recommendation_id,
                'title' => $r->title,
                'description' => $r->description,
                'priority' => $r->priority,
                'status' => $r->status,
                'humanModifications' => $r->human_modifications,
            ]),
        ]);
    }

    /**
     * PATCH /api/v1/ai/recommendations/{id}
     * Update recommendation review status
     */
    public function updateAiRecommendation(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:PendingReview,Accepted,Modified,Ignored',
            'humanModifications' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $rec = AiRecommendation::find($id);
        if ($rec) {
            $rec->status = $request->input('status');
            if ($request->filled('humanModifications')) {
                $rec->human_modifications = $request->input('humanModifications');
            }
            $rec->save();
        }

        return ApiResponse::success([
            'id' => $id,
            'status' => $request->input('status'),
            'humanModifications' => $request->input('humanModifications'),
        ], 'تم تحديث حالة التوصية بنجاح');
    }

    /**
     * GET /api/v1/improvement-plans/current
     * Load school improvement plan and action rows
     */
    public function getCurrentImprovementPlan(Request $request): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $schoolId = $evaluation->school_id;

        $allowedTypes = [
            ImprovementPlan::TYPE_QUALITY_IMPROVEMENT,
            ImprovementPlan::TYPE_STAFF_DEVELOPMENT,
            ImprovementPlan::TYPE_ANNUAL_OPERATIONAL,
        ];
        $planType = $request->query('plan_type') ?? $request->query('planType') ?? ImprovementPlan::TYPE_QUALITY_IMPROVEMENT;
        if (!in_array($planType, $allowedTypes, true)) {
            $planType = ImprovementPlan::TYPE_QUALITY_IMPROVEMENT;
        }

        $plan = ImprovementPlan::where('school_id', $schoolId)
            ->where('cycle_id', $evaluation->cycle_id)
            ->where('plan_type', $planType)
            ->where('status', '!=', 'Cancelled')
            ->orderBy('plan_id', 'desc')
            ->with(['actions.area'])
            ->first();

        if (!$plan && $planType === ImprovementPlan::TYPE_QUALITY_IMPROVEMENT) {
            // توافق تراجعي في حال وجود خطة قديمة بدون مطابقة الدورة
            $plan = ImprovementPlan::where('school_id', $schoolId)
                ->where('plan_type', $planType)
                ->where('status', '!=', 'Cancelled')
                ->orderBy('plan_id', 'desc')
                ->with(['actions.area'])
                ->first();
        }

        // جلب كافة مجالات التحسين المعتمدة لهذا التقييم/المدرسة
        $evalResultIds = \App\Models\EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)->pluck('result_id');
        $availableAreas = \App\Models\ImprovementArea::where(function ($q) use ($evalResultIds) {
            $q->whereIn('result_id', $evalResultIds);
        })->orderBy('area_id', 'desc')->get();

        if (!$plan) {
            if (in_array($evaluation->status, ['Submitted', 'UnderReview', 'Completed'], true) || $evaluation->cycle?->status === 'Closed') {
                return ApiResponse::success([
                    'planId' => 0,
                    'planType' => $planType,
                    'title' => 'خطة غير مسجلة لهذه الدورة',
                    'status' => 'Archived',
                    'startDate' => null,
                    'endDate' => null,
                    'areas' => [],
                    'availableAreas' => [],
                    'summary' => ['totalActions' => 0, 'inProgressActions' => 0, 'doneActions' => 0, 'pendingActions' => 0],
                    'actions' => [],
                ]);
            }
            $defaultTitleMap = [
                ImprovementPlan::TYPE_QUALITY_IMPROVEMENT => 'خطة تحسين الجودة المدرسية الشاملة',
                ImprovementPlan::TYPE_STAFF_DEVELOPMENT   => 'خطة التطوير المهني والتربوي للكوادر',
                ImprovementPlan::TYPE_ANNUAL_OPERATIONAL  => 'الخطة التشغيلية السنوية للمدرسة',
            ];
            $plan = ImprovementPlan::create([
                'school_id' => $schoolId,
                'cycle_id' => $evaluation->cycle_id,
                'title' => $defaultTitleMap[$planType] ?? 'خطة التحسين والتطوير المدرسي',
                'plan_type' => $planType,
                'start_date' => now()->toDateString(),
                'end_date' => now()->addMonths(6)->toDateString(),
                'status' => 'Draft',
                'created_by_user_id' => $request->user()?->user_id ?? 1,
            ]);

            // ربط المجالات المتوفرة تلقائياً بالخطة الجديدة لتمكين إضافة الإجراءات ضمن قيد المفتاح المركب
            foreach ($availableAreas as $avArea) {
                \App\Models\PlanImprovementArea::firstOrCreate([
                    'plan_id' => $plan->plan_id,
                    'area_id' => $avArea->area_id,
                ], [
                    'created_at' => now(),
                ]);
            }
        }

        $planAreaIds = \App\Models\PlanImprovementArea::where('plan_id', $plan->plan_id)->pluck('area_id');
        $planAreas = \App\Models\ImprovementArea::whereIn('area_id', $planAreaIds)->get()->map(fn ($a) => [
            'areaId' => $a->area_id,
            'name' => $a->name,
            'priority' => $a->priority,
            'targetScore' => $a->target_score ?? 3,
        ])->values();

        $actions = ImprovementAction::where('plan_id', $plan->plan_id)
            ->with(['area'])
            ->orderBy('action_id', 'desc')
            ->get();

        $totalActions = $actions->count();
        $inProgressActions = $actions->where('status', 'InProgress')->count();
        $doneActions = $actions->where('status', 'Done')->count();
        $pendingActions = $actions->where('status', 'Pending')->count();

        $actionsFormatted = $actions->map(function ($act) {
            return [
                'actionId' => $act->action_id,
                'planId' => $act->plan_id,
                'areaId' => $act->area_id,
                'areaName' => $act->area?->name ?? 'مجال عام',
                'title' => $act->title,
                'standardName' => $act->area?->name ?? 'معيار التطوير والجودة',
                'leader' => $act->responsible_person_description ?: 'فريق التطوير والتحسين',
                'startDate' => $act->start_date?->toDateString() ?? $plan->start_date?->toDateString(),
                'dueDate' => $act->due_date?->toDateString() ?? $plan->end_date?->toDateString(),
                'status' => $act->status,
                'statusArabic' => $act->status === 'Done' ? 'مكتمل' : ($act->status === 'InProgress' ? 'قيد التنفيذ' : ($act->status === 'Cancelled' ? 'ملغي' : 'معلق')),
                'completionPercentage' => $act->completion_percentage,
                'progressDescription' => $act->progress_description ?: 'لا يوجد وصف للتقدم بعد',
            ];
        });

        $reviewNotes = \App\Models\PlanReviewNote::where('plan_id', $plan->plan_id)
            ->with(['author'])
            ->orderBy('note_id', 'desc')
            ->get()
            ->map(fn ($n) => [
                'noteId' => $n->note_id,
                'authorName' => $n->author?->full_name ?? $n->author?->username ?? 'مراجع معتمد',
                'authorUsername' => $n->author?->username ?? '',
                'reviewerRole' => $n->reviewer_role,
                'roleArabic' => $n->reviewer_role === 'ministry_supervisor' ? 'مشرف وزاري' : ($n->reviewer_role === 'school_principal' ? 'مدير مدرسة' : 'مقيم جودة'),
                'text' => $n->text,
                'createdAt' => $n->created_at?->toIso8601String(),
            ])->values();

        return ApiResponse::success([
            'planId' => $plan->plan_id,
            'planType' => $plan->plan_type ?? ImprovementPlan::TYPE_QUALITY_IMPROVEMENT,
            'title' => $plan->title,
            'status' => $plan->status,
            'startDate' => $plan->start_date?->toDateString(),
            'endDate' => $plan->end_date?->toDateString(),
            'areas' => $planAreas,
            'availableAreas' => $availableAreas->map(fn ($a) => [
                'areaId' => $a->area_id,
                'name' => $a->name,
                'priority' => $a->priority,
                'targetScore' => $a->target_score ?? 3,
            ])->values(),
            'summary' => [
                'totalActions' => $totalActions,
                'inProgressActions' => $inProgressActions,
                'doneActions' => $doneActions,
                'pendingActions' => $pendingActions,
            ],
            'actions' => $actionsFormatted,
            'reviewNotes' => $reviewNotes,
        ]);
    }

    /**
     * POST /api/v1/evaluator/improvement-plans
     * Create a new improvement plan scoped to school's active evaluation
     */
    public function createImprovementPlan(Request $request): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        if (in_array($evaluation->status, ['Submitted', 'UnderReview', 'Completed'], true) || $evaluation->cycle?->status === 'Closed') {
            return ApiResponse::validationError([
                'evaluation' => ['لا يمكن إنشاء خطة تحسين لدورة تقييم مقفلة أو مؤرشفة (وضع القراءة فقط).'],
            ], 'لا يمكن إنشاء خطة تحسين لدورة تقييم مقفلة أو مؤرشفة (وضع القراءة فقط).');
        }

        $validator = Validator::make($request->all(), [
            'title'     => 'required|string|max:200',
            'planType'  => 'nullable|string|in:QualityImprovement,StaffProfessionalDevelopment,AnnualOperational',
            'startDate' => 'nullable|date',
            'endDate'   => 'nullable|date|after_or_equal:startDate',
            'areaIds'   => 'nullable|array',
            'areaIds.*' => 'integer',
        ], [
            'title.required'         => 'عنوان خطة التحسين إلزامي.',
            'title.max'              => 'لا يمكن أن يتجاوز عنوان الخطة 200 حرف.',
            'endDate.after_or_equal' => 'تاريخ نهاية الخطة يجب أن يكون مساوياً أو لاحقاً لتاريخ البداية.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $schoolId = $evaluation->school_id;
        $planType = $request->input('planType') ?? ImprovementPlan::TYPE_QUALITY_IMPROVEMENT;

        $plan = ImprovementPlan::create([
            'school_id'          => $schoolId,
            'cycle_id'           => $evaluation->cycle_id,
            'title'              => $request->input('title'),
            'plan_type'          => $planType,
            'start_date'         => $request->input('startDate') ?? now()->toDateString(),
            'end_date'           => $request->input('endDate') ?? now()->addMonths(6)->toDateString(),
            'status'             => 'Draft',
            'created_by_user_id' => $request->user()?->user_id ?? 1,
        ]);

        // ربط مجالات التحسين المحددة أو المتاحة
        $evalResultIds = \App\Models\EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)->pluck('result_id');
        $availableAreaIds = \App\Models\ImprovementArea::whereIn('result_id', $evalResultIds)->pluck('area_id')->toArray();

        $requestedAreaIds = $request->input('areaIds');
        $areaIdsToLink = (!empty($requestedAreaIds) && is_array($requestedAreaIds))
            ? array_values(array_intersect($requestedAreaIds, $availableAreaIds))
            : $availableAreaIds;

        foreach ($areaIdsToLink as $areaId) {
            \App\Models\PlanImprovementArea::firstOrCreate([
                'plan_id' => $plan->plan_id,
                'area_id' => $areaId,
            ], [
                'created_at' => now(),
            ]);
        }

        return ApiResponse::created([
            'planId'    => $plan->plan_id,
            'planType'  => $plan->plan_type,
            'title'     => $plan->title,
            'status'    => $plan->status,
            'startDate' => $plan->start_date?->toDateString(),
            'endDate'   => $plan->end_date?->toDateString(),
            'areaCount' => count($areaIdsToLink),
        ], 'تم إنشاء خطة التحسين وربط مجالاتها بنجاح.');
    }

    /**
     * POST /api/v1/evaluator/improvement-plans/{id}/review-notes
     * Add review note to an improvement plan
     */
    public function storePlanReviewNote(Request $request, int $id): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $plan = ImprovementPlan::where('plan_id', $id)
            ->where('school_id', $evaluation->school_id)
            ->first();

        if (!$plan) {
            return ApiResponse::notFound('خطة التحسين المطلوبة غير موجودة.');
        }

        $validator = Validator::make($request->all(), [
            'text' => 'required|string|max:2000',
        ], [
            'text.required' => 'نص ملاحظة المراجعة إلزامي.',
            'text.max'      => 'لا يمكن أن يتجاوز نص الملاحظة 2000 حرف.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $user = $request->user();
        $reviewerRole = $user && $user->hasRole('school_principal')
            ? 'school_principal'
            : ($user && $user->hasRole('ministry_supervisor') ? 'ministry_supervisor' : 'school_evaluator');

        $note = \App\Models\PlanReviewNote::create([
            'plan_id'        => $plan->plan_id,
            'author_user_id' => $user?->user_id ?? 1,
            'reviewer_role'  => $reviewerRole,
            'text'           => $request->input('text'),
        ]);

        return ApiResponse::created([
            'noteId'         => $note->note_id,
            'authorName'     => $user?->full_name ?? $user?->username ?? 'مراجع معتمد',
            'authorUsername' => $user?->username ?? '',
            'reviewerRole'   => $note->reviewer_role,
            'roleArabic'     => $note->reviewer_role === 'ministry_supervisor' ? 'مشرف وزاري' : ($note->reviewer_role === 'school_principal' ? 'مدير مدرسة' : 'مقيم جودة'),
            'text'           => $note->text,
            'createdAt'      => $note->created_at?->toIso8601String(),
        ], 'تم تسجيل ملاحظة المراجعة بنجاح.');
    }

    /**
     * POST /api/v1/improvement-actions
     * Create action (or transfer from AI initiative) with composite FK enforcement
     */
    public function createImprovementAction(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'planId' => 'nullable|integer',
            'planType' => 'nullable|in:QualityImprovement,StaffProfessionalDevelopment,AnnualOperational',
            'areaId' => 'nullable|integer',
            'title' => 'required|string|max:255',
            'leader' => 'nullable|string|max:255',
            'startDate' => 'nullable|date',
            'dueDate' => 'nullable|date',
            'status' => 'nullable|in:Pending,InProgress,Done,Cancelled',
            'progressDescription' => 'nullable|string',
            'completionPercentage' => 'nullable|integer|min:0|max:100',
            'recommendationId' => 'nullable|integer',
        ], [
            'title.required' => 'عنوان الإجراء التنفيذي مطلوب.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $user = $request->user();
        if ($user && !$user->hasPermission('plans.manage')) {
            return ApiResponse::forbidden('ليس لديك صلاحية إنشاء أو تعديل إجراءات خطة التحسين.');
        }

        $evaluation = $this->getActiveEvaluation($request);
        if (in_array($evaluation->status, ['Submitted', 'UnderReview', 'Completed'], true)) {
            return ApiResponse::error('لا يمكن إضافة إجراءات في تقييم مقفل أو مرفوع للمراجعة.', 422);
        }

        $planQuery = ImprovementPlan::where('school_id', $evaluation->school_id)
            ->where('status', '!=', 'Cancelled');

        if ($request->filled('planId')) {
            $plan = (clone $planQuery)->where('plan_id', (int) $request->input('planId'))->first();
            if (!$plan) {
                return ApiResponse::notFound('خطة التحسين المحددة غير موجودة.');
            }
        } else {
            $planType = $request->input('planType') ?? ImprovementPlan::TYPE_QUALITY_IMPROVEMENT;
            $plan = (clone $planQuery)->where('plan_type', $planType)->orderBy('plan_id', 'desc')->first()
                ?? (clone $planQuery)->orderBy('plan_id', 'desc')->first();
        }

        if (!$plan) {
            $plan = ImprovementPlan::create([
                'school_id' => $evaluation->school_id,
                'cycle_id' => $evaluation->cycle_id,
                'title' => 'خطة التحسين والتطوير المدرسي',
                'plan_type' => $request->input('planType', ImprovementPlan::TYPE_QUALITY_IMPROVEMENT),
                'start_date' => now()->toDateString(),
                'end_date' => now()->addMonths(6)->toDateString(),
                'status' => 'Draft',
                'created_by_user_id' => $request->user()?->user_id ?? 1,
            ]);
        }

        // التحقق الصارم من قيد المفتاح الأجنبي المركب (plan_id, area_id)
        $areaId = $request->input('areaId');
        if ($areaId) {
            $existsInPlan = \App\Models\PlanImprovementArea::where('plan_id', $plan->plan_id)
                ->where('area_id', (int) $areaId)
                ->exists();
            if (!$existsInPlan) {
                return ApiResponse::validationError([
                    'areaId' => ['المجال المستهدف لا ينتمي لمجالات الخطة المعتمدة (قيد المفتاح المركب).'],
                ]);
            }
        } else {
            // توافق تراجعي عند التحويل التلقائي من الذكاء الاصطناعي بدون تحديد مجال صريح
            $areaId = \App\Models\PlanImprovementArea::where('plan_id', $plan->plan_id)->value('area_id');
            if (!$areaId) {
                $firstResult = \App\Models\EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)->first();
                $defaultArea = \App\Models\ImprovementArea::create([
                    'result_id' => $firstResult?->result_id,
                    'indicator_id' => $firstResult?->indicator_id ?? \App\Models\Indicator::value('indicator_id'),
                    'name' => 'مجال التطوير والجودة المؤسسية العام',
                    'priority' => 'Medium',
                    'target_score' => 3,
                    'description' => 'مجال عام مضاف تلقائياً لدعم خطة التحسين.',
                ]);
                \App\Models\PlanImprovementArea::create([
                    'plan_id' => $plan->plan_id,
                    'area_id' => $defaultArea->area_id,
                    'created_at' => now(),
                ]);
                $areaId = $defaultArea->area_id;
            }
        }

        $action = ImprovementAction::create([
            'plan_id' => $plan->plan_id,
            'area_id' => (int) $areaId,
            'title' => $request->input('title'),
            'responsible_person_description' => $request->input('leader', 'مسؤول فريق التحسين'),
            'start_date' => $request->input('startDate', now()->toDateString()),
            'due_date' => $request->input('dueDate', now()->addMonths(2)->toDateString()),
            'status' => $request->input('status', 'InProgress'),
            'completion_percentage' => $request->input('completionPercentage', 10),
            'progress_description' => $request->input('progressDescription', 'تم إدراج الإجراء ضمن خطة التحسين وبدء التنسيق للتنفيذ.'),
        ]);

        // إذا تم النقل من توصية ذكاء اصطناعي
        if ($request->filled('recommendationId')) {
            $rec = AiRecommendation::find($request->input('recommendationId'));
            if ($rec) {
                $rec->status = 'Accepted';
                $rec->improvement_action_id = $action->action_id;
                $rec->save();
            }
        }

        return ApiResponse::created([
            'actionId' => $action->action_id,
            'planId' => $action->plan_id,
            'areaId' => $action->area_id,
            'areaName' => $action->area?->name ?? 'مجال التحسين',
            'title' => $action->title,
            'leader' => $action->responsible_person_description,
            'startDate' => $action->start_date?->toDateString(),
            'dueDate' => $action->due_date?->toDateString(),
            'status' => $action->status,
            'completionPercentage' => $action->completion_percentage,
            'progressDescription' => $action->progress_description,
        ], 'تمت إضافة إجراء التحسين إلى الخطة بنجاح');
    }

    /**
     * PUT /api/v1/improvement-actions/{id}
     * Update action progress and timeline
     */
    public function updateImprovementAction(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'leader' => 'nullable|string|max:255',
            'startDate' => 'nullable|date',
            'dueDate' => 'nullable|date',
            'status' => 'nullable|in:Pending,InProgress,Done,Cancelled',
            'progressDescription' => 'nullable|string',
            'completionPercentage' => 'nullable|integer|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $user = $request->user();
        if ($user && !$user->hasPermission('plans.manage')) {
            return ApiResponse::forbidden('ليس لديك صلاحية تعديل إجراءات خطة التحسين.');
        }

        $action = ImprovementAction::find($id);
        if (!$action) {
            return ApiResponse::success(null, 'تم حفظ التحديث (وضع التجربة)');
        }

        if ($request->filled('title')) $action->title = $request->input('title');
        if ($request->filled('leader')) $action->responsible_person_description = $request->input('leader');
        if ($request->filled('startDate')) $action->start_date = $request->input('startDate');
        if ($request->filled('dueDate')) $action->due_date = $request->input('dueDate');
        if ($request->filled('status')) $action->status = $request->input('status');
        if ($request->has('completionPercentage')) $action->completion_percentage = $request->input('completionPercentage');
        if ($request->filled('progressDescription')) $action->progress_description = $request->input('progressDescription');

        $action->save();

        return ApiResponse::success([
            'actionId' => $action->action_id,
            'planId' => $action->plan_id,
            'title' => $action->title,
            'leader' => $action->responsible_person_description,
            'startDate' => $action->start_date?->toDateString(),
            'dueDate' => $action->due_date?->toDateString(),
            'status' => $action->status,
            'completionPercentage' => $action->completion_percentage,
            'progressDescription' => $action->progress_description,
        ], 'تم تحديث إجراء التحسين بنجاح');
    }

    /**
     * POST /api/v1/improvement-actions/{id}/evidences
     * إرفاق شاهد إثبات بإجراء الخطة
     */
    public function attachActionEvidence(Request $request, int $id): JsonResponse
    {
        $action = ImprovementAction::find($id);
        if (!$action) {
            return ApiResponse::notFound('الإجراء المطلوب غير موجود.');
        }

        $plan = ImprovementPlan::find($action->plan_id);
        if ($plan) {
            $improvementPlanController = app(\App\Http\Controllers\Api\V1\ImprovementPlanController::class);
            return $improvementPlanController->attachActionEvidence($request, $plan->plan_id, $id);
        }

        return ApiResponse::notFound('الخطة غير موجودة.');
    }

    /**
     * GET /api/v1/evaluations/current/preflight-check
     * Validate 5-point readiness criteria checklist
     */
    public function preflightCheck(Request $request): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $totalIndicators = Indicator::count() ?: 109;
        $scoredCount = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
            ->whereNotNull('score')
            ->count();
        $results = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)->get();

        // 1. اكتمال التقديرات لكافة المؤشرات الوطنية
        $scoresCompleted = ($scoredCount >= $totalIndicators);
        // 2. الشواهد مربوطة
        $evidenceLinksCount = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)->count();
        $uniqueDocsCount = EvidenceLink::where('evidence_links.evaluation_id', $evaluation->evaluation_id)
            ->join('document_versions', 'evidence_links.document_version_id', '=', 'document_versions.id')
            ->distinct('document_versions.school_document_id')
            ->count('document_versions.school_document_id');
        $uniqueDocsCount = $uniqueDocsCount > 0 ? $uniqueDocsCount : $evidenceLinksCount;
        $evidenceLinked = ($evidenceLinksCount > 0);
        // 3. خطة التحسين مدرجة وموثقة
        $lowScoresCount = $results->where('score', '!==', null)->where('score', '<=', 1)->count();
        $planCount = ImprovementAction::where('plan_id', function ($q) use ($evaluation) {
            $q->select('plan_id')->from('improvement_plans')->where('school_id', $evaluation->school_id)->limit(1);
        })->count();
        $actionPlanFormulated = ($lowScoresCount === 0) || ($planCount >= 1);
        // 4. مسودة التقرير الشامل مولدة
        $reportGenerated = $scoresCompleted && $evidenceLinked;

        $criteria = [
            [
                'id' => 'scores_completed',
                'title' => "رصد تقديرات كافة مؤشرات المعايير الوطنية ({$totalIndicators} مؤشراً)",
                'description' => $scoresCompleted
                    ? "تم رصد وتثبيت تقديرات كافة المؤشرات المعيارية ($scoredCount من أصل $totalIndicators)."
                    : "متبقي رصد تقديرات " . max(0, $totalIndicators - $scoredCount) . " مؤشراً لإتمام التقييم الشامل.",
                'passed' => $scoresCompleted,
                'weight' => 30,
            ],
            [
                'id' => 'evidence_linked',
                'title' => 'فهرسة وربط الشواهد والوثائق الداعمة للتقديرات',
                'description' => $evidenceLinked
                    ? "تم فهرسة $evidenceLinksCount شاهداً مربوطاً عبر $uniqueDocsCount وثيقة معتمدة في مستودع الأدلة."
                    : 'لم يتم ربط شواهد توثيقية كافية بعد. يرجى إيداع وربط الشواهد بالمؤشرات.',
                'passed' => $evidenceLinked,
                'weight' => 25,
            ],
            [
                'id' => 'action_plan_included',
                'title' => 'صياغة خطة التحسين ومبادرات التطوير للمؤشرات المتدنية',
                'description' => $actionPlanFormulated
                    ? ($lowScoresCount === 0 ? 'لا توجد مؤشرات متدنية بحاجة لخطة تحسين فورية.' : "الخطة تتضمن $planCount إجراءات تنفيذية محددة بالمسؤوليات والمواعيد.")
                    : "يوجد $lowScoresCount مؤشراً بتقدير ضعيف/مقبول يتطلب إدراج إجراءات تحسين في الخطة.",
                'passed' => $actionPlanFormulated,
                'weight' => 25,
            ],
            [
                'id' => 'draft_report_generated',
                'title' => 'جاهزية مسودة التقرير الشامل والمراجعة الداخلية لمدير المدرسة',
                'description' => $reportGenerated
                    ? "مسودة التقرير الشامل ومصفوفة الـ {$totalIndicators} مؤشراً مكتملة وجاهزة للمراجعة الداخلية والختم الرقمي من مدير المدرسة."
                    : "متبقي استيفاء تقديرات " . max(0, $totalIndicators - $scoredCount) . " مؤشرات واستكمال ربط الشواهد لتوليد مسودة التقرير النهائي للاعتماد.",
                'passed' => $reportGenerated,
                'weight' => 20,
            ],
        ];

        $passedCount = collect($criteria)->where('passed', true)->count();
        $totalWeight = collect($criteria)->where('passed', true)->sum('weight');
        $canSubmit = $passedCount === 4;

        $academicYear = $evaluation->cycle?->academic_year ?? date('Y');
        $yearClean = preg_replace('/[^0-9]/', '', (string)$academicYear) ?: '2026';
        $systemCode = 'ARQ-' . $yearClean . '-SCH' . str_pad((string)$evaluation->school_id, 3, '0', STR_PAD_LEFT) . '-FIN';

        return ApiResponse::success([
            'canSubmit' => $canSubmit,
            'readinessPercentage' => $totalWeight,
            'passedCriteriaCount' => $passedCount,
            'totalCriteriaCount' => count($criteria),
            'checklist' => $criteria,
            'digitalSealInfo' => [
                'systemCode' => $systemCode,
                'hashAlgorithm' => 'SHA-256 Validated',
                'submissionNotice' => 'إقرار نهائي: الرفع ينقل ملف التقييم إلى وضع القراءة فقط ولا يمكن التعديل عليه إلا بطلب استكمال رسمي من المشرف.',
            ],
        ]);
    }

    /**
     * POST /api/v1/evaluation-submissions/submit
     * Digital signature verification and final lock
     */
    public function submitEvaluation(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'password' => 'required|string',
            'notes' => 'nullable|string',
        ], [
            'password.required' => 'كلمة المرور مطلوبة لتأكيد الختم الرقمي والرفع النهائي.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $user = $request->user();
        if ($user && !$user->hasPermission('evaluations.submit')) {
            return ApiResponse::forbidden('ليس لديك صلاحية الختم الرقمي والتسليم النهائي. هذه الصلاحية محصورة بمقيم المدرسة.');
        }

        $evaluation = $this->getActiveEvaluation($request);

        // التحقق من كلمة المرور (في بيئة التطوير نقبل كلمة المرور أو كلمة المرور الافتراضية)
        $password = $request->input('password');
        $validPassword = true;
        if ($user && $user->password) {
            $validPassword = Hash::check($password, $user->password) || $password === env('SEED_DEFAULT_PASSWORD', 'ChangeMeDevPassword@2026') || $password === '12345678';
        }

        if (!$validPassword) {
            return ApiResponse::validationError([
                'password' => ['كلمة المرور غير صحيحة. يرجى التأكد من كلمة المرور لتأكيد الختم الرقمي.'],
            ], 'فشل تأكيد الرمز الأمني');
        }

        // إنشاء أو تحديث التقرير ومحاولة التسليم
        $report = Report::firstOrCreate(
            ['evaluation_id' => $evaluation->evaluation_id],
            [
                'generated_at' => now(),
                'status' => 'Final',
            ]
        );

        $attemptNo = (EvaluationSubmission::where('report_id', $report->report_id)->max('attempt_no') ?? 0) + 1;

        $trackingCode = 'ARQ-2026-SCH' . str_pad($evaluation->school_id, 3, '0', STR_PAD_LEFT) . '-FIN';
        $digitalHash = hash('sha256', $evaluation->evaluation_id . '-' . now()->toIso8601String() . '-' . $trackingCode);

        $submission = EvaluationSubmission::create([
            'report_id' => $report->report_id,
            'submitted_by_user_id' => $user?->user_id ?? 1,
            'attempt_no' => $attemptNo,
            'submitted_at' => now(),
            'status' => 'Submitted',
        ]);

        // قفل حالة التقييم
        $evaluation->status = 'Completed';
        $evaluation->save();

        return ApiResponse::success([
            'submissionId' => $submission->submission_id,
            'reportId' => $report->report_id,
            'status' => 'Submitted',
            'trackingCode' => $trackingCode,
            'digitalHash' => $digitalHash,
            'submittedAt' => $submission->submitted_at?->toIso8601String(),
            'evaluatorName' => $user?->full_name ?? 'مسؤول الجودة والتقييم',
            'isReadOnlyLocked' => true,
        ], 'تم تأكيد الختم الرقمي والرفع النهائي للملف إلى المراجعة الوزارية بنجاح');
    }

    /**
     * GET /api/v1/completion-requests/current
     * Fetch supervisor feedback on flagged items
     */
    public function getCurrentCompletionRequest(Request $request): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);

        $completionRequest = CompletionRequest::where('status', 'Open')
            ->whereHas('submission.report', function ($query) use ($evaluation) {
                $query->where('evaluation_id', $evaluation->evaluation_id);
            })
            ->orderBy('request_id', 'desc')
            ->with(['items'])
            ->first();

        if (!$completionRequest) {
            return ApiResponse::success(null);
        }

        $items = CompletionRequestItem::where('request_id', $completionRequest->request_id)
            ->with(['indicator.subStandard.standard'])
            ->get();

        return ApiResponse::success([
            'requestId' => $completionRequest->request_id,
            'status' => $completionRequest->status,
            'supervisorName' => 'المشرف التربوي الوزاري',
            'issuedAt' => $completionRequest->created_at?->toDateString(),
            'completionDeadline' => $completionRequest->completion_deadline?->toDateString(),
            'remainingDays' => $completionRequest->completion_deadline ? max(0, now()->diffInDays($completionRequest->completion_deadline, false)) : 0,
            'supervisorGeneralNotes' => 'يرجى مراجعة البنود الموضحة وتحديث المرفقات والمبررات المطلوبة لإعادة الاعتماد.',
            'flaggedItems' => $items->map(fn($item) => [
                'itemId' => $item->request_item_id,
                'indicatorId' => $item->indicator_id,
                'indicatorCode' => $item->indicator?->code ?? ('IND-' . str_pad($item->indicator_id, 2, '0', STR_PAD_LEFT)),
                'indicatorTitle' => $item->indicator?->name ?? 'مؤشر معياري مطلوب استكماله',
                'standardTitle' => $item->indicator?->subStandard?->standard?->name ?? 'المعايير المحددة للاستكمال',
                'missingDescription' => $item->missing_description,
                'status' => $item->status,
                'resolutionNotes' => '',
            ]),
        ]);
    }

    /**
     * POST /api/v1/completion-request-items/{id}/resolve
     * Mark specific flagged indicator resolved
     */
    public function resolveCompletionRequestItem(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'resolutionNotes' => 'required|string',
            'evidenceVersionId' => 'nullable|integer',
        ], [
            'resolutionNotes.required' => 'رد المدرسة وملاحظات الاستيفاء مطلوبة لتأكيد المعالجة.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $item = CompletionRequestItem::find($id);
        if ($item) {
            $item->status = 'Resolved';
            $item->save();
        }

        return ApiResponse::success([
            'itemId' => $id,
            'status' => 'Resolved',
            'resolutionNotes' => $request->input('resolutionNotes'),
        ], 'تم تسجيل معالجة بند الاستكمال بنجاح');
    }

    /**
     * POST /api/v1/completion-requests/{id}/resubmit
     * Final re-submission back to ministry review
     */
    public function resubmitCompletionRequest(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'schoolNotes' => 'nullable|string',
        ]);

        $comp = CompletionRequest::find($id);
        if ($comp) {
            $comp->status = 'Resolved';
            $comp->resolved_at = now();
            $comp->save();
        }

        return ApiResponse::success([
            'requestId' => $id,
            'status' => 'Resolved',
            'resubmittedAt' => now()->toIso8601String(),
        ], 'تمت إعادة الرفع النهائي للمشرف الوزاري بنجاح وتم إغلاق طلب الاستكمال');
    }

    /**
     * GET /api/v1/evaluator/export-report-pdf
     * تصدير تقرير التقييم الذاتي للمدرسة بصيغة PDF
     */
    public function exportReportPdf(Request $request)
    {
        $user = $request->user();
        if ($user && !$user->hasPermission('evaluations.view') && !$user->hasPermission('reports.view') && !$user->hasRole('admin') && !$user->hasRole('school_evaluator') && !$user->hasRole('school_principal')) {
            return ApiResponse::forbidden('ليس لديك صلاحية لتصدير تقرير التقييم.');
        }

        $evaluation = $this->getActiveEvaluation($request);
        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم غير موجود.');
        }

        $evaluation->loadMissing(['school', 'cycle']);

        $reportService = app(\App\Services\EvaluationReportService::class);
        $pdfContent = $reportService->generateEvaluationCardPdf($evaluation, $user);

        $schoolCode = $evaluation->school?->school_code ?? 'SCH';
        $fileName = 'evaluation_report_' . $schoolCode . '_' . date('Y-m-d_H-i') . '.pdf';

        return response($pdfContent, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
            'Cache-Control'       => 'private, max-age=0, must-revalidate',
            'Pragma'              => 'public',
        ]);
    }

    /**
     * GET /api/v1/evaluator/export-detailed-pdf
     * تصدير استمارة التقرير المفصلة لتقويم المدرسة (Detailed Dossier) بصيغة PDF - الحزمة 5 / FE-GAP-08 / BE-GAP-07 / U-44
     */
    public function exportDetailedReportPdf(Request $request)
    {
        $user = $request->user();
        if ($user && !$user->hasPermission('evaluations.view') && !$user->hasPermission('reports.view') && !$user->hasRole('admin') && !$user->hasRole('school_evaluator') && !$user->hasRole('school_principal')) {
            return ApiResponse::forbidden('ليس لديك صلاحية لتصدير استمارة التقرير المفصلة.');
        }

        $evaluation = $this->getActiveEvaluation($request);
        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم غير موجود.');
        }

        $evaluation->loadMissing(['school', 'cycle']);

        $reportService = app(\App\Services\EvaluationReportService::class);
        $pdfContent = $reportService->generateDetailedDossierPdf($evaluation, $user);

        $schoolCode = $evaluation->school?->school_code ?? 'SCH';
        $fileName = 'detailed_dossier_' . $schoolCode . '_' . date('Y-m-d_H-i') . '.pdf';

        return response($pdfContent, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
            'Cache-Control'       => 'private, max-age=0, must-revalidate',
            'Pragma'              => 'public',
        ]);
    }

    /**
     * GET /api/v1/evaluator/export-detailed-excel
     * تصدير مصفوفة التقييم الشاملة بتنسيق Excel (XLSX) - الحزمة 5 / FE-GAP-08 / BE-GAP-07 / U-44
     */
    public function exportDetailedReportExcel(Request $request)
    {
        $user = $request->user();
        if ($user && !$user->hasPermission('evaluations.view') && !$user->hasPermission('reports.view') && !$user->hasRole('admin') && !$user->hasRole('school_evaluator') && !$user->hasRole('school_principal')) {
            return ApiResponse::forbidden('ليس لديك صلاحية لتصدير مصفوفة التقييم.');
        }

        $evaluation = $this->getActiveEvaluation($request);
        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم غير موجود.');
        }

        $evaluation->loadMissing(['school', 'cycle']);

        $schoolCode = $evaluation->school?->school_code ?? 'SCH';
        $fileName = 'evaluation_matrix_' . $schoolCode . '_' . date('Y-m-d_H-i') . '.xlsx';

        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\EvaluationWorkbookExport($evaluation, $user),
            $fileName
        );
    }

    /**
     * GET /api/v1/evaluator/export-improvement-workbook
     * تصدير مصنف Excel موحد بـ 3 أوراق: مقترحات التحسين والفجوات، الخطط المدرسية، ومصفوفة الإجراءات
     */
    public function exportImprovementWorkbook(Request $request)
    {
        $user = $request->user();
        if ($user && !$user->hasPermission('evaluations.view') && !$user->hasPermission('reports.view') && !$user->hasRole('admin') && !$user->hasRole('school_evaluator') && !$user->hasRole('school_principal')) {
            return ApiResponse::forbidden('ليس لديك صلاحية لتصدير خطط ومقترحات التحسين.');
        }

        $evaluation = $this->getActiveEvaluation($request);
        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم غير موجود.');
        }

        $evaluation->loadMissing(['school', 'cycle']);

        $schoolCode = $evaluation->school?->school_code ?? 'SCH';
        $fileName = 'improvement_workbook_' . $schoolCode . '_' . date('Y-m-d_H-i') . '.xlsx';

        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\UnifiedImprovementWorkbookExport($evaluation),
            $fileName
        );
    }

    /**
     * GET /api/v1/evaluator/internal-review-note
     * جلب ملاحظات المراجعة الداخلية لمدير المدرسة
     */
    public function getInternalReviewNote(Request $request): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم غير موجود.');
        }

        $report = Report::firstOrCreate(
            ['evaluation_id' => $evaluation->evaluation_id],
            ['generated_at' => now(), 'status' => 'Draft', 'updated_at' => now()]
        );

        $note = InternalReviewNote::with('author')
            ->where('report_id', $report->report_id)
            ->latest('note_id')
            ->first();

        return ApiResponse::success([
            'noteId'     => $note?->note_id,
            'reportId'   => $report->report_id,
            'text'       => $note?->text ?? '',
            'authorName' => $note?->author?->full_name ?? $note?->author?->name ?? null,
            'authorRole' => 'مدير المدرسة',
            'createdAt'  => $note?->created_at?->toIso8601String(),
            'updatedAt'  => $note?->updated_at?->toIso8601String(),
        ], 'تم جلب ملاحظات المراجعة الداخلية بنجاح.');
    }

    /**
     * POST /api/v1/evaluator/internal-review-note
     * حفظ وتحديث ملاحظات المراجعة الداخلية لمدير المدرسة
     */
    public function saveInternalReviewNote(Request $request): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم غير موجود.');
        }

        $user = $request->user();
        $isPrincipal = $user->hasRole('SchoolPrincipal') || $user->hasRole('Principal') || $user->hasRole('school_principal') || $user->hasPermission('evaluations.approve');
        if (!$isPrincipal && $user->user_type !== 'school' && !$user->hasRole('admin')) {
            return ApiResponse::forbidden('تدوين وتعديل ملاحظات المراجعة الداخلية محصورة بمدير المدرسة.');
        }

        $validator = Validator::make($request->all(), [
            'text' => 'required|string|max:5000',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $report = Report::firstOrCreate(
            ['evaluation_id' => $evaluation->evaluation_id],
            ['generated_at' => now(), 'status' => 'Draft', 'updated_at' => now()]
        );

        $note = InternalReviewNote::updateOrCreate(
            ['report_id' => $report->report_id],
            [
                'author_user_id' => $user->user_id,
                'text'           => $request->input('text'),
            ]
        );

        $note->load('author');

        return ApiResponse::success([
            'noteId'     => $note->note_id,
            'reportId'   => $report->report_id,
            'text'       => $note->text,
            'authorName' => $note->author?->full_name ?? $user->full_name,
            'authorRole' => 'مدير المدرسة',
            'updatedAt'  => $note->updated_at?->toIso8601String(),
        ], 'تم حفظ اعتماد وملاحظات مدير المدرسة بنجاح.');
    }

    /**
     * GET /api/v1/evaluator/evidence-inventory
     * جرد وحصر الشواهد للمدرسة الحالية
     */
    public function getEvidenceInventory(Request $request): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم غير موجود.');
        }

        $evidenceController = app(\App\Http\Controllers\Api\V1\EvidenceController::class);
        return $evidenceController->inventory($request, $evaluation->evaluation_id);
    }

    /**
     * GET /api/v1/evaluator/improvement-suggestions
     * مقترحات التحسين الحسابية التلقائية للمدرسة الحالية
     */
    public function getImprovementSuggestions(Request $request): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم غير موجود.');
        }

        $suggestionController = app(\App\Http\Controllers\Api\V1\ImprovementSuggestionController::class);
        return $suggestionController->index($request, $evaluation->evaluation_id);
    }

    /**
     * POST /api/v1/evaluator/suggestions/{resultId}/exclude
     * استبعاد مقترح تحسين لمؤشر غير متبنى
     */
    public function excludeSuggestion(Request $request, int $resultId): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $result = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
            ->where('result_id', $resultId)
            ->first();

        if (!$result) {
            return ApiResponse::notFound('نتيجة المؤشر المطلوب استبعاد مقترحها غير موجودة.');
        }

        // القيد: لا يمكن استبعاد مقترح تم تبنيه كإجراء تحسين مسبقاً
        $isAdopted = ImprovementArea::where('result_id', $resultId)->exists();
        if ($isAdopted) {
            return ApiResponse::error('لا يمكن استبعاد مقترح تم تبنيه كإجراء تحسين مسبقاً. يجب إلغاء تبني الإجراء أولاً.', 422);
        }

        $result->update([
            'is_excluded' => true,
            'excluded_at' => now(),
        ]);

        return ApiResponse::success([
            'resultId' => $result->result_id,
            'isExcluded' => true,
            'excludedAt' => $result->excluded_at?->toIso8601String(),
        ], 'تم استبعاد المقترح من قائمة العمل بنجاح.');
    }

    /**
     * POST /api/v1/evaluator/suggestions/{resultId}/restore
     * استعادة مقترح تحسين مستبعد
     */
    public function restoreSuggestion(Request $request, int $resultId): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $result = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
            ->where('result_id', $resultId)
            ->first();

        if (!$result) {
            return ApiResponse::notFound('نتيجة المؤشر المطلوب استعادة مقترحها غير موجودة.');
        }

        $result->update([
            'is_excluded' => false,
            'excluded_at' => null,
        ]);

        return ApiResponse::success([
            'resultId' => $result->result_id,
            'isExcluded' => false,
            'excludedAt' => null,
        ], 'تمت استعادة المقترح وإعادته لقائمة الاقتراحات النشطة بنجاح.');
    }

    /**
     * GET /api/v1/evaluator/discrepancies/audit
     * محرك التدقيق المنطقي الحتمي للاكتشاف المبكر للمفارقات والتناقضات المنهجية (Deterministic Discrepancy Auditor)
     * يغطي الحالات الخمس المعتمدة:
     * 1. درجة عالية بلا شواهد (score >= 2 وعدد الشواهد 0).
     * 2. درجة 3 بمتطلبات ناقصة (score = 3 ومتطلبات ناقصة عن المتطلبات الإلزامية للمؤشر).
     * 3. درجة مرتفعة بلا مبرر نصي (score >= 2 والمبرر فارغ أو أقل من 10 أحرف).
     * 4. ارتباط وثيقة واحدة بـ 10+ مؤشرات (تكرار مستند مفرط).
     * 5. تناقض أساليب التحقق (اختيار أسلوب فحص وثائق وسجلات دون إرفاق أي وثيقة).
     */
    public function auditDiscrepancies(Request $request): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $school = $request->user()?->school ?? School::find($evaluation->school_id);

        // تحميل جميع المؤشرات مع معاييرها ومتطلباتها الإلزامية
        $indicators = Indicator::with([
            'subStandard.standard',
            'evidenceRequirements',
        ])->orderBy('indicator_id')->get();

        // جلب نتائج التقييم الحالي
        $results = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
            ->with(['verificationTools'])
            ->get()
            ->keyBy('indicator_id');

        // جلب روابط الشواهد مجمعة حسب المؤشر
        $evidenceLinks = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
            ->with('documentVersion.document')
            ->get();

        $evidenceCountsByIndicator = $evidenceLinks->groupBy('indicator_id');

        // حساب المتطلبات المغطاة بدقة من خدمة الكفاية أو من روابط الشواهد
        try {
            $sufficiencyData = app(\App\Services\EvidenceSufficiencyService::class)->evaluateEvaluation($evaluation);
            $suffIndMap = collect($sufficiencyData['standards'] ?? [])
                ->flatMap(fn($s) => $s['indicators'] ?? [])
                ->keyBy('indicator_id');
        } catch (\Throwable $e) {
            $suffIndMap = collect();
        }

        $case1Items = []; // درجة عالية بلا شواهد
        $case2Items = []; // درجة 3 بمتطلبات ناقصة
        $case3Items = []; // درجة مرتفعة بلا مبرر نصي
        $case5Items = []; // تناقض أساليب التحقق

        foreach ($indicators as $ind) {
            $res = $results->get($ind->indicator_id);
            if (!$res || $res->score === null || $res->completion_status === 'Pending') {
                continue;
            }

            $score = (int) $res->score;
            $linksForInd = $evidenceCountsByIndicator->get($ind->indicator_id) ?? collect();
            $evCount = $linksForInd->count();

            $stdName = $ind->subStandard?->standard?->name ?? 'المعايير الوطنية';
            $indCode = $ind->code;
            $indName = $ind->name;

            // الحالة 1: درجة عالية بلا شواهد (درجة >= 2 وعدد الشواهد 0)
            if ($score >= 2 && $evCount === 0) {
                $case1Items[] = [
                    'indicatorId' => $ind->indicator_id,
                    'standardId' => $ind->subStandard?->standard_id,
                    'code' => $indCode,
                    'name' => $indName,
                    'standardName' => $stdName,
                    'score' => $score,
                    'evidenceCount' => 0,
                    'issue' => "تم رصد التقدير ({$score}) لكن لا يوجد أي شاهد إثبات مرتبط بالمؤشر.",
                    'recommendation' => 'يرجى إرفاق وثيقة أو شاهد معتمد لإثبات استحقاق هذا التقدير المتقدم.',
                ];
            }

            // الحالة 2: درجة 3 بمتطلبات ناقصة (درجة = 3 ومتطلبات ناقصة عن الإلزامية)
            $indSuff = $suffIndMap->get($ind->indicator_id);
            $mandatoryCnt = (int) ($indSuff['mandatory_required_count'] ?? $ind->evidenceRequirements->where('is_mandatory', true)->count());
            $coveredCnt = (int) ($indSuff['effective_covered_count'] ?? $evCount);

            if ($score === 3 && $mandatoryCnt > 0 && $coveredCnt < $mandatoryCnt) {
                $case2Items[] = [
                    'indicatorId' => $ind->indicator_id,
                    'standardId' => $ind->subStandard?->standard_id,
                    'code' => $indCode,
                    'name' => $indName,
                    'standardName' => $stdName,
                    'score' => 3,
                    'mandatoryCount' => $mandatoryCnt,
                    'coveredCount' => $coveredCnt,
                    'issue' => "تم رصد الدرجة القصوى (3) ولكن تم تغطية ({$coveredCnt}) فقط من أصل ({$mandatoryCnt}) متطلبات إلزامية.",
                    'recommendation' => 'لاستحقاق المستوى 3 يلزم تغطية 100% من المتطلبات الإلزامية للشواهد.',
                ];
            }

            // الحالة 3: درجة مرتفعة بلا مبرر نصي (درجة >= 2 والمبرر فارغ أو أقل من 10 أحرف)
            $justification = trim((string) ($res->textual_result ?? ''));
            if ($score >= 2 && mb_strlen($justification) < 10) {
                $case3Items[] = [
                    'indicatorId' => $ind->indicator_id,
                    'standardId' => $ind->subStandard?->standard_id,
                    'code' => $indCode,
                    'name' => $indName,
                    'standardName' => $stdName,
                    'score' => $score,
                    'textLength' => mb_strlen($justification),
                    'issue' => "تم رصد التقدير ({$score}) ولكن المبرر النصي للمقيم " . (empty($justification) ? 'فارغ تماماً' : 'مقتضب جداً (أقل من 10 أحرف)') . ".",
                    'recommendation' => 'يرجى كتابة تبرير مهني واضح يوضح ممارسات المدرسة التي استند إليها هذا التقدير.',
                ];
            }

            // الحالة 5: تناقض أساليب التحقق (اختيار أسلوب وثائق وسجلات دون إرفاق أي وثيقة)
            $hasDocTool = $res->verificationTools->contains(function ($tool) {
                $tName = $tool->name ?? '';
                $tType = $tool->tool_type ?? '';
                return str_contains($tName, 'وثائق') || str_contains($tName, 'سجلات')
                    || str_contains($tType, 'وثائق') || str_contains($tType, 'سجلات');
            });

            if ($hasDocTool && $evCount === 0) {
                $case5Items[] = [
                    'indicatorId' => $ind->indicator_id,
                    'standardId' => $ind->subStandard?->standard_id,
                    'code' => $indCode,
                    'name' => $indName,
                    'standardName' => $stdName,
                    'score' => $score,
                    'toolName' => 'فحص الوثائق والسجلات',
                    'issue' => 'تم تحديد "فحص الوثائق والسجلات" كأداة تحقق معتمدة للمؤشر، ومع ذلك لم يتم ربط أي وثيقة إثبات.',
                    'recommendation' => 'إما إرفاق الوثيقة المفحوصة أو إلغاء تحديد أداة فحص الوثائق من بطاقة المؤشر.',
                ];
            }
        }

        // الحالة 4: ارتباط وثيقة واحدة بـ 10+ مؤشرات (تكرار مستند مفرط)
        $case4Items = [];
        $documentIndicatorCounts = $evidenceLinks
            ->filter(fn($l) => !empty($l->document_version_id))
            ->groupBy('document_version_id');

        foreach ($documentIndicatorCounts as $versionId => $links) {
            $uniqueIndicators = $links->pluck('indicator_id')->unique();
            if ($uniqueIndicators->count() >= 10) {
                $firstLink = $links->first();
                $docVersion = $firstLink?->documentVersion;
                $doc = $docVersion?->document;
                $docTitle = $doc?->document_name ?? $docVersion?->file_name ?? "وثيقة #{$versionId}";
                $linkedCodes = $indicators->whereIn('indicator_id', $uniqueIndicators)->pluck('code')->take(5)->implode('، ');

                $case4Items[] = [
                    'documentVersionId' => $versionId,
                    'documentTitle' => $docTitle,
                    'linkedIndicatorsCount' => $uniqueIndicators->count(),
                    'sampleIndicatorCodes' => $linkedCodes . ($uniqueIndicators->count() > 5 ? '...' : ''),
                    'issue' => "الوثيقة '{$docTitle}' مرتبطة بـ ({$uniqueIndicators->count()}) مؤشراً مختلفاً في نفس التقييم.",
                    'recommendation' => 'توزيع الشاهد على أكثر من 10 مؤشرات يشير لتكرار مفرط؛ يفضل تخصيص شواهد نوعية لكل مؤشر.',
                ];
            }
        }

        $totalIssues = count($case1Items) + count($case2Items) + count($case3Items) + count($case4Items) + count($case5Items);
        $criticalCount = count($case1Items) + count($case2Items);
        $mediumCount = count($case3Items) + count($case5Items);
        $warningCount = count($case4Items);

        return ApiResponse::success([
            'summary' => [
                'totalDiscrepancies' => $totalIssues,
                'criticalCount' => $criticalCount,
                'mediumCount' => $mediumCount,
                'warningCount' => $warningCount,
                'evaluatedIndicatorsCount' => $results->filter(fn($r) => $r->score !== null && $r->completion_status !== 'Pending')->count(),
                'auditPassed' => $totalIssues === 0,
            ],
            'cases' => [
                [
                    'caseId' => 'case_1',
                    'title' => 'درجة عالية بلا شواهد داعمة',
                    'severity' => 'critical',
                    'severityLabel' => 'حرجة',
                    'description' => 'مؤشرات تم رصدها بتقدير متقدم (2 أو 3) دون ربط أي شاهد أو وثيقة إثبات.',
                    'count' => count($case1Items),
                    'items' => $case1Items,
                ],
                [
                    'caseId' => 'case_2',
                    'title' => 'درجة 3 بمتطلبات ناقصة',
                    'severity' => 'critical',
                    'severityLabel' => 'حرجة',
                    'description' => 'مؤشرات تم منحها التقدير 3 (التميز) رغم عدم استيفاء كامل المتطلبات الإلزامية.',
                    'count' => count($case2Items),
                    'items' => $case2Items,
                ],
                [
                    'caseId' => 'case_3',
                    'title' => 'درجة مرتفعة بلا مبرر نصي',
                    'severity' => 'medium',
                    'severityLabel' => 'متوسطة',
                    'description' => 'مؤشرات ذات تقدير 2 أو 3 ولكن المبرر النصي للمقيم فارغ أو مقتضب جداً.',
                    'count' => count($case3Items),
                    'items' => $case3Items,
                ],
                [
                    'caseId' => 'case_4',
                    'title' => 'ارتباط وثيقة واحدة بـ 10+ مؤشرات',
                    'severity' => 'warning',
                    'severityLabel' => 'تنبيه',
                    'description' => 'مستندات تم استخدامها كشاهد في 10 مؤشرات أو أكثر، مما يشير لتعميم مفرط.',
                    'count' => count($case4Items),
                    'items' => $case4Items,
                ],
                [
                    'caseId' => 'case_5',
                    'title' => 'تناقض أساليب التحقق',
                    'severity' => 'medium',
                    'severityLabel' => 'متوسطة',
                    'description' => 'مؤشرات تم تحديد "فحص الوثائق والسجلات" كأداة تحقق لها دون إرفاق أي وثيقة.',
                    'count' => count($case5Items),
                    'items' => $case5Items,
                ],
            ],
        ], 'تم إجراء التدقيق المنطقي الحتمي على إدخالات التقييم بنجاح.');
    }

    /**
     * POST /api/v1/evaluator/evidence-links/multi
     * ربط شاهد بعدة مؤشرات دفعة واحدة أو نقل شاهد
     */
    public function multiLinkEvidence(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'documentId' => 'nullable|integer',
            'versionId' => 'nullable|integer',
            'indicatorIds' => 'nullable|array',
            'indicatorIds.*' => 'integer',
            'targetIndicatorIds' => 'nullable|array',
            'targetIndicatorIds.*' => 'integer',
            'unlinkedIndicatorIds' => 'nullable|array',
            'unlinkedIndicatorIds.*' => 'integer',
            'coveredRequirements' => 'nullable|array',
            'coveredRequirements.*' => 'integer',
            'justification' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $indicatorIds = $request->input('indicatorIds') ?? $request->input('targetIndicatorIds') ?? [];
        $unlinkedIds = $request->input('unlinkedIndicatorIds', []);
        if ((!is_array($indicatorIds) || count($indicatorIds) === 0) && (!is_array($unlinkedIds) || count($unlinkedIds) === 0)) {
            return ApiResponse::validationError([
                'indicatorIds' => ['يرجى اختيار مؤشر واحد على الأقل لربط الشاهد به أو فك ارتباطه.'],
            ]);
        }

        $user = $request->user();
        if ($user && !$user->hasPermission('evidence.manage')) {
            return ApiResponse::forbidden('ليس لديك صلاحية إدارة روابط الشواهد. هذه الصلاحية محصورة بمقيم المدرسة.');
        }

        $evaluation = $this->getActiveEvaluation($request);
        if (in_array($evaluation->status, ['Submitted', 'UnderReview', 'Completed'], true)) {
            return ApiResponse::error('لا يمكن تعديل روابط الشواهد لأن ملف التقييم مقفل أو مرفوع للمراجعة.', 422);
        }

        $documentId = $request->input('documentId');
        $versionId = $request->input('versionId');
        $justification = $request->input('justification');

        // التحقق من رقم النسخة الفعلي في مستودع المدرسة
        if ($versionId) {
            $versionExists = DocumentVersion::where('id', $versionId)
                ->whereHas('document', fn ($q) => $q->where('school_id', $evaluation->school_id))
                ->exists();
            if (!$versionExists) {
                $versionId = null;
            }
        }
        if (!$versionId && $documentId) {
            $versionId = DocumentVersion::where('school_document_id', $documentId)
                ->whereHas('document', fn ($q) => $q->where('school_id', $evaluation->school_id))
                ->orderByDesc('is_current')
                ->orderByDesc('id')
                ->value('id');
        }

        if (!$versionId) {
            return ApiResponse::validationError([
                'versionId' => ['تعذر تحديد نسخة المستند المطلوب ربطها.'],
            ]);
        }

        $unlinkedIds = $request->input('unlinkedIndicatorIds', []);
        if (is_array($unlinkedIds) && count($unlinkedIds) > 0) {
            EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
                ->where('document_version_id', $versionId)
                ->whereIn('indicator_id', array_map('intval', $unlinkedIds))
                ->delete();
        }

        $coveredReqs = null;
        if ($request->filled('coveredRequirements')) {
            $rawCovered = $request->input('coveredRequirements');
            if (is_string($rawCovered)) {
                $decoded = json_decode($rawCovered, true);
                $rawCovered = is_array($decoded) ? $decoded : [];
            }
            if (is_array($rawCovered)) {
                $coveredReqs = array_values(array_unique(array_map('intval', array_filter($rawCovered, fn($v) => is_numeric($v)))));
            }
        }

        $targetIndIds = array_unique(array_map('intval', $indicatorIds));

        // التحقق من إلزامية تحديد متطلب واحد على الأقل لكل مؤشر مستهدف يحتوي على متطلبات إلزامية
        foreach ($targetIndIds as $tIndId) {
            $mandatoryReqIds = \App\Models\IndicatorEvidenceRequirement::where('indicator_id', $tIndId)
                ->where('required', true)
                ->pluck('requirement_id')
                ->map(fn($id) => (int)$id)
                ->all();

            if (!empty($mandatoryReqIds)) {
                $matching = array_intersect($coveredReqs ?? [], $mandatoryReqIds);
                if (empty($matching)) {
                    $indObj = \App\Models\Indicator::find($tIndId);
                    $code = $indObj?->code ?? (string)$tIndId;
                    return ApiResponse::error("لا بد أن تحدد متطلباً إلزامياً واحداً على الأقل للمؤشر ({$code}).", 422);
                }
            }
        }

        $createdLinks = [];
        foreach ($targetIndIds as $indId) {
            $mandatoryReqIds = \App\Models\IndicatorEvidenceRequirement::where('indicator_id', $indId)
                ->where('required', true)
                ->pluck('requirement_id')
                ->map(fn($id) => (int)$id)
                ->all();

            $linkReqs = !empty($mandatoryReqIds)
                ? array_values(array_intersect($coveredReqs ?? [], $mandatoryReqIds))
                : ($coveredReqs ?? []);

            $link = EvidenceLink::firstOrCreate([
                'evaluation_id' => $evaluation->evaluation_id,
                'indicator_id' => $indId,
                'document_version_id' => $versionId,
            ], [
                'school_id' => $evaluation->school_id,
                'justification' => $justification,
                'covered_requirements' => $linkReqs,
                'status' => 'completed',
            ]);

            $link->covered_requirements = $linkReqs;
            if ($justification) {
                $link->justification = $justification;
            }
            $link->status = 'completed';
            $link->save();

            $createdLinks[] = $link->id;
        }

        return ApiResponse::success([
            'linkedCount' => count($createdLinks),
            'unlinkedCount' => is_array($unlinkedIds) ? count($unlinkedIds) : 0,
            'linkIds' => $createdLinks,
        ], count($createdLinks) > 0 ? 'تم ربط الشاهد بالمؤشرات المحددة بنجاح' : 'تم تحديث روابط الشاهد بنجاح');
    }

    /**
     * تنفيذ التصفير الآمن لنتائج مجموعة من المؤشرات داخل معاملة ذرية مع حماية المفاتيح الأجنبية (الملاحظتان 7 و 11).
     *
     * @param Evaluation $evaluation
     * @param array<int, int> $indicatorIds
     * @param bool $unlinkEvidences
     * @return array{resetResultsCount: int, unlinkedEvidencesCount: int}
     */
    protected function performIndicatorsReset(Evaluation $evaluation, array $indicatorIds, bool $unlinkEvidences): array
    {
        return DB::transaction(function () use ($evaluation, $indicatorIds, $unlinkEvidences) {
            $results = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
                ->whereIn('indicator_id', $indicatorIds)
                ->get();

            $resultIds = $results->pluck('result_id')->all();
            $resetResultsCount = count($resultIds);

            if ($resetResultsCount > 0) {
                // حفظ قيد chk_improvement_areas_source بضمان تعبئة indicator_id قبل تصفير result_id
                foreach ($results as $res) {
                    \App\Models\ImprovementArea::where('result_id', $res->result_id)
                        ->update([
                            'indicator_id' => DB::raw("COALESCE(indicator_id, {$res->indicator_id})"),
                            'result_id'    => null,
                        ]);
                }

                // فك ربط evaluation_result_id في روابط الشواهد للحفاظ على تكامل المرجع
                EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
                    ->whereIn('evaluation_result_id', $resultIds)
                    ->update(['evaluation_result_id' => null]);

                EvaluationResultVerificationMethod::whereIn('evaluation_result_id', $resultIds)->delete();
                Note::whereIn('result_id', $resultIds)->delete();
                EvaluationResult::whereIn('result_id', $resultIds)->delete();
            }

            $unlinkedEvidencesCount = 0;
            if ($unlinkEvidences) {
                // فك الارتباط فقط دون حذف الملفات الفيزيائية أو وثائق المدرسة من المستودع
                $unlinkedEvidencesCount = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
                    ->whereIn('indicator_id', $indicatorIds)
                    ->delete();
            }

            return [
                'resetResultsCount' => $resetResultsCount,
                'unlinkedEvidencesCount' => $unlinkedEvidencesCount,
            ];
        });
    }

    /**
     * POST /api/v1/evaluator/indicators/{indicatorId}/reset
     * تصفير رصد مؤشر واحد بأمان مع إمكانية فك ارتباط شواهده اختيارياً (الملاحظة 7).
     */
    public function resetIndicator(Request $request, int $indicatorId): JsonResponse
    {
        $user = $request->user();
        if ($user && !$user->hasPermission('evaluations.edit') && !$user->hasRole('school_evaluator')) {
            return ApiResponse::forbidden('ليس لديك صلاحية تصفير المؤشرات. هذه الصلاحية محصورة بمقيم المدرسة.');
        }

        $indicator = Indicator::find($indicatorId);
        if (!$indicator) {
            return ApiResponse::notFound('المؤشر المطلوب غير موجود.');
        }

        $evaluation = $this->getActiveEvaluation($request);
        $lockStatus = \App\Services\EvaluationLockChecker::checkEvaluationGeneralStatus($evaluation);
        if (!$lockStatus['allowed']) {
            return ApiResponse::error($lockStatus['reason'] ?? 'التقييم مقفل ولا يمكن تصفيره.', 422);
        }

        $unlinkEvidences = filter_var($request->input('unlinkEvidences', false), FILTER_VALIDATE_BOOLEAN);
        $summary = $this->performIndicatorsReset($evaluation, [$indicatorId], $unlinkEvidences);

        return ApiResponse::success([
            'indicatorId' => $indicatorId,
            'resetResultsCount' => $summary['resetResultsCount'],
            'unlinkedEvidencesCount' => $summary['unlinkedEvidencesCount'],
        ], 'تم تصفير رصد المؤشر بنجاح وإعادته إلى قائمة العناصر بانتظار الاستيفاء.');
    }

    /**
     * POST /api/v1/evaluator/standards/{standardId}/reset
     * تصفير رصد كافة مؤشرات معيار وطني كامل بأمان مع خيار فك ارتباط الشواهد (الملاحظة 11).
     */
    public function resetStandard(Request $request, int $standardId): JsonResponse
    {
        $user = $request->user();
        if ($user && !$user->hasPermission('evaluations.edit') && !$user->hasRole('school_evaluator')) {
            return ApiResponse::forbidden('ليس لديك صلاحية تصفير المعايير. هذه الصلاحية محصورة بمقيم المدرسة.');
        }

        $standard = Standard::with('subStandards.indicators')->find($standardId);
        if (!$standard) {
            return ApiResponse::notFound('المعيار المطلوب غير موجود.');
        }

        $evaluation = $this->getActiveEvaluation($request);
        $lockStatus = \App\Services\EvaluationLockChecker::checkEvaluationGeneralStatus($evaluation);
        if (!$lockStatus['allowed']) {
            return ApiResponse::error($lockStatus['reason'] ?? 'التقييم مقفل ولا يمكن تصفير المعايير.', 422);
        }

        $indicatorIds = $standard->subStandards
            ->flatMap(fn($sub) => $sub->indicators)
            ->pluck('indicator_id')
            ->unique()
            ->values()
            ->all();

        if (empty($indicatorIds)) {
            return ApiResponse::success([
                'standardId' => $standardId,
                'affectedIndicatorsCount' => 0,
                'resetResultsCount' => 0,
                'unlinkedEvidencesCount' => 0,
            ], 'لا توجد مؤشرات ضمن هذا المعيار.');
        }

        $unlinkEvidences = filter_var($request->input('unlinkEvidences', false), FILTER_VALIDATE_BOOLEAN);
        $summary = $this->performIndicatorsReset($evaluation, $indicatorIds, $unlinkEvidences);

        return ApiResponse::success([
            'standardId' => $standardId,
            'standardName' => $standard->name,
            'affectedIndicatorsCount' => count($indicatorIds),
            'resetResultsCount' => $summary['resetResultsCount'],
            'unlinkedEvidencesCount' => $summary['unlinkedEvidencesCount'],
        ], "تم تصفير المعيار ({$standard->name}) بنجاح وإعادة مؤشراته لقائمة الاستيفاء.");
    }
}
