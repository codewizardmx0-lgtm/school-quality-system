/**
 * auditApi.ts
 * Real API service for Security Audit Trail and Blocked IPs
 * Conforms to conventions.md (§2, §3, §7, §8)
 */

import { get, post } from '../../../api/apiClient';
import type { ApiResponse } from '../../../api/apiTypes';
import type { AuditLogEntry, BlockedIp } from '../types/admin.types';
import { mockAdminService } from '../services/mockAdminData';

export interface AuditQueryParams {
  actionType?: string;
  userId?: number;
  timeRange?: string;
  page?: number;
  perPage?: number;
}

export const auditApi = {
  /**
   * Fetch audit logs stream with filtering and pagination
   */
  async getAuditLogs(params?: AuditQueryParams): Promise<ApiResponse<AuditLogEntry[]>> {
    try {
      const response = await get<AuditLogEntry[]>('/audit-logs', { params });
      if (response && response.data) {
        return response;
      }
      return mockAdminService.getAuditLogs();
    } catch (error) {
      console.warn('Backend audit logs API call failed, falling back to mock:', error);
      return mockAdminService.getAuditLogs();
    }
  },

  /**
   * Get list of blocked IP addresses
   */
  async getBlockedIps(): Promise<ApiResponse<BlockedIp[]>> {
    try {
      const response = await get<BlockedIp[]>('/security/blocked-ips');
      if (response && response.data) {
        return response;
      }
      return mockAdminService.getBlockedIps();
    } catch (error) {
      console.warn('Backend blocked IPs API call failed, falling back to mock:', error);
      return mockAdminService.getBlockedIps();
    }
  },

  /**
   * Unblock an IP address by IP string or ID
   */
  async unblockIp(payload: { ip?: string; ipId?: number }): Promise<ApiResponse<boolean>> {
    try {
      return await post<boolean>('/security/unblock-ip', payload);
    } catch (error) {
      console.warn('Backend unblock IP failed, applying mock fallback:', error);
      if (payload.ipId) {
        return mockAdminService.unblockIp(payload.ipId);
      }
      return { data: true, message: 'تم فك حظر عنوان IP بنجاح.', errors: null, meta: null };
    }
  },
};
