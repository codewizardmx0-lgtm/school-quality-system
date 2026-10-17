<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * طلب التحقق لتعديل بيانات مدرسة (UI-ADM-03).
 */
class UpdateSchoolRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('schools.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'schoolName'          => ['sometimes', 'required', 'string', 'max:150'],
            'educationalStage'    => ['sometimes', 'required', 'string', 'max:50'],
            'identificationData'  => ['nullable', 'string', 'max:100'],
            'educationalDistrict' => ['sometimes', 'required', 'string', 'max:100'],
            'governorate'         => ['sometimes', 'required', 'string', 'max:100'],
            'status'              => ['sometimes', 'required', 'string', 'in:Active,Inactive'],
        ];
    }

    public function messages(): array
    {
        return [
            'schoolName.required'          => 'حقل اسم المدرسة مطلوب.',
            'educationalStage.required'    => 'حقل المرحلة التعليمية مطلوب.',
            'educationalDistrict.required' => 'حقل المديرية التعليمية مطلوب.',
            'governorate.required'         => 'حقل المحافظة مطلوب.',
            'status.in'                    => 'قيمة الحالة يجب أن تكون إما Active أو Inactive.',
        ];
    }
}
