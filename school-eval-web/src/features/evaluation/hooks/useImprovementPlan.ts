import { useState, useEffect, useCallback, useMemo } from 'react';
import { evaluatorApi } from '../api/evaluatorApi';
import type {
  ImprovementPlanData,
  ImprovementPlanListItem,
  ImprovementPlanAction,
  PlanType,
  CreateImprovementActionPayload,
  UpdateImprovementActionPayload,
  ActionStatus,
} from '../api/evaluationTypes';

export function useImprovementPlan() {
  const [selectedPlanType, setSelectedPlanType] = useState<PlanType>('QualityImprovement');
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [plansList, setPlansList] = useState<ImprovementPlanListItem[]>([]);
  const [planData, setPlanData] = useState<ImprovementPlanData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingPlansList, setIsLoadingPlansList] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingAction, setEditingAction] = useState<ImprovementPlanAction | null>(null);

  const fetchPlansList = useCallback(async () => {
    setIsLoadingPlansList(true);
    try {
      const list = await evaluatorApi.getSchoolImprovementPlans();
      setPlansList(list);
    } catch (err) {
      console.error('Failed to load improvement plans list:', err);
    } finally {
      setIsLoadingPlansList(false);
    }
  }, []);

  const fetchPlan = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await evaluatorApi.getCurrentImprovementPlan(selectedPlanType, selectedPlanId || undefined);
      setPlanData(data);
    } catch (err) {
      console.error('Failed to load improvement plan:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPlanType, selectedPlanId]);

  useEffect(() => {
    fetchPlansList();
  }, [fetchPlansList]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const selectPlan = useCallback((planId: number | null) => {
    setSelectedPlanId(planId);
  }, []);

  const cloneVersion = useCallback(
    async (planId: number) => {
      setIsSubmitting(true);
      try {
        const res = await evaluatorApi.clonePlanVersion(planId);
        await fetchPlansList();
        if (res?.data?.planId) {
          setSelectedPlanId(res.data.planId);
          if (res.data.planType) {
            setSelectedPlanType(res.data.planType);
          }
        }
        await fetchPlan();
        return res;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchPlansList, fetchPlan]
  );

  // حساب مؤشرات الخطة ديناميكياً بناءً على مصفوفة الإجراءات
  const dynamicSummary = useMemo(() => {
    if (!planData?.actions) {
      return { totalActions: 0, inProgressActions: 0, doneActions: 0, pendingActions: 0 };
    }
    const actions = planData.actions;
    const total = actions.length;
    const done = actions.filter((a) => a.status === 'Done').length;
    const inProgress = actions.filter((a) => a.status === 'InProgress').length;
    const pending = actions.filter((a) => a.status === 'Pending').length;
    return {
      totalActions: total,
      inProgressActions: inProgress,
      doneActions: done,
      pendingActions: pending,
    };
  }, [planData?.actions]);

  // إضافة إجراء تنفيذي جديد عبر الـ API الحقيقي مع المفتاح المركب (plan_id, area_id)
  const addAction = useCallback(
    async (payload: CreateImprovementActionPayload) => {
      setIsSubmitting(true);
      try {
        await evaluatorApi.createImprovementAction({
          ...payload,
          planId: payload.planId ?? planData?.planId,
          planType: payload.planType ?? selectedPlanType,
        });
        await fetchPlan();
      } finally {
        setIsSubmitting(false);
      }
    },
    [planData?.planId, selectedPlanType, fetchPlan]
  );

  // تحديث حالة وتقدم إجراء معين
  const updateAction = useCallback(
    async (actionId: number, payload: UpdateImprovementActionPayload) => {
      setIsSubmitting(true);

      const statusMap: Record<ActionStatus, string> = {
        Done: 'مكتمل',
        InProgress: 'قيد التنفيذ',
        Pending: 'معلق',
        Cancelled: 'ملغي',
      };

      // تحديث تفاؤلي فوري في الواجهة
      setPlanData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          actions: prev.actions.map((act) => {
            if (act.actionId !== actionId) return act;
            const updatedStatus = payload.status || act.status;
            return {
              ...act,
              title: payload.title !== undefined ? payload.title : act.title,
              leader: payload.leader !== undefined ? payload.leader : act.leader,
              dueDate: payload.dueDate !== undefined ? payload.dueDate : act.dueDate,
              startDate: payload.startDate !== undefined ? payload.startDate : act.startDate,
              status: updatedStatus,
              statusArabic: statusMap[updatedStatus] || act.statusArabic,
              completionPercentage:
                payload.completionPercentage !== undefined
                  ? payload.completionPercentage
                  : updatedStatus === 'Done'
                  ? 100
                  : act.completionPercentage,
              progressDescription:
                payload.progressDescription !== undefined ? payload.progressDescription : act.progressDescription,
            };
          }),
        };
      });

      try {
        await evaluatorApi.updateImprovementAction(actionId, payload);
      } catch (err) {
        console.error(`Failed to update action ${actionId}:`, err);
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  // إنشاء خطة تحسين جديدة وربطها بالمجالات
  const createPlan = useCallback(
    async (payload: {
      title: string;
      planType?: PlanType;
      startDate?: string;
      endDate?: string;
      areaIds?: number[];
    }) => {
      setIsSubmitting(true);
      try {
        const res = await evaluatorApi.createImprovementPlan(payload);
        if (payload.planType) {
          setSelectedPlanType(payload.planType);
        }
        await fetchPlan();
        return res;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchPlan]
  );

  // تسجيل ملاحظة مراجعة داخلية على الخطة
  const addReviewNote = useCallback(
    async (planId: number, text: string) => {
      setIsSubmitting(true);
      try {
        const res = await evaluatorApi.createPlanReviewNote(planId, text);
        await fetchPlan();
        return res;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchPlan]
  );

  return {
    selectedPlanType,
    setSelectedPlanType,
    selectedPlanId,
    selectPlan,
    plansList,
    isLoadingPlansList,
    refreshPlansList: fetchPlansList,
    cloneVersion,
    planData,
    summary: dynamicSummary,
    isLoading,
    isSubmitting,
    editingAction,
    setEditingAction,
    addAction,
    updateAction,
    createPlan,
    addReviewNote,
    refreshPlan: fetchPlan,
  };
}
