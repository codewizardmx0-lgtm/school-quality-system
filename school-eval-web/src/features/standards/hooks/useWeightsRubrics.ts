/**
 * Hook: useWeightsRubrics
 * معايرة وتوزيع الأوزان النسبية وفرض شرط التوازن الحتمي (100.0%)
 * بالإضافة إلى استرجاع وتوثيق سلالم التقدير اللفظي المعتمدة (0-3)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { standardsApi } from '../api/standardsApi';
import type { StandardWeightItem, RubricLevelInfo } from '../api/standardsTypes';
import { calculateTotalWeight, isBalanced100, distributeWeightsEqually } from '../utils/treeCalculators';

export function useWeightsRubrics(versionId?: number | string) {
  const [weights, setWeights] = useState<StandardWeightItem[]>([]);
  const [rubricLevels, setRubricLevels] = useState<RubricLevelInfo[]>([]);
  const [versionNo, setVersionNo] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeightsAndRubrics = useCallback(async () => {
    if (!versionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [weightsRes, rubricsRes] = await Promise.all([
        standardsApi.getWeights(versionId),
        standardsApi.getScoreLevels(),
      ]);

      if (weightsRes) {
        setWeights(weightsRes.standards || []);
        setVersionNo(weightsRes.versionNo || '');
      }
      if (rubricsRes) {
        setRubricLevels(rubricsRes);
      }
    } catch (err: any) {
      setError(err?.message || 'فشل تحميل بيانات الأوزان وسلالم التقدير.');
    } finally {
      setIsLoading(false);
    }
  }, [versionId]);

  useEffect(() => {
    fetchWeightsAndRubrics();
  }, [fetchWeightsAndRubrics]);

  // الحساب الحي للمجموع الإجمالي والتوازن
  const totalWeight = useMemo(() => calculateTotalWeight(weights), [weights]);
  const isBalanced = useMemo(() => isBalanced100(weights), [weights]);

  // تعديل وزن معيار محدد
  const handleWeightChange = (standardId: number, newWeight: number) => {
    setSaveSuccess(false);
    setWeights((prev) =>
      prev.map((item) =>
        item.standardId === standardId
          ? {
              ...item,
              weight: Number(newWeight) || 0,
              subWeightPerIndicator: item.indicatorsCount
                ? Math.round(((Number(newWeight) || 0) / item.indicatorsCount) * 100) / 100
                : 0,
            }
          : item
      )
    );
  };

  // إعادة التوزيع المتساوي الرياضي الدقيق (100.0%)
  const resetToEqualWeights = () => {
    if (weights.length === 0) return;
    setSaveSuccess(false);
    const equalDistribution = distributeWeightsEqually(weights.length);
    setWeights((prev) =>
      prev.map((item, index) => {
        const assignedWeight = equalDistribution[index] || 0;
        return {
          ...item,
          weight: assignedWeight,
          subWeightPerIndicator: item.indicatorsCount
            ? Math.round((assignedWeight / item.indicatorsCount) * 100) / 100
            : 0,
        };
      })
    );
  };

  // حفظ توزيع الأوزان الجديد في الخادم
  const saveWeights = async () => {
    if (!versionId) return;
    if (!isBalanced) {
      setError('لا يمكن حفظ الأوزان لأن المجموع غير متزن تماماً (يجب أن يكون 100.0%).');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const payload = weights.map((w) => ({
        standard_id: w.standardId,
        weight: w.weight,
      }));
      await standardsApi.updateWeights(versionId, payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setError(err?.message || 'تعذر حفظ توزيع الأوزان في الخادم.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    weights,
    rubricLevels,
    versionNo,
    totalWeight,
    isBalanced,
    isLoading,
    isSaving,
    saveSuccess,
    error,
    refetch: fetchWeightsAndRubrics,
    handleWeightChange,
    resetToEqualWeights,
    saveWeights,
  };
}
