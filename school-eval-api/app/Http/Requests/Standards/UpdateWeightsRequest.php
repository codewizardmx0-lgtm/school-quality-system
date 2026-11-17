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
            'standards_weights'                             => ['required', 'array', 'min:1'],
            'standards_weights.*.standard_id'               => ['required_without:standards_weights.*.id', 'integer'],
            'standards_weights.*.id'                        => ['required_without:standards_weights.*.standard_id', 'integer'],
            'standards_weights.*.weight'                    => ['required', 'numeric', 'min:0', 'max:100'],
            'sub_standards_weights'                         => ['nullable', 'array'],
            'sub_standards_weights.*.sub_standard_id'       => ['required_without:sub_standards_weights.*.id', 'integer'],
            'sub_standards_weights.*.id'                    => ['required_without:sub_standards_weights.*.sub_standard_id', 'integer'],
            'sub_standards_weights.*.weight'                => ['required', 'numeric', 'min:0', 'max:100'],
            'indicators_weights'                            => ['nullable', 'array'],
            'indicators_weights.*.indicator_id'             => ['required_without:indicators_weights.*.id', 'integer'],
            'indicators_weights.*.id'                       => ['required_without:indicators_weights.*.indicator_id', 'integer'],
            'indicators_weights.*.weight'                   => ['required', 'numeric', 'min:0', 'max:100'],
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
