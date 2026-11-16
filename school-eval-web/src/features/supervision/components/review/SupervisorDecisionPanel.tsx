/**
 * Component: SupervisorDecisionPanel
 * لوحة القرار الإشرافي: الفحص الآلي وخيار الاستكمال مقابل الاعتماد
 */

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileEdit,
  Check,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import type { DecisionModeType } from '../../hooks/useSubmissionsReview';

interface SupervisorDecisionPanelProps {
  automatedChecks: {
    rubricCompleteness: boolean;
    allEvidencesAttached: boolean;
    minEvidenceMet: boolean;
    flagsCount: number;
    notes?: string;
  };
  decisionMode: DecisionModeType;
  onSelectDecisionMode: (mode: DecisionModeType) => void;
  supervisorNotes: string;
  onChangeNotes: (notes: string) => void;
  defectiveCount: number;
  onProceedToCompletion: () => void;
  onApproveReview: () => void;
  isActionLoading: boolean;
  actionSuccessMessage: string | null;
  actionErrorMessage: string | null;
}

export const SupervisorDecisionPanel: React.FC<SupervisorDecisionPanelProps> = ({
  automatedChecks,
  decisionMode,
  onSelectDecisionMode,
  supervisorNotes,
  onChangeNotes,
  defectiveCount,
  onProceedToCompletion,
  onApproveReview,
  isActionLoading,
  actionSuccessMessage,
  actionErrorMessage,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* 1. نتائج الفحص الآلي المسبق */}
      <div>
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 800,
            color: '#0F172A',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <ShieldCheck size={16} color="#2563EB" />
          <span>نتائج الفحص الآلي للمنظومة</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: '#F8FAFC',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          >
            <span style={{ color: '#475569' }}>اكتمال التقديرات (56/56):</span>
            <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={14} /> مستوفٍ
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: '#F8FAFC',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          >
            <span style={{ color: '#475569' }}>اكتمال الشواهد المرفقة (48):</span>
            <span style={{ color: '#D97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertTriangle size={14} /> ملاحظات ({defectiveCount || automatedChecks.flagsCount} بنود)
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: '#F8FAFC',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          >
            <span style={{ color: '#475569' }}>خطة تحسين الأداء:</span>
            <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={14} /> 4 أولويات ومكتملة
            </span>
          </div>
        </div>
      </div>

      {/* 2. خيار القرار الإشرافي المعتمد */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
          القرار الإشرافي الميداني
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* خيار إصدار طلب استكمال */}
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px',
              borderRadius: '8px',
              border: decisionMode === 'completion' ? '2px solid #F59E0B' : '1px solid #E2E8F0',
              backgroundColor: decisionMode === 'completion' ? '#FFFBEB' : '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="decision"
              checked={decisionMode === 'completion'}
              onChange={() => onSelectDecisionMode('completion')}
              style={{ marginTop: '3px', accentColor: '#D97706' }}
            />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>
                إصدار طلب استكمال رسمي للمدرسة ({defectiveCount} بنود)
              </div>
              <div style={{ fontSize: '11px', color: '#B45309', marginTop: '2px' }}>
                فك جزئي للبندين فقط مع مهلة 14 يوماً وتثبيت بقية التقييم بصيغة القراءة فقط.
              </div>
            </div>
          </label>

          {/* خيار تأكيد اكتمال المراجعة */}
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px',
              borderRadius: '8px',
              border: decisionMode === 'approve' ? '2px solid #2563EB' : '1px solid #E2E8F0',
              backgroundColor: decisionMode === 'approve' ? '#EFF6FF' : '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="decision"
              checked={decisionMode === 'approve'}
              onChange={() => onSelectDecisionMode('approve')}
              style={{ marginTop: '3px', accentColor: '#2563EB' }}
            />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E40AF' }}>
                تأكيد اكتمال المراجعة الإدارية للمخرج
              </div>
              <div style={{ fontSize: '11px', color: '#1D4ED8', marginTop: '2px' }}>
                اعتماد المخرج واكتمال المرحلة الإشرافية وإحالته للمصفوفة التراكمية.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* 3. ملاحظات وتوجيهات المشرف */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
          ملاحظات وتوجيهات المشرف الوزاري
        </label>
        <textarea
          rows={3}
          value={supervisorNotes}
          onChange={(e) => onChangeNotes(e.target.value)}
          placeholder="سجل توجيهاتك الإشرافية المباشرة للمدرسة وفريق الجودة..."
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #CBD5E1',
            fontSize: '12px',
            color: '#0F172A',
            outline: 'none',
            resize: 'vertical',
            lineHeight: 1.5,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* رسائل النجاح أو الخطأ للإجراء */}
      {actionSuccessMessage && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '6px',
            backgroundColor: '#ECFDF5',
            color: '#065F46',
            fontSize: '12px',
            fontWeight: 700,
            border: '1px solid #A7F3D0',
          }}
        >
          {actionSuccessMessage}
        </div>
      )}

      {actionErrorMessage && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '6px',
            backgroundColor: '#FEF2F2',
            color: '#991B1B',
            fontSize: '12px',
            fontWeight: 700,
            border: '1px solid #FECACA',
          }}
        >
          {actionErrorMessage}
        </div>
      )}

      {/* 4. أزرار التنفيذ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {decisionMode === 'completion' ? (
          <button
            type="button"
            onClick={onProceedToCompletion}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '11px 16px',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              border: 'none',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#B45309')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D97706')}
          >
            <FileEdit size={16} />
            <span>تحويل لإصدار طلب استكمال ({defectiveCount})</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onApproveReview}
            disabled={isActionLoading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '11px 16px',
              backgroundColor: isActionLoading ? '#93C5FD' : '#2563EB',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: isActionLoading ? 'not-allowed' : 'pointer',
              border: 'none',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isActionLoading) e.currentTarget.style.backgroundColor = '#1D4ED8';
            }}
            onMouseLeave={(e) => {
              if (!isActionLoading) e.currentTarget.style.backgroundColor = '#2563EB';
            }}
          >
            {isActionLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>جاري الاعتماد...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>تأكيد اعتماد المخرج إدارياً</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
