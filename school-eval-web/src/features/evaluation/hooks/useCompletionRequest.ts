import { useState, useEffect, useCallback } from 'react';
import { evaluatorApi } from '../api/evaluatorApi';
import type { CompletionRequestData } from '../api/evaluationTypes';

export function useCompletionRequest() {
  const [completionData, setCompletionData] = useState<CompletionRequestData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [isResubmitting, setIsResubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchCompletionRequest = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await evaluatorApi.getCurrentCompletionRequest();
      setCompletionData(data);
    } catch (err) {
      console.error('Failed to load completion request:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompletionRequest();
  }, [fetchCompletionRequest]);

  // التحقق مما إذا كان مؤشر معين مفتوحاً للتعديل الجزئي
  const isIndicatorUnlockedForCompletion = useCallback(
    (indicatorId: number): boolean => {
      if (!completionData || completionData.status !== 'Open') return false;
      return completionData.flaggedItems.some(
        (item) => item.indicatorId === indicatorId && item.status === 'Pending'
      );
    },
    [completionData]
  );

  // حل بند استكمال محدد
  const resolveItem = useCallback(
    async (itemId: number, resolutionNotes: string, evidenceVersionId?: number) => {
      setIsResolving(true);
      // تحديث تفاؤلي
      setCompletionData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          flaggedItems: prev.flaggedItems.map((item) =>
            item.itemId === itemId
              ? {
                  ...item,
                  status: 'Resolved',
                  resolutionNotes,
                }
              : item
          ),
        };
      });

      try {
        await evaluatorApi.resolveCompletionItem(itemId, resolutionNotes, evidenceVersionId);
        setSuccessMessage('تم تسجيل المعالجة بنجاح');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        console.error(`Failed to resolve item ${itemId}:`, err);
      } finally {
        setIsResolving(false);
      }
    },
    []
  );

  // إعادة الرفع النهائي للمشرف بعد حل كافة البنود
  const resubmitToMinistry = useCallback(
    async (schoolNotes?: string) => {
      if (!completionData) return;
      setIsResubmitting(true);

      try {
        await evaluatorApi.resubmitCompletionRequest(completionData.requestId, schoolNotes);
        setCompletionData((prev) => (prev ? { ...prev, status: 'Resolved' } : null));
        setSuccessMessage('تمت إعادة الرفع النهائي بنجاح وتم إغلاق طلب الاستكمال.');
      } catch (err) {
        console.error('Failed to resubmit completion request:', err);
      } finally {
        setIsResubmitting(false);
      }
    },
    [completionData]
  );

  return {
    completionData,
    isLoading,
    isResolving,
    isResubmitting,
    successMessage,
    isIndicatorUnlockedForCompletion,
    resolveItem,
    resubmitToMinistry,
    refreshCompletion: fetchCompletionRequest,
  };
}
