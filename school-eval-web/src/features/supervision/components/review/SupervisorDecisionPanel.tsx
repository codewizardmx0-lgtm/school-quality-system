/**
 * Component: SupervisorDecisionPanel
 * لوحة القرار الإشرافي: الفحص الآلي الميداني، إرشادات القرار، وخيار الاستكمال مقابل إغلاق المراجعة الإشرافية بنجاح
 * متوافقة مع BR-MIN-02 و BR-MIN-03 و FR-SUP-11 (استئصال تام للفظ الاعتماد)
 */

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileEdit,
  Check,
  ShieldCheck,
  Loader2,
  Info,
} from 'lucide-react';
import type { DecisionModeType } from '../../hooks/useSubmissionsReview';
import type { OutputStatusType } from '../../api/supervisionTypes';

interface SupervisorDecisionPanelProps {
  automatedChecks: {
    rubricCompleteness: boolean;
    allEvidencesAttached: boolean;
    minEvidenceMet: boolean;
    flagsCount: number;
    notes?: string;
    scoredCount?: number;
    totalCount?: number;
  };
  summary?: {
    totalElements?: number;
    completedElements?: number;
    attachedEvidencesCount?: number;
    improvementActionsCount?: number;
    overallScore?: number;
    compliancePercentage?: number;
    scoredIndicators?: number;
    totalIndicators?: number;
  };
  outputStatus?: OutputStatusType;
  closedAt?: string | null;
  decisionMode: DecisionModeType;
  onSelectDecisionMode: (mode: DecisionModeType) => void;
  supervisorNotes: string;
  onChangeNotes: (notes: string) => void;
  defectiveCount: number;
  onProceedToCompletion: () => void;
  onCloseReview: () => void;
  isActionLoading: boolean;
  actionSuccessMessage: string | null;
  actionErrorMessage: string | null;
}

