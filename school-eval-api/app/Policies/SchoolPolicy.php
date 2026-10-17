<?php

namespace App\Policies;

use App\Models\School;
use App\Models\User;

/**
 * سياسة التحقق من الوصول وإدارة المدارس (SchoolPolicy).
 *
 * القواعد:
 * 1. عرض المدرسة (view):
 *    - مسؤول النظام: مسموح (schools.manage).
 *    - المشرف الوزاري / مسؤول المعايير: مسموح (الاطلاع العام ضمن الوزارة).
 *    - مستخدم المدرسة (مدير أو مقيم): مسموح فقط إذا كانت school_id تطابق مدرسته حصراً (العزل المؤسسي).
 * 2. إدارة وتعديل المدرسة (update / manage):
 *    - محصور بمسؤول النظام (schools.manage).
 */
class SchoolPolicy
{
    /**
     * هل يحق للمستخدم استعراض قائمة المدارس؟
     */
    public function viewAny(User $user): bool
    {
        // مسؤول النظام أو المستخدم الوزاري يرى قائمة المدارس
        if ($user->user_type === 'system' || $user->user_type === 'ministry') {
            return true;
        }

        // مستخدم المدرسة يمكنه الاستعلام، لكن نتائجه ستكون محصورة بمدرسته فقط
        return $user->user_type === 'school' && $user->school_id !== null;
    }

    /**
     * هل يحق للمستخدم استعراض بيانات مدرسة محددة؟
     */
    public function view(User $user, School $school): bool
    {
        // مسؤول النظام يملك صلاحية إدارة المدارس
        if ($user->user_type === 'system' && $user->hasPermission('schools.manage')) {
            return true;
        }

        // المستخدم الوزاري يرى كافة المدارس
        if ($user->user_type === 'ministry') {
            return true;
        }

        // مستخدم المدرسة لا يرى إلا مدرسته حصراً (العزل بين المدارس - NFR-SEC-03)
        if ($user->user_type === 'school') {
            return (int) $user->school_id === (int) $school->school_id;
        }

        return false;
    }

    /**
     * هل يحق للمستخدم إنشاء مدرسة جديدة؟
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('schools.manage');
    }

    /**
     * هل يحق للمستخدم تحديث بيانات المدرسة؟
     */
    public function update(User $user, School $school): bool
    {
        return $user->hasPermission('schools.manage');
    }

    /**
     * هل يحق للمستخدم حذف المدرسة؟ (محظور بموجب سياسة تعطيل لا حذف).
     */
    public function delete(User $user, School $school): bool
    {
        return false;
    }
}
