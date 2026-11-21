<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\EvaluationCycleResource;
use App\Http\Responses\ApiResponse;
use App\Models\AuditLog;
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

        // المشرف الجغرافي يستعرض الدورات العامة ودورات محافظته فقط
        if (!empty($user->governorate)) {
            $query->where(function ($q) use ($user) {
                $q->whereNull('scope_governorate')
                  ->orWhere('scope_governorate', $user->governorate);
            });
        }

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

        // إدارة وإطلاق دورات التقييم على المستوى الكلي للنظام فقط ومحصورة حصراً بالمشرف الوزاري المركزي العام
        if (!is_null($user->governorate)) {
            return ApiResponse::forbidden('غير مصرح: إدارة وإطلاق دورات التقييم محصورة بالمشرف الوزاري المركزي العام حصرًا.');
        }

        $scopeGovernorate = $request->filled('scope_governorate') && $request->scope_governorate !== 'كافة المحافظات'
            ? $request->input('scope_governorate')
            : null;

        $validator = Validator::make($request->all(), [
            'academic_year'      => ['required', 'string', 'max:20'],
            'name'               => ['nullable', 'string', 'max:100'],
            'scope_governorate'  => ['nullable', 'string', 'max:100'],
            'start_date'         => ['required', 'date'],
            'end_date'           => [
                'required',
                'date',
                'after_or_equal:start_date',
                function ($attribute, $value, $fail) use ($request) {
                    if ($request->filled('start_date') && strtotime($value) && strtotime($request->start_date)) {
                        $diffDays = (strtotime($value) - strtotime($request->start_date)) / 86400;
                        if ($diffDays < 30) {
                            $fail('يجب ألا تقل مدة الدورة التقييمية عن 30 يوماً نظامياً وفق قواعد الحوكمة (FR-SUP-01).');
                        }
                    }
                },
            ],
            'status'             => ['nullable', 'string', 'in:Active,Closed'],
            'school_ids'         => ['nullable', 'array'],
            'school_ids.*'       => ['integer', 'exists:schools,school_id'],
            'enroll_all_schools' => ['nullable', 'boolean'],
            'max_completion_days'=> ['nullable', 'integer', 'min:1', 'max:60'],
        ], [
            'academic_year.required' => 'العام الدراسي مطلوب.',
            'start_date.required'    => 'تاريخ بداية الدورة مطلوب.',
            'end_date.required'      => 'تاريخ نهاية الدورة مطلوب.',
            'end_date.after_or_equal'=> 'تاريخ نهاية الدورة يجب أن يكون مساوياً أو لاحقاً لتاريخ البداية.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        // حوكمة تفرد الدورة التقييمية النشطة (FR-SUP-01): التحقق الذكي من عدم التداخل الجغرافي (Scope-Aware Validation)
        $targetStatus = $request->input('status', 'Active');
        if ($targetStatus === 'Active') {
            $activeQuery = EvaluationCycle::where('status', 'Active');

            if (empty($scopeGovernorate)) {
                // 1. دورة عامة (scope_governorate = NULL): تُرفض إذا وُجدت أي دورة نشطة حالياً في النظام (سواء عامة أو لمحافظة)
                $existingActiveCycle = $activeQuery->first();
                if ($existingActiveCycle) {
                    $scopeMsg = $existingActiveCycle->scope_governorate
                        ? "تخص «{$existingActiveCycle->scope_governorate}»"
                        : "عامة على مستوى الجمهورية";
                    return ApiResponse::validationError([
                        'cycle' => ["توجد بالفعل دورة تقييم نشطة جارية {$scopeMsg} ({$existingActiveCycle->name} - {$existingActiveCycle->academic_year}). لا يمكن إطلاق دورة عامة تتداخل مع الدورات القائمة وفق قواعد الحوكمة (FR-SUP-01)."],
                    ], 'تعذر إطلاق الدورة: توجد دورة تقييم نشطة تتداخل مع النطاق المطلوب.');
                }
            } else {
                // 2. دورة لمحافظة محددة (مثل تعز): تُرفض فقط إذا وُجدت دورة نشطة عامة (NULL) أو دورة لنفس المحافظة تحديداً
                $existingActiveCycle = $activeQuery->where(function ($q) use ($scopeGovernorate) {
                    $q->whereNull('scope_governorate')
                      ->orWhere('scope_governorate', $scopeGovernorate);
                })->first();

                if ($existingActiveCycle) {
                    $scopeMsg = $existingActiveCycle->scope_governorate
                        ? "لنفس النطاق الجغرافي («{$existingActiveCycle->scope_governorate}»)"
                        : "عامة تغطي كافة المحافظات";
                    return ApiResponse::validationError([
                        'cycle' => ["توجد بالفعل دورة تقييم نشطة جارية {$scopeMsg} ({$existingActiveCycle->name} - {$existingActiveCycle->academic_year}). لا يمكن إطلاق دورة متداخلة جغرافياً وفق قواعد الحوكمة (FR-SUP-01)."],
                    ], 'تعذر إطلاق الدورة: توجد دورة تقييم نشطة بالفعل لنفس المحافظة أو تغطيها.');
                }
            }
        }

        // التحقق من خيار التحديد اليدوي للمدارس (FR-SUP-01 & الواجهة 28)
        $enrollAllSchools = $request->boolean('enroll_all_schools', true);
        if (!$enrollAllSchools) {
            $schoolIds = $request->input('school_ids', []);
            if (empty($schoolIds)) {
                return ApiResponse::validationError([
                    'school_ids' => ['يرجى تحديد مدرسة واحدة على الأقل عند اختيار التحديد اليدوي للمدارس.'],
                ], 'تعذر إطلاق الدورة: لم يتم تحديد أي مدرسة للمشاركة.');
            }

            if (!empty($scopeGovernorate)) {
                $foreignSchools = School::whereIn('school_id', $schoolIds)
                    ->where('governorate', '!=', $scopeGovernorate)
                    ->pluck('school_name')
                    ->toArray();

                if (!empty($foreignSchools)) {
                    return ApiResponse::validationError([
                        'school_ids' => [
                            "المدارس التالية لا تقع ضمن النطاق الجغرافي المحدد للدورة («{$scopeGovernorate}»): " . implode('، ', $foreignSchools) . '. يجب اختيار مدارس تابعة لنفس المحافظة حصراً.'
                        ],
                    ], 'تعذر إطلاق الدورة: بعض المدارس المحددة تقع خارج نطاق المحافظة.');
                }
            }
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

        $cycle = DB::transaction(function () use ($request, $latestApprovedVersion, $scopeGovernorate, $enrollAllSchools) {
            $cycleName = $request->filled('name')
                ? $request->name
                : "دورة التقييم الذاتي للعام {$request->academic_year}";

            $cycle = EvaluationCycle::create([
                'name'              => $cycleName,
                'version_id'        => $latestApprovedVersion->version_id,
                'academic_year'     => $request->academic_year,
                'scope_governorate' => $scopeGovernorate,
                'start_date'        => $request->start_date,
                'end_date'          => $request->end_date,
                'max_completion_days' => $request->filled('max_completion_days') ? (int) $request->max_completion_days : 14,
                'status'            => $request->status ?? 'Active',
            ]);

            // تسجيل المدارس المشاركة إن طُلِب ذلك فور الإطلاق (الكل أو تحديد يدوي)
            $schoolIdsToEnroll = [];
            if ($enrollAllSchools) {
                $schoolsQuery = School::where('status', 'Active');
                if ($scopeGovernorate) {
                    $schoolsQuery->where('governorate', $scopeGovernorate);
                }
                $schoolIdsToEnroll = $schoolsQuery->pluck('school_id')->toArray();
            } elseif ($request->filled('school_ids')) {
                $schoolsQuery = School::whereIn('school_id', $request->school_ids)->where('status', 'Active');
                if ($scopeGovernorate) {
                    $schoolsQuery->where('governorate', $scopeGovernorate);
                }
                $schoolIdsToEnroll = $schoolsQuery->pluck('school_id')->toArray();
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

        // الحوكمة المركزية: تعديل أو إغلاق دورات التقييم محصورة بالمشرف الوزاري المركزي العام
        if (!is_null($user->governorate)) {
            return ApiResponse::forbidden('غير مصرح: تعديل أو إغلاق دورات التقييم محصورة بالمشرف الوزاري المركزي العام حصرًا.');
        }

        // قفل الإصدار المعياري بعد الإطلاق (BR-GEN-05)
        if (($request->has('version_id') && (int) $request->version_id !== (int) $cycle->version_id) ||
            ($request->has('standard_version_id') && (int) $request->standard_version_id !== (int) $cycle->version_id)) {
            return ApiResponse::validationError([
                'version_id' => ['لا يمكن تغيير الإصدار المعياري بعد إطلاق الدورة التقييمية وفق قواعد الحوكمة (BR-GEN-05).'],
            ], 'تعذر تعديل الإصدار المعياري: الإصدار مقفل بعد الإطلاق.');
        }

        $validator = Validator::make($request->all(), [
            'name'              => ['nullable', 'string', 'max:100'],
            'scope_governorate' => ['nullable', 'string', 'max:100'],
            'start_date'        => ['nullable', 'date'],
            'end_date'          => [
                'nullable',
                'date',
                'after_or_equal:start_date',
                function ($attribute, $value, $fail) use ($request, $cycle) {
                    $effectiveStart = $request->start_date ?? $cycle->start_date;
                    if ($effectiveStart && strtotime($value) && strtotime($effectiveStart)) {
                        $diffDays = (strtotime($value) - strtotime($effectiveStart)) / 86400;
                        if ($diffDays < 30) {
                            $fail('يجب ألا تقل مدة الدورة التقييمية عن 30 يوماً نظامياً وفق قواعد الحوكمة (FR-SUP-01).');
                        }
                    }
                    if ($request->status !== 'Closed' && $cycle->status === 'Active' && strtotime($value) < strtotime(date('Y-m-d'))) {
                        $fail('تاريخ نهاية الدورة النشطة لا يمكن أن يسبق تاريخ اليوم.');
                    }
                },
            ],
            'status'            => ['nullable', 'string', 'in:Active,Closed'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $oldValues = [
            'name'              => $cycle->name,
            'scope_governorate' => $cycle->scope_governorate,
            'start_date'        => $cycle->start_date?->format('Y-m-d'),
            'end_date'          => $cycle->end_date?->format('Y-m-d'),
            'status'            => $cycle->status,
        ];

        // حوكمة تفرد الدورة التقييمية النشطة (Scope-Aware Conflict Check)
        $targetStatus = $request->input('status', $cycle->status);
        $targetScopeGov = $request->has('scope_governorate')
            ? ($request->filled('scope_governorate') && $request->scope_governorate !== 'كافة المحافظات' ? $request->scope_governorate : null)
            : $cycle->scope_governorate;

        if ($targetStatus === 'Active') {
            $conflictQuery = EvaluationCycle::where('status', 'Active')
                ->where('cycle_id', '!=', $cycle->cycle_id);

            if (empty($targetScopeGov)) {
                // دورة عامة: تتعارض مع أي دورة نشطة أخرى في النظام
                $conflictCycle = $conflictQuery->first();
                if ($conflictCycle) {
                    $scopeMsg = $conflictCycle->scope_governorate
                        ? "تخص «{$conflictCycle->scope_governorate}»"
                        : "عامة على مستوى الجمهورية";
                    return ApiResponse::validationError([
                        'status' => ["توجد بالفعل دورة تقييم نشطة جارية {$scopeMsg} ({$conflictCycle->name} - {$conflictCycle->academic_year}). لا يمكن تنشيط دورة عامة تتداخل مع الدورات القائمة."],
                    ], 'تعذر التحديث: توجد دورة نشطة جارية تتداخل مع النطاق المطلوب.');
                }
            } else {
                // دورة لمحافظة محددة: تتعارض فقط مع دورة عامة (NULL) أو دورة لنفس المحافظة
                $conflictCycle = $conflictQuery->where(function ($q) use ($targetScopeGov) {
                    $q->whereNull('scope_governorate')
                      ->orWhere('scope_governorate', $targetScopeGov);
                })->first();

                if ($conflictCycle) {
                    $scopeMsg = $conflictCycle->scope_governorate
                        ? "لنفس النطاق الجغرافي («{$conflictCycle->scope_governorate}»)"
                        : "عامة تغطي كافة المحافظات";
                    return ApiResponse::validationError([
                        'status' => ["توجد بالفعل دورة تقييم نشطة جارية {$scopeMsg} ({$conflictCycle->name} - {$conflictCycle->academic_year}). لا يمكن تنشيط أو تعديل نطاق الدورة إلى نطاق متداخل جغرافياً."],
                    ], 'تعذر التحديث: توجد دورة نشطة جارية في نفس النطاق الجغرافي.');
                }
            }
        }

        if ($request->has('name')) {
            $cycle->name = $request->name;
        }
        if ($request->has('scope_governorate')) {
            $cycle->scope_governorate = $targetScopeGov;
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
        if ($request->has('max_completion_days')) {
            $cycle->max_completion_days = (int) $request->max_completion_days;
        }

        $cycle->save();
        $cycle->load(['version', 'schools']);

        // تسجيل العملية في سجل التدقيق المؤسسي
        AuditLog::create([
            'user_id'        => $user->user_id,
            'school_id'      => null,
            'action'         => $request->status === 'Closed' && $oldValues['status'] !== 'Closed' ? 'CYCLE_CLOSED' : 'CYCLE_UPDATED',
            'description_ar' => $request->status === 'Closed' && $oldValues['status'] !== 'Closed'
                ? "إغلاق وأرشفة الدورة التقييمية: {$cycle->name}"
                : "تعديل بيانات الدورة التقييمية: {$cycle->name}",
            'target_type'    => 'evaluation_cycle',
            'target_id'      => $cycle->cycle_id,
            'old_values'     => $oldValues,
            'new_values'     => [
                'name'              => $cycle->name,
                'scope_governorate' => $cycle->scope_governorate,
                'start_date'        => $cycle->start_date?->format('Y-m-d'),
                'end_date'          => $cycle->end_date?->format('Y-m-d'),
                'status'            => $cycle->status,
            ],
            'ip_address'     => $request->ip(),
            'user_agent'     => $request->userAgent(),
            'created_at'     => now(),
        ]);

        return ApiResponse::success(
            data: (new EvaluationCycleResource($cycle))->resolve($request),
            message: $request->status === 'Closed' && $oldValues['status'] !== 'Closed'
                ? 'تم إغلاق وأرشفة الدورة التقييمية بنجاح وتجميد التعديلات في المدارس.'
                : 'تم تحديث بيانات دورة التقييم بنجاح.'
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

        if ($cycle->status === 'Closed') {
            return ApiResponse::validationError([
                'cycle' => ['لا يمكن تسجيل أو إلحاق مدارس بدورة تقييمية مغلقة ومؤرشفة.'],
            ]);
        }

        $validator = Validator::make($request->all(), [
            'school_ids'         => ['nullable', 'array'],
            'school_ids.*'       => ['integer', 'exists:schools,school_id'],
            'enroll_all_schools' => ['nullable', 'boolean'],
            'max_completion_days'=> ['nullable', 'integer', 'min:1', 'max:60'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $schoolIds = [];
        if ($request->boolean('enroll_all_schools')) {
            $schoolsQuery = School::where('status', 'Active');
            if (!empty($user->governorate)) {
                $schoolsQuery->where('governorate', $user->governorate);
            }
            $schoolIds = $schoolsQuery->pluck('school_id')->toArray();
        } elseif ($request->filled('school_ids')) {
            $schoolIds = $request->school_ids;
        }

        if (empty($schoolIds)) {
            return ApiResponse::validationError(['school_ids' => ['يرجى تحديد المدارس المراد تسجيلها في الدورة.']]);
        }

        if (!empty($user->governorate)) {
            $invalidCount = School::whereIn('school_id', $schoolIds)
                ->where('governorate', '!=', $user->governorate)
                ->count();
            if ($invalidCount > 0) {
                return ApiResponse::forbidden('غير مصرح: لا يمكن تسجيل مدارس تقع خارج نطاق محافظتك الجغرافية.');
            }
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

    /**
     * استعراض المدارس المتاحة للتسجيل في الدورة والغير مسجلة بعد.
     */
    public function availableSchools(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return ApiResponse::unauthorized();
        }

        $cycle = EvaluationCycle::find($id);
        if (!$cycle) {
            return ApiResponse::notFound('دورة التقييم غير موجودة.');
        }

        $enrolledIds = $cycle->participations()->pluck('school_id')->toArray();
        $query = School::where('status', 'Active')->whereNotIn('school_id', $enrolledIds);

        $targetGov = $cycle->scope_governorate ?? $user->governorate;
        if (!empty($targetGov)) {
            $query->where('governorate', $targetGov);
        }

        $schools = $query->orderBy('school_name')->get()->map(fn ($s) => [
            'schoolId'    => $s->school_id,
            'schoolName'  => $s->school_name,
            'schoolCode'  => $s->school_code ?? $s->identification_data ?? "SCH-{$s->school_id}",
            'stage'       => $s->educational_stage,
            'governorate' => $s->governorate,
            'district'    => $s->educational_district,
        ]);

        return ApiResponse::success(
            data: $schools,
            message: 'تم تحميل قائمة المدارس المتاحة للتسجيل بنجاح.'
        );
    }

    /**
     * إلغاء وحذف دورة تقييمية (المشرف الوزاري المركزي العام حصرًا عند خلوها من التقييمات).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return ApiResponse::unauthorized();
        }

        if ($user->hasRole('admin') || (!$user->hasRole('ministry_supervisor') && !$user->hasPermission('cycles.manage') && !$user->hasPermission('cycles.launch'))) {
            return ApiResponse::forbidden('غير مصرح');
        }

        if (!is_null($user->governorate)) {
            return ApiResponse::forbidden('غير مصرح: حذف أو إلغاء دورات التقييم محصورة بالمشرف الوزاري المركزي العام حصرًا.');
        }

        $cycle = EvaluationCycle::find($id);
        if (!$cycle) {
            return ApiResponse::notFound('دورة التقييم غير موجودة.');
        }

        if ($cycle->evaluations()->exists()) {
            return ApiResponse::validationError([
                'cycle' => ['لا يمكن حذف دورة تقييمية تحتوي على ملفات تقييم جارية للمدارس. يرجى إغلاق الدورة بدلاً من ذلك.'],
            ]);
        }

        $cycle->participations()->delete();
        $cycle->delete();

        return ApiResponse::success(null, 'تم حذف دورة التقييم بنجاح.');
    }
}
