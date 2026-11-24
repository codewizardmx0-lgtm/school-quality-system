/**
 * Component: HistoricalComparisonPage
 * الشاشة 7: المقارنة التاريخية التراكمية عبر الدورات ومسار النمو المدرسي
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 * مطابقة تامة لـ UC-SUP-07 و FR-SUP-18 و BR-GEN-05 و BR-MIN-03
 * تخطيط بعرض كامل 100% Full-Width مع مصفوفة المؤشرات الـ 109
 */

import React, { useEffect } from 'react';
import {
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowUp,
  ArrowDown,
  Minus,
  FileCheck2,
  ClipboardList,
} from 'lucide-react';
import { useCentralReports } from '../../hooks/useCentralReports';
import { HistoricalMatrixTable } from './HistoricalMatrixTable';
import { EmptySupervisionState } from '../common/EmptySupervisionState';
import type { SupervisionScreenKey } from '../../api/supervisionTypes';

interface HistoricalComparisonPageProps {
  schoolId?: number;
  onNavigate: (screen: SupervisionScreenKey, params?: { submissionId?: number; schoolId?: number }) => void;
}

export const HistoricalComparisonPage: React.FC<HistoricalComparisonPageProps> = ({
  schoolId,
  onNavigate,
}) => {
  const {
    historicalData,
    availableCycles,
    historicalError,
    refetchHistorical,
    baseCycle,
    setBaseCycle,
    compareCycle,
    setCompareCycle,
    handleExportHistoricalExcel,
    handleExportHistoricalPdf,
  } = useCentralReports(schoolId);

  // استخراج الدورات المتاحة للمدرسة
  const cyclesList = historicalData?.availableCycles && historicalData.availableCycles.length > 0
    ? historicalData.availableCycles
    : availableCycles;

  const isSingleCycle = historicalData?.alternateFlow || historicalData?.isSingleCycleOnly;

  // التحقق المنطقي من تطابق الدورتين
  const isSameCycle = Boolean(baseCycle && compareCycle && baseCycle === compareCycle);

  // ضبط الاختيار الافتراضي لقائمة «مقارنة بـ» ليكون دائماً الدورة السابقة الأحدث وليس نفس الدورة الحالية
  useEffect(() => {
    if (cyclesList && cyclesList.length > 1) {
      if (!compareCycle || compareCycle === baseCycle) {
        const priorCycle = cyclesList.find((c: any) => {
          const y = c.academicYear || c.academic_year || c.name;
          return y && y !== baseCycle;
        });
        if (priorCycle) {
          const priorYear = priorCycle.academicYear || priorCycle.academic_year || priorCycle.name;
          setCompareCycle(priorYear);
        }
      }
    }
  }, [cyclesList, baseCycle, compareCycle, setCompareCycle]);

  // معالجة تغيير الدورة الحالية مع ضبط الدورة المقارنة تلقائياً على الدورة السابقة الأحدث
  const handleBaseCycleChange = (newBase: string) => {
    setBaseCycle(newBase);
    if (compareCycle === newBase) {
      const remaining = cyclesList.filter((c: any) => {
        const y = c.academicYear || c.academic_year || c.name;
        return y && y !== newBase;
      });
      if (remaining.length > 0) {
        const fallback = remaining[0].academicYear || remaining[0].academic_year || remaining[0].name;
        setCompareCycle(fallback);
      }
    }
  };

  return (
    <div style={{ padding: '24px 32px', width: '100%', maxWidth: '1600px', margin: '0 auto', boxSizing: 'border-box' }}>
      {/* 1. الترويسة الرئيسية وسياق المقارنة */}
      <div style={{ marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => onNavigate('reports')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748B',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '10px',
          }}
        >
          <ArrowRight size={16} />
          <span>العودة إلى التقارير والتحليلات المركزية</span>
        </button>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '16px 24px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#2563EB',
                  backgroundColor: '#EFF6FF',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                }}
              >
                {historicalData?.school?.schoolCode ?? (schoolId ? `SCH-${schoolId}` : '---')}
              </span>

              {/* شارة مسار النمو المعتمدة */}
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: isSameCycle
                    ? '#475569'
                    : ((historicalData?.trajectory?.netDelta ?? 0) >= 0 ? '#047857' : '#B91C1C'),
                  backgroundColor: isSameCycle
                    ? '#F1F5F9'
                    : ((historicalData?.trajectory?.netDelta ?? 0) >= 0 ? '#ECFDF5' : '#FEF2F2'),
                  border: '1px solid ' + (isSameCycle
                    ? '#CBD5E1'
                    : ((historicalData?.trajectory?.netDelta ?? 0) >= 0 ? '#A7F3D0' : '#FECACA')),
                  padding: '3px 12px',
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {isSameCycle ? (
                  <Minus size={14} color="#64748B" />
                ) : (
                  <TrendingUp size={14} color={(historicalData?.trajectory?.netDelta ?? 0) >= 0 ? '#059669' : '#DC2626'} />
                )}
                <span>
                  {isSameCycle
                    ? 'أداء متطابق 0%'
                    : (historicalData?.trajectory?.growthPillText ?? 'مسار النمو المدرسي')}
                </span>
              </span>

              {/* شارة إصدار المعايير */}
              {historicalData?.baseCycle?.versionNo && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#64748B',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  إصدار المعايير: v{historicalData.baseCycle.versionNo}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              المقارنة التاريخية التراكمية — {historicalData?.school?.schoolName ?? 'بيانات المدرسة'}
            </h1>
            <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', margin: 0 }}>
              تتبع مسار التطور النوعي في درجات المعايير الوطنية السبعة والـ 109 مؤشرات بين الدورات التقييمية (FR-SUP-18)
            </p>
          </div>

          {/* محددات الدورات وأزرار التصدير */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* اختيار الدورة الحالية */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#475569', fontWeight: 700 }}>الدورة الحالية:</span>
              <select
                value={baseCycle}
                onChange={(e) => handleBaseCycleChange(e.target.value)}
                style={{
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#0F172A',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                }}
              >
                {cyclesList && cyclesList.length > 0 ? (
                  cyclesList.map((c: any, i: number) => {
                    const year = c.academicYear || c.academic_year;
                    const name = c.name || `دورة ${year}`;
                    const val = year || name;
                    return (
                      <option key={c.cycleId || c.id || i} value={val}>
                        {name} {year ? `(${year})` : ''}
                      </option>
                    );
                  })
                ) : (
                  <>
                    <option value="2025/2026">دورة 2025/2026</option>
                    <option value="2024/2025">دورة 2024/2025</option>
                  </>
                )}
              </select>
            </div>

            {/* اختيار الدورة المقارنة */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#475569', fontWeight: 700 }}>مقارنة بـ:</span>
              <select
                value={compareCycle}
                onChange={(e) => setCompareCycle(e.target.value)}
                style={{
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#0F172A',
                  backgroundColor: isSingleCycle ? '#F1F5F9' : '#F8FAFC',
                  border: isSameCycle ? '1px solid #F59E0B' : '1px solid #CBD5E1',
                  borderRadius: '6px',
                  cursor: isSingleCycle ? 'not-allowed' : 'pointer',
                }}
                disabled={isSingleCycle || cyclesList.length <= 1}
              >
                {cyclesList && cyclesList.length > 0 ? (
                  cyclesList.map((c: any, i: number) => {
                    const year = c.academicYear || c.academic_year;
                    const name = c.name || `دورة ${year}`;
                    const val = year || name;
                    const isSelectedAsBase = val === baseCycle;
                    return (
                      <option
                        key={c.cycleId || c.id || i}
                        value={val}
                        disabled={isSelectedAsBase}
                      >
                        {name} {year ? `(${year})` : ''} {isSelectedAsBase ? '— (لا يمكن مقارنة الدورة بنفسها)' : ''}
                      </option>
                    );
                  })
                ) : (
                  <>
                    <option value="2024/2025">دورة 2024/2025</option>
                    <option value="2025/2026" disabled>
                      دورة 2025/2026 — (لا يمكن مقارنة الدورة بنفسها)
                    </option>
                  </>
                )}
              </select>
            </div>

            {/* زر تصدير Excel */}
            <button
              type="button"
              onClick={handleExportHistoricalExcel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: '#FFFFFF',
                color: '#059669',
                border: '1px solid #A7F3D0',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="تصدير مصفوفة المعايير والمؤشرات الـ 109 إلى ملف Excel بورقتي عمل"
            >
              <FileSpreadsheet size={15} />
              <span>مصفوفة إكسل (XLSX)</span>
            </button>

            {/* زر تصدير PDF */}
            <button
              type="button"
              onClick={handleExportHistoricalPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
              }}
              title="تنزيل تقرير المقارنة التراكمية الرسمي بصيغة PDF"
            >
              <Download size={15} />
              <span>تقرير المقارنة (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. تنبيه المقارنة المتطابقة عند تحديد نفس الدورة التقييمية */}
      {isSameCycle && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 20px',
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <AlertCircle size={22} color="#D97706" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#92400E', marginBottom: '2px' }}>
              تنبيه: تم تحديد نفس الدورة التقييمية في قائمتي المقارنة
            </div>
            <div style={{ fontSize: '13px', color: '#B45309', fontWeight: 600 }}>
              يرجى اختيار دورة تقييمية سابقة مختلفة لعرض الفوارق التاريخية؛ تم تصفير الفوارق (0.00) لتطابق الدورة المحددة.
            </div>
          </div>
        </div>
      )}

      {/* 3. تنبيه اختلاف إصدار المعايير بين الدورتين (BR-GEN-05) */}
      {!isSameCycle && historicalData?.isVersionMismatch && historicalData?.versionNotice && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 18px',
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '13px', color: '#92400E', lineHeight: 1.5 }}>
            <strong>قاعدة الحوكمة (BR-GEN-05):</strong> {historicalData.versionNotice}
          </div>
        </div>
      )}

      {/* 4. معالجة التدفق البديل: توفر دورة واحدة فقط للمدرسة (UC-SUP-07) */}
      {isSingleCycle && (
        <div
          style={{
            marginBottom: '24px',
            padding: '24px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
          }}
        >
          <Info size={24} color="#2563EB" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1E40AF', margin: 0, marginBottom: '6px' }}>
              التقييم التأسيسي الأول للمدرسة — لا تتوفر نتائج لدورات سابقة كافية (UC-SUP-07)
            </h3>
            <p style={{ fontSize: '13px', color: '#1E3A8A', margin: 0, marginBottom: '14px', lineHeight: 1.6 }}>
              المدرسة مسجلة حالياً بدورة تقييم ذاتي واحدة فقط ({historicalData?.baseCycle?.name || baseCycle}). وفقاً لاشتراطات حالة الاستخدام (UC-SUP-07)، تتطلب المقارنة التراكمية وجود نتائج مكتملة ومقرة لدورتين متعاقبتين على الأقل. يمكنك معاينة نتائج الدورة الحالية أو تصدير بطاقة التقويم الفردية.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => onNavigate('submissions', { schoolId })}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <FileCheck2 size={14} />
                <span>استعراض مخرج التقييم الحالي</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('tracking-log', { schoolId })}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <ClipboardList size={14} />
                <span>سجل المتابعة والمذكرات</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. شريط المؤشرات الأفقية الرباعي العلوية (Horizontal KPI Strip) */}
      {!isSingleCycle && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          {/* بطاقة 1: معدل الأداء وصافي النمو */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              borderTop: '3px solid #2563EB',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, marginBottom: '6px' }}>
              معدل الأداء العام وصافي النمو
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                {historicalData?.trajectory?.currentTotalScore?.toFixed(2) ?? '0.00'}
              </span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                مقابل {isSameCycle ? (historicalData?.trajectory?.currentTotalScore?.toFixed(2) ?? '0.00') : (historicalData?.trajectory?.previousTotalScore?.toFixed(2) ?? '0.00')}
              </span>
              <span
                style={{
                  marginRight: 'auto',
                  fontSize: '12px',
                  fontWeight: 800,
                  color: isSameCycle
                    ? '#64748B'
                    : ((historicalData?.trajectory?.netDelta ?? 0) >= 0 ? '#047857' : '#B91C1C'),
                }}
              >
                {isSameCycle
                  ? '0.00'
                  : `${(historicalData?.trajectory?.netDelta ?? 0) >= 0 ? '+' : ''}${historicalData?.trajectory?.netDelta?.toFixed(2) ?? '0.00'}`}
              </span>
            </div>
          </div>

          {/* بطاقة 2: المؤشرات المتحسنة */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              borderTop: '3px solid #059669',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ fontSize: '12px', color: '#047857', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowUp size={14} color="#059669" />
              <span>مؤشرات أظهرت تحسناً صاعداً</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#047857' }}>
                {isSameCycle ? 0 : (historicalData?.trajectory?.improvedCount ?? 0)}
              </span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>مؤشراً حقق نمواً</span>
            </div>
          </div>

          {/* بطاقة 3: المؤشرات المتراجعة */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              borderTop: '3px solid #DC2626',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ fontSize: '12px', color: '#B91C1C', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowDown size={14} color="#DC2626" />
              <span>مؤشرات شهدت تراجعاً (تتطلب تدخلاً)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#B91C1C' }}>
                {isSameCycle ? 0 : (historicalData?.trajectory?.regressedCount ?? 0)}
              </span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>مؤشراً بحاجة لمعالجة</span>
            </div>
          </div>

          {/* بطاقة 4: المؤشرات المستقرة والمستحدثة */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              borderTop: '3px solid #64748B',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Minus size={14} color="#64748B" />
              <span>مؤشرات حافظت على استقرارها</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#334155' }}>
                {isSameCycle ? (historicalData?.allIndicatorsDeltas?.length ?? 109) : (historicalData?.trajectory?.maintainedCount ?? 0)}
              </span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                {isSameCycle
                  ? 'مستقرة (أداء متطابق لنفس الدورة)'
                  : `مستقرة ${((historicalData?.trajectory?.newlyEvaluatedCount ?? 0) > 0) ? `+ ${historicalData?.trajectory?.newlyEvaluatedCount} مستحدثة` : ''}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. خطأ الاسترجاع إن وجد */}
      {historicalError ? (
        <EmptySupervisionState
          isError={true}
          title="تعذر تحميل المقارنة التاريخية"
          description={historicalError}
          actionText="إعادة المحاولة"
          onAction={refetchHistorical}
        />
      ) : (
        /* 6. جدول مصفوفة المقارنة التراكمية بعرض كامل 100% */
        <HistoricalMatrixTable
          standardsDeltas={historicalData?.standardsDeltas ?? []}
          allIndicatorsDeltas={historicalData?.allIndicatorsDeltas ?? []}
          baseCycleYear={historicalData?.baseCycle?.academicYear ?? baseCycle}
          comparedCycleYear={historicalData?.comparedCycle?.academicYear ?? compareCycle}
          previousTotal={historicalData?.trajectory?.previousTotalScore ?? 0}
          currentTotal={historicalData?.trajectory?.currentTotalScore ?? 0}
          netDelta={historicalData?.trajectory?.netDelta ?? 0}
          isSameCycle={isSameCycle}
        />
      )}

      {/* 7. شريط التنقل والإجراءات السريعة السفلي */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginTop: '20px',
          padding: '16px 20px',
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
        }}
      >
        <span style={{ fontSize: '13px', color: '#64748B' }}>
          خيارات سريعة ذات صلة بملف المدرسة:
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => onNavigate('submissions', { schoolId })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              border: '1px solid #BFDBFE',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <FileCheck2 size={15} />
            <span>عرض مخرج الدورة الحالية</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('tracking-log', { schoolId })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#F8FAFC',
              color: '#475569',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <ClipboardList size={15} />
            <span>فتح سجل المتابعة والمذكرات</span>
          </button>
        </div>
      </div>
    </div>
  );
};
