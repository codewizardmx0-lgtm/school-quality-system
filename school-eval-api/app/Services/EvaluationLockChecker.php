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
        // 0. التحقق من حالة دورة التقييم (FR-SCH-01)
        // ملاحظة: يُطبق فحص الحالة Closed وتُستثنى التواريخ حالياً نظراً لأن تاريخ نهاية الدورة بالسيدرز (2026-06-30) لا يغطي تاريخ اليوم.
        $cycle = $evaluation->cycle;
        if ($cycle && $cycle->status === 'Closed') {
            return [
                'allowed' => false,
                'reason' => 'دورة التقييم مغلقة حالياً ولا يُسمح بأي عمليات رصد أو تعديل (FR-SCH-01).',
                'isNeedsCompletion' => false,
                'submission' => null,
                'errorKey' => 'cycle',
            ];
        }

        // حماية احتياطية: التقييم معلّم كمكتمل في جدوله
        if ($evaluation->status === 'Completed') {
            return [
                'allowed' => false,
                'reason' => 'ملف التقييم مكتمل ومقفل نهائياً (BR-SCH-03).',
                'isNeedsCompletion' => false,
                'submission' => null,
                'errorKey' => 'evaluation',
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
                'errorKey' => null,
            ];
        }

        // في حال كان آخر تسليم في مرحلة الاستكمال NeedsCompletion
        if ($latestSubmission->status === 'NeedsCompletion') {
            return [
                'allowed' => true, // التعديل مشروط بالبنود
                'reason' => null,
                'isNeedsCompletion' => true,
                'submission' => $latestSubmission,
                'errorKey' => null,
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
            'errorKey' => 'evaluation',
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

        if (!$general['allowed']) {
            return [
                'allowed' => false,
                'message' => $general['reason'],
                'errorKey' => $general['errorKey'] ?? 'evaluation',
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
     * التحقق مما إذا كان بالإمكان رفع نسخة جديدة لشاهد محدد.
     *
     * @return array{allowed: bool, message: string|null, errorKey?: string|null}
     */
    public static function canModifyEvidence(Evaluation $evaluation, Evidence $evidence): array
    {
        $general = self::checkEvaluationGeneralStatus($evaluation);

        if (!$general['allowed']) {
            return [
                'allowed' => false,
                'message' => $general['reason'],
                'errorKey' => $general['errorKey'] ?? 'evaluation',
            ];
        }

        if (!$general['isNeedsCompletion']) {
            return [
                'allowed' => true,
                'message' => null,
                'errorKey' => null,
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
                'errorKey' => null,
            ];
        }

        return [
            'allowed' => false,
            'message' => 'ملف التقييم في مرحلة استكمال الملاحظات، ولا يُسمح برفع نسخة جديدة لهذا الشاهد لأنه ليس ضمن بنود طلب الاستكمال المفتوحة (BR-SCH-03).',
            'errorKey' => 'evaluation',
        ];
    }
}
