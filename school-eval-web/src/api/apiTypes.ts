/**
 * apiTypes.ts
 * Unified API Response & Error Types according to conventions.md (§3, §4, §8)
 */

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
