<?php

namespace App\Http\Requests\Standards;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWeightsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('standards.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'standards_weights'                      => ['required', 'array', 'min:1'],
            'standards_weights.*.standard_id'        => ['required', 'integer'],
            'standards_weights.*.weight'             => ['required', 'numeric', 'min:0', 'max:100'],
            'indicators_weights'                     => ['nullable', 'array'],
            'indicators_weights.*.indicator_id'      => ['required_with:indicators_weights', 'integer'],
            'indicators_weights.*.weight'            => ['required_with:indicators_weights', 'numeric', 'min:0', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'standards_weights.required' => 'مصفوفة أوزان المعايير مطلوبة.',
            'standards_weights.*.weight.required' => 'حقل الوزن لكل معيار مطلوب.',
        ];
    }
}
