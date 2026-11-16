<?php

namespace App\Services;

use App\Models\CompletionRequest;
use App\Models\CompletionRequestItem;
use App\Models\Evaluation;
use App\Models\EvaluationSubmission;
use App\Models\EvidenceLink;

/**
 * خدمة مركزية للتحقق من حالة قفل التقييم وفق قاعدة العمل BR-SCH-03 (U-03, U-11, U-29).
 *
 * القواعد المعتمدة:
 * 1. مقفل نهائياً:
 *    - التقييم بحالة Completed أو التقرير بحالة Final.
 * 2. مقفل للمراجعة:
 *    - التقييم بحالة Submitted أو UnderReview.
 * 3. طلب استكمال (NeedsCompletion):
 *    - إذا انتهت مهلة completion_deadline دون تمديد: مقفل برمز 422.
 *    - إذا كانت المهلة سارية: يُسمح بالتعديل المشروط فقط للمؤشرات والشواهد المستهدفة ببند مفتوح.
 *    - استثناء رسمي مشروط (Grace Period - U-11): يُسمح بالمعالجة أثناء المهلة حتى لو انتهت الدورة.
 * 4. مفتوح:
 *    - في حالة InProgress ومسودة Draft قبل التسليم الأول.
 */
class EvaluationLockChecker
{
    /**
     * هل التقييم مقفل بشكل عام عن أي تعديل أساسي؟
     */
    public static function isEvaluationLocked(Evaluation $evaluation): bool
    {
        $status = self::checkEvaluationGeneralStatus($evaluation);
        return !$status['allowed'];
    }

