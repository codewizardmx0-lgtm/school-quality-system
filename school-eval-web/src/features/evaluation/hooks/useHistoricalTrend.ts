import { useState, useEffect, useCallback } from 'react';
import { evaluatorApi } from '../api/evaluatorApi';
import { extractApiErrorMessage } from '../../../api/apiTypes';
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
    } catch (err: unknown) {
      console.error('Failed to load historical trend:', err);
      setError(extractApiErrorMessage(err, 'تعذر تحميل بيانات مقارنة الأداء التاريخي.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => fetchTrend());
  }, [fetchTrend]);

  return {
    trendData,
    isLoading,
    error,
    refreshTrend: fetchTrend,
  };
}
