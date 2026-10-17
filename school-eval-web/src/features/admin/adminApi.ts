import { apiClient } from '../../api/client';
import type { SchoolItem, UserItem, AdminMeta } from './types';

export const adminApi = {
  // === المدارس (Schools) ===
  getSchools: async (params?: { q?: string; status?: string; governorate?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set('q', params.q);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.governorate) searchParams.set('governorate', params.governorate);
    
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await apiClient<SchoolItem[]>(`/schools${query}`);
    return res.data || [];
  },

  getSchool: async (id: number) => {
    const res = await apiClient<SchoolItem>(`/schools/${id}`);
    return res.data;
  },

  createSchool: async (data: Omit<SchoolItem, 'schoolId'>) => {
    const res = await apiClient<SchoolItem>('/schools', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  updateSchool: async (id: number, data: Partial<SchoolItem>) => {
    const res = await apiClient<SchoolItem>(`/schools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res;
  },

  toggleSchoolStatus: async (id: number) => {
    const res = await apiClient<SchoolItem>(`/schools/${id}/toggle-status`, {
      method: 'PATCH',
    });
    return res;
  },

  // === المستخدمين والحسابات (Users) ===
  getUsers: async (params?: { q?: string; status?: string; userType?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set('q', params.q);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.userType) searchParams.set('userType', params.userType);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await apiClient<UserItem[]>(`/users${query}`);
    return res.data || [];
  },

  getUser: async (id: number) => {
    const res = await apiClient<UserItem>(`/users/${id}`);
    return res.data;
  },

  getAdminMeta: async () => {
    const res = await apiClient<AdminMeta>('/users/meta');
    return res.data;
  },

  createUser: async (data: {
    username: string;
    password: string;
    fullName: string;
    email: string;
    userType: string;
    schoolId?: number | null;
    ministryId?: number | null;
    roleId: number;
    status: string;
  }) => {
    const res = await apiClient<UserItem>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  updateUser: async (id: number, data: {
    fullName?: string;
    email?: string;
    password?: string;
    userType?: string;
    schoolId?: number | null;
    ministryId?: number | null;
    roleId?: number;
    status?: string;
  }) => {
    const res = await apiClient<UserItem>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res;
  },

  toggleUserStatus: async (id: number) => {
    const res = await apiClient<UserItem>(`/users/${id}/toggle-status`, {
      method: 'PATCH',
    });
    return res;
  },
};
