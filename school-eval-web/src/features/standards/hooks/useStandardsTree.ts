/**
 * Hook: useStandardsTree
 * إدارة الهيكل الشجري التفاعلي للمسودة، التنقل بين العقد، وتحديث المؤشرات ومتطلبات الشواهد لحظياً
 */

import { useState, useEffect, useCallback } from 'react';
import { standardsApi } from '../api/standardsApi';
import type {
  StandardNode,
  SubStandardNode,
  IndicatorNode,
  StandardVersionDetail,
  CreateStandardPayload,
  UpdateStandardPayload,
  CreateSubStandardPayload,
  UpdateSubStandardPayload,
  CreateIndicatorPayload,
  UpdateIndicatorPayload,
  SaveEvidenceRequirementPayload,
  UpdateScoreDescriptorItem,
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

  const isDraft = treeData?.status === 'Draft' || treeData?.status === 'draft';

  const fetchTree = useCallback(async () => {
    if (!versionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await standardsApi.getStandardsTree(versionId);
      setTreeData(data);

      // الحفاظ على العقدة المحددة حالياً إن أمكن، أو اختيار أول عقدة
      if (data?.standards && data.standards.length > 0) {
        setSelectedStandard((prevStd) => {
          const match = prevStd ? data.standards.find((s) => s.standardId === prevStd.standardId) : null;
          const targetStd = match || data.standards[0];

          setSelectedSubStandard((prevSub) => {
            const subMatch = prevSub ? targetStd.subStandards?.find((sb) => sb.subStandardId === prevSub.subStandardId) : null;
            const targetSub = subMatch || targetStd.subStandards?.[0] || null;

            setSelectedIndicator((prevInd) => {
              const indMatch = prevInd ? targetSub?.indicators?.find((i) => i.indicatorId === prevInd.indicatorId) : null;
              return indMatch || targetSub?.indicators?.[0] || null;
            });

            return targetSub;
          });

          return targetStd;
        });
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

  // 1. إدارة المعيار الرئيسي (القرار 4)
  const addStandard = async (payload: CreateStandardPayload) => {
    if (!versionId) return;
    setIsSaving(true);
    try {
      await standardsApi.createStandard(versionId, payload);
      await fetchTree();
    } catch (err: any) {
      setError(err?.message || 'فشل إضافة المعيار الرئيسي.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const updateStandard = async (standardId: number, payload: UpdateStandardPayload) => {
    setIsSaving(true);
    try {
      await standardsApi.updateStandard(standardId, payload);
      await fetchTree();
    } catch (err: any) {
      setError(err?.message || 'فشل تحديث المعيار الرئيسي.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteStandard = async (standardId: number) => {
    setIsSaving(true);
    try {
      await standardsApi.deleteStandard(standardId);
      if (selectedStandard?.standardId === standardId) {
        setSelectedStandard(null);
        setSelectedSubStandard(null);
        setSelectedIndicator(null);
      }
      await fetchTree();
    } catch (err: any) {
      setError(err?.message || 'تعذر حذف المعيار الرئيسي.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // 2. إدارة المعيار الفرعي
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

  const updateSubStandard = async (subStandardId: number, payload: UpdateSubStandardPayload) => {
    setIsSaving(true);
    try {
      await standardsApi.updateSubStandard(subStandardId, payload);
      await fetchTree();
    } catch (err: any) {
      setError(err?.message || 'فشل تحديث المعيار الفرعي.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSubStandard = async (subStandardId: number) => {
    setIsSaving(true);
    try {
      await standardsApi.deleteSubStandard(subStandardId);
      if (selectedSubStandard?.subStandardId === subStandardId) {
        setSelectedSubStandard(null);
        setSelectedIndicator(null);
      }
      await fetchTree();
    } catch (err: any) {
      setError(err?.message || 'تعذر حذف المعيار الفرعي.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // 3. إدارة المؤشر
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

  const updateIndicator = async (id: number, payload: UpdateIndicatorPayload) => {
    setIsSaving(true);
    setSaveStatus('saving');
    setError(null);
    try {
      await standardsApi.updateIndicator(id, payload);

      const updatedTools = payload.verification_tools || payload.verificationTools;
      const updatedToolIds = payload.verification_tool_ids || payload.verificationToolIds;
      const updatedMethod = payload.verification_method || payload.verificationMethod;
      const updatedDesc = payload.description || payload.rubric_notes || payload.rubricNotes;

      setSelectedIndicator((prev) =>
        prev && prev.indicatorId === id
          ? {
              ...prev,
              ...payload,
              verificationTools: updatedTools ?? prev.verificationTools,
              verificationToolIds: updatedToolIds ?? prev.verificationToolIds,
              verificationMethod: updatedMethod ?? prev.verificationMethod,
              description: updatedDesc ?? prev.description,
              rubricNotes: updatedDesc ?? prev.rubricNotes,
            }
          : prev
      );

      setTreeData((prev) => {
        if (!prev) return prev;
        const updatedStandards = prev.standards.map((std) => ({
          ...std,
          subStandards: std.subStandards.map((sub) => ({
            ...sub,
            indicators: sub.indicators.map((ind) =>
              ind.indicatorId === id
                ? {
                    ...ind,
                    ...payload,
                    verificationTools: updatedTools ?? ind.verificationTools,
                    verificationToolIds: updatedToolIds ?? ind.verificationToolIds,
                    verificationMethod: updatedMethod ?? ind.verificationMethod,
                    description: updatedDesc ?? ind.description,
                    rubricNotes: updatedDesc ?? ind.rubricNotes,
                  }
                : ind
            ),
          })),
        }));
        return { ...prev, standards: updatedStandards };
      });

      // Background sync from server to ensure complete consistency
      fetchTree().catch(() => {});

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

  // 4. إدارة متطلبات الشواهد الـ 278 (القرار 2)
  const addEvidenceRequirement = async (indicatorId: number, payload: SaveEvidenceRequirementPayload) => {
    setIsSaving(true);
    try {
      const created = await standardsApi.createEvidenceRequirement(indicatorId, payload);
      setSelectedIndicator((prev) => {
        if (!prev || prev.indicatorId !== indicatorId) return prev;
        const currentReqs = prev.evidenceRequirements || [];
        return {
          ...prev,
          evidenceRequirements: [...currentReqs, created],
        };
      });
      await fetchTree();
      return created;
    } catch (err: any) {
      setError(err?.message || 'فشل إضافة متطلب الشاهد.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const updateEvidenceRequirement = async (
    indicatorId: number,
    requirementId: number,
    payload: SaveEvidenceRequirementPayload
  ) => {
    setIsSaving(true);
    try {
      const updated = await standardsApi.updateEvidenceRequirement(indicatorId, requirementId, payload);
      setSelectedIndicator((prev) => {
        if (!prev || prev.indicatorId !== indicatorId) return prev;
        const currentReqs = prev.evidenceRequirements || [];
        return {
          ...prev,
          evidenceRequirements: currentReqs.map((r) => (r.requirementId === requirementId ? updated : r)),
        };
      });
      await fetchTree();
      return updated;
    } catch (err: any) {
      setError(err?.message || 'فشل تحديث متطلب الشاهد.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteEvidenceRequirement = async (indicatorId: number, requirementId: number) => {
    setIsSaving(true);
    try {
      await standardsApi.deleteEvidenceRequirement(indicatorId, requirementId);
      setSelectedIndicator((prev) => {
        if (!prev || prev.indicatorId !== indicatorId) return prev;
        const currentReqs = prev.evidenceRequirements || [];
        return {
          ...prev,
          evidenceRequirements: currentReqs.filter((r) => r.requirementId !== requirementId),
        };
      });
      await fetchTree();
    } catch (err: any) {
      setError(err?.message || 'تعذر حذف متطلب الشاهد.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // 5. تحديث واصفات سلم التقدير اللفظي (القرار 3)
  const updateScoreDescriptors = async (indicatorId: number, descriptors: UpdateScoreDescriptorItem[]) => {
    setIsSaving(true);
    try {
      const updated = await standardsApi.updateIndicatorDescriptors(indicatorId, descriptors);
      setSelectedIndicator((prev) => {
        if (!prev || prev.indicatorId !== indicatorId) return prev;
        return {
          ...prev,
          scoreDescriptors: updated,
        };
      });
      await fetchTree();
      return updated;
    } catch (err: any) {
      setError(err?.message || 'تعذر تحديث واصفات سلم التقدير.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    treeData,
    isDraft,
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
    addStandard,
    updateStandard,
    deleteStandard,
    addSubStandard,
    updateSubStandard,
    deleteSubStandard,
    addIndicator,
    updateIndicator,
    deleteIndicator,
    addEvidenceRequirement,
    updateEvidenceRequirement,
    deleteEvidenceRequirement,
    updateScoreDescriptors,
  };
}
