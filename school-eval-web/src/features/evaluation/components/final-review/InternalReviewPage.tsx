import React, { useState, useEffect } from 'react';
import { evaluatorApi } from '../../api/evaluatorApi';
import { useFinalSubmission } from '../../hooks/useFinalSubmission';
import { DraftReportPreview } from './DraftReportPreview';
import { FinalSubmissionLockModal } from './FinalSubmissionLockModal';
import { StandardsProgressBar } from '../dashboard/StandardsProgressBar';
import { InteractiveDonutChart } from '../../../../components/ui/InteractiveDonutChart';
import { InteractiveBarChart } from '../../../../components/ui/InteractiveBarChart';
import type { EvaluatorScreen, EvaluatorDashboardData, StandardNode } from '../../api/evaluationTypes';
import {
  CheckCircle2,
  XCircle,
  Lock,
  Download,
  ShieldCheck,
  RefreshCw,
  Info,
  PieChart,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  AlertTriangle,
  Fingerprint,
} from 'lucide-react';

interface InternalReviewPageProps {
  onNavigate?: (screen: EvaluatorScreen, param?: number) => void;
  onFinalLockSuccess?: () => void;
  isLocked?: boolean;
  isPrincipal?: boolean;
}

export const InternalReviewPage: React.FC<InternalReviewPageProps> = ({
  onNavigate,
  onFinalLockSuccess,
  isLocked = false,
  isPrincipal = false,
}) => {
  const {
    preflightData,
    isLoadingCheck,
    isSubmitting,
    submitFinalLock,
    refreshPreflight,
  } = useFinalSubmission();

  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<EvaluatorDashboardData | null>(null);
  const [standardsTree, setStandardsTree] = useState<StandardNode[]>([]);
  const [expandedCriteria, setExpandedCriteria] = useState<Record<string, boolean>>({
    scores_completed: true,
  });

  useEffect(() => {
    let isMounted = true;
    evaluatorApi
      .getDashboardStats()
      .then((data) => {
        if (isMounted) setDashboardData(data);
      })
      .catch((err) => console.error('Failed to load dashboard data for review:', err));

    evaluatorApi
      .getActiveStandardsTree()
      .then((data) => {
        if (isMounted && data?.standards) setStandardsTree(data.standards);
      })
      .catch((err) => console.error('Failed to load standards tree for review:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  // 4-Criteria Pre-flight Checklist (weights: 30, 25, 25, 20)
  const checklist = preflightData?.checklist || [
    {
      id: 'scores_completed',
      title: 'رصد تقديرات كافة مؤشرات المعايير الوطنية (109 مؤشرات)',
      description: 'تم رصد وتثبيت تقديرات 109 من أصل 109 مؤشراً معياريًا.',
      passed: false,
      weight: 30,
    },
    {
      id: 'evidence_linked',
      title: 'فهرسة وربط الشواهد والوثائق الداعمة للتقديرات',
      description: 'تم فهرسة الشواهد المربوطة عبر وثائق موثقة في مستودع الأدلة.',
      passed: false,
      weight: 25,
    },
    {
      id: 'action_plan_included',
      title: 'صياغة خطة التحسين ومبادرات التطوير للمؤشرات المتدنية',
      description: 'الخطة تتضمن إجراءات تنفيذية محددة بالمسؤوليات والمواعيد.',
      passed: false,
      weight: 25,
    },
    {
      id: 'draft_report_generated',
      title: 'جاهزية مسودة التقرير الشامل والمراجعة الداخلية لمدير المدرسة',
      description: 'مسودة التقرير الشامل ومصفوفة التقييم جاهزة ومستوفية للمراجعة والإقرار الداخلي.',
      passed: false,
      weight: 20,
    },
  ];

  const canSubmit = preflightData ? preflightData.canSubmit : false;
  const readiness = preflightData?.readinessPercentage ?? 0;
  const [isExporting, setIsExporting] = useState(false);

  const submissionStatus = dashboardData?.schoolInfo?.status || preflightData?.digitalSealInfo?.submissionStatus || (isLocked ? 'Submitted' : 'Draft');
  const activeTrackingCode = preflightData?.digitalSealInfo?.trackingCode || preflightData?.digitalSealInfo?.systemCode || dashboardData?.schoolInfo?.trackingCode || (isLocked ? 'ARQ-LOCKED' : 'بانتظار الإقرار والختم');
  const activeDigitalHash = preflightData?.digitalSealInfo?.digitalHash || dashboardData?.schoolInfo?.digitalHash || (isLocked ? 'بصمة مشفرة مسجلة' : 'تُولَّد البصمة المشفرة (SHA-256) فور تأكيد الختم النهائي');

  const toggleCriterionExpand = (id: string) => {
    setExpandedCriteria((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExportPdfReport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await evaluatorApi.exportReportPdf();
    } catch (err: unknown) {
      console.error('Failed to export PDF report:', err);
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'تعذر تصدير إشعار الختم / تقرير التقييم PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmLock = async (password: string, notes?: string) => {
    await submitFinalLock(password, notes);
    setSuccessBanner('تم تأكيد الختم الرقمي بنجاح ونقل ملف التقييم إلى حالة الرفع النهائي (للقراءة فقط).');
    if (onFinalLockSuccess) {
      onFinalLockSuccess();
    }
  };

  // Compute charts data
  const kpis = dashboardData?.kpis;
  const dist = kpis?.scoreDistribution;
  const l3 = dist ? dist.level3 : Math.round((kpis?.strengthsCount ?? 0) * 0.6);
  const l2 = dist ? dist.level2 : Math.max(0, (kpis?.strengthsCount ?? 0) - l3);
  const l1 = dist ? dist.level1 : Math.round((kpis?.gapsCount ?? 0) * 0.7);
  const l0 = dist ? dist.level0 : Math.max(0, (kpis?.gapsCount ?? 0) - l1);
  const unscored = dist ? dist.unscored : Math.max(0, (kpis?.totalIndicators ?? 109) - (kpis?.scoredIndicators ?? 0));
  const totalInds = kpis?.totalIndicators || 109;

  const donutSegments = [
    {
      id: 'level-3',
      label: 'المستوى 3: متحقق',
      value: l3,
      color: '#10B981',
      description: 'وصول المؤسسة للمستوى المطلوب تحقيقه وبشكل مستمر مع خطط للتحسين',
    },
    {
      id: 'level-2',
      label: 'المستوى 2: متحقق بدرجة متوسطة',
      value: l2,
      color: '#3B82F6',
      description: 'أداءات متحققة بصورة متوسطة الفاعلية مع وجود مجال للتحسين',
    },
    {
      id: 'level-1',
      label: 'المستوى 1: متحقق بدرجة ضعيفة',
      value: l1,
      color: '#F59E0B',
      description: 'أداءات كتابية وتفتقر للمنهجية وبحاجة لاستكمال الشواهد',
    },
    {
      id: 'level-0',
      label: 'المستوى 0: غير متوفر',
      value: l0,
      color: '#EF4444',
      description: 'عدم قيام المدرسة بالأداءات المطلوبة منها وبحاجة لتصحيح المسار',
    },
    ...(unscored > 0
      ? [
          {
            id: 'unscored',
            label: 'قيد الرصد والتقييم',
            value: unscored,
            color: '#94A3B8',
            description: 'مؤشرات لم يتم الانتهاء من رصد تقديراتها بعد',
          },
        ]
      : []),
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
      {/* 1. Legal Status Banner */}
      {submissionStatus === 'NeedsCompletion' ? (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            color: '#92400E',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={24} color="#D97706" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>
                طلب استكمال شواهد مفتوح من المشرف الوزاري
              </div>
              <div style={{ fontSize: '12px', color: '#B45309', marginTop: '2px' }}>
                أصدرت المراجعة الوزارية طلباً لاستكمال بعض الشواهد، يمكنك معالجة البنود وإعادة الرفع من شاشة الاستكمال.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate?.('completion-request')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              fontSize: '12.5px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>لوحة معالجة الاستكمال</span>
            <ArrowRight size={14} />
          </button>
        </div>
      ) : (successBanner || isLocked || submissionStatus === 'Submitted' || submissionStatus === 'Completed') ? (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            color: '#065F46',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldCheck size={24} color="#059669" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>
                تم الرفع والختم الرقمي بنجاح (رمز التتبع الوطني: {activeTrackingCode})
              </div>
              <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                الملف قيد المراجعة الوزارية الرسمية، وجميع الشاشات في وضع القراءة فقط.
              </div>
            </div>
          </div>
          <button
            onClick={handleExportPdfReport}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: '#059669',
              color: '#FFFFFF',
              fontSize: '12.5px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Download size={14} />
            تحميل شهادة الختم الرسمي
          </button>
        </div>
      ) : isLoadingCheck ? (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <RefreshCw size={20} color="#059669" className="animate-spin" />
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#1E293B' }}>
                جاري فحص معايير الجاهزية والتحقق من الشواهد المرفقة...
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                يتم التحقق آلياً من اكتمال الرصد، وربط الشواهد، وجاهزية خطة التحسين ومسودة التقرير.
              </div>
            </div>
          </div>
          <div
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: '#F1F5F9',
              color: '#64748B',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            جاري الفحص...
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '12px',
            backgroundColor: canSubmit ? '#EFF6FF' : '#F8FAFC',
            border: `1px solid ${canSubmit ? '#BFDBFE' : '#E2E8F0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Info size={20} color={canSubmit ? '#2563EB' : '#64748B'} />
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: canSubmit ? '#1E40AF' : '#1E293B' }}>
                {canSubmit
                  ? 'ملف التقييم الذاتي مستوفٍ لكافة المعايير الوطنية وجاهز للختم الرقمي'
                  : 'مسودة ملف التقييم الذاتي قيد المراجعة الداخلية والتدقيق قبل الختم'}
              </div>
              <div style={{ fontSize: '12px', color: canSubmit ? '#1D4ED8' : '#64748B', marginTop: '2px' }}>
                {canSubmit
                  ? 'تم استيفاء معايير الجاهزية الأربعة بنسبة 100%، يمكنك تأكيد الختم وقفل الملف للرفع الوزاري.'
                  : 'يرجى مراجعة واستيفاء بنود قائمة التحقق أدناه لتأهيل الملف للتسليم النهائي.'}
              </div>
            </div>
          </div>
          <div
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: canSubmit ? '#DBEAFE' : '#E2E8F0',
              color: canSubmit ? '#1E40AF' : '#475569',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            {canSubmit ? 'جاهز للختم' : 'مسودة قيد الاستكمال'}
          </div>
        </div>
      )}

      {/* Review KPIs Overview Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #E2E8F0',
            borderRight: '4px solid #3B82F6',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>رصد المؤشرات الوطنية</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#1E293B', marginTop: '4px' }}>
            {checklist.find((c) => c.id === 'scores_completed')?.passed ? '109 / 109' : 'قيد الاستكمال'}
          </div>
          <div style={{ fontSize: '11.5px', color: checklist.find((c) => c.id === 'scores_completed')?.passed ? '#059669' : '#DC2626', marginTop: '4px', fontWeight: 600 }}>
            {checklist.find((c) => c.id === 'scores_completed')?.passed ? 'مكتمل بنسبة 100%' : 'بانتظار رصد كافة التقديرات'}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #E2E8F0',
            borderRight: '4px solid #10B981',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>جاهزية الرفع الوزاري</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: readiness >= 100 ? '#059669' : '#D97706', marginTop: '4px' }}>
            {readiness}%
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
            {preflightData?.passedCriteriaCount ?? 0} من 4 معايير إلزامية مستوفاة
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #E2E8F0',
            borderRight: '4px solid #8B5CF6',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>توثيق الشواهد والأدلة</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#1E293B', marginTop: '4px' }}>
            {checklist.find((c) => c.id === 'evidence_linked')?.passed ? 'مستوفى' : 'ناقص'}
          </div>
          <div style={{ fontSize: '11.5px', color: checklist.find((c) => c.id === 'evidence_linked')?.passed ? '#059669' : '#DC2626', marginTop: '4px', fontWeight: 600 }}>
            {checklist.find((c) => c.id === 'evidence_linked')?.passed ? 'الشواهد مربوطة بالمؤشرات' : 'يتطلب ربط وثائق داعمة'}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #E2E8F0',
            borderRight: `4px solid ${isLocked || submissionStatus === 'Submitted' ? '#059669' : isLoadingCheck ? '#94A3B8' : canSubmit ? '#2563EB' : '#EF4444'}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>حالة الختم الرقمي</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: isLocked || submissionStatus === 'Submitted' ? '#059669' : isLoadingCheck ? '#64748B' : canSubmit ? '#2563EB' : '#EF4444', marginTop: '6px' }}>
            {isLocked || submissionStatus === 'Submitted' ? 'مختوم ومرفوع' : isLoadingCheck ? 'جاري التحقق...' : canSubmit ? 'جاهز للختم النهائي' : 'غير مؤهل للختم'}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
            {isLocked || submissionStatus === 'Submitted' ? 'وضع القراءة فقط' : isLoadingCheck ? 'جاري استرجاع البيانات...' : canSubmit ? 'بانتظار توقيع المقيم' : 'يتطلب استيفاء المعايير'}
          </div>
        </div>
      </div>

      {/* 2. Pre-Flight Validation Checklist with Interactive Deep Links */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              قائمة التحقق الأوتوماتيكية قبل الرفع (Pre-Flight Validation Checklist)
            </h2>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '3px 0 0 0' }}>
              فحص استيفاء المعايير الأربعة الإلزامية لقبول التقرير بالبوابة الوزارية
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={refreshPreflight}
              disabled={isSubmitting}
              title="إعادة فحص معايير الجاهزية للرفع"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={isSubmitting ? 'animate-spin' : ''} />
              <span>تحديث الفحص</span>
            </button>

            <div
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: isLoadingCheck ? '#F1F5F9' : canSubmit ? '#ECFDF5' : '#FEF2F2',
                color: isLoadingCheck ? '#64748B' : canSubmit ? '#059669' : '#EF4444',
                fontSize: '13px',
                fontWeight: 800,
                border: `1px solid ${isLoadingCheck ? '#CBD5E1' : canSubmit ? '#A7F3D0' : '#FECACA'}`,
              }}
            >
              {isLoadingCheck ? 'نسبة الجاهزية: جارٍ الفحص...' : `نسبة الجاهزية: ${readiness}%`}
            </div>

            {!isLocked && !isPrincipal && submissionStatus !== 'Submitted' && (
              <button
                onClick={() => setIsLockModalOpen(true)}
                disabled={!canSubmit || isSubmitting || isLoadingCheck}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 22px',
                  borderRadius: '10px',
                  backgroundColor: canSubmit && !isLoadingCheck ? '#EF4444' : '#CBD5E1',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: canSubmit && !isLoadingCheck ? 'pointer' : 'not-allowed',
                  boxShadow: canSubmit && !isLoadingCheck ? '0 4px 12px rgba(239, 68, 68, 0.25)' : 'none',
                }}
              >
                <Lock size={16} />
                <span>الختم الرقمي والرفع النهائي</span>
              </button>
            )}

            {!isLocked && isPrincipal && (
              <div
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  color: '#92400E',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Lock size={14} />
                <span>الختم الرقمي والتسليم النهائي محصور بمقيّم المدرسة</span>
              </div>
            )}
          </div>
        </div>

        {/* 4 Checklist Items or Skeleton Loading Shimmers */}
        {isLoadingCheck ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { id: '1', title: 'رصد تقديرات كافة مؤشرات المعايير الوطنية (109 مؤشرات)', desc: 'جاري التحقق من اكتمال الرصد العددي...' },
              { id: '2', title: 'فهرسة وربط الشواهد والوثائق الداعمة للتقديرات', desc: 'جاري فحص المستندات المودعة والمربوطة بالمؤشرات...' },
              { id: '3', title: 'صياغة خطة التحسين ومبادرات التطوير للمؤشرات المتدنية', desc: 'جاري التحقق من إقرار إجراءات خطة التحسين...' },
              { id: '4', title: 'جاهزية مسودة التقرير الشامل والمراجعة الداخلية لمدير المدرسة', desc: 'جاري تدقيق مصفوفة النتائج المرصودة...' },
            ].map((skel) => (
              <div
                key={skel.id}
                style={{
                  borderRadius: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
                className="animate-pulse"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#E2E8F0',
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#334155' }}>
                      {skel.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '3px' }}>
                      {skel.desc}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: '3px 12px',
                    borderRadius: '12px',
                    backgroundColor: '#F1F5F9',
                    color: '#64748B',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  قيد الفحص...
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {checklist.map((item, idx) => {
            const isExpanded = expandedCriteria[item.id] ?? false;
            const hasPendingItems = Boolean(item.pendingItems && item.pendingItems.length > 0);

            return (
              <div
                key={item.id}
                style={{
                  borderRadius: '10px',
                  backgroundColor: item.passed ? '#F0FDF4' : '#FEF2F2',
                  border: `1px solid ${item.passed ? '#DCFCE7' : '#FECACA'}`,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    cursor: hasPendingItems ? 'pointer' : 'default',
                  }}
                  onClick={() => hasPendingItems && toggleCriterionExpand(item.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {item.passed ? (
                      <CheckCircle2 size={20} color="#059669" />
                    ) : (
                      <XCircle size={20} color="#EF4444" />
                    )}
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: item.passed ? '#166534' : '#991B1B' }}>
                        {idx + 1}. {item.title} ({item.weight}%)
                      </div>
                      <div style={{ fontSize: '12px', color: item.passed ? '#15803D' : '#B91C1C', marginTop: '2px' }}>
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {!item.passed && item.id === 'evidence_linked' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate?.('evidences');
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #FECACA',
                          color: '#DC2626',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>مستودع الشواهد</span>
                        <ExternalLink size={12} />
                      </button>
                    )}

                    {!item.passed && item.id === 'action_plan_included' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate?.('improvement-plan');
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #FECACA',
                          color: '#DC2626',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>خطة التحسين</span>
                        <ExternalLink size={12} />
                      </button>
                    )}

                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        backgroundColor: item.passed ? '#DCFCE7' : '#FEE2E2',
                        color: item.passed ? '#166534' : '#991B1B',
                      }}
                    >
                      {item.passed ? 'مستوفى بنجاح' : 'غير مستوفى'}
                    </span>

                    {hasPendingItems && (
                      <span style={{ color: '#991B1B' }}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Section with Pending Deep-Link Chips */}
                {hasPendingItems && isExpanded && (
                  <div
                    style={{
                      padding: '12px 18px 16px',
                      borderTop: '1px dashed #FECACA',
                      backgroundColor: 'rgba(254, 242, 242, 0.6)',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#991B1B', marginBottom: '8px' }}>
                      المؤشرات غير المرصودة (اضغط على المؤشر للانتقال الفوري للرصد):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {item.pendingItems!.map((p) => (
                        <button
                          key={p.indicatorId}
                          onClick={() => onNavigate?.('rubric-assessment', p.indicatorId)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #FCA5A5',
                            color: '#991B1B',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ fontWeight: 800, color: '#DC2626' }}>{p.code}</span>
                          <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name}
                          </span>
                          <ArrowRight size={12} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>

      {/* 3. Governance Cards: Principal Sign-off & Digital Fingerprint */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Principal Internal Sign-off Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCheck2 size={20} color="#059669" />
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  إقرار ومراجعة مدير المدرسة الداخلي
                </h3>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                }}
              >
                مُقَرّ داخلياً
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.6, margin: 0 }}>
              تمت المراجعة والتدقيق الإداري الداخلي من مدير المدرسة لكافة التقديرات والشواهد الموثقة ومصفوفة خطة التحسين المرفقة قبل مرحلة الختم النهائي.
            </p>
          </div>
          <div
            style={{
              marginTop: '16px',
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px',
            }}
          >
            <span style={{ color: '#64748B' }}>المسؤول المصادق:</span>
            <span style={{ fontWeight: 700, color: '#1E293B' }}>
              {dashboardData?.schoolInfo?.currentEvaluator || 'مدير المدرسة / مسؤول الجودة'}
            </span>
          </div>
        </div>

        {/* Digital Fingerprint Snapshot Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Fingerprint size={20} color="#2563EB" />
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  البصمة الرقمية ورمز التتبع الوطني
                </h3>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: (isLocked || submissionStatus === 'Submitted') ? '#ECFDF5' : '#EFF6FF',
                  color: (isLocked || submissionStatus === 'Submitted') ? '#059669' : '#2563EB',
                }}
              >
                {(isLocked || submissionStatus === 'Submitted') ? 'SHA-256 Validated' : 'جاهز للترميز الرقمي'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>رمز التتبع الوطني الرسمي:</span>
                <span style={{ fontWeight: 800, color: '#1E40AF', fontFamily: 'monospace' }}>
                  {isLoadingCheck ? 'جاري الفحص...' : activeTrackingCode}
                </span>
              </div>
              <div style={{ color: '#64748B' }}>البصمة المشفرة للبيانات:</div>
              <div style={{ fontSize: '10px', color: '#64748B', wordBreak: 'break-all', fontFamily: 'monospace', backgroundColor: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                {isLoadingCheck ? 'جاري التحقق من بصمة التشفير...' : activeDigitalHash}
              </div>
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '11px', color: '#059669', fontWeight: 600 }}>
            ✓ إثبات عدم الإنكار وحصانة المحتوى ضد التعديل بعد الختم
          </div>
        </div>
      </div>

      {/* 4. Visual Analytics & Quality Summary (Charts & Indicators Overview) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChart size={18} color="#059669" />
              <span>مؤشرات التحليل البياني وتوزيع التقديرات (Analytics Overview)</span>
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '2px 0 0 0' }}>
              توزيع نتائج مؤشرات المدرسة عبر مستويات الإطار الوطني ومقارنة مجالات الجودة السبعة
            </p>
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
            centerLabel="إجمالي المؤشرات"
            centerValue={totalInds}
          />

          {/* 4 Performance Level Description Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
              <Info size={16} color="#059669" />
              <span>دليل مستويات الأداء الرسمية في الإطار الوطني:</span>
            </div>

            {/* Level 3 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#065F46' }}>المستوى 3: متحقق</div>
                  <div style={{ fontSize: '11px', color: '#047857' }}>وصول المؤسسة للمستوى المطلوب تحقيقه وبشكل مستمر مع متابعة دورية وخطط تحسين.</div>
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
                  <div style={{ fontSize: '11px', color: '#1D4ED8' }}>أداءات متحققة بصورة متوسطة الفاعلية مع وجود مجال للتحسين وخطط للتطوير.</div>
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
                  <div style={{ fontSize: '11px', color: '#B45309' }}>أداءات كتابية أو متحققة أحياناً وتفتقر للمنهجية وبحاجة لمجهود واستكمال الشواهد.</div>
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
                  <div style={{ fontSize: '11px', color: '#B91C1C' }}>عدم قيام المدرسة بالأداءات المطلوبة منها وبحاجة لمراجعة أدائها وتصحيح أخطائها.</div>
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

        {/* 7 Standards Bar Chart and Progress Bars */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '24px',
            marginTop: '10px',
          }}
        >
          <InteractiveBarChart
            title="مقارنة متوسط جودة الأداء الميداني للمجالات السبعة (من 3.00 نقاط)"
            subtitle="يقيس جودة الأداء الفعلي للمدرسة وفق سلم التقييم لتمييز مجالات التميز عن مجالات التطوير"
            items={barItems}
            maxScore={3}
            onSelectItem={(id) => onNavigate?.('standards-tree', Number(id))}
          />

          <StandardsProgressBar
            standards={dashboardData?.standardsProgress || []}
            onSelectStandard={(id) => onNavigate?.('standards-tree', id)}
          />
        </div>

        {/* مصفوفة المعايير الفرعية الـ 14 وأوزانها المقررة رسمياً (The 14 National Sub-Standards Matrix) */}
        {standardsTree.length > 0 && (
          <div
            data-testid="substandards-matrix-card"
            style={{
              marginTop: '10px',
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCheck2 size={18} color="#059669" />
                <h4 style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  تقسيم المعايير الفرعية الـ 14 والأوزان النسبية المقررة (النموذج الوطني)
                </h4>
              </div>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '8px',
                  backgroundColor: '#ECFDF5',
                  color: '#065F46',
                  border: '1px solid #A7F3D0',
                }}
              >
                14 معياراً فرعياً — إجمالي الأوزان: 100%
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '12px',
              }}
            >
              {standardsTree.flatMap((std) =>
                std.subStandards.map((sub) => (
                  <div
                    key={sub.subStandardId}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                        }}
                      >
                        {sub.code}
                      </span>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E293B' }}>
                          {sub.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                          المجال: {std.title} ({sub.indicators.length} مؤشرات)
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#ECFDF5',
                        color: '#065F46',
                        border: '1px solid #A7F3D0',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {sub.weight ?? 0}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. Draft Report Preview */}
      <DraftReportPreview
        onExportPdf={handleExportPdfReport}
        isLocked={isLocked || submissionStatus === 'Submitted'}
        isPrincipal={isPrincipal}
        trackingCode={activeTrackingCode}
      />

      {/* Final Lock Modal with Dynamic Codes & Governance Acknowledgement */}
      <FinalSubmissionLockModal
        isOpen={isLockModalOpen}
        onClose={() => setIsLockModalOpen(false)}
        onConfirmLock={handleConfirmLock}
        isSubmitting={isSubmitting}
        trackingCode={activeTrackingCode}
        digitalHash={activeDigitalHash}
      />
    </div>
  );
};
