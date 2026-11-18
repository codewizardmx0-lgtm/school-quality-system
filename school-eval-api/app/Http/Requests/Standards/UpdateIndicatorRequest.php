<?php

namespace App\Http\Requests\Standards;

use Illuminate\Foundation\Http\FormRequest;

class UpdateIndicatorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('standards.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'name'                    => ['nullable', 'string', 'max:200'],
            'description'             => ['nullable', 'string'],
            'code'                    => ['nullable', 'string', 'max:20'],
            'weight'                  => ['nullable', 'numeric', 'min:0', 'max:100'],
            'status'                  => ['nullable', 'string', 'in:Active,Inactive'],
            'verification_method'     => ['nullable', 'string'],
            'verification_tools'      => ['nullable', 'array'],
            'verification_tools.*'    => ['nullable', 'string'],
            'verification_tool_ids'   => ['nullable', 'array'],
            'verification_tool_ids.*' => ['nullable', 'integer'],
        ];
    }
}
