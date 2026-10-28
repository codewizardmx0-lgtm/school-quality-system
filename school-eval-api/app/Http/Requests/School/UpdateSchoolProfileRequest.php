<?php

namespace App\Http\Requests\School;

use Illuminate\Foundation\Http\FormRequest;

/**
 * طلب التحقق لتحديث الملف التعريفي الموسع للمدرسة (الشريحة 6).
 */
class UpdateSchoolProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // يُفحص التصريح والعزل داخل الـ Controller
    }

    public function rules(): array
    {
        return [
            'address'          => ['nullable', 'string', 'max:255'],
            'phone'            => ['nullable', 'string', 'max:50'],
            'email'            => ['nullable', 'email', 'max:100'],
            'educationalAdmin' => ['nullable', 'string', 'max:100'],
            'buildingType'     => ['nullable', 'string', 'max:50'],
            'shiftType'        => ['nullable', 'string', 'max:50'],
            'totalArea'        => ['nullable', 'numeric', 'min:0'],
            'builtUpArea'      => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.email'       => 'يرجى إدخال عنوان بريد إلكتروني صحيح.',
            'totalArea.numeric' => 'المساحة الكلية يجب أن تكون قيمة عددية صالحة.',
            'totalArea.min'     => 'المساحة الكلية لا يمكن أن تكون قيمة سالبة.',
            'builtUpArea.min'   => 'مساحة البناء لا يمكن أن تكون قيمة سالبة.',
        ];
    }
}
