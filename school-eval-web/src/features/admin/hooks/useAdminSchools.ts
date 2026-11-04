/**
 * useAdminSchools.ts
 * React Hook managing Schools and Directorates state, filtering, and mutations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { schoolsApi } from '../api/schoolsApi';
import { usersApi } from '../api/usersApi';
import type { School, Directorate, User, RegisterSchoolDto, AddDirectorateDto } from '../types/admin.types';

export function useAdminSchools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [directorates, setDirectorates] = useState<Directorate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters: default to null to show all schools across all directorates
  const [selectedDirectorateId, setSelectedDirectorateId] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'government' | 'private'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [schoolsRes, dirRes, usersRes] = await Promise.all([
        schoolsApi.getSchools(),
        schoolsApi.getDirectorates(),
        usersApi.getUsers(),
      ]);
      if (schoolsRes.data) setSchools(schoolsRes.data);
      if (dirRes.data) setDirectorates(dirRes.data);
      if (usersRes.data) setUsers(usersRes.data);
    } catch (err: any) {
      setError(err?.message || 'فشل في تحميل بيانات المدارس والمديريات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const registerSchool = useCallback(async (dto: RegisterSchoolDto): Promise<School> => {
    const res = await schoolsApi.registerSchool(dto);
    if (!res.data) {
      throw new Error(res.message || 'فشل تسجيل المدرسة');
    }
    const newSchool = res.data;
    setSchools((prev) => [newSchool, ...prev]);
    // Increment directorate count locally
    setDirectorates((prev) =>
      prev.map((d) => (d.directorateId === dto.directorateId ? { ...d, schoolCount: d.schoolCount + 1 } : d))
    );
    return newSchool;
  }, []);

  const updateSchool = useCallback(async (schoolId: number, dto: Partial<School>): Promise<School> => {
    const res = await schoolsApi.updateSchool(schoolId, dto);
    if (!res.data) {
      throw new Error(res.message || 'فشل تحديث المدرسة');
    }
    const updated = res.data;
    setSchools((prev) => prev.map((s) => (s.schoolId === schoolId ? updated : s)));
    return updated;
  }, []);

  const assignEvaluator = useCallback(async (schoolId: number, userId: number): Promise<School> => {
    const res = await schoolsApi.assignEvaluator(schoolId, userId);
    if (!res.data) {
      throw new Error(res.message || 'فشل إسناد المقيّم للمدرسة');
    }
    const updated = res.data;
    setSchools((prev) => prev.map((s) => (s.schoolId === schoolId ? updated : s)));
    // Also update users state to reflect new school affiliation
    setUsers((prev) => prev.map((u) => u.userId === userId ? { ...u, schoolId } : u));
    return updated;
  }, []);

  const addDirectorate = useCallback(async (dto: AddDirectorateDto): Promise<Directorate> => {
    const res = await schoolsApi.addDirectorate(dto);
    if (!res.data) {
      throw new Error(res.message || 'فشل إضافة المديرية');
    }
    const newDir = res.data;
    setDirectorates((prev) => [...prev, newDir]);
    return newDir;
  }, []);

  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      const matchDir =
        selectedDirectorateId === null ||
        s.directorateId === selectedDirectorateId;

      const matchType =
        typeFilter === 'all' ||
        s.schoolType === typeFilter;

      const matchSearch =
        !searchQuery.trim() ||
        s.schoolName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.schoolCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.evaluatorName && s.evaluatorName.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchDir && matchType && matchSearch;
    });
  }, [schools, selectedDirectorateId, typeFilter, searchQuery]);

  return {
    schools,
    filteredSchools,
    directorates,
    users,
    loading,
    error,
    selectedDirectorateId,
    setSelectedDirectorateId,
    typeFilter,
    setTypeFilter,
    searchQuery,
    setSearchQuery,
    fetchData,
    registerSchool,
    updateSchool,
    assignEvaluator,
    addDirectorate,
  };
}
