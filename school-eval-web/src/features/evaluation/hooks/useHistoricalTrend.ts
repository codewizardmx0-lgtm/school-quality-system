import { useState, useEffect, useCallback } from 'react';
import { evaluatorApi } from '../api/evaluatorApi';
import type { HistoricalTrendData } from '../api/evaluationTypes';

export function useHistoricalTrend() {
  const [trendData, setTrendData] = useState<HistoricalTrendData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrend = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await evaluatorApi.getHistoricalTrend();
      setTrendData(data);
    } catch (err: any) {
      console.error('Failed to load historical trend:', err);
      setError(err.message || 'تعذر تحميل بيانات مقارنة الأداء التاريخي.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrend();
  }, [fetchTrend]);

  return {
    trendData,
    isLoading,
    error,
    refreshTrend: fetchTrend,
  };
}
