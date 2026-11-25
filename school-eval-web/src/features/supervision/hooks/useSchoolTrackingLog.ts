/**
 * useSchoolTrackingLog.ts
 * خطاف إدارة سجل المتابعة الزمني والمذكرات الإشرافية الميدانية للمدرسة
 */

import { useState, useEffect, useCallback } from 'react';
import { supervisionApi } from '../api/supervisionApi';
import { extractApiErrorMessage } from '../../../api/apiTypes';
import { exportTrackingLogToExcel } from '../utils/supervisionExportUtils';
import type {
  SchoolTrackingLogData,
  MilestoneEvent,
} from '../api/supervisionTypes';

export function useSchoolTrackingLog(schoolId?: number) {
  const [data, setData] = useState<SchoolTrackingLogData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // حالة إضافة مذكرة جديدة
  const [isAddingMemo, setIsAddingMemo] = useState<boolean>(false);
  const [memoError, setMemoError] = useState<string | null>(null);
  const [memoSuccess, setMemoSuccess] = useState<boolean>(false);

  const fetchLog = useCallback(async () => {
    if (!schoolId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await supervisionApi.getSchoolTrackingLog(schoolId);
      setData(result);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'تعذر استرجاع سجل متابعة المدرسة.'));
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchLog());
  }, [fetchLog]);

  // حفظ مذكرة إشرافية جديدة
  const addMemo = async (memoData: {
    memoType: 'مذكرة إشرافية' | 'زيارة ميدانية' | 'اتصال هاتفي' | 'مذكرة تصحيحية / تعقيبية';
    subject: string;
    details: string;
    isVisibleToSchool: boolean;
    cycle_id?: number;
    submission_id?: number;
    completion_request_id?: number;
  }) => {
    if (!schoolId) {
      setMemoError('يرجى تحديد مدرسة أولاً لإضافة المذكرة.');
      return false;
    }
    setIsAddingMemo(true);
    setMemoError(null);
    setMemoSuccess(false);

    try {
      const createdMemo = await supervisionApi.addSupervisorMemo(schoolId, memoData);

      // تحديث فوري للمذكرات والخط الزمني في الواجهة
      setData((prev) => {
        if (!prev) return prev;
        const newMilestone: MilestoneEvent = {
          id: `memo-${Date.now()}`,
          eventType:
            memoData.memoType === 'زيارة ميدانية'
              ? 'field_visit'
              : memoData.memoType === 'اتصال هاتفي'
              ? 'phone_call'
              : memoData.memoType === 'مذكرة تصحيحية / تعقيبية'
              ? 'corrective_memo'
              : 'supervisor_memo',
          title: `${memoData.memoType}: ${memoData.subject}`,
          description: memoData.details,
          actorName: 'المشرف الوزاري المكلف',
          actorRole: 'المشرف الوزاري',
          actorType: 'supervisor',
          timestamp: new Date().toISOString(),
          statusBadge: memoData.memoType,
          cycleId: memoData.cycle_id,
          submissionId: memoData.submission_id,
          completionRequestId: memoData.completion_request_id,
          badgeColor:
            memoData.memoType === 'زيارة ميدانية'
              ? 'purple'
              : memoData.memoType === 'اتصال هاتفي'
              ? 'amber'
              : memoData.memoType === 'مذكرة تصحيحية / تعقيبية'
              ? 'crimson'
              : 'indigo',
        };

        const updatedMemosCount = (prev.kpis?.memosAndVisits ?? prev.memos.length) + 1;
        const updatedTotalMilestones = (prev.kpis?.totalMilestones ?? prev.milestones.length) + 1;

        return {
          ...prev,
          school: {
            ...prev.school,
            totalMilestones: updatedTotalMilestones,
          },
          kpis: {
            ...prev.kpis,
            totalMilestones: updatedTotalMilestones,
            memosAndVisits: updatedMemosCount,
          },
          milestones: [newMilestone, ...prev.milestones],
          memos: [createdMemo, ...prev.memos],
        };
      });

      setMemoSuccess(true);
      return true;
    } catch (err: unknown) {
      setMemoError(extractApiErrorMessage(err, 'تعذر حفظ المذكرة الإشرافية.'));
      return false;
    } finally {
      setIsAddingMemo(false);
    }
  };

  // تصدير سجل المتابعة الرسمي PDF
  const handleExportPdf = async () => {
    if (!schoolId) return;
    try {
      await supervisionApi.exportTrackingLogPdf(schoolId);
    } catch (err) {
      console.error('PDF export request error:', err);
    }
  };

  // تصدير سجل المتابعة بصيغة Excel
  const handleExportExcel = async () => {
    if (!schoolId || !data) return;
    try {
      // تفضيل التحقق عبر خادم الـ API ثم التوليد الفوري للملف بـ SheetJS
      supervisionApi.exportTrackingLogExcel(schoolId).catch(() => {});
      exportTrackingLogToExcel({
        schoolName: data.school?.schoolName || 'مدرسة التقييم',
        schoolCode: data.school?.schoolCode || `SCH-${schoolId}`,
        governorate: data.school?.governorate,
        milestones: data.milestones || [],
        memos: data.memos || [],
      });
    } catch (err) {
      console.error('Excel export error:', err);
    }
  };

  return {
    logData: data,
    school: data?.school,
    kpis: data?.kpis,
    availableSubmissions: data?.availableSubmissions ?? [],
    availableCompletionRequests: data?.availableCompletionRequests ?? [],
    availableCycles: data?.availableCycles ?? [],
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
    handleExportExcel,
  };
}