export const SupervisorDecisionPanel: React.FC<SupervisorDecisionPanelProps> = ({
  automatedChecks,
  summary,
  outputStatus = 'Submitted',
  closedAt,
  decisionMode,
  onSelectDecisionMode,
  supervisorNotes,
  onChangeNotes,
  defectiveCount,
  onProceedToCompletion,
  onCloseReview,
  isActionLoading,
  actionSuccessMessage,
  actionErrorMessage,
}) => {
  const scoredCount =
    summary?.scoredIndicators ??
    automatedChecks.scoredCount ??
    summary?.completedElements ??
    109;
  const totalCount =
    summary?.totalIndicators ??
    automatedChecks.totalCount ??
    summary?.totalElements ??
    109;
  const isAllScored = scoredCount >= totalCount;

  const attachedEvidencesCount = summary?.attachedEvidencesCount ?? 0;
  const actionsCount = summary?.improvementActionsCount ?? 0;

  const isCompleted = outputStatus === 'Completed';
  const isNeedsCompletion = outputStatus === 'NeedsCompletion';

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
      {/* 1. نتائج الفحص الآلي للمنظومة (ديناميكية بالكامل) */}
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
          {/* اكتمال التقديرات المعيارية */}
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
            <span style={{ color: '#475569' }}>
              اكتمال التقديرات ({scoredCount}/{totalCount}):
            </span>
            {isAllScored ? (
              <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} /> مستوفٍ بالكامل
              </span>
            ) : (
              <span style={{ color: '#D97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={14} /> متبقي ({totalCount - scoredCount})
              </span>
            )}
          </div>

          {/* اكتمال الشواهد المرفقة */}
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
            <span style={{ color: '#475569' }}>
              الشواهد المرفقة ({attachedEvidencesCount} وثيقة):
            </span>
            {defectiveCount > 0 ? (
              <span style={{ color: '#D97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={14} /> ملاحظات ({defectiveCount} بنود)
              </span>
            ) : attachedEvidencesCount > 0 ? (
              <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} /> متوفرة
              </span>
            ) : (
              <span style={{ color: '#DC2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={14} /> لم تُرفق شواهد
              </span>
            )}
          </div>

          {/* خطة تحسين الأداء المدرسي */}
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
            {actionsCount > 0 ? (
              <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} /> {actionsCount} أولويات مرصودة
              </span>
            ) : (
              <span style={{ color: '#64748B', fontWeight: 600 }}>
                لا توجد أولويات
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. صندوق إرشادات وضوابط اتخاذ القرار الإشرافي (BR-MIN-02 / BR-MIN-03) */}
      <div
        style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: '#F0F9FF',
          border: '1px solid #BAE6FD',
          fontSize: '11px',
          color: '#0369A1',
          lineHeight: 1.5,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, marginBottom: '4px' }}>
          <Info size={14} color="#0284C7" />
          <span>ضوابط القرار الإشرافي المعتمدة:</span>
        </div>
        <ul style={{ margin: 0, paddingRight: '18px' }}>
          <li>
            <strong>إصدار طلب استكمال:</strong> عند رصد نواقص في الشواهد أو الحاجة لفك جزئي لبنود محددة مع منح المدرسة مهلة نظامية (14 يوماً وفق BR-MIN-02).
          </li>
          <li>
            <strong>إغلاق المراجعة الإشرافية:</strong> عند مطابقة المخرجات واستيفاء الشواهد، لنقل الحالة إلى مكتمل (Completed) وتثبيت الملف نهائياً (BR-MIN-03).
          </li>
        </ul>
      </div>

      {/* 3. حالة الملف المكتمل (Completed Lock Mode) */}
      {isCompleted ? (
        <div
          style={{
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: '#ECFDF5',
            border: '1.5px solid #059669',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065F46', fontWeight: 800, fontSize: '13px' }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>تم إغلاق المراجعة الإشرافية بنجاح</span>
          </div>
          <div style={{ fontSize: '12px', color: '#047857' }}>
            حالة المخرج الحالية: <strong>مكتمل (Completed)</strong>. الملف مقفل بصيغة التوثيق والقراءة فقط.
          </div>
          {closedAt && (
            <div style={{ fontSize: '11px', color: '#065F46' }}>
              تاريخ الإغلاق:{' '}
              {new Date(closedAt).toLocaleDateString('ar-YE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          )}
          {supervisorNotes && (
            <div
              style={{
                marginTop: '6px',
                padding: '8px 10px',
                backgroundColor: '#FFFFFF',
                borderRadius: '6px',
                border: '1px solid #A7F3D0',
                fontSize: '11px',
                color: '#1E293B',
              }}
            >
              <strong>ملاحظات الإغلاق المسجلة:</strong> {supervisorNotes}
            </div>
          )}
        </div>
      ) : (
        /* نموذج اتخاذ القرار الإشرافي في حالة المراجعة النشطة */
        <>
          {/* تنبيه حالة NeedsCompletion */}
          {isNeedsCompletion && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                backgroundColor: '#FEF3C7',
                border: '1px solid #FDE68A',
                fontSize: '12px',
                color: '#92400E',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={15} color="#D97706" />
              <span>
                الملف قيد الاستكمال من قِبل المدرسة حالياً. لا يمكن إغلاق المراجعة حتى استيفاء الرد.
              </span>
            </div>
          )}

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
                    إصدار طلب استكمال رسمي للمدرسة ({defectiveCount} بنود محددة)
                  </div>
                  <div style={{ fontSize: '11px', color: '#B45309', marginTop: '2px' }}>
                    فك جزئي للبند/البنود المحددة فقط مع مهلة 14 يوماً وتثبيت بقية التقييم بصيغة القراءة فقط.
                  </div>
                </div>
              </label>

              {/* خيار تأكيد إغلاق المراجعة الإشرافية بنجاح */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: decisionMode === 'close' ? '2px solid #2563EB' : '1px solid #E2E8F0',
                  backgroundColor: decisionMode === 'close' ? '#EFF6FF' : '#FFFFFF',
                  cursor: isNeedsCompletion ? 'not-allowed' : 'pointer',
                  opacity: isNeedsCompletion ? 0.6 : 1,
                }}
              >
                <input
                  type="radio"
                  name="decision"
                  disabled={isNeedsCompletion}
                  checked={decisionMode === 'close'}
                  onChange={() => onSelectDecisionMode('close')}
                  style={{ marginTop: '3px', accentColor: '#2563EB' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E40AF' }}>
                    تأكيد إغلاق المراجعة الإشرافية بنجاح (مكتمل)
                  </div>
                  <div style={{ fontSize: '11px', color: '#1D4ED8', marginTop: '2px' }}>
                    استيفاء المتطلبات ونقل حالة التقييم إلى مكتمل (Completed) وفق قاعدة العمل BR-MIN-03.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* ملاحظات وتوجيهات المشرف */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              ملاحظات وتوجيهات المشرف الوزاري
            </label>
            <textarea
              rows={3}
              value={supervisorNotes}
              onChange={(e) => onChangeNotes(e.target.value)}
              placeholder="سجل توجيهاتك الإشرافية المباشرة للمدرسة وفريق الجودة والتحسين..."
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

          {/* أزرار التنفيذ */}
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
                onClick={onCloseReview}
                disabled={isActionLoading || isNeedsCompletion}
                title={
                  isNeedsCompletion
                    ? 'لا يمكن إغلاق المراجعة طالما أن الملف بانتظار استكمال المدرسة'
                    : 'إغلاق المراجعة الإشرافية'
                }
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '11px 16px',
                  backgroundColor:
                    isActionLoading || isNeedsCompletion ? '#93C5FD' : '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor:
                    isActionLoading || isNeedsCompletion ? 'not-allowed' : 'pointer',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActionLoading && !isNeedsCompletion)
                    e.currentTarget.style.backgroundColor = '#1D4ED8';
                }}
                onMouseLeave={(e) => {
                  if (!isActionLoading && !isNeedsCompletion)
                    e.currentTarget.style.backgroundColor = '#2563EB';
                }}
              >
                {isActionLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>جاري إغلاق المراجعة...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>إغلاق المراجعة الإشرافية بنجاح (مكتمل)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
