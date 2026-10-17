<?php

namespace App\Policies;

use App\Models\EvaluationSubmission;
use App\Models\User;

/**
 * سياسة تسليمات التقييم وطلبات الاستكمال (EvaluationSubmissionPolicy).
 *
 * القواعد:
 * 1. view:
 *    - المشرف الوزاري: مسموح (supervision.review / reports.view).
 *    - مسؤول المعايير: ممنوع قطعياً (BR-MIN-01).
 *    - مسؤولو المدرسة: مسموح فقط إذا كان التسليم خاصاً بمدرستهم.
 * 2. review / startReview / supervisorNotes:
 *    - محصور بالمشرف الوزاري (supervision.review).
 * 3. requestCompletion:
 *    - محصور بالمشرف الوزاري (completion.request).
 */
class EvaluationSubmissionPolicy
{
    /**
     * هل يحق للمستخدم استعراض التسليم؟
     */
    public function view(User $user, EvaluationSubmission $submission): bool
    {
        if ($user->user_type === 'system') {
            return false;
        }

        // مسؤول المعايير محظور صراحة وفق BR-MIN-01
        if ($user->hasRole('ministry_standards_manager')) {
            return false;
        }

        if ($user->user_type === 'ministry') {
            return $user->hasPermission('supervision.review') || $user->hasPermission('reports.view');
        }

        if ($user->user_type === 'school') {
            $schoolId = $submission->report?->evaluation?->school_id;
            return (int) $user->school_id === (int) $schoolId;
        }

        return false;
    }

    /**
     * هل يحق للمستخدم مراجعة التسليم وتدوين ملاحظات إشرافية؟
     */
    public function review(User $user, EvaluationSubmission $submission): bool
    {
        if ($user->user_type !== 'ministry') {
            return false;
        }

        return $user->hasPermission('supervision.review');
    }

    /**
     * هل يحق للمستخدم إصدار طلب استكمال للمدرسة؟
     */
    public function requestCompletion(User $user, EvaluationSubmission $submission): bool
    {
        if ($user->user_type !== 'ministry') {
            return false;
        }

        return $user->hasPermission('completion.request');
    }
}
