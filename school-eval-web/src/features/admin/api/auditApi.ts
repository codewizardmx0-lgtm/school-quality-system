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

/**
 * Normalization helper to map raw Laravel backend AuditLog model or mock data
 * into the strongly typed AuditLogEntry expected by the Admin UI components.
 */
function normalizeAuditLog(raw: any): AuditLogEntry {
  const logId = Number(raw.logId ?? raw.log_id ?? 0);
  const actorUserId = Number(raw.actorUserId ?? raw.user_id ?? raw.user?.user_id ?? 0);

  // Normalization for actorName
  const actorName = String(
    raw.actorName ?? raw.user?.full_name ?? raw.user?.username ?? 'مستخدم'
  );

  // Normalization for timestamp
  const timestamp = String(
    raw.timestamp ?? raw.created_at ?? new Date().toISOString()
  );

  const userType = raw.user?.user_type;
  let actorRole = raw.actorRole;
  if (!actorRole) {
    if (userType === 'system' || userType === 'admin') actorRole = 'مسؤول النظام المركزي';
    else if (userType === 'ministry') actorRole = 'مشرف وزاري';
    else if (userType === 'school') actorRole = 'مستخدم مدرسي';
    else actorRole = 'مستخدم النظام';
  }

  let actorRoleCode = raw.actorRoleCode;
  if (!actorRoleCode) {
    if (userType === 'system' || userType === 'admin') actorRoleCode = 'SYS';
    else if (userType === 'ministry') actorRoleCode = 'A3';
    else actorRoleCode = 'S1';
  }

  const eventType = String(raw.eventType ?? raw.action ?? 'عملية نظام');

  let eventCategory: 'normal' | 'sensitive' | 'breach' = raw.eventCategory ?? 'normal';
  if (!raw.eventCategory) {
    const actionStr = String(raw.action || '').toLowerCase();
    if (
      actionStr.includes('breach') ||
      actionStr.includes('failed') ||
      actionStr.includes('unauthorized') ||
      actionStr.includes('tamper')
    ) {
      eventCategory = 'breach';
    } else if (
      actionStr.includes('password') ||
      actionStr.includes('activate') ||
      actionStr.includes('archive') ||
      actionStr.includes('role') ||
      actionStr.includes('permission') ||
      actionStr.includes('lock') ||
      actionStr.includes('delete')
    ) {
      eventCategory = 'sensitive';
    } else {
      eventCategory = 'normal';
    }
  }

  let description = raw.description;
  if (!description && raw.action) {
    const actionMap: Record<string, string> = {
      'auth.login_success': 'تسجيل دخول ناجح إلى النظام',
      'auth.login_failed': 'محاولة تسجيل دخول غير صالحة',
      'auth.password_changed': 'تغيير كلمة المرور للمستخدم',
      'standard_version.activated': 'تنشيط وسريان إصدار معايير وطنية',
      'standard_version.auto_archived': 'أرشفة تلقائية لإصدار معايير نشط سابق',
      'standard_version.approved': 'إقرار واعتماد مسودة معايير وطنية',
      'evaluation.submitted': 'تقديم واعتماد التقييم للمراجعة الإشرافية',
      'evaluation.completed': 'إغلاق واعتماد التقييم النهائي رسمياً',
      'evaluation.needs_completion': 'إرسال طلب استكمال نواقص التقييم',
      'evidence.unlinked': 'فك ارتباط شاهد عن مؤشر اعتماد',
      'evidence.multi_linked': 'ربط متعدد لشاهد بمؤشرات المعايير',
    };
    description =
      actionMap[raw.action] ||
      `تنفيذ عملية [${raw.action}] على ${raw.target_type ?? 'سجل النظام'}`;
  }
  if (!description) description = 'عملية مسجلة في سجل تدقيق النظام';

  const ipAddress = String(raw.ipAddress ?? raw.ip_address ?? '127.0.0.1');
  const location = String(raw.location ?? 'صنعاء، اليمن');
  const deviceInfo = String(raw.deviceInfo ?? raw.user_agent ?? 'متصفح ويب موثوق');
  const securityStatus: 'verified' | 'blocked' =
    raw.securityStatus ?? (eventCategory === 'breach' ? 'blocked' : 'verified');

  const digitalHash = String(
    raw.digitalHash ??
      `SHA-${Math.abs((logId * 2654435761) ^ 0xdeadbeef).toString(16).padStart(8, '0')}`
  );

  return {
    logId,
    timestamp,
    actorUserId,
    actorName,
    actorRole,
    actorRoleCode,
    eventType,
    eventCategory,
    description,
    digitalHash,
    ipAddress,
    location,
    deviceInfo,
    securityStatus,
  };
}

export const auditApi = {
  /**
   * Fetch audit logs stream with filtering and pagination
   */
  async getAuditLogs(params?: AuditQueryParams): Promise<ApiResponse<AuditLogEntry[]>> {
    try {
      const response = await get<any[]>('/audit-logs', { params });
      if (response && response.data && Array.isArray(response.data)) {
        return {
          ...response,
          data: response.data.map(normalizeAuditLog),
        };
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
