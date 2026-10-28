<?php

namespace App\Services;

use App\Models\Evaluation;
use App\Models\EvaluationResult;
use App\Models\Evidence;
use App\Models\ImprovementPlan;
use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\Report;
use App\Models\School;
use App\Models\ScoreLevel;
use App\Models\Standard;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

/**
 * خدمة التقارير والتحليلات وحساب النتائج (ReportsAnalyticsService) - الشريحة 4.
 *
 * تتولى كافة العمليات الحسابية والتحليلية لنتائج التقييم المدرسي الذاتي والشواهد
 * وخطط التحسين، وتوليد لوحات المعلومات وتصدير التقارير بصيغة JSON.
 *
 * القواعد الحسابية المعتمدة:
 * 1. مقياس المؤشر: من 0 إلى 3 (الحد الأقصى 3).
 *    نسبة المؤشر = (درجة المؤشر / 3) * 100.
 * 2. نتيجة المعيار: المتوسط المرجح لدرجات مؤشراته بناءً على أوزان المؤشرات في قاعدة البيانات.
 *    درجة المعيار المرجحة = مجموع (درجة المؤشر * وزن المؤشر) / مجموع أوزان المؤشرات.
 *    نسبة المعيار = (درجة المعيار المرجحة / 3) * 100.
 * 3. النتيجة النهائية للمدرسة: مجموع المساهمات المرجحة للمعايير السبعة وفق أوزانها المعتمدة في قاعدة البيانات:
 *    - الإدارة المدرسية: 15%
 *    - المعلمون والكوادر الإدارية والخدمية: 20%
 *    - المتعلمون: 15%
 *    - التعليم والتعلم: 20%
 *    - البيئة المدرسية: 15%
 *    - الشراكة المجتمعية: 5%
 *    - ضمان الجودة والتحسين المستمر: 10%
 *    (المجموع الكلي لأوزان المعايير = 100%).
 * 4. عدم السماح بحساب النتائج لتقييم غير مكتمل أو مقفل (Rule #8).
 */
class ReportsAnalyticsService
{
    /**
     * التحقق من اكتمال رصد كافة مؤشرات التقييم المعتمدة.
     *
     * @param Evaluation $evaluation
     * @return array{is_complete: bool, total_indicators: int, evaluated_count: int, missing_count: int, completion_percentage: float, unscored_indicator_ids: array<int>}
     */
    public function checkEvaluationCompleteness(Evaluation $evaluation): array
    {
        // الإصدار المرجعي للمعايير المرتبط بدورة التقييم
        $versionId = $evaluation->cycle?->version_id;

        $indicatorsQuery = Indicator::query()->where('status', 'Active');
        if ($versionId) {
            $indicatorsQuery->whereHas('subStandard.standard', function ($q) use ($versionId) {
                $q->where('version_id', $versionId);
            });
        }

        $allActiveIndicators = $indicatorsQuery->pluck('indicator_id')->toArray();
        $totalCount = count($allActiveIndicators);

        // جلب المؤشرات التي تم رصد درجاتها فعلياً (score != null و completion_status = Completed) في هذا التقييم
        $scoredIndicatorIds = EvaluationResult::query()
            ->where('evaluation_id', $evaluation->evaluation_id)
            ->where('completion_status', 'Completed')
            ->whereNotNull('score')
            ->pluck('indicator_id')
            ->toArray();

        $evaluatedCount = count(array_intersect($allActiveIndicators, $scoredIndicatorIds));
        $missingCount = max(0, $totalCount - $evaluatedCount);
        $completionPercentage = $totalCount > 0 ? round(($evaluatedCount / $totalCount) * 100, 2) : 0.00;
        $unscoredIndicatorIds = array_values(array_diff($allActiveIndicators, $scoredIndicatorIds));

        return [
            'is_complete' => ($missingCount === 0 && $totalCount > 0),
            'total_indicators' => $totalCount,
            'evaluated_count' => $evaluatedCount,
            'missing_count' => $missingCount,
            'completion_percentage' => $completionPercentage,
            'unscored_indicator_ids' => $unscoredIndicatorIds,
        ];
    }

