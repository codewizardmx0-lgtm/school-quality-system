/**
 * useAdminAudit.ts
 * React Hook managing Security Audit Trail, Blocked IPs, and Filtered Audit Export
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { auditApi } from '../api/auditApi';
import { usersApi } from '../api/usersApi';


import type { AuditLogEntry, BlockedIp, User } from '../types/admin.types';

export interface AuditEventOption {
  key: string;
  label: string;
}

export const AUDIT_EVENT_OPTIONS: AuditEventOption[] = [
  { key: 'auth.login_success', label: 'تسجيل دخول ناجح' },
  { key: 'auth.login_failed', label: 'فشل تسجيل الدخول' },
  { key: 'auth.logout', label: 'تسجيل خروج' },
  { key: 'auth.password_changed', label: 'تغيير كلمة المرور' },
  { key: 'school.created', label: 'تسجيل مدرسة جديدة' },
  { key: 'school.updated', label: 'تعديل بيانات مدرسة' },
  { key: 'school.deleted', label: 'حذف مدرسة' },
  { key: 'school.status_toggled', label: 'تعديل حالة مدرسة' },
  { key: 'school.assigned_principal', label: 'إسناد مدير لمدرسة' },
  { key: 'school.unassigned_principal', label: 'فك ارتباط مدير عن مدرسة' },
  { key: 'school.assigned_evaluator', label: 'إسناد مقيم جودة' },
  { key: 'school.unassigned_evaluator', label: 'فك ارتباط مقيم جودة' },
  { key: 'user.created', label: 'إنشاء حساب مستخدم جديد' },
  { key: 'user.updated', label: 'تعديل بيانات مستخدم' },
  { key: 'user.status_toggled', label: 'تعديل حالة حساب مستخدم' },
  { key: 'user.password_reset', label: 'إعادة ضبط كلمة المرور' },
  { key: 'directorate.created', label: 'إنشاء مديرية تعليمية' },
  { key: 'directorate.updated', label: 'تعديل مديرية تعليمية' },
  { key: 'directorate.deleted', label: 'حذف مديرية تعليمية' },
  { key: 'evaluation.scored', label: 'رصد درجات التقييم' },
  { key: 'evaluation.submitted', label: 'إرسال التقييم للاعتماد' },
  { key: 'evaluation.direct_closed', label: 'إغلاق التقييم واعتماده' },
  { key: 'completion.created', label: 'طلب استكمال شواهد' },
  { key: 'completion.deadline_extended', label: 'تمديد مهلة استكمال' },
  { key: 'completion.resubmitted', label: 'إعادة تسليم استكمال' },
  { key: 'completion.closed', label: 'إغلاق ملف الاستكمال' },
  { key: 'evidence.unlinked', label: 'فك ارتباط شواهد' },
  { key: 'standard_version.activated', label: 'تفعيل وثيقة معايير' },
  { key: 'standard_version.auto_archived', label: 'أرشفة وثيقة معايير تلقائيًا' },
  { key: 'system.maintenance_mode_toggled', label: 'تبديل وضع الصيانة' },
  { key: 'system.test_email_sent', label: 'إرسال بريد اختباري' },
];

export const AUDIT_EVENT_LABELS: Record<string, string> = Object.fromEntries(
  AUDIT_EVENT_OPTIONS.map((o) => [o.key, o.label])
);

export function useAdminAudit() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [rawUsers, setRawUsers] = useState<User[]>([]);
  const [usersList, setUsersList] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filters
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [actionType, setActionType] = useState<string>('الكل');
  const [actor, setActor] = useState<string>('الكل');
  const [timeScope, setTimeScope] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Live aggregate stats from DB
  const [auditStats, setAuditStats] = useState<{
    totalLogs: number;
    sensitiveCount: number;
    failedLoginsCount: number;
    archiveSyncStatus: string;
  }>({
    totalLogs: 0,
    sensitiveCount: 0,
    failedLoginsCount: 0,
    archiveSyncStatus: 'متزامن 100%',
  });

  // Load real registered users once to guarantee availableActors contains all system accounts
  useEffect(() => {
    let ignore = false;
    usersApi.getUsers().then((res) => {
      if (!ignore && res.data) {
        setRawUsers(res.data);
        setUsersList(res.data.map((u) => u.fullName).filter(Boolean));
      }
    }).catch(() => {});
    return () => { ignore = true; };
  }, []);

  const handleSelectedActionsChange = useCallback((actions: string[]) => {
    setSelectedActions(actions);
    setActionType(actions.length === 1 ? actions[0] : (actions.length === 0 ? 'الكل' : actions.join(',')));
    setCurrentPage(1);
  }, []);

  const handleActionTypeChange = useCallback((newType: string) => {
    if (newType === 'الكل' || !newType) {
      setSelectedActions([]);
      setActionType('الكل');
    } else {
      const parts = newType.split(',').map((p) => p.trim()).filter(Boolean);
      setSelectedActions(parts);
      setActionType(newType);
    }
    setCurrentPage(1);
  }, []);

  const handleActorChange = useCallback((newActor: string) => {
    setActor(newActor);
    setCurrentPage(1);
  }, []);

  const handleSearchQueryChange = useCallback((newQuery: string) => {
    setSearchQuery(newQuery);
    setCurrentPage(1);
  }, []);

  const handleTimeScopeChange = useCallback((newScope: string) => {
    setTimeScope(newScope);
    setCurrentPage(1);
  }, []);

  const fetchData = useCallback(async (page: number = currentPage) => {
    setLoading(true);
    setError(null);
    try {
      const selectedUser = actor !== 'الكل' ? rawUsers.find((u) => u.fullName === actor) : null;
      const actionsParam = selectedActions.length > 0
        ? selectedActions.join(',')
        : (actionType !== 'الكل' ? actionType : undefined);

      const [logsRes, ipsRes] = await Promise.all([
        auditApi.getAuditLogs({
          actions: actionsParam,
          actionType: actionsParam,
          userId: selectedUser ? selectedUser.userId : undefined,
          q: searchQuery.trim() || undefined,
          timeScope: timeScope !== 'all' ? timeScope : undefined,
          page,
          perPage: 15,
        }),
        auditApi.getBlockedIps(),
      ]);
      if (logsRes.data) {
        setLogs(logsRes.data);
        if (logsRes.meta) {
          const m = logsRes.meta as any;
          setCurrentPage(m.currentPage ?? m.current_page ?? m.page ?? page);
          setTotalPages(m.lastPage ?? m.last_page ?? 1);
          setTotalCount(m.total ?? logsRes.data.length);
          if (m.stats) {
            setAuditStats(m.stats);
          }
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
  }, [selectedActions, actionType, actor, currentPage, rawUsers, searchQuery, timeScope]);

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

    const availableEventOptions = useMemo<AuditEventOption[]>(() => {
    const map = new Map<string, string>();
    for (const opt of AUDIT_EVENT_OPTIONS) {
      map.set(opt.key, opt.label);
    }
    for (const l of logs) {
      const k = l.action || l.eventType;
      if (k && !map.has(k)) {
        map.set(k, l.eventType || k);
      }
    }
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [logs]);

  const availableEventTypes = useMemo(() => {
    return availableEventOptions.map((o) => o.key);
  }, [availableEventOptions]);

  const availableActors = useMemo(() => {
    const fromLogs = logs.map((l) => l.actorName).filter(Boolean);
    return Array.from(new Set([...usersList, ...fromLogs]));
  }, [logs, usersList]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchAction =
        (selectedActions.length === 0 && actionType === 'الكل') ||
        (selectedActions.length > 0 && (
          selectedActions.includes(log.action || '') ||
          selectedActions.includes(log.eventType || '') ||
          (log.action && selectedActions.includes(AUDIT_EVENT_LABELS[log.action] || ''))
        )) ||
        (selectedActions.length === 0 && (
          log.action === actionType ||
          log.eventType === actionType ||
          AUDIT_EVENT_LABELS[log.action || ''] === actionType
        ));

      const matchActor =
        actor === 'الكل' ||
        log.actorName === actor ||
        log.actorRole === actor;

      const matchTime = (() => {
        if (timeScope === 'all') return true;
        const now = Date.now();
        const logTime = new Date(log.timestamp).getTime();
        const diffHours = (now - logTime) / (1000 * 60 * 60);
        if (timeScope === '24h' || timeScope === 'today') return diffHours <= 24;
        if (timeScope === '7d' || timeScope === 'week') return diffHours <= 168;
        if (timeScope === '30d' || timeScope === 'month') return diffHours <= 720;
        return true;
      })();

      const matchSearch = (() => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.trim().toLowerCase();
        return (
          (log.actorName && log.actorName.toLowerCase().includes(q)) ||
          (log.actorRole && log.actorRole.toLowerCase().includes(q)) ||
          (log.description && log.description.toLowerCase().includes(q)) ||
          (log.descriptionAr && log.descriptionAr.toLowerCase().includes(q)) ||
          (log.eventType && log.eventType.toLowerCase().includes(q)) ||
          (log.ipAddress && log.ipAddress.toLowerCase().includes(q))
        );
      })();

      return matchAction && matchActor && matchTime && matchSearch;
    });
  }, [logs, selectedActions, actionType, actor, timeScope, searchQuery]);

  const fetchAllMatchingLogs = useCallback(async (): Promise<AuditLogEntry[]> => {
    try {
      const selectedUser = actor !== 'الكل' ? rawUsers.find((u) => u.fullName === actor) : null;
      const actionsParam = selectedActions.length > 0
        ? selectedActions.join(',')
        : (actionType !== 'الكل' ? actionType : undefined);

      const res = await auditApi.getAuditLogs({
        actions: actionsParam,
        actionType: actionsParam,
        userId: selectedUser ? selectedUser.userId : undefined,
        q: searchQuery.trim() || undefined,
        timeScope: timeScope !== 'all' ? timeScope : undefined,
        all: true,
      });
      if (res && res.data && Array.isArray(res.data)) {
        return res.data;
      }
      return filteredLogs;
    } catch {
      return filteredLogs;
    }
  }, [selectedActions, actionType, actor, rawUsers, searchQuery, timeScope, filteredLogs]);

  return {
    logs,
    filteredLogs,
    availableEventTypes,
    availableEventOptions,
    availableActors,
    blockedIps,
    loading,
    error,
    selectedActions,
    setSelectedActions: handleSelectedActionsChange,
    actionType,
    setActionType: handleActionTypeChange,
    actor,
    setActor: handleActorChange,
    timeScope,
    setTimeScope: handleTimeScopeChange,
    searchQuery,
    setSearchQuery: handleSearchQueryChange,
    currentPage,
    setCurrentPage,
    totalPages,
    totalCount,
    auditStats,
    fetchData,
    unblockIp,
    fetchAllMatchingLogs,
  };
}
