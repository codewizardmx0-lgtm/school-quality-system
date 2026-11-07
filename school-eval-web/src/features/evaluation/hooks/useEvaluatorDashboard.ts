import { useState, useEffect, useCallback } from 'react';
import { evaluatorApi } from '../api/evaluatorApi';
import type { EvaluatorDashboardData } from '../api/evaluationTypes';

export function useEvaluatorDashboard() {
  const [data, setData] = useState<EvaluatorDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await evaluatorApi.getDashboardStats();
      setData(result);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'فشل في تحميل مؤشرات لوحة التحكم';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    dashboardData: data,
    isLoading,
    error,
    refreshDashboard: fetchDashboard,
  };
}
