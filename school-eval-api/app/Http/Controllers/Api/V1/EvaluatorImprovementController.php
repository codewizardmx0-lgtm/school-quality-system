<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesEvaluatorContext;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\AiAnalysis;
use App\Models\AiRecommendation;
use App\Models\EvaluationResult;
use App\Models\EvidenceLink;
use App\Models\ImprovementAction;
use App\Models\ImprovementArea;
use App\Models\ImprovementPlan;
use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\PlanImprovementArea;
use App\Models\PlanReviewNote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * متحكم خطط التحسين المدرسي والإجراءات والتحليل الاستشاري والمقترحات.
 */
class EvaluatorImprovementController extends Controller
{
    use ResolvesEvaluatorContext;

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
        $strengthResults = $results->filter(fn ($r) => (int) $r->score >= 2)->sortByDesc('score')->values();
        $gapResults = $results->filter(fn ($r) => (int) $r->score < 2)->sortBy('score')->values();

        $evidencesCount = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)->count();
        $requirementsTarget = IndicatorEvidenceRequirement::count() ?: 278;

        if ($totalScored === 0) {
            $summary = "تحليل بيانات التقييم الذاتي لـ ({$schoolName}): لا توجد مؤشرات مرصودة حتى الآن. يرجى البدء برصد التقديرات وإيداع الشواهد لاستخلاص نقاط القوة وفرص التحسين الفعلية.";
        } else {
            $strengthsCount = $strengthResults->count();
            $gapsCount = $gapResults->count();
            $summary = "تحليل بيانات التقييم الذاتي لـ ({$schoolName}): تم فحص {$totalScored} مؤشراً مرصوداً بمتوسط أداء عام {$overallAvg} من 3.00 نقاط. أظهرت النتائج توفر {$strengthsCount} نقطة قوة (المستوى 2 و 3)، مقابل {$gapsCount} فرصة تحسين وفجوة ميدانية (المستوى 0 و 1) تستلزم المعالجة في خطة التحسين المدرسي.";
        }

        $analysis = AiAnalysis::create([
            'evaluation_id'        => $evaluation->evaluation_id,
            'requested_by_user_id' => $user?->user_id ?? 1,
            'analysis_date'        => now(),
            'input_scope'          => 'results_and_notes',
            'summary'              => $summary,
            'status'               => 'Completed',
        ]);

        $recommendations = [];

        $strengthsByStd = $strengthResults->groupBy(fn ($r) => $r->indicator?->subStandard?->standard?->standard_id ?? 0);
        $topStandards = $strengthsByStd->sortByDesc(fn ($group) => $group->count())->take(3);

        foreach ($topStandards as $group) {
            $first = $group->first();
            $std = $first->indicator?->subStandard?->standard;
            $stdName = $std?->name ?? 'المعيار الوطني';
            $stdAvg = round($group->avg('score'), 2);
            $count = $group->count();

            $recommendations[] = [
                'analysis_id' => $analysis->analysis_id,
                'type'        => 'strength',
                'title'       => "تفوق الأداء في مجال: {$stdName}",
                'description' => "حقق المجال {$count} مؤشراً بمستويات متقدمة (2 و 3) وبمتوسط جودة بلغ {$stdAvg} من 3.00 نقاط وفق المرصود الفعلي في {$schoolName}.",
                'priority'    => $stdAvg >= 2.5 ? 'High' : 'Medium',
                'status'      => 'Accepted',
            ];
        }

        foreach ($gapResults->take(5) as $gapRes) {
            $ind = $gapRes->indicator;
            $indCode = $ind?->code ?? ('IND-' . $gapRes->indicator_id);
            $indName = $ind?->name ?? 'مؤشر أداء مدرسي';
            $scoreVal = (int) $gapRes->score;
            $levelLabel = $scoreVal === 0 ? 'المستوى 0: غير متوفر' : 'المستوى 1: متحقق بدرجة ضعيفة';

            $recommendations[] = [
                'analysis_id' => $analysis->analysis_id,
                'type'        => 'improvement',
                'title'       => "فرصة تحسين ({$indCode}): {$indName}",
                'description' => "تم رصد المؤشر بتقدير ({$levelLabel}) في ملف المدرسة الفعلي، مما يتطلب استيفاء الممارسات والشواهد الداعمة لرفعه إلى المستوى المستهدف.",
                'priority'    => $scoreVal === 0 ? 'High' : 'Medium',
                'status'      => 'PendingReview',
            ];

            $recommendations[] = [
                'analysis_id' => $analysis->analysis_id,
                'type'        => 'draft',
                'title'       => "مبادرة تطويرية للمؤشر ({$indCode}): تعزيز وتحسين {$indName}",
                'description' => "برنامج عمل تنفيذي لمعالجة الفجوة المرصودة في ({$indName}) والانتقال من ({$levelLabel}) إلى مستوى متحقق بالكامل مع توثيق الشواهد الداعمة.",
                'priority'    => $scoreVal === 0 ? 'High' : 'Medium',
                'status'      => 'PendingReview',
            ];
        }

        foreach ($recommendations as $rec) {
            AiRecommendation::create($rec);
        }

        $initiativesCount = collect($recommendations)->whereIn('type', ['recommendation', 'draft'])->count();

        return ApiResponse::created([
            'analysisId'                => $analysis->analysis_id,
            'summary'                   => $analysis->summary,
            'averageScore'              => $overallAvg,
            'evaluatedEvidences'        => $evidencesCount,
            'totalEvidences'            => $requirementsTarget,
            'suggestedInitiativesCount' => $initiativesCount,
            'createdAt'                 => $analysis->created_at?->toIso8601String(),
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
                'analysisId'   => 0,
                'summary'      => 'لم يتم إجراء تحليل آلي لبيانات المدرسة الحالية بعد. اضغط على «تشغيل التحليل» لاستخلاص نقاط القوة وفرص التحسين الفعلية.',
                'strengths'    => [],
                'improvements' => [],
                'initiatives'  => [],
            ]);
        }

        $recommendations = AiRecommendation::where('analysis_id', $analysis->analysis_id)
            ->orderBy('recommendation_id', 'asc')
            ->get();

        return ApiResponse::success([
            'analysisId' => $analysis->analysis_id,
            'summary'    => $analysis->summary,
            'strengths'  => $recommendations->where('type', 'strength')->values()->map(fn ($r) => [
                'id'          => $r->recommendation_id,
                'title'       => $r->title,
                'description' => $r->description,
                'priority'    => $r->priority,
            ]),
            'improvements' => $recommendations->where('type', 'improvement')->values()->map(fn ($r) => [
                'id'          => $r->recommendation_id,
                'title'       => $r->title,
                'description' => $r->description,
                'priority'    => $r->priority,
            ]),
            'initiatives' => $recommendations->whereIn('type', ['recommendation', 'draft'])->values()->map(fn ($r) => [
                'id'                 => $r->recommendation_id,
                'title'              => $r->title,
                'description'        => $r->description,
                'priority'           => $r->priority,
                'status'             => $r->status,
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
            'status'             => 'required|in:PendingReview,Accepted,Modified,Ignored',
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
            'id'                 => $id,
            'status'             => $request->input('status'),
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

        $requestedPlanId = $request->query('plan_id') ?? $request->query('planId');
        if ($requestedPlanId) {
            $plan = ImprovementPlan::where('school_id', $schoolId)
                ->where('plan_id', (int) $requestedPlanId)
                ->with(['actions.area'])
                ->first();
        } else {
            $plan = ImprovementPlan::where('school_id', $schoolId)
                ->where('cycle_id', $evaluation->cycle_id)
                ->where('plan_type', $planType)
                ->where('status', 'Active')
                ->orderBy('plan_id', 'desc')
                ->with(['actions.area'])
                ->first();

            if (!$plan) {
                $plan = ImprovementPlan::where('school_id', $schoolId)
                    ->where('cycle_id', $evaluation->cycle_id)
                    ->where('plan_type', $planType)
                    ->where('status', '!=', 'Cancelled')
                    ->orderBy('plan_id', 'desc')
                    ->with(['actions.area'])
                    ->first();
            }
        }

        if (!$plan && $planType === ImprovementPlan::TYPE_QUALITY_IMPROVEMENT && !$requestedPlanId) {
            $plan = ImprovementPlan::where('school_id', $schoolId)
                ->where('plan_type', $planType)
                ->where('status', '!=', 'Cancelled')
                ->orderBy('plan_id', 'desc')
                ->with(['actions.area'])
                ->first();
        }

        $evalResultIds = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)->pluck('result_id');
        $availableAreas = ImprovementArea::where(function ($q) use ($evalResultIds, $evaluation) {
            $q->whereIn('result_id', $evalResultIds)
              ->orWhereHas('plans', function ($pq) use ($evaluation) {
                  $pq->where('school_id', $evaluation->school_id)->where('cycle_id', $evaluation->cycle_id);
              });
        })->with(['indicator.subStandard.standard', 'result', 'plans', 'actions.plan'])->orderBy('area_id', 'desc')->get();

        if (!$plan) {
            if (in_array($evaluation->status, ['Submitted', 'UnderReview', 'Completed'], true) || $evaluation->cycle?->status === 'Closed') {
                return ApiResponse::success([
                    'planId'         => 0,
                    'planType'       => $planType,
                    'versionNumber'  => 1,
                    'parentPlanId'   => null,
                    'versionTag'     => null,
                    'title'          => 'خطة غير مسجلة لهذه الدورة',
                    'status'         => 'Archived',
                    'startDate'      => null,
                    'endDate'        => null,
                    'areas'          => [],
                    'availableAreas' => [],
                    'summary'        => ['totalActions' => 0, 'inProgressActions' => 0, 'doneActions' => 0, 'pendingActions' => 0],
                    'actions'        => [],
                ]);
            }
            $defaultTitleMap = [
                ImprovementPlan::TYPE_QUALITY_IMPROVEMENT => 'خطة تحسين الجودة المدرسية الشاملة',
                ImprovementPlan::TYPE_STAFF_DEVELOPMENT   => 'خطة التطوير المهني والتربوي للكوادر',
                ImprovementPlan::TYPE_ANNUAL_OPERATIONAL  => 'الخطة التشغيلية السنوية للمدرسة',
            ];
            $plan = ImprovementPlan::create([
                'school_id'          => $schoolId,
                'cycle_id'           => $evaluation->cycle_id,
                'title'              => $defaultTitleMap[$planType] ?? 'خطة التحسين والتطوير المدرسي',
                'plan_type'          => $planType,
                'version_number'     => 1,
                'version_tag'        => 'خطة أساسية',
                'start_date'         => now()->toDateString(),
                'end_date'           => now()->addMonths(6)->toDateString(),
                'status'             => 'Draft',
                'created_by_user_id' => $request->user()?->user_id ?? 1,
            ]);
        }

        $planAreaIds = PlanImprovementArea::where('plan_id', $plan->plan_id)->pluck('area_id');
        $planAreas = ImprovementArea::whereIn('area_id', $planAreaIds)
            ->with(['indicator.subStandard.standard', 'result'])
            ->get()->map(fn ($a) => [
                'areaId'        => $a->area_id,
                'name'          => $a->name,
                'priority'      => $a->priority,
                'status'        => $a->status ?? 'pending_action',
                'targetScore'   => $a->target_score ?? 3,
                'indicatorId'   => $a->indicator_id,
                'indicatorCode' => $a->indicator?->code ?? '',
                'indicatorName' => $a->indicator?->name ?? '',
                'standardCode'  => $a->indicator?->subStandard?->standard?->code ?? '',
                'standardName'  => $a->indicator?->subStandard?->standard?->name ?? '',
            ])->values();

        $actions = ImprovementAction::where('plan_id', $plan->plan_id)
            ->with(['area.indicator.subStandard.standard', 'area.result'])
            ->orderBy('action_id', 'desc')
            ->get();

        $totalActions = $actions->count();
        $inProgressActions = $actions->where('status', 'InProgress')->count();
        $doneActions = $actions->where('status', 'Done')->count();
        $pendingActions = $actions->where('status', 'Pending')->count();

        $actionsFormatted = $actions->map(function ($act) use ($plan, $evaluation) {
            $isNewInVersion = false;
            if (($plan->version_number ?? 1) > 1 && $plan->created_at && $act->created_at) {
                $isNewInVersion = $act->created_at->gt($plan->created_at->addSeconds(2));
            }

            $area = $act->area;
            $indicator = $area?->indicator;
            $subStandard = $indicator?->subStandard;
            $standard = $subStandard?->standard;
            $currentScore = $area?->result?->score;
            if ($currentScore === null && ($indicator?->indicator_id || $area?->indicator_id) && $evaluation) {
                $indId = $indicator?->indicator_id ?? $area?->indicator_id;
                $currentScore = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
                    ->where('indicator_id', $indId)
                    ->value('score');
            }
            $targetScore = $area?->target_score ?? 3;
            $gap = $currentScore !== null ? max(0, (int) $targetScore - (int) $currentScore) : null;
            $priority = $area?->priority ?? 'High';
            $priorityMap = ['High' => 'عالية', 'Medium' => 'متوسطة', 'Low' => 'منخفضة'];

            return [
                'actionId'             => $act->action_id,
                'planId'               => $act->plan_id,
                'areaId'               => $act->area_id,
                'areaName'             => $area?->name ?? 'مجال عام',
                'title'                => $act->title,
                'standardCode'         => $standard?->code ?? '',
                'standardName'         => $standard?->name ?? ($area?->name ?? 'معيار التطوير والجودة'),
                'subStandardCode'      => $subStandard?->code ?? '',
                'subStandardName'      => $subStandard?->name ?? '',
                'indicatorId'          => $indicator?->indicator_id ?? $area?->indicator_id,
                'indicatorCode'        => $indicator?->code ?? '',
                'indicatorName'        => $indicator?->name ?? '',
                'score'                => $currentScore,
                'targetScore'          => $targetScore,
                'gap'                  => $gap,
                'baselineScore'        => $act->baseline_score ?? $currentScore,
                'baselineTargetScore'  => $act->baseline_target_score ?? $targetScore,
                'baselineGap'          => $act->baseline_gap ?? $gap,
                'priority'             => $priority,
                'priorityArabic'       => $priorityMap[$priority] ?? 'عالية',
                'leader'               => $act->responsible_person_description ?: 'فريق التطوير والتحسين',
                'startDate'            => $act->start_date?->toDateString() ?? $plan->start_date?->toDateString(),
                'dueDate'              => $act->due_date?->toDateString() ?? $plan->end_date?->toDateString(),
                'status'               => $act->status,
                'statusArabic'         => $act->status === 'Done' ? 'مكتمل' : ($act->status === 'InProgress' ? 'قيد التنفيذ' : ($act->status === 'Cancelled' ? 'ملغي' : 'معلق')),
                'completionPercentage' => $act->completion_percentage,
                'progressDescription'  => $act->progress_description ?: 'لا يوجد وصف للتقدم بعد',
                'isNewInVersion'       => $isNewInVersion,
            ];
        });

        $reviewNotes = PlanReviewNote::where('plan_id', $plan->plan_id)
            ->with(['author'])
            ->orderBy('note_id', 'desc')
            ->get()
            ->map(fn ($n) => [
                'noteId'         => $n->note_id,
                'authorName'     => $n->author?->full_name ?? $n->author?->username ?? 'مراجع معتمد',
                'authorUsername' => $n->author?->username ?? '',
                'reviewerRole'   => $n->reviewer_role,
                'roleArabic'     => $n->reviewer_role === 'ministry_supervisor' ? 'مشرف وزاري' : ($n->reviewer_role === 'school_principal' ? 'مدير مدرسة' : 'مقيم جودة'),
                'text'           => $n->text,
                'createdAt'      => $n->created_at?->toIso8601String(),
            ])->values();

        return ApiResponse::success([
            'planId'         => $plan->plan_id,
            'planType'       => $plan->plan_type ?? ImprovementPlan::TYPE_QUALITY_IMPROVEMENT,
            'versionNumber'  => (int) ($plan->version_number ?? 1),
            'parentPlanId'   => $plan->parent_plan_id ? (int) $plan->parent_plan_id : null,
            'versionTag'     => $plan->version_tag,
            'title'          => $plan->title,
            'status'         => $plan->status,
            'startDate'      => $plan->start_date?->toDateString(),
            'endDate'        => $plan->end_date?->toDateString(),
            'areas'          => $planAreas,
            'availableAreas' => $availableAreas->map(function ($a) use ($evaluation) {
                $existingLinks = [];
                foreach ($a->actions as $action) {
                    if (!$action->plan_id) {
                        continue;
                    }
                    $actPlan = $action->plan;
                    if ($actPlan && $actPlan->school_id === $evaluation->school_id && $actPlan->cycle_id === $evaluation->cycle_id && $actPlan->status !== 'Cancelled') {
                        $leaderName = $action->responsible_person_description;
                        if ($leaderName === 'قيد التعيين' || empty(trim($leaderName ?? ''))) {
                            $leaderName = null;
                        }
                        $existingLinks[] = [
                            'planId'    => $action->plan_id,
                            'planTitle' => $actPlan->title,
                            'planType'  => $actPlan->plan_type,
                            'person'    => $leaderName,
                        ];
                    }
                }

                $existingLinks = collect($existingLinks)->unique('planId')->values()->all();
                $firstValidLink = !empty($existingLinks) ? $existingLinks[0] : null;

                $currentScore = $a->result?->score;
                if ($currentScore === null && $a->indicator_id && $evaluation) {
                    $currentScore = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
                        ->where('indicator_id', $a->indicator_id)
                        ->value('score');
                }

                return [
                    'areaId'                  => $a->area_id,
                    'name'                    => $a->name,
                    'priority'                => $a->priority,
                    'status'                  => $a->status ?? 'pending_action',
                    'score'                   => $currentScore,
                    'targetScore'             => $a->target_score ?? 3,
                    'indicatorId'             => $a->indicator_id,
                    'indicatorCode'           => $a->indicator?->code ?? '',
                    'indicatorName'           => $a->indicator?->name ?? '',
                    'standardCode'            => $a->indicator?->subStandard?->standard?->code ?? '',
                    'standardName'            => $a->indicator?->subStandard?->standard?->name ?? '',
                    'alreadyAdoptedPlanTitle' => $firstValidLink ? $firstValidLink['planTitle'] : null,
                    'alreadyAdoptedPlanType'  => $firstValidLink ? $firstValidLink['planType'] : null,
                    'alreadyAdoptedPerson'    => $firstValidLink ? $firstValidLink['person'] : null,
                    'existingLinks'           => $existingLinks,
                    'hasAction'               => !empty($existingLinks),
                ];
            })->values(),
            'summary' => [
                'totalActions'      => $totalActions,
                'inProgressActions' => $inProgressActions,
                'doneActions'       => $doneActions,
                'pendingActions'    => $pendingActions,
            ],
            'actions'     => $actionsFormatted,
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

        $existingActivePlan = ImprovementPlan::where('school_id', $schoolId)
            ->where('cycle_id', $evaluation->cycle_id)
            ->where('plan_type', $planType)
            ->where('status', 'Active')
            ->first();

        if ($existingActivePlan) {
            $typeLabel = match ($planType) {
                ImprovementPlan::TYPE_STAFF_DEVELOPMENT  => 'خطة التطوير المهني للكوادر',
                ImprovementPlan::TYPE_ANNUAL_OPERATIONAL => 'الخطة التشغيلية السنوية',
                default                                  => 'خطة تحسين الجودة المدرسية',
            };
            return ApiResponse::validationError([
                'planType' => ["توجد خطة نشطة ومعتمدة بالفعل لهذا المسار ({$typeLabel}). وفق القواعد الوزارية، يُسمح بخطة نشطة واحدة فقط لكل نوع في الدورة، ويمكنك تعديل الخطة الحالية أو استنساخ إصدار جديد (v2) عند طلب الاستكمال."],
            ], 'توجد خطة نشطة قائمة بالفعل لهذا المسار في الدورة الحالية.');
        }

        $maxVer = ImprovementPlan::where('school_id', $schoolId)
            ->where('cycle_id', $evaluation->cycle_id)
            ->where('plan_type', $planType)
            ->max('version_number') ?? 0;

        $plan = ImprovementPlan::create([
            'school_id'          => $schoolId,
            'cycle_id'           => $evaluation->cycle_id,
            'title'              => $request->input('title'),
            'plan_type'          => $planType,
            'version_number'     => $maxVer + 1,
            'version_tag'        => $maxVer === 0 ? 'خطة أساسية معتمدة' : 'إصدار جديد',
            'start_date'         => $request->input('startDate') ?? now()->toDateString(),
            'end_date'           => $request->input('endDate') ?? now()->addMonths(6)->toDateString(),
            'status'             => 'Active',
            'created_by_user_id' => $request->user()?->user_id ?? 1,
        ]);

        $evalResultIds = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)->pluck('result_id');
        $availableAreaIds = ImprovementArea::whereIn('result_id', $evalResultIds)->pluck('area_id')->toArray();

        $requestedAreaIds = $request->input('areaIds');
        $areaIdsToLink = (!empty($requestedAreaIds) && is_array($requestedAreaIds))
            ? array_values(array_intersect($requestedAreaIds, $availableAreaIds))
            : $availableAreaIds;

        foreach ($areaIdsToLink as $areaId) {
            PlanImprovementArea::firstOrCreate([
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

        $note = PlanReviewNote::create([
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
     * GET /api/v1/evaluator/improvement-plans
     * Get all improvement plans for the current school and cycle
     */
    public function getSchoolImprovementPlans(Request $request): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $schoolId = $evaluation->school_id;

        $query = ImprovementPlan::where('school_id', $schoolId)
            ->where('cycle_id', $evaluation->cycle_id)
            ->with(['cycle', 'actions', 'planImprovementAreas.area']);

        if ($request->filled('plan_type') || $request->filled('planType')) {
            $type = $request->query('plan_type') ?? $request->query('planType');
            $query->where('plan_type', $type);
        }

        $plans = $query->orderBy('version_number', 'desc')
            ->orderBy('plan_id', 'desc')
            ->get();

        $typeLabelMap = [
            ImprovementPlan::TYPE_QUALITY_IMPROVEMENT => 'خطة تحسين الجودة المدرسية',
            ImprovementPlan::TYPE_STAFF_DEVELOPMENT   => 'خطة التطوير المهني للكوادر',
            ImprovementPlan::TYPE_ANNUAL_OPERATIONAL  => 'الخطة التشغيلية السنوية',
        ];

        $statusLabelMap = [
            'Draft'     => 'مسودة',
            'Active'    => 'نشطة ومعتمدة',
            'Submitted' => 'مرفوعة',
            'Archived'  => 'مؤرشفة',
            'Completed' => 'مكتملة',
            'Cancelled' => 'ملغاة',
        ];

        $plansFormatted = $plans->map(function ($p) use ($typeLabelMap, $statusLabelMap) {
            $totalActions = $p->actions->count();
            $doneActions = $p->actions->where('status', 'Done')->count();
            $inProgressActions = $p->actions->where('status', 'InProgress')->count();
            $pendingActions = $p->actions->where('status', 'Pending')->count();
            $delayedActions = $p->actions->filter(function ($a) {
                return $a->status !== 'Done' && $a->due_date && $a->due_date->isPast();
            })->count();

            $progressPct = 0;
            if ($totalActions > 0) {
                $avgComp = $p->actions->avg('completion_percentage');
                $progressPct = (int) round($avgComp !== null ? $avgComp : ($doneActions / $totalActions * 100));
            }

            return [
                'planId'                    => (int) $p->plan_id,
                'planType'                  => $p->plan_type ?? ImprovementPlan::TYPE_QUALITY_IMPROVEMENT,
                'planTypeLabel'             => $typeLabelMap[$p->plan_type] ?? 'خطة تحسين الجودة المدرسية',
                'title'                     => $p->title,
                'versionNumber'             => (int) ($p->version_number ?? 1),
                'parentPlanId'              => $p->parent_plan_id ? (int) $p->parent_plan_id : null,
                'versionTag'                => $p->version_tag,
                'academicYear'              => $p->cycle?->academic_year ?? '2025/2026',
                'startDate'                 => $p->start_date?->toDateString(),
                'endDate'                   => $p->end_date?->toDateString(),
                'status'                    => $p->status,
                'statusArabic'              => $statusLabelMap[$p->status] ?? $p->status,
                'overallProgressPercentage' => $progressPct,
                'areasCount'                => $p->actions->pluck('area_id')->filter()->unique()->count(),
                'totalActions'              => $totalActions,
                'doneActions'               => $doneActions,
                'inProgressActions'         => $inProgressActions,
                'pendingActions'            => $pendingActions,
                'delayedActions'            => $delayedActions,
                'createdAt'                 => $p->created_at?->toIso8601String(),
            ];
        })->values();

        return ApiResponse::success($plansFormatted);
    }

    /**
     * POST /api/v1/evaluator/improvement-plans/{id}/clone-version
     * Smart version cloning (v1 -> v2) upon supervisor completion request
     */
    public function clonePlanVersion(Request $request, int $id): JsonResponse
    {
        $evaluation = $this->getActiveEvaluation($request);
        $user = $request->user();

        if ($user && !$user->hasPermission('plans.manage')) {
            return ApiResponse::forbidden('ليس لديك صلاحية استنساخ إصدار جديد من خطة التحسين.');
        }

        $sourcePlan = ImprovementPlan::where('plan_id', $id)
            ->where('school_id', $evaluation->school_id)
            ->with(['planImprovementAreas', 'actions'])
            ->first();

        if (!$sourcePlan) {
            return ApiResponse::notFound('خطة التحسين المصدرية غير موجودة.');
        }

        $maxVersion = ImprovementPlan::where('school_id', $evaluation->school_id)
            ->where('cycle_id', $evaluation->cycle_id)
            ->where('plan_type', $sourcePlan->plan_type)
            ->max('version_number') ?? 1;

        $nextVersion = max((int) $maxVersion + 1, (int) ($sourcePlan->version_number ?? 1) + 1);

        ImprovementPlan::where('school_id', $evaluation->school_id)
            ->where('cycle_id', $evaluation->cycle_id)
            ->where('plan_type', $sourcePlan->plan_type)
            ->whereIn('status', ['Active', 'Draft', 'Submitted'])
            ->update([
                'status'      => 'Archived',
                'version_tag' => DB::raw("COALESCE(version_tag, 'نسخة سابقة مؤرشفة')"),
            ]);

        $sourcePlan->update(['status' => 'Archived']);

        $newPlan = ImprovementPlan::create([
            'school_id'            => $sourcePlan->school_id,
            'cycle_id'             => $sourcePlan->cycle_id,
            'plan_type'            => $sourcePlan->plan_type,
            'version_number'       => $nextVersion,
            'parent_plan_id'       => $sourcePlan->plan_id,
            'version_tag'          => "نسخة استكمال (v{$nextVersion})",
            'created_by_user_id'   => $user?->user_id ?? $sourcePlan->created_by_user_id ?? 1,
            'title'                => $sourcePlan->title,
            'start_date'           => $sourcePlan->start_date ?? now()->toDateString(),
            'end_date'             => $sourcePlan->end_date ?? now()->addMonths(6)->toDateString(),
            'status'               => 'Active',
            'progress_description' => $sourcePlan->progress_description,
        ]);

        foreach ($sourcePlan->planImprovementAreas as $pia) {
            PlanImprovementArea::create([
                'plan_id'    => $newPlan->plan_id,
                'area_id'    => $pia->area_id,
                'created_at' => now(),
            ]);
        }

        foreach ($sourcePlan->actions as $action) {
            ImprovementAction::create([
                'plan_id'                        => $newPlan->plan_id,
                'area_id'                        => $action->area_id,
                'title'                          => $action->title,
                'responsible_person_description' => $action->responsible_person_description ?: 'فريق التحسين المدرسي',
                'start_date'                     => $action->start_date ?? now()->toDateString(),
                'due_date'                       => $action->due_date ?? now()->addMonths(3)->toDateString(),
                'status'                         => $action->status === 'Done' ? 'Done' : 'InProgress',
                'completion_percentage'          => $action->completion_percentage ?? 0,
                'progress_description'           => $action->progress_description,
                'baseline_score'                 => $action->baseline_score,
                'baseline_target_score'          => $action->baseline_target_score,
                'baseline_gap'                   => $action->baseline_gap,
                'created_at'                     => now(),
                'updated_at'                     => now(),
            ]);
        }

        return ApiResponse::created([
            'planId'        => $newPlan->plan_id,
            'planType'      => $newPlan->plan_type,
            'versionNumber' => $newPlan->version_number,
            'parentPlanId'  => $newPlan->parent_plan_id,
            'versionTag'    => $newPlan->version_tag,
            'title'         => $newPlan->title,
            'status'        => $newPlan->status,
            'startDate'     => $newPlan->start_date?->toDateString(),
            'endDate'       => $newPlan->end_date?->toDateString(),
            'actionsCount'  => $sourcePlan->actions->count(),
            'areasCount'    => $sourcePlan->actions->pluck('area_id')->filter()->unique()->count(),
        ], "تم استنساخ الخطة بنجاح وإنشاء الإصدار الجديد (v{$nextVersion}) القابل للتعديل.");
    }

    /**
     * POST /api/v1/improvement-actions
     * Create action (or transfer from AI initiative) with composite FK enforcement
     */
    public function createImprovementAction(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'planId'               => 'nullable|integer',
            'planType'             => 'nullable|in:QualityImprovement,StaffProfessionalDevelopment,AnnualOperational',
            'areaId'               => 'nullable|integer',
            'title'                => 'required|string|max:255',
            'leader'               => 'nullable|string|max:255',
            'startDate'            => 'nullable|date',
            'dueDate'              => 'nullable|date',
            'status'               => 'nullable|in:Pending,InProgress,Done,Cancelled',
            'progressDescription'  => 'nullable|string',
            'completionPercentage' => 'nullable|integer|min:0|max:100',
            'recommendationId'     => 'nullable|integer',
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
                'school_id'          => $evaluation->school_id,
                'cycle_id'           => $evaluation->cycle_id,
                'title'              => 'خطة التحسين والتطوير المدرسي',
                'plan_type'          => $request->input('planType', ImprovementPlan::TYPE_QUALITY_IMPROVEMENT),
                'start_date'         => now()->toDateString(),
                'end_date'           => now()->addMonths(6)->toDateString(),
                'status'             => 'Draft',
                'created_by_user_id' => $request->user()?->user_id ?? 1,
            ]);
        }

        $areaId = $request->input('areaId');
        if ($areaId) {
            $existsInPlan = PlanImprovementArea::where('plan_id', $plan->plan_id)
                ->where('area_id', (int) $areaId)
                ->exists();
            if (!$existsInPlan) {
                $evalResultIds = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)->pluck('result_id');
                $areaBelongsToSchool = ImprovementArea::where('area_id', (int) $areaId)
                    ->where(function ($q) use ($evalResultIds) {
                        $q->whereIn('result_id', $evalResultIds);
                    })->exists();

                if ($areaBelongsToSchool) {
                    PlanImprovementArea::firstOrCreate([
                        'plan_id' => $plan->plan_id,
                        'area_id' => (int) $areaId,
                    ], [
                        'created_at' => now(),
                    ]);
                } else {
                    return ApiResponse::validationError([
                        'areaId' => ['المجال المستهدف لا ينتمي لمجالات الخطة أو التقييم الحالي (قيد المفتاح المركب).'],
                    ]);
                }
            }
        } else {
            $areaId = PlanImprovementArea::where('plan_id', $plan->plan_id)->value('area_id');
            if (!$areaId) {
                $firstResult = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)->first();
                $defaultArea = ImprovementArea::create([
                    'result_id'    => $firstResult?->result_id,
                    'indicator_id' => $firstResult?->indicator_id ?? Indicator::value('indicator_id'),
                    'name'         => 'مجال التطوير والجودة المؤسسية العام',
                    'priority'     => 'Medium',
                    'target_score' => 3,
                    'description'  => 'مجال عام مضاف تلقائياً لدعم خطة التحسين.',
                ]);
                PlanImprovementArea::create([
                    'plan_id'    => $plan->plan_id,
                    'area_id'    => $defaultArea->area_id,
                    'created_at' => now(),
                ]);
                $areaId = $defaultArea->area_id;
            }
        }

        $targetArea = ImprovementArea::with('result')->find($areaId);
        $baselineCurrentScore = $targetArea?->result?->score;
        if ($baselineCurrentScore === null && $targetArea?->indicator_id && $evaluation) {
            $baselineCurrentScore = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
                ->where('indicator_id', $targetArea->indicator_id)
                ->value('score');
        }
        $baselineTarget = $targetArea?->target_score ?? 3;
        $baselineGap = $baselineCurrentScore !== null ? max(0, (int) $baselineTarget - (int) $baselineCurrentScore) : null;

        $action = ImprovementAction::create([
            'plan_id'                        => $plan->plan_id,
            'area_id'                        => (int) $areaId,
            'title'                          => $request->input('title'),
            'responsible_person_description' => $request->input('leader', 'مسؤول فريق التحسين'),
            'start_date'                     => $request->input('startDate', now()->toDateString()),
            'due_date'                       => $request->input('dueDate', now()->addMonths(2)->toDateString()),
            'status'                         => $request->input('status', 'InProgress'),
            'completion_percentage'          => $request->input('completionPercentage', 10),
            'progress_description'           => $request->input('progressDescription', 'تم إدراج الإجراء ضمن خطة التحسين وبدء التنسيق للتنفيذ.'),
            'baseline_score'                 => $baselineCurrentScore,
            'baseline_target_score'          => $baselineTarget,
            'baseline_gap'                   => $baselineGap,
        ]);

        if ($request->filled('recommendationId')) {
            $rec = AiRecommendation::find($request->input('recommendationId'));
            if ($rec) {
                $rec->status = 'Accepted';
                $rec->improvement_action_id = $action->action_id;
                $rec->save();
            }
        }

        return ApiResponse::created([
            'actionId'             => $action->action_id,
            'planId'               => $action->plan_id,
            'areaId'               => $action->area_id,
            'areaName'             => $action->area?->name ?? 'مجال التحسين',
            'title'                => $action->title,
            'leader'               => $action->responsible_person_description,
            'startDate'            => $action->start_date?->toDateString(),
            'dueDate'              => $action->due_date?->toDateString(),
            'status'               => $action->status,
            'completionPercentage' => $action->completion_percentage,
            'progressDescription'  => $action->progress_description,
            'baselineScore'        => $action->baseline_score,
            'baselineTargetScore'  => $action->baseline_target_score,
            'baselineGap'          => $action->baseline_gap,
        ], 'تمت إضافة إجراء التحسين إلى الخطة بنجاح');
    }

    /**
     * PUT /api/v1/improvement-actions/{id}
     * Update action progress and timeline
     */
    public function updateImprovementAction(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title'                => 'sometimes|required|string|max:255',
            'leader'               => 'nullable|string|max:255',
            'startDate'            => 'nullable|date',
            'dueDate'              => 'nullable|date',
            'status'               => 'nullable|in:Pending,InProgress,Done,Cancelled',
            'progressDescription'  => 'nullable|string',
            'completionPercentage' => 'nullable|integer|min:0|max:100',
            'priority'             => 'nullable|in:Low,Medium,High',
            'targetScore'          => 'nullable|integer|between:1,3',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $user = $request->user();
        if ($user && !$user->hasPermission('plans.manage')) {
            return ApiResponse::forbidden('ليس لديك صلاحية تعديل إجراءات خطة التحسين.');
        }

        $action = ImprovementAction::with('area')->find($id);
        if (!$action) {
            return ApiResponse::success(null, 'تم حفظ التحديث (وضع التجربة)');
        }

        if ($request->filled('title')) {
            $action->title = $request->input('title');
        }
        if ($request->filled('leader')) {
            $action->responsible_person_description = $request->input('leader');
        }
        if ($request->filled('startDate')) {
            $action->start_date = $request->input('startDate');
        }
        if ($request->filled('dueDate')) {
            $action->due_date = $request->input('dueDate');
        }
        if ($request->filled('status')) {
            $action->status = $request->input('status');
        }
        if ($request->has('completionPercentage')) {
            $action->completion_percentage = $request->input('completionPercentage');
        }
        if ($request->filled('progressDescription')) {
            $action->progress_description = $request->input('progressDescription');
        }

        $action->save();

        if ($action->area) {
            $areaUpdates = [];
            if ($request->filled('priority')) {
                $areaUpdates['priority'] = $request->input('priority');
            }
            if ($request->filled('targetScore')) {
                $areaUpdates['target_score'] = (int) $request->input('targetScore');
            }
            if (!empty($areaUpdates)) {
                $action->area->update($areaUpdates);
            }
        }

        return ApiResponse::success([
            'actionId'             => $action->action_id,
            'planId'               => $action->plan_id,
            'title'                => $action->title,
            'leader'               => $action->responsible_person_description,
            'startDate'            => $action->start_date?->toDateString(),
            'dueDate'              => $action->due_date?->toDateString(),
            'status'               => $action->status,
            'priority'             => $action->area?->priority,
            'targetScore'          => $action->area?->target_score,
            'completionPercentage' => $action->completion_percentage,
            'progressDescription'  => $action->progress_description,
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
            return app(ImprovementPlanController::class)->attachActionEvidence($request, $plan->plan_id, $id);
        }

        return ApiResponse::notFound('الخطة غير موجودة.');
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

        return app(ImprovementSuggestionController::class)->index($request, $evaluation->evaluation_id);
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

        $isAdopted = ImprovementArea::where('result_id', $resultId)->exists();
        if ($isAdopted) {
            return ApiResponse::error('لا يمكن استبعاد مقترح تم تبنيه كإجراء تحسين مسبقاً. يجب إلغاء تبني الإجراء أولاً.', 422);
        }

        $result->update([
            'is_excluded' => true,
            'excluded_at' => now(),
        ]);

        return ApiResponse::success([
            'resultId'   => $result->result_id,
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
            'resultId'   => $result->result_id,
            'isExcluded' => false,
            'excludedAt' => null,
        ], 'تمت استعادة المقترح وإعادته لقائمة الاقتراحات النشطة بنجاح.');
    }
}
