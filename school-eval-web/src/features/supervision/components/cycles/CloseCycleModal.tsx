import React from 'react';
import { Loader2, Lock } from 'lucide-react';
import type { EvaluationCycleItem } from '../../api/supervisionTypes';

interface CloseCycleModalProps {
  cycle: EvaluationCycleItem | null;
  isClosingCycle: boolean;
  closeSuccessMessage: string | null;
  closeErrorMessage: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * نافذة تأكيد إغلاق وأرشفة الدورة التقييمية النشطة مع بيان الآثار النظامية.
 */
export const CloseCycleModal: React.FC<CloseCycleModalProps> = ({
  cycle,
  isClosingCycle,
  closeSuccessMessage,
  closeErrorMessage,
  onCancel,
  onConfirm,
}) => {
  if (!cycle) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '24px 24px 16px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DC2626',
              flexShrink: 0,
            }}
          >
            <Lock size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              تأكيد إغلاق وأرشفة الدورة التقييمية
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '6px', margin: 0 }}>
              «{cycle.name}» (العام الدراسي {cycle.academicYear})
            </p>
          </div>
        </div>

        <div style={{ padding: '0 24px 20px', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
          <div
            style={{
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '16px',
              color: '#92400E',
              fontSize: '12.5px',
            }}
          >
            <strong>الآثار النظامية للإغلاق (FR-SUP-01 / BR-GEN-05):</strong>
            <ul style={{ margin: '6px 0 0', paddingRight: '20px' }}>
              <li>تُؤرشف سجلات كافة المدارس غير المكتملة بحالتها الراهنة (مسودة، مرفوعة، قيد التدقيق، طلب استكمال) كسجل تاريخي دون ترحيلها تلقائياً.</li>
              <li>تتوقف بوابتا مقيم ومدير المدرسة عن قبول أي رصد جديد أو رفع مخرجات لتلك الدورة.</li>
              <li>تظل المخرجات المكتملة متاحة للقراءة والتقارير ومتابعة خطط التحسين المدرسية.</li>
              <li>يتم تحويل حالة الدورة إلى مغلقة ومؤرشفة (<code style={{ fontWeight: 700 }}>Closed</code>) وتسجيل العملية في سجل التدقيق.</li>
            </ul>
          </div>

          {closeSuccessMessage && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#ECFDF5', color: '#065F46', fontWeight: 700, marginBottom: '12px' }}>
              {closeSuccessMessage}
            </div>
          )}

          {closeErrorMessage && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', color: '#991B1B', fontWeight: 700, marginBottom: '12px' }}>
              {closeErrorMessage}
            </div>
          )}
        </div>

        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={isClosingCycle}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            إلغاء التراجع
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isClosingCycle}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              borderRadius: '8px',
              backgroundColor: isClosingCycle ? '#94A3B8' : '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isClosingCycle ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
            }}
          >
            {isClosingCycle && <Loader2 size={15} className="animate-spin" />}
            <span>تأكيد إغلاق وأرشفة الدورة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
