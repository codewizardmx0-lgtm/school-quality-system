import { evaluatorApi } from '../../api/evaluatorApi';
import React, { useState } from 'react';
import { useFinalSubmission } from '../../hooks/useFinalSubmission';
import { DraftReportPreview } from './DraftReportPreview';
import { FinalSubmissionLockModal } from './FinalSubmissionLockModal';
import type { EvaluatorScreen } from '../../api/evaluationTypes';
import {
  CheckCircle2,
  XCircle,
  Lock,
  Download,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface InternalReviewPageProps {
  onNavigate?: (screen: EvaluatorScreen) => void;
  onFinalLockSuccess?: () => void;
  isLocked?: boolean;
  isPrincipal?: boolean;
}

export const InternalReviewPage: React.FC<InternalReviewPageProps> = ({
  onFinalLockSuccess,
  isLocked = false,
  isPrincipal = false,
}) => {
  const {
    preflightData,
    isSubmitting,
    submitFinalLock,
    refreshPreflight,
  } = useFinalSubmission();

  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const checklist = preflightData?.checklist || [
    { id: 'scores_completed', title: 'رصد تقديرات كافة مؤشرات المعايير الوطنية (109 مؤشرات)', description: 'تم رصد وتثبيت تقديرات 109 من أصل 109 مؤشراً معياريًا.', passed: false, weight: 25 },
    { id: 'verification_methods_set', title: 'تحديد أدوات وأساليب التحقق المعتمدة لكل مؤشر', description: 'تم استيفاء أساليب فحص الوثائق وبطاقات الملاحظة والمقابلات.', passed: false, weight: 20 },
    { id: 'evidence_linked', title: 'فهرسة وربط الشواهد والوثائق الداعمة للتقديرات', description: 'تم إيداع وفهرسة الشواهد الموثقة في مستودع الأدلة بنجاح.', passed: false, weight: 20 },
    { id: 'action_plan_included', title: 'صياغة خطة التحسين ومبادرات التطوير للمؤشرات المتدنية', description: 'الخطة تتضمن إجراءات تنفيذية محددة بالمسؤوليات والمواعيد.', passed: false, weight: 20 },
    { id: 'draft_report_generated', title: 'جاهزية مسودة التقرير الشامل والمراجعة الداخلية لمدير المدرسة', description: 'التقرير متكامل ومراجع ومطابق لاشتراطات الرفع الوزاري.', passed: false, weight: 15 },
  ];

  const canSubmit = preflightData ? preflightData.canSubmit : false;
  const readiness = preflightData?.readinessPercentage ?? 0;

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdfReport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await evaluatorApi.exportReportPdf();
    } catch (err: any) {
      console.error('Failed to export PDF report:', err);
      alert(err?.response?.data?.message || 'تعذر تصدير إشعار الختم / تقرير التقييم PDF.');
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

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Success Notification after lock */}
      {(successBanner || isLocked) && (
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
                تم الرفع والختم الرقمي بنجاح (رمز التتبع: {preflightData?.digitalSealInfo?.systemCode || 'ARQ-2026-FINAL'})
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
            تحميل إشعار الختم
          </button>
        </div>
      )}

      {/* Review KPIs Overview (Note 36) */}
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
            {preflightData?.passedCriteriaCount ?? 0} من 5 معايير إلزامية مستوفاة
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
            borderRight: `4px solid ${isLocked ? '#059669' : canSubmit ? '#2563EB' : '#EF4444'}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>حالة الختم الرقمي</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: isLocked ? '#059669' : canSubmit ? '#2563EB' : '#EF4444', marginTop: '6px' }}>
            {isLocked ? 'مختوم ومرفوع' : canSubmit ? 'جاهز للختم النهائي' : 'غير مؤهل للختم'}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
            {isLocked ? 'وضع القراءة فقط' : canSubmit ? 'بانتظار توقيع المقيم' : 'يتطلب استيفاء المعايير'}
          </div>
        </div>
      </div>

      {/* 1. Pre-Flight Validation Checklist */}
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
              فحص استيفاء المعايير الخمسة الإلزامية لقبول التقرير بالبوابة الوزارية
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
                backgroundColor: canSubmit ? '#ECFDF5' : '#FEF2F2',
                color: canSubmit ? '#059669' : '#EF4444',
                fontSize: '13px',
                fontWeight: 800,
                border: `1px solid ${canSubmit ? '#A7F3D0' : '#FECACA'}`,
              }}
            >
              نسبة الجاهزية: {readiness}%
            </div>

            {!isLocked && !isPrincipal && (
              <button
                onClick={() => setIsLockModalOpen(true)}
                disabled={!canSubmit || isSubmitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 22px',
                  borderRadius: '10px',
                  backgroundColor: canSubmit ? '#EF4444' : '#CBD5E1',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  boxShadow: canSubmit ? '0 4px 12px rgba(239, 68, 68, 0.25)' : 'none',
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
                <span>الختم الرقمي والتسليم النهائي محصور بمقيم المدرسة المعتمد</span>
              </div>
            )}
          </div>
        </div>

        {/* 5 Checklist Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {checklist.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: '10px',
                backgroundColor: item.passed ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${item.passed ? '#DCFCE7' : '#FECACA'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {item.passed ? (
                  <CheckCircle2 size={20} color="#059669" />
                ) : (
                  <XCircle size={20} color="#EF4444" />
                )}
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: item.passed ? '#166534' : '#991B1B' }}>
                    {idx + 1}. {item.title}
                  </div>
                  <div style={{ fontSize: '12px', color: item.passed ? '#15803D' : '#B91C1C', marginTop: '2px' }}>
                    {item.description}
                  </div>
                </div>
              </div>

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
            </div>
          ))}
        </div>
      </div>

      {/* 2. Draft Report Preview */}
      <DraftReportPreview
        onExportPdf={handleExportPdfReport}
        isLocked={isLocked}
        isPrincipal={isPrincipal}
        trackingCode={preflightData?.digitalSealInfo?.systemCode}
      />

      {/* Final Lock Modal */}
      <FinalSubmissionLockModal
        isOpen={isLockModalOpen}
        onClose={() => setIsLockModalOpen(false)}
        onConfirmLock={handleConfirmLock}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
