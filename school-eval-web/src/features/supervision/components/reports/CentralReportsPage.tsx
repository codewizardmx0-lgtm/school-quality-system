/**
 * Component: CentralReportsPage
 * الشاشة 8 (الأخيرة في حزمة الإشراف): التحليلات المركزية ومؤشرات الجودة الوطنية الشاملة
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 * الامتثال الصارم للنسخة النهائية رقم 5 من وثيقة التخرج (UC-SUP-05, FR-SUP-12..15, BR-MIN-02, BR-MIN-03) ودستور الواجهات UI_STANDARDS.md
 */

import React, { useState } from 'react';
import {
  ArrowRight,
  TrendingUp,
  Award,
  AlertTriangle,
  Clock,
  ClipboardList,
  Layers,
  SlidersHorizontal,
  History,
  CheckCircle2,
} from 'lucide-react';
import { useCentralReports } from '../../hooks/useCentralReports';
import { CentralReportsFilterStrip } from './CentralReportsFilterStrip';
import { StandardsAndIndicatorsTab } from './StandardsAndIndicatorsTab';
import { CentralSchoolsStatusTab } from './CentralSchoolsStatusTab';
import { CompetencyAndStagesTab } from './CompetencyAndStagesTab';
import { GapsAndInterventionsTab } from './GapsAndInterventionsTab';
import { EmptySupervisionState } from '../common/EmptySupervisionState';
import type { SupervisionScreenKey } from '../../api/supervisionTypes';

interface CentralReportsPageProps {
  cycleId?: number;
  onNavigate: (screen: SupervisionScreenKey, params?: { schoolId?: number; cycleId?: number; submissionId?: number }) => void;
}

type CentralReportsTabKey = 'standards' | 'schools_status' | 'competency_stages' | 'gaps_interventions';

