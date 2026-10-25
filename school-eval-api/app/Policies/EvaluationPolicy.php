<?php

namespace App\Policies;

use App\Models\Evaluation;
use App\Models\User;
use App\Services\EvaluationLockChecker;

/**
 * سياسة الوصول لملفات التقييم الذاتي (EvaluationPolicy).
 *
 * القواعد:
 * 1. view:
 *    - الوزارة (مشرف وزارى): مسموح للاطلاع والتدقيق (evaluations.view).
 *    - منسوبو المدرسة (مدير ومقيم): مسموح فقط إذا كان ملف التقييم يخص مدرستهم (school_id) ويملكون evaluations.view.
 *    - مسؤول النظام: ممنوع قطعياً (BR-GEN-06: مسؤول النظام لا ينفذ التقييم).
 * 2. create:
 *    - محصور بمستخدم التقييم في المدرسة (evaluations.create) لمدرسته فقط.
 * 3. edit:
 *    - محصور بمستخدم التقييم في المدرسة (evaluations.edit) لمدرسته فقط، وما دام التقييم غير مقفل.
 * 4. submit:
 *    - محصور بمستخدم التقييم في المدرسة (evaluations.submit) لمدرسته فقط (BR-SCH-02 / FR-SCH-33).
 */
class EvaluationPolicy
{
    /**
     * هل يحق للمستخدم استعراض تقييمات عامة؟
     */
    public function viewAny(User $user): bool
    {
        // مسؤول النظام محظور من التقييم
        if ($user->user_type === 'system') {
            return false;
        }

        return $user->hasPermission('evaluations.view');
    }

    /**
     * هل يحق للمستخدم استعراض ملف تقييم محدد؟
     */
    public function view(User $user, Evaluation $evaluation): bool
    {
        // مسؤول النظام محظور قطعياً
        if ($user->user_type === 'system') {
            return false;
        }

        // المستخدم الوزاري يملك صلاحية الاطلاع على التقييمات
        if ($user->user_type === 'ministry') {
            return $user->hasPermission('evaluations.view');
        }

        // مستخدم المدرسة: يجب أن يملك الصلاحية وتكون المدرسة مطابقة حصراً (عزل المدارس)
        if ($user->user_type === 'school') {
            return $user->hasPermission('evaluations.view')
                && (int) $user->school_id === (int) $evaluation->school_id;
        }

        return false;
    }

    /**
     * هل يحق للمستخدم إنشاء تقييم جديد؟
     */
    public function create(User $user): bool
    {
        if ($user->user_type !== 'school') {
            return false;
        }

        return $user->hasPermission('evaluations.create');
    }

    /**
     * هل يحق للمستخدم تعديل نتائج التقييم؟
     */
    public function update(User $user, Evaluation $evaluation): bool
    {
        if ($user->user_type !== 'school') {
            return false;
        }

        // عزل المدارس + امتلاك صلاحية التعديل
        if ((int) $user->school_id !== (int) $evaluation->school_id) {
            return false;
        }

        if (!$user->hasPermission('evaluations.edit')) {
            return false;
        }

        // فحص قفل التقييم العام (BR-SCH-03)
        if (EvaluationLockChecker::isEvaluationLocked($evaluation)) {
            return false;
        }

        return true;
    }

    /**
     * هل يحق للمستخدم إجراء الإرسال النهائي لملف التقييم؟
     */
    public function submit(User $user, Evaluation $evaluation): bool
    {
        // الإرسال النهائي لمستخدم التقييم في المدرسة وحده (BR-SCH-02)
        if ($user->user_type !== 'school') {
            return false;
        }

        if ((int) $user->school_id !== (int) $evaluation->school_id) {
            return false;
        }

        return $user->hasPermission('evaluations.submit');
    }
}
