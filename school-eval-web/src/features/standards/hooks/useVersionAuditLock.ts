/**
 * Hook: useVersionAuditLock
 * سجل الفروقات والتغييرات، التحقق الآلي من الشروط الحاكمة (4 من 4)،
 * والقفل والاعتماد الوزاري الرقمي بختم SHA-256
 */

import { useState, useEffect, useCallback } from 'react';
import { standardsApi } from '../api/standardsApi';
import type {
  DiffLogResponse,
  VersionLockPreconditions,
  LockVersionPayload,
} from '../api/standardsTypes';

export function useVersionAuditLock(versionId?: number | string) {
  const [diffData, setDiffData] = useState<DiffLogResponse | null>(null);
  const [preconditions, setPreconditions] = useState<VersionLockPreconditions | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLocking, setIsLocking] = useState<boolean>(false);
  const [isLockedSuccessfully, setIsLockedSuccessfully] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditData = useCallback(async () => {
    if (!versionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [diffRes, preRes] = await Promise.all([
        standardsApi.getDiffLog(versionId),
        standardsApi.getLockPreconditions(versionId),
      ]);
      setDiffData(diffRes);
      setPreconditions(preRes);
    } catch (err: any) {
      setError(err?.message || 'فشل تحميل بيانات التدقيق والشروط الحاكمة.');
    } finally {
      setIsLoading(false);
    }
  }, [versionId]);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  // تنفيذ الاعتماد والقفل الرسمي النهائي
  const executeOfficialLock = async (payload: LockVersionPayload) => {
    if (!versionId) return;
    setIsLocking(true);
    setError(null);
    try {
      await standardsApi.lockVersion(versionId, payload);
      setIsLockedSuccessfully(true);
      await fetchAuditData();
    } catch (err: any) {
      setError(err?.message || 'تعذر اعتماد وقفل وثيقة المعايير.');
      throw err;
    } finally {
      setIsLocking(false);
    }
  };

  // تصدير التقرير الرسمي PDF
  const triggerPdfExport = async () => {
    if (!versionId) return;
    try {
      const result = await standardsApi.exportPdfReport(versionId);
      return result;
    } catch (err: any) {
      setError(err?.message || 'تعذر تصدير تقرير الاعتماد PDF.');
      throw err;
    }
  };

  return {
    diffData,
    preconditions,
    isLoading,
    isLocking,
    isLockedSuccessfully,
    error,
    refetch: fetchAuditData,
    executeOfficialLock,
    triggerPdfExport,
  };
}
