<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesEvaluatorContext;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\CompletionRequest;
use App\Models\CompletionRequestItem;
use App\Models\Evaluation;
use App\Models\EvaluationResult;
use App\Models\EvaluationResultVerificationMethod;
use App\Models\EvaluationSubmission;
use App\Models\EvidenceLink;
use App\Models\ImprovementArea;
use App\Models\Indicator;
use App\Models\IndicatorScoreDescriptor;
use App\Models\Note;
use App\Models\School;
use App\Models\SchoolDocument;
use App\Models\ScoreLevel;
use App\Models\Standard;
use App\Models\StandardVersion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
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
    use ResolvesEvaluatorContext;

    /**
     * GET /api/v1/evaluator/dashboard-stats
     * Fetch aggregated KPIs and progress tracker
     */
    public function dashboardStats(Request $request): JsonResponse
    {
        $user = $request->user();
        $evaluation = $this->getActiveEvaluation($request);
        $school = $user?->school ?? School::find($evaluation->school_id);
        $version = $this->getEvaluationStandardVersion($evaluation);

        // Scope total indicators strictly to the current evaluation's standard version
        $totalIndicators = Indicator::whereHas('subStandard.standard', fn($q) => $q->where('version_id', $version->version_id))->count();
        if ($totalIndicators === 0) {
            $totalIndicators = 109;
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

        $standards = Standard::where('version_id', $version->version_id)
            ->with('subStandards.indicators')
            ->orderBy('code')
            ->get();
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

        $allIndicatorsList = Indicator::whereHas('subStandard.standard', fn($q) => $q->where('version_id', $version->version_id))
            ->with('subStandard.standard')
            ->orderBy('indicator_id')
            ->get();
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
                'academicYear' => $evaluation->cycle?->academic_year ?? '2025/2026',
                'cycleName' => $evaluation->cycle?->name ?: ('الدورة التقييمية ' . ($evaluation->cycle?->academic_year ?? '2025/2026')),
                'standardVersion' => [
                    'versionId' => $version->version_id,
                    'versionNumber' => $version->version_no ?? ('v' . $version->version_id),
                    'title' => $version->source_description ?? ('الإصدار الوطني ' . $version->version_no),
                    'status' => $version->status,
                    'issueDate' => $version->issue_date?->toDateString(),
                ],
                'evaluationCycle' => [
                    'cycleId' => $evaluation->cycle?->cycle_id ?? 1,
                    'name' => $evaluation->cycle?->name ?: ('الدورة التقييمية ' . ($evaluation->cycle?->academic_year ?? '2025/2026')),
                    'academicYear' => $evaluation->cycle?->academic_year ?? '2025/2026',
                    'status' => $evaluation->cycle?->status ?? 'Active',
                    'startDate' => $evaluation->cycle?->start_date?->toDateString(),
                    'endDate' => $evaluation->cycle?->end_date?->toDateString(),
                ],
                'trackingCode' => $submission?->tracking_code,
                'digitalHash' => $submission?->digital_hash,
                'submittedAt' => $submission?->submitted_at?->toIso8601String(),
                'attemptNo' => $submission?->attempt_no ?? 0,
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
            'supervisorNotes' => \App\Models\SupervisorNote::where('school_id', $school->school_id)
                ->where('is_visible_to_school', true)
                ->latest('created_at')
                ->take(5)
                ->get()
                ->map(fn($n) => [
                    'noteId' => $n->note_id,
                    'memoType' => $n->memo_type ?? 'توجيه إشرافي',
                    'subject' => $n->subject,
                    'details' => $n->details,
                    'createdAt' => $n->created_at?->toIso8601String(),
                ])->values(),
        ]);
    }

    /**
     * GET /api/v1/standard-versions/active/tree
     * Load active 7 standards and indicator nodes
     */
    public function activeStandardsTree(Request $request): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $version = $this->getEvaluationStandardVersion($evaluation);

        if (!$version) {
            return ApiResponse::success([
                'versionId' => 1,
                'versionCode' => 'NSS-2026-V1',
                'title' => 'المعايير الوطنية لتقويم الأداء المدرسي 2026',
                'standards' => [],
            ]);
        }
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
                'subStandards' => $std->subStandards->map(function ($sub) use ($results, $computeIndicatorCoverage, $std) {
                    return [
                        'subStandardId' => $sub->sub_standard_id,
                        'code' => $sub->code,
                        'title' => $sub->name,
                        'description' => $sub->description ?? '',
                        'weight' => (float)($sub->weight ?? 0.0),
                        'indicators' => $sub->indicators->map(function ($ind) use ($results, $computeIndicatorCoverage, $std, $sub) {
                            $res = $results->firstWhere('indicator_id', $ind->indicator_id);
                            [$evCount, $mandatoryCnt, $coveredCnt, $explicitIds] = $computeIndicatorCoverage($ind);

                            return [
                                'indicatorId' => $ind->indicator_id,
                                'code' => $ind->code,
                                'title' => $ind->name,
                                'description' => $ind->description ?? '',
                                'weight' => (float)($ind->weight ?? 1),
                                'standardName' => $std->name,
                                'standardDescription' => $std->description ?? '',
                                'subStandardName' => $sub->name,
                                'subStandardDescription' => $sub->description ?? '',
                                'subStandardWeight' => (float)($sub->weight ?? 0.0),
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
            'versionCode' => $version->version_no ?? '2026.1',
            'versionNumber' => $version->version_no ?? '1.0',
            'title' => $version->source_description ?? 'المعايير الوطنية لتقويم الأداء المدرسي 2026',
            'versionStatus' => $version->status,
            'approvalCode' => $version->source_number ?? 'DEC-2026-QA-01',
            'approvedAt' => $version->updated_at?->toIso8601ZuluString() ?? now()->toIso8601ZuluString(),
            'effectiveFrom' => $version->issue_date?->toDateString() ?? '2026-01-01',
            'integrityHash' => hash('sha256', "VERSION_{$version->version_id}_{$version->version_no}_{$version->status}"),
            'cycleId' => $evaluation?->cycle?->cycle_id,
            'academicYear' => $evaluation?->cycle?->academic_year ?? '2025/2026',
            'cycleName' => $evaluation?->cycle?->name ?: ('الدورة التقييمية ' . ($evaluation?->cycle?->academic_year ?? '2025/2026')),
            'standards' => $tree,
        ]);
    }

    /**
     * بناء أجزاء الحمولة المشتركة لنتيجة المؤشر (الشواهد والمتطلبات وملاحظات المراجعة).
     *
     * @return array{
     *     evidenceLinks: \Illuminate\Support\Collection,
     *     evidenceRequirements: \Illuminate\Support\Collection,
     *     justificationNote: ?Note,
     *     reviewerNotes: \Illuminate\Support\Collection
     * }
     */
    protected function buildIndicatorResultPayloadParts(int $evaluationId, int $indicatorId, ?EvaluationResult $result): array
    {
        $evidenceLinks = EvidenceLink::where('evaluation_id', $evaluationId)
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

        $explicitRequirementIds = [];
        foreach ($evidenceLinks as $evLink) {
            $cov = $evLink['coveredRequirements'] ?? [];
            if (is_array($cov)) {
                foreach ($cov as $covId) {
                    $explicitRequirementIds[(int) $covId] = true;
                }
            }
        }

        $indicator = Indicator::with('evidenceRequirements')->find($indicatorId);
        $reqs = $indicator?->evidenceRequirements->map(fn($er) => [
            'id' => $er->requirement_id,
            'title' => $er->title,
            'description' => $er->description ?? '',
            'required' => (bool) $er->required,
            'isCovered' => isset($explicitRequirementIds[(int) $er->requirement_id]),
        ]) ?? collect();

        if (!$result) {
            return [
                'evidenceLinks' => $evidenceLinks,
                'evidenceRequirements' => $reqs,
                'justificationNote' => null,
                'reviewerNotes' => collect(),
            ];
        }

        $justificationNote = $result->notes()->orderBy('note_id', 'desc')->first();
        $reviewerNotes = $result->notes()
            ->with('author')
            ->orderBy('note_id', 'asc')
            ->get()
            ->unique(fn($n) => trim((string) $n->text))
            ->values()
            ->map(fn($n) => [
                'noteId' => $n->note_id,
                'authorName' => $n->author?->full_name ?? $n->author?->name ?? 'المراجع',
                'authorRole' => $n->author?->role ?? 'مدير / مشرف',
                'text' => $n->text,
                'createdAt' => $n->created_at?->toIso8601String(),
            ]);

        return [
            'evidenceLinks' => $evidenceLinks,
            'evidenceRequirements' => $reqs,
            'justificationNote' => $justificationNote,
            'reviewerNotes' => $reviewerNotes,
        ];
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

        $parts = $this->buildIndicatorResultPayloadParts($evaluation->evaluation_id, $indicatorId, $result);

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
                'evidenceLinks' => $parts['evidenceLinks'],
                'evidenceRequirements' => $parts['evidenceRequirements'],
            ]);
        }

        $justificationNote = $parts['justificationNote'];

        return ApiResponse::success([
            'resultId' => $result->result_id,
            'evaluationId' => $result->evaluation_id,
            'indicatorId' => $result->indicator_id,
            'score' => $result->score,
            'scoreDescriptorId' => $result->score_descriptor_id,
            'completionStatus' => $result->completion_status ?? 'Completed',
            'justification' => $justificationNote ? ($justificationNote->text ?? $justificationNote->content) : ($result->textual_result ?? ''),
            'verificationMethods' => $result->verificationMethods->pluck('tool_id')->toArray(),
            'evidenceLinks' => $parts['evidenceLinks'],
            'evidenceRequirements' => $parts['evidenceRequirements'],
            'reviewerNotes' => $parts['reviewerNotes'],
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

        // حفظ الملاحظة التبريرية إن وجدت دون تكرار
        if ($request->filled('justification')) {
            $justText = trim((string) $request->input('justification'));
            if ($justText !== '') {
                $existingNote = Note::where('result_id', $result->result_id)
                    ->where('text', $justText)
                    ->first();
                if (!$existingNote) {
                    Note::create([
                        'result_id' => $result->result_id,
                        'author_user_id' => $user?->user_id ?? 1,
                        'text' => $justText,
                    ]);
                }
            }
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

        $parts = $this->buildIndicatorResultPayloadParts($evaluation->evaluation_id, (int) $indicatorId, $result);
        $justificationNote = $parts['justificationNote'];

        return ApiResponse::success([
            'resultId' => $result->result_id,
            'evaluationId' => $result->evaluation_id,
            'indicatorId' => $result->indicator_id,
            'score' => $result->score,
            'scoreDescriptorId' => $result->score_descriptor_id,
            'completionStatus' => $result->completion_status,
            'justification' => $justificationNote ? ($justificationNote->text ?? $justificationNote->content) : ($request->input('justification') ?? $result->textual_result ?? ''),
            'verificationMethods' => $result->verificationMethods()->pluck('tool_id')->toArray(),
            'evidenceLinks' => $parts['evidenceLinks'],
            'evidenceRequirements' => $parts['evidenceRequirements'],
            'reviewerNotes' => $parts['reviewerNotes'],
            'updatedAt' => $result->updated_at?->toIso8601String(),
        ], 'تم حفظ التقييم والمبررات بنجاح');
    }


    /**
     * GET /api/v1/evaluator/discrepancies/audit
     * محرك التدقيق المنطقي الحتمي للاكتشاف المبكر للمفارقات والتناقضات المنهجية (Deterministic Discrepancy Auditor).
     */
    public function auditDiscrepancies(Request $request): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $auditData = app(\App\Services\EvaluationAuditService::class)->auditDiscrepancies($evaluation);

        return ApiResponse::success($auditData, 'تم إجراء التدقيق المنطقي الحتمي على إدخالات التقييم بنجاح.');
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

    /**
     * GET /api/v1/evaluator/audit-hub
     * Comprehensive Executive Audit and Review Hub for school principal and evaluator
     */
    public function getAuditHub(Request $request): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $hubData = app(\App\Services\EvaluationAuditService::class)->getAuditHubData($evaluation);

        return ApiResponse::success($hubData);
    }

    /**
     * POST /api/v1/evaluator/audit-hub/indicators/{indicatorId}/review-note
     * Quick review submission from the Audit Hub
     */
    public function storeIndicatorReviewNote(Request $request, int $indicatorId): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('reviews.write') && !$user->hasPermission('evaluations.edit')) {
            return ApiResponse::forbidden('غير مصرح لك بتدوين ملاحظات المراجعة الإدارية.');
        }

        $validator = Validator::make($request->all(), [
            'text' => ['required', 'string', 'min:3', 'max:2000'],
        ], [
            'text.required' => 'نص ملاحظة المراجعة إلزامي.',
            'text.min'      => 'يجب ألا يقل نص الملاحظة عن 3 أحرف.',
            'text.max'      => 'لا يمكن أن يتجاوز نص الملاحظة 2000 حرف.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $evaluation = $this->getActiveEvaluation($request);

        // جلب أو إنشاء نتيجة التقييم لهذا المؤشر لربط الملاحظة بها
        $result = EvaluationResult::firstOrCreate([
            'evaluation_id' => $evaluation->evaluation_id,
            'indicator_id'  => $indicatorId,
        ], [
            'standard_version_id' => $evaluation->cycle?->version_id ?? 1,
            'evaluator_user_id'   => $user->user_id,
            'score'               => null,
            'completion_status'   => 'Pending',
            'textual_result'      => 'بانتظار استكمال الرصد والمراجعة',
        ]);

        $note = Note::create([
            'result_id'      => $result->result_id,
            'author_user_id' => $user->user_id,
            'text'           => $request->input('text'),
        ]);

        return ApiResponse::success([
            'noteId'     => $note->note_id,
            'indicatorId'=> $indicatorId,
            'resultId'   => $result->result_id,
            'authorName' => $user->full_name ?? $user->username ?? 'مدير المدرسة',
            'authorRole' => $user->hasRole('school_principal') ? 'مدير المدرسة' : 'مقيم جودة',
            'text'       => $note->text,
            'createdAt'  => $note->created_at?->toIso8601String(),
        ], 'تم تسجيل ملاحظة المراجعة الإدارية للمؤشر بنجاح.');
    }
}
