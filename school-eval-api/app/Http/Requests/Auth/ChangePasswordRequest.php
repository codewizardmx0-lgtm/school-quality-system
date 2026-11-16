<?php

namespace App\Http\Requests\Auth;

use App\Http\Responses\ApiResponse;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * طلب تغيير كلمة المرور للمستخدم المسجل (ChangePasswordRequest).
 *
 * القواعد:
 * - current_password: مطلوبة.
 * - new_password: مطلوبة، 8 أحرف على الأقل، أحرف كبيرة وصغيرة وأرقام، مختلفة عن الحالية، ومؤكدة.
 * - new_password_confirmation: مطلوبة.
 */
class ChangePasswordRequest extends FormRequest
{
    /**
     * تحديد ما إذا كان المستخدم مخولاً بتقديم هذا الطلب.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * قواعد التحقق من صحة المدخلات.
     *
     * @return array<string, array<int, string>>
     */
        /**
     * دعم حقول camelCase من الواجهة الأمامية.
     */
    protected function prepareForValidation(): void
    {
        $merge = [];
        if ($this->has('currentPassword') && !$this->has('current_password')) {
            $merge['current_password'] = $this->input('currentPassword');
        }
        if ($this->has('newPassword') && !$this->has('new_password')) {
            $merge['new_password'] = $this->input('newPassword');
        }
        if ($this->has('newPasswordConfirmation') && !$this->has('new_password_confirmation')) {
            $merge['new_password_confirmation'] = $this->input('newPasswordConfirmation');
        }
        if (!empty($merge)) {
            $this->merge($merge);
        }
    }

    public function rules(): array
    {
        return [
            'current_password'          => ['required', 'string'],
            'new_password'              => [
                'required',
                'string',
                'min:8',
                'regex:/[a-z]/',
                'regex:/[A-Z]/',
                'regex:/[0-9]/',
                'different:current_password',
                'confirmed',
            ],
            'new_password_confirmation' => ['required', 'string'],
        ];
    }

    /**
     * رسائل التحقق المخصصة باللغة العربية.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'current_password.required'          => 'كلمة المرور الحالية مطلوبة.',
            'new_password.required'              => 'كلمة المرور الجديدة مطلوبة.',
            'new_password.min'                   => 'يجب ألا تقل كلمة المرور الجديدة عن 8 خانات.',
            'new_password.regex'                 => 'يجب أن تحتوي كلمة المرور على أحرف كبيرة وصغيرة وأرقام.',
            'new_password.different'             => 'يجب أن تكون كلمة المرور الجديدة مختلفة عن كلمة المرور الحالية.',
            'new_password.confirmed'             => 'تأكيد كلمة المرور الجديدة غير متطابق.',
            'new_password_confirmation.required' => 'تأكيد كلمة المرور الجديدة مطلوب.',
        ];
    }

    /**
     * معالجة فشل التحقق لإرجاع المغلف الموحد 422.
     *
     * @param Validator $validator
     * @throws HttpResponseException
     */
    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            ApiResponse::validationError(
                $validator->errors()->toArray(),
                'بيانات تغيير كلمة المرور غير صحيحة'
            )
        );
    }
}