    /**
     * التحقق من اكتمال رصد مؤشرات معيار محدد.
     *
     * @param Evaluation $evaluation
     * @param Standard $standard
     * @return array{is_complete: bool, total_indicators: int, evaluated_count: int, missing_count: int, completion_percentage: float}
     */
    public function checkStandardCompleteness(Evaluation $evaluation, Standard $standard): array
    {
        $standardIndicatorIds = Indicator::query()
            ->where('status', 'Active')
            ->whereHas('subStandard', function ($q) use ($standard) {
                $q->where('standard_id', $standard->standard_id);
            })
            ->pluck('indicator_id')
            ->toArray();

        $totalCount = count($standardIndicatorIds);

        $scoredIndicatorIds = EvaluationResult::query()
            ->where('evaluation_id', $evaluation->evaluation_id)
            ->whereIn('indicator_id', $standardIndicatorIds)
            ->where('completion_status', 'Completed')
            ->whereNotNull('score')
            ->pluck('indicator_id')
            ->toArray();

        $evaluatedCount = count($scoredIndicatorIds);
        $missingCount = max(0, $totalCount - $evaluatedCount);
        $completionPercentage = $totalCount > 0 ? round(($evaluatedCount / $totalCount) * 100, 2) : 0.00;

        return [
            'is_complete' => ($missingCount === 0 && $totalCount > 0),
            'total_indicators' => $totalCount,
            'evaluated_count' => $evaluatedCount,
            'missing_count' => $missingCount,
            'completion_percentage' => $completionPercentage,
        ];
    }

    /**
     * حساب النتيجة المفصلة لمعيار محدد مع مؤشراته.
     *
     * @param Evaluation $evaluation
     * @param Standard $standard
     * @return array<string, mixed>
     */
    public function calculateStandardResults(Evaluation $evaluation, Standard $standard): array
    {
        $subStandards = $standard->subStandards()
            ->with(['indicators' => function ($q) {
                $q->where('status', 'Active')->orderBy('code');
            }])
            ->get();

        $resultsMap = EvaluationResult::query()
            ->where('evaluation_id', $evaluation->evaluation_id)
            ->with(['scoreDescriptor', 'evidences'])
            ->get()
            ->keyBy('indicator_id');

        $scoreLevels = ScoreLevel::query()->get()->keyBy('score_value');

        $subStandardsData = [];
        $totalIndicatorWeight = 0.0;
        $sumWeightedRawScores = 0.0;
        $totalIndicatorsCount = 0;
        $evaluatedIndicatorsCount = 0;

        foreach ($subStandards as $sub) {
            $indicatorsData = [];
            $subTotalWeight = 0.0;
            $subWeightedScores = 0.0;

            foreach ($sub->indicators as $ind) {
                $totalIndicatorsCount++;
                $indWeight = (float) $ind->weight;
                $subTotalWeight += $indWeight;
                $totalIndicatorWeight += $indWeight;

                /** @var EvaluationResult|null $result */
                $result = $resultsMap->get($ind->indicator_id);
                $hasScore = ($result !== null && $result->completion_status === 'Completed' && $result->score !== null);
                $rawScore = $hasScore ? (int) $result->score : null;
                $scorePercentage = $hasScore ? round(($rawScore / 3.0) * 100, 2) : null;

                if ($hasScore) {
                    $evaluatedIndicatorsCount++;
                    $sumWeightedRawScores += ($rawScore * $indWeight);
                    $subWeightedScores += ($rawScore * $indWeight);
                }

                $levelLabel = null;
                if ($hasScore && isset($scoreLevels[$rawScore])) {
                    $levelLabel = $scoreLevels[$rawScore]->label;
                }

                $indicatorsData[] = [
                    'indicator_id' => $ind->indicator_id,
                    'code' => $ind->code,
                    'name' => $ind->name,
                    'description' => $ind->description,
                    'weight' => $indWeight,
                    'score' => $rawScore,
                    'max_score' => 3,
                    'percentage' => $scorePercentage,
                    'level_label' => $levelLabel,
                    'descriptor' => $result?->scoreDescriptor?->description,
                    'evidences_count' => $result ? $result->evidences->count() : 0,
                    'is_evaluated' => $hasScore,
                ];
            }

            $subRawScore = $subTotalWeight > 0 ? round($subWeightedScores / $subTotalWeight, 2) : 0.00;
            $subPercentage = round(($subRawScore / 3.0) * 100, 2);

            $subStandardsData[] = [
                'sub_standard_id' => $sub->sub_standard_id,
                'code' => $sub->code,
                'name' => $sub->name,
                'description' => $sub->description,
                'total_weight' => $subTotalWeight,
                'raw_score' => $subRawScore,
                'percentage' => $subPercentage,
                'performance_level' => $this->getPerformanceLevel($subPercentage),
                'indicators' => $indicatorsData,
            ];
        }

        $standardWeight = (float) $standard->weight;
        $standardRawScore = $totalIndicatorWeight > 0 ? round($sumWeightedRawScores / $totalIndicatorWeight, 2) : 0.00;
        $standardPercentage = round(($standardRawScore / 3.0) * 100, 2);
        $standardWeightedContribution = round($standardPercentage * ($standardWeight / 100.0), 2);
        $isComplete = ($evaluatedIndicatorsCount === $totalIndicatorsCount && $totalIndicatorsCount > 0);

        return [
            'standard_id' => $standard->standard_id,
            'code' => $standard->code,
            'name' => $standard->name,
            'description' => $standard->description,
            'weight' => $standardWeight,
            'raw_score' => $standardRawScore,
            'max_score' => 3.00,
            'percentage' => $standardPercentage,
            'weighted_score' => $standardWeightedContribution,
            'performance_level' => $this->getPerformanceLevel($standardPercentage),
            'is_complete' => $isComplete,
            'total_indicators' => $totalIndicatorsCount,
            'evaluated_indicators' => $evaluatedIndicatorsCount,
            'sub_standards' => $subStandardsData,
        ];
    }

