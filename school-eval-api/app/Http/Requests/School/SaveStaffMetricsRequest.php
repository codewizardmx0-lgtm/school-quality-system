<?php

namespace App\Http\Requests\School;

use Illuminate\Foundation\Http\FormRequest;

/**
 * طلب التحقق لحفظ إحصاءات الكادر التعليمي والإداري التجميعية (الشريحة 6).
 */
class SaveStaffMetricsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // يُفحص التصريح والعزل داخل الـ Controller
    }

    public function rules(): array
    {
        return [
            'academicYear'                 => ['required', 'string', 'max:20'],
            'totalTeachers'                => ['required', 'integer', 'min:0'],
            'qualifiedTeachersCount'       => ['required', 'integer', 'min:0', 'lte:totalTeachers'],
            'permanentTeachersCount'       => ['required', 'integer', 'min:0', 'lte:totalTeachers'],
            'matchedSpecializationCount'   => ['required', 'integer', 'min:0', 'lte:totalTeachers'],
            'totalAdminStaff'              => ['required', 'integer', 'min:0'],
            'totalServiceStaff'            => ['required', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'academicYear.required'               => 'حقل العام الدراسي مطلوب.',
            'totalTeachers.required'              => 'حقل إجمالي عدد المعلمين مطلوب.',
            'totalTeachers.integer'               => 'إجمالي المعلمين يجب أن يكون رقماً صحيحاً.',
            'totalTeachers.min'                   => 'إجمالي المعلمين لا يمكن أن يكون سالباً.',
            'qualifiedTeachersCount.lte'          => 'عدد المعلمين المؤهلين تربوياً لا يمكن أن يتجاوز إجمالي عدد المعلمين.',
            'permanentTeachersCount.lte'          => 'عدد المعلمين الثابتين لا يمكن أن يتجاوز إجمالي عدد المعلمين.',
            'matchedSpecializationCount.lte'      => 'عدد المعلمين المتطابق تخصصهم لا يمكن أن يتجاوز إجمالي عدد المعلمين.',
            'totalAdminStaff.min'                 => 'عدد الكادر الإداري لا يمكن أن يكون سالباً.',
            'totalServiceStaff.min'               => 'عدد الكادر الخدمي لا يمكن أن يكون سالباً.',
        ];
    }
}
