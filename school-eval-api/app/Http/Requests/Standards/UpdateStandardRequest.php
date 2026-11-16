<?php

namespace App\Http\Requests\Standards;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStandardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('standards.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'name'        => ['nullable', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'code'        => ['nullable', 'string', 'max:20'],
        ];
    }
}
