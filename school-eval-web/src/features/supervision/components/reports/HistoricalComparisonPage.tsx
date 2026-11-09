/**
 * Component: HistoricalComparisonPage
 * الشاشة 7: المقارنة التاريخية التراكمية عبر الدورات ومسار النمو المدرسي
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 */

import React from 'react';
import {
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  FileCheck2,
  ClipboardList,
  Sparkles,
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
  schoolId = 104,
  onNavigate,
}) => {
  const {
    historicalData,
    historicalError,
    refetchHistorical,
    baseCycle,
    setBaseCycle,
    compareCycle,
    setCompareCycle,
    handleExportHistoricalExcel,
    handleExportHistoricalPdf,
  } = useCentralReports(schoolId);

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* 1. الترويسة الرئيسية وسياق المقارنة */}
      <div style={{ marginBottom: '24px' }}>
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
            marginBottom: '8px',
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
            padding: '16px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#2563EB',
                  backgroundColor: '#EFF6FF',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                {historicalData?.school.schoolCode ?? 'SCH-104'}
              </span>

              {/* شارة مسار النمو المعتمدة */}
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#047857',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <TrendingUp size={14} color="#059669" />
                <span>
                  {historicalData?.trajectory.growthPillText ?? 'اتجاه نمو إيجابي +12%'}
                </span>
              </span>
            </div>

            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              المقارنة التاريخية التراكمية — {historicalData?.school.schoolName ?? 'مدرسة بلقيس النموذجية للبنات'}
            </h1>
            <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', margin: 0 }}>
              تتبع مسار التطور النوعي في درجات المعايير الوطنية وإغلاق الفجوات بين دورتين متتاليتين
            </p>
          </div>

          {/* محددات الدورات وأزرار التصدير */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* اختيار الدورة الحالية */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>الدورة الحالية:</span>
              <select
                value={baseCycle}
                onChange={(e) => setBaseCycle(e.target.value)}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#0F172A',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                }}
              >
                <option value="2026/2027">2026/2027</option>
              </select>
            </div>

            {/* اختيار الدورة المقارنة */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>مقارنة بـ:</span>
              <select
                value={compareCycle}
                onChange={(e) => setCompareCycle(e.target.value)}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#0F172A',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                }}
              >
                <option value="2025/2026">2025/2026</option>
                <option value="2024/2025">2024/2025</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportHistoricalExcel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                backgroundColor: '#FFFFFF',
                color: '#059669',
                border: '1px solid #A7F3D0',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <FileSpreadsheet size={15} />
              <span>XLSX</span>
            </button>

            <button
              type="button"
              onClick={handleExportHistoricalPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              <Download size={15} />
              <span>تقرير المقارنة (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {historicalError ? (
        <EmptySupervisionState
          isError={true}
          title="تعذر تحميل المقارنة التاريخية"
          description={historicalError}
          actionText="إعادة المحاولة"
          onAction={refetchHistorical}
        />
      ) : (
        /* 2. مساحة المقارنة بعمودين */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.1fr)',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* العمود الأيمن: جدول مصفوفة الفوارق Delta Table */}
          <HistoricalMatrixTable
            standardsDeltas={historicalData?.standardsDeltas ?? []}
            baseCycleYear={baseCycle}
            comparedCycleYear={compareCycle}
            previousTotal={historicalData?.trajectory.previousTotalScore ?? 2.11}
            currentTotal={historicalData?.trajectory.currentTotalScore ?? 2.39}
            netDelta={historicalData?.trajectory.netDelta ?? 0.28}
          />

          {/* العمود الأيسر: لوحة الأثر والتحليل والتوصيات */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* بطاقة مؤشرات أثر التحسين */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
                مؤشرات أثر خطة التحسين المدرسي
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#065F46' }}>
                    فجوات الأداء التي تم إغلاقها بنجاح:
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#047857' }}>
                    {historicalData?.impactMetrics.planGapsClosedPercentage ?? 75}%
                  </span>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E40AF' }}>
                    نمو جودة وموثوقية الشواهد المرفقة:
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#1D4ED8' }}>
                    +{historicalData?.impactMetrics.evidenceQualityGrowthPercentage ?? 31}%
                  </span>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#FAFBFD',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    انخفاض وتيرة طلبات الاستكمال:
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>
                    -{historicalData?.impactMetrics.completionRequestsReductionPercentage ?? 57}%
                  </span>
                </div>
              </div>
            </div>

            {/* بطاقة التوصيات الإشرافية المستقبلية */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Sparkles size={18} color="#2563EB" />
                <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  التوصيات الإشرافية للدورة القادمة
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {historicalData?.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      fontSize: '12px',
                      color: '#475569',
                      lineHeight: 1.5,
                    }}
                  >
                    <CheckCircle2 size={15} color="#10B981" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. شريط التنقل السفلي */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginTop: '24px',
          padding: '16px 20px',
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
        }}
      >
        <span style={{ fontSize: '13px', color: '#64748B' }}>
          خيارات سريعة ذات صلة بمدرسة بلقيس النموذجية:
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => onNavigate('submissions', { submissionId: 101, schoolId })}
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
