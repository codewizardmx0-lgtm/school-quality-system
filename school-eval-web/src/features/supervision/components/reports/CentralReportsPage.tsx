/**
 * Component: CentralReportsPage
 * الشاشة 6: التقارير والتحليلات المركزية ومؤشرات الجودة المدرسية الوطنية
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 */

import React from 'react';
import {
  ArrowRight,
  TrendingUp,
  Award,
  AlertOctagon,
  FileSpreadsheet,
  Download,
  Lightbulb,
  History,
} from 'lucide-react';
import { useCentralReports } from '../../hooks/useCentralReports';
import { StandardsMeanChart } from './StandardsMeanChart';
import { EmptySupervisionState } from '../common/EmptySupervisionState';
import type { SupervisionScreenKey } from '../../api/supervisionTypes';

interface CentralReportsPageProps {
  onNavigate: (screen: SupervisionScreenKey, params?: { schoolId?: number }) => void;
}

export const CentralReportsPage: React.FC<CentralReportsPageProps> = ({ onNavigate }) => {
  const {
    analyticsData,
    standardsMeans,
    analyticsError,
    refetchAnalytics,
    handleExportAnalyticsExcel,
    handleExportAnalyticsPdf,
  } = useCentralReports(104);

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* 1. الترويسة الرئيسية والإجراءات */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
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
              marginBottom: '6px',
            }}
          >
            <ArrowRight size={16} />
            <span>العودة إلى لوحة المتابعة</span>
          </button>

          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            التقارير التحليلية الشاملة ومؤشرات الجودة الوطنية
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            تحليل مجمّع لنتائج التقييم المدرسي لنطاق أمانة العاصمة عبر المعايير الوطنية السبعة
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleExportAnalyticsExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              backgroundColor: '#FFFFFF',
              color: '#059669',
              border: '1px solid #A7F3D0',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <FileSpreadsheet size={16} />
            <span>تصدير المؤشرات (XLSX)</span>
          </button>

          <button
            type="button"
            onClick={handleExportAnalyticsPdf}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            }}
          >
            <Download size={16} />
            <span>تصدير التقرير التحليلي (PDF)</span>
          </button>
        </div>
      </div>

      {analyticsError ? (
        <EmptySupervisionState
          isError={true}
          title="تعذر تحميل التقارير المركزية"
          description={analyticsError}
          actionText="إعادة المحاولة"
          onAction={refetchAnalytics}
        />
      ) : (
        <>
          {/* 2. بطاقات ملخص المؤشرات الثلاثة العلوية */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            {/* متوسط النطاق الكلي */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <TrendingUp size={24} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block' }}>
                  متوسط الأداء العام لمدارس النطاق
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>
                    {analyticsData?.scopeSummary.averageScore.toFixed(2) ?? '2.34'}
                  </span>
                  <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 700 }}>
                    / 3.0 ({analyticsData?.scopeSummary.overallPercentage ?? 78.0}%)
                  </span>
                </div>
              </div>
            </div>

            {/* أعلى المعايير أداءً */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Award size={24} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block' }}>
                  أعلى المعايير أداءً (نقطة تميز)
                </span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#047857' }}>
                  {analyticsData?.scopeSummary.highestStandard ?? 'الإدارة المدرسية والقيادة (2.71)'}
                </span>
              </div>
            </div>

            {/* المعيار الأقل أداءً ويتطلب دعماً */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertOctagon size={24} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block' }}>
                  المعيار الأقل أداءً (فجوة ذات أولوية)
                </span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#B91C1C' }}>
                  {analyticsData?.scopeSummary.lowestStandard ?? 'التعليم والتعلم والتقويم (1.82)'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. مساحة التحليل الرئيسية بعمودين */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.1fr)',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            {/* العمود الأيمن: الرسم البياني لمتوسطات المعايير الـ 7 والتوجيه السياسي */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <StandardsMeanChart standards={standardsMeans} />

              {/* ملاحظة التحليل التوليدي للسياسات التربوية */}
              <div
                style={{
                  padding: '18px 20px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <Lightbulb size={22} color="#2563EB" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#1E40AF', margin: '0 0 4px 0' }}>
                    خلاصة التحليل التوجيهي للسياسات الإشرافية
                  </h3>
                  <p style={{ fontSize: '13px', color: '#1E3A8A', margin: 0, lineHeight: 1.6 }}>
                    {analyticsData?.scopeSummary.policySynthesisNote ??
                      'تشير مؤشرات الجودة إلى تفوق واضح في معايير القيادة والإدارة والبيئة المدرسية، مع حاجة ملحة لبرامج دعم مركزية موجهة لمعيار التعليم والتعلم والتقويم وتدريب المعلمين.'}
                  </p>
                </div>
              </div>
            </div>

            {/* العمود الأيسر: لوحة الفلاتر وتوزيع الأداء والمراحل */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* بطاقة توزيع الأداء */}
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
                  توزيع مستويات الكفاءة لمدارس النطاق
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, color: '#1E40AF' }}>
                        المتميز (أعلى من 80%): {analyticsData?.distribution.advancedPercentage ?? 37}%
                      </span>
                      <span style={{ color: '#64748B' }}>18 مدرسة</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${analyticsData?.distribution.advancedPercentage ?? 37}%`,
                          height: '100%',
                          backgroundColor: '#2563EB',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, color: '#065F46' }}>
                        المتوسط (60% - 79%): {analyticsData?.distribution.proficientPercentage ?? 53}%
                      </span>
                      <span style={{ color: '#64748B' }}>25 مدرسة</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${analyticsData?.distribution.proficientPercentage ?? 53}%`,
                          height: '100%',
                          backgroundColor: '#059669',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, color: '#991B1B' }}>
                        بحاجة لدعم (أقل من 60%): {analyticsData?.distribution.needsSupportPercentage ?? 10}%
                      </span>
                      <span style={{ color: '#64748B' }}>5 مدارس</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${analyticsData?.distribution.needsSupportPercentage ?? 10}%`,
                          height: '100%',
                          backgroundColor: '#DC2626',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* بطاقة مقارنة المراحل الدراسية */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
              >
                <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '14px' }}>
                  مقارنة المراحل الدراسية
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {analyticsData?.stageBreakdown.map((stage, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block' }}>
                          {stage.stage}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          {stage.schoolsCount} مدرسة مشاركة
                        </span>
                      </div>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#2563EB' }}>
                        {stage.averageScore.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. شريط الإجراءات السفلي */}
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
              للاطلاع على مسار نمو مدرسة محددة عبر الدورات السابقة:
            </span>

            <button
              type="button"
              onClick={() => onNavigate('historical', { schoolId: 104 })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                border: '1px solid #BFDBFE',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <History size={16} />
              <span>مقارنة مدرسة بلقيس النموذجية عبر الدورات (SCH-104)</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