    /**
     * حساب النتائج الشاملة للتقييم المدرسي الذاتي لكافة المعايير والمدرسة ككل.
     *
     * @param Evaluation $evaluation
     * @return array<string, mixed>
     */
    public function calculateAssessmentResults(Evaluation $evaluation): array
    {
        $versionId = $evaluation->cycle?->version_id;

        $standardsQuery = Standard::query()->orderBy('standard_id');
        if ($versionId) {
            $standardsQuery->where('version_id', $versionId);
        }
        $standards = $standardsQuery->get();

        $standardsResults = [];
        $totalFinalScore = 0.0;
        $totalWeightsSum = 0.0;
        $totalIndicators = 0;
        $totalEvaluated = 0;

        foreach ($standards as $standard) {
            $stdResult = $this->calculateStandardResults($evaluation, $standard);
            $standardsResults[] = $stdResult;

            $totalFinalScore += $stdResult['weighted_score'];
            $totalWeightsSum += $stdResult['weight'];
            $totalIndicators += $stdResult['total_indicators'];
            $totalEvaluated += $stdResult['evaluated_indicators'];
        }

        $finalPercentage = round($totalFinalScore, 2);
        $isComplete = ($totalEvaluated === $totalIndicators && $totalIndicators > 0);

        return [
            'evaluation_id' => $evaluation->evaluation_id,
            'school_id' => $evaluation->school_id,
            'school_name' => $evaluation->school?->school_name,
            'cycle_id' => $evaluation->cycle_id,
            'academic_year' => $evaluation->cycle?->academic_year,
            'cycle_name' => $evaluation->cycle?->name ?? $evaluation->cycle?->academic_year,
            'status' => $evaluation->status,
            'is_complete' => $isComplete,
            'is_locked' => EvaluationLockChecker::isEvaluationLocked($evaluation),
            'total_indicators' => $totalIndicators,
            'evaluated_indicators' => $totalEvaluated,
            'missing_indicators' => max(0, $totalIndicators - $totalEvaluated),
            'final_score' => $finalPercentage,
            'max_score' => 100.00,
            'performance_level' => $this->getPerformanceLevel($finalPercentage),
            'standards_total_weight' => $totalWeightsSum,
            'standards' => $standardsResults,
        ];
    }

