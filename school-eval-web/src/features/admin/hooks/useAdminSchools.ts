/**
 * useAdminSchools.ts
 * React Hook managing Schools and Directorates state, filtering, and mutations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { schoolsApi } from '../api/schoolsApi';
import { usersApi } from '../api/usersApi';
import type { School, Directorate, Governorate, User, RegisterSchoolDto, AddDirectorateDto } from '../types/admin.types';

export function useAdminSchools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [directorates, setDirectorates] = useState<Directorate[]>([]);
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters: default to null to show all schools across all directorates
  const [selectedGovernorateId, setSelectedGovernorateId] = useState<number | null>(null);
  const [selectedDirectorateId, setSelectedDirectorateId] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'government' | 'private'>('all');
  const [readinessFilter, setReadinessFilter] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSetSelectedGovernorateId = useCallback((id: number | null) => {
    setSelectedGovernorateId(id);
    setSelectedDirectorateId(null); // Reset directorate whenever governorate changes
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [schoolsRes, dirRes, usersRes, govRes] = await Promise.all([
        schoolsApi.getSchools(),
        schoolsApi.getDirectorates(),
        usersApi.getUsers(),
        schoolsApi.getGovernorates(),
      ]);
      if (schoolsRes.data) setSchools(schoolsRes.data);
      if (dirRes.data) setDirectorates(dirRes.data);
      if (usersRes.data) setUsers(usersRes.data);
      if (govRes.data) setGovernorates(govRes.data);
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
      const selectedDir = selectedDirectorateId !== null
        ? directorates.find((d) => d.directorateId === selectedDirectorateId)
        : null;

      const matchDir =
        selectedDirectorateId === null ||
        (selectedDir && (
          s.directorate === selectedDir.directorateName ||
          s.educationalDistrict === selectedDir.directorateName ||
          (s.directorate && s.directorate.includes(selectedDir.directorateName)) ||
          (selectedDir.directorateName && selectedDir.directorateName.includes(s.directorate))
        )) ||
        (s.directorateId !== null && s.directorateId !== undefined && s.directorateId === selectedDirectorateId);

      const matchType =
        typeFilter === 'all' ||
        s.schoolType === typeFilter;

      const hasPrincipal = Boolean(s.principal?.userId || s.principal?.fullName);
      const hasEvaluator = Boolean((s.evaluators && s.evaluators.length > 0) || (s.evaluatorName && s.evaluatorName.trim() !== ''));
      const isComplete = hasPrincipal && hasEvaluator;

      const matchReadiness =
        readinessFilter === 'all' ||
        (readinessFilter === 'complete' && isComplete) ||
        (readinessFilter === 'incomplete' && !isComplete);

      const matchGov =
        selectedGovernorateId === null ||
        s.governorateId === selectedGovernorateId;

      const matchSearch =
        !searchQuery.trim() ||
        s.schoolName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.schoolCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.evaluatorName && s.evaluatorName.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchDir && matchType && matchReadiness && matchGov && matchSearch;
    });
  }, [schools, directorates, selectedDirectorateId, selectedGovernorateId, typeFilter, readinessFilter, searchQuery]);

  return {
    schools,
    filteredSchools,
    directorates,
    governorates,
    users,
    loading,
    error,
    selectedGovernorateId,
    setSelectedGovernorateId: handleSetSelectedGovernorateId,
    selectedDirectorateId,
    setSelectedDirectorateId,
    typeFilter,
    setTypeFilter,
    readinessFilter,
    setReadinessFilter,
    searchQuery,
    setSearchQuery,
    fetchData,
    registerSchool,
    updateSchool,
    assignEvaluator,
    addDirectorate,
  };
}
