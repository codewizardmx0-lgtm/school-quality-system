import axios, { type AxiosRequestConfig } from 'axios';
import { ApiError, type ApiResponse } from './apiTypes';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor: Inject Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('auth_token') ||
      sessionStorage.getItem('school_eval_auth_token') ||
      localStorage.getItem('school_eval_auth_token');

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    const archiveEvalId = sessionStorage.getItem('active_archive_evaluation_id');
    if (archiveEvalId) {
      config.headers = config.headers || {};
      config.headers['X-Evaluation-Id'] = archiveEvalId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Unwrap envelope & global status handlers
apiClient.interceptors.response.use(
  (response) => {
    // Unwraps the Axios HTTP wrapper to return the backend { data, message, errors, meta } envelope
    return response.data;
  },
  (error) => {
    const status = error.response?.status;
    const responseData = error.response?.data as ApiResponse<unknown> | undefined;

    // 401 Unauthorized (§4): مسح الرموز والتحويل لشاشة الدخول
    if (status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('school_eval_auth_token');
      sessionStorage.removeItem('school_eval_auth_token');
      window.dispatchEvent(
        new CustomEvent('auth:unauthorized', {
          detail: { message: responseData?.message || 'انتهت الجلسة. يرجى تسجيل الدخول مجددًا.' },
        })
      );
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(
        new ApiError(responseData?.message || 'يجب تسجيل الدخول للمتابعة.', 401, null, responseData)
      );
    }

    // 403 Forbidden (§4 & NFR-SEC-03): نص قياسي «غير مصرح»
    if (status === 403) {
      return Promise.reject(
        new ApiError('غير مصرح', 403, null, responseData)
      );
    }

    // 422 Unprocessable Content (§8): خريطة أخطاء الحقول camelCase
    if (status === 422) {
      return Promise.reject(
        new ApiError(
          responseData?.message || 'البيانات المُدخلة غير صحيحة.',
          422,
          responseData?.errors || null,
          responseData
        )
      );
    }

    // 503 Maintenance Mode: إشعار وضع الصيانة المجدولة
    if (status === 503) {
      window.dispatchEvent(
        new CustomEvent('app:maintenance', {
          detail: { message: responseData?.message || 'النظام في وضع الصيانة المجدولة حاليًا، يرجى المحاولة لاحقًا.' },
        })
      );
      return Promise.reject(
        new ApiError(
          responseData?.message || 'النظام في وضع الصيانة المجدولة حاليًا، يرجى المحاولة لاحقًا.',
          503,
          null,
          responseData
        )
      );
    }

    // 500 Server Error (§3 & §4): رسالة خادم عامة غير كاشفة
    if (status === 500) {
      return Promise.reject(
        new ApiError(
          responseData?.message || 'حدث خطأ غير متوقع. حاول مرة أخرى لاحقًا.',
          500,
          null,
          responseData
        )
      );
    }

    // أخطاء الشبكة أو انقطاع الاتصال
    const message =
      responseData?.message ||
      error.message ||
      'حدث خطأ غير متوقع. حاول مرة أخرى لاحقًا.';

    return Promise.reject(
      new ApiError(message, status || 0, responseData?.errors || null, responseData)
    );
  }
);

// Typed request helpers
export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return (apiClient.get(url, config) as unknown) as Promise<ApiResponse<T>>;
}

export async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return (apiClient.post(url, data, config) as unknown) as Promise<ApiResponse<T>>;
}

export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return (apiClient.put(url, data, config) as unknown) as Promise<ApiResponse<T>>;
}

export async function patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return (apiClient.patch(url, data, config) as unknown) as Promise<ApiResponse<T>>;
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return (apiClient.delete(url, config) as unknown) as Promise<ApiResponse<T>>;
}