    /**
     * حساب ملخص ونسبة اكتمال الشواهد لكل مؤشر ومعيار وللتقييم ككل.
     *
     * @param Evaluation $evaluation
     * @return array<string, mixed>
     */
    public function calculateEvidenceSummary(Evaluation $evaluation): array
    {
        /** @var EvidenceSufficiencyService $sufficiencyService */
        $sufficiencyService = app(EvidenceSufficiencyService::class);
        $data = $sufficiencyService->evaluateEvaluation($evaluation);

        $standardsSummary = [];
        foreach ($data['standards'] as $std) {
            $indicatorsEvidenceList = [];
            foreach ($std['indicators'] as $ind) {
                $indicatorsEvidenceList[] = [
                    'indicator_id'      => $ind['indicator_id'],
                    'code'              => $ind['code'],
                    'name'              => $ind['name'],
                    'sub_standard_code' => $ind['sub_standard_code'],
                    'required_count'    => $ind['mandatory_required_count'],
                    'uploaded_count'    => $ind['uploaded_evidence_count'],
                    'valid_count'       => $ind['valid_evidence_count'],
                    'draft_count'       => $ind['draft_evidence_count'],
                    'missing_count'     => $ind['missing_count'],
                    'completion_rate'   => $ind['completion_rate'],
                    'is_satisfied'      => $ind['is_sufficient'],
                ];
            }

            $standardsSummary[] = [
                'standard_id'                  => $std['standard_id'],
                'code'                         => $std['standard_code'],
                'name'                         => $std['standard_name'],
                'total_indicators'             => $std['total_indicators'],
                'indicators_with_evidence'     => $std['indicators_with_evidence'],
                'indicators_complete_evidence' => $std['sufficient_indicators'],
                'indicators_missing_evidence'  => $std['missing_indicators'],
                'total_required_evidences'     => $std['mandatory_required_count'],
                'total_uploaded_evidences'     => $std['uploaded_evidence_count'],
                'total_valid_evidences'        => $std['valid_evidence_count'],
                'total_draft_evidences'        => $std['draft_evidence_count'],
                'completion_rate'              => $std['completion_rate'],
                'indicators'                   => $indicatorsEvidenceList,
            ];
        }

        return [
            'evaluation_id'                    => $evaluation->evaluation_id,
            'school_id'                        => $evaluation->school_id,
            'school_name'                      => $data['school_name'],
            'total_indicators'                 => $data['total_indicators'],
            'indicators_with_evidence'         => $data['indicators_with_valid_evidence'],
            'indicators_complete_evidence'     => $data['indicators_with_sufficient_evidence'],
            'indicators_missing_evidence'      => $data['indicators_missing_evidence'],
            'total_required_evidences'         => $data['total_mandatory_required'],
            'total_uploaded_evidences'         => $data['total_uploaded_evidences'],
            'total_valid_evidences'            => $data['total_valid_evidences'],
            'total_draft_evidences'            => $data['total_draft_evidences'],
            'overall_evidence_completion_rate' => $data['overall_evidence_completion_rate'],
            'standards'                        => $standardsSummary,
        ];
    }

