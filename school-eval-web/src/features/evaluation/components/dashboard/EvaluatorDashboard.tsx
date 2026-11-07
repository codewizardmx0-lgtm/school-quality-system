import React from 'react';
import { useEvaluatorDashboard } from '../../hooks/useEvaluatorDashboard';
import { CycleProgressTracker } from './CycleProgressTracker';
import { StandardsProgressBar } from './StandardsProgressBar';
import { PendingIndicatorsTable } from './PendingIndicatorsTable';
import type { EvaluatorScreen } from '../../api/evaluationTypes';
import {
  CheckCircle,
  FileText,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  School,
  Calendar,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

interface EvaluatorDashboardProps {
  onNavigate: (screen: EvaluatorScreen, param?: number) => void;
  isLocked?: boolean;
}

export const EvaluatorDashboard: React.FC<EvaluatorDashboardProps> = ({
  onNavigate,
  isLocked = false,
}) => {
  const { dashboardData, isLoading, error, refreshDashboard } = useEvaluatorDashboard();

  if (error && !dashboardData) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #FECACA', margin: '24px auto', maxWidth: '600px' }}>
        <AlertTriangle size={48} color="#EF4444" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#991B1B' }}>تعذر تحميل بيانات لوحة التحكم</h3>
        <p style={{ fontSize: '13px', color: '#64748B', margin: '8px 0 20px' }}>{error}</p>
        <button
          onClick={refreshDashboard}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            backgroundColor: '#059669',
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
  if (isLoading && !dashboardData) {
    return (
      <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ height: '110px', borderRadius: '16px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: '120px', borderRadius: '14px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
          ))}
        </div>
        <div style={{ height: '300px', borderRadius: '14px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
      </div>
    );
  }

  const kpis = dashboardData?.kpis || {
    completionPercentage: 0,
    totalIndicators: 0,
    scoredIndicators: 0,
    documentedEvidences: 0,
    targetEvidences: 0,
    strengthsCount: 0,
    gapsCount: 0,
  };

  const school = dashboardData?.schoolInfo;

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. School Banner & Evaluator Identity */}
      <div
        style={{
          background: 'linear-gradient(135deg, #064E3B 0%, #065F46 45%, #047857 100%)',
          borderRadius: '16px',
          padding: '24px 30px',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 8px 24px rgba(4, 120, 87, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            <School size={28} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
                {school?.schoolName || 'مدرسة الأمل النموذجية الثانوية'}
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                {isLocked ? 'مرفوع للقراءة فقط' : school?.statusArabic || 'مسودة قيد الإدخال'}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#D1FAE5', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <UserCheck size={15} />
                المقيّم المسؤول: {school?.currentEvaluator || 'عمار عمر عبدالله'}
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={15} />
                العام الدراسي {school?.academicYear || '2026/2027'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Launch Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => onNavigate('rubric-assessment')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              color: '#065F46',
              fontWeight: 800,
              fontSize: '13.5px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <span>{isLocked ? 'استعراض رصد التقييم' : 'متابعة رصد التقييم'}</span>
            <ArrowLeft size={16} />
          </button>
        </div>
      </div>

      {/* 2. Top Notice Alert Banner if Supervisor Requested Completion */}
      {dashboardData?.completionAlert && (
        <div
          style={{
            backgroundColor: '#FFFBEB',
            borderRadius: '12px',
            border: '1px solid #FDE68A',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#FDE68A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#B45309',
              }}
            >
              <ShieldAlert size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#92400E' }}>
                {dashboardData.completionAlert.message}
              </div>
              <div style={{ fontSize: '12px', color: '#B45309', marginTop: '2px' }}>
                المهلة المحددة: حتى {dashboardData.completionAlert.deadline} ({dashboardData.completionAlert.itemsCount} عناصر مطلوبة)
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('completion-request')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)',
            }}
          >
            فتح طلب الاستكمال
          </button>
        </div>
      )}

      {/* 3. Four Core Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '18px',
        }}
      >
        {/* Card 1: نسبة إنجاز التقييم الذاتي */}
        <div
          onClick={() => onNavigate('rubric-assessment')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>
              نسبة إنجاز التقييم الذاتي
            </span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle size={20} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
            <span style={{ fontSize: '32px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
              {kpis.completionPercentage}%
            </span>
            <span style={{ fontSize: '13px', color: '#059669', fontWeight: 700 }}>
              (تم إدخال {kpis.scoredIndicators} من أصل {kpis.totalIndicators} مؤشراً)
            </span>
          </div>

          {/* Progress bar inside card */}
          <div
            style={{
              height: '6px',
              backgroundColor: '#F1F5F9',
              borderRadius: '4px',
              overflow: 'hidden',
              marginTop: '14px',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${kpis.completionPercentage}%`,
                backgroundColor: '#059669',
                borderRadius: '4px',
              }}
            />
          </div>
        </div>

        {/* Card 2: الشواهد والمرفقات الموثقة */}
        <div
          onClick={() => onNavigate('evidences')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>
              الشواهد والمرفقات الموثقة
            </span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={20} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
            <span style={{ fontSize: '32px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
              {kpis.documentedEvidences}
            </span>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
              / {kpis.targetEvidences} مستند وثائقي وصورة ميدانية
            </span>
          </div>

          <div style={{ fontSize: '12px', color: '#10B981', marginTop: '10px', fontWeight: 600 }}>
            مفهرسة ومربوطة بالمؤشرات المعيارية
          </div>
        </div>

        {/* Card 3: نقاط القوة المحددة (2-3) */}
        <div
          onClick={() => onNavigate('ai-assistant')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>
              نقاط القوة المحددة (2-3)
            </span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={20} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
            <span style={{ fontSize: '32px', fontWeight: 900, color: '#059669', letterSpacing: '-0.5px' }}>
              {kpis.strengthsCount}
            </span>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
              عنصراً (تقدير متوسط أو متحقق كلياً)
            </span>
          </div>

          <div style={{ fontSize: '12px', color: '#059669', marginTop: '10px', fontWeight: 600 }}>
            تستوفي اشتراطات المعايير الوطنية
          </div>
        </div>

        {/* Card 4: فرص التحسين والفجوات (0-1) */}
        <div
          onClick={() => onNavigate('improvement-plan')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>
              فرص التحسين والفجوات (0-1)
            </span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#FEF2F2',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={20} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
            <span style={{ fontSize: '32px', fontWeight: 900, color: '#EF4444', letterSpacing: '-0.5px' }}>
              {kpis.gapsCount}
            </span>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
              عنصراً (تتطلب إدراجاً بخطة التحسين)
            </span>
          </div>

          <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '10px', fontWeight: 600 }}>
            تم ربطها بمبادرات خطة التحسين المدرسية
          </div>
        </div>
      </div>

      {/* 4. Core Widget: مسار دورة التقييم الحالية */}
      <CycleProgressTracker steps={dashboardData?.cycleSteps || []} />

      {/* 5. Two Columns: نسبة اكتمال المعايير السبعة + عناصر بحاجة للاستكمال */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
        }}
      >
        <StandardsProgressBar
          standards={dashboardData?.standardsProgress || []}
          onSelectStandard={(id) => onNavigate('standards-tree', id)}
        />

        <PendingIndicatorsTable
          indicators={dashboardData?.pendingIndicators || []}
          onOpenIndicator={(id) => onNavigate('rubric-assessment', id)}
        />
      </div>
    </div>
  );
};
