<?php

namespace App\Http\Requests\Auth;

use App\Http\Responses\ApiResponse;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * طلب تسجيل الدخول (LoginRequest).
 *
 * القواعد:
 * - username: مطلوب، نص.
 * - password: مطلوب، نص.
 * - إرجاع أخطاء التحقق بصيغة مغلف JSON الموحد 422 مع camelCase وحقول عربية.
 */
class LoginRequest extends FormRequest
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
    public function rules(): array
    {
        return [
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
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
            'username.required' => 'اسم المستخدم مطلوب.',
            'username.string'   => 'اسم المستخدم يجب أن يكون نصًا صالحًا.',
            'password.required' => 'كلمة المرور مطلوبة.',
            'password.string'   => 'كلمة المرور يجب أن تكون نصًا صالحًا.',
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
                'البيانات المُدخلة غير صحيحة'
            )
        );
    }
}
