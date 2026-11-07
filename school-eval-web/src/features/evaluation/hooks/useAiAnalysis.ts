import { useState, useEffect, useCallback } from 'react';
import { evaluatorApi } from '../api/evaluatorApi';
import type {
  AiAnalysisData,
  AiRecommendationsResponse,
  AiInitiative,
  AiRecommendationStatus,
} from '../api/evaluationTypes';

export function useAiAnalysis() {
  const [analysisData, setAnalysisData] = useState<AiAnalysisData | null>(null);
  const [recommendations, setRecommendations] = useState<AiRecommendationsResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isLoadingRecs, setIsLoadingRecs] = useState<boolean>(false);
  const [selectedInitiativeForTransfer, setSelectedInitiativeForTransfer] = useState<AiInitiative | null>(null);
  const [transferSuccessNotice, setTransferSuccessNotice] = useState<string | null>(null);

  // بدء تشغيل التحليل الآلي
  const runAiAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const result = await evaluatorApi.triggerAiAnalysis();
      setAnalysisData(result);
      // جلب التوصيات فوراً
      const recs = await evaluatorApi.getAiRecommendations(result.analysisId);
      setRecommendations(recs);
    } catch (err) {
      console.error('Failed to run AI analysis:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // جلب التوصيات المبدئية عند التحميل
  const loadInitialRecommendations = useCallback(async () => {
    setIsLoadingRecs(true);
    try {
      const recs = await evaluatorApi.getAiRecommendations(1);
      setRecommendations(recs);
      // Analysis data will be fetched or initiated by user trigger
    } catch (err) {
      console.error('Failed to load AI recommendations:', err);
    } finally {
      setIsLoadingRecs(false);
    }
  }, []);

  useEffect(() => {
    loadInitialRecommendations();
  }, [loadInitialRecommendations]);

  // تحديث حالة توصية معينة (قبول / تعديل / تجاهل)
  const updateRecommendationStatus = useCallback(
    async (id: number, status: AiRecommendationStatus, modifications?: string) => {
      setRecommendations((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          initiatives: prev.initiatives.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status,
                  humanModifications: modifications !== undefined ? modifications : item.humanModifications,
                }
              : item
          ),
        };
      });

      try {
        await evaluatorApi.updateAiRecommendationStatus(id, status, modifications);
      } catch (err) {
        console.error(`Failed to update recommendation ${id}:`, err);
      }
    },
    []
  );

  // نقل التوصية إلى مسودة الخطة المدرسية
  const transferInitiativeToPlan = useCallback(
    async (initiative: AiInitiative, leader: string, dueDate: string, progressDescription?: string) => {
      try {
        await evaluatorApi.createImprovementAction({
          title: initiative.title,
          leader,
          startDate: new Date().toISOString().split('T')[0],
          dueDate,
          status: 'InProgress',
          progressDescription: progressDescription || 'تم نقل المبادرة وتضمينها من مقترحات التحليل الذكي.',
          completionPercentage: 10,
          recommendationId: initiative.id,
        });

        // تحديث حالة المبادرة إلى Accepted
        setRecommendations((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            initiatives: prev.initiatives.map((item) =>
              item.id === initiative.id ? { ...item, status: 'Accepted' } : item
            ),
          };
        });

        setTransferSuccessNotice(`تم نقل مبادرة "${initiative.title}" بنجاح إلى خطة التحسين المدرسي.`);
        setTimeout(() => setTransferSuccessNotice(null), 4000);
      } catch (err) {
        console.error('Failed to transfer initiative to plan:', err);
      }
    },
    []
  );

  return {
    analysisData,
    recommendations,
    isAnalyzing,
    isLoadingRecs,
    selectedInitiativeForTransfer,
    setSelectedInitiativeForTransfer,
    transferSuccessNotice,
    runAiAnalysis,
    updateRecommendationStatus,
    transferInitiativeToPlan,
  };
}
