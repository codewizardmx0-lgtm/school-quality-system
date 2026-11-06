<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * طلب التحقق لتعديل بيانات مستخدم (UI-ADM-05).
 */
class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('users.manage') ?? false;
    }

    public function rules(): array
    {
        $userId = $this->route('id');

        return [
            'username'   => ['sometimes', 'required', 'string', 'max:50', 'alpha_dash', 'unique:users,username,' . $userId . ',user_id'],
            'fullName'   => ['sometimes', 'required', 'string', 'max:150'],
            'email'      => ['sometimes', 'required', 'email', 'max:150', 'unique:users,email,' . $userId . ',user_id'],
            'password'   => ['nullable', 'string', 'min:8'],
            'userType'   => ['sometimes', 'required', 'string', 'in:school,ministry,system'],
            'schoolId'   => ['nullable', 'exists:schools,school_id'],
            'ministryId' => ['nullable', 'exists:ministries,ministry_id'],
            'roleId'     => ['nullable', 'integer', 'exists:roles,role_id'],
            'status'     => ['sometimes', 'required', 'string', 'in:Active,Disabled'],
        ];
    }

    public function messages(): array
    {
        return [
            'username.required'   => 'اسم المستخدم مطلوب.',
            'username.unique'     => 'اسم المستخدم مسجل مسبقاً بحساب آخر.',
            'username.alpha_dash' => 'اسم المستخدم يجب أن يحتوي على أحرف وأرقام وشرطات فقط.',
            'fullName.required'   => 'الاسم الكامل مطلوب.',
            'email.required'      => 'البريد الإلكتروني مطلوب.',
            'email.email'         => 'صيغة البريد الإلكتروني غير صحيحة.',
            'email.unique'        => 'البريد الإلكتروني مستخدم بالفعل بحساب آخر.',
            'password.min'        => 'كلمة المرور يجب ألا تقل عن 8 أحرف.',
            'status.in'           => 'حالة الحساب يجب أن تكون Active أو Disabled.',
        ];
    }
}
