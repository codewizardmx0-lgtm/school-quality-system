<?php

namespace App\Http\Requests\Standards;

use Illuminate\Foundation\Http\FormRequest;

class SaveEvidenceRequirementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('standards.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'title'         => ['required', 'string', 'max:250'],
            'description'   => ['nullable', 'string'],
            'required'      => ['nullable', 'boolean'],
            'display_order' => ['nullable', 'integer'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'عنوان متطلب الشاهد مطلوب.',
        ];
    }
}
