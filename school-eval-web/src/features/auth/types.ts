/**
 * أنواع نماذج المصادقة والمستخدم (Authentication & User Types)
 * متوافقة مع conventions.md ومغلف استجابة الـ API في auth_endpoints.md
 */

export interface ApiResponse<T = unknown> {
  data: T | null;
  message: string | null;
  errors: Record<string, string[]> | null;
  meta: Record<string, unknown> | null;
}

export interface UserRole {
  roleId: number;
  roleName: 'admin' | 'school_evaluator' | 'school_principal' | 'ministry_supervisor' | 'ministry_standards_manager' | string;
  description: string;
}

export interface SchoolBrief {
  schoolId: number;
  schoolName: string;
  status: string;
}

export interface MinistryBrief {
  ministryId: number;
  ministryName: string;
}

export interface User {
  userId: number;
  schoolId: number | null;
  ministryId: number | null;
  username: string;
  fullName: string;
  email: string;
  userType: 'school' | 'ministry' | 'system';
  status: 'Active' | 'Disabled' | string;
  school: SchoolBrief | null;
  ministry: MinistryBrief | null;
  roles: UserRole[];
  permissions: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponseData {
  token: string;
  tokenType: 'Bearer';
  sessionId: number;
  user: User;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}
