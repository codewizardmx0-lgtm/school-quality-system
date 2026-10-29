<?php

namespace App\Http\Requests\School;

use Illuminate\Foundation\Http\FormRequest;

/**
 * طلب التحقق لإنشاء أو تحديث مرفق مدرسي (الشريحة 6).
 */
class SaveFacilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // يُفحص التصريح والعزل داخل الـ Controller
    }

    public function rules(): array
    {
        return [
            'facilityType' => ['required', 'string', 'max:50'],
            'name'         => ['required', 'string', 'max:150'],
            'count'        => ['required', 'integer', 'min:1'],
            'isUsable'     => ['required', 'boolean'],
            'details'      => ['nullable', 'array'],
        ];
    }

    public function messages(): array
    {
        return [
            'facilityType.required' => 'حقل نوع المرفق مطلوب.',
            'name.required'         => 'حقل اسم المرفق مطلوب.',
            'count.required'        => 'حقل العدد مطلوب.',
            'count.min'             => 'العدد يجب أن يكون 1 على الأقل.',
            'isUsable.required'     => 'حقل جاهزية وصلاحية المرفق مطلوب.',
        ];
    }
}
