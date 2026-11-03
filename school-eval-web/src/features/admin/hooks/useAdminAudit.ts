/**
 * useAdminAudit.ts
 * React Hook managing Security Audit Trail, Blocked IPs, and CSV Export
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { auditApi } from '../api/auditApi';
import { downloadEncryptedLog } from '../utils/exportUtils';
import { formatArabicDateTime } from '../utils/dateUtils';
import type { AuditLogEntry, BlockedIp } from '../types/admin.types';

export function useAdminAudit() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionType, setActionType] = useState<string>('الكل');
  const [actor, setActor] = useState<string>('الكل');
  const [timeScope, setTimeScope] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [logsRes, ipsRes] = await Promise.all([
        auditApi.getAuditLogs({ actionType: actionType !== 'الكل' ? actionType : undefined }),
        auditApi.getBlockedIps(),
      ]);
      if (logsRes.data) setLogs(logsRes.data);
      if (ipsRes.data) setBlockedIps(ipsRes.data);
    } catch (err: any) {
      setError(err?.message || 'فشل في تحميل سجلات التدقيق الأمني');
    } finally {
      setLoading(false);
    }
  }, [actionType]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const unblockIp = useCallback(async (payload: { ip?: string; ipId?: number }): Promise<boolean> => {
    await auditApi.unblockIp(payload);
    // Remove from local state
    setBlockedIps((prev) =>
      prev.filter((item) => {
        if (payload.ipId && item.ipId === payload.ipId) return false;
        if (payload.ip && item.ipAddress === payload.ip) return false;
        return true;
      })
    );
    return true;
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchAction =
        actionType === 'الكل' ||
        log.eventType === actionType ||
        log.eventCategory === actionType;

      const matchActor =
        actor === 'الكل' ||
        log.actorRole === actor;

      const matchTime = (() => {
        if (timeScope === 'all') return true;
        const now = Date.now();
        const logTime = new Date(log.timestamp).getTime();
        const diffHours = (now - logTime) / (1000 * 60 * 60);
        if (timeScope === 'today') return diffHours <= 24;
        if (timeScope === 'week') return diffHours <= 168;
        if (timeScope === 'month') return diffHours <= 720;
        return true;
      })();

      return matchAction && matchActor && matchTime;
    });
  }, [logs, actionType, actor, timeScope]);

  const exportAuditCsv = useCallback(() => {
    const headers = [
      'معرف السجل',
      'التاريخ والوقت',
      'المستخدم',
      'الدور الوظيفي',
      'نوع الحدث',
      'مستوى الأمان',
      'الوصف',
      'عنوان IP',
      'الموقع الجغرافي',
      'البصمة الرقمية',
      'الحالة الأمنية',
    ];

    const rows = filteredLogs.map((l) => [
      l.logId,
      formatArabicDateTime(l.timestamp),
      l.actorName,
      l.actorRole,
      l.eventType,
      l.eventCategory,
      l.description,
      l.ipAddress,
      l.location,
      l.digitalHash,
      l.securityStatus === 'verified' ? 'موثوق ومحمي' : 'محظور',
    ]);

    downloadEncryptedLog(
      `audit_log_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  }, [filteredLogs]);

  return {
    logs,
    filteredLogs,
    blockedIps,
    loading,
    error,
    actionType,
    setActionType,
    actor,
    setActor,
    timeScope,
    setTimeScope,
    fetchData,
    unblockIp,
    exportAuditCsv,
  };
}
