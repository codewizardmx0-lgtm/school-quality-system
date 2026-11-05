/**
 * useAdminAudit.ts
 * React Hook managing Security Audit Trail, Blocked IPs, and CSV Export
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { auditApi } from '../api/auditApi';
import { usersApi } from '../api/usersApi';
import { downloadEncryptedLog } from '../utils/exportUtils';
import { formatArabicDateTime } from '../utils/dateUtils';
import type { AuditLogEntry, BlockedIp } from '../types/admin.types';

export const AUDIT_EVENT_LABELS: Record<string, string> = {
  'auth.login_success': 'تسجيل دخول ناجح',
  'auth.login_failed': 'فشل تسجيل الدخول',
  'auth.logout': 'تسجيل خروج',
  'auth.password_changed': 'تغيير كلمة المرور',
  'evaluation.scored': 'رصد درجات التقييم',
  'evaluation.submitted': 'إرسال التقييم',
  'evaluation.direct_closed': 'إغلاق التقييم مباشرة',
  'completion.created': 'إنشاء طلب استكمال',
  'completion.deadline_extended': 'تمديد مهلة الاستكمال',
  'completion.resubmitted': 'إعادة إرسال الاستكمال',
  'completion.closed': 'إغلاق ملف الاستكمال',
  'evidence.unlinked': 'فك ارتباط شواهد',
  'standard_version.activated': 'تفعيل وثيقة معايير',
  'standard_version.auto_archived': 'أرشفة وثيقة معايير تلقائيًا',
};

export function useAdminAudit() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [usersList, setUsersList] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filters
  const [actionType, setActionType] = useState<string>('الكل');
  const [actor, setActor] = useState<string>('الكل');
  const [timeScope, setTimeScope] = useState<string>('all');

  // Load real registered users once to guarantee availableActors contains all system accounts
  useEffect(() => {
    let ignore = false;
    usersApi.getUsers().then((res) => {
      if (!ignore && res.data) {
        setUsersList(res.data.map((u) => u.fullName).filter(Boolean));
      }
    }).catch(() => {});
    return () => { ignore = true; };
  }, []);

  const fetchData = useCallback(async (page: number = currentPage) => {
    setLoading(true);
    setError(null);
    try {
      const [logsRes, ipsRes] = await Promise.all([
        auditApi.getAuditLogs({
          actionType: actionType !== 'الكل' ? actionType : undefined,
          page,
          perPage: 25,
        }),
        auditApi.getBlockedIps(),
      ]);
      if (logsRes.data) {
        setLogs(logsRes.data);
        if (logsRes.meta) {
          const m = logsRes.meta as any;
          setCurrentPage(m.currentPage ?? m.current_page ?? page);
          setTotalPages(m.lastPage ?? m.last_page ?? 1);
          setTotalCount(m.total ?? logsRes.data.length);
        } else {
          setTotalCount(logsRes.data.length);
        }
      }
      if (ipsRes.data) setBlockedIps(ipsRes.data);
    } catch (err: any) {
      setError(err?.message || 'فشل في تحميل سجلات التدقيق الأمني');
    } finally {
      setLoading(false);
    }
  }, [actionType, currentPage]);

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

  const availableEventTypes = useMemo(() => {
    const fromLogs = logs.map((l) => l.eventType).filter(Boolean);
    const predefined = Object.keys(AUDIT_EVENT_LABELS);
    return Array.from(new Set([...fromLogs, ...predefined]));
  }, [logs]);

  const availableActors = useMemo(() => {
    const fromLogs = logs.map((l) => l.actorName).filter(Boolean);
    return Array.from(new Set([...usersList, ...fromLogs]));
  }, [logs, usersList]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchAction =
        actionType === 'الكل' ||
        log.eventType === actionType ||
        log.eventCategory === actionType;

      const matchActor =
        actor === 'الكل' ||
        log.actorName === actor ||
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
    availableEventTypes,
    availableActors,
    blockedIps,
    loading,
    error,
    actionType,
    setActionType,
    actor,
    setActor,
    timeScope,
    setTimeScope,
    currentPage,
    setCurrentPage,
    totalPages,
    totalCount,
    fetchData,
    unblockIp,
    exportAuditCsv,
  };
}