    /**
     * فحص الحالة العامة للتقييم مع إرجاع سبب القفل إن وجد.
     *
     * @return array{allowed: bool, reason: string|null, isNeedsCompletion: bool, submission: EvaluationSubmission|null, request: CompletionRequest|null, errorKey: string|null}
     */
    public static function checkEvaluationGeneralStatus(Evaluation $evaluation): array
    {
        // 1. حماية التقييم المكتمل نهائياً
        if ($evaluation->status === 'Completed') {
            return [
                'allowed' => false,
                'reason' => 'ملف التقييم مكتمل ومقفل نهائياً (BR-SCH-03).',
                'isNeedsCompletion' => false,
                'submission' => null,
                'request' => null,
                'errorKey' => 'evaluation',
            ];
        }

        // 2. جلب آخر محاولة تسليم مرتبطة بالتقييم
        $latestSubmission = EvaluationSubmission::query()
            ->whereHas('report', function ($q) use ($evaluation) {
                $q->where('evaluation_id', $evaluation->evaluation_id);
            })
            ->orderBy('attempt_no', 'desc')
            ->first();

        // 3. فحص حالة الاستكمال NeedsCompletion والمهلة المرتبطة
        $activeRequest = null;
        $isNeedsCompletion = false;

        if ($evaluation->status === 'NeedsCompletion' || ($latestSubmission && $latestSubmission->status === 'NeedsCompletion')) {
            $isNeedsCompletion = true;
            $activeRequest = $latestSubmission ? $latestSubmission->latestCompletionRequest() : null;

            if (!$activeRequest) {
                $activeRequest = CompletionRequest::query()
                    ->whereHas('submission.report', function ($q) use ($evaluation) {
                        $q->where('evaluation_id', $evaluation->evaluation_id);
                    })
                    ->orderBy('request_id', 'desc')
                    ->first();
            }

            // فحص المهلة المحددة
            if ($activeRequest && $activeRequest->isExpired()) {
                return [
                    'allowed' => false,
                    'reason' => 'انتهت مهلة استكمال الملاحظات المحددة من المشرف الوزاري دون تمديد، والتقييم مقفل حالياً (422).',
                    'isNeedsCompletion' => false,
                    'submission' => $latestSubmission,
                    'request' => $activeRequest,
                    'errorKey' => 'deadline',
                ];
            }
        }

        // 4. التحقق من حالة وتاريخ دورة التقييم (FR-SCH-01 / U-11 / U-29)
        $cycle = $evaluation->cycle;
        if ($cycle) {
            $isCycleClosed = ($cycle->status === 'Closed');

            if ($isCycleClosed) {
                // استثناء رسمي مشروط (Grace Period - U-11):
                // إذا كان التقييم في مرحلة استكمال الملاحظات ولديه مهلة سارية، يُسمح له بالمعالجة كاستثناء
                if ($isNeedsCompletion && $activeRequest && !$activeRequest->isExpired()) {
                    // يُسمح بمتابعة الاستكمال
                } else {
                    return [
                        'allowed' => false,
                        'reason' => 'دورة التقييم مغلقة حالياً ولا يُسمح بأي عمليات رصد أو تعديل (FR-SCH-01).',
                        'isNeedsCompletion' => false,
                        'submission' => null,
                        'request' => null,
                        'errorKey' => 'cycle',
                    ];
                }
            }
        }

        // 5. فحص حالات التسليم للمراجعة (Submitted / UnderReview)
        if ($evaluation->status === 'Submitted') {
            return [
                'allowed' => false,
                'reason' => 'ملف التقييم مسلّم وبانتظار المراجعة الوزارية ولا يمكن تعديله (BR-SCH-03).',
                'isNeedsCompletion' => false,
                'submission' => $latestSubmission,
                'request' => null,
                'errorKey' => 'evaluation',
            ];
        }

        if ($evaluation->status === 'UnderReview') {
            return [
                'allowed' => false,
                'reason' => 'ملف التقييم قيد المراجعة والتدقيق الإشرافي ولا يمكن تعديله (BR-SCH-03).',
                'isNeedsCompletion' => false,
                'submission' => $latestSubmission,
                'request' => null,
                'errorKey' => 'evaluation',
            ];
        }

        if ($latestSubmission && in_array($latestSubmission->status, ['Submitted', 'UnderReview', 'Completed'])) {
            $statusLabels = [
                'Submitted' => 'تم الإرسال وبانتظار المراجعة الوزارية',
                'UnderReview' => 'قيد المراجعة والتدقيق الإشرافي',
                'Completed' => 'معتمد ومكتمل نهائياً',
            ];
            $statusText = $statusLabels[$latestSubmission->status] ?? $latestSubmission->status;

            return [
                'allowed' => false,
                'reason' => "ملف التقييم مقفل بعد إرساله وهو حالياً ({$statusText}) (BR-SCH-03).",
                'isNeedsCompletion' => false,
                'submission' => $latestSubmission,
                'request' => null,
                'errorKey' => 'evaluation',
            ];
        }

        // 6. في حال الاستكمال داخل المهلة
        if ($isNeedsCompletion) {
            return [
                'allowed' => false, // مقفل بشكل عام، والتعديل مشروط بالبنود الواردة في الطلب عبر canModifyIndicator
                'reason' => 'ملف التقييم في مرحلة استكمال الملاحظات، ولا يُسمح بالتعديل إلا للمؤشرات والشواهد المحددة في طلب الاستكمال (BR-SCH-03).',
                'isNeedsCompletion' => true,
                'submission' => $latestSubmission,
                'request' => $activeRequest,
                'errorKey' => 'evaluation',
            ];
        }

        // 7. الحالة المفتوحة (InProgress ومسودة Draft)
        return [
            'allowed' => true,
            'reason' => null,
            'isNeedsCompletion' => false,
            'submission' => $latestSubmission,
            'request' => null,
            'errorKey' => null,
        ];
    }

