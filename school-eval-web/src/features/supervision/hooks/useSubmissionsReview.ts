/**
 * useSubmissionsReview.ts
 * خطاف فحص مخرجات التقييم وتدقيق الشواهد ورصد بنود النواقص
 * يدعم الحوكمة الميدانية، الفلترة المعيارية، وحفظ النواقص في قاعدة البيانات
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supervisionApi } from '../api/supervisionApi';
import type {
  SubmissionReviewData,
  IndicatorAuditItem,
  ReviewableSubmissionItem,
} from '../api/supervisionTypes';

export type ReviewTabType = 'indicators' | 'evidences' | 'improvement-plan';
export type DecisionModeType = 'completion' | 'close';
export type QuickFilterType = 'all' | 'defective' | 'missing-evidence' | 'low-score';

export interface DefectiveItemDetail {
  indicatorId: number;
  category: string;
  defectReason: string;
  directives: string;
}

export function useSubmissionsReview(initialSubmissionId?: number) {
  // معرف المخرج النشط
  const [activeSubmissionId, setActiveSubmissionId] = useState<number | undefined>(initialSubmissionId);

  // قائمة المخرجات المتاحة للمراجعة في النطاق الجغرافي
  const [availableSubmissions, setAvailableSubmissions] = useState<ReviewableSubmissionItem[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState<boolean>(false);

  const [data, setData] = useState<SubmissionReviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // التبويب النشط
  const [activeTab, setActiveTab] = useState<ReviewTabType>('indicators');

  // خيار القرار الإشرافي (إصدار طلب استكمال أو إغلاق المراجعة)
  const [decisionMode, setDecisionMode] = useState<DecisionModeType>('completion');
  const [supervisorNotes, setSupervisorNotes] = useState<string>('');

  // المؤشرات المعيبة المحددة للاستكمال (خريطة: indicatorId -> تفاصيل الخلل والتوجيه)
  const [defectiveItems, setDefectiveItems] = useState<Map<number, DefectiveItemDetail>>(new Map());

  // حالة الفلترة للمؤشرات الـ 109
  const [selectedStandardId, setSelectedStandardId] = useState<number | 'all'>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // حالة الإجراء
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // 1. تحميل قائمة المخرجات المتاحة إذا لم يُمرر معرف محدد
  const loadAvailableSubmissions = useCallback(async () => {
    setIsLoadingAvailable(true);
    try {
      const items = await supervisionApi.getReviewableSubmissions();
      setAvailableSubmissions(items);

      if (!activeSubmissionId && items.length > 0) {
        // تفضيل أول مخرج بحالة Submitted أو UnderReview
        const firstPending = items.find((i) => i.status === 'Submitted' || i.status === 'UnderReview') ?? items[0];
        setActiveSubmissionId(firstPending.submissionId);
      }
    } catch {
      // تجاهل هادئ إذا كان هناك معرف ممرر
    } finally {
      setIsLoadingAvailable(false);
    }
  }, [activeSubmissionId]);

  useEffect(() => {
    loadAvailableSubmissions();
  }, [loadAvailableSubmissions]);

  // تحديث المعرف إذا تغير الـ prop من الخارج
  useEffect(() => {
    if (initialSubmissionId && initialSubmissionId !== activeSubmissionId) {
      setActiveSubmissionId(initialSubmissionId);
    }
  }, [initialSubmissionId, activeSubmissionId]);

  // 2. تحميل بيانات مخرج التقييم النشط
  const fetchReview = useCallback(async () => {
    if (!activeSubmissionId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await supervisionApi.getSubmissionReview(activeSubmissionId);
      setData(result);

      // تهيئة البنود المعيبة المحفوظة في قاعدة البيانات
      const initialDefects = new Map<number, DefectiveItemDetail>();
      result.indicators.forEach((ind) => {
        if (ind.hasDefect) {
          initialDefects.set(ind.indicatorId, {
            indicatorId: ind.indicatorId,
            category: ind.defectCategory || 'نقص الشواهد الإلزامية المطلوبة في أداة التحقق',
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
  }, [activeSubmissionId]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  // 3. التبديل لمخرج مدرسة أخرى
  const selectSubmission = (id: number) => {
    setActiveSubmissionId(id);
    setActionErrorMessage(null);
    setActionSuccessMessage(null);
  };

  // 4. حفظ رصد نقص لمؤشر في قاعدة البيانات (FR-SUP-04)
  const saveDeficiency = async (
    indicator: IndicatorAuditItem,
    category: string,
    defectReason: string,
    directives: string
  ) => {
    if (!activeSubmissionId) return;

    try {
      await supervisionApi.saveDeficiencyNote(activeSubmissionId, {
        indicatorId: indicator.indicatorId,
        deficiencyCategory: category,
        supervisorNote: defectReason,
        directives,
      });

      setDefectiveItems((prev) => {
        const next = new Map(prev);
        next.set(indicator.indicatorId, {
          indicatorId: indicator.indicatorId,
          category,
          defectReason,
          directives,
        });
        return next;
      });

      // تحديث الحالة محلياً في مصفوفة المؤشرات
      if (data) {
        setData({
          ...data,
          indicators: data.indicators.map((ind) =>
            ind.indicatorId === indicator.indicatorId
              ? {
                  ...ind,
                  hasDefect: true,
                  defectCategory: category,
                  defectReason,
                  directives,
                  supervisorFeedback: defectReason,
                }
              : ind
          ),
        });
      }
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'تعذر حفظ رصد النقص للمؤشر.');
    }
  };

  // 5. إلغاء رصد النقص عن مؤشر من قاعدة البيانات
  const removeDeficiency = async (indicatorId: number) => {
    if (!activeSubmissionId) return;

    try {
      await supervisionApi.deleteDeficiencyNote(activeSubmissionId, indicatorId);

      setDefectiveItems((prev) => {
        const next = new Map(prev);
        next.delete(indicatorId);
        return next;
      });

      if (data) {
        setData({
          ...data,
          indicators: data.indicators.map((ind) =>
            ind.indicatorId === indicatorId
              ? {
                  ...ind,
                  hasDefect: false,
                  defectCategory: null,
                  defectReason: null,
                  directives: null,
                  supervisorFeedback: undefined,
                }
              : ind
          ),
        });
      }
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'تعذر إلغاء رصد النقص عن المؤشر.');
    }
  };

  // تبديل سريع متوافق مع الاستخدام السابق
  const toggleIndicatorDefect = (
    indicator: IndicatorAuditItem,
    defectReason: string = 'نقص وثيقة الشاهد الميداني ومحضر المعالجة',
    directives: string = 'يرجى استيفاء الشاهد والمبرر المطلوب.'
  ) => {
    if (defectiveItems.has(indicator.indicatorId)) {
      removeDeficiency(indicator.indicatorId);
    } else {
      saveDeficiency(
        indicator,
        'نقص الشواهد الإلزامية المطلوبة في أداة التحقق',
        defectReason,
        directives
      );
    }
  };

  // 6. إغلاق المراجعة الإشرافية بنجاح ونقل التقييم إلى مكتمل (BR-MIN-03)
  const handleCloseReview = async () => {
    setIsActionLoading(true);
    setActionErrorMessage(null);
    setActionSuccessMessage(null);
    try {
      const evalId = data?.evaluationId ?? activeSubmissionId;
      if (!evalId) throw new Error('معرف التقييم غير متوفر.');

      await supervisionApi.closeSubmissionReview(evalId, supervisorNotes);
      setActionSuccessMessage('تم إغلاق المراجعة الإشرافية للملف ونقل الحالة إلى مكتمل (Completed) بنجاح.');
      if (data) {
        setData({
          ...data,
          status: 'Completed',
          statusArabic: 'مكتمل المراجعة',
          closedAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'تعذر إغلاق المراجعة الإشرافية.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 7. مصفوفة المؤشرات المفلترة بحسب المعيار والفلاتر السريعة
  const filteredIndicators = useMemo(() => {
    if (!data?.indicators) return [];

    return data.indicators.filter((ind) => {
      // فلتر المعيار الوطني
      if (selectedStandardId !== 'all') {
        const matchesId = ind.standardId === selectedStandardId;
        const matchesName = ind.standardName?.includes(String(selectedStandardId));
        if (!matchesId && !matchesName) return false;
      }

      // فلتر البحث النصي (بالكود أو العنوان)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesCode = ind.code?.toLowerCase().includes(query);
        const matchesTitle = ind.title?.toLowerCase().includes(query);
        if (!matchesCode && !matchesTitle) return false;
      }

      // الفلاتر السريعة
      if (quickFilter === 'defective') {
        return ind.hasDefect || defectiveItems.has(ind.indicatorId);
      }
      if (quickFilter === 'missing-evidence') {
        return ind.schoolScore > 0 && ind.evidences.length === 0;
      }
      if (quickFilter === 'low-score') {
        return ind.schoolScore <= 1;
      }

      return true;
    });
  }, [data?.indicators, selectedStandardId, quickFilter, searchQuery, defectiveItems]);

  // قائمة المعايير الفريدة لاستعراضها في شريط التصفية
  const standardsList = useMemo(() => {
    if (!data?.indicators) return [];
    const map = new Map<number, string>();
    data.indicators.forEach((ind) => {
      const id = ind.standardId ?? 1;
      if (!map.has(id)) {
        map.set(id, ind.standardName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [data?.indicators]);

  return {
    reviewData: data,
    isLoading,
    error,
    refetch: fetchReview,
    activeSubmissionId,
    availableSubmissions,
    isLoadingAvailable,
    selectSubmission,
    activeTab,
    setActiveTab,
    decisionMode,
    setDecisionMode,
    supervisorNotes,
    setSupervisorNotes,
    defectiveItems,
    defectiveCount: defectiveItems.size,
    saveDeficiency,
    removeDeficiency,
    toggleIndicatorDefect,
    handleCloseReview,
    handleApprove: handleCloseReview, // التوافق مع النداءات السابقة
    isActionLoading,
    actionSuccessMessage,
    actionErrorMessage,
    selectedStandardId,
    setSelectedStandardId,
    quickFilter,
    setQuickFilter,
    searchQuery,
    setSearchQuery,
    filteredIndicators,
    standardsList,
  };
}
