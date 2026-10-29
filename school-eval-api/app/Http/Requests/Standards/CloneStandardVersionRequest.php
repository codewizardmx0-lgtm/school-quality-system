<?php

namespace App\Http\Requests\Standards;

use Illuminate\Foundation\Http\FormRequest;

class CloneStandardVersionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('standards.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'version_no'          => ['required', 'string', 'max:20', 'unique:standard_versions,version_no'],
            'issue_date'          => ['nullable', 'date'],
            'source_organization' => ['nullable', 'string', 'max:150'],
            'source_number'       => ['nullable', 'string', 'max:100'],
            'source_description'  => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'version_no.required' => 'رقم الإصدار الجديد المستنسخ مطلوب.',
            'version_no.unique'   => 'رقم الإصدار مسجل مسبقًا، يرجى اختيار رقم فريد للنسخة الجديدة.',
        ];
    }
}
