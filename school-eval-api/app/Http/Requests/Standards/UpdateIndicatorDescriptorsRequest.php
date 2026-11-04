<?php

namespace App\Http\Requests\Standards;

use Illuminate\Foundation\Http\FormRequest;

class UpdateIndicatorDescriptorsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('standards.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'descriptors'                  => ['required', 'array', 'min:1'],
            'descriptors.*.descriptor_id'  => ['nullable', 'integer'],
            'descriptors.*.score_level_id' => ['nullable', 'integer'],
            'descriptors.*.description'    => ['required', 'string'],
            'descriptors.*.label'          => ['nullable', 'string', 'max:100'],
        ];
    }
}
