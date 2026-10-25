<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * طلب التحقق لإنشاء مدرسة جديدة في إدارة النظام (UI-ADM-02).
 */
class StoreSchoolRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('schools.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'schoolName'          => ['required', 'string', 'max:150'],
            'educationalStage'    => ['required', 'string', 'max:50'],
            'identificationData'  => ['nullable', 'string', 'max:100'],
            'educationalDistrict' => ['required', 'string', 'max:100'],
            'governorate'         => ['required', 'string', 'max:100'],
            'status'              => ['required', 'string', 'in:Active,Inactive'],
        ];
    }

    public function messages(): array
    {
        return [
            'schoolName.required'          => 'حقل اسم المدرسة مطلوب.',
            'schoolName.max'               => 'اسم المدرسة لا يمكن أن يتجاوز 150 حرفاً.',
            'educationalStage.required'    => 'حقل المرحلة التعليمية مطلوب.',
            'educationalDistrict.required' => 'حقل المديرية التعليمية مطلوب.',
            'governorate.required'         => 'حقل المحافظة مطلوب.',
            'status.required'              => 'حقل حالة المدرسة مطلوب.',
            'status.in'                    => 'قيمة الحالة يجب أن تكون إما Active أو Inactive.',
        ];
    }
}
