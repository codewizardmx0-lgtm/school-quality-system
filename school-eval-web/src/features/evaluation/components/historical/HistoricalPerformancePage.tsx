/**
 * Component: HistoricalPerformancePage
 * شاشة مقارنة الأداء التاريخي ومسار التطور لأداء المدرسة (FR-SCH-25, IR-01..IR-03)
 * بعرض كامل 100% Full-Width ومصفوفة المؤشرات الـ 109 عبر المعايير الوطنية السبعة
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { supervisionApi } from '../../../supervision/api/supervisionApi';
import { exportHistoricalComparisonToExcel } from '../../../supervision/utils/supervisionExportUtils';
import { HistoricalMatrixTable } from '../../../supervision/components/reports/HistoricalMatrixTable';
import type { HistoricalComparisonData } from '../../../supervision/api/supervisionTypes';
import type { EvaluatorScreen } from '../../api/evaluationTypes';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface HistoricalPerformancePageProps {
  onNavigate?: (screen: EvaluatorScreen, param?: number) => void;
}

export const HistoricalPerformancePage: React.FC<HistoricalPerformancePageProps> = ({
  onNavigate,
}) => {
  const { user } = useAuth();
  const schoolId = user?.schoolId || user?.school?.schoolId || 1;

  // State
  const [data, setData] = useState<HistoricalComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Cycle selection
  const [selectedBaseCycle, setSelectedBaseCycle] = useState<string>('');
  const [selectedCompareCycle, setSelectedCompareCycle] = useState<string>('');
  const [sameCycleWarning, setSameCycleWarning] = useState<string | null>(null);

  // Export states
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Fetch comparison data
  const fetchComparison = useCallback(async (baseCycle?: string, compareCycle?: string) => {
    setIsLoading(true);
    setError(null);
    setSameCycleWarning(null);

    // Validation: prevent comparing cycle to itself
    if (baseCycle && compareCycle && baseCycle === compareCycle) {
      setSameCycleWarning('لا يمكن إجراء مقارنة تاريخية بين نفس الدورة التقييمية؛ يرجى اختيار دورتين مختلفتين.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await supervisionApi.getHistoricalComparison(schoolId, baseCycle, compareCycle);
      setData(res);

      // Set initial selected cycles from response if not set
      if (!baseCycle && res.baseCycle?.academicYear) {
        setSelectedBaseCycle(res.baseCycle.academicYear);
      }
      if (!compareCycle && res.comparedCycle?.academicYear) {
        setSelectedCompareCycle(res.comparedCycle.academicYear);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل بيانات المقارنة التاريخية للمدرسة.');
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchComparison());
  }, [fetchComparison]);

  // Handle cycle change
  const handleBaseCycleChange = (newBase: string) => {
    setSelectedBaseCycle(newBase);
    if (newBase && selectedCompareCycle && newBase === selectedCompareCycle) {
      setSameCycleWarning('لا يمكن إجراء مقارنة تاريخية بين نفس الدورة التقييمية؛ يرجى اختيار دورتين مختلفتين.');
      return;
    }
    setSameCycleWarning(null);
    fetchComparison(newBase, selectedCompareCycle);
  };

  const handleCompareCycleChange = (newCompare: string) => {
    setSelectedCompareCycle(newCompare);
    if (selectedBaseCycle && newCompare && selectedBaseCycle === newCompare) {
      setSameCycleWarning('لا يمكن إجراء مقارنة تاريخية بين نفس الدورة التقييمية؛ يرجى اختيار دورتين مختلفتين.');
      return;
    }
    setSameCycleWarning(null);
    fetchComparison(selectedBaseCycle, newCompare);
  };

  // Available cycles for dropdowns
  const availableCyclesList = useMemo(() => {
    if (!data?.availableCycles || data.availableCycles.length === 0) {
      return [
        { academicYear: data?.baseCycle?.academicYear || '2026/2027', name: data?.baseCycle?.name || 'الدورة التقييمية 2026/2027' },
        { academicYear: data?.comparedCycle?.academicYear || '2025/2026', name: data?.comparedCycle?.name || 'الدورة التقييمية 2025/2026' },
      ];
    }
    return data.availableCycles;
  }, [data]);

  // Handle Excel Export
  const handleExportExcel = () => {
    if (!data) return;
    setIsExportingExcel(true);
    try {
      exportHistoricalComparisonToExcel(
        data.school.schoolName || user?.school?.schoolName || 'المدرسة',
        data.baseCycle.academicYear || selectedBaseCycle,
        data.comparedCycle.academicYear || selectedCompareCycle,
        data.standardsDeltas || [],
        data.allIndicatorsDeltas || []
      );
      setExportSuccessMessage('تم تصدير مصفوفة المقارنة التراكمية (Excel) بنجاح.');
      setTimeout(() => setExportSuccessMessage(null), 3500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تصدير ملف Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Handle PDF Export
  const handleExportPdf = async () => {
    if (!data) return;
    setIsExportingPdf(true);
    try {
      await supervisionApi.exportHistoricalComparisonPdf(
        schoolId,
        selectedBaseCycle || data.baseCycle.academicYear,
        selectedCompareCycle || data.comparedCycle.academicYear,
        data.school.schoolName || user?.school?.schoolName
      );
      setExportSuccessMessage('تم تحميل تقرير المقارنة التاريخية الرسمي (PDF) بنجاح.');
      setTimeout(() => setExportSuccessMessage(null), 3500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل تقرير PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Shimmer loading skeleton
  if (isLoading && !data) {
    return (
      <div style={{ padding: '24px 32px', width: '100%', maxWidth: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ height: '110px', borderRadius: '16px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
        <div style={{ height: '70px', borderRadius: '12px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
        <div style={{ height: '120px', borderRadius: '14px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
        <div style={{ height: '400px', borderRadius: '14px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div style={{ padding: '24px 32px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <div style={{ padding: '48px 24px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', maxWidth: '750px', margin: '40px auto' }}>
          <AlertTriangle size={48} color="#D97706" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>تعذر تحميل بيانات المقارنة التاريخية</h3>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '8px auto 20px', maxWidth: '450px' }}>
            {error}
          </p>
          <button
            onClick={() => fetchComparison()}
            style={{
              padding: '10px 22px',
              borderRadius: '8px',
              backgroundColor: '#0F766E',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const isFoundational = data?.isSingleCycleOnly || !data?.hasPreviousCycle;
  const trajectory = data?.trajectory;
  const netDelta = trajectory?.netDelta ?? 0;
  const isPositiveGrowth = netDelta > 0;
  const isZeroGrowth = netDelta === 0;

  return (
    <div
      style={{
        padding: '24px 32px',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '22px',
      }}
    >
      {/* 1. Header Banner (100% Full-Width) */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
          borderRadius: '16px',
          padding: '26px 32px',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            <BarChart3 size={28} color="#38BDF8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>
                مقارنة الأداء التاريخي ومسار التطور
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(56, 189, 248, 0.2)',
                  color: '#38BDF8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                مصفوفة الهيكل الوطني (109 مؤشرات)
              </span>
            </div>
            <p style={{ fontSize: '13.5px', color: '#94A3B8', margin: '6px 0 0 0', lineHeight: 1.5 }}>
              المدرسة: <strong style={{ color: '#F1F5F9' }}>{data?.school.schoolName || user?.school?.schoolName || 'مدرستنا'}</strong>
              {data?.baseCycle && data?.comparedCycle && !isFoundational && (
                <span> • الدورة الحالية: <strong style={{ color: '#E2E8F0' }}>{data.baseCycle.academicYear}</strong> مقابل الدورة السابقة: <strong style={{ color: '#E2E8F0' }}>{data.comparedCycle.academicYear}</strong></span>
              )}
            </p>
          </div>
        </div>

        {/* Dual Export Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel || !data || isFoundational}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: isExportingExcel || isFoundational ? 'not-allowed' : 'pointer',
              opacity: isFoundational ? 0.5 : 1,
              transition: 'background-color 0.15s ease',
            }}
            title="تصدير مصفوفة المعايير السبعة والمؤشرات الـ 109 بصيغة Excel"
          >
            <FileSpreadsheet size={15} />
            <span>{isExportingExcel ? 'جاري التصدير...' : 'تصدير المصفوفة (Excel)'}</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf || !data || isFoundational}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: '8px',
              backgroundColor: '#0284C7',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: isExportingPdf || isFoundational ? 'not-allowed' : 'pointer',
              opacity: isFoundational ? 0.5 : 1,
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
              transition: 'background-color 0.15s ease',
            }}
            title="تصدير تقرير المقارنة التاريخية الرسمي بصيغة PDF"
          >
            <FileText size={15} />
            <span>{isExportingPdf ? 'جاري التحميل...' : 'تقرير المقارنة (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Export Success Notification */}
      {exportSuccessMessage && (
        <div
          style={{
            backgroundColor: '#DCFCE7',
            border: '1px solid #BBF7D0',
            color: '#15803D',
            padding: '12px 18px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{exportSuccessMessage}</span>
        </div>
      )}

      {/* 2. Top Filter Strip: Dual Cycle Selectors (IR-01..IR-03) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          padding: '16px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {/* Base Cycle Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="#0284C7" />
              <span>الدورة الأساس (الحالية):</span>
            </label>
            <select
              value={selectedBaseCycle}
              onChange={(e) => handleBaseCycleChange(e.target.value)}
              disabled={isLoading || isFoundational}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: isFoundational ? '#F8FAFC' : '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#0F172A',
                outline: 'none',
                cursor: isFoundational ? 'not-allowed' : 'pointer',
              }}
            >
              {availableCyclesList.map((c, idx) => (
                <option key={`base-${c.academicYear || idx}`} value={c.academicYear}>
                  {c.name || `الدورة التقييمية (${c.academicYear})`}
                </option>
              ))}
            </select>
          </div>

          <span style={{ color: '#94A3B8', fontWeight: 700, fontSize: '13px' }}>مقابل</span>

          {/* Compared Cycle Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="#64748B" />
              <span>دورة المقارنة (السابقة):</span>
            </label>
            <select
              value={selectedCompareCycle}
              onChange={(e) => handleCompareCycleChange(e.target.value)}
              disabled={isLoading || isFoundational}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: isFoundational ? '#F8FAFC' : '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#0F172A',
                outline: 'none',
                cursor: isFoundational ? 'not-allowed' : 'pointer',
              }}
            >
              {availableCyclesList.map((c, idx) => (
                <option key={`compare-${c.academicYear || idx}`} value={c.academicYear}>
                  {c.name || `الدورة التقييمية (${c.academicYear})`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => fetchComparison(selectedBaseCycle, selectedCompareCycle)}
          disabled={isLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#475569',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
          title="تحديث بيانات المقارنة"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>تحديث المقارنة</span>
        </button>
      </div>

      {/* Validation Warning: Comparing Cycle to Itself */}
      {sameCycleWarning && (
        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#92400E',
          }}
        >
          <AlertCircle size={20} color="#D97706" />
          <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
            <strong>تنبيه التحقق المعياري:</strong> {sameCycleWarning}
          </div>
        </div>
      )}

      {/* Foundational First-Year Notice */}
      {isFoundational ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '48px 30px',
            textAlign: 'center',
            maxWidth: '800px',
            margin: '20px auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={32} color="#2563EB" />
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            التقييم التأسيسي الأول للمدرسة (دورة الأساس)
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748B', maxWidth: '540px', lineHeight: 1.6, margin: 0 }}>
            {data?.notice || 'يعد هذا التقييم دورة الأساس المرجعية (Baseline Cycle) للمدرسة في منصة ارتقاء. ستتاح المقارنات التاريخية التراكمية تلقائياً فور اكتمال الدورة الحالية وبدء الدورة التقييمية التالية.'}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            <button
              onClick={() => onNavigate?.('dashboard')}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              العودة للوحة التحكم
            </button>
            <button
              onClick={() => onNavigate?.('reports')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: '#F1F5F9',
                color: '#334155',
                fontWeight: 700,
                fontSize: '13px',
                border: '1px solid #CBD5E1',
                cursor: 'pointer',
              }}
            >
              مركز التقارير والوثائق
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 3. Comparative KPI Cards (Trajectory & Indicators Growth) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Card 1: Score Delta */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                  النتيجة الموزونة الشاملة
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '12px',
                    backgroundColor: isPositiveGrowth ? '#DCFCE7' : isZeroGrowth ? '#F1F5F9' : '#FEE2E2',
                    color: isPositiveGrowth ? '#15803D' : isZeroGrowth ? '#475569' : '#B91C1C',
                  }}
                >
                  {isPositiveGrowth ? <ArrowUpRight size={13} /> : isZeroGrowth ? <Minus size={13} /> : <ArrowDownRight size={13} />}
                  <span>{isPositiveGrowth ? `+${netDelta.toFixed(2)}%` : `${netDelta.toFixed(2)}%`}</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A' }}>
                  {trajectory?.currentTotalScore?.toFixed(2) ?? '0.00'}%
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                  السابقة: {trajectory?.previousTotalScore?.toFixed(2) ?? '0.00'}%
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                {trajectory?.growthPillText || 'مسار الأداء التراكمي'}
              </div>
            </div>

            {/* Card 2: Improved Indicators */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>مؤشرات تحسنت</span>
                <TrendingUp size={18} color="#10B981" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#10B981' }}>
                {trajectory?.improvedCount ?? 0}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                مؤشرات ارتفع تقديرها في الدورة الحالية
              </div>
            </div>

            {/* Card 3: Maintained Indicators */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>مؤشرات مستقرة</span>
                <Minus size={18} color="#0284C7" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#0284C7' }}>
                {trajectory?.maintainedCount ?? 0}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                حافظت على نفس المستوى المعياري
              </div>
            </div>

            {/* Card 4: Regressed Indicators */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>مؤشرات تراجعت</span>
                <TrendingDown size={18} color="#EF4444" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: (trajectory?.regressedCount ?? 0) > 0 ? '#DC2626' : '#10B981' }}>
                {trajectory?.regressedCount ?? 0}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                تحتاج لتضمينها في خطة التحسين المدرسية
              </div>
            </div>

            {/* Card 5: Newly Evaluated */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>مؤشرات جديدة</span>
                <Layers size={18} color="#8B5CF6" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#8B5CF6' }}>
                {trajectory?.newlyEvaluatedCount ?? 0}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                رُصدت لأول مرة في هذه الدورة
              </div>
            </div>
          </div>

          {/* 4. The 109 Indicators Matrix across 7 Standards (HistoricalMatrixTable) */}
          <div style={{ width: '100%', maxWidth: '100%' }}>
            <HistoricalMatrixTable
              standardsDeltas={data.standardsDeltas || []}
              allIndicatorsDeltas={data.allIndicatorsDeltas || []}
              baseCycleYear={data.baseCycle?.academicYear || selectedBaseCycle}
              comparedCycleYear={data.comparedCycle?.academicYear || selectedCompareCycle}
              previousTotal={trajectory?.previousTotalScore ?? 0}
              currentTotal={trajectory?.currentTotalScore ?? 0}
              netDelta={netDelta}
              isSameCycle={Boolean(selectedBaseCycle && selectedCompareCycle && selectedBaseCycle === selectedCompareCycle)}
            />
          </div>
        </>
      )}
    </div>
  );
};