export const CentralReportsPage: React.FC<CentralReportsPageProps> = ({ cycleId, onNavigate }) => {
  const {
    analyticsData,
    standardsMeans,
    isLoadingAnalytics,
    analyticsError,
    refetchAnalytics,
    selectedCycleId,
    setSelectedCycleId,
    selectedStage,
    setSelectedStage,
    selectedSchoolIds,
    setSelectedSchoolIds,
    handleExportAnalyticsExcel,
    handleExportAnalyticsPdf,
    isExportingPdf,
  } = useCentralReports(cycleId);

  // التبويب النشط
  const [activeTab, setActiveTab] = useState<CentralReportsTabKey>('standards');

  const scopeSummary = analyticsData?.scopeSummary;

  return (
    <div style={{ padding: '24px 32px', width: '100%', boxSizing: 'border-box' }}>
      {/* 1. الترويسة الرئيسية وزر العودة */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
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
              padding: 0,
            }}
          >
            <ArrowRight size={16} />
            <span>العودة إلى لوحة المتابعة الإشرافية</span>
          </button>

          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            التحليلات المركزية ومؤشرات الجودة الوطنية الشاملة
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            تحليل مجمّع لنتائج التقييم المدرسي لنطاق {scopeSummary?.governorate ?? 'النطاق الإشرافي'} للدورة {analyticsData?.academicYear ?? 'الجارية'} عبر المعايير الوطنية السبعة ومصفوفة المؤشرات الـ 109
          </p>
        </div>

        {/* زر الانتقال للمقارنة التاريخية */}
        <button
          type="button"
          onClick={() => onNavigate('historical')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#F0FDFA',
            color: '#0F766E',
            border: '1px solid #99F6E4',
            borderRadius: '8px',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="الانتقال إلى التحليل والمقارنة التاريخية التراكمية لمدرسة عبر الدورات (Screen 7)"
        >
          <History size={16} />
          <span>المقارنة التاريخية عبر الدورات</span>
        </button>
      </div>

      {/* 2. شريط التصفية العلوي المتكامل مع التصدير المزدوج */}
      <CentralReportsFilterStrip
        cycles={analyticsData?.availableCycles}
        selectedCycleId={selectedCycleId}
        onSelectCycleId={setSelectedCycleId}
        selectedStage={selectedStage}
        onSelectStage={setSelectedStage}
        availableSchools={analyticsData?.availableSchools}
        selectedSchoolIds={selectedSchoolIds}
        onSelectSchoolIds={setSelectedSchoolIds}
        onExportExcel={handleExportAnalyticsExcel}
        onExportPdf={handleExportAnalyticsPdf}
        isExportingPdf={isExportingPdf}
        onResetFilters={() => {
          setSelectedStage('');
          setSelectedSchoolIds([]);
        }}
      />

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
          {/* 3. شريط المؤشرات الكمية الرباعي الأفقي (Horizontal KPI Strip) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '14px',
              marginBottom: '22px',
            }}
          >
            {/* KPI 1: متوسط الأداء ونسبة التحقق الموزونة */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                borderTop: '4px solid #0F766E',
                padding: '16px 18px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#F0FDFA',
                  border: '1px solid #CCFBF1',
                  color: '#0F766E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <TrendingUp size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, display: 'block' }}>
                  متوسط الأداء الموزون لمدارس النطاق
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A' }}>
                    {scopeSummary?.averageScore != null ? scopeSummary.averageScore.toFixed(2) : '0.00'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#0F766E', fontWeight: 700 }}>
                    / 3.00 ({scopeSummary?.overallPercentage ?? 0}%)
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 2: نسبة إنجاز المدارس */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                borderTop: '4px solid #0284C7',
                padding: '16px 18px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  color: '#0284C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, display: 'block' }}>
                  نسبة المدارس التي رفعت مخرجاتها
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A' }}>
                    {scopeSummary?.totalSchools && scopeSummary.totalSchools > 0
                      ? Math.round(((scopeSummary.evaluatedSchools ?? 0) / scopeSummary.totalSchools) * 100)
                      : 0}%
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                    ({scopeSummary?.evaluatedSchools ?? 0} من {scopeSummary?.totalSchools ?? 0} مدرسة)
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 3: المدارس المتأخرة عن التسليم آلياً (FR-SUP-15) */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                borderTop: '4px solid #DC2626',
                padding: '16px 18px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, display: 'block' }}>
                  متأخرة عن التسليم (قاعدة 80%)
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 900, color: '#991B1B' }}>
                    {scopeSummary?.overdueSchoolsCount ?? 0}
                  </span>
                  <span style={{ fontSize: '12px', color: '#991B1B', fontWeight: 600 }}>
                    مدرسة متأخرة 🔴
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 4: طلبات الاستكمال النشطة */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                borderTop: '4px solid #D97706',
                padding: '16px 18px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Clock size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, display: 'block' }}>
                  طلبات الاستكمال النشطة الصادرة
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A' }}>
                    {scopeSummary?.activeRequestsCount ?? 0}
                  </span>
                  <span style={{ fontSize: '12px', color: '#B45309', fontWeight: 600 }}>
                    طلب قيد المعالجة
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. شريط التبويبات الأربعة المتكاملة */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: '2px solid #E2E8F0',
              marginBottom: '20px',
              overflowX: 'auto',
            }}
          >
            {[
              {
                id: 'standards',
                label: 'تحليل المعايير السبعة ومصفوفة المؤشرات (109)',
                icon: Award,
              },
              {
                id: 'schools_status',
                label: `التقرير المركزي لحالة المدارس ومخرجاتها (FR-SUP-15) ${
                  scopeSummary?.overdueSchoolsCount && scopeSummary.overdueSchoolsCount > 0
                    ? `🔴 (${scopeSummary.overdueSchoolsCount})`
                    : ''
                }`,
                icon: ClipboardList,
              },
              {
                id: 'competency_stages',
                label: 'التوزيع الإحصائي والمراحل الدراسية',
                icon: Layers,
              },
              {
                id: 'gaps_interventions',
                label: 'مصفوفة الفجوات وأولويات التدخل الإشرافي',
                icon: SlidersHorizontal,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as CentralReportsTabKey)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 18px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: `3px solid ${isActive ? '#0F766E' : 'transparent'}`,
                    marginBottom: '-2px',
                    fontSize: '13.5px',
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? '#0F766E' : '#64748B',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 5. محتوى التبويب النشط */}
          {isLoadingAnalytics ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>جارِ تحميل التحليلات الإحصائية وتطبيق الفلاتر...</div>
            </div>
          ) : (
            <div>
              {activeTab === 'standards' && (
                <StandardsAndIndicatorsTab
                  standards={standardsMeans}
                  allIndicators={analyticsData?.allIndicatorsMeans}
                />
              )}

              {activeTab === 'schools_status' && (
                <CentralSchoolsStatusTab
                  schoolsReport={analyticsData?.centralSchoolsReport}
                  onNavigate={onNavigate}
                />
              )}

              {activeTab === 'competency_stages' && (
                <CompetencyAndStagesTab
                  distribution={analyticsData?.distribution}
                  stageBreakdown={analyticsData?.stageBreakdown}
                />
              )}

              {activeTab === 'gaps_interventions' && (
                <GapsAndInterventionsTab
                  topStrengths={analyticsData?.topStrengths}
                  bottomGaps={analyticsData?.bottomGaps}
                  policySynthesisNote={scopeSummary?.policySynthesisNote}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};