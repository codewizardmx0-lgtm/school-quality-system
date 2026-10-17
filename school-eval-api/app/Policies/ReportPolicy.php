<?php

namespace App\Policies;

use App\Models\Report;
use App\Models\User;

/**
 * سياسة تقارير التقييم (ReportPolicy).
 *
 * القواعد:
 * 1. view:
 *    - المشرف الوزاري: مسموح (reports.view).
 *    - مسؤول المعايير: ممنوع قطعياً (BR-MIN-01: مسؤول المعايير لا يراجع مخرجات المدارس).
 *    - مسؤولو المدرسة (مدير أو مقيم): مسموح فقط إذا كان التقرير يتبع تقييم مدرستهم حصراً (reports.view).
 * 2. generate (إنشاء التقرير الأولي):
 *    - محصور بمستخدم التقييم في المدرسة (reports.generate) لمدرسته فقط.
 * 3. internalReview (تدوين الملاحظات الداخلية):
 *    - محصور بمدير المدرسة (reviews.write) لمدرسته فقط.
 */
class ReportPolicy
{
    /**
     * هل يحق للمستخدم استعراض تقرير تقييم معين؟
     */
    public function view(User $user, Report $report): bool
    {
        // مسؤول النظام محظور
        if ($user->user_type === 'system') {
            return false;
        }

        // مسؤول المعايير محظور صراحة وفق BR-MIN-01
        if ($user->hasRole('ministry_standards_manager')) {
            return false;
        }

        // المشرف الوزاري يملك reports.view
        if ($user->user_type === 'ministry') {
            return $user->hasPermission('reports.view');
        }

        // مستخدم المدرسة: التحقق من reports.view والعزل المدرسي عبر evaluation
        if ($user->user_type === 'school') {
            $reportSchoolId = $report->evaluation?->school_id;
            return $user->hasPermission('reports.view')
                && (int) $user->school_id === (int) $reportSchoolId;
        }

        return false;
    }

    /**
     * هل يحق للمستخدم توليد تقرير التقييم؟
     */
    public function generate(User $user, Report $report): bool
    {
        if ($user->user_type !== 'school') {
            return false;
        }

        $reportSchoolId = $report->evaluation?->school_id;
        if ((int) $user->school_id !== (int) $reportSchoolId) {
            return false;
        }

        return $user->hasPermission('reports.generate');
    }

    /**
     * هل يحق للمستخدم كتابة ملاحظة مراجعة داخلية على التقرير؟
     */
    public function addInternalNote(User $user, Report $report): bool
    {
        if ($user->user_type !== 'school') {
            return false;
        }

        $reportSchoolId = $report->evaluation?->school_id;
        if ((int) $user->school_id !== (int) $reportSchoolId) {
            return false;
        }

        return $user->hasPermission('reviews.write');
    }
}
