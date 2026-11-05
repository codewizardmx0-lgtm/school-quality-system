/**
 * useAdminUsers.ts
 * React Hook managing Users state, query filters, and mutations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usersApi, type UsersQueryParams } from '../api/usersApi';
import type { User, Role, CreateUserDto, EditUserDto } from '../types/admin.types';
import { formatRoleNameAr } from '../utils/roleUtils';

export function useAdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('الكل');
  const [statusFilter, setStatusFilter] = useState<string>('الكل');

  const fetchRoles = useCallback(async () => {
    try {
      const res = await usersApi.getRoles();
      if (res.data) {
        setRoles(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to fetch roles:', err);
    }
  }, []);

  const fetchUsers = useCallback(async (params?: UsersQueryParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await usersApi.getUsers(params);
      if (res.data) {
        setUsers(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'فشل في تحميل قائمة المستخدمين');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
    void fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const createUser = useCallback(async (dto: CreateUserDto): Promise<User> => {
    const res = await usersApi.createUser(dto);
    if (!res.data) {
      throw new Error(res.message || 'فشل إنشاء الحساب');
    }
    const newUser = res.data;
    setUsers((prev) => [newUser, ...prev]);
    return newUser;
  }, []);

  const updateUser = useCallback(async (userId: number, dto: Partial<EditUserDto>): Promise<User> => {
    const res = await usersApi.updateUser(userId, dto);
    if (!res.data) {
      throw new Error(res.message || 'فشل تحديث الحساب');
    }
    const updated = res.data;
    setUsers((prev) => prev.map((u) => (u.userId === userId ? updated : u)));
    return updated;
  }, []);

  const toggleUserStatus = useCallback(async (userId: number): Promise<User> => {
    const res = await usersApi.toggleUserStatus(userId);
    if (!res.data) {
      throw new Error(res.message || 'فشل تغيير حالة المستخدم');
    }
    const updated = res.data;
    setUsers((prev) => prev.map((u) => (u.userId === userId ? updated : u)));
    return updated;
  }, []);

  const resetPassword = useCallback(async (userId: number): Promise<{ tempPassword: string }> => {
    const res = await usersApi.resetPassword(userId);
    if (!res.data) {
      throw new Error(res.message || 'فشل إعادة ضبط كلمة المرور');
    }
    return res.data;
  }, []);

  // Filtered users computed in memory
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !searchQuery.trim() ||
        u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.schoolName && u.schoolName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.directorate && u.directorate.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchRole =
        roleFilter === 'الكل' ||
        roleFilter === 'all' ||
        u.roleName === roleFilter ||
        String(u.roleId) === roleFilter ||
        u.roleCode === roleFilter ||
        formatRoleNameAr(u.roleName) === roleFilter;

      const matchStatus =
        statusFilter === 'الكل' ||
        (statusFilter === 'نشط' && u.status === 'Active') ||
        (statusFilter === 'معطل' && u.status === 'Disabled') ||
        u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  return {
    users,
    filteredUsers,
    roles,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    fetchUsers,
    fetchRoles,
    createUser,
    updateUser,
    toggleUserStatus,
    resetPassword,
  };
}
