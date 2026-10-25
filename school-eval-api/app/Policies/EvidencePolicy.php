<?php

namespace App\Policies;

use App\Models\Evaluation;
use App\Models\Evidence;
use App\Models\User;
use App\Services\EvaluationLockChecker;

/**
 * سياسة إدارة الشواهد والأدلة الداعمة (EvidencePolicy).
 *
 * القواعد:
 * 1. view:
 *    - الوزارة: مسموح للاطلاع والتدقيق.
 *    - منسوبو المدرسة: محصور بمدرستهم فقط (العزل المؤسسي).
 *    - مسؤول النظام: محظور قطعياً (فصل السلطات BR-GEN-06).
 * 2. manage:
 *    - محصور بمقيم المدرسة لمدرسته فقط مع امتلاك صلاحية evidence.manage.
 *    - التحقق من قفل التقييم عبر EvaluationLockChecker (BR-SCH-03).
 */
class EvidencePolicy
{
    /**
     * التحقق من صلاحية الاطلاع على الشاهد.
     */
    public function view(User $user, Evidence $evidence): bool
    {
        if ($user->user_type === 'system') {
            return false;
        }

        if ($user->user_type === 'ministry') {
            return $user->hasPermission('evaluations.view')
                || $user->hasPermission('reports.view')
                || $user->hasPermission('supervision.review');
        }

        if ($user->user_type === 'school') {
            $evidenceSchoolId = $evidence->result?->evaluation?->school_id;
            return (int) $user->school_id === (int) $evidenceSchoolId
                && ($user->hasPermission('evaluations.view') || $user->hasPermission('evidence.manage'));
        }

        return false;
    }

    /**
     * التحقق من صلاحية إدارة الشاهد (رفع نسخ جديدة).
     */
    public function manage(User $user, Evidence $evidence): bool
    {
        if ($user->user_type !== 'school') {
            return false;
        }

        $evaluation = $evidence->result?->evaluation;
        if (!$evaluation) {
            return false;
        }

        // العزل المؤسسي
        if ((int) $user->school_id !== (int) $evaluation->school_id) {
            return false;
        }

        if (!$user->hasPermission('evidence.manage')) {
            return false;
        }

        $lockCheck = EvaluationLockChecker::canModifyEvidence($evaluation, $evidence);
        return $lockCheck['allowed'];
    }

    /**
     * التحقق من صلاحية إنشاء شاهد جديد لتقييم محدد.
     */
    public function createForEvaluation(User $user, Evaluation $evaluation): bool
    {
        if ($user->user_type !== 'school') {
            return false;
        }

        if ((int) $user->school_id !== (int) $evaluation->school_id) {
            return false;
        }

        if (!$user->hasPermission('evidence.manage')) {
            return false;
        }

        return !EvaluationLockChecker::isEvaluationLocked($evaluation);
    }
}
