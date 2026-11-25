/**
 * apiTypes.ts
 * Unified API Response & Error Types according to conventions.md (§3, §4, §8)
 */

export type JsonRecord = Record<string, unknown>;

/** استخلاص رسالة الخطأ من كائن الخطأ بشكل آمن بدون any */
export function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const rec = err as { response?: { data?: { message?: unknown } }; message?: unknown };
    const apiMsg = rec.response?.data?.message;
    if (typeof apiMsg === 'string' && apiMsg.trim()) return apiMsg;
    if (typeof rec.message === 'string' && rec.message.trim()) return rec.message;
  }
  return fallback;
}

export interface PaginationMeta {
  page?: number;
  perPage?: number;
  total?: number;
  lastPage?: number;
}

export interface ApiResponse<T = unknown> {
  data: T | null;
  message: string | null;
  errors: Record<string, string[]> | null;
  meta: PaginationMeta | null;
}

export class ApiError extends Error {
  public status: number;
  public errors: Record<string, string[]> | null;
  public data: unknown;

  constructor(
    message: string = 'حدث خطأ أثناء معالجة الطلب',
    status: number = 500,
    errors: Record<string, string[]> | null = null,
    data: unknown = null
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.data = data;
  }
}
