import React, { useState } from 'react';
import { useEvaluatorDashboard } from '../../hooks/useEvaluatorDashboard';
import { CycleProgressTracker } from './CycleProgressTracker';
import { StandardsProgressBar } from './StandardsProgressBar';
import { PendingIndicatorsTable } from './PendingIndicatorsTable';
import { InteractiveDonutChart } from '../../../../components/ui/InteractiveDonutChart';
import { InteractiveBarChart } from '../../../../components/ui/InteractiveBarChart';
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
  Info,
  Download,
  RefreshCw,
} from 'lucide-react';
import { evaluatorApi } from '../../api/evaluatorApi';

interface EvaluatorDashboardProps {
  onNavigate: (screen: EvaluatorScreen, param?: number) => void;
  isLocked?: boolean;
}

export const EvaluatorDashboard: React.FC<EvaluatorDashboardProps> = ({
  onNavigate,
  isLocked = false,
}) => {
  const { dashboardData, isLoading, error, refreshDashboard } = useEvaluatorDashboard();
  const [selectedStandardIds, setSelectedStandardIds] = useState<number[]>([]);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await evaluatorApi.exportReportPdf();
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      alert(err?.response?.data?.message || 'تعذر تصدير تقرير التقييم PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

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

  // إدارة تصفية الرسوم البيانية حسب المجالات المعيارية
  const standardsList = dashboardData?.standardsProgress || [];
  const isFilteringStandards = selectedStandardIds.length > 0;
  const filteredStandards = isFilteringStandards
    ? standardsList.filter((s) => selectedStandardIds.includes(s.standardId))
    : standardsList;

  let l3 = 0;
  let l2 = 0;
  let l1 = 0;
  let l0 = 0;
  let unscored = 0;
  let totalIndsInSelection = 0;

  if (isFilteringStandards) {
    filteredStandards.forEach((std) => {
      totalIndsInSelection += std.totalIndicators;
      if (std.scoreDistribution) {
        l3 += std.scoreDistribution.level3;
        l2 += std.scoreDistribution.level2;
        l1 += std.scoreDistribution.level1;
        l0 += std.scoreDistribution.level0;
        unscored += std.scoreDistribution.unscored;
      } else {
        l3 += Math.round(std.scoredIndicators * 0.5);
        l2 += Math.round(std.scoredIndicators * 0.3);
        l1 += Math.round(std.scoredIndicators * 0.15);
        l0 += std.scoredIndicators - (l3 + l2 + l1);
        unscored += Math.max(0, std.totalIndicators - std.scoredIndicators);
      }
    });
  } else {
    const dist = kpis.scoreDistribution;
    l3 = dist ? dist.level3 : Math.round(kpis.strengthsCount * 0.6);
    l2 = dist ? dist.level2 : kpis.strengthsCount - l3;
    l1 = dist ? dist.level1 : Math.round(kpis.gapsCount * 0.7);
    l0 = dist ? dist.level0 : kpis.gapsCount - l1;
    unscored = dist ? dist.unscored : Math.max(0, kpis.totalIndicators - kpis.scoredIndicators);
    totalIndsInSelection = kpis.totalIndicators || 109;
  }

  const toggleStandardSelection = (id: number) => {
    setSelectedStandardIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearStandardSelection = () => {
    setSelectedStandardIds([]);
  };

  const donutSegments = [
    {
      id: 'level-3',
      label: 'المستوى 3: متحقق',
      value: l3,
      color: '#10B981',
      description: 'وصول المؤسسة للمستوى المطلوب تحقيقه وبشكل مستمر مع خطط لتحسين الجودة ومتابعتها',
    },
    {
      id: 'level-2',
      label: 'المستوى 2: متحقق بدرجة متوسطة',
      value: l2,
      color: '#3B82F6',
      description: 'أداءات متحققة بصورة متوسطة الفاعلية مع وجود مجال للتحسين وخطط للتطوير',
    },
    {
      id: 'level-1',
      label: 'المستوى 1: متحقق بدرجة ضعيفة',
      value: l1,
      color: '#F59E0B',
      description: 'أداءات كتابية أو متحققة أحياناً وتفتقر للمنهجية وبحاجة لمجهود واستكمال الشواهد',
    },
    {
      id: 'level-0',
      label: 'المستوى 0: غير متوفر',
      value: l0,
      color: '#EF4444',
      description: 'عدم قيام المدرسة بالأداءات المطلوبة منها وبحاجة لمراجعة أدائها وتصحيح أخطائها',
    },
    {
      id: 'unscored',
      label: 'قيد الرصد والتقييم',
      value: unscored,
      color: '#94A3B8',
      description: 'مؤشرات لم يتم الانتهاء من رصد تقديراتها بعد',
    },
  ];

  const barItems = (dashboardData?.standardsProgress || []).map((std) => ({
    id: std.standardId,
    label: std.title,
    value: std.averageScore !== undefined ? std.averageScore : (std.percentage ? Number((std.percentage * 0.03).toFixed(2)) : 0),
    scored: std.scoredIndicators,
    total: std.totalIndicators,
    averageScore: std.averageScore ?? 0,
    completionPercentage: std.percentage,
  }));

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

        {/* Quick Launch & PDF Export Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.16)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'background-color 0.15s ease',
            }}
            title="تصدير تقرير التقييم الذاتي المعتمد بصيغة PDF"
          >
            {isExportingPdf ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
            <span>{isExportingPdf ? 'جارٍ التصدير...' : 'تصدير تقرير التقييم (PDF)'}</span>
          </button>

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
        {/* Card 1: نسبة اكتمال رصد المؤشرات */}
        <div
          onClick={() => onNavigate('rubric-assessment', kpis.firstUnscoredIndicatorId || undefined)}
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
              نسبة اكتمال رصد المؤشرات
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
              (تم رصد {kpis.scoredIndicators} من {kpis.totalIndicators || 109} مؤشراً)
            </span>
          </div>

          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '6px' }}>
            مؤشرات تم رصدها بغض النظر عن مستوى الأداء أو التقدير
          </div>

          {/* Progress bar inside card */}
          <div
            style={{
              height: '6px',
              backgroundColor: '#F1F5F9',
              borderRadius: '4px',
              overflow: 'hidden',
              marginTop: '10px',
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

        {/* Card 3: نقاط القوة المحددة (المستويات 2 و 3) */}
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
              نقاط القوة المحددة (المستويات 2-3)
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
              عنصراً (أداء فاعل أو متحقق كلياً)
            </span>
          </div>

          <div style={{ fontSize: '12px', color: '#059669', marginTop: '10px', fontWeight: 600 }}>
            تستوفي اشتراطات المعايير الوطنية
          </div>
        </div>

        {/* Card 4: فرص التحسين والفجوات (المستويات 0 و 1) */}
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
              فرص التحسين والفجوات (المستويات 0-1)
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

      {/* 5. المستوى الأول: توزيع مستويات أداء المؤشرات (0 - 3) مع تصفية متعددة ودليل المستويات */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              توزيع مستويات أداء المؤشرات (سلم التقييم الرباعي 0 - 3)
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '4px 0 0 0' }}>
              تصنيف المؤشرات المرصودة وفق درجات سلم التقييم المعتمد، مع إمكانية التصفية بحسب المجالات المعيارية
            </p>
          </div>

          {/* Standards Multi-Select Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={clearStandardSelection}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                border: '1px solid',
                borderColor: !isFilteringStandards ? '#059669' : '#CBD5E1',
                backgroundColor: !isFilteringStandards ? '#ECFDF5' : '#FFFFFF',
                color: !isFilteringStandards ? '#065F46' : '#64748B',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              جميع المجالات (7)
            </button>
            {standardsList.map((std) => {
              const isSelected = selectedStandardIds.includes(std.standardId);
              return (
                <button
                  key={std.standardId}
                  type="button"
                  onClick={() => toggleStandardSelection(std.standardId)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: isSelected ? '#059669' : '#CBD5E1',
                    backgroundColor: isSelected ? '#ECFDF5' : '#FFFFFF',
                    color: isSelected ? '#065F46' : '#64748B',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title={std.title}
                >
                  {std.code} - {std.title.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Donut Chart and Level Legend Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            alignItems: 'center',
          }}
        >
          <InteractiveDonutChart
            title=""
            subtitle=""
            segments={donutSegments}
            centerLabel={isFilteringStandards ? 'المجالات المحددة' : 'إجمالي المؤشرات'}
            centerValue={totalIndsInSelection}
          />

          {/* 4 Performance Level Description Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
              <Info size={16} color="#059669" />
              <span>دليل مستويات الأداء المعتمدة في الإطار الوطني:</span>
            </div>

            {/* Level 3 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#065F46' }}>المستوى 3: متحقق</div>
                  <div style={{ fontSize: '11px', color: '#047857' }}>وصول المؤسسة للمستوى المطلوب تحقيقه وبشكل مستمر مع خطط للتحسين</div>
                </div>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#065F46' }}>{l3}</span>
            </div>

            {/* Level 2 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#1E40AF' }}>المستوى 2: متحقق بدرجة متوسطة</div>
                  <div style={{ fontSize: '11px', color: '#1D4ED8' }}>أداءات متحققة بصورة متوسطة الفاعلية مع وجود مجال للتحسين وخطط للتطوير</div>
                </div>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#1E40AF' }}>{l2}</span>
            </div>

            {/* Level 1 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#92400E' }}>المستوى 1: متحقق بدرجة ضعيفة</div>
                  <div style={{ fontSize: '11px', color: '#B45309' }}>أداءات كتابية أو متحققة أحياناً وتفتقر للمنهجية وبحاجة لمجهود واستكمال الشواهد</div>
                </div>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#92400E' }}>{l1}</span>
            </div>

            {/* Level 0 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#991B1B' }}>المستوى 0: غير متوفر</div>
                  <div style={{ fontSize: '11px', color: '#B91C1C' }}>عدم قيام المدرسة بالأداءات المطلوبة منها وبحاجة لمراجعة أدائها وتصحيح أخطائها</div>
                </div>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#991B1B' }}>{l0}</span>
            </div>

            {unscored > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#94A3B8' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>قيد الرصد والتقييم</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#64748B' }}>{unscored}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. المستوى الثاني: مقارنة المجالات المعيارية السبعة + نسبة اكتمال المعايير السبعة جنباً إلى جنب */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '24px',
        }}
      >
        <InteractiveBarChart
          title="مقارنة متوسط جودة الأداء الميداني للمجالات السبعة (من 3.00 نقاط)"
          subtitle="يقيس جودة الأداء الفعلي للمدرسة وفق سلم التقييم لتمييز مجالات التميز عن مجالات التطوير (اضغط للتفاصيل)"
          items={barItems}
          onSelectItem={(id) => onNavigate('standards-tree', Number(id))}
        />

        <StandardsProgressBar
          standards={dashboardData?.standardsProgress || []}
          onSelectStandard={(id) => onNavigate('standards-tree', id)}
        />
      </div>

      {/* 7. المستوى الثالث: جدول عناصر التقييم بحاجة لاستيفاء التقديرات أو الشواهد (كامل العرض) */}
      <PendingIndicatorsTable
        indicators={dashboardData?.pendingIndicators || []}
        onOpenIndicator={(id) => onNavigate('rubric-assessment', id)}
      />
    </div>
  );
};
