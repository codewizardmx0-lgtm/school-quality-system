<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\EvaluationCycleResource;
use App\Http\Responses\ApiResponse;
use App\Models\CycleParticipation;
use App\Models\EvaluationCycle;
use App\Models\School;
use App\Models\StandardVersion;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * متحكم إدارة وإطلاق دورات التقييم المركزية وتسجيل مشاركة المدارس.
 *
 * الحصانة والصلاحيات (الفصل 3 من وثيقة النظام الرسمي):
 * 1. إطلاق وإدارة الدورات حكر على المشرف الوزاري (ministry_supervisor) عبر صلاحية cycles.manage.
 * 2. مسؤول النظام (admin) محظور قطعياً من إدارة أو إطلاق الدورات (BR-GEN-06)، ويرجع 403 Forbidden.
 * 3. يرتبط كل إطلاق دورة تلقائياً بآخر إصدار معايير مُقرّ (Approved/Active) دون تدخل يدوي.
 */
class EvaluationCycleController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService
    ) {}

    /**
     * استعراض قائمة الدورات التقييمية.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return ApiResponse::unauthorized();
        }

        $query = EvaluationCycle::with(['version', 'schools']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('academic_year')) {
            $query->where('academic_year', $request->academic_year);
        }

        $cycles = $query->orderBy('cycle_id', 'desc')->get();

        return ApiResponse::success(
            data: EvaluationCycleResource::collection($cycles)->resolve($request),
            message: null
        );
    }

    /**
     * إطلاق دورة تقييمية جديدة (خاص بالمشرف الوزاري حصرًا).
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return ApiResponse::unauthorized();
        }

        // عزل الصلاحيات الصارم: المشرف الوزاري فقط، والأدمن محظور تمامًا (403)
        if ($user->hasRole('admin') || (!$user->hasRole('ministry_supervisor') && !$user->hasPermission('cycles.manage') && !$user->hasPermission('cycles.launch'))) {
            return ApiResponse::forbidden('غير مصرح: إدارة وإطلاق دورات التقييم من اختصاص المشرف الوزاري حصرًا.');
        }

        $validator = Validator::make($request->all(), [
            'academic_year'      => ['required', 'string', 'max:20'],
            'name'               => ['nullable', 'string', 'max:100'],
            'start_date'         => ['required', 'date'],
            'end_date'           => ['required', 'date', 'after_or_equal:start_date'],
            'status'             => ['nullable', 'string', 'in:Active,Closed'],
            'school_ids'         => ['nullable', 'array'],
            'school_ids.*'       => ['integer', 'exists:schools,school_id'],
            'enroll_all_schools' => ['nullable', 'boolean'],
        ], [
            'academic_year.required' => 'العام الدراسي مطلوب.',
            'start_date.required'    => 'تاريخ بداية الدورة مطلوب.',
            'end_date.required'      => 'تاريخ نهاية الدورة مطلوب.',
            'end_date.after_or_equal'=> 'تاريخ نهاية الدورة يجب أن يكون مساوياً أو لاحقاً لتاريخ البداية.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        // الربط التلقائي بآخر إصدار معايير مُقرّ ونشط
        $latestApprovedVersion = StandardVersion::whereIn('status', ['Approved', 'Active'])
            ->latest('version_id')
            ->first();

        if (!$latestApprovedVersion) {
            return ApiResponse::validationError([
                'version' => ['لا يوجد إصدار معايير مُقرّ ونشط حالياً لإطلاق دورة جديدة.'],
            ], 'تعذر إطلاق الدورة: لا يوجد إصدار معايير مُقرّ ونشط حالياً.');
        }

        $cycle = DB::transaction(function () use ($request, $latestApprovedVersion) {
            $cycleName = $request->filled('name')
                ? $request->name
                : "دورة التقييم الذاتي للعام {$request->academic_year}";

            $cycle = EvaluationCycle::create([
                'name'          => $cycleName,
                'version_id'    => $latestApprovedVersion->version_id,
                'academic_year' => $request->academic_year,
                'start_date'    => $request->start_date,
                'end_date'      => $request->end_date,
                'status'        => $request->status ?? 'Active',
            ]);

            // تسجيل المدارس المشاركة إن طُلِب ذلك فور الإطلاق
            $schoolIdsToEnroll = [];
            if ($request->boolean('enroll_all_schools')) {
                $schoolIdsToEnroll = School::where('status', 'Active')->pluck('school_id')->toArray();
            } elseif ($request->filled('school_ids')) {
                $schoolIdsToEnroll = $request->school_ids;
            }

            if (!empty($schoolIdsToEnroll)) {
                $now = now();
                $rows = array_map(fn ($sId) => [
                    'cycle_id'   => $cycle->cycle_id,
                    'school_id'  => $sId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ], array_unique($schoolIdsToEnroll));

                CycleParticipation::insertOrIgnore($rows);
            }

            return $cycle;
        });

        // إرسال إشعارات الدورة للمدارس المشاركة
        if ($cycle->participations()->count() > 0) {
            $this->notificationService->notifyCycleLaunched($cycle);
        }

        $cycle->load(['version', 'schools']);

        return ApiResponse::success(
            data: (new EvaluationCycleResource($cycle))->resolve($request),
            message: 'تم إطلاق دورة التقييم بنجاح وربطها تلقائياً بالإصدار المُقرّ.',
            status: 201
        );
    }

    /**
     * استعراض تفاصيل دورة تقييمية محددة.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return ApiResponse::unauthorized();
        }

        $cycle = EvaluationCycle::with(['version', 'schools'])->find($id);
        if (!$cycle) {
            return ApiResponse::notFound('دورة التقييم غير موجودة.');
        }

        return ApiResponse::success(
            data: (new EvaluationCycleResource($cycle))->resolve($request),
            message: null
        );
    }

    /**
     * تحديث بيانات أو حالة دورة تقييمية (المشرف الوزاري حصرًا).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return ApiResponse::unauthorized();
        }

        if ($user->hasRole('admin') || (!$user->hasRole('ministry_supervisor') && !$user->hasPermission('cycles.manage') && !$user->hasPermission('cycles.launch'))) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $cycle = EvaluationCycle::find($id);
        if (!$cycle) {
            return ApiResponse::notFound('دورة التقييم غير موجودة.');
        }

        $validator = Validator::make($request->all(), [
            'name'       => ['nullable', 'string', 'max:100'],
            'start_date' => ['nullable', 'date'],
            'end_date'   => ['nullable', 'date', 'after_or_equal:start_date'],
            'status'     => ['nullable', 'string', 'in:Active,Closed'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        if ($request->has('name')) {
            $cycle->name = $request->name;
        }
        if ($request->has('start_date')) {
            $cycle->start_date = $request->start_date;
        }
        if ($request->has('end_date')) {
            $cycle->end_date = $request->end_date;
        }
        if ($request->has('status')) {
            $cycle->status = $request->status;
        }

        $cycle->save();
        $cycle->load(['version', 'schools']);

        return ApiResponse::success(
            data: (new EvaluationCycleResource($cycle))->resolve($request),
            message: 'تم تحديث بيانات دورة التقييم بنجاح.'
        );
    }

    /**
     * تسجيل وإشراك مدارس في الدورة التقييمية (المشرف الوزاري حصرًا).
     */
    public function enrollSchools(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return ApiResponse::unauthorized();
        }

        if ($user->hasRole('admin') || (!$user->hasRole('ministry_supervisor') && !$user->hasPermission('cycles.manage') && !$user->hasPermission('cycles.launch'))) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $cycle = EvaluationCycle::find($id);
        if (!$cycle) {
            return ApiResponse::notFound('دورة التقييم غير موجودة.');
        }

        $validator = Validator::make($request->all(), [
            'school_ids'         => ['nullable', 'array'],
            'school_ids.*'       => ['integer', 'exists:schools,school_id'],
            'enroll_all_schools' => ['nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $schoolIds = [];
        if ($request->boolean('enroll_all_schools')) {
            $schoolIds = School::where('status', 'Active')->pluck('school_id')->toArray();
        } elseif ($request->filled('school_ids')) {
            $schoolIds = $request->school_ids;
        }

        if (empty($schoolIds)) {
            return ApiResponse::validationError(['school_ids' => ['يرجى تحديد المدارس المراد تسجيلها في الدورة.']]);
        }

        $now = now();
        $rows = array_map(fn ($sId) => [
            'cycle_id'   => $cycle->cycle_id,
            'school_id'  => $sId,
            'created_at' => $now,
            'updated_at' => $now,
        ], array_unique($schoolIds));

        CycleParticipation::insertOrIgnore($rows);

        // إرسال الإشعارات للمدارس المسجلة
        $this->notificationService->notifyCycleLaunched($cycle);

        $enrolledCount = $cycle->participations()->count();

        return ApiResponse::success(
            data: [
                'cycleId'       => $cycle->cycle_id,
                'enrolledCount' => $enrolledCount,
            ],
            message: 'تم تسجيل المدارس في دورة التقييم بنجاح وإرسال الإشعارات لهم.'
        );
    }
}
