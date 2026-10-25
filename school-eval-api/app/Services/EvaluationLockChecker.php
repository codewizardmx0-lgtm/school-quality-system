<?php

namespace App\Services;

use App\Models\CompletionRequestItem;
use App\Models\Evaluation;
use App\Models\EvaluationSubmission;
use App\Models\Evidence;

/**
 * خدمة مركزية للتحقق من حالة قفل التقييم وفق قاعدة العمل BR-SCH-03.
 *
 * القواعد المعتمدة:
 * 1. مقفل:
 *    - آخر تسليم للتقرير (بأعلى attempt_no) حالته Submitted أو UnderReview أو Completed.
 *    - أو evaluations.status = Completed (حماية احتياطية بدون تغيير القيمة).
 * 2. مفتوح:
 *    - لا يوجد تقرير أو لا يوجد تسليم، أو كان آخر تسليم بحالة مسودة (Draft).
 * 3. طلب استكمال (NeedsCompletion):
 *    - التعديل ورفع نسخ الشواهد مسموح فقط للبنود الواردة في completion_request_items المفتوحة (Pending).
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
     * @return array{allowed: bool, reason: string|null, isNeedsCompletion: bool, submission: EvaluationSubmission|null}
     */
    public static function checkEvaluationGeneralStatus(Evaluation $evaluation): array
    {
        // حماية احتياطية: التقييم معلّم كمكتمل في جدوله
        if ($evaluation->status === 'Completed') {
            return [
                'allowed' => false,
                'reason' => 'ملف التقييم مكتمل ومقفل نهائياً (BR-SCH-03).',
                'isNeedsCompletion' => false,
                'submission' => null,
            ];
        }

        // جلب آخر محاولة تسليم مرتبطة بتقارير هذا التقييم
        $latestSubmission = EvaluationSubmission::query()
            ->whereHas('report', function ($q) use ($evaluation) {
                $q->where('evaluation_id', $evaluation->evaluation_id);
            })
            ->orderBy('attempt_no', 'desc')
            ->first();

        // في حال عدم وجود أي تسليم أو كان التسليم الأخير مسودة Draft
        if (!$latestSubmission || $latestSubmission->status === 'Draft') {
            return [
                'allowed' => true,
                'reason' => null,
                'isNeedsCompletion' => false,
                'submission' => $latestSubmission,
            ];
        }

        // في حال كان آخر تسليم في مرحلة الاستكمال NeedsCompletion
        if ($latestSubmission->status === 'NeedsCompletion') {
            return [
                'allowed' => true, // التعديل مشروط بالبنود
                'reason' => null,
                'isNeedsCompletion' => true,
                'submission' => $latestSubmission,
            ];
        }

        // الحالات المقفلة تماماً: Submitted, UnderReview, Completed
        $statusLabels = [
            'Submitted' => 'تم الإرسال وبانتظار المراجعة الوزارية',
            'UnderReview' => 'قيد المراجعة والتدقيق الإشرافي',
            'Completed' => 'معتمد ومكتمل نهائياً',
        ];

        $statusText = $statusLabels[$latestSubmission->status] ?? $latestSubmission->status;

        return [
            'allowed' => false,
            'reason' => "ملف التقييم مقفل بعد إرساله النهائي وهو حالياً ({$statusText}) (BR-SCH-03).",
            'isNeedsCompletion' => false,
            'submission' => $latestSubmission,
        ];
    }

    /**
     * التحقق مما إذا كان بالإمكان رصد أو تعديل درجة مؤشر محدد.
     *
     * @return array{allowed: bool, message: string|null}
     */
    public static function canModifyIndicator(Evaluation $evaluation, int $indicatorId): array
    {
        $general = self::checkEvaluationGeneralStatus($evaluation);

        if (!$general['allowed']) {
            return [
                'allowed' => false,
                'message' => $general['reason'],
            ];
        }

        // إذا لم يكن في حالة NeedsCompletion فالتقييم مفتوح بالكامل
        if (!$general['isNeedsCompletion']) {
            return [
                'allowed' => true,
                'message' => null,
            ];
        }

        // في حالة NeedsCompletion: التحقق من وجود بند استكمال مفتوح لهذا المؤشر
        $submission = $general['submission'];
        $hasOpenItem = CompletionRequestItem::query()
            ->whereHas('request', function ($q) use ($submission) {
                $q->where('submission_id', $submission->submission_id)
                  ->where('status', '!=', 'Resolved');
            })
            ->where('indicator_id', $indicatorId)
            ->where('status', '!=', 'Resolved')
            ->exists();

        if ($hasOpenItem) {
            return [
                'allowed' => true,
                'message' => null,
            ];
        }

        return [
            'allowed' => false,
            'message' => 'ملف التقييم في مرحلة استكمال الملاحظات، ولا يُسمح بتعديل هذا المؤشر لأنه ليس ضمن بنود طلب الاستكمال المفتوحة (BR-SCH-03).',
        ];
    }

    /**
     * التحقق مما إذا كان بالإمكان رفع نسخة جديدة لشاهد محدد.
     *
     * @return array{allowed: bool, message: string|null}
     */
    public static function canModifyEvidence(Evaluation $evaluation, Evidence $evidence): array
    {
        $general = self::checkEvaluationGeneralStatus($evaluation);

        if (!$general['allowed']) {
            return [
                'allowed' => false,
                'message' => $general['reason'],
            ];
        }

        if (!$general['isNeedsCompletion']) {
            return [
                'allowed' => true,
                'message' => null,
            ];
        }

        $submission = $general['submission'];
        $hasOpenItem = CompletionRequestItem::query()
            ->whereHas('request', function ($q) use ($submission) {
                $q->where('submission_id', $submission->submission_id)
                  ->where('status', '!=', 'Resolved');
            })
            ->where(function ($q) use ($evidence) {
                $q->where('evidence_id', $evidence->evidence_id)
                  ->orWhere('indicator_id', $evidence->indicator_id);
            })
            ->where('status', '!=', 'Resolved')
            ->exists();

        if ($hasOpenItem) {
            return [
                'allowed' => true,
                'message' => null,
            ];
        }

        return [
            'allowed' => false,
            'message' => 'ملف التقييم في مرحلة استكمال الملاحظات، ولا يُسمح برفع نسخة جديدة لهذا الشاهد لأنه ليس ضمن بنود طلب الاستكمال المفتوحة (BR-SCH-03).',
        ];
    }
}
