/**
 * usersApi.ts
 * Real API service for System Administrator Users Management
 * Conforms to conventions.md (§2, §3, §7, §8) - Zero Mock Fallback
 */

import { get, post, put, patch } from '../../../api/apiClient';
import type { ApiResponse } from '../../../api/apiTypes';
import type { User, Role, CreateUserDto, EditUserDto } from '../types/admin.types';

export interface UsersQueryParams {
  page?: number;
  perPage?: number;
  q?: string;
  roleId?: number;
  status?: string;
  userType?: string;
}

export const usersApi = {
  /**
   * Fetch users list with query conventions (camelCase query params)
   */
  async getUsers(params?: UsersQueryParams): Promise<ApiResponse<User[]>> {
    const response = await get<User[]>('/users', { params });
    if (response && response.data) {
      // Normalize role and school fields
      const normalized = (response.data as unknown[]).map((u: any) => {
        const firstRole = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles[0] : null;
        return {
          userId: u.userId ?? u.user_id,
          username: u.username ?? '',
          fullName: u.fullName ?? u.full_name ?? '',
          email: u.email ?? '',
          userType: u.userType ?? u.user_type ?? 'school',
          status: u.status ?? 'Active',
          roleId: u.roleId ?? firstRole?.roleId ?? 1,
          roleName: u.roleName ?? firstRole?.roleName ?? '',
          roleNameAr: u.roleNameAr ?? firstRole?.roleNameAr ?? '',
          roleCode: u.roleCode ?? (u.userType === 'system' ? 'SYS' : u.userType === 'ministry' ? 'B2' : 'S1'),
          schoolId: u.schoolId ?? u.school?.schoolId ?? null,
          schoolName: u.schoolName ?? u.school?.schoolName ?? null,
          schoolCode: u.schoolCode ?? null,
          directorateId: u.directorateId ?? null,
          directorate: u.directorate ?? null,
          lastActivity: u.lastActivity ?? u.updatedAt ?? new Date().toISOString(),
          isOnline: u.isOnline ?? false,
          createdAt: u.createdAt ?? new Date().toISOString(),
          updatedAt: u.updatedAt ?? new Date().toISOString(),
        } as User;
      });
      return {
        ...response,
        data: normalized,
      };
    }
    return { data: [], message: null, errors: null, meta: null };
  },

  /**
   * Fetch single user details
   */
  async getUser(userId: number): Promise<ApiResponse<User>> {
    return await get<User>(`/users/${userId}`);
  },

  /**
   * Create new user with affiliation enforcement
   */
  async createUser(dto: CreateUserDto): Promise<ApiResponse<User>> {
    return await post<User>('/users', dto);
  },

  /**
   * Update user details and RBAC roles
   */
  async updateUser(userId: number, dto: Partial<EditUserDto>): Promise<ApiResponse<User>> {
    return await put<User>(`/users/${userId}`, dto);
  },

  /**
   * Toggle user active/disabled status (Active / Disabled)
   */
  async toggleUserStatus(userId: number): Promise<ApiResponse<User>> {
    try {
      return await patch<User>(`/users/${userId}/status`);
    } catch {
      return await patch<User>(`/users/${userId}/toggle-status`);
    }
  },

  /**
   * Reset user password and issue temporary credentials
   */
  async resetPassword(userId: number): Promise<ApiResponse<{ tempPassword: string }>> {
    return await post<{ tempPassword: string }>(`/users/${userId}/reset-password`);
  },

  /**
   * Change current user password
   */
  async changePassword(dto: {
    currentPassword: string;
    newPassword: string;
    newPasswordConfirmation: string;
  }): Promise<ApiResponse<null>> {
    return await post<null>('/auth/change-password', dto);
  },

  /**
   * Fetch users meta (roles, schools, ministries) from real API
   */
  async getUsersMeta(): Promise<ApiResponse<{
    roles: Role[];
    schools: Array<{ schoolId: number; schoolName: string; schoolCode: string; educationalDistrict?: string }>;
    ministries: any[];
  }>> {
    try {
      const res = await get<{
        roles: any[];
        schools: any[];
        ministries: any[];
      }>('/users/meta');

      if (res && res.data) {
        return {
          ...res,
          data: {
            roles: (res.data.roles || []).map((r: any) => ({
              roleId: r.roleId ?? r.role_id,
              roleName: r.roleName ?? r.role_name,
              description: r.description ?? '',
              userType: (r.roleName === 'admin' ? 'system' : r.roleName?.includes('school') ? 'school' : 'ministry') as any,
              roleCode: r.roleName === 'admin' ? 'SYS' : r.roleName === 'school_evaluator' ? 'S1' : r.roleName === 'school_principal' ? 'S2' : 'B2',
            })),
            schools: (res.data.schools || []).map((s: any) => ({
              schoolId: s.schoolId ?? s.school_id,
              schoolName: s.schoolName ?? s.school_name,
              schoolCode: s.schoolCode ?? `SCH-${s.schoolId ?? s.school_id}`,
              educationalDistrict: s.educationalDistrict ?? s.educational_district ?? '',
            })),
            ministries: res.data.ministries || [],
          },
        };
      }
      return { data: { roles: [], schools: [], ministries: [] }, message: null, errors: null, meta: null };
    } catch (error) {
      console.warn('Backend /users/meta failed:', error);
      return { data: { roles: [], schools: [], ministries: [] }, message: null, errors: null, meta: null };
    }
  },

  async getRoles(): Promise<ApiResponse<Role[]>> {
    try {
      const res = await get<Role[]>('/roles');
      if (res && res.data && res.data.length > 0) {
        return res;
      }
      // Try meta endpoint
      const metaRes = await get<{ roles: Role[] }>('/users/meta');
      if (metaRes?.data?.roles) {
        return {
          data: metaRes.data.roles,
          message: null,
          errors: null,
          meta: null,
        };
      }
      return { data: [], message: null, errors: null, meta: null };
    } catch (error) {
      console.warn('Backend roles API failed:', error);
      return { data: [], message: null, errors: null, meta: null };
    }
  },
};
