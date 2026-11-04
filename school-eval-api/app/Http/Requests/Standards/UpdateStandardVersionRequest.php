<?php

namespace App\Http\Requests\Standards;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStandardVersionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('standards.manage') ?? false;
    }

    public function rules(): array
    {
        $versionId = $this->route('id');

        return [
            'version_no'          => ['nullable', 'string', 'max:20', Rule::unique('standard_versions', 'version_no')->ignore($versionId, 'version_id')],
            'issue_date'          => ['nullable', 'date'],
            'source_organization' => ['nullable', 'string', 'max:150'],
            'source_number'       => ['nullable', 'string', 'max:100'],
            'source_description'  => ['nullable', 'string'],
        ];
    }
}
