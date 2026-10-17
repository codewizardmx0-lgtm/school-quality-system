<?php

namespace App\Policies;

use App\Models\ImprovementPlan;
use App\Models\User;

/**
 * سياسة خطط التحسين المدرسي (ImprovementPlanPolicy).
 *
 * القواعد:
 * 1. view:
 *    - الوزارة / المشرف: مسموح إذا كان يملك الصلاحية.
 *    - المدرسة (مدير أو مقيم): مسموح فقط إذا كانت الخطة تتبع لمدرستهم حصراً (plans.view).
 * 2. manage (create / update):
 *    - محصور بمستخدم التقييم في المدرسة (plans.manage) ولمدرسته فقط.
 * 3. review (كتابة ملاحظات المراجعة):
 *    - محصور بمدير المدرسة (reviews.write) ولمدرسته فقط (UC-PRIN-01).
 */
class ImprovementPlanPolicy
{
    /**
     * هل يحق للمستخدم استعراض قائمة الخطط؟
     */
    public function viewAny(User $user): bool
    {
        if ($user->user_type === 'system') {
            return false;
        }

        return $user->hasPermission('plans.view');
    }

    /**
     * هل يحق للمستخدم استعراض تفاصيل خطة تحسين معينة؟
     */
    public function view(User $user, ImprovementPlan $plan): bool
    {
        if ($user->user_type === 'system') {
            return false;
        }

        if ($user->user_type === 'ministry') {
            return $user->hasPermission('plans.view');
        }

        if ($user->user_type === 'school') {
            return $user->hasPermission('plans.view')
                && (int) $user->school_id === (int) $plan->school_id;
        }

        return false;
    }

    /**
     * هل يحق للمستخدم إنشاء خطة تحسين جديدة؟
     */
    public function create(User $user): bool
    {
        if ($user->user_type !== 'school') {
            return false;
        }

        return $user->hasPermission('plans.manage');
    }

    /**
     * هل يحق للمستخدم تحديث وإدارة خطة التحسين وإجراءاتها؟
     */
    public function update(User $user, ImprovementPlan $plan): bool
    {
        if ($user->user_type !== 'school') {
            return false;
        }

        if ((int) $user->school_id !== (int) $plan->school_id) {
            return false;
        }

        return $user->hasPermission('plans.manage');
    }

    /**
     * هل يحق للمستخدم تدوين ملاحظات مراجعة على الخطة؟
     */
    public function review(User $user, ImprovementPlan $plan): bool
    {
        if ($user->user_type !== 'school') {
            return false;
        }

        if ((int) $user->school_id !== (int) $plan->school_id) {
            return false;
        }

        return $user->hasPermission('reviews.write');
    }
}
