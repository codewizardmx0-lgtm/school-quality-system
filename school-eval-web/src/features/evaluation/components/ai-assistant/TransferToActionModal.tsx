import React, { useState } from 'react';
import type { AiInitiative } from '../../api/evaluationTypes';
import { Target, X, Check } from 'lucide-react';

interface TransferToActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initiative: AiInitiative | null;
  onConfirmTransfer: (initiative: AiInitiative, leader: string, dueDate: string, progressDescription?: string) => Promise<void>;
}

export const TransferToActionModal: React.FC<TransferToActionModalProps> = ({
  isOpen,
  onClose,
  initiative,
  onConfirmTransfer,
}) => {
  if (!isOpen || !initiative) return null;

  const [leader, setLeader] = useState('أ. فاطمة العريقي — مسؤولة التطوير المهني');
  const [dueDate, setDueDate] = useState('2026-12-31');
  const [progressDescription, setProgressDescription] = useState(
    'تم اعتماد المبادرة بناءً على توصية التحليل الذكي للتقييم، والبدء في تشكيل فريق العمل.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirmTransfer(initiative, leader, dueDate, progressDescription);
      onClose();
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
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Target size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                نقل المبادرة إلى خطة التحسين المدرسي
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                تحويل توصية الذكاء الاصطناعي إلى إجراء تنفيذي رسمي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#F1F5F9',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Initiative Card Preview */}
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginBottom: '4px' }}>
              المبادرة المقترحة من المساعد الذكي:
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
              {initiative.title}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              {initiative.description}
            </div>
          </div>

          {/* Responsible Person / Leader */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              المسؤول عن التنفيذ (قائد الإجراء)
            </label>
            <input
              type="text"
              value={leader}
              onChange={(e) => setLeader(e.target.value)}
              placeholder="مثال: أ. منير شرف — رئيس الشعبة"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Due Date */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              التاريخ المستهدف للإنجاز
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Progress Notes */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              وصف التقدم الأولي والخطوات التنفيذية
            </label>
            <textarea
              value={progressDescription}
              onChange={(e) => setProgressDescription(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Footer buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                backgroundColor: '#F1F5F9',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 22px',
                borderRadius: '8px',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
              }}
            >
              <Check size={16} />
              <span>{isSubmitting ? 'جاري النقل...' : 'تأكيد النقل للخطة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
