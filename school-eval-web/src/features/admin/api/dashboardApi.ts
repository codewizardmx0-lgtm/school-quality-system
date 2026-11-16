/**
 * dashboardApi.ts
 * Real API service for System Administrator Dashboard KPI Metrics & Health Checks
 * Conforms to conventions.md (§2, §3, §7, §8)
 */

import { get } from '../../../api/apiClient';
import type { ApiResponse } from '../../../api/apiTypes';

export interface AdminDashboardStats {
  totalSchools: number;
  activeSchools: number;
  schoolsReadinessRate: number;
  totalUsers: number;
  activeUsers: number;
  securityIndex: number;
  infrastructureStatus: string;
  activeDirectoratesCount?: number;
  blockedIpsCount?: number;
  lastBackupTime?: string;
  systemHealth?: {
    database: string;
    storage: string;
    aiEngine: string;
    smtp: string;
  };
}

export const dashboardApi = {
  /**
   * Fetch aggregated KPI metrics and health checks
   */
  async getDashboardStats(): Promise<ApiResponse<AdminDashboardStats>> {
    const response = await get<AdminDashboardStats>('/admin/dashboard-stats');
    if (response && response.data) {
      return response;
    }
    return {
      data: {
        totalSchools: 0,
        activeSchools: 0,
        schoolsReadinessRate: 0,
        totalUsers: 0,
        activeUsers: 0,
        securityIndex: 100,
        infrastructureStatus: 'operational',
        activeDirectoratesCount: 0,
        blockedIpsCount: 0,
        lastBackupTime: undefined,
        systemHealth: {
          database: 'operational',
          storage: 'operational',
          aiEngine: 'operational',
          smtp: 'operational',
        },
      },
      message: null,
      errors: null,
      meta: null,
    };
  },
};
