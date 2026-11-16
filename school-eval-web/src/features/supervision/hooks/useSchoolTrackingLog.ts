/**
 * useSchoolTrackingLog.ts
 * خطاف إدارة سجل المتابعة الزمني والمذكرات الإشرافية الميدانية للمدرسة
 */

import { useState, useEffect, useCallback } from 'react';
import { supervisionApi } from '../api/supervisionApi';
import type { SchoolTrackingLogData, MilestoneEvent } from '../api/supervisionTypes';

export function useSchoolTrackingLog(schoolId: number = 104) {
  const [data, setData] = useState<SchoolTrackingLogData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // حالة إضافة مذكرة جديدة
  const [isAddingMemo, setIsAddingMemo] = useState<boolean>(false);
  const [memoError, setMemoError] = useState<string | null>(null);
  const [memoSuccess, setMemoSuccess] = useState<boolean>(false);

  const fetchLog = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await supervisionApi.getSchoolTrackingLog(schoolId);
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'تعذر استرجاع سجل متابعة المدرسة.');
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  // حفظ مذكرة إشرافية جديدة
  const addMemo = async (memoData: {
    memoType: 'مذكرة إشرافية' | 'زيارة ميدانية' | 'اتصال هاتفي';
    subject: string;
    details: string;
    isVisibleToSchool: boolean;
  }) => {
    setIsAddingMemo(true);
    setMemoError(null);
    setMemoSuccess(false);

    try {
      const createdMemo = await supervisionApi.addSupervisorMemo(schoolId, memoData);

      // تحديث فوري للمذكرات والخط الزمني في الواجهة
      setData((prev) => {
        if (!prev) return prev;
        const newMilestone: MilestoneEvent = {
          id: Date.now(),
          eventType:
            memoData.memoType === 'زيارة ميدانية'
              ? 'field_visit'
              : memoData.memoType === 'اتصال هاتفي'
              ? 'phone_call'
              : 'supervisor_memo',
          title: `${memoData.memoType}: ${memoData.subject}`,
          description: memoData.details,
          actorName: 'أ. عبدالرحمن الشامي',
          actorRole: 'المشرف الوزاري',
          timestamp: new Date().toISOString(),
          statusBadge: memoData.memoType,
          badgeColor:
            memoData.memoType === 'زيارة ميدانية'
              ? 'purple'
              : memoData.memoType === 'اتصال هاتفي'
              ? 'amber'
              : 'indigo',
        };

        return {
          ...prev,
          school: {
            ...prev.school,
            totalMilestones: prev.school.totalMilestones + 1,
          },
          milestones: [newMilestone, ...prev.milestones],
          memos: [createdMemo, ...prev.memos],
        };
      });

      setMemoSuccess(true);
      return true;
    } catch (err: any) {
      setMemoError(err?.message || 'تعذر حفظ المذكرة الإشرافية.');
      return false;
    } finally {
      setIsAddingMemo(false);
    }
  };

  // تصدير سجل المتابعة الرسمي PDF
  const handleExportPdf = async () => {
    try {
      await supervisionApi.exportTrackingLogPdf(schoolId);
    } catch (err) {
      console.error(err);
    }
  };

  return {
    logData: data,
    school: data?.school,
    milestones: data?.milestones ?? [],
    memos: data?.memos ?? [],
    isLoading,
    error,
    refetch: fetchLog,
    isAddingMemo,
    memoError,
    memoSuccess,
    addMemo,
    handleExportPdf,
  };
}
