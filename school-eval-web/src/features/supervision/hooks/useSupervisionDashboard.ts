/**
 * useSupervisionDashboard.ts
 * خطاف إدارة بيانات لوحة المتابعة الإشرافية المركزية ومصفوفة المدارس
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supervisionApi } from '../api/supervisionApi';
import type { SupervisionDashboardData } from '../api/supervisionTypes';

export function useSupervisionDashboard() {
  const [data, setData] = useState<SupervisionDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // الفلاتر والبحث
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await supervisionApi.getDashboard();
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'تعذر استرجاع بيانات لوحة المتابعة الإشرافية.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // تصفية المدارس بحسب مصطلحات البحث والفلاتر
  const filteredSchools = useMemo(() => {
    if (!data?.schools) return [];

    return data.schools.filter((school) => {
      // بحث بالاسم أو الكود
      const matchesSearch =
        !searchTerm.trim() ||
        school.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.schoolCode.toLowerCase().includes(searchTerm.toLowerCase());

      // فلترة بالحالة
      const matchesStatus =
        statusFilter === 'all' || school.outputStatus === statusFilter;

      // فلترة بالمرحلة
      const matchesStage =
        stageFilter === 'all' || school.educationalStage.includes(stageFilter);

      return matchesSearch && matchesStatus && matchesStage;
    });
  }, [data?.schools, searchTerm, statusFilter, stageFilter]);

  return {
    dashboardData: data,
    schools: filteredSchools,
    totalCount: data?.schools.length ?? 0,
    kpis: data?.kpis,
    governanceCallout: data?.governanceCallout,
    scope: data?.scope,
    isLoading,
    error,
    refetch: fetchDashboard,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    stageFilter,
    setStageFilter,
  };
}
