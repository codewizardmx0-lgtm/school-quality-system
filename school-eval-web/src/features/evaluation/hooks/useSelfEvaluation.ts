import { useState, useEffect, useCallback, useMemo } from 'react';
import { evaluatorApi } from '../api/evaluatorApi';
import type {
  StandardsTreeData,
  StandardNode,
  IndicatorNode,
  EvaluationResultData,
  SaveEvaluationResultPayload,
} from '../api/evaluationTypes';

export function useSelfEvaluation(initialIndicatorId?: number) {
  const [treeData, setTreeData] = useState<StandardsTreeData | null>(null);
  const [selectedStandardId, setSelectedStandardId] = useState<number | null>(null);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<number | null>(initialIndicatorId ?? null);
  const [currentResult, setCurrentResult] = useState<EvaluationResultData | null>(null);
  const [isLoadingTree, setIsLoadingTree] = useState<boolean>(true);
  const [isLoadingResult, setIsLoadingResult] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // تحميل شجرة المعايير
  const loadTree = useCallback(async () => {
    setIsLoadingTree(true);
    try {
      const data = await evaluatorApi.getActiveStandardsTree();
      setTreeData(data);
      if (data.standards.length > 0) {
        if (!selectedStandardId) {
          setSelectedStandardId(data.standards[0].standardId);
        }
        if (!selectedIndicatorId && data.standards[0].subStandards?.[0]?.indicators?.[0]) {
          setSelectedIndicatorId(data.standards[0].subStandards[0].indicators[0].indicatorId);
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
  }, [loadTree]);

  // قائمة مسطحة لجميع المؤشرات لتسهيل التنقل التالي/السابق
  const allIndicators = useMemo(() => {
    if (!treeData) return [];
    const list: { indicator: IndicatorNode; standard: StandardNode }[] = [];
    treeData.standards.forEach((std) => {
      std.subStandards.forEach((sub) => {
        sub.indicators.forEach((ind) => {
          list.push({ indicator: ind, standard: std });
        });
      });
    });
    return list;
  }, [treeData]);

  // المؤشر الحالي النشط
  const currentIndicatorInfo = useMemo(() => {
    if (!selectedIndicatorId || allIndicators.length === 0) return null;
    return allIndicators.find((item) => item.indicator.indicatorId === selectedIndicatorId) || null;
  }, [selectedIndicatorId, allIndicators]);

  // تحميل نتيجة المؤشر المحدد
  const loadIndicatorResult = useCallback(async (indicatorId: number) => {
    setIsLoadingResult(true);
    try {
      const res = await evaluatorApi.getEvaluationResult(indicatorId);
      setCurrentResult(res);
    } catch (err) {
      console.error(`Failed to load indicator result for ${indicatorId}:`, err);
    } finally {
      setIsLoadingResult(false);
    }
  }, []);

  useEffect(() => {
    if (selectedIndicatorId) {
      loadIndicatorResult(selectedIndicatorId);
    }
  }, [selectedIndicatorId, loadIndicatorResult]);

  // حفظ التقييم الذاتي مع استجابة تفاؤلية فورية
  const saveRubricAssessment = useCallback(
    async (payload: Omit<SaveEvaluationResultPayload, 'indicatorId'>) => {
      if (!selectedIndicatorId) return;

      setIsSaving(true);
      setSaveSuccessMessage(null);

      // تحديث الحالة التفاؤلية فوراً
      setCurrentResult((prev) => {
        if (!prev) {
          return {
            resultId: 999,
            evaluationId: 1,
            indicatorId: selectedIndicatorId,
            score: payload.score,
            scoreDescriptorId: payload.scoreDescriptorId ?? null,
            completionStatus: payload.completionStatus ?? 'Completed',
            justification: payload.justification || '',
            verificationMethods: payload.verificationMethods || [],
            evidenceLinks: [],
          };
        }
        return {
          ...prev,
          score: payload.score,
          scoreDescriptorId: payload.scoreDescriptorId ?? prev.scoreDescriptorId,
          completionStatus: payload.completionStatus ?? prev.completionStatus,
          justification: payload.justification !== undefined ? payload.justification : prev.justification,
          verificationMethods: payload.verificationMethods !== undefined ? payload.verificationMethods : prev.verificationMethods,
          updatedAt: new Date().toISOString(),
        };
      });

      try {
        const saved = await evaluatorApi.saveEvaluationResult({
          indicatorId: selectedIndicatorId,
          ...payload,
        });
        setCurrentResult(saved);
        setSaveSuccessMessage('تم الحفظ بنجاح');
        setTimeout(() => setSaveSuccessMessage(null), 3000);
      } catch (err) {
        console.error('Failed to save assessment to backend:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [selectedIndicatorId]
  );

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
    saveSuccessMessage,
    saveRubricAssessment,
    goToPreviousIndicator,
    goToNextIndicator,
    hasPrevious,
    hasNext,
    reloadTree: loadTree,
  };
}