    /**
     * حساب ملخص وإحصاءات خطط التحسين المدرسي وإجراءاتها التنفيذية.
     *
     * الحالات المحسوبة: قيد التنفيذ، مكتملة، متأخرة، مسودة.
     *
     * @param School $school
     * @return array<string, mixed>
     */
    public function calculateImprovementPlansSummary(School $school): array
    {
        $today = Carbon::today();

        $plans = ImprovementPlan::query()
            ->where('school_id', $school->school_id)
            ->with(['actions'])
            ->orderBy('created_at', 'desc')
            ->get();

        $totalPlans = $plans->count();
        $inProgressPlansCount = 0;
        $completedPlansCount = 0;
        $draftPlansCount = 0;
        $cancelledPlansCount = 0;
        $delayedPlansCount = 0;

        $totalActionsCount = 0;
        $pendingActionsCount = 0;
        $inProgressActionsCount = 0;
        $completedActionsCount = 0;
        $cancelledActionsCount = 0;
        $delayedActionsCount = 0;

        $plansList = [];

        foreach ($plans as $plan) {
            $isCompleted = ($plan->status === 'Completed');
            $isCancelled = ($plan->status === 'Cancelled');
            $isDraft = ($plan->status === 'Draft');
            $isActive = ($plan->status === 'Active' || $plan->status === 'InProgress');

            // الخطة متأخرة إذا لم تكن مكتملة أو ملغية وتجاوزت تاريخ النهاية
            $isPlanOverdue = (!$isCompleted && !$isCancelled && $plan->end_date && Carbon::parse($plan->end_date)->lt($today));

            $planTotalActions = $plan->actions->count();
            $planPendingActions = 0;
            $planInProgressActions = 0;
            $planCompletedActions = 0;
            $planCancelledActions = 0;
            $planDelayedActions = 0;

            foreach ($plan->actions as $action) {
                $totalActionsCount++;
                $isActionDone = ($action->status === 'Done');
                $isActionCancelled = ($action->status === 'Cancelled');
                $isActionDelayed = (!$isActionDone && !$isActionCancelled && $action->due_date && Carbon::parse($action->due_date)->lt($today));

                if ($isActionDone) {
                    $completedActionsCount++;
                    $planCompletedActions++;
                } elseif ($isActionCancelled) {
                    $cancelledActionsCount++;
                    $planCancelledActions++;
                } elseif ($action->status === 'InProgress') {
                    $inProgressActionsCount++;
                    $planInProgressActions++;
                } else {
                    $pendingActionsCount++;
                    $planPendingActions++;
                }

                if ($isActionDelayed) {
                    $delayedActionsCount++;
                    $planDelayedActions++;
                }
            }

            // اعتبار الخطة متأخرة إما بتجاوز تاريخها أو باحتوائها على إجراءات متأخرة
            $hasDelayedState = ($isPlanOverdue || $planDelayedActions > 0);

            if ($isCompleted) {
                $completedPlansCount++;
            } elseif ($isCancelled) {
                $cancelledPlansCount++;
            } elseif ($isDraft) {
                $draftPlansCount++;
            } else {
                $inProgressPlansCount++;
            }

            if ($hasDelayedState) {
                $delayedPlansCount++;
            }

            $planActionCompletionRate = $planTotalActions > 0
                ? round(($planCompletedActions / $planTotalActions) * 100, 2)
                : 0.00;

            $plansList[] = [
                'plan_id' => $plan->plan_id,
                'title' => $plan->title,
                'status' => $plan->status,
                'start_date' => $plan->start_date?->format('Y-m-d'),
                'end_date' => $plan->end_date?->format('Y-m-d'),
                'is_delayed' => $hasDelayedState,
                'total_actions' => $planTotalActions,
                'pending_actions' => $planPendingActions,
                'in_progress_actions' => $planInProgressActions,
                'completed_actions' => $planCompletedActions,
                'delayed_actions' => $planDelayedActions,
                'completion_rate' => $planActionCompletionRate,
            ];
        }

        $overallActionsCompletionRate = $totalActionsCount > 0
            ? round(($completedActionsCount / $totalActionsCount) * 100, 2)
            : 0.00;

        return [
            'school_id' => $school->school_id,
            'school_name' => $school->school_name,
            'plans_summary' => [
                'total_plans' => $totalPlans,
                'in_progress_plans' => $inProgressPlansCount,
                'completed_plans' => $completedPlansCount,
                'draft_plans' => $draftPlansCount,
                'cancelled_plans' => $cancelledPlansCount,
                'delayed_plans' => $delayedPlansCount,
            ],
            'actions_summary' => [
                'total_actions' => $totalActionsCount,
                'pending_actions' => $pendingActionsCount,
                'in_progress_actions' => $inProgressActionsCount,
                'completed_actions' => $completedActionsCount,
                'cancelled_actions' => $cancelledActionsCount,
                'delayed_actions' => $delayedActionsCount,
                'overall_completion_rate' => $overallActionsCompletionRate,
            ],
            'plans' => $plansList,
        ];
    }

