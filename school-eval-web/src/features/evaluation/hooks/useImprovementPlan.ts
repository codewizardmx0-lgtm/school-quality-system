import { useState, useEffect, useCallback, useMemo } from 'react';
import { evaluatorApi } from '../api/evaluatorApi';
import type {
  ImprovementPlanData,
  ImprovementPlanAction,
  CreateImprovementActionPayload,
  UpdateImprovementActionPayload,
  ActionStatus,
} from '../api/evaluationTypes';

export function useImprovementPlan() {
  const [planData, setPlanData] = useState<ImprovementPlanData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingAction, setEditingAction] = useState<ImprovementPlanAction | null>(null);

  const fetchPlan = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await evaluatorApi.getCurrentImprovementPlan();
      setPlanData(data);
    } catch (err) {
      console.error('Failed to load improvement plan:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

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

  // إضافة إجراء تنفيذي جديد
  const addAction = useCallback(
    async (payload: CreateImprovementActionPayload) => {
      setIsSubmitting(true);
      const newAction: ImprovementPlanAction = {
        actionId: Math.floor(Math.random() * 9000) + 1000,
        planId: planData?.planId || 1,
        title: payload.title,
        standardName: 'معيار التحسين المستمر والجودة',
        leader: payload.leader || 'فريق التطوير المدرسي',
        startDate: payload.startDate || new Date().toISOString().split('T')[0],
        dueDate: payload.dueDate || '2027-01-31',
        status: payload.status || 'InProgress',
        statusArabic: payload.status === 'Done' ? 'مكتمل' : 'قيد التنفيذ',
        completionPercentage: payload.completionPercentage ?? 10,
        progressDescription: payload.progressDescription || 'تم اعتماد وإدراج الإجراء في خطة التحسين وبدء التنفيذ.',
      };

      // تحديث تفاؤلي فوري
      setPlanData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          actions: [newAction, ...prev.actions],
        };
      });

      try {
        await evaluatorApi.createImprovementAction(payload);
      } catch (err) {
        console.error('Failed to create action on server:', err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [planData?.planId]
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

  return {
    planData,
    summary: dynamicSummary,
    isLoading,
    isSubmitting,
    editingAction,
    setEditingAction,
    addAction,
    updateAction,
    refreshPlan: fetchPlan,
  };
}
