/**
 * عميل HTTP موحد (Unified API Client)
 * 
 * القواعد والوظائف:
 * 1. استخراج رمز الوصول من sessionStorage وإرساله في ترويسة Authorization: Bearer <token>.
 * 2. استخدام الترويسات القياسية: Accept: application/json و Content-Type: application/json.
 * 3. قراءة مغلف JSON الموحد { data, message, errors, meta }.
 * 4. معالجة 401 بمسح sessionStorage وإطلاق حدث انتهاء الجلسة للتحويل لشاشة الدخول.
 * 5. معالجة 403 و 404 و 422 مع الحفاظ على الأخطاء التوضيحية والرسائل العربية.
 */

import type { ApiResponse } from '../features/auth/types';

export const TOKEN_STORAGE_KEY = 'school_eval_auth_token';

export class ApiRequestError extends Error {
  public status: number;
  public errors: Record<string, string[]> | null;
  public responseData: unknown;

  constructor(status: number, message: string, errors: Record<string, string[]> | null = null, responseData: unknown = null) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.errors = errors;
    this.responseData = responseData;
  }
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Ensure prefix /api if not present and url is relative
  const url = endpoint.startsWith('http') || endpoint.startsWith('/api')
    ? endpoint
    : `/api/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiRequestError(0, 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت أو تشغيل الخادم.');
  }

  let jsonResult: ApiResponse<T>;
  try {
    jsonResult = await response.json();
  } catch {
    throw new ApiRequestError(
      response.status,
      response.ok ? 'تمت العملية ولكن تعذر معالجة الاستجابة.' : 'حدث خطأ غير متوقع من الخادم.'
    );
  }

  if (!response.ok) {
    // 401 Unauthorized: مسح الرمز وإشعار التطبيق بانتهاء الجلسة
    if (response.status === 401) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('auth:unauthorized', {
        detail: { message: jsonResult.message || 'انتهت الجلسة. يرجى تسجيل الدخول مجددًا.' },
      }));
    }

    const defaultMessages: Record<number, string> = {
      401: 'يجب تسجيل الدخول للمتابعة.',
      403: 'غير مصرح لك بتنفيذ هذا الإجراء.',
      404: 'المورد المطلوب غير موجود.',
      422: 'البيانات المدخلة غير صالحة. يرجى تصحيح الأخطاء أدناه.',
      500: 'حدث خطأ في الخادم الداخلي. يرجى المحاولة لاحقًا.',
    };

    const finalMessage = jsonResult.message || defaultMessages[response.status] || 'حدث خطأ أثناء معالجة الطلب.';

    throw new ApiRequestError(
      response.status,
      finalMessage,
      jsonResult.errors || null,
      jsonResult.data || null
    );
  }

  return jsonResult;
}