    /**
     * بناء لوحة معلومات المدرسة الموحدة (School Dashboard).
     *
     * @param School $school
     * @return array<string, mixed>
     */
    public function getSchoolDashboard(School $school): array
    {
        // أحدث ملف تقييم للمدرسة
        $latestEvaluation = Evaluation::query()
            ->where('school_id', $school->school_id)
            ->with(['cycle', 'school'])
            ->orderBy('evaluation_id', 'desc')
            ->first();

        $assessmentOverview = null;
        $evidenceOverview = null;

        if ($latestEvaluation) {
            $completeness = $this->checkEvaluationCompleteness($latestEvaluation);
            $isLocked = EvaluationLockChecker::isEvaluationLocked($latestEvaluation);

            if ($completeness['is_complete']) {
                $results = $this->calculateAssessmentResults($latestEvaluation);
                $standardsList = array_map(function ($s) {
                    return [
                        'standard_id' => $s['standard_id'],
                        'code' => $s['code'],
                        'name' => $s['name'],
                        'weight' => $s['weight'],
                        'raw_score' => $s['raw_score'],
                        'percentage' => $s['percentage'],
                        'weighted_score' => $s['weighted_score'],
                        'performance_level' => $s['performance_level'],
                    ];
                }, $results['standards']);

                $assessmentOverview = [
                    'evaluation_id' => $latestEvaluation->evaluation_id,
                    'cycle_id' => $latestEvaluation->cycle_id,
                    'academic_year' => $latestEvaluation->cycle?->academic_year,
                    'cycle_name' => $latestEvaluation->cycle?->name ?? $latestEvaluation->cycle?->academic_year,
                    'status' => $latestEvaluation->status,
                    'is_complete' => true,
                    'is_locked' => $isLocked,
                    'final_score' => $results['final_score'],
                    'performance_level' => $results['performance_level'],
                    'completion_percentage' => 100.00,
                    'standards_summary' => $standardsList,
                ];
            } else {
                $assessmentOverview = [
                    'evaluation_id' => $latestEvaluation->evaluation_id,
                    'cycle_id' => $latestEvaluation->cycle_id,
                    'academic_year' => $latestEvaluation->cycle?->academic_year,
                    'cycle_name' => $latestEvaluation->cycle?->name ?? $latestEvaluation->cycle?->academic_year,
                    'status' => $latestEvaluation->status,
                    'is_complete' => false,
                    'is_locked' => $isLocked,
                    'final_score' => null,
                    'performance_level' => null,
                    'completion_percentage' => $completeness['completion_percentage'],
                    'evaluated_indicators' => $completeness['evaluated_count'],
                    'total_indicators' => $completeness['total_indicators'],
                    'missing_indicators' => $completeness['missing_count'],
                    'message' => 'التقييم قيد الإجراء ولم تكتمل كافة المؤشرات بعد.',
                ];
            }

            $evidenceData = $this->calculateEvidenceSummary($latestEvaluation);
            $evidenceOverview = [
                'total_indicators' => $evidenceData['total_indicators'],
                'indicators_with_evidence' => $evidenceData['indicators_with_evidence'],
                'total_required_evidences' => $evidenceData['total_required_evidences'],
                'total_uploaded_evidences' => $evidenceData['total_uploaded_evidences'],
                'completion_rate' => $evidenceData['overall_evidence_completion_rate'],
            ];
        }

        $plansSummary = $this->calculateImprovementPlansSummary($school);

        return [
            'school' => [
                'school_id' => $school->school_id,
                'school_name' => $school->school_name,
                'educational_stage' => $school->educational_stage,
                'educational_district' => $school->educational_district,
                'governorate' => $school->governorate,
                'status' => $school->status,
            ],
            'assessment' => $assessmentOverview,
            'evidence_overview' => $evidenceOverview,
            'improvement_plans_overview' => [
                'total_plans' => $plansSummary['plans_summary']['total_plans'],
                'in_progress_plans' => $plansSummary['plans_summary']['in_progress_plans'],
                'completed_plans' => $plansSummary['plans_summary']['completed_plans'],
                'delayed_plans' => $plansSummary['plans_summary']['delayed_plans'],
                'actions_completion_rate' => $plansSummary['actions_summary']['overall_completion_rate'],
            ],
        ];
    }

