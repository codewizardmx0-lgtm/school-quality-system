<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ProgressLevel;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\EvaluationCycle;
use App\Models\ImprovementAction;
use App\Models\ImprovementArea;
use App\Models\ImprovementPlan;
use App\Models\PlanImprovementArea;
use App\Models\PlanReviewNote;
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
     * استعراض قائمة خطط التحسين الخاصة بالمدرسة مع الإحصائيات العامة.
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

        $plans = $query->get()->map(function ($plan) {
            return $this->formatPlanSummary($plan);
        });

        return ApiResponse::success(
            data: $plans,
            message: null
        );
    }

    /**
     * إنشاء خطة تحسين جديدة وربطها بمجال تحسين واحد على الأقل.
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
            'areaIds.required'        => 'يجب ربط مجال تحسين واحد على الأقل بالخطة.',
            'areaIds.min'             => 'يجب ربط مجال تحسين واحد على الأقل بالخطة.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        // التحقق من أن جميع مجالات التحسين تابعة لمدرسة المستخدم (العزل المؤسسي 404)
        $areaIds = array_unique($request->areaIds);
        $areas = ImprovementArea::with('result.evaluation')
            ->whereIn('area_id', $areaIds)
            ->get();

        if ($areas->count() !== count($areaIds)) {
            return ApiResponse::notFound('أحد مجالات التحسين المطلوبة غير موجود.');
        }

        if ($user->user_type === 'school') {
            foreach ($areas as $area) {
                if ($area->result && (int) $area->result->evaluation->school_id !== (int) $user->school_id) {
                    return ApiResponse::notFound('أحد مجالات التحسين المطلوبة غير موجود.');
                }
            }
        }

        $plan = DB::transaction(function () use ($request, $user, $areaIds) {
            $created = ImprovementPlan::create([
                'cycle_id'             => $request->cycleId,
                'school_id'            => $user->school_id,
                'created_by_user_id'   => $user->user_id,
                'title'                => $request->title,
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

        $plan->load(['cycle', 'school', 'creator', 'areas.indicator', 'actions.area', 'reviewNotes.author']);

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
            'status'    => ['sometimes', 'required', 'string', 'in:Draft,Active,Completed,Cancelled'],
            'areaIds'   => ['sometimes', 'required', 'array', 'min:1'],
            'areaIds.*' => ['required', 'integer'],
        ], [
            'title.required'     => 'عنوان خطة التحسين إلزامي.',
            'title.max'          => 'لا يمكن أن يتجاوز عنوان الخطة 200 حرف.',
            'status.in'          => 'حالة الخطة غير صالحة. الحالات المسموحة: Draft, Active, Completed, Cancelled.',
            'areaIds.min'        => 'يجب أن تحتوي الخطة على مجال تحسين واحد على الأقل.',
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

            // 2. الإكمال (Completed): يشترط أن تكون جميع الإجراءات إما Done أو Cancelled
            if ($newStatus === 'Completed') {
                $pendingOrInProgress = $plan->actions()
                    ->whereNotIn('status', ['Done', 'Cancelled'])
                    ->count();

                if ($pendingOrInProgress > 0) {
                    return ApiResponse::validationError([
                        'status' => ['لا يمكن إكمال الخطة طالما توجد إجراءات معلقة أو قيد التنفيذ.'],
                    ]);
                }
            }

            $plan->status = $newStatus;
        }

        if ($request->has('title')) {
            $plan->title = $request->title;
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

            if ($user->user_type === 'school') {
                foreach ($areas as $area) {
                    if ($area->result && (int) $area->result->evaluation->school_id !== (int) $user->school_id) {
                        return ApiResponse::notFound('أحد مجالات التحسين المطلوبة غير موجود.');
                    }
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

        $plan->load(['cycle', 'school', 'creator', 'areas.indicator', 'actions.area', 'reviewNotes.author']);

        return ApiResponse::success(
            data: $this->formatPlanDetails($plan),
            message: 'تم تحديث خطة التحسين بنجاح.'
        );
    }

    /**
     * إضافة إجراء تنفيذي جديد للخطة مع التحقق من المفتاح الأجنبي المركب (plan_id, area_id).
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

        $status = $request->input('status', 'Pending');
        $progress = $request->input('progress', ProgressLevel::NotStarted->value);

        if ($status === 'Done') {
            $progress = ProgressLevel::Complete->value;
        }

        $action = ImprovementAction::create([
            'plan_id'                        => $plan->plan_id,
            'area_id'                        => $request->areaId,
            'title'                          => $request->title,
            'responsible_person_description' => $request->responsiblePersonDescription,
            'start_date'                     => $request->startDate,
            'due_date'                       => $request->dueDate,
            'status'                         => $status,
            'progress_description'           => $progress,
        ]);

        // تحديث تقدم الخطة الإجمالي
        $allActions = ImprovementAction::where('plan_id', $plan->plan_id)->get();
        $overallProgress = self::calculateOverallProgress($allActions);
        $plan->progress_description = $overallProgress['code'];
        $plan->save();

        $action->load('area');

        return ApiResponse::success(
            data: $this->formatAction($action),
            message: 'تم إضافة الإجراء التنفيذي بنجاح.',
            status: 201
        );
    }

    /**
     * تحديث إجراء تنفيذي في الخطة (الحالة، مستوى التقدم، التواريخ).
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
        ], [
            'title.required'                        => 'عنوان الإجراء التنفيذي إلزامي.',
            'responsiblePersonDescription.required' => 'وصف المسؤول عن التنفيذ إلزامي.',
            'status.in'                             => 'حالة الإجراء غير صالحة. الحالات المسموحة: Pending, InProgress, Done, Cancelled.',
            'progress.in'                           => 'مستوى التقدم غير صالح.',
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
        if ($request->has('status')) {
            $action->status = $request->status;
            if ($action->status === 'Done' && !$request->has('progress')) {
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

        $action->load('area');

        return ApiResponse::success(
            data: $this->formatAction($action),
            message: 'تم تحديث الإجراء التنفيذي بنجاح.'
        );
    }

    /**
     * تدوين ملاحظة مراجعة من قِبل مدير المدرسة (reviews.write).
     *
     * POST /api/v1/improvement-plans/{id}/review-notes
     * الصلاحية: reviews.write
     */
    public function storeReviewNote(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('reviews.write')) {
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
            'text' => ['required', 'string', 'max:2000'],
        ], [
            'text.required' => 'نص ملاحظة المراجعة إلزامي.',
            'text.max'      => 'لا يمكن أن تتجاوز الملاحظة 2000 حرف.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $note = PlanReviewNote::create([
            'plan_id'        => $plan->plan_id,
            'author_user_id' => $user->user_id,
            'text'           => $request->text,
        ]);

        $note->load('author');

        return ApiResponse::success(
            data: [
                'noteId'     => (int) $note->note_id,
                'planId'     => (int) $note->plan_id,
                'authorId'   => (int) $note->author_user_id,
                'authorName' => $note->author?->full_name ?? '',
                'text'       => $note->text,
                'createdAt'  => $note->created_at?->toIso8601String(),
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
     * تنسيق ملخص الخطة لقائمة الخطط.
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
            'planId'               => (int) $plan->plan_id,
            'cycleId'              => (int) $plan->cycle_id,
            'cycleName'            => $plan->cycle?->name ?? '',
            'schoolId'             => (int) $plan->school_id,
            'schoolName'           => $plan->school?->name ?? '',
            'title'                => $plan->title,
            'startDate'            => $plan->start_date ? Carbon::parse($plan->start_date)->toDateString() : null,
            'endDate'              => $plan->end_date ? Carbon::parse($plan->end_date)->toDateString() : null,
            'status'               => $plan->status,
            'statusLabel'          => $statusLabels[$plan->status] ?? $plan->status,
            'overallProgress'      => $overallProgress['code'],
            'overallProgressLabel' => $overallProgress['label'],
            'areasCount'           => $plan->areas->count(),
            'totalActions'         => $actions->count(),
            'delayedActions'       => $delayedCount,
            'reviewNotesCount'     => $plan->reviewNotes->count(),
            'createdAt'            => $plan->created_at?->toIso8601String(),
        ];
    }

    /**
     * تنسيق التفاصيل الكاملة للخطة ونظرة التقدم (FR-SCH-25).
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
                'noteId'     => (int) $note->note_id,
                'authorId'   => (int) $note->author_user_id,
                'authorName' => $note->author?->full_name ?? '',
                'text'       => $note->text,
                'createdAt'  => $note->created_at?->toIso8601String(),
            ];
        })->values();

        return [
            'planId'               => (int) $plan->plan_id,
            'cycleId'              => (int) $plan->cycle_id,
            'cycleName'            => $plan->cycle?->name ?? '',
            'schoolId'             => (int) $plan->school_id,
            'schoolName'           => $plan->school?->name ?? '',
            'createdById'          => (int) $plan->created_by_user_id,
            'creatorName'          => $plan->creator?->full_name ?? '',
            'title'                => $plan->title,
            'startDate'            => $plan->start_date ? Carbon::parse($plan->start_date)->toDateString() : null,
            'endDate'              => $plan->end_date ? Carbon::parse($plan->end_date)->toDateString() : null,
            'status'               => $plan->status,
            'statusLabel'          => $statusLabels[$plan->status] ?? $plan->status,
            'overallProgress'      => $overallProgress['code'],
            'overallProgressLabel' => $overallProgress['label'],
            'areas'                => $formattedAreas,
            'actions'              => $formattedActions,
            'reviewNotes'          => $formattedNotes,
            'overview'             => [
                'totalAreas'           => $formattedAreas->count(),
                'totalActions'         => $actions->count(),
                'pendingActions'       => $pendingCount,
                'inProgressActions'    => $inProgressCount,
                'doneActions'          => $doneCount,
                'cancelledActions'     => $cancelledCount,
                'delayedActions'       => $delayedCount,
                'overallProgress'      => $overallProgress['code'],
                'overallProgressLabel' => $overallProgress['label'],
            ],
            'createdAt'            => $plan->created_at?->toIso8601String(),
            'updatedAt'            => $plan->updated_at?->toIso8601String(),
        ];
    }

    /**
     * تنسيق بيانات إجراء التحسين التنفيذي.
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
            'progress'                     => $progressLevel->value,
            'progressLabel'                => $progressLevel->label(),
            'isDelayed'                    => $isDelayed,
            'createdAt'                    => $action->created_at?->toIso8601String(),
            'updatedAt'                    => $action->updated_at?->toIso8601String(),
        ];
    }
}
