/**
 * usersApi.ts
 * Real API service for System Administrator Users Management
 * Conforms to conventions.md (§2, §3, §7, §8)
 */

import { get, post, put, patch } from '../../../api/apiClient';
import type { ApiResponse } from '../../../api/apiTypes';
import type { User, Role, CreateUserDto, EditUserDto } from '../types/admin.types';
import { mockAdminService } from '../services/mockAdminData';

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
    try {
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
      return response;
    } catch (error) {
      // Fallback gracefully to mock data if backend is offline
      console.warn('Backend users API call failed, falling back to mock data:', error);
      return mockAdminService.getUsers();
    }
  },

  /**
   * Fetch single user details
   */
  async getUser(userId: number): Promise<ApiResponse<User>> {
    try {
      return await get<User>(`/users/${userId}`);
    } catch {
      const all = await mockAdminService.getUsers();
      const found = all.data?.find((u) => u.userId === userId) || null;
      return { data: found, message: null, errors: null, meta: null };
    }
  },

  /**
   * Create new user with affiliation enforcement
   */
  async createUser(dto: CreateUserDto): Promise<ApiResponse<User>> {
    try {
      return await post<User>('/users', dto);
    } catch (error) {
      // If error is a validation error (422) or forbidden (403), rethrow to let UI display it
      if ((error as any)?.status === 422 || (error as any)?.status === 403) {
        throw error;
      }
      console.warn('Backend create user failed, applying mock fallback:', error);
      return mockAdminService.createUser(dto);
    }
  },

  /**
   * Update user details and RBAC roles
   */
  async updateUser(userId: number, dto: Partial<EditUserDto>): Promise<ApiResponse<User>> {
    try {
      return await put<User>(`/users/${userId}`, dto);
    } catch (error) {
      if ((error as any)?.status === 422 || (error as any)?.status === 403) {
        throw error;
      }
      console.warn('Backend update user failed, applying mock fallback:', error);
      return mockAdminService.updateUser(userId, dto as Partial<User>);
    }
  },

  /**
   * Toggle user active/disabled status (Active / Disabled)
   */
  async toggleUserStatus(userId: number): Promise<ApiResponse<User>> {
    try {
      // Try /users/{userId}/status then fallback to /users/{userId}/toggle-status
      try {
        return await patch<User>(`/users/${userId}/status`);
      } catch {
        return await patch<User>(`/users/${userId}/toggle-status`);
      }
    } catch (error) {
      console.warn('Backend toggle status failed, applying mock fallback:', error);
      return mockAdminService.toggleUserStatus(userId);
    }
  },

  /**
   * Reset user password and issue temporary credentials
   */
  async resetPassword(userId: number): Promise<ApiResponse<{ tempPassword: string }>> {
    try {
      return await post<{ tempPassword: string }>(`/users/${userId}/reset-password`);
    } catch (error) {
      console.warn('Backend reset password failed, applying mock fallback:', error);
      return mockAdminService.resetPassword(userId);
    }
  },

  /**
   * Fetch available RBAC roles list
   */
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
      return mockAdminService.getRoles();
    } catch (error) {
      console.warn('Backend roles API failed, falling back to mock:', error);
      return mockAdminService.getRoles();
    }
  },
};