    /**
     * تصدير تقرير التقييم المكتمل بصيغة JSON مهيكلة للفرونت إند.
     *
     * @param Evaluation $evaluation
     * @return array<string, mixed>
     */
    public function exportAssessmentReport(Evaluation $evaluation): array
    {
        $results = $this->calculateAssessmentResults($evaluation);
        $evidenceSummary = $this->calculateEvidenceSummary($evaluation);
        $school = $evaluation->school;
        $plansSummary = $school ? $this->calculateImprovementPlansSummary($school) : null;

        // استخراج نقاط القوة وفرص التحسين
        $strengths = [];
        $improvementOpportunities = [];

        foreach ($results['standards'] as $std) {
            foreach ($std['sub_standards'] as $sub) {
                foreach ($sub['indicators'] as $ind) {
                    if ($ind['score'] === 3) {
                        $strengths[] = [
                            'indicator_id' => $ind['indicator_id'],
                            'code' => $ind['code'],
                            'name' => $ind['name'],
                            'standard_name' => $std['name'],
                            'score' => 3,
                        ];
                    } elseif ($ind['score'] === 0 || $ind['score'] === 1) {
                        $improvementOpportunities[] = [
                            'indicator_id' => $ind['indicator_id'],
                            'code' => $ind['code'],
                            'name' => $ind['name'],
                            'standard_name' => $std['name'],
                            'score' => $ind['score'],
                            'level_label' => $ind['level_label'],
                        ];
                    }
                }
            }
        }

        return [
            'report_metadata' => [
                'report_title' => 'تقرير نتائج التقييم الذاتي المدرسي الشامل',
                'report_type' => 'SelfEvaluationReport',
                'system_version' => '1.0.0',
                'generated_at' => Carbon::now()->toIso8601String(),
                'export_format' => 'JSON',
            ],
            'school_information' => [
                'school_id' => $school?->school_id,
                'school_name' => $school?->school_name,
                'educational_stage' => $school?->educational_stage,
                'educational_district' => $school?->educational_district,
                'governorate' => $school?->governorate,
            ],
            'evaluation_context' => [
                'evaluation_id' => $evaluation->evaluation_id,
                'cycle_id' => $evaluation->cycle_id,
                'academic_year' => $evaluation->cycle?->academic_year,
                'cycle_name' => $evaluation->cycle?->name ?? $evaluation->cycle?->academic_year,
                'status' => $evaluation->status,
                'is_locked' => EvaluationLockChecker::isEvaluationLocked($evaluation),
            ],
            'executive_summary' => [
                'final_score' => $results['final_score'],
                'max_score' => 100.00,
                'performance_level' => $results['performance_level'],
                'total_standards' => count($results['standards']),
                'total_indicators' => $results['total_indicators'],
                'strengths_count' => count($strengths),
                'improvement_opportunities_count' => count($improvementOpportunities),
                'top_strengths' => array_slice($strengths, 0, 10),
                'priority_improvement_areas' => array_slice($improvementOpportunities, 0, 10),
            ],
            'standards_results' => $results['standards'],
            'evidence_completion' => [
                'overall_evidence_completion_rate' => $evidenceSummary['overall_evidence_completion_rate'],
                'total_required_evidences' => $evidenceSummary['total_required_evidences'],
                'total_uploaded_evidences' => $evidenceSummary['total_uploaded_evidences'],
                'indicators_with_evidence' => $evidenceSummary['indicators_with_evidence'],
                'indicators_missing_evidence' => $evidenceSummary['indicators_missing_evidence'],
            ],
            'improvement_plans_summary' => $plansSummary ? [
                'total_plans' => $plansSummary['plans_summary']['total_plans'],
                'completed_plans' => $plansSummary['plans_summary']['completed_plans'],
                'delayed_plans' => $plansSummary['plans_summary']['delayed_plans'],
                'actions_completion_rate' => $plansSummary['actions_summary']['overall_completion_rate'],
            ] : null,
        ];
    }

    /**
     * حفظ وتثبيت التقرير النهائي للتقييم في جدول reports بشرط قفله واكتماله (Rule #8).
     *
     * @param Evaluation $evaluation
     * @return Report
     * @throws \DomainException إذا كان التقييم غير مكتمل أو غير مقفل
     */
    public function finalizeReportIfClosed(Evaluation $evaluation): Report
    {
        $completeness = $this->checkEvaluationCompleteness($evaluation);
        if (!$completeness['is_complete']) {
            throw new \DomainException('لا يمكن حفظ التقرير النهائي لتقييم غير مكتمل.');
        }

        $isLocked = EvaluationLockChecker::isEvaluationLocked($evaluation);
        if (!$isLocked && $evaluation->status !== 'Completed') {
            throw new \DomainException('لا يمكن تثبيت التقرير النهائي لتقييم غير مقفل أو قيد التعديل.');
        }

        $report = Report::query()
            ->where('evaluation_id', $evaluation->evaluation_id)
            ->first();

        if (!$report) {
            $report = new Report();
            $report->evaluation_id = $evaluation->evaluation_id;
            $report->generated_at = Carbon::now();
        }

        $report->status = 'Final';
        $report->save();

        return $report;
    }

    /**
     * تحديد مستوى الأداء الوصفي بناءً على النسبة المئوية.
     *
     * @param float $percentage
     * @return array{key: string, label: string}
     */
    public function getPerformanceLevel(float $percentage): array
    {
        if ($percentage >= 90.00) {
            return [
                'key' => 'outstanding',
                'label' => 'متميز',
            ];
        }

        if ($percentage >= 75.00) {
            return [
                'key' => 'good',
                'label' => 'جيد',
            ];
        }

        if ($percentage >= 50.00) {
            return [
                'key' => 'satisfactory',
                'label' => 'متوسط',
            ];
        }

        return [
            'key' => 'needs_improvement',
            'label' => 'ضعيف',
        ];
    }
}
