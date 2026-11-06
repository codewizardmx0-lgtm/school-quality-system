import { useState, useEffect, useCallback } from 'react';
import { evaluatorApi } from '../api/evaluatorApi';
import type { PreflightCheckData, FinalSubmissionResponse } from '../api/evaluationTypes';

export function useFinalSubmission() {
  const [preflightData, setPreflightData] = useState<PreflightCheckData | null>(null);
  const [submissionResult, setSubmissionResult] = useState<FinalSubmissionResponse | null>(null);
  const [isLoadingCheck, setIsLoadingCheck] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  const fetchPreflight = useCallback(async () => {
    setIsLoadingCheck(true);
    try {
      const data = await evaluatorApi.getPreflightCheck();
      setPreflightData(data);
    } catch (err) {
      console.error('Failed to load preflight check:', err);
    } finally {
      setIsLoadingCheck(false);
    }
  }, []);

  useEffect(() => {
    fetchPreflight();
  }, [fetchPreflight]);

  const submitFinalLock = useCallback(
    async (password: string, notes?: string): Promise<FinalSubmissionResponse> => {
      setIsSubmitting(true);
      setSubmissionError(null);

      try {
        const result = await evaluatorApi.submitFinalEvaluation(password, notes);
        setSubmissionResult(result);
        setIsLocked(true);
        return result;
      } catch (err: unknown) {
        const msg = (err as Error)?.message || 'فشل في التحقق الأمني من الختم الرقمي أو كلمة المرور.';
        setSubmissionError(msg);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return {
    preflightData,
    submissionResult,
    isLoadingCheck,
    isSubmitting,
    submissionError,
    isLocked,
    setIsLocked,
    submitFinalLock,
    refreshPreflight: fetchPreflight,
  };
}
