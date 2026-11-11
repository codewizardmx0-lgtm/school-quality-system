import { useState, useEffect, useCallback, useMemo } from 'react';
import { evaluatorApi } from '../api/evaluatorApi';
import { useAuth } from '../../auth/AuthContext';
import type {
  StandardsTreeData,
  StandardNode,
  SubStandardNode,
  IndicatorNode,
  EvaluationResultData,
  SaveEvaluationResultPayload,
} from '../api/evaluationTypes';

export type SaveStatus = 'idle' | 'saving' | 'saved_server' | 'saved_local' | 'error';

interface OfflineDraft {
  indicatorId: number;
  payload: Omit<SaveEvaluationResultPayload, 'indicatorId'>;
  cachedAt: string;
}

export function useSelfEvaluation(
  initialIndicatorId?: number,
  isLocked: boolean = false,
  evaluationId?: number | null
) {
  const { user } = useAuth();
  const userId = user?.userId ?? 'guest';
  const schoolId = user?.schoolId ?? 'default';
  const effectiveEvalId = evaluationId ?? 1;

  // عزل مفتاح التخزين المحلي حسب المستخدم والمدرسة ودورة التقييم (FE-GAP-05 / Note 1 & Note 4)
  const storageKey = useMemo(() => {
    return `school_eval_drafts_u${userId}_s${schoolId}_e${effectiveEvalId}_v1`;
  }, [userId, schoolId, effectiveEvalId]);

  const lastIndicatorKey = useMemo(() => {
    return `school_eval_last_ind_u${userId}_s${schoolId}_e${effectiveEvalId}`;
  }, [userId, schoolId, effectiveEvalId]);

  // فحص المسودات المحفوظة محلياً لمدرسة أو دورة أخرى للمستخدم الحالي (Note 4)
  const [otherSchoolDraftsCount, setOtherSchoolDraftsCount] = useState<number>(0);
  const [hasDismissedOtherSchoolDrafts, setHasDismissedOtherSchoolDrafts] = useState<boolean>(false);

  const checkOtherSchoolDrafts = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    let count = 0;
    const prefix = `school_eval_drafts_u${userId}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix) && key !== storageKey) {
        try {
          const val = JSON.parse(localStorage.getItem(key) || '{}');
          count += Object.keys(val).length;
        } catch {
          // ignore
        }
      }
    }
    return count;
  }, [userId, storageKey]);

  useEffect(() => {
    const count = checkOtherSchoolDrafts();
    setOtherSchoolDraftsCount(count);
  }, [checkOtherSchoolDrafts]);

  const dismissOtherSchoolDrafts = useCallback(() => {
    setHasDismissedOtherSchoolDrafts(true);
  }, []);

  const syncOtherSchoolDrafts = useCallback(async () => {
    if (typeof window === 'undefined') return;
    setIsSyncing(true);
    try {
      const prefix = `school_eval_drafts_u${userId}_`;
      const keysToSync: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix) && key !== storageKey) {
          keysToSync.push(key);
        }
      }

      for (const k of keysToSync) {
        try {
          const drafts: Record<number, OfflineDraft> = JSON.parse(localStorage.getItem(k) || '{}');
          for (const indId of Object.keys(drafts).map(Number)) {
            const d = drafts[indId];
            if (d?.payload) {
              await evaluatorApi.saveEvaluationResult({
                indicatorId: indId,
                ...d.payload,
              });
            }
          }
          localStorage.removeItem(k);
        } catch (e) {
          console.error('Error syncing old school key:', k, e);
        }
      }
      setOtherSchoolDraftsCount(0);
      setHasDismissedOtherSchoolDrafts(true);
    } finally {
      setIsSyncing(false);
    }
  }, [userId, storageKey]);

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

  // حالة الاتصال بالشبكة والمزامنة التلقائية (FE-GAP-05 / U-35)
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // قراءة المسودات غير المزامنة من التخزين المحلي المعزول
  const getStoredDrafts = useCallback((): Record<number, OfflineDraft> => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, [storageKey]);

  // تحديث عداد المسودات المحلية
  const refreshDraftsCount = useCallback(() => {
    const drafts = getStoredDrafts();
    setPendingOfflineCount(Object.keys(drafts).length);
  }, [getStoredDrafts]);

  // حفظ مسودة محلية في وضع عدم الاتصال
  const saveDraftLocally = useCallback(
    (indicatorId: number, payload: Omit<SaveEvaluationResultPayload, 'indicatorId'>) => {
      if (typeof window === 'undefined' || isLocked) return;
      try {
        const drafts = getStoredDrafts();
        drafts[indicatorId] = {
          indicatorId,
          payload,
          cachedAt: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(drafts));
        refreshDraftsCount();
      } catch (e) {
        console.error('Failed to store draft locally:', e);
      }
    },
    [getStoredDrafts, refreshDraftsCount, storageKey, isLocked]
  );

  // إزالة مسودة معينة بعد المزامنة
  const removeLocalDraft = useCallback(
    (indicatorId: number) => {
      if (typeof window === 'undefined') return;
      try {
        const drafts = getStoredDrafts();
        delete drafts[indicatorId];
        localStorage.setItem(storageKey, JSON.stringify(drafts));
        refreshDraftsCount();
      } catch (e) {
        console.error('Failed to remove draft locally:', e);
      }
    },
    [getStoredDrafts, refreshDraftsCount, storageKey]
  );

  // مزامنة المسودات المحفوظة محلياً مع فحص حالة القفل ومعالجة التعارض
  const syncOfflineDrafts = useCallback(
    async (forceOverrideConflict = false) => {
      // إذا كان التقييم مقفلاً برمجياً، نمنع المزامنة حمايةً لسلامة السجل النهائي
      if (isLocked) {
        console.warn('Evaluation is locked. Syncing offline drafts is blocked.');
        return;
      }

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
                setConflictWarning(
                  `تنبيه تعارض في المؤشر [${id}]: تم تعديل التقييم على الخادم بتاريخ أحدث من مسودتك المحلية. يمكنك فرض نسختك أو التراجع.`
                );
                continue;
              }
            } catch {
              // تعذر الجلب، نستمر في محاولة الحفظ
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
          setSaveStatus('saved_server');
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
    [getStoredDrafts, removeLocalDraft, refreshDraftsCount, isLocked]
  );

  const clearAllDrafts = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(storageKey);
    refreshDraftsCount();
  }, [storageKey, refreshDraftsCount]);

  // الاستماع لأحداث الاتصال بالإنترنت
  useEffect(() => {
    refreshDraftsCount();

    const handleOnline = () => {
      setIsOffline(false);
      // مزامنة تلقائية عند استعادة الاتصال ما لم يكن مقفلاً
      if (!isLocked) {
        syncOfflineDrafts();
      }
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
  }, [refreshDraftsCount, syncOfflineDrafts, isLocked]);

  // تحميل شجرة المعايير
  const loadTree = useCallback(async () => {
    setIsLoadingTree(true);
    try {
      const data = await evaluatorApi.getActiveStandardsTree();
      setTreeData(data);
      if (data.standards.length > 0 && !selectedIndicatorId) {
        const flat: { standardId: number; ind: IndicatorNode }[] = [];
        data.standards.forEach((std) => {
          std.subStandards?.forEach((sub) => {
            sub.indicators?.forEach((ind) => {
              flat.push({ standardId: std.standardId, ind });
            });
          });
        });

        if (flat.length > 0) {
          const isIncomplete = (ind: IndicatorNode) =>
            ind.score === null ||
            ind.score === undefined ||
            ((ind.mandatoryRequirementsCount ?? 0) > 0 &&
              (ind.coveredRequirementsCount ?? 0) < (ind.mandatoryRequirementsCount ?? 0));

          const savedRaw = typeof window !== 'undefined' ? localStorage.getItem(lastIndicatorKey) : null;
          const savedItem = savedRaw ? flat.find((x) => x.ind.indicatorId === Number(savedRaw)) : undefined;
          const firstIncomplete = flat.find((x) => isIncomplete(x.ind));
          const firstLowScore = flat.find((x) => x.ind.score !== null && x.ind.score !== undefined && x.ind.score <= 1);

          const chosen =
            (savedItem && (isIncomplete(savedItem.ind) || !firstIncomplete) ? savedItem : null) ||
            firstIncomplete ||
            firstLowScore ||
            flat[0];

          setSelectedStandardId(chosen.standardId);
          setSelectedIndicatorId(chosen.ind.indicatorId);
        }
      } else if (data.standards.length > 0 && !selectedStandardId) {
        setSelectedStandardId(data.standards[0].standardId);
      }
    } catch (err) {
      console.error('Failed to load standards tree:', err);
    } finally {
      setIsLoadingTree(false);
    }
  }, [selectedStandardId, selectedIndicatorId, lastIndicatorKey]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  useEffect(() => {
    if (selectedIndicatorId && typeof window !== 'undefined') {
      localStorage.setItem(lastIndicatorKey, String(selectedIndicatorId));
    }
  }, [selectedIndicatorId, lastIndicatorKey]);

  // قائمة مسطحة لجميع المؤشرات لتسهيل التنقل التالي/السابق
  const allIndicators = useMemo(() => {
    if (!treeData) return [];
    const list: { indicator: IndicatorNode; standard: StandardNode; subStandard: SubStandardNode }[] = [];
    treeData.standards.forEach((std) => {
      std.subStandards.forEach((sub) => {
        sub.indicators.forEach((ind) => {
          list.push({ indicator: ind, standard: std, subStandard: sub });
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
      setIsLoadingResult(true);
      try {
        const res = await evaluatorApi.getEvaluationResult(indicatorId);
        const stored = getStoredDrafts()[indicatorId];
        if (stored) {
          // دمج المسودة المحلية فوق نتيجة الخادم دون مسح الشواهد أو متطلباتها
          setCurrentResult({
            ...res,
            score: stored.payload.score !== undefined ? stored.payload.score : res.score,
            scoreDescriptorId: stored.payload.scoreDescriptorId !== undefined ? stored.payload.scoreDescriptorId : res.scoreDescriptorId,
            completionStatus: stored.payload.completionStatus !== undefined ? stored.payload.completionStatus : res.completionStatus,
            justification: stored.payload.justification !== undefined ? stored.payload.justification : res.justification,
            verificationMethods: stored.payload.verificationMethods !== undefined ? stored.payload.verificationMethods : res.verificationMethods,
            updatedAt: stored.cachedAt,
          });
          setSaveStatus('saved_local');
        } else {
          setCurrentResult(res);
          setSaveStatus('saved_server');
        }
      } catch (err) {
        console.error(`Failed to load indicator result for ${indicatorId}:`, err);
        // في حالة عدم توفر اتصال بالخادم، نستخدم المسودة المحلية كخطة طوارئ
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
          setSaveStatus('saved_local');
        }
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

  // حفظ التقييم الذاتي مع دعم الحفظ دون اتصال، ومؤشر الحالة الصريح، وقفل التقييم
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

      // 1. تحديث الحالة التفاؤلية فوراً في واجهة المستخدم
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
        setSaveStatus('saved_local');
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
        removeLocalDraft(selectedIndicatorId);
        setSaveStatus('saved_server');
        setSaveSuccessMessage('تم الحفظ بنجاح على الخادم');
        setTimeout(() => setSaveSuccessMessage(null), 3000);
      } catch (err: any) {
        const isNetworkDrop = (typeof navigator !== 'undefined' && !navigator.onLine) || !err?.response || err?.code === 'ERR_NETWORK';
        if (isNetworkDrop) {
          console.warn('Network error while saving. Storing draft locally:', err);
          saveDraftLocally(selectedIndicatorId, payload);
          setSaveStatus('saved_local');
          setLastFailedPayload(payload);
          setSaveSuccessMessage('تم الحفظ محلياً (سيتم المزامنة عند استقرار الاتصال)');
          setTimeout(() => setSaveSuccessMessage(null), 3500);
        } else {
          console.error('Server/validation error while saving assessment:', err);
          setSaveStatus('error');
          setLastFailedPayload(payload);
          const errMsg = err?.response?.data?.message || 'تعذر الحفظ على الخادم، يرجى إعادة المحاولة';
          setSaveSuccessMessage(errMsg);
          setTimeout(() => setSaveSuccessMessage(null), 5000);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [selectedIndicatorId, isLocked, saveDraftLocally, removeLocalDraft]
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

  // تصفير رصد مؤشر واحد بأمان مع مزامنة الشجرة والمسودات المحلية (الملاحظة 7)
  const resetIndicatorAssessment = useCallback(
    async (indicatorId: number, unlinkEvidences: boolean = false) => {
      if (isLocked) return;
      await evaluatorApi.resetIndicator(indicatorId, unlinkEvidences);
      if (typeof window !== 'undefined') {
        const drafts = getStoredDrafts();
        if (drafts[indicatorId]) {
          delete drafts[indicatorId];
          localStorage.setItem(storageKey, JSON.stringify(drafts));
          refreshDraftsCount();
        }
      }
      await loadTree();
      if (selectedIndicatorId === indicatorId) {
        await loadIndicatorResult(indicatorId);
      }
      setSaveStatus('idle');
      setSaveSuccessMessage('تم تصفير رصد المؤشر بنجاح وإعادته لقائمة الاستيفاء.');
    },
    [isLocked, getStoredDrafts, storageKey, refreshDraftsCount, loadTree, selectedIndicatorId, loadIndicatorResult]
  );

  // تصفير معيار كامل بأمان مع مزامنة الشجرة والمسودات المحلية (الملاحظة 11)
  const resetStandardAssessment = useCallback(
    async (standardId: number, unlinkEvidences: boolean = false) => {
      if (isLocked) return;
      await evaluatorApi.resetStandard(standardId, unlinkEvidences);
      if (typeof window !== 'undefined' && treeData) {
        const targetStd = treeData.standards.find((s) => s.standardId === standardId);
        if (targetStd) {
          const indIds = new Set(
            targetStd.subStandards.flatMap((sub) => sub.indicators.map((i) => i.indicatorId))
          );
          const drafts = getStoredDrafts();
          let changed = false;
          indIds.forEach((id) => {
            if (drafts[id]) {
              delete drafts[id];
              changed = true;
            }
          });
          if (changed) {
            localStorage.setItem(storageKey, JSON.stringify(drafts));
            refreshDraftsCount();
          }
          if (selectedIndicatorId && indIds.has(selectedIndicatorId)) {
            await loadIndicatorResult(selectedIndicatorId);
          }
        }
      }
      await loadTree();
      setSaveStatus('idle');
      setSaveSuccessMessage('تم تصفير المعيار بنجاح وإعادة مؤشراته لقائمة الاستيفاء.');
    },
    [isLocked, treeData, getStoredDrafts, storageKey, refreshDraftsCount, selectedIndicatorId, loadIndicatorResult, loadTree]
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
    // Offline caching & conflict resolution helpers
    isOffline,
    pendingOfflineCount,
    isSyncing,
    conflictWarning,
    syncOfflineDrafts,
    clearAllDrafts,
    resolveConflictWithLocal: () => syncOfflineDrafts(true),
    dismissConflict: () => setConflictWarning(null),
    // Cross-school draft isolation & alert
    hasOtherSchoolDrafts: otherSchoolDraftsCount > 0 && !hasDismissedOtherSchoolDrafts,
    otherSchoolDraftsCount,
    dismissOtherSchoolDrafts,
    syncOtherSchoolDrafts,
  };
}
