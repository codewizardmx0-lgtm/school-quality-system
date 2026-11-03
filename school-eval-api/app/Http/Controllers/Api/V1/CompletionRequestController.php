<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\EvaluationSubmitted;
use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\CompletionRequest;
use App\Models\CompletionRequestItem;
use App\Models\Evaluation;
use App\Models\EvaluationSubmission;
use App\Models\Report;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * متحكم إدارة طلبات الاستكمال وسجل محاولات التسليم (U-03, U-11, U-29).
 *
 * يوفر إدارة دورة حياة الاستكمال بين المدرسة والإشراف الوزاري:
 * 1. إنشاء طلب استكمال بمهلة زمنية يحددها المشرف وبنود نواقص تفصيلية.
 * 2. استعراض قائمة وتفاصيل طلبات الاستكمال مع الفحص الآلي لحالة البنود.
 * 3. تمديد مهلة الاستكمال من قبل المشرف الوزاري حصراً.
 * 4. إعادة تقديم التقييم (resubmit) من قبل المدرسة بعد معالجة كافة البنود وداخل المهلة.
 * 5. الإغلاق النهائي للطلب والتقييم من قبل المشرف الوزاري.
 */
class CompletionRequestController extends Controller
{
    /**
     * إنشاء طلب استكمال جديد لملف تقييم من قِبل المشرف الوزاري.
     *
     * POST /api/v1/evaluations/{id}/completion-requests
     */
    public function store(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        // 1. التحقق من صلاحية المشرف الوزاري
        if ($user->user_type !== 'ministry' || (!$user->hasRole('ministry_supervisor') && !$user->hasPermission('completion.request') && !$user->hasPermission('supervision.review'))) {
            return ApiResponse::forbidden('غير مصرح لك بإنشاء طلب استكمال. هذه العملية مخصصة للمشرف الوزاري فقط.');
        }

        // 2. التحقق من وجود ملف التقييم
        $evaluation = Evaluation::with(['cycle', 'school'])->find($id);
        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        // 3. التحقق من حالة التقييم المؤهلة لطلب الاستكمال
        if ($evaluation->status === 'Completed') {
            return ApiResponse::validationError([
                'evaluation' => ['لا يمكن إنشاء طلب استكمال لتقييم مغلق ومكتمل نهائياً.'],
            ], 'لا يمكن إنشاء طلب استكمال لتقييم مكتمل.');
        }

        if ($evaluation->status === 'InProgress') {
            return ApiResponse::validationError([
                'evaluation' => ['لا يمكن إنشاء طلب استكمال لتقييم لم يتم تسليمه بعد وهو لا يزال قيد الإنجاز (InProgress).'],
            ], 'لا يمكن إنشاء طلب استكمال لتقييم قيد الإنجاز.');
        }

        if ($evaluation->status === 'NeedsCompletion') {
            return ApiResponse::validationError([
                'evaluation' => ['يوجد طلب استكمال مفتوح مسبقاً لهذا التقييم ويجب معالجته أو إغلاقه أولاً.'],
            ], 'يوجد طلب استكمال مفتوح مسبقاً لهذا التقييم.');
        }

        // 4. التحقق من صحة المدخلات
        $validator = Validator::make($request->all(), [
            'completion_deadline' => 'required|date|after:now',
            'notes' => 'nullable|string|max:2000',
            'items' => 'required|array|min:1',
            'items.*.indicator_id' => 'required|integer|exists:indicators,indicator_id',
            'items.*.missing_description' => 'required|string|max:1000',
            'items.*.evidence_link_id' => 'nullable|integer|exists:evidence_links,id',
        ], [
            'completion_deadline.required' => 'حقل مهلة الاستكمال (completion_deadline) إلزامي.',
            'completion_deadline.after' => 'يجب أن يكون تاريخ مهلة الاستكمال بعد الوقت الحالي.',
            'items.required' => 'يجب تحديد بند استكمال واحد على الأقل.',
            'items.min' => 'يجب تحديد بند استكمال واحد على الأقل.',
            'items.*.indicator_id.required' => 'معرف المؤشر (indicator_id) إلزامي لكل بند استكمال.',
            'items.*.missing_description.required' => 'وصف النقص المطلوب (missing_description) إلزامي لكل بند استكمال.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        // 5. التنفيذ داخل Transaction
        $createdRequest = DB::transaction(function () use ($evaluation, $user, $request) {
            // ضمان وجود التقرير
            $report = Report::firstOrCreate(
                ['evaluation_id' => $evaluation->evaluation_id],
                [
                    'status' => 'Draft',
                    'generated_at' => now(),
                ]
            );

            // جلب آخر محاولة تسليم أو إنشاء المحاولة الأولى إذا لم تكن موجودة
            $latestSubmission = EvaluationSubmission::where('report_id', $report->report_id)
                ->orderBy('attempt_no', 'desc')
                ->first();

            if (!$latestSubmission) {
                $latestSubmission = EvaluationSubmission::create([
                    'report_id' => $report->report_id,
                    'attempt_no' => 1,
                    'submitted_by_user_id' => $evaluation->created_by_user_id ?? $user->user_id,
                    'submitted_at' => now(),
                    'status' => 'Submitted',
                ]);
            }

            // إنشاء طلب الاستكمال
            $completionRequest = CompletionRequest::create([
                'submission_id' => $latestSubmission->submission_id,
                'issued_by_user_id' => $user->user_id,
                'status' => 'Open',
                'completion_deadline' => $request->input('completion_deadline'),
                'deadline_extensions_count' => 0,
            ]);

            // إنشاء بنود طلب الاستكمال
            foreach ($request->input('items') as $item) {
                $completionRequest->items()->create([
                    'indicator_id' => $item['indicator_id'],
                    'evidence_link_id' => $item['evidence_link_id'] ?? null,
                    'missing_description' => $item['missing_description'],
                    'status' => 'pending',
                ]);
            }

            // تحديث حالة المحاولة والتقييم إلى NeedsCompletion
            $latestSubmission->update(['status' => 'NeedsCompletion']);
            $evaluation->update(['status' => 'NeedsCompletion']);

            return $completionRequest;
        });

        $createdRequest->load(['items.indicator', 'items.evidenceLink', 'requestedBy', 'submission']);

        return ApiResponse::success(
            data: $createdRequest,
            message: 'تم إنشاء طلب الاستكمال وتحديد المهلة بنجاح ونقل التقييم إلى حالة NeedsCompletion.',
            status: 201
        );
    }

    /**
     * استعراض قائمة طلبات الاستكمال لتقييم محدد مع التحقق الصارم من العزل المؤسسي (القرار المعماري 9).
     *
     * GET /api/v1/evaluations/{id}/completion-requests
     */
    public function index(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $evaluation = Evaluation::with('school')->find($id);
        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        // عزل المدارس الصارم (القرار المعماري 9): إرجاع 404 إذا طلب مستخدم مدرسة تقييم مدرسة أخرى
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        if ($user->user_type === 'ministry' && !$user->hasPermission('evaluations.view') && !$user->hasPermission('supervision.review')) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض طلبات الاستكمال.');
        }

        $requests = CompletionRequest::query()
            ->whereHas('submission.report', function ($q) use ($id) {
                $q->where('evaluation_id', $id);
            })
            ->with(['items.indicator', 'items.evidenceLink', 'requestedBy', 'submission'])
            ->orderBy('request_id', 'desc')
            ->get();

        // فحص وتحديث حالة البنود آلياً للطلبات المفتوحة
        foreach ($requests as $cr) {
            if ($cr->status === 'Open') {
                foreach ($cr->items as $item) {
                    if ($item->status !== 'rejected') {
                        $item->refreshResolutionStatus();
                    }
                }
            }
        }

        return ApiResponse::success(
            data: $requests,
            message: 'تم جلب طلبات الاستكمال بنجاح.'
        );
    }

    /**
     * استعراض تفاصيل طلب استكمال محدد.
     *
     * GET /api/v1/completion-requests/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $completionRequest = CompletionRequest::with([
            'items.indicator',
            'items.evidenceLink',
            'requestedBy',
            'submission.report.evaluation.school',
        ])->find($id);

        if (!$completionRequest) {
            return ApiResponse::notFound('طلب الاستكمال المطلوب غير موجود.');
        }

        $evaluation = $completionRequest->evaluation;

        // عزل المدارس الصارم: إرجاع 404 إذا طلب مستخدم مدرسة طلب مدرسة أخرى
        if ($user->user_type === 'school' && $evaluation && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('طلب الاستكمال المطلوب غير موجود.');
        }

        // فحص وتحديث حالة البنود آلياً إذا كان الطلب مفتوحاً
        if ($completionRequest->status === 'Open') {
            foreach ($completionRequest->items as $item) {
                if ($item->status !== 'rejected') {
                    $item->refreshResolutionStatus();
                }
            }
        }

        $responseData = $completionRequest->toArray();
        $responseData['is_expired'] = $completionRequest->isExpired();

        return ApiResponse::success(
            data: $responseData,
            message: 'تم استرجاع تفاصيل طلب الاستكمال بنجاح.'
        );
    }

    /**
     * تمديد مهلة طلب الاستكمال (المشرف الوزاري حصراً).
     *
     * PATCH /api/v1/completion-requests/{id}/deadline
     */
    public function extendDeadline(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        // 1. المشرف الوزاري فقط
        if ($user->user_type !== 'ministry' || (!$user->hasRole('ministry_supervisor') && !$user->hasPermission('supervision.review'))) {
            return ApiResponse::forbidden('غير مصرح لك بتمديد المهلة. هذه العملية مخصصة للمشرف الوزاري فقط.');
        }

        $completionRequest = CompletionRequest::find($id);
        if (!$completionRequest) {
            return ApiResponse::notFound('طلب الاستكمال المطلوب غير موجود.');
        }

        if ($completionRequest->status !== 'Open') {
            return ApiResponse::validationError([
                'request' => ["لا يمكن تمديد مهلة لطلب بحالة ({$completionRequest->status}). التمديد متاح للطلبات المفتوحة فقط."],
            ], 'لا يمكن تمديد مهلة هذا الطلب.');
        }

        $validator = Validator::make($request->all(), [
            'new_deadline' => 'required|date',
        ], [
            'new_deadline.required' => 'حقل المهلة الجديدة (new_deadline) إلزامي.',
            'new_deadline.date' => 'صيغة تاريخ المهلة الجديدة غير صحيحة.',
        ]);

        if ($validator->fails()) {
            return ApiResponse::validationError($validator->errors()->toArray());
        }

        $newDeadline = Carbon::parse($request->input('new_deadline'));
        $currentDeadline = $completionRequest->completion_deadline ? Carbon::parse($completionRequest->completion_deadline) : null;

        if ($currentDeadline && $newDeadline->lte($currentDeadline)) {
            return ApiResponse::validationError([
                'new_deadline' => ['يجب أن يكون تاريخ المهلة الجديد بعد تاريخ المهلة الحالي (' . $currentDeadline->toIso8601String() . ').'],
            ], 'يجب أن يكون تاريخ المهلة الجديد بعد تاريخ المهلة الحالي.');
        }

        $completionRequest->completion_deadline = $newDeadline;
        $completionRequest->deadline_extended_at = now();
        $completionRequest->deadline_extensions_count = ((int) $completionRequest->deadline_extensions_count) + 1;
        $completionRequest->save();

        return ApiResponse::success(
            data: [
                'requestId' => $completionRequest->request_id,
                'status' => $completionRequest->status,
                'completionDeadline' => $completionRequest->completion_deadline?->toIso8601ZuluString(),
                'deadlineExtendedAt' => $completionRequest->deadline_extended_at?->toIso8601ZuluString(),
                'deadlineExtensionsCount' => $completionRequest->deadline_extensions_count,
            ],
            message: 'تم تمديد مهلة طلب الاستكمال بنجاح.'
        );
    }

    /**
     * إعادة تقديم التقييم من المدرسة بعد استيفاء بنود الاستكمال وداخل المهلة.
     *
     * POST /api/v1/completion-requests/{id}/resubmit
     */
    public function resubmit(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        // 1. مستخدم المدرسة ومخول بتقديم التقييم حصراً
        if ($user->user_type !== 'school' || !$user->hasPermission('evaluations.submit')) {
            return ApiResponse::forbidden('غير مصرح لك بإعادة تسليم التقييم.');
        }

        $completionRequest = CompletionRequest::with(['items.indicator', 'submission.report.evaluation'])->find($id);
        if (!$completionRequest) {
            return ApiResponse::notFound('طلب الاستكمال المطلوب غير موجود.');
        }

        $evaluation = $completionRequest->evaluation;

        // عزل المدارس الصارم (القرار المعماري 9)
        if (!$evaluation || (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('طلب الاستكمال المطلوب غير موجود.');
        }

        // 2. التحقق من أن الطلب في حالة مفتوحة
        if ($completionRequest->status !== 'Open') {
            return ApiResponse::validationError([
                'request' => ["طلب الاستكمال ليس في حالة مفتوحة تقبل إعادة التقديم (الحالة الحالية: {$completionRequest->status})."],
            ], 'طلب الاستكمال غير قابل لإعادة التقديم.');
        }

        // 3. التحقق الصارم من سريان المهلة الزمانية
        if ($completionRequest->isExpired()) {
            return ApiResponse::validationError([
                'deadline' => ['انتهت مهلة استكمال الملاحظات المحددة من المشرف الوزاري دون تمديد، ولا يمكن إعادة تقديم التقييم (422).'],
            ], 'انتهت مهلة استكمال الملاحظات المحددة من المشرف الوزاري دون تمديد، ولا يمكن إعادة تقديم التقييم (422).');
        }

        // 4. التحقق الصارم من معالجة كافة البنود (عدم وجود أي بند Pending أو Rejected)
        $unresolvedItems = [];
        foreach ($completionRequest->items as $item) {
            $item->refreshResolutionStatus();
            if ($item->status !== 'resolved') {
                $unresolvedItems[] = [
                    'request_item_id' => $item->request_item_id,
                    'indicator_id' => $item->indicator_id,
                    'status' => $item->status,
                    'missing_description' => $item->missing_description,
                ];
            }
        }

        if (!empty($unresolvedItems)) {
            return ApiResponse::validationError([
                'unresolved_items' => $unresolvedItems,
            ], 'لا يمكن إعادة تقديم التقييم لوجود بنود استكمال لم يتم معالجتها واستيفاؤها بالكامل.');
        }

        // 5. التنفيذ داخل Transaction: إنشاء محاولة جديدة ونقل الحالة إلى UnderReview و Submitted
        $resubmitResult = DB::transaction(function () use ($completionRequest, $evaluation, $user) {
            $report = $completionRequest->submission->report;
            $maxAttempt = EvaluationSubmission::where('report_id', $report->report_id)->max('attempt_no') ?? 1;
            $newAttemptNo = $maxAttempt + 1;

            $newSubmission = EvaluationSubmission::create([
                'report_id' => $report->report_id,
                'attempt_no' => $newAttemptNo,
                'submitted_by_user_id' => $user->user_id,
                'submitted_at' => now(),
                'status' => 'Submitted',
            ]);

            // حالة الطلب تنتقل إلى UnderReview
            $completionRequest->status = 'UnderReview';
            $completionRequest->save();

            // حالة التقييم تنتقل إلى Submitted
            $evaluation->status = 'Submitted';
            $evaluation->updated_at = now();
            $evaluation->save();

            event(new EvaluationSubmitted($evaluation, $user));

            return [
                'newSubmission' => $newSubmission,
                'attemptNo' => $newAttemptNo,
            ];
        });

        return ApiResponse::success(
            data: [
                'requestId' => $completionRequest->request_id,
                'requestStatus' => $completionRequest->status,
                'evaluationStatus' => $evaluation->status,
                'newAttemptNo' => $resubmitResult['attemptNo'],
                'submissionId' => $resubmitResult['newSubmission']->submission_id,
                'submittedAt' => $resubmitResult['newSubmission']->submitted_at?->toIso8601ZuluString(),
            ],
            message: "تمت إعادة تسليم ملف التقييم بنجاح ونقله إلى قيد المراجعة الإشرافية (محاولة رقم {$resubmitResult['attemptNo']})."
        );
    }

    /**
     * الإغلاق النهائي لطلب الاستكمال واعتماد التقييم مكتملاً (المشرف الوزاري حصراً).
     *
     * POST /api/v1/completion-requests/{id}/close
     */
    public function close(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        // 1. المشرف الوزاري فقط
        if ($user->user_type !== 'ministry' || (!$user->hasRole('ministry_supervisor') && !$user->hasPermission('supervision.review'))) {
            return ApiResponse::forbidden('غير مصرح لك بإغلاق طلب الاستكمال. هذه العملية مخصصة للمشرف الوزاري فقط.');
        }

        $completionRequest = CompletionRequest::with(['submission.report.evaluation'])->find($id);
        if (!$completionRequest) {
            return ApiResponse::notFound('طلب الاستكمال المطلوب غير موجود.');
        }

        if ($completionRequest->status === 'Resolved') {
            return ApiResponse::validationError([
                'request' => ['طلب الاستكمال مغلق ومحلول نهائياً مسبقاً.'],
            ], 'طلب الاستكمال مغلق ومحلول نهائياً مسبقاً.');
        }

        DB::transaction(function () use ($completionRequest, $user) {
            // تحديث طلب الاستكمال إلى Resolved
            $completionRequest->status = 'Resolved';
            $completionRequest->resolved_at = now();
            $completionRequest->save();

            // تحديث التقييم إلى Completed
            $evaluation = $completionRequest->evaluation;
            if ($evaluation) {
                $evaluation->status = 'Completed';
                $evaluation->updated_at = now();
                $evaluation->save();
            }

            // تحديث التقرير إلى Final وآخر محاولة إلى Completed
            $report = $completionRequest->submission?->report;
            if ($report) {
                $report->status = 'Final';
                $report->save();

                EvaluationSubmission::where('report_id', $report->report_id)
                    ->orderBy('attempt_no', 'desc')
                    ->limit(1)
                    ->update(['status' => 'Completed']);
            }
        });

        return ApiResponse::success(
            data: [
                'requestId' => $completionRequest->request_id,
                'status' => 'Resolved',
                'resolvedAt' => $completionRequest->resolved_at?->toIso8601ZuluString(),
                'resolvedBy' => [
                    'userId' => $user->user_id,
                    'name' => $user->full_name,
                ],
                'evaluationStatus' => 'Completed',
            ],
            message: 'تم إغلاق طلب الاستكمال بنجاح واعتماد ملف التقييم نهائياً (Completed).'
        );
    }
}
