<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * طلب التحقق لإنشاء حساب مستخدم جديد (UI-ADM-05).
 */
class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('users.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'username'   => ['required', 'string', 'max:50', 'unique:users,username'],
            'password'   => ['required', 'string', 'min:8'],
            'fullName'   => ['required', 'string', 'max:150'],
            'email'      => ['required', 'email', 'max:150', 'unique:users,email'],
            'userType'   => ['required', 'string', 'in:school,ministry,system'],
            'schoolId'   => ['nullable', 'required_if:userType,school', 'exists:schools,school_id'],
            'ministryId' => ['nullable', 'required_if:userType,ministry', 'exists:ministries,ministry_id'],
            'roleId'     => ['required', 'integer', 'exists:roles,role_id'],
            'status'     => ['required', 'string', 'in:Active,Disabled'],
        ];
    }

    public function messages(): array
    {
        return [
            'username.required'        => 'اسم المستخدم مطلوب.',
            'username.unique'          => 'اسم المستخدم مسجل مسبقاً في النظام.',
            'password.required'        => 'كلمة المرور مطلوبة.',
            'password.min'             => 'كلمة المرور يجب ألا تقل عن 8 أحرف.',
            'fullName.required'        => 'الاسم الكامل مطلوب.',
            'email.required'           => 'البريد الإلكتروني مطلوب.',
            'email.email'              => 'صيغة البريد الإلكتروني غير صحيحة.',
            'email.unique'             => 'البريد الإلكتروني مستخدم بالفعل.',
            'userType.required'        => 'نوع الحساب مطلوب.',
            'userType.in'              => 'نوع الحساب يجب أن يكون: school أو ministry أو system.',
            'schoolId.required_if'     => 'يجب ربط الحساب المدرسي بمدرسة محددة.',
            'schoolId.exists'          => 'المدرسة المختارة غير موجودة.',
            'ministryId.required_if'   => 'يجب ربط الحساب الوزاري بجهة وزارية.',
            'ministryId.exists'        => 'الجهة الوزارية المختارة غير موجودة.',
            'roleId.required'          => 'يجب إسناد دور وظيفي للمستخدم.',
            'roleId.exists'            => 'الدور الوظيفي المحدد غير موجود.',
            'status.in'                => 'حالة الحساب يجب أن تكون Active أو Disabled.',
        ];
    }
}
