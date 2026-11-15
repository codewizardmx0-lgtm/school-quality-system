import React, { useState } from 'react';
import { useHistoricalTrend } from '../../hooks/useHistoricalTrend';
import { evaluatorApi } from '../../api/evaluatorApi';
import type { EvaluatorScreen, IndicatorTrendItem } from '../../api/evaluationTypes';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  BarChart3,
  AlertTriangle,
  Download,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Search,
} from 'lucide-react';

interface HistoricalPerformancePageProps {
  onNavigate?: (screen: EvaluatorScreen, param?: number) => void;
}

export const HistoricalPerformancePage: React.FC<HistoricalPerformancePageProps> = ({
  onNavigate,
}) => {
  const { trendData, isLoading, error, refreshTrend } = useHistoricalTrend();
  const [activeTab, setActiveTab] = useState<'improved' | 'maintained' | 'regressed' | 'newly' | 'deprecated'>('improved');
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading) {
    return (
      <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        <div style={{ height: '120px', borderRadius: '16px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
        <div style={{ height: '180px', borderRadius: '14px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
        <div style={{ height: '320px', borderRadius: '14px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
      </div>
    );
  }

  if (error || !trendData) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', maxWidth: '750px', margin: '40px auto' }}>
        <AlertTriangle size={48} color="#D97706" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>تعذر تحميل بيانات المقارنة التاريخية</h3>
        <p style={{ fontSize: '13px', color: '#64748B', margin: '8px auto 20px', maxWidth: '450px' }}>
          {error || 'لم نتمكن من استرجاع سجلات الدورات السابقة للمدرسة.'}
        </p>
        <button
          onClick={refreshTrend}
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
    );
  }

  const { has_previous_cycle, school_name, current_cycle, previous_cycle, notice, trend } = trendData;

  // If no previous cycle (e.g. foundational first year)
  if (!has_previous_cycle || !trend) {
    return (
      <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 50%, #2563EB 100%)',
            borderRadius: '16px',
            padding: '28px 32px',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 8px 24px rgba(29, 78, 216, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '14px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(8px)',
              }}
            >
              <BarChart3 size={28} color="#BFDBFE" />
            </div>
            <div>
              <h1 style={{ fontSize: '21px', fontWeight: 800, margin: 0 }}>مقارنة الأداء التاريخي للدورات</h1>
              <p style={{ fontSize: '13px', color: '#DBEAFE', margin: '4px 0 0 0' }}>
                المدرسة: {school_name || 'مدرستنا'} • الدورة الحالية: {current_cycle}
              </p>
            </div>
          </div>
        </div>

        {/* Foundational Notice */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '48px 30px',
            textAlign: 'center',
            maxWidth: '800px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
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
          <p style={{ fontSize: '13.5px', color: '#64748B', maxWidth: '520px', lineHeight: 1.6, margin: 0 }}>
            {notice || 'يعد هذا التقييم دورة الأساس المرجعية (Baseline Cycle) للمدرسة في منصة ارتقاء. ستتاح المقارنات التاريخية تلقائياً فور اكتمال الدورة الحالية وبدء الدورة التالية.'}
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
      </div>
    );
  }

  // Determine current active list of indicators based on tab
  const getTabList = (): IndicatorTrendItem[] => {
    switch (activeTab) {
      case 'improved':
        return trend.improved_indicators || [];
      case 'maintained':
        return trend.maintained_indicators || [];
      case 'regressed':
        return trend.regressed_indicators || [];
      case 'newly':
        return trend.newly_evaluated_indicators || [];
      case 'deprecated':
        return trend.deprecated_indicators || [];
      default:
        return [];
    }
  };

  const fullList = getTabList();
  const filteredList = fullList.filter(
    (item) =>
      item.indicator_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.indicator_name && item.indicator_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const delta = trend.score_delta;
  const isPositive = delta > 0;
  const isZero = delta === 0;

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
          borderRadius: '16px',
          padding: '28px 32px',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            <BarChart3 size={30} color="#38BDF8" />
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
                مقارنة دورتين متتاليتين
              </span>
            </div>
            <p style={{ fontSize: '13.5px', color: '#94A3B8', margin: '6px 0 0 0', lineHeight: 1.5 }}>
              المدرسة: <strong style={{ color: '#F1F5F9' }}>{school_name}</strong> • الدورة الحالية: {current_cycle} مقابل الدورة السابقة: {previous_cycle}
            </p>
          </div>
        </div>

        {/* Quick Export Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => evaluatorApi.exportDetailedReportExcel()}
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
              cursor: 'pointer',
            }}
          >
            <Download size={15} />
            <span>تصدير المصفوفة (Excel)</span>
          </button>
          <button
            onClick={() => evaluatorApi.exportDetailedReportPdf()}
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
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
            }}
          >
            <Download size={15} />
            <span>تقرير المقارنة (PDF)</span>
          </button>
        </div>
      </div>

      {/* 1. Comparative KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Score Delta Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
              النتيجة الموزونة الشاملة
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '12px',
                backgroundColor: isPositive ? '#DCFCE7' : isZero ? '#F1F5F9' : '#FEE2E2',
                color: isPositive ? '#15803D' : isZero ? '#475569' : '#B91C1C',
              }}
            >
              {isPositive ? <ArrowUpRight size={14} /> : isZero ? <Minus size={14} /> : <ArrowDownRight size={14} />}
              <span>{isPositive ? `+${delta}%` : `${delta}%`}</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A' }}>
              {trend.current_final_score}%
            </div>
            <div style={{ fontSize: '13px', color: '#94A3B8' }}>
              (السابقة: {trend.previous_final_score}%)
            </div>
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B' }}>
            اتجاه الأداء: <strong>{isPositive ? 'تحسن وتطور إيجابي' : isZero ? 'استقرار مستمر' : 'تراجع يتطلب تدخلاً'}</strong>
          </div>
        </div>

        {/* Improved Indicators Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1.5px solid #BBF7D0',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#166534' }}>
              مؤشرات حققت تحسناً صاعداً
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#DCFCE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={18} color="#15803D" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#15803D' }}>
            {trend.improved_count}
          </div>
          <div style={{ fontSize: '11.5px', color: '#166534' }}>
            مؤشر ارتفع تصنيفها في هذه الدورة
          </div>
        </div>

        {/* Maintained Indicators Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569' }}>
              مؤشرات حافظت على استقرارها
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Minus size={18} color="#475569" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#334155' }}>
            {trend.maintained_count}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B' }}>
            مؤشر حافظت على نفس المستوى المتميز
          </div>
        </div>

        {/* Regressed Indicators Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: trend.regressed_count > 0 ? '1.5px solid #FECACA' : '1px solid #E2E8F0',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: trend.regressed_count > 0 ? '#991B1B' : '#64748B' }}>
              مؤشرات تراجعت (أولوية تطوير)
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingDown size={18} color="#DC2626" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: trend.regressed_count > 0 ? '#DC2626' : '#64748B' }}>
            {trend.regressed_count}
          </div>
          <div style={{ fontSize: '11.5px', color: trend.regressed_count > 0 ? '#B91C1C' : '#64748B' }}>
            تتطلب إدراجاً فورياً في خطة التحسين
          </div>
        </div>
      </div>

      {/* 2. Indicator Movement Matrix Section */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Tabs Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('improved')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: activeTab === 'improved' ? '#059669' : '#FFFFFF',
                color: activeTab === 'improved' ? '#FFFFFF' : '#334155',
                border: `1px solid ${activeTab === 'improved' ? '#059669' : '#CBD5E1'}`,
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <TrendingUp size={15} />
              <span>تحسن صاعد ({trend.improved_count})</span>
            </button>

            <button
              onClick={() => setActiveTab('maintained')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: activeTab === 'maintained' ? '#0F766E' : '#FFFFFF',
                color: activeTab === 'maintained' ? '#FFFFFF' : '#334155',
                border: `1px solid ${activeTab === 'maintained' ? '#0F766E' : '#CBD5E1'}`,
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Minus size={15} />
              <span>استقرار متميز ({trend.maintained_count})</span>
            </button>

            <button
              onClick={() => setActiveTab('regressed')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: activeTab === 'regressed' ? '#DC2626' : '#FFFFFF',
                color: activeTab === 'regressed' ? '#FFFFFF' : '#334155',
                border: `1px solid ${activeTab === 'regressed' ? '#DC2626' : '#CBD5E1'}`,
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <TrendingDown size={15} />
              <span>تراجع يتطلب تدخلاً ({trend.regressed_count})</span>
            </button>

            <button
              onClick={() => setActiveTab('newly')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: activeTab === 'newly' ? '#2563EB' : '#FFFFFF',
                color: activeTab === 'newly' ? '#FFFFFF' : '#334155',
                border: `1px solid ${activeTab === 'newly' ? '#2563EB' : '#CBD5E1'}`,
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Sparkles size={15} />
              <span>مؤشرات لأول مرة ({trend.newly_evaluated_count})</span>
            </button>

            {trend.deprecated_count > 0 && (
              <button
                onClick={() => setActiveTab('deprecated')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: activeTab === 'deprecated' ? '#64748B' : '#FFFFFF',
                  color: activeTab === 'deprecated' ? '#FFFFFF' : '#334155',
                  border: `1px solid ${activeTab === 'deprecated' ? '#64748B' : '#CBD5E1'}`,
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <span>مستبعدة ({trend.deprecated_count})</span>
              </button>
            )}
          </div>

          {/* Search Filter */}
          <div style={{ position: 'relative', width: '240px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برمز المؤشر أو الاسم..."
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          </div>
        </div>

        {/* Indicators Table */}
        {filteredList.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B' }}>
            <Info size={36} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 700 }}>لا توجد مؤشرات في هذا التصنيف حالياً</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 800, color: '#475569' }}>رمز المؤشر</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 800, color: '#475569' }}>اسم المؤشر المعياري</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 800, color: '#475569', textAlign: 'center' }}>الدورة السابقة</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 800, color: '#475569', textAlign: 'center' }}>الدورة الحالية</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 800, color: '#475569', textAlign: 'center' }}>الفرق (Delta)</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 800, color: '#475569' }}>ملاحظات التطور</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => {
                  const itemDelta = item.delta ?? (item.current_score - (item.previous_score ?? 0));
                  return (
                    <tr
                      key={item.indicator_code || idx}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                      }}
                    >
                      <td style={{ padding: '12px 18px' }}>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#F1F5F9',
                            color: '#0F172A',
                            fontFamily: 'monospace',
                          }}
                        >
                          {item.indicator_code}
                        </span>
                      </td>

                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          {item.indicator_name || 'مؤشر تقييم مدرسي'}
                        </div>
                        {item.text_changed && item.previous_name && (
                          <div style={{ fontSize: '11px', color: '#B45309', marginTop: '2px' }}>
                            ⚠️ تم تحديث الصياغة المعيارية في الإصدار الحالي (سابقاً: {item.previous_name})
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '12.5px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '10px',
                            backgroundColor: '#F1F5F9',
                            color: '#475569',
                          }}
                        >
                          {item.previous_score !== undefined ? `مستوى ${item.previous_score}` : '—'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '12.5px',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '10px',
                            backgroundColor:
                              item.current_score >= 3
                                ? '#DCFCE7'
                                : item.current_score === 2
                                ? '#FEF3C7'
                                : '#FEE2E2',
                            color:
                              item.current_score >= 3
                                ? '#166534'
                                : item.current_score === 2
                                ? '#92400E'
                                : '#991B1B',
                          }}
                        >
                          مستوى {item.current_score}
                        </span>
                      </td>

                      <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                        {item.previous_score !== undefined ? (
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 800,
                              color: itemDelta > 0 ? '#15803D' : itemDelta < 0 ? '#DC2626' : '#64748B',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            {itemDelta > 0 ? `+${itemDelta}` : itemDelta}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 700 }}>
                            جديد 🆕
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '12px 18px', fontSize: '12px', color: '#64748B' }}>
                        {item.notice ||
                          (itemDelta > 0
                            ? 'نمو إيجابي في ممارسات الجودة والشواهد'
                            : itemDelta < 0
                            ? 'تراجع يستوجب إضافة إجراء معالجة بالخطة'
                            : 'استقرار الأداء بنفس التصنيف المعتمد')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
