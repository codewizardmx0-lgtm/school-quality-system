/**
 * useCentralReports.ts
 * خطاف إدارة التحليلات المركزية ومؤشرات الجودة الوطنية والمقارنة التاريخية
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supervisionApi } from '../api/supervisionApi';
import type { CentralReportsData, HistoricalComparisonData } from '../api/supervisionTypes';
import {
  exportCentralStandardsMatrixToExcel,
  exportHistoricalComparisonToExcel,
} from '../utils/supervisionExportUtils';

export function useCentralReports(schoolId: number = 104) {
  // 1. بيانات التحليلات المركزية (Screen 6)
  const [analyticsData, setAnalyticsData] = useState<CentralReportsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // فلاتر التحليلات
  const [selectedBenchmarkFilter, setSelectedBenchmarkFilter] = useState<string>('all');
  const [selectedStageIndex, setSelectedStageIndex] = useState<number | null>(null);

  // 2. بيانات المقارنة التاريخية التراكمية (Screen 7)
  const [historicalData, setHistoricalData] = useState<HistoricalComparisonData | null>(null);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState<boolean>(false);
  const [historicalError, setHistoricalError] = useState<string | null>(null);

  const [baseCycle, setBaseCycle] = useState<string>('2026/2027');
  const [compareCycle, setCompareCycle] = useState<string>('2025/2026');

  // جلب التحليلات المركزية
  const fetchAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    setAnalyticsError(null);
    try {
      const result = await supervisionApi.getCentralAnalytics();
      setAnalyticsData(result);
    } catch (err: any) {
      setAnalyticsError(err?.message || 'تعذر استرجاع مؤشرات التحليل المركزي.');
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  // جلب المقارنة التاريخية لمدرسة
  const fetchHistorical = useCallback(async () => {
    setIsLoadingHistorical(true);
    setHistoricalError(null);
    try {
      const result = await supervisionApi.getHistoricalComparison(schoolId, baseCycle, compareCycle);
      setHistoricalData(result);
    } catch (err: any) {
      setHistoricalError(err?.message || 'تعذر استرجاع المقارنة التاريخية للمدرسة.');
    } finally {
      setIsLoadingHistorical(false);
    }
  }, [schoolId, baseCycle, compareCycle]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    fetchHistorical();
  }, [fetchHistorical]);

  // تصفية المعايير بحسب المستوى
  const filteredStandardsMeans = useMemo(() => {
    if (!analyticsData?.standardsMeans) return [];
    if (selectedBenchmarkFilter === 'all') return analyticsData.standardsMeans;
    return analyticsData.standardsMeans.filter(
      (item) => item.status === selectedBenchmarkFilter
    );
  }, [analyticsData?.standardsMeans, selectedBenchmarkFilter]);

  // تصدير التحليلات المركزية إلى Excel
  const handleExportAnalyticsExcel = () => {
    if (analyticsData?.standardsMeans) {
      exportCentralStandardsMatrixToExcel(analyticsData.standardsMeans);
    }
  };

  // تصدير التحليلات المركزية إلى PDF
  const handleExportAnalyticsPdf = async () => {
    try {
      await supervisionApi.exportAnalyticsPdf();
    } catch (err) {
      console.error(err);
    }
  };

  // تصدير المقارنة التاريخية إلى Excel
  const handleExportHistoricalExcel = () => {
    if (historicalData) {
      exportHistoricalComparisonToExcel(
        historicalData.school.schoolName,
        historicalData.baseCycle.academicYear,
        historicalData.comparedCycle.academicYear,
        historicalData.standardsDeltas
      );
    }
  };

  // تصدير المقارنة التاريخية إلى PDF
  const handleExportHistoricalPdf = async () => {
    try {
      await supervisionApi.exportHistoricalComparisonPdf(schoolId);
    } catch (err) {
      console.error(err);
    }
  };

  return {
    // Analytics
    analyticsData,
    standardsMeans: filteredStandardsMeans,
    isLoadingAnalytics,
    analyticsError,
    refetchAnalytics: fetchAnalytics,
    selectedBenchmarkFilter,
    setSelectedBenchmarkFilter,
    selectedStageIndex,
    setSelectedStageIndex,
    handleExportAnalyticsExcel,
    handleExportAnalyticsPdf,

    // Historical
    historicalData,
    isLoadingHistorical,
    historicalError,
    refetchHistorical: fetchHistorical,
    baseCycle,
    setBaseCycle,
    compareCycle,
    setCompareCycle,
    handleExportHistoricalExcel,
    handleExportHistoricalPdf,
  };
}
