<?php

namespace App\Http\Requests\Standards;

use Illuminate\Foundation\Http\FormRequest;

class StoreSubStandardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('standards.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'code'        => ['required', 'string', 'max:20'],
            'name'        => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
        ];
    }
}
