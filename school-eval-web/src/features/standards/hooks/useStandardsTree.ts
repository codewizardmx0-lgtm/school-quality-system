/**
 * Hook: useStandardsTree
 * إدارة الهيكل الشجري التفاعلي للمسودة، التنقل بين العقد، وتحديث المؤشرات لحظياً
 */

import { useState, useEffect, useCallback } from 'react';
import { standardsApi } from '../api/standardsApi';
import type {
  StandardNode,
  SubStandardNode,
  IndicatorNode,
  StandardVersionDetail,
  UpdateIndicatorPayload,
  CreateSubStandardPayload,
  CreateIndicatorPayload,
} from '../api/standardsTypes';

export function useStandardsTree(versionId?: number | string) {
  const [treeData, setTreeData] = useState<StandardVersionDetail | null>(null);
  const [selectedStandard, setSelectedStandard] = useState<StandardNode | null>(null);
  const [selectedSubStandard, setSelectedSubStandard] = useState<SubStandardNode | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorNode | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchTree = useCallback(async () => {
    if (!versionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await standardsApi.getStandardsTree(versionId);
      setTreeData(data);

      // اختيار افتراضي لأول معيار وأول مؤشر إذا لم يتم تحديد عقدة مسبقاً
      if (data?.standards && data.standards.length > 0) {
        const firstStd = data.standards[0];
        setSelectedStandard(firstStd);
        if (firstStd.subStandards && firstStd.subStandards.length > 0) {
          const firstSub = firstStd.subStandards[0];
          setSelectedSubStandard(firstSub);
          if (firstSub.indicators && firstSub.indicators.length > 0) {
            setSelectedIndicator(firstSub.indicators[0]);
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'فشل تحميل الشجرة الهرمية للمعايير.');
    } finally {
      setIsLoading(false);
    }
  }, [versionId]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // تحديد مؤشر بالضغط عليه في الشجرة
  const selectIndicator = (indicator: IndicatorNode, parentSub?: SubStandardNode, parentStd?: StandardNode) => {
    setSelectedIndicator(indicator);
    if (parentSub) setSelectedSubStandard(parentSub);
    if (parentStd) setSelectedStandard(parentStd);
  };

  // حفظ تعديلات المؤشر في اللوحة الجانبية
  const updateIndicator = async (id: number, payload: UpdateIndicatorPayload) => {
    setIsSaving(true);
    setSaveStatus('saving');
    setError(null);
    try {
      await standardsApi.updateIndicator(id, payload);

      // تحديث الحالة المحلية فوراً
      setSelectedIndicator((prev) => (prev ? { ...prev, ...payload } : null));

      setTreeData((prev) => {
        if (!prev) return prev;
        const updatedStandards = prev.standards.map((std) => ({
          ...std,
          subStandards: std.subStandards.map((sub) => ({
            ...sub,
            indicators: sub.indicators.map((ind) =>
              ind.indicatorId === id ? { ...ind, ...payload } : ind
            ),
          })),
        }));
        return { ...prev, standards: updatedStandards };
      });

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('error');
      setError(err?.message || 'تعذر حفظ تعديلات المؤشر.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // إضافة معيار فرعي جديد
  const addSubStandard = async (stdId: number, payload: CreateSubStandardPayload) => {
    if (!versionId) return;
    setIsSaving(true);
    try {
      await standardsApi.createSubStandard(versionId, stdId, payload);
      await fetchTree();
    } catch (err: any) {
      setError(err?.message || 'فشل إضافة المعيار الفرعي.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // إضافة مؤشر جديد
  const addIndicator = async (subStandardId: number, payload: CreateIndicatorPayload) => {
    setIsSaving(true);
    try {
      await standardsApi.createIndicator(subStandardId, payload);
      await fetchTree();
    } catch (err: any) {
      setError(err?.message || 'فشل إضافة المؤشر.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // حذف مؤشر
  const deleteIndicator = async (id: number) => {
    setIsSaving(true);
    try {
      await standardsApi.deleteIndicator(id);
      if (selectedIndicator?.indicatorId === id) {
        setSelectedIndicator(null);
      }
      await fetchTree();
    } catch (err: any) {
      setError(err?.message || 'تعذر حذف المؤشر المعياري.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    treeData,
    selectedStandard,
    selectedSubStandard,
    selectedIndicator,
    isLoading,
    isSaving,
    saveStatus,
    error,
    refetch: fetchTree,
    selectIndicator,
    setSelectedStandard,
    setSelectedSubStandard,
    updateIndicator,
    addSubStandard,
    addIndicator,
    deleteIndicator,
  };
}
