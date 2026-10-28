<?php

namespace App\Http\Requests\School;

use Illuminate\Foundation\Http\FormRequest;

/**
 * طلب التحقق لحفظ إحصاءات الطلاب وتوزيع الفصول (الشريحة 6).
 */
class SaveEnrollmentMetricsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // يُفحص التصريح والعزل داخل الـ Controller
    }

    public function rules(): array
    {
        return [
            'academicYear'                 => ['required', 'string', 'max:20'],
            'items'                        => ['required', 'array', 'min:1'],
            'items.*.educationLevel'       => ['required', 'string', 'max:50'],
            'items.*.gradeLevel'           => ['required', 'string', 'max:50'],
            'items.*.classesCount'         => ['required', 'integer', 'min:1'],
            'items.*.maleStudentsCount'    => ['required', 'integer', 'min:0'],
            'items.*.femaleStudentsCount'  => ['required', 'integer', 'min:0'],
            'items.*.specialNeedsCount'    => ['nullable', 'integer', 'min:0'],
            'items.*.talentedCount'        => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'academicYear.required'            => 'حقل العام الدراسي مطلوب.',
            'items.required'                   => 'يجب تقديم صف إحصائي واحد على الأقل.',
            'items.*.educationLevel.required'  => 'حقل المرحلة التعليمية مطلوب لكل صف.',
            'items.*.gradeLevel.required'      => 'حقل الصف الدراسي مطلوب.',
            'items.*.classesCount.min'         => 'عدد الفصول يجب أن يكون 1 على الأقل.',
            'items.*.maleStudentsCount.min'    => 'عدد الطلاب لا يمكن أن يكون سالباً.',
            'items.*.femaleStudentsCount.min'  => 'عدد الطالبات لا يمكن أن يكون سالباً.',
        ];
    }
}
