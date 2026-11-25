/**
 * Hook: useWeightsRubrics
 * معايرة وتوزيع الأوزان النسبية للمستويات الثلاثة:
 * 1. المعايير الرئيسية (إلزامي 100.0%)
 * 2. المعايير الفرعية (إلزامي مجموع كل معيار فرعي = وزن معياره الرئيسي)
 * 3. المؤشرات (إلزامي مجموع أوزان مؤشرات كل معيار فرعي = وزن المعيار الفرعي التابع له)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { standardsApi } from '../api/standardsApi';
import { extractApiErrorMessage } from '../../../api/apiTypes';
import type {
  StandardWeightItem,
  RubricLevelInfo,
  UpdateWeightsPayload,
} from '../api/standardsTypes';
import { calculateTotalWeight, isBalanced100, distributeWeightsEqually } from '../utils/treeCalculators';

export function useWeightsRubrics(versionId?: number | string) {
  const [weights, setWeights] = useState<StandardWeightItem[]>([]);
  const [rubricLevels, setRubricLevels] = useState<RubricLevelInfo[]>([]);
  const [versionNo, setVersionNo] = useState<string>('');
  const [status, setStatus] = useState<string>('Draft');
  const [isDraft, setIsDraft] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeightsAndRubrics = useCallback(async () => {
    if (!versionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [weightsRes, rubricsRes] = await Promise.all([
        standardsApi.getWeights(versionId),
        standardsApi.getScoreLevels(versionId),
      ]);

      if (weightsRes) {
        setWeights(weightsRes.standards || []);
        setVersionNo(weightsRes.versionNo || '');
        setStatus(weightsRes.status || 'Draft');
        setIsDraft(weightsRes.isDraft ?? (weightsRes.status === 'Draft'));
      }
      if (rubricsRes) {
        setRubricLevels(rubricsRes);
      }
      setIsDirty(false);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'فشل تحميل بيانات الأوزان وسلالم التقدير.'));
    } finally {
      setIsLoading(false);
    }
  }, [versionId]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchWeightsAndRubrics());
  }, [fetchWeightsAndRubrics]);

  // الحساب الحي للمجموع الإجمالي للمعايير الرئيسية والتوازن 100%
  const totalWeight = useMemo(() => calculateTotalWeight(weights), [weights]);
  const isMainBalanced = useMemo(() => isBalanced100(weights), [weights]);

  // فحص اتزان كل معيار رئيسي مع معاييره الفرعية (مجموع الفرعي = وزن المعيار)
  const subStandardsBalanceMap = useMemo(() => {
    const map: Record<number, { isBalanced: boolean; currentSum: number; expected: number }> = {};
    weights.forEach((std) => {
      const subs = std.subStandards || [];
      if (subs.length === 0) {
        map[std.standardId] = { isBalanced: true, currentSum: std.weight, expected: std.weight };
      } else {
        const sum = subs.reduce((acc, s) => acc + (Number(s.weight) || 0), 0);
        const roundedSum = Math.round(sum * 100) / 100;
        const roundedExpected = Math.round((Number(std.weight) || 0) * 100) / 100;
        const diff = Math.abs(roundedSum - roundedExpected);
        map[std.standardId] = {
          isBalanced: diff < 0.05,
          currentSum: roundedSum,
          expected: roundedExpected,
        };
      }
    });
    return map;
  }, [weights]);

  // هل كافة المعايير الفرعية متزنة مع معاييرها الرئيسية؟
  const isAllSubStandardsBalanced = useMemo(() => {
    return Object.values(subStandardsBalanceMap).every((b) => b.isBalanced);
  }, [subStandardsBalanceMap]);

  // فحص اتزان المؤشرات لكل معيار فرعي (مجموع أوزان المؤشرات = وزن المعيار الفرعي)
  const indicatorsBalanceMap = useMemo(() => {
    const map: Record<
      number,
      { isBalanced: boolean; currentSum: number; expected: number; diff: number; indicatorsCount: number }
    > = {};

    weights.forEach((std) => {
      (std.subStandards || []).forEach((sub) => {
        const indicators = sub.indicators || [];
        if (indicators.length === 0) {
          map[sub.subStandardId] = {
            isBalanced: true,
            currentSum: sub.weight,
            expected: sub.weight,
            diff: 0,
            indicatorsCount: 0,
          };
        } else {
          const sum = indicators.reduce((acc, ind) => acc + (Number(ind.weight) || 0), 0);
          const roundedSum = Math.round(sum * 100) / 100;
          const roundedExpected = Math.round((Number(sub.weight) || 0) * 100) / 100;
          const diff = Math.round((roundedSum - roundedExpected) * 100) / 100;
          map[sub.subStandardId] = {
            isBalanced: Math.abs(diff) < 0.05,
            currentSum: roundedSum,
            expected: roundedExpected,
            diff,
            indicatorsCount: indicators.length,
          };
        }
      });
    });

    return map;
  }, [weights]);

  // هل كافة المؤشرات متزنة مع معاييرها الفرعية عبر كامل الشجرة؟
  const isAllIndicatorsBalanced = useMemo(() => {
    return Object.values(indicatorsBalanceMap).every((b) => b.isBalanced);
  }, [indicatorsBalanceMap]);

  // الاتزان الكلي الشامل لكافة المستويات الثلاثة
  const isBalanced = isMainBalanced && isAllSubStandardsBalanced && isAllIndicatorsBalanced;

  // تعديل وزن معيار رئيسي محدد
  const handleWeightChange = (standardId: number, newWeight: number) => {
    setSaveSuccess(false);
    setIsDirty(true);
    setWeights((prev) =>
      prev.map((item) => {
        if (item.standardId !== standardId) return item;
        const val = Number(newWeight) || 0;
        const subs = item.subStandards || [];

        // إذا كان لديه معايير فرعية، قم بتوزيع وزن المعيار الرئيسي عليها بالتساوي افتراضياً
        let updatedSubs = subs;
        if (subs.length > 0) {
          const subSlice = Math.round((val / subs.length) * 100) / 100;
          updatedSubs = subs.map((sub, idx) => {
            const subW = idx === subs.length - 1 ? Math.round((val - subSlice * (subs.length - 1)) * 100) / 100 : subSlice;
            const inds = sub.indicators || [];
            const indSlice = inds.length > 0 ? Math.round((subW / inds.length) * 100) / 100 : 0;
            return {
              ...sub,
              weight: subW,
              indicators: inds.map((ind, indIdx) => ({
                ...ind,
                weight: indIdx === inds.length - 1 ? Math.round((subW - indSlice * (inds.length - 1)) * 100) / 100 : indSlice,
              })),
            };
          });
        }

        return {
          ...item,
          weight: val,
          subWeightPerIndicator: item.indicatorsCount
            ? Math.round((val / item.indicatorsCount) * 100) / 100
            : 0,
          subStandards: updatedSubs,
        };
      })
    );
  };

  // تعديل وزن معيار فرعي محدد
  const handleSubStandardWeightChange = (standardId: number, subStandardId: number, newWeight: number) => {
    setSaveSuccess(false);
    setIsDirty(true);
    const val = Number(newWeight) || 0;
    setWeights((prev) =>
      prev.map((std) => {
        if (std.standardId !== standardId) return std;
        const updatedSubs = (std.subStandards || []).map((sub) => {
          if (sub.subStandardId !== subStandardId) return sub;
          const inds = sub.indicators || [];
          const indSlice = inds.length > 0 ? Math.round((val / inds.length) * 100) / 100 : 0;
          return {
            ...sub,
            weight: val,
            indicators: inds.map((ind, indIdx) => ({
              ...ind,
              weight: indIdx === inds.length - 1 ? Math.round((val - indSlice * (inds.length - 1)) * 100) / 100 : indSlice,
            })),
          };
        });

        return {
          ...std,
          subStandards: updatedSubs,
        };
      })
    );
  };

  // تعديل وزن مؤشر محدد
  const handleIndicatorWeightChange = (
    standardId: number,
    subStandardId: number,
    indicatorId: number,
    newWeight: number
  ) => {
    setSaveSuccess(false);
    setIsDirty(true);
    const val = Number(newWeight) || 0;
    setWeights((prev) =>
      prev.map((std) => {
        if (std.standardId !== standardId) return std;
        const updatedSubs = (std.subStandards || []).map((sub) => {
          if (sub.subStandardId !== subStandardId) return sub;
          return {
            ...sub,
            indicators: (sub.indicators || []).map((ind) => {
              if (ind.indicatorId !== indicatorId) return ind;
              return { ...ind, weight: val };
            }),
          };
        });
        return { ...std, subStandards: updatedSubs };
      })
    );
  };

  // إعادة التوزيع المتساوي الرياضي الدقيق (100.0%) عبر المستويات الثلاثة
  const resetToEqualWeights = () => {
    if (weights.length === 0) return;
    setSaveSuccess(false);
    setIsDirty(true);
    const equalDistribution = distributeWeightsEqually(weights.length);
    setWeights((prev) =>
      prev.map((item, index) => {
        const assignedWeight = equalDistribution[index] || 0;
        const subs = item.subStandards || [];
        let updatedSubs = subs;

        if (subs.length > 0) {
          const subDistribution = distributeWeightsEqually(subs.length);
          updatedSubs = subs.map((sub, sIdx) => {
            const ratio = (subDistribution[sIdx] || 0) / 100;
            const subW = Math.round(assignedWeight * ratio * 100) / 100;
            const inds = sub.indicators || [];
            const indSlice = inds.length > 0 ? Math.round((subW / inds.length) * 100) / 100 : 0;
            return {
              ...sub,
              weight: subW,
              indicators: inds.map((ind, iIdx) => ({
                ...ind,
                weight: iIdx === inds.length - 1 ? Math.round((subW - indSlice * (inds.length - 1)) * 100) / 100 : indSlice,
              })),
            };
          });
        }

        return {
          ...item,
          weight: assignedWeight,
          subWeightPerIndicator: item.indicatorsCount
            ? Math.round((assignedWeight / item.indicatorsCount) * 100) / 100
            : 0,
          subStandards: updatedSubs,
        };
      })
    );
  };

  // حفظ توزيع الأوزان الجديد للمستويات الثلاثة في الخادم
  const saveWeights = async () => {
    if (!versionId) return;
    if (!isMainBalanced) {
      setError('لا يمكن حفظ الأوزان لأن مجموع المعايير الرئيسية غير متزن (يجب أن يكون 100.0% تماماً).');
      return;
    }
    if (!isAllSubStandardsBalanced) {
      setError('لا يمكن حفظ الأوزان لأن بعض المعايير الفرعية غير متزنة مع وزن معيارها الرئيسي التابع له.');
      return;
    }
    if (!isAllIndicatorsBalanced) {
      setError('لا يمكن حفظ الأوزان لأن أوزان بعض المؤشرات غير متزنة مع وزن معيارها الفرعي التابع له.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const payload: UpdateWeightsPayload = {
        standards_weights: weights.map((w) => ({
          standard_id: w.standardId,
          weight: w.weight,
        })),
        sub_standards_weights: weights.flatMap((w) =>
          (w.subStandards || []).map((sub) => ({
            sub_standard_id: sub.subStandardId,
            weight: sub.weight,
          }))
        ),
        indicators_weights: weights.flatMap((w) =>
          (w.subStandards || []).flatMap((sub) =>
            (sub.indicators || []).map((ind) => ({
              indicator_id: ind.indicatorId,
              weight: ind.weight,
            }))
          )
        ),
      };

      await standardsApi.updateWeights(versionId, payload);
      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'تعذر حفظ توزيع الأوزان في الخادم.'));
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    weights,
    rubricLevels,
    versionNo,
    status,
    isDraft,
    totalWeight,
    isBalanced,
    isMainBalanced,
    isAllSubStandardsBalanced,
    isAllIndicatorsBalanced,
    subStandardsBalanceMap,
    indicatorsBalanceMap,
    isLoading,
    isSaving,
    saveSuccess,
    isDirty,
    setIsDirty,
    error,
    refetch: fetchWeightsAndRubrics,
    handleWeightChange,
    handleSubStandardWeightChange,
    handleIndicatorWeightChange,
    resetToEqualWeights,
    saveWeights,
  };
}