    /**
     * التحقق مما إذا كان بالإمكان رصد أو تعديل درجة مؤشر محدد.
     *
     * @return array{allowed: bool, message: string|null, errorKey?: string|null}
     */
    public static function canModifyIndicator(Evaluation $evaluation, int $indicatorId): array
    {
        $general = self::checkEvaluationGeneralStatus($evaluation);

        if (!$general['allowed'] && !$general['isNeedsCompletion']) {
            return [
                'allowed' => false,
                'message' => $general['reason'],
                'errorKey' => $general['errorKey'] ?? 'evaluation',
            ];
        }

        // في حال انتهاء المهلة أثناء الاستكمال
        if ($general['isNeedsCompletion'] && $general['request'] && $general['request']->isExpired()) {
            return [
                'allowed' => false,
                'message' => 'انتهت مهلة استكمال الملاحظات المحددة من المشرف الوزاري دون تمديد، والتقييم مقفل حالياً (422).',
                'errorKey' => 'deadline',
            ];
        }

        // إذا لم يكن في حالة NeedsCompletion فالتقييم مفتوح بالكامل
        if (!$general['isNeedsCompletion']) {
            return [
                'allowed' => true,
                'message' => null,
                'errorKey' => null,
            ];
        }

        // في حالة NeedsCompletion: التحقق من وجود بند استكمال مفتوح لهذا المؤشر
        $request = $general['request'];
        $hasOpenItem = false;

        if ($request) {
            $hasOpenItem = $request->items()
                ->where('indicator_id', $indicatorId)
                ->whereIn('status', ['pending', 'Pending'])
                ->exists();
        }

        if ($hasOpenItem) {
            return [
                'allowed' => true,
                'message' => null,
                'errorKey' => null,
            ];
        }

        return [
            'allowed' => false,
            'message' => 'ملف التقييم في مرحلة استكمال الملاحظات، ولا يُسمح بتعديل هذا المؤشر لأنه ليس ضمن بنود طلب الاستكمال المفتوحة (BR-SCH-03).',
            'errorKey' => 'evaluation',
        ];
    }

    /**
     * التحقق مما إذا كان بالإمكان رفع أو ربط أو فك ارتباط شاهد لمؤشر محدد.
     *
     * @return array{allowed: bool, message: string|null, errorKey?: string|null}
     */
    public static function canModifyEvidenceLink(Evaluation $evaluation, int $indicatorId, ?int $evidenceLinkId = null): array
    {
        $general = self::checkEvaluationGeneralStatus($evaluation);

        if (!$general['allowed'] && !$general['isNeedsCompletion']) {
            return [
                'allowed' => false,
                'message' => $general['reason'],
                'errorKey' => $general['errorKey'] ?? 'evaluation',
            ];
        }

        // في حال انتهاء المهلة أثناء الاستكمال
        if ($general['isNeedsCompletion'] && $general['request'] && $general['request']->isExpired()) {
            return [
                'allowed' => false,
                'message' => 'انتهت مهلة استكمال الملاحظات المحددة من المشرف الوزاري دون تمديد، والتقييم مقفل حالياً (422).',
                'errorKey' => 'deadline',
            ];
        }

        if (!$general['isNeedsCompletion']) {
            return [
                'allowed' => true,
                'message' => null,
                'errorKey' => null,
            ];
        }

        $request = $general['request'];
        $hasOpenItem = false;

        if ($request) {
            $query = $request->items()
                ->whereIn('status', ['pending', 'Pending']);

            if ($evidenceLinkId) {
                $query->where(function ($q) use ($indicatorId, $evidenceLinkId) {
                    $q->where('evidence_link_id', $evidenceLinkId)
                      ->orWhere('indicator_id', $indicatorId);
                });
            } else {
                $query->where('indicator_id', $indicatorId);
            }

            $hasOpenItem = $query->exists();
        }

        if ($hasOpenItem) {
            return [
                'allowed' => true,
                'message' => null,
                'errorKey' => null,
            ];
        }

        return [
            'allowed' => false,
            'message' => 'ملف التقييم في مرحلة استكمال الملاحظات، ولا يُسمح بتعديل شواهد هذا المؤشر لأنه ليس ضمن بنود طلب الاستكمال المفتوحة (BR-SCH-03).',
            'errorKey' => 'evaluation',
        ];
    }
}

