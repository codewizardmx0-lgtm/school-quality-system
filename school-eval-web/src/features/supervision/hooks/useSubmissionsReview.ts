/**
 * useSubmissionsReview.ts
 * خطاف فحص مخرجات التقييم وتدقيق الشواهد ورصد بنود النواقص
 */

import { useState, useEffect, useCallback } from 'react';
import { supervisionApi } from '../api/supervisionApi';
import type { SubmissionReviewData, IndicatorAuditItem } from '../api/supervisionTypes';

export type ReviewTabType = 'indicators' | 'evidences' | 'improvement-plan';
export type DecisionModeType = 'completion' | 'approve';

export function useSubmissionsReview(submissionId: number = 101) {
  const [data, setData] = useState<SubmissionReviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // التبويب النشط
  const [activeTab, setActiveTab] = useState<ReviewTabType>('indicators');

  // خيار القرار الإشرافي
  const [decisionMode, setDecisionMode] = useState<DecisionModeType>('completion');
  const [supervisorNotes, setSupervisorNotes] = useState<string>('');

  // المؤشرات المعيبة المحددة للاستكمال (خريطة: indicatorId -> تفاصيل الخلل والتوجيه)
  const [defectiveItems, setDefectiveItems] = useState<
    Map<number, { defectReason: string; directives: string }>
  >(new Map());

  // حالة الإجراء
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  const fetchReview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await supervisionApi.getSubmissionReview(submissionId);
      setData(result);

      // تهيئة البنود التي تحمل ملاحظات خلل مسبقاً
      const initialDefects = new Map<number, { defectReason: string; directives: string }>();
      result.indicators.forEach((ind) => {
        if (ind.hasDefect) {
          initialDefects.set(ind.indicatorId, {
            defectReason: ind.defectReason || 'نقص وثيقة الشاهد الميداني',
            directives: ind.directives || 'يرجى استيفاء الشاهد المعتمد وإعادة الرفع.',
          });
        }
      });
      setDefectiveItems(initialDefects);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل مخرج التقييم للمراجعة.');
    } finally {
      setIsLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  // تبديل حالة الخلل لمؤشر معين
  const toggleIndicatorDefect = (
    indicator: IndicatorAuditItem,
    defectReason: string = 'نقص وثيقة الشاهد الميداني ومحضر المعالجة',
    directives: string = 'يرجى استيفاء الشاهد والمبرر المطلوب.'
  ) => {
    setDefectiveItems((prev) => {
      const next = new Map(prev);
      if (next.has(indicator.indicatorId)) {
        next.delete(indicator.indicatorId);
      } else {
        next.set(indicator.indicatorId, { defectReason, directives });
      }
      return next;
    });
  };

  // اعتماد المخرج مباشرة
  const handleApprove = async () => {
    setIsActionLoading(true);
    setActionErrorMessage(null);
    setActionSuccessMessage(null);
    try {
      await supervisionApi.approveSubmission(submissionId, supervisorNotes);
      setActionSuccessMessage('تم اعتماد اكتمال المراجعة الإدارية للمخرج بنجاح.');
      if (data) {
        setData({
          ...data,
          status: 'Completed',
          statusArabic: 'مكتمل المراجعة',
        });
      }
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'تعذر اعتماد المخرج.');
    } finally {
      setIsActionLoading(false);
    }
  };

  return {
    reviewData: data,
    isLoading,
    error,
    refetch: fetchReview,
    activeTab,
    setActiveTab,
    decisionMode,
    setDecisionMode,
    supervisorNotes,
    setSupervisorNotes,
    defectiveItems,
    defectiveCount: defectiveItems.size,
    toggleIndicatorDefect,
    handleApprove,
    isActionLoading,
    actionSuccessMessage,
    actionErrorMessage,
  };
}
