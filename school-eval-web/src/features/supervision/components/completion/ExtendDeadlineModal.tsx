/**
 * Component: ExtendDeadlineModal
 * نافذة تمديد مهلة طلب الاستكمال وتوثيق المبرر النظامي (FR-SUP-11)
 * منصة ارتقاء للتقييم والتحسين المدرسي
 */

import React, { useState } from 'react';
import {
  X,
  Clock,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { supervisionApi } from '../../api/supervisionApi';
import type { CompletionTrackerItem } from '../../api/supervisionTypes';

interface ExtendDeadlineModalProps {
  request: CompletionTrackerItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ExtendDeadlineModal: React.FC<ExtendDeadlineModalProps> = ({
  request,
  onClose,
  onSuccess,
}) => {
  const currentDeadline = request?.deadline || new Date().toISOString().split('T')[0];
  const cycleEndDate = request?.cycleEndDate || null;

  const [newDeadline, setNewDeadline] = useState<string>(() => {
    const d = new Date(currentDeadline);
    d.setDate(d.getDate() + 7);
    const dateStr = d.toISOString().split('T')[0];
    if (cycleEndDate && dateStr > cycleEndDate) {
      return cycleEndDate;
    }
    return dateStr;
  });

  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!request) return null;

  const handleAddDays = (days: number) => {
    const d = new Date(currentDeadline);
    d.setDate(d.getDate() + days);
    const dateStr = d.toISOString().split('T')[0];
    if (cycleEndDate && dateStr > cycleEndDate) {
      setNewDeadline(cycleEndDate);
      setErrorMessage(`تم ضبط المهلة على الحد الأقصى لنهاية دورة التقييم (${cycleEndDate}).`);
    } else {
      setNewDeadline(dateStr);
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDeadline) {
      setErrorMessage('يرجى تحديد تاريخ المهلة الجديد.');
      return;
    }

    if (newDeadline <= currentDeadline) {
      setErrorMessage('يجب أن يكون تاريخ المهلة الجديد لاحقاً لتاريخ المهلة الحالي.');
      return;
    }

    if (cycleEndDate && newDeadline > cycleEndDate) {
      setErrorMessage(`لا يمكن تمديد المهلة لما بعد تاريخ نهاية الدورة التقييمية الحالية (${cycleEndDate}).`);
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('يرجى كتابة المبرر الإشرافي النظامي لتمديد المهلة (إلزامي للتوثيق في سجل العمليات).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await supervisionApi.extendCompletionDeadline(
        request.requestId,
        new Date(newDeadline).toISOString(),
        reason.trim()
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'تعذر تمديد مهلة طلب الاستكمال.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* الترويسة */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D97706',
              }}
            >
              <Clock size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                تمديد مهلة استيفاء النواقص (FR-SUP-11)
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', margin: 0 }}>
                {request.schoolName} — طلب رقم #{request.requestId}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* نموذج التمديد */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                color: '#991B1B',
                marginBottom: '16px',
                fontSize: '13px',
              }}
            >
              <AlertTriangle size={18} color="#DC2626" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* سياق المهلة الحالية والدورة */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              backgroundColor: '#F8FAFC',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              marginBottom: '20px',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>المهلة الحالية</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                {request.deadline || 'غير محدد'}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>نهاية دورة التقييم</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#B45309' }}>
                {cycleEndDate || 'غير مقيد'}
              </span>
            </div>
          </div>

          {/* تحديد المهلة الجديدة وأزرار الإضافة السريعة */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: '#1E293B',
                marginBottom: '6px',
              }}
            >
              تاريخ المهلة الجديد <span style={{ color: '#EF4444' }}>*</span>
            </label>

            <input
              type="date"
              value={newDeadline}
              min={currentDeadline}
              max={cycleEndDate || undefined}
              onChange={(e) => setNewDeadline(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <span style={{ fontSize: '11px', color: '#64748B', alignSelf: 'center' }}>إضافة سريعة:</span>
              <button
                type="button"
                onClick={() => handleAddDays(3)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F1F5F9',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                +3 أيام
              </button>
              <button
                type="button"
                onClick={() => handleAddDays(7)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F1F5F9',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                +7 أيام
              </button>
              <button
                type="button"
                onClick={() => handleAddDays(14)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F1F5F9',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                +14 يوماً
              </button>
            </div>
          </div>

          {/* مبرر التمديد الإلزامي */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: '#1E293B',
                marginBottom: '6px',
              }}
            >
              المبرر الإشرافي لتمديد المهلة <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اكتب سبب تمديد المهلة (مثل: إمهال المدرسة لتوفير تقرير معتمد من مجلس الآباء، أو تعذر الاتصال...)"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                lineHeight: 1.5,
              }}
            />
            <p style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', margin: 0 }}>
              سيتم توثيق هذا الإجراء رسمياً في سجل العمليات الرقابي (Audit Log) متضمناً اسم المشرف والسبب.
            </p>
          </div>

          {/* الإجراءات */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isSubmitting ? '#93C5FD' : '#2563EB',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جاري حفظ التمديد...</span>
                </>
              ) : (
                <span>تأكيد تمديد المهلة وتوثيقها</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
