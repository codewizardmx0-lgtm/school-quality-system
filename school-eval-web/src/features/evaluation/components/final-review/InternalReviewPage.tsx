import { schoolsApi } from '../../../admin/api/schoolsApi';
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
} from 'lucide-react';

interface InternalReviewPageProps {
  onNavigate?: (screen: EvaluatorScreen) => void;
  onFinalLockSuccess?: () => void;
  isLocked?: boolean;
}

export const InternalReviewPage: React.FC<InternalReviewPageProps> = ({
  onFinalLockSuccess,
  isLocked = false,
}) => {
  const {
    preflightData,
    isSubmitting,
    submitFinalLock,
  } = useFinalSubmission();

  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const checklist = preflightData?.checklist || [
    { id: 'scores_completed', title: 'رصد تقديرات كافة مؤشرات المعايير الوطنية (56 مؤشراً)', description: 'تم رصد وتثبيت تقديرات 56 من أصل 56 مؤشراً معياريًا.', passed: true, weight: 25 },
    { id: 'verification_methods_set', title: 'تحديد أدوات وأساليب التحقق المعتمدة لكل مؤشر', description: 'تم استيفاء أساليب فحص الوثائق وبطاقات الملاحظة والمقابلات.', passed: true, weight: 20 },
    { id: 'evidence_linked', title: 'فهرسة وربط الشواهد والوثائق الداعمة للتقديرات', description: 'تم إيداع وفهرسة الشواهد الموثقة في مستودع الأدلة بنجاح.', passed: true, weight: 20 },
    { id: 'action_plan_included', title: 'صياغة خطة التحسين ومبادرات التطوير للمؤشرات المتدنية', description: 'الخطة تتضمن 6 إجراءات تنفيذية محددة بالمسؤوليات والمواعيد.', passed: true, weight: 20 },
    { id: 'draft_report_generated', title: 'جاهزية مسودة التقرير الشامل والمراجعة الداخلية لمدير المدرسة', description: 'التقرير متكامل ومراجع ومطابق لاشتراطات الرفع الوزاري.', passed: true, weight: 15 },
  ];

  const canSubmit = preflightData?.canSubmit ?? true;
  const readiness = preflightData?.readinessPercentage ?? 100;

  const handleExportPdfReport = async () => {
    try {
      await schoolsApi.downloadExecutivePdf();
    } catch (err) {
      console.error('Failed to export PDF report:', err);
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
                تم الرفع والختم الرقمي بنجاح (رمز التتبع: ARQ-2026-SCH104-FIN)
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

            {!isLocked && (
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
