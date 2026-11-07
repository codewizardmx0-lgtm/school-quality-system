/**
 * Hook: useStandardsVersions
 * إدارة وسجل إصدارات وثيقة المعايير والاعتماد المدرسي
 */

import { useState, useEffect, useCallback } from 'react';
import { standardsApi } from '../api/standardsApi';
import type { StandardVersionSummary, CreateDraftPayload } from '../api/standardsTypes';

export function useStandardsVersions() {
  const [versions, setVersions] = useState<StandardVersionSummary[]>([]);
  const [activeVersion, setActiveVersion] = useState<StandardVersionSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchVersions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await standardsApi.getVersions();
      setVersions(data);
      const active = data.find((v) => v.status === 'Active' || v.status === 'active') || data[0] || null;
      setActiveVersion(active);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل قائمة الإصدارات المعيارية من الخادم.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const createDraft = async (payload: CreateDraftPayload): Promise<StandardVersionSummary> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const newVersion = await standardsApi.createDraftVersion(payload);
      await fetchVersions();
      return newVersion;
    } catch (err: any) {
      const msg = err?.message || 'حدث خطأ أثناء إنشاء مسودة الإصدار.';
      setError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const duplicateVersion = async (sourceId: number, newVersionNo: string): Promise<StandardVersionSummary> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const duplicated = await standardsApi.duplicateVersion(sourceId, newVersionNo);
      await fetchVersions();
      return duplicated;
    } catch (err: any) {
      const msg = err?.message || 'فشل استنساخ مسودة الإصدار المعياري.';
      setError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    versions,
    activeVersion,
    isLoading,
    error,
    isSubmitting,
    refetch: fetchVersions,
    createDraft,
    duplicateVersion,
    setActiveVersion,
  };
}
