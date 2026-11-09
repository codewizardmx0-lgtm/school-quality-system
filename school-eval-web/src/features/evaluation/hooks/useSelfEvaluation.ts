import { useState, useEffect, useCallback, useMemo } from 'react';
import { evaluatorApi } from '../api/evaluatorApi';
import type {
  StandardsTreeData,
  StandardNode,
  IndicatorNode,
  EvaluationResultData,
  SaveEvaluationResultPayload,
} from '../api/evaluationTypes';

const OFFLINE_DRAFTS_STORAGE_KEY = 'school_eval_offline_drafts_v1';

interface OfflineDraft {
  indicatorId: number;
  payload: Omit<SaveEvaluationResultPayload, 'indicatorId'>;
  cachedAt: string;
}

export function useSelfEvaluation(initialIndicatorId?: number) {
  const [treeData, setTreeData] = useState<StandardsTreeData | null>(null);
  const [selectedStandardId, setSelectedStandardId] = useState<number | null>(null);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<number | null>(initialIndicatorId ?? null);
  const [currentResult, setCurrentResult] = useState<EvaluationResultData | null>(null);
  const [isLoadingTree, setIsLoadingTree] = useState<boolean>(true);
  const [isLoadingResult, setIsLoadingResult] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // حالة الاتصال بالشبكة والمزامنة التلقائية (FE-GAP-05 / U-35)
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // قراءة المسودات غير المزامنة من التخزين المحلي
  const getStoredDrafts = useCallback((): Record<number, OfflineDraft> => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(OFFLINE_DRAFTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  // تحديث عداد المسودات المحلية
  const refreshDraftsCount = useCallback(() => {
    const drafts = getStoredDrafts();
    setPendingOfflineCount(Object.keys(drafts).length);
  }, [getStoredDrafts]);

  // حفظ مسودة محلية في وضع عدم الاتصال
  const saveDraftLocally = useCallback(
    (indicatorId: number, payload: Omit<SaveEvaluationResultPayload, 'indicatorId'>) => {
      if (typeof window === 'undefined') return;
      try {
        const drafts = getStoredDrafts();
        drafts[indicatorId] = {
          indicatorId,
          payload,
          cachedAt: new Date().toISOString(),
        };
        localStorage.setItem(OFFLINE_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
        refreshDraftsCount();
      } catch (e) {
        console.error('Failed to store draft locally:', e);
      }
    },
    [getStoredDrafts, refreshDraftsCount]
  );

  // إزالة مسودة معينة بعد المزامنة
  const removeLocalDraft = useCallback(
    (indicatorId: number) => {
      if (typeof window === 'undefined') return;
      try {
        const drafts = getStoredDrafts();
        delete drafts[indicatorId];
        localStorage.setItem(OFFLINE_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
        refreshDraftsCount();
      } catch (e) {
        console.error('Failed to remove draft locally:', e);
      }
    },
    [getStoredDrafts, refreshDraftsCount]
  );

  // مزامنة المسودات المحفوظة محلياً مع معالجة التعارض (Conflict Resolution)
  const syncOfflineDrafts = useCallback(
    async (forceOverrideConflict = false) => {
      const drafts = getStoredDrafts();
      const draftIds = Object.keys(drafts).map(Number);
      if (draftIds.length === 0) return;

      setIsSyncing(true);
      setConflictWarning(null);
      let syncedCount = 0;

      try {
        for (const id of draftIds) {
          const draft = drafts[id];
          if (!draft) continue;

          // فحص التعارض البسيط: التحقق من وجود تعديل أحدث على الخادم
          if (!forceOverrideConflict) {
            try {
              const serverResult = await evaluatorApi.getEvaluationResult(id);
              if (
                serverResult?.updatedAt &&
                new Date(serverResult.updatedAt).getTime() > new Date(draft.cachedAt).getTime()
              ) {
                // الخادم يحتوي على تعديل أحدث من المسودة المحلية!
                setConflictWarning(
                  `تنبيه تعارض في المؤشر [${id}]: تم تعديل التقييم على الخادم بتاريخ أحدث. يمكنك فرض اعتماد تعديلك المحلي (آخر تعديل يفوز) أو استعادة بيانات الخادم.`
                );
                continue;
              }
            } catch {
              // في حال تعذر جلب النتيجة للمقارنة، نستمر في محاولة الحفظ
            }
          }

          // إرسال المسودة للخادم
          await evaluatorApi.saveEvaluationResult({
            indicatorId: id,
            ...draft.payload,
          });

          removeLocalDraft(id);
          syncedCount++;
        }

        if (syncedCount > 0) {
          setSaveSuccessMessage(`تمت مزامنة ${syncedCount} من التقييمات المحفوظة محلياً مع الخادم بنجاح!`);
          setTimeout(() => setSaveSuccessMessage(null), 4000);
        }
      } catch (err) {
        console.error('Offline drafts sync failed:', err);
      } finally {
        setIsSyncing(false);
        refreshDraftsCount();
      }
    },
    [getStoredDrafts, removeLocalDraft, refreshDraftsCount]
  );

  // الاستماع لأحداث الاتصال بالإنترنت
  useEffect(() => {
    refreshDraftsCount();

    const handleOnline = () => {
      setIsOffline(false);
      // مزامنة تلقائية عند استعادة الاتصال
      syncOfflineDrafts();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshDraftsCount, syncOfflineDrafts]);

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
  const loadIndicatorResult = useCallback(
    async (indicatorId: number) => {
      // إذا كان هناك مسودة محلية مخزنة لهذا المؤشر، نعرضها أولاً
      const stored = getStoredDrafts()[indicatorId];
      if (stored) {
        setCurrentResult({
          resultId: 888,
          evaluationId: 1,
          indicatorId,
          score: stored.payload.score,
          scoreDescriptorId: stored.payload.scoreDescriptorId ?? null,
          completionStatus: stored.payload.completionStatus ?? 'Completed',
          justification: stored.payload.justification || '',
          verificationMethods: stored.payload.verificationMethods || [],
          evidenceLinks: [],
          updatedAt: stored.cachedAt,
        });
        return;
      }

      setIsLoadingResult(true);
      try {
        const res = await evaluatorApi.getEvaluationResult(indicatorId);
        setCurrentResult(res);
      } catch (err) {
        console.error(`Failed to load indicator result for ${indicatorId}:`, err);
      } finally {
        setIsLoadingResult(false);
      }
    },
    [getStoredDrafts]
  );

  useEffect(() => {
    if (selectedIndicatorId) {
      loadIndicatorResult(selectedIndicatorId);
    }
  }, [selectedIndicatorId, loadIndicatorResult]);

  // حفظ التقييم الذاتي مع دعم الحفظ دون اتصال والمزامنة التفاؤلية
  const saveRubricAssessment = useCallback(
    async (payload: Omit<SaveEvaluationResultPayload, 'indicatorId'>) => {
      if (!selectedIndicatorId) return;

      setIsSaving(true);
      setSaveSuccessMessage(null);

      // 1. تحديث الحالة التفاؤلية فوراً
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
            updatedAt: new Date().toISOString(),
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

      // 2. إذا كان المتصفح غير متصل، نخزن المسودة محلياً فوراً
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        saveDraftLocally(selectedIndicatorId, payload);
        setIsSaving(false);
        setSaveSuccessMessage('تم الحفظ محلياً — وضع عدم الاتصال');
        setTimeout(() => setSaveSuccessMessage(null), 3000);
        return;
      }

      // 3. محاولة الحفظ على الخادم
      try {
        const saved = await evaluatorApi.saveEvaluationResult({
          indicatorId: selectedIndicatorId,
          ...payload,
        });
        setCurrentResult(saved);
        // في حال كانت هناك مسودة محلية مخزنة، نحذفها
        removeLocalDraft(selectedIndicatorId);
        setSaveSuccessMessage('تم الحفظ بنجاح على الخادم');
        setTimeout(() => setSaveSuccessMessage(null), 3000);
      } catch (err) {
        console.warn('Network error while saving. Storing draft locally:', err);
        // في حال فشل الشبكة أو الخطأ المؤقت، نخزن المسودة محلياً
        saveDraftLocally(selectedIndicatorId, payload);
        setSaveSuccessMessage('تم الحفظ في الذاكرة المحلية (سيتم المزامنة عند استقرار الاتصال)');
        setTimeout(() => setSaveSuccessMessage(null), 3500);
      } finally {
        setIsSaving(false);
      }
    },
    [selectedIndicatorId, saveDraftLocally, removeLocalDraft]
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
    // Offline caching & conflict resolution helpers
    isOffline,
    pendingOfflineCount,
    isSyncing,
    conflictWarning,
    syncOfflineDrafts,
    resolveConflictWithLocal: () => syncOfflineDrafts(true),
    dismissConflict: () => setConflictWarning(null),
  };
}
