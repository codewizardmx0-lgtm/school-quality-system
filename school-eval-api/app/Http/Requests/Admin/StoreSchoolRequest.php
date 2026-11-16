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

    protected function prepareForValidation(): void
    {
        $merge = [];

        if ($this->has('governorateId') && !$this->filled('governorate')) {
            $gov = \App\Models\Governorate::find($this->input('governorateId'));
            if ($gov) {
                $merge['governorate'] = $gov->name_ar;
            }
        }

        if ($this->has('directorateId') && !$this->filled('educationalDistrict')) {
            $dir = \App\Models\Directorate::find($this->input('directorateId'));
            if ($dir) {
                $merge['educationalDistrict'] = $dir->name_ar;
            }
        }

        if ($this->input('schoolType') === 'حكومي') {
            $merge['schoolType'] = 'government';
        } elseif (in_array($this->input('schoolType'), ['أهلي', 'خاص'], true)) {
            $merge['schoolType'] = 'private';
        }

        if (!$this->filled('status')) {
            $merge['status'] = 'Active';
        }

        if (!$this->filled('educationalStage') && $this->filled('educationalLevel')) {
            $merge['educationalStage'] = $this->input('educationalLevel');
        }

        if (!empty($merge)) {
            $this->merge($merge);
        }
    }

    public function rules(): array
    {
        return [
            'schoolName'          => ['required', 'string', 'max:150'],
            'schoolType'          => ['nullable', 'string', 'in:government,private'],
            'educationalStage'    => ['required', 'string', 'max:50'],
            'identificationData'  => ['nullable', 'string', 'max:100', 'unique:schools,identification_data'],
            'governorateId'       => ['nullable', 'integer', 'exists:governorates,governorate_id'],
            'directorateId'       => ['nullable', 'integer', 'exists:directorates,directorate_id'],
            'educationalDistrict' => ['nullable', 'string', 'max:100'],
            'governorate'         => ['nullable', 'string', 'max:100'],
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
