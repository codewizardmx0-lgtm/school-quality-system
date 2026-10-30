<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ProgressLevel;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\EvaluationCycle;
use App\Models\Evidence;
use App\Models\ImprovementAction;
use App\Models\ImprovementArea;
use App\Models\ImprovementPlan;
use App\Models\PlanImprovementArea;
use App\Models\PlanReviewNote;
use App\Services\ActionCatalogService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * متحكم خطط التحسين المدرسي وإجراءاتها وملاحظات المراجعة.
 *
 * يشمل:
 * - إدارة الخطط المدرسية ودورة حياتها (Draft -> Active -> Completed / Cancelled).
 * - ربط الخطط بمجالات التحسين (Many-to-Many).
 * - إدارة الإجراءات التنفيذية المحكومة بالمفتاح الأجنبي المركب (plan_id, area_id).
 * - احتساب التأخر ديناميكياً (isDelayed) والتقدم الإجمالي دون نسب رقمية.
 * - تدوين ملاحظات مراجعة مدير المدرسة (reviews.write).
 */
class ImprovementPlanController extends Controller
{
    /**
     * استعراض بنك الإجراءات النموذجية المقترحة حسب المعيار الفرعي أو نوع الخطة (الشريحة 8).
     *
     * GET /api/v1/improvement-plans/action-catalog
     * الصلاحية: plans.view أو plans.manage
     */
    public function actionCatalog(Request $request, ActionCatalogService $catalogService): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('plans.view') && !$user->hasPermission('plans.manage')) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض بنك الإجراءات النموذجية.');
        }

        $subStandardCode = $request->query('sub_standard_code') ?? $request->query('subStandardCode');
        $planType = $request->query('plan_type') ?? $request->query('planType');

        $items = $catalogService->filter($subStandardCode, $planType);

        return ApiResponse::success(
            data: $items,
            message: null
        );
    }

    /**
     * استعراض قائمة خطط التحسين والتطوير الخاصة بالمدرسة مع الإحصائيات العامة والفلترة.
     *
     * GET /api/v1/improvement-plans
     * الصلاحية: plans.view أو plans.manage
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('plans.view') && !$user->hasPermission('plans.manage')) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض خطط التحسين.');
        }

        $query = ImprovementPlan::with(['cycle', 'school', 'creator', 'areas', 'actions', 'reviewNotes'])
            ->orderBy('plan_id', 'desc');

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school') {
            $query->where('school_id', $user->school_id);
        }

        // فلترة نوع الخطة (QualityImprovement, StaffProfessionalDevelopment, AnnualOperational)
        $planType = $request->query('plan_type') ?? $request->query('planType');
        if (!empty($planType)) {
            $query->where('plan_type', $planType);
        }

        // فلترة دورة التقييم
        $cycleId = $request->query('cycle_id') ?? $request->query('cycleId');
        if (!empty($cycleId)) {
            $query->where('cycle_id', (int) $cycleId);
        }

        $plans = $query->get()->map(function ($plan) {
            return $this->formatPlanSummary($plan);
        });

        return ApiResponse::success(
            data: $plans,
            message: null
        );
    }

    /**
     * إنشاء خطة تحسين أو تطوير جديدة وربطها بمجال تحسين واحد على الأقل مع التحقق من العزل الزمني والمؤسسي.
     *
     * POST /api/v1/improvement-plans
     * الصلاحية: plans.manage
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('plans.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بإنشاء خطط التحسين.');
        }

        $validator = Validator::make($request->all(), [
            'cycleId'   => ['required', 'integer', 'exists:evaluation_cycles,cycle_id'],
            'title'     => ['required', 'string', 'max:200'],
            'startDate' => ['required', 'date'],
            'endDate'   => ['required', 'date', 'after_or_equal:startDate'],
            'planType'  => ['nullable', 'string', 'in:QualityImprovement,StaffProfessionalDevelopment,AnnualOperational'],
            'plan_type' => ['nullable', 'string', 'in:QualityImprovement,StaffProfessionalDevelopment,AnnualOperational'],
            'areaIds'   => ['required', 'array', 'min:1'],
            'areaIds.*' => ['required', 'integer'],
        ], [
            'cycleId.required'        => 'دورة التقييم إلزامية لربط خطة التحسين.',
            'cycleId.exists'          => 'دورة التقييم المحددة غير موجودة.',
            'title.required'          => 'عنوان خطة التحسين إلزامي.',
            'title.max'               => 'لا يمكن أن يتجاوز عنوان الخطة 200 حرف.',
            'startDate.required'      => 'تاريخ بداية الخطة إلزامي.',
            'endDate.required'        => 'تاريخ نهاية الخطة إلزامي.',
            'endDate.after_or_equal'  => 'تاريخ نهاية الخطة يجب أن يكون مساوياً أو لاحقاً لتاريخ البداية.',
            'planType.in'             => 'نوع الخطة غير صالح.',
            'plan_type.in'            => 'نوع الخطة غير صالح.',
            'areaIds.required'        => 'يجب ربط مجال تحسين واحد على الأقل بالخطة.',
            'areaIds.min'             => 'يجب ربط مجال تحسين واحد على الأقل بالخطة.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        // التحقق من أن جميع مجالات التحسين تابعة لمدرسة المستخدم ونفس دورة التقييم (العزل المؤسسي 404 والعزل الزمني 422)
        $areaIds = array_unique($request->areaIds);
        $areas = ImprovementArea::with('result.evaluation')
            ->whereIn('area_id', $areaIds)
            ->get();

        if ($areas->count() !== count($areaIds)) {
            return ApiResponse::notFound('أحد مجالات التحسين المطلوبة غير موجود.');
        }

        $targetSchoolId = $user->user_type === 'school' ? $user->school_id : null;
        $targetCycleId = (int) $request->cycleId;

        foreach ($areas as $area) {
            $eval = $area->result?->evaluation;
            if (!$eval) {
                return ApiResponse::notFound('مجال التحسين غير مرتبط بتقييم صحيح.');
            }
            if ($targetSchoolId !== null && (int) $eval->school_id !== (int) $targetSchoolId) {
                return ApiResponse::notFound('أحد مجالات التحسين المطلوبة غير موجود.');
            }
            if ((int) $eval->cycle_id !== $targetCycleId) {
                return ApiResponse::validationError([
                    'areaIds' => ['مجال التحسين لا ينتمي لنفس دورة التقييم المحددة للخطة (العزل الزمني والمؤسسي).'],
                ]);
            }
        }

        $planType = $request->input('planType') ?? $request->input('plan_type', ImprovementPlan::TYPE_QUALITY_IMPROVEMENT);

        $plan = DB::transaction(function () use ($request, $user, $areaIds, $planType) {
            $created = ImprovementPlan::create([
                'cycle_id'             => $request->cycleId,
                'school_id'            => $user->school_id,
                'created_by_user_id'   => $user->user_id,
                'title'                => $request->title,
                'plan_type'            => $planType,
                'start_date'           => $request->startDate,
                'end_date'             => $request->endDate,
                'status'               => 'Draft',
                'progress_description' => ProgressLevel::NotStarted->value,
            ]);

            foreach ($areaIds as $areaId) {
                PlanImprovementArea::create([
                    'plan_id'    => $created->plan_id,
                    'area_id'    => $areaId,
                    'created_at' => now(),
                ]);
            }

            return $created;
        });

        $plan->load(['cycle', 'school', 'creator', 'areas.indicator', 'actions.area', 'actions.evidences', 'reviewNotes.author']);

        return ApiResponse::success(
            data: $this->formatPlanDetails($plan),
            message: 'تم إنشاء خطة التحسين وربط مجالاتها بنجاح.',
            status: 201
        );
    }

    /**
     * استعراض تفاصيل خطة التحسين ومجالاتها وإجراءاتها وملاحظات المراجعة ونظرة التقدم (FR-SCH-25).
     *
     * GET /api/v1/improvement-plans/{id}
     * الصلاحية: plans.view أو plans.manage
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('plans.view') && !$user->hasPermission('plans.manage')) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض خطة التحسين.');
        }

        $plan = ImprovementPlan::with([
            'cycle',
            'school',
            'creator',
            'areas.indicator',
            'actions.area',
            'actions.evidences',
            'reviewNotes.author',
        ])->find($id);

        if (!$plan) {
            return ApiResponse::notFound('خطة التحسين المطلوبة غير موجودة.');
        }

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $plan->school_id) {
            return ApiResponse::notFound('خطة التحسين المطلوبة غير موجودة.');
        }

        return ApiResponse::success(
            data: $this->formatPlanDetails($plan),
            message: null
        );
    }

    /**
     * تحديث بيانات خطة التحسين وحالتها (Draft -> Active -> Completed / Cancelled).
     *
     * PATCH /api/v1/improvement-plans/{id}
     * الصلاحية: plans.manage
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('plans.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بتعديل خطط التحسين.');
        }

        $plan = ImprovementPlan::with(['areas', 'actions'])->find($id);
        if (!$plan) {
            return ApiResponse::notFound('خطة التحسين المطلوبة غير موجودة.');
        }

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $plan->school_id) {
            return ApiResponse::notFound('خطة التحسين المطلوبة غير موجودة.');
        }

        $validator = Validator::make($request->all(), [
            'title'     => ['sometimes', 'required', 'string', 'max:200'],
            'startDate' => ['sometimes', 'required', 'date'],
            'endDate'   => ['sometimes', 'required', 'date'],
            'planType'  => ['sometimes', 'required', 'string', 'in:QualityImprovement,StaffProfessionalDevelopment,AnnualOperational'],
            'plan_type' => ['sometimes', 'required', 'string', 'in:QualityImprovement,StaffProfessionalDevelopment,AnnualOperational'],
            'status'    => ['sometimes', 'required', 'string', 'in:Draft,Active,Completed,Cancelled'],
            'areaIds'   => ['sometimes', 'required', 'array', 'min:1'],
            'areaIds.*' => ['required', 'integer'],
        ], [
            'title.required' => 'عنوان خطة التحسين إلزامي.',
            'title.max'      => 'لا يمكن أن يتجاوز عنوان الخطة 200 حرف.',
            'planType.in'    => 'نوع الخطة غير صالح.',
            'plan_type.in'   => 'نوع الخطة غير صالح.',
            'status.in'      => 'حالة الخطة غير صالحة. الحالات المسموحة: Draft, Active, Completed, Cancelled.',
            'areaIds.min'    => 'يجب أن تحتوي الخطة على مجال تحسين واحد على الأقل.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        // التحقق من صحة التواريخ
        $startDate = $request->has('startDate') ? Carbon::parse($request->startDate) : Carbon::parse($plan->start_date);
        $endDate   = $request->has('endDate') ? Carbon::parse($request->endDate) : Carbon::parse($plan->end_date);

        if ($endDate->lt($startDate)) {
            return ApiResponse::validationError([
                'endDate' => ['تاريخ نهاية الخطة يجب أن يكون مساوياً أو لاحقاً لتاريخ البداية.'],
            ]);
        }

        // التحقق من قواعد دورة حياة الخطة
        if ($request->has('status')) {
            $newStatus = $request->status;

            // 1. التفعيل (Active): يتطلب مجالاً واحداً وإجراءً واحداً على الأقل
            if ($newStatus === 'Active') {
                $areasCount = $plan->areas()->count();
                $actionsCount = $plan->actions()->count();

                if ($areasCount < 1 || $actionsCount < 1) {
                    return ApiResponse::validationError([
                        'status' => ['لا يمكن تفعيل الخطة دون إدراج مجال تحسين واحد وإجراء تنفيذي واحد على الأقل.'],
                    ]);
                }
            }

            // 2. الإكمال (Completed): يشترط أن تكون جميع الإجراءات إما منجزة بنسبة 100% أو Cancelled
            if ($newStatus === 'Completed') {
                $incompleteActions = $plan->actions()
                    ->where('status', '!=', 'Cancelled')
                    ->where(function ($query) {
                        $query->where('status', '!=', 'Done')
                              ->orWhere('completion_percentage', '<', 100);
                    })
                    ->count();

                if ($incompleteActions > 0) {
                    return ApiResponse::validationError([
                        'status' => ['لا يمكن إكمال الخطة طالما توجد إجراءات غير ملغاة لم تكتمل بنسبة 100% (أو غير منجزة).'],
                    ]);
                }
            }

            $plan->status = $newStatus;
        }

        if ($request->has('title')) {
            $plan->title = $request->title;
        }
        if ($request->has('planType') || $request->has('plan_type')) {
            $plan->plan_type = $request->input('planType') ?? $request->input('plan_type');
        }
        if ($request->has('startDate')) {
            $plan->start_date = $request->startDate;
        }
        if ($request->has('endDate')) {
            $plan->end_date = $request->endDate;
        }

        // تحديث مجالات التحسين إن أُرسلت
        if ($request->has('areaIds')) {
            $areaIds = array_unique($request->areaIds);
            $areas = ImprovementArea::with('result.evaluation')
                ->whereIn('area_id', $areaIds)
                ->get();

            if ($areas->count() !== count($areaIds)) {
                return ApiResponse::notFound('أحد مجالات التحسين المطلوبة غير موجود.');
            }

            $targetSchoolId = $user->user_type === 'school' ? $user->school_id : null;
            $targetCycleId = (int) $plan->cycle_id;

            foreach ($areas as $area) {
                $eval = $area->result?->evaluation;
                if (!$eval) {
                    return ApiResponse::notFound('مجال التحسين غير مرتبط بتقييم صحيح.');
                }
                if ($targetSchoolId !== null && (int) $eval->school_id !== (int) $targetSchoolId) {
                    return ApiResponse::notFound('أحد مجالات التحسين المطلوبة غير موجود.');
                }
                if ((int) $eval->cycle_id !== $targetCycleId) {
                    return ApiResponse::validationError([
                        'areaIds' => ['مجال التحسين لا ينتمي لنفس دورة التقييم المحددة للخطة (العزل الزمني والمؤسسي).'],
                    ]);
                }
            }

            DB::transaction(function () use ($plan, $areaIds) {
                // مزامنة المجالات مع المحافظة على المجالات التي لها إجراءات مرتبطة
                $currentAreaIds = PlanImprovementArea::where('plan_id', $plan->plan_id)
                    ->pluck('area_id')
                    ->toArray();

                $toRemove = array_diff($currentAreaIds, $areaIds);
                if (!empty($toRemove)) {
                    // فحص هل يوجد إجراءات تعتمد على هذه المجالات
                    $hasDependentActions = ImprovementAction::where('plan_id', $plan->plan_id)
                        ->whereIn('area_id', $toRemove)
                        ->exists();

                    if ($hasDependentActions) {
                        throw new \InvalidArgumentException('لا يمكن حذف مجالات تحسين مرتبطة بإجراءات تنفيذية قائمة.');
                    }

                    PlanImprovementArea::where('plan_id', $plan->plan_id)
                        ->whereIn('area_id', $toRemove)
                        ->delete();
                }

                $toAdd = array_diff($areaIds, $currentAreaIds);
                foreach ($toAdd as $areaId) {
                    PlanImprovementArea::create([
                        'plan_id'    => $plan->plan_id,
                        'area_id'    => $areaId,
                        'created_at' => now(),
                    ]);
                }
            });
        }

        // إعادة احتساب مستوى التقدم الإجمالي
        $plan->load('actions');
        $overallProgress = self::calculateOverallProgress($plan->actions);
        $plan->progress_description = $overallProgress['code'];
        $plan->save();

        $plan->load(['cycle', 'school', 'creator', 'areas.indicator', 'actions.area', 'actions.evidences', 'reviewNotes.author']);

        return ApiResponse::success(
            data: $this->formatPlanDetails($plan),
            message: 'تم تحديث خطة التحسين بنجاح.'
        );
    }

    /**
     * إضافة إجراء تنفيذي جديد للخطة مع التحقق من المفتاح الأجنبي المركب (plan_id, area_id) ونسبة الإنجاز (الشريحة 8).
     *
     * POST /api/v1/improvement-plans/{id}/actions
     * الصلاحية: plans.manage
     */
    public function storeAction(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('plans.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بإضافة إجراءات للخطة.');
        }

        $plan = ImprovementPlan::find($id);
        if (!$plan) {
            return ApiResponse::notFound('خطة التحسين المطلوبة غير موجودة.');
        }

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $plan->school_id) {
            return ApiResponse::notFound('خطة التحسين المطلوبة غير موجودة.');
        }

        $validator = Validator::make($request->all(), [
            'areaId'                       => ['required', 'integer'],
            'title'                        => ['required', 'string', 'max:200'],
            'responsiblePersonDescription' => ['required', 'string', 'max:150'],
            'startDate'                    => ['required', 'date'],
            'dueDate'                      => ['required', 'date', 'after_or_equal:startDate'],
            'status'                       => ['nullable', 'string', 'in:Pending,InProgress,Done,Cancelled'],
            'progress'                     => ['nullable', 'string', 'in:' . implode(',', ProgressLevel::values())],
            'completionPercentage'         => ['nullable', 'integer', 'min:0', 'max:100'],
            'completion_percentage'        => ['nullable', 'integer', 'min:0', 'max:100'],
        ], [
            'areaId.required'                       => 'مجال التحسين إلزامي لربط الإجراء التنفيذي.',
            'title.required'                        => 'عنوان الإجراء التنفيذي إلزامي.',
            'title.max'                             => 'لا يمكن أن يتجاوز عنوان الإجراء 200 حرف.',
            'responsiblePersonDescription.required' => 'وصف المسؤول عن التنفيذ إلزامي (FR-SCH-21).',
            'responsiblePersonDescription.max'      => 'لا يمكن أن يتجاوز وصف المسؤول 150 حرف.',
            'startDate.required'                    => 'تاريخ بداية الإجراء إلزامي.',
            'dueDate.required'                      => 'تاريخ الاستحقاق إلزامي.',
            'dueDate.after_or_equal'                => 'تاريخ الاستحقاق يجب أن يكون مساوياً أو لاحقاً لتاريخ البدء.',
            'status.in'                             => 'حالة الإجراء غير صالحة. الحالات المسموحة: Pending, InProgress, Done, Cancelled.',
            'progress.in'                           => 'مستوى التقدم غير صالح.',
            'completionPercentage.min'              => 'نسبة الإنجاز يجب ألا تقل عن 0%.',
            'completionPercentage.max'              => 'نسبة الإنجاز يجب ألا تزيد عن 100%.',
            'completion_percentage.min'             => 'نسبة الإنجاز يجب ألا تقل عن 0%.',
            'completion_percentage.max'             => 'نسبة الإنجاز يجب ألا تزيد عن 100%.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        // التحقق الحاسم من المفتاح الأجنبي المركب (plan_id, area_id)
        $isAreaLinkedToPlan = PlanImprovementArea::where('plan_id', $plan->plan_id)
            ->where('area_id', $request->areaId)
            ->exists();

        if (!$isAreaLinkedToPlan) {
            return ApiResponse::validationError([
                'areaId' => ['مجال التحسين المحدد غير مدرج ضمن مجالات هذه الخطة (قيد المفتاح المركب).'],
            ]);
        }

        $completionPercentage = (int) ($request->input('completionPercentage') ?? $request->input('completion_percentage', 0));
        $status = $request->input('status', 'Pending');
        $progress = $request->input('progress', ProgressLevel::NotStarted->value);

        if ($completionPercentage === 100 || $status === 'Done') {
            $status = 'Done';
            $progress = ProgressLevel::Complete->value;
            $completionPercentage = 100;
        } elseif ($completionPercentage > 0 && $status === 'Pending') {
            $status = 'InProgress';
            if ($progress === ProgressLevel::NotStarted->value) {
                $progress = ProgressLevel::Moderate->value;
            }
        }

        $action = ImprovementAction::create([
            'plan_id'                        => $plan->plan_id,
            'area_id'                        => $request->areaId,
            'title'                          => $request->title,
            'responsible_person_description' => $request->responsiblePersonDescription,
            'start_date'                     => $request->startDate,
            'due_date'                       => $request->dueDate,
            'status'                         => $status,
            'completion_percentage'          => $completionPercentage,
            'progress_description'           => $progress,
        ]);

        // تحديث تقدم الخطة الإجمالي
        $allActions = ImprovementAction::where('plan_id', $plan->plan_id)->get();
        $overallProgress = self::calculateOverallProgress($allActions);
        $plan->progress_description = $overallProgress['code'];
        $plan->save();

        $action->load(['area', 'evidences']);

        return ApiResponse::success(
            data: $this->formatAction($action),
            message: 'تم إضافة الإجراء التنفيذي بنجاح.',
            status: 201
        );
    }

    /**
     * تحديث إجراء تنفيذي في الخطة (الحالة، نسبة الإنجاز 0-100%، مستوى التقدم، التواريخ).
     *
     * PATCH /api/v1/improvement-plans/{id}/actions/{actionId}
     * الصلاحية: plans.manage
     */
    public function updateAction(Request $request, int $id, int $actionId): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('plans.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بتعديل إجراءات الخطة.');
        }

        $plan = ImprovementPlan::find($id);
        if (!$plan) {
            return ApiResponse::notFound('خطة التحسين المطلوبة غير موجودة.');
        }

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $plan->school_id) {
            return ApiResponse::notFound('خطة التحسين المطلوبة غير موجودة.');
        }

        $action = ImprovementAction::where('plan_id', $plan->plan_id)
            ->where('action_id', $actionId)
            ->first();

        if (!$action) {
            return ApiResponse::notFound('الإجراء التنفيذي المطلوب غير موجود ضمن هذه الخطة.');
        }

        $validator = Validator::make($request->all(), [
            'title'                        => ['sometimes', 'required', 'string', 'max:200'],
            'responsiblePersonDescription' => ['sometimes', 'required', 'string', 'max:150'],
            'startDate'                    => ['sometimes', 'required', 'date'],
            'dueDate'                      => ['sometimes', 'required', 'date'],
            'status'                       => ['sometimes', 'required', 'string', 'in:Pending,InProgress,Done,Cancelled'],
            'progress'                     => ['sometimes', 'required', 'string', 'in:' . implode(',', ProgressLevel::values())],
            'completionPercentage'         => ['sometimes', 'required', 'integer', 'min:0', 'max:100'],
            'completion_percentage'        => ['sometimes', 'required', 'integer', 'min:0', 'max:100'],
        ], [
            'title.required'                        => 'عنوان الإجراء التنفيذي إلزامي.',
            'responsiblePersonDescription.required' => 'وصف المسؤول عن التنفيذ إلزامي.',
            'status.in'                             => 'حالة الإجراء غير صالحة. الحالات المسموحة: Pending, InProgress, Done, Cancelled.',
            'progress.in'                           => 'مستوى التقدم غير صالح.',
            'completionPercentage.min'              => 'نسبة الإنجاز يجب ألا تقل عن 0%.',
            'completionPercentage.max'              => 'نسبة الإنجاز يجب ألا تزيد عن 100%.',
            'completion_percentage.min'             => 'نسبة الإنجاز يجب ألا تقل عن 0%.',
            'completion_percentage.max'             => 'نسبة الإنجاز يجب ألا تزيد عن 100%.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $startDate = $request->has('startDate') ? Carbon::parse($request->startDate) : Carbon::parse($action->start_date);
        $dueDate   = $request->has('dueDate') ? Carbon::parse($request->dueDate) : Carbon::parse($action->due_date);

        if ($dueDate->lt($startDate)) {
            return ApiResponse::validationError([
                'dueDate' => ['تاريخ الاستحقاق يجب أن يكون مساوياً أو لاحقاً لتاريخ البدء.'],
            ]);
        }

        if ($request->has('title')) {
            $action->title = $request->title;
        }
        if ($request->has('responsiblePersonDescription')) {
            $action->responsible_person_description = $request->responsiblePersonDescription;
        }
        if ($request->has('startDate')) {
            $action->start_date = $request->startDate;
        }
        if ($request->has('dueDate')) {
            $action->due_date = $request->dueDate;
        }

        // تحديث نسبة الإنجاز والتحول التلقائي للحالة (100% -> Done)
        $hasPercentage = $request->has('completionPercentage') || $request->has('completion_percentage');
        if ($hasPercentage) {
            $percentage = (int) ($request->input('completionPercentage') ?? $request->input('completion_percentage'));
            $action->completion_percentage = $percentage;

            if ($percentage === 100) {
                $action->status = 'Done';
                $action->progress_description = ProgressLevel::Complete->value;
            } elseif ($percentage < 100 && $action->status === 'Done') {
                $action->status = $request->input('status', 'InProgress');
                if ($action->progress_description === ProgressLevel::Complete->value) {
                    $action->progress_description = ProgressLevel::Moderate->value;
                }
            } elseif ($percentage > 0 && $action->status === 'Pending') {
                $action->status = 'InProgress';
            }
        }

        if ($request->has('status')) {
            $action->status = $request->status;
            if ($action->status === 'Done') {
                $action->completion_percentage = 100;
                $action->progress_description = ProgressLevel::Complete->value;
            }
        }
        if ($request->has('progress')) {
            $action->progress_description = $request->progress;
        }

        $action->save();

        // تحديث تقدم الخطة الإجمالي
        $allActions = ImprovementAction::where('plan_id', $plan->plan_id)->get();
        $overallProgress = self::calculateOverallProgress($allActions);
        $plan->progress_description = $overallProgress['code'];
        $plan->save();

        $action->load(['area', 'evidences']);

        return ApiResponse::success(
            data: $this->formatAction($action),
            message: 'تم تحديث الإجراء التنفيذي بنجاح.'
        );
    }

    /**
     * حذف إجراء تنفيذي من الخطة (مسموح فقط في مسودة الخطة Draft - الشريحة 8).
     *
     * DELETE /api/v1/improvement-plans/{id}/actions/{actionId}
     * الصلاحية: plans.manage
     */
    public function deleteAction(Request $request, int $id, int $actionId): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('plans.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بحذف إجراءات الخطة.');
        }

        $plan = ImprovementPlan::find($id);
        if (!$plan) {
            return ApiResponse::notFound('خطة التحسين المطلوبة غير موجودة.');
        }

        // عزل المدارس
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $plan->school_id) {
            return ApiResponse::notFound('خطة التحسين المطلوبة غير موجودة.');
        }

        // قيد الحذف: مسموح فقط أثناء حالة المسودة Draft
        if ($plan->status !== 'Draft') {
            return ApiResponse::validationError([
                'status' => ['لا يمكن حذف إجراء في خطة نشطة أو مكتملة؛ البديل المعتمد هو إلغاء الإجراء بتغيير حالته إلى Cancelled.'],
            ]);
        }

        $action = ImprovementAction::where('plan_id', $plan->plan_id)
            ->where('action_id', $actionId)
            ->first();

        if (!$action) {
            return ApiResponse::notFound('الإجراء التنفيذي المطلوب غير موجود ضمن هذه الخطة.');
        }

        // فك ربط أي شواهد مرتبطة بهذا الإجراء
        Evidence::where('action_id', $action->action_id)->update(['action_id' => null]);

        $action->delete();

        // إعادة احتساب تقدم الخطة الإجمالي
        $allActions = ImprovementAction::where('plan_id', $plan->plan_id)->get();
        $overallProgress = self::calculateOverallProgress($allActions);
        $plan->progress_description = $overallProgress['code'];
        $plan->save();

        return ApiResponse::success(
            data: null,
            message: 'تم حذف الإجراء التنفيذي بنجاح من مسودة الخطة.'
        );
    }

    /**
     * ربط شاهد/دليل إثبات بإجراء تنفيذي لتوثيق الإنجاز ميدانياً (الشريحة 8).
     *
     * POST /api/v1/improvement-plans/{id}/actions/{actionId}/evidences
     * الصلاحية: plans.manage
     */
    public function attachActionEvidence(Request $request, int $id, int $actionId): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('plans.manage')) {
            return ApiResponse::forbidden('غير مصرح لك بربط شواهد التنفيذ بالإجراء.');
        }

        $plan = ImprovementPlan::find($id);
        if (!$plan) {
            return ApiResponse::notFound('خطة التحسين المطلوبة غير موجودة.');
        }

        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $plan->school_id) {
            return ApiResponse::notFound('خطة التحسين المطلوبة غير موجودة.');
        }

        $action = ImprovementAction::where('plan_id', $plan->plan_id)
            ->where('action_id', $actionId)
            ->first();

        if (!$action) {
            return ApiResponse::notFound('الإجراء التنفيذي المطلوب غير موجود ضمن هذه الخطة.');
        }

        $validator = Validator::make($request->all(), [
            'evidenceId'  => ['required_without:evidence_id', 'integer'],
            'evidence_id' => ['required_without:evidenceId', 'integer'],
        ], [
            'evidenceId.required_without'  => 'معرف الشاهد التنفيذي إلزامي.',
            'evidence_id.required_without' => 'معرف الشاهد التنفيذي إلزامي.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $evidenceId = (int) ($request->input('evidenceId') ?? $request->input('evidence_id'));
        $evidence = Evidence::with('result.evaluation')->find($evidenceId);

        if (!$evidence) {
            return ApiResponse::notFound('الشاهد المطلوب غير موجود.');
        }

        // عزل المدارس: التأكد من تبعية الشاهد للمدرسة
        if ($user->user_type === 'school') {
            $evSchoolId = $evidence->result?->evaluation?->school_id;
            if ($evSchoolId && (int) $evSchoolId !== (int) $user->school_id) {
                return ApiResponse::notFound('الشاهد المطلوب غير موجود.');
            }
        }

        $evidence->action_id = $action->action_id;
        $evidence->save();

        return ApiResponse::success(
            data: [
                'evidenceId' => (int) $evidence->evidence_id,
                'actionId'   => (int) $evidence->action_id,
                'title'      => $evidence->title,
                'status'     => $evidence->status,
            ],
            message: 'تم ربط شاهد التنفيذ بالإجراء بنجاح.'
        );
    }

    /**
     * تدوين ملاحظة مراجعة داخلية (مدير المدرسة) أو مراجعة خارجية (مشرف وزاري) (الشريحة 8).
     *
     * POST /api/v1/improvement-plans/{id}/review-notes
     * الصلاحية: reviews.write أو supervision.review
     */
    public function storeReviewNote(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('reviews.write') && !$user->hasPermission('supervision.review')) {
            return ApiResponse::forbidden('غير مصرح لك بتدوين ملاحظات المراجعة على الخطة.');
        }

        $plan = ImprovementPlan::find($id);
        if (!$plan) {
            return ApiResponse::notFound('خطة التحسين المطلوبة غير موجودة.');
        }

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $plan->school_id) {
            return ApiResponse::notFound('خطة التحسين المطلوبة غير موجودة.');
        }

        $validator = Validator::make($request->all(), [
            'text'          => ['required', 'string', 'max:2000'],
            'reviewerRole'  => ['nullable', 'string', 'in:school_principal,ministry_supervisor'],
            'reviewer_role' => ['nullable', 'string', 'in:school_principal,ministry_supervisor'],
        ], [
            'text.required' => 'نص ملاحظة المراجعة إلزامي.',
            'text.max'      => 'لا يمكن أن تتجاوز الملاحظة 2000 حرف.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $reviewerRole = $request->input('reviewerRole') ?? $request->input('reviewer_role');
        if (!$reviewerRole) {
            if ($user->hasRole('ministry_supervisor') || $user->hasPermission('supervision.review')) {
                $reviewerRole = 'ministry_supervisor';
            } else {
                $reviewerRole = 'school_principal';
            }
        }

        $note = PlanReviewNote::create([
            'plan_id'        => $plan->plan_id,
            'author_user_id' => $user->user_id,
            'reviewer_role'  => $reviewerRole,
            'text'           => $request->text,
        ]);

        $note->load('author');

        return ApiResponse::success(
            data: [
                'noteId'       => (int) $note->note_id,
                'planId'       => (int) $note->plan_id,
                'authorId'     => (int) $note->author_user_id,
                'authorName'   => $note->author?->full_name ?? '',
                'reviewerRole' => $note->reviewer_role,
                'text'         => $note->text,
                'createdAt'    => $note->created_at?->toIso8601String(),
            ],
            message: 'تم تدوين ملاحظة المراجعة بنجاح.',
            status: 201
        );
    }

    /**
     * احتساب التقدم الإجمالي للخطة بناءً على الأوزان المعيارية للإجراءات غير الملغاة.
     *
     * @return array{code: string, label: string}
     */
    public static function calculateOverallProgress(Collection $actions): array
    {
        $activeActions = $actions->where('status', '!=', 'Cancelled');
        if ($activeActions->isEmpty()) {
            return [
                'code'  => ProgressLevel::NotStarted->value,
                'label' => ProgressLevel::NotStarted->label(),
            ];
        }

        $weightMap = [
            ProgressLevel::NotStarted->value  => 0,
            ProgressLevel::Limited->value     => 1,
            ProgressLevel::Moderate->value    => 2,
            ProgressLevel::Significant->value => 3,
            ProgressLevel::Complete->value    => 4,
        ];

        $totalScore = 0;
        foreach ($activeActions as $act) {
            $score = $weightMap[$act->progress_description] ?? 0;
            if ($act->status === 'Done') {
                $score = 4;
            }
            $totalScore += $score;
        }

        $maxPossible = $activeActions->count() * 4;
        $ratio = $maxPossible > 0 ? ($totalScore / $maxPossible) : 0;

        if ($ratio == 0) {
            $level = ProgressLevel::NotStarted;
        } elseif ($ratio < 0.35) {
            $level = ProgressLevel::Limited;
        } elseif ($ratio < 0.70) {
            $level = ProgressLevel::Moderate;
        } elseif ($ratio < 1.0) {
            $level = ProgressLevel::Significant;
        } else {
            $level = ProgressLevel::Complete;
        }

        return [
            'code'  => $level->value,
            'label' => $level->label(),
        ];
    }

    /**
     * تنسيق ملخص الخطة لقائمة الخطط (مع نسبة الإنجاز الرقمية ونوع الخطة).
     */
    private function formatPlanSummary(ImprovementPlan $plan): array
    {
        $statusLabels = [
            'Draft'     => 'مسودة',
            'Active'    => 'نشطة',
            'Completed' => 'مكتملة',
            'Cancelled' => 'ملغاة',
        ];

        $actions = $plan->actions ?? collect();
        $overallProgress = self::calculateOverallProgress($actions);

        $delayedCount = $actions->filter(function ($act) {
            return Carbon::parse($act->due_date)->lt(Carbon::today())
                && !in_array($act->status, ['Done', 'Cancelled']);
        })->count();

        return [
            'planId'                    => (int) $plan->plan_id,
            'cycleId'                   => (int) $plan->cycle_id,
            'cycleName'                 => $plan->cycle?->academic_year ?? '',
            'academicYear'              => $plan->cycle?->academic_year ?? '',
            'schoolId'                  => (int) $plan->school_id,
            'schoolName'                => $plan->school?->school_name ?? '',
            'title'                     => $plan->title,
            'planType'                  => $plan->plan_type ?? ImprovementPlan::TYPE_QUALITY_IMPROVEMENT,
            'planTypeLabel'             => $plan->plan_type_label,
            'startDate'                 => $plan->start_date ? Carbon::parse($plan->start_date)->toDateString() : null,
            'endDate'                   => $plan->end_date ? Carbon::parse($plan->end_date)->toDateString() : null,
            'status'                    => $plan->status,
            'statusLabel'               => $statusLabels[$plan->status] ?? $plan->status,
            'overallProgress'           => $overallProgress['code'],
            'overallProgressLabel'      => $overallProgress['label'],
            'overallProgressPercentage' => $plan->overall_progress_percentage,
            'areasCount'                => $plan->areas->count(),
            'totalActions'              => $actions->count(),
            'delayedActions'            => $delayedCount,
            'reviewNotesCount'          => $plan->reviewNotes->count(),
            'createdAt'                 => $plan->created_at?->toIso8601String(),
        ];
    }

    /**
     * تنسيق التفاصيل الكاملة للخطة مع الإجراءات والشواهد والمراجعات المصنفة (FR-SCH-25).
     */
    private function formatPlanDetails(ImprovementPlan $plan): array
    {
        $statusLabels = [
            'Draft'     => 'مسودة',
            'Active'    => 'نشطة',
            'Completed' => 'مكتملة',
            'Cancelled' => 'ملغاة',
        ];

        $actions = $plan->actions ?? collect();
        $overallProgress = self::calculateOverallProgress($actions);

        $pendingCount    = $actions->where('status', 'Pending')->count();
        $inProgressCount = $actions->where('status', 'InProgress')->count();
        $doneCount       = $actions->where('status', 'Done')->count();
        $cancelledCount  = $actions->where('status', 'Cancelled')->count();

        $delayedCount = $actions->filter(function ($act) {
            return Carbon::parse($act->due_date)->lt(Carbon::today())
                && !in_array($act->status, ['Done', 'Cancelled']);
        })->count();

        $formattedAreas = $plan->areas->map(function ($area) {
            $priorityLabels = [
                'High'   => 'عالية',
                'Medium' => 'متوسطة',
                'Low'    => 'منخفضة',
            ];

            return [
                'areaId'        => (int) $area->area_id,
                'resultId'      => (int) $area->result_id,
                'indicatorId'   => (int) $area->indicator_id,
                'indicatorCode' => $area->indicator?->indicator_number ?? '',
                'indicatorName' => $area->indicator?->name ?? '',
                'name'          => $area->name,
                'description'   => $area->description,
                'priority'      => $area->priority,
                'priorityLabel' => $priorityLabels[$area->priority] ?? $area->priority,
            ];
        })->values();

        $formattedActions = $actions->map(function ($action) {
            return $this->formatAction($action);
        })->values();

        $formattedNotes = $plan->reviewNotes->map(function ($note) {
            return [
                'noteId'       => (int) $note->note_id,
                'authorId'     => (int) $note->author_user_id,
                'authorName'   => $note->author?->full_name ?? '',
                'reviewerRole' => $note->reviewer_role,
                'text'         => $note->text,
                'createdAt'    => $note->created_at?->toIso8601String(),
            ];
        })->values();

        $internalNotes = $formattedNotes->where('reviewerRole', 'school_principal')->values();
        $externalNotes = $formattedNotes->where('reviewerRole', 'ministry_supervisor')->values();

        return [
            'planId'                    => (int) $plan->plan_id,
            'cycleId'                   => (int) $plan->cycle_id,
            'cycleName'                 => $plan->cycle?->academic_year ?? '',
            'academicYear'              => $plan->cycle?->academic_year ?? '',
            'schoolId'                  => (int) $plan->school_id,
            'schoolName'                => $plan->school?->school_name ?? '',
            'createdById'               => (int) $plan->created_by_user_id,
            'creatorName'               => $plan->creator?->full_name ?? '',
            'title'                     => $plan->title,
            'planType'                  => $plan->plan_type ?? ImprovementPlan::TYPE_QUALITY_IMPROVEMENT,
            'planTypeLabel'             => $plan->plan_type_label,
            'startDate'                 => $plan->start_date ? Carbon::parse($plan->start_date)->toDateString() : null,
            'endDate'                   => $plan->end_date ? Carbon::parse($plan->end_date)->toDateString() : null,
            'status'                    => $plan->status,
            'statusLabel'               => $statusLabels[$plan->status] ?? $plan->status,
            'overallProgress'           => $overallProgress['code'],
            'overallProgressLabel'      => $overallProgress['label'],
            'overallProgressPercentage' => $plan->overall_progress_percentage,
            'areas'                     => $formattedAreas,
            'actions'                   => $formattedActions,
            'reviewNotes'               => $formattedNotes,
            'internalNotes'             => $internalNotes,
            'externalNotes'             => $externalNotes,
            'overview'                  => [
                'totalAreas'                => $formattedAreas->count(),
                'totalActions'              => $actions->count(),
                'pendingActions'            => $pendingCount,
                'inProgressActions'         => $inProgressCount,
                'doneActions'               => $doneCount,
                'cancelledActions'          => $cancelledCount,
                'delayedActions'            => $delayedCount,
                'overallProgress'           => $overallProgress['code'],
                'overallProgressLabel'      => $overallProgress['label'],
                'overallProgressPercentage' => $plan->overall_progress_percentage,
            ],
            'createdAt'                 => $plan->created_at?->toIso8601String(),
            'updatedAt'                 => $plan->updated_at?->toIso8601String(),
        ];
    }

    /**
     * تنسيق بيانات إجراء التحسين التنفيذي مع نسبة الإنجاز والشواهد المرتبطة.
     */
    private function formatAction(ImprovementAction $action): array
    {
        $statusLabels = [
            'Pending'    => 'قيد الانتظار',
            'InProgress' => 'جاري التنفيذ',
            'Done'       => 'منجز',
            'Cancelled'  => 'ملغي',
        ];

        $isDelayed = Carbon::parse($action->due_date)->lt(Carbon::today())
            && !in_array($action->status, ['Done', 'Cancelled']);

        $progressLevel = ProgressLevel::tryFrom($action->progress_description) ?? ProgressLevel::NotStarted;

        $evidences = $action->relationLoaded('evidences') ? $action->evidences->map(function ($ev) {
            return [
                'evidenceId' => (int) $ev->evidence_id,
                'title'      => $ev->title,
                'status'     => $ev->status,
            ];
        })->values() : [];

        return [
            'actionId'                     => (int) $action->action_id,
            'planId'                       => (int) $action->plan_id,
            'areaId'                       => (int) $action->area_id,
            'areaName'                     => $action->area?->name ?? '',
            'title'                        => $action->title,
            'responsiblePersonDescription' => $action->responsible_person_description,
            'startDate'                    => $action->start_date ? Carbon::parse($action->start_date)->toDateString() : null,
            'dueDate'                      => $action->due_date ? Carbon::parse($action->due_date)->toDateString() : null,
            'status'                       => $action->status,
            'statusLabel'                  => $statusLabels[$action->status] ?? $action->status,
            'completionPercentage'         => (int) ($action->completion_percentage ?? 0),
            'progress'                     => $progressLevel->value,
            'progressLabel'                => $progressLevel->label(),
            'isDelayed'                    => $isDelayed,
            'evidences'                    => $evidences,
            'createdAt'                    => $action->created_at?->toIso8601String(),
            'updatedAt'                    => $action->updated_at?->toIso8601String(),
        ];
    }
}
