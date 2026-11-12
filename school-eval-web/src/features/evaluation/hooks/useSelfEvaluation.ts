import { useState, useEffect, useCallback, useMemo } from 'react';
import { evaluatorApi } from '../api/evaluatorApi';
import type {
  StandardsTreeData,
  StandardNode,
  SubStandardNode,
  IndicatorNode,
  EvaluationResultData,
  SaveEvaluationResultPayload,
} from '../api/evaluationTypes';

export type SaveStatus = 'idle' | 'saving' | 'saved_server' | 'error';

export function useSelfEvaluation(
  initialIndicatorId?: number,
  isLocked: boolean = false,
  evaluationId?: number | null
) {
  const effectiveEvalId = evaluationId ?? 1;

  const [treeData, setTreeData] = useState<StandardsTreeData | null>(null);
  const [selectedStandardId, setSelectedStandardId] = useState<number | null>(null);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<number | null>(initialIndicatorId ?? null);
  const [currentResult, setCurrentResult] = useState<EvaluationResultData | null>(null);
  const [isLoadingTree, setIsLoadingTree] = useState<boolean>(true);
  const [isLoadingResult, setIsLoadingResult] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [lastFailedPayload, setLastFailedPayload] = useState<Omit<SaveEvaluationResultPayload, 'indicatorId'> | null>(null);

  // تحميل شجرة المعايير الكاملة من الخادم
  const loadTree = useCallback(async () => {
    setIsLoadingTree(true);
    try {
      const data = await evaluatorApi.getActiveStandardsTree();
      setTreeData(data);

      if (!selectedStandardId && data.standards.length > 0) {
        setSelectedStandardId(data.standards[0].standardId);
      }
      if (!selectedIndicatorId && data.standards.length > 0) {
        const firstInd = data.standards[0]?.subStandards[0]?.indicators[0];
        if (firstInd) {
          setSelectedIndicatorId(firstInd.indicatorId);
        }
      }
    } catch (err) {
      console.error('Failed to load standards tree:', err);
    } finally {
      setIsLoadingTree(false);
    }
  }, [selectedStandardId, selectedIndicatorId]);

  useEffect(() => {
    loadTree();
  }, []);

  // قائمة مسطحة بكافة مؤشرات المعايير الوطنية لتسهيل التنقل والبحث
  const allIndicators = useMemo(() => {
    if (!treeData) return [];
    const list: {
      standard: StandardNode;
      subStandard: SubStandardNode;
      indicator: IndicatorNode;
    }[] = [];

    treeData.standards.forEach((std) => {
      std.subStandards.forEach((sub) => {
        sub.indicators.forEach((ind) => {
          list.push({ standard: std, subStandard: sub, indicator: ind });
        });
      });
    });

    return list;
  }, [treeData]);

  // معلومات المؤشر الحالي المحدد
  const currentIndicatorInfo = useMemo(() => {
    if (!selectedIndicatorId || allIndicators.length === 0) return null;
    return allIndicators.find((item) => item.indicator.indicatorId === selectedIndicatorId) || null;
  }, [selectedIndicatorId, allIndicators]);

  // تحميل نتيجة المؤشر المحدد مباشرة من الخادم (Direct Server-First)
  const loadIndicatorResult = useCallback(
    async (indicatorId: number) => {
      setIsLoadingResult(true);
      try {
        const res = await evaluatorApi.getEvaluationResult(indicatorId);
        setCurrentResult(res);
        setSaveStatus(res.score !== null && res.score !== undefined ? 'saved_server' : 'idle');
      } catch (err) {
        console.error(`Failed to load indicator result for ${indicatorId}:`, err);
        setSaveStatus('error');
        setSaveSuccessMessage('تعذر تحميل نتيجة التقييم من الخادم.');
      } finally {
        setIsLoadingResult(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedIndicatorId) {
      loadIndicatorResult(selectedIndicatorId);
    }
  }, [selectedIndicatorId, loadIndicatorResult]);

  // حفظ التقييم الذاتي المباشر على الخادم مع تثبيت Completed تلقائياً للدرجات الصحيحة
  const saveRubricAssessment = useCallback(
    async (payload: Omit<SaveEvaluationResultPayload, 'indicatorId'>) => {
      if (!selectedIndicatorId) return;

      // منع التعديل إذا كان التقييم مقفلاً
      if (isLocked) {
        console.warn('Evaluation is locked in read-only mode.');
        return;
      }

      setIsSaving(true);
      setSaveStatus('saving');
      setSaveSuccessMessage(null);
      setLastFailedPayload(null);

      // فرض Completed لأي درجة محددة (إلغاء التمويه كـ Pending وفق القرار المعتمد 1)
      const sanitizedPayload: Omit<SaveEvaluationResultPayload, 'indicatorId'> = {
        ...payload,
        completionStatus: payload.completionStatus || (payload.score !== null && payload.score !== undefined ? 'Completed' : 'Pending'),
      };

      // 1. تحديث تفاؤلي محلي فوري للاستجابة اللحظية
      setCurrentResult((prev) => {
        if (!prev) {
          return {
            resultId: 0,
            evaluationId: effectiveEvalId,
            indicatorId: selectedIndicatorId,
            score: sanitizedPayload.score,
            scoreDescriptorId: sanitizedPayload.scoreDescriptorId ?? null,
            completionStatus: sanitizedPayload.completionStatus ?? 'Completed',
            justification: sanitizedPayload.justification || '',
            verificationMethods: sanitizedPayload.verificationMethods || [],
            evidenceLinks: [],
            updatedAt: new Date().toISOString(),
          };
        }
        return {
          ...prev,
          score: sanitizedPayload.score,
          scoreDescriptorId: sanitizedPayload.scoreDescriptorId ?? prev.scoreDescriptorId,
          completionStatus: sanitizedPayload.completionStatus ?? prev.completionStatus,
          justification: sanitizedPayload.justification !== undefined ? sanitizedPayload.justification : prev.justification,
          verificationMethods: sanitizedPayload.verificationMethods !== undefined ? sanitizedPayload.verificationMethods : prev.verificationMethods,
          updatedAt: new Date().toISOString(),
        };
      });

      // 2. الحفظ المباشر للخادم وتحديث الشجرة فوراً
      try {
        const saved = await evaluatorApi.saveEvaluationResult({
          indicatorId: selectedIndicatorId,
          ...sanitizedPayload,
        });
        setCurrentResult(saved);
        setSaveStatus('saved_server');
        setSaveSuccessMessage('تم الحفظ بنجاح على الخادم');
        // تحديث الشجرة لتعكس الدرجة فوراً في لوحة المعايير
        loadTree();
        setTimeout(() => setSaveSuccessMessage(null), 3000);
      } catch (err: any) {
        console.error('Server save error:', err);
        setSaveStatus('error');
        setLastFailedPayload(sanitizedPayload);
        const errMsg =
          err?.response?.data?.message ||
          (err?.code === 'ERR_NETWORK' || !navigator.onLine
            ? 'انقطع الاتصال بالخادم. يرجى التحقق من الشبكة ثم الضغط على "إعادة المحاولة".'
            : 'تعذر الحفظ على الخادم، يرجى إعادة المحاولة.');
        setSaveSuccessMessage(errMsg);
      } finally {
        setIsSaving(false);
      }
    },
    [selectedIndicatorId, isLocked, effectiveEvalId, loadTree]
  );

  // إعادة المحاولة عند الفشل
  const retryLastSave = useCallback(() => {
    if (lastFailedPayload) {
      saveRubricAssessment(lastFailedPayload);
    }
  }, [lastFailedPayload, saveRubricAssessment]);

  // التنقل للمؤشر السابق
  const goToPreviousIndicator = useCallback(() => {
    if (!selectedIndicatorId || allIndicators.length === 0) return;
    const currentIndex = allIndicators.findIndex((item) => item.indicator.indicatorId === selectedIndicatorId);
    if (currentIndex > 0) {
      const prev = allIndicators[currentIndex - 1];
      setSelectedStandardId(prev.standard.standardId);
      setSelectedIndicatorId(prev.indicator.indicatorId);
    }
  }, [selectedIndicatorId, allIndicators]);

  // التنقل للمؤشر التالي
  const goToNextIndicator = useCallback(() => {
    if (!selectedIndicatorId || allIndicators.length === 0) return;
    const currentIndex = allIndicators.findIndex((item) => item.indicator.indicatorId === selectedIndicatorId);
    if (currentIndex >= 0 && currentIndex < allIndicators.length - 1) {
      const next = allIndicators[currentIndex + 1];
      setSelectedStandardId(next.standard.standardId);
      setSelectedIndicatorId(next.indicator.indicatorId);
    }
  }, [selectedIndicatorId, allIndicators]);

  const hasPrevious = useMemo(() => {
    if (!selectedIndicatorId || allIndicators.length === 0) return false;
    const index = allIndicators.findIndex((item) => item.indicator.indicatorId === selectedIndicatorId);
    return index > 0;
  }, [selectedIndicatorId, allIndicators]);

  const hasNext = useMemo(() => {
    if (!selectedIndicatorId || allIndicators.length === 0) return false;
    const index = allIndicators.findIndex((item) => item.indicator.indicatorId === selectedIndicatorId);
    return index < allIndicators.length - 1;
  }, [selectedIndicatorId, allIndicators]);

  // تصفير رصد مؤشر واحد بأمان مع تحديث الشجرة فوراً
  const resetIndicatorAssessment = useCallback(
    async (indicatorId: number, unlinkEvidences: boolean = false) => {
      if (isLocked) return;
      await evaluatorApi.resetIndicator(indicatorId, unlinkEvidences);
      await loadTree();
      if (selectedIndicatorId === indicatorId) {
        await loadIndicatorResult(indicatorId);
      }
      setSaveStatus('idle');
      setSaveSuccessMessage('تم تصفير رصد المؤشر بنجاح وإعادته لقائمة الاستيفاء.');
    },
    [isLocked, loadTree, selectedIndicatorId, loadIndicatorResult]
  );

  // تصفير معيار كامل بأمان مع تحديث الشجرة فوراً
  const resetStandardAssessment = useCallback(
    async (standardId: number, unlinkEvidences: boolean = false) => {
      if (isLocked) return;
      await evaluatorApi.resetStandard(standardId, unlinkEvidences);
      await loadTree();
      if (selectedIndicatorId) {
        await loadIndicatorResult(selectedIndicatorId);
      }
      setSaveStatus('idle');
      setSaveSuccessMessage('تم تصفير المعيار بنجاح وإعادة مؤشراته لقائمة الاستيفاء.');
    },
    [isLocked, loadTree, selectedIndicatorId, loadIndicatorResult]
  );

  return {
    treeData,
    allIndicators,
    selectedStandardId,
    setSelectedStandardId,
    selectedIndicatorId,
    setSelectedIndicatorId,
    currentIndicatorInfo,
    currentResult,
    isLoadingTree,
    isLoadingResult,
    isSaving,
    saveStatus,
    saveSuccessMessage,
    saveRubricAssessment,
    resetIndicatorAssessment,
    resetStandardAssessment,
    retryLastSave,
    goToPreviousIndicator,
    goToNextIndicator,
    hasPrevious,
    hasNext,
    reloadTree: loadTree,
    reloadIndicatorResult: () => (selectedIndicatorId ? loadIndicatorResult(selectedIndicatorId) : Promise.resolve()),

    // Backwards compatibility / Clean state
    isOffline: false,
    pendingOfflineCount: 0,
    isSyncing: false,
    conflictWarning: null,
    syncOfflineDrafts: () => Promise.resolve(),
    clearAllDrafts: () => {},
    resolveConflictWithLocal: () => {},
    dismissConflict: () => {},
    hasOtherSchoolDrafts: false,
    otherSchoolDraftsCount: 0,
    dismissOtherSchoolDrafts: () => {},
    syncOtherSchoolDrafts: () => Promise.resolve(),
  };
}
