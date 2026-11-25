/**
 * usersApi.ts
 * Real API service for System Administrator Users Management
 * Conforms to conventions.md (§2, §3, §7, §8) - Zero Mock Fallback
 */

import { get, post, put, patch } from '../../../api/apiClient';
import type { ApiResponse } from '../../../api/apiTypes';
import type { User, Role, CreateUserDto, EditUserDto, Governorate, Directorate } from '../types/admin.types';

export interface UsersQueryParams {
  page?: number;
  perPage?: number;
  q?: string;
  roleId?: number;
  status?: string;
  userType?: string;
}

type RawRecord = Record<string, unknown>;

export const usersApi = {
  /**
   * Fetch users list with query conventions (camelCase query params)
   */
  async getUsers(params?: UsersQueryParams): Promise<ApiResponse<User[]>> {
    const response = await get<User[]>('/users', { params });
    if (response && response.data) {
      // Normalize role and school fields
      const normalized = (response.data as unknown[]).map((rawUser) => {
        const u = (rawUser && typeof rawUser === 'object' ? rawUser : {}) as RawRecord;
        const rolesArr = Array.isArray(u.roles) ? (u.roles as RawRecord[]) : [];
        const firstRole = rolesArr.length > 0 ? rolesArr[0] : null;
        const schoolObj = (u.school && typeof u.school === 'object' ? u.school : null) as RawRecord | null;
        const userType = (u.userType ?? u.user_type ?? 'school') as User['userType'];
        return {
          userId: Number(u.userId ?? u.user_id ?? 0),
          username: String(u.username ?? ''),
          fullName: String(u.fullName ?? u.full_name ?? ''),
          email: String(u.email ?? ''),
          userType,
          status: (u.status ?? 'Active') as User['status'],
          roleId: Number(u.roleId ?? firstRole?.roleId ?? 1),
          roleName: String(u.roleName ?? firstRole?.roleName ?? ''),
          roleNameAr: String(u.roleNameAr ?? firstRole?.roleNameAr ?? ''),
          roleCode: String(u.roleCode ?? (userType === 'system' ? 'SYS' : userType === 'ministry' ? 'B2' : 'S1')),
          schoolId: (u.schoolId ?? schoolObj?.schoolId ?? null) as number | null,
          schoolName: (u.schoolName ?? schoolObj?.schoolName ?? null) as string | null,
          schoolCode: (u.schoolCode ?? null) as string | null,
          directorateId: (u.directorateId ?? null) as number | null,
          directorate: (u.directorate ?? null) as string | null,
          governorate: (u.governorate ?? null) as string | null,
          lastActivity: String(u.lastActivity ?? u.updatedAt ?? new Date().toISOString()),
          isOnline: Boolean(u.isOnline ?? false),
          createdAt: String(u.createdAt ?? new Date().toISOString()),
          updatedAt: String(u.updatedAt ?? new Date().toISOString()),
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
   * Update current user profile
   */
  async updateProfile(dto: {
    fullName: string;
    email?: string;
  }): Promise<ApiResponse<User>> {
    return await put<User>('/auth/profile', dto);
  },

  /**
   * Fetch users meta (roles, schools, ministries) from real API
   */
  async getUsersMeta(): Promise<ApiResponse<{
    roles: Role[];
    schools: Array<{ schoolId: number; schoolName: string; schoolCode: string; educationalDistrict?: string }>;
    ministries: unknown[];
    governorates?: Governorate[];
    directorates?: Directorate[];
  }>> {
    try {
      const res = await get<{
        roles: RawRecord[];
        schools: RawRecord[];
        ministries: unknown[];
        governorates?: RawRecord[];
        directorates?: RawRecord[];
      }>('/users/meta');

      if (res && res.data) {
        return {
          ...res,
          data: {
            roles: (res.data.roles || []).map((r) => {
              const roleName = String(r.roleName ?? r.role_name ?? '');
              const derivedUserType: Role['userType'] =
                roleName === 'admin' ? 'system' : roleName.includes('school') ? 'school' : 'ministry';
              return {
                roleId: Number(r.roleId ?? r.role_id ?? 0),
                roleName,
                description: String(r.description ?? ''),
                userType: derivedUserType,
                roleCode:
                  roleName === 'admin'
                    ? 'SYS'
                    : roleName === 'school_evaluator'
                      ? 'S1'
                      : roleName === 'school_principal'
                        ? 'S2'
                        : 'B2',
              };
            }),
            schools: (res.data.schools || []).map((s) => ({
              schoolId: Number(s.schoolId ?? s.school_id ?? 0),
              schoolName: String(s.schoolName ?? s.school_name ?? ''),
              schoolCode: String(s.schoolCode ?? `SCH-${s.schoolId ?? s.school_id ?? ''}`),
              educationalDistrict: String(s.educationalDistrict ?? s.educational_district ?? ''),
            })),
            ministries: res.data.ministries || [],
            governorates: (res.data.governorates || []).map((g) => ({
              governorateId: Number(g.governorateId ?? g.governorate_id ?? 0),
              nameAr: String(g.nameAr ?? g.name_ar ?? ''),
              nameEn: String(g.nameEn ?? g.name_en ?? ''),
              code: String(g.code ?? ''),
            })),
            directorates: (res.data.directorates || []).map((d) => ({
              directorateId: Number(d.directorateId ?? d.directorate_id ?? 0),
              directorateName: String(d.directorateName ?? d.directorate_name ?? d.name_ar ?? ''),
              governorateId: Number(d.governorateId ?? d.governorate_id ?? 0),
              governorate: String(d.governorate ?? d.governorate_name ?? ''),
              schoolCount: Number(d.schoolCount ?? 0),
              isActive: Boolean(d.isActive ?? true),
              createdAt: String(d.createdAt ?? ''),
            })),
          },
        };
      }
      return { data: { roles: [], schools: [], ministries: [], governorates: [], directorates: [] }, message: null, errors: null, meta: null };
    } catch (error) {
      console.warn('Backend /users/meta failed:', error);
      return { data: { roles: [], schools: [], ministries: [], governorates: [], directorates: [] }, message: null, errors: null, meta: null };
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
