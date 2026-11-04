/**
 * useAdminDashboard.ts
 * React Hook managing Central Administrator Dashboard Metrics & Health
 */

import { useState, useEffect, useCallback } from 'react';
import { dashboardApi, type AdminDashboardStats } from '../api/dashboardApi';
import { schoolsApi } from '../api/schoolsApi';
import { auditApi } from '../api/auditApi';
import type { School, AuditLogEntry } from '../types/admin.types';

export function useAdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, schoolsRes, logsRes] = await Promise.all([
        dashboardApi.getDashboardStats(),
        schoolsApi.getSchools(),
        auditApi.getAuditLogs(),
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (schoolsRes.data) setSchools(schoolsRes.data);
      if (logsRes.data) setAuditLogs(logsRes.data);
    } catch (err: any) {
      setError(err?.message || 'فشل في تحميل بيانات لوحة القيادة');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    stats,
    schools,
    auditLogs,
    loading,
    error,
    fetchData,
  };
}
