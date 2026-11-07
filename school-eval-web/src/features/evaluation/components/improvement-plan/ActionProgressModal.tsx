import React, { useState, useEffect } from 'react';
import type { ActionStatus, ImprovementPlanAction, UpdateImprovementActionPayload } from '../../api/evaluationTypes';
import { X, Check } from 'lucide-react';

interface ActionProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: ImprovementPlanAction | null;
  onUpdateAction: (actionId: number, payload: UpdateImprovementActionPayload) => Promise<void>;
  isSubmitting?: boolean;
  readOnly?: boolean;
}

export const ActionProgressModal: React.FC<ActionProgressModalProps> = ({
  isOpen,
  onClose,
  action,
  onUpdateAction,
  isSubmitting = false,
  readOnly = false,
}) => {
  if (!isOpen || !action) return null;

  const [status, setStatus] = useState<ActionStatus>(action.status);
  const [completionPercentage, setCompletionPercentage] = useState<number>(action.completionPercentage);
  const [progressDescription, setProgressDescription] = useState<string>(action.progressDescription);
  const [dueDate, setDueDate] = useState<string>(action.dueDate);

  useEffect(() => {
    if (action) {
      setStatus(action.status);
      setCompletionPercentage(action.completionPercentage);
      setProgressDescription(action.progressDescription);
      setDueDate(action.dueDate);
    }
  }, [action]);

    const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateAction(action.actionId, {
      status,
      completionPercentage: status === 'Done' ? 100 : completionPercentage,
      progressDescription,
      dueDate,
    });
    onClose();
  };

  const handleStatusChange = (newStatus: ActionStatus) => {
    setStatus(newStatus);
    if (newStatus === 'Done') {
      setCompletionPercentage(100);
    } else if (newStatus === 'Pending') {
      setCompletionPercentage(0);
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
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              تحديث تقدم الإجراء التنفيذي
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
              تسجيل التطورات الميدانية وتحديث نسبة الإنجاز وحالة الإجراء
            </p>
          </div>
          <button
            onClick={handleClose}
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

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Action Title Preview */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
              الإجراء المحدد:
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              {action.title}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
              القائد المسؤول: {action.leader}
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              حالة التنفيذ الحالية
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {(['InProgress', 'Done', 'Pending'] as ActionStatus[]).map((st) => {
                const isSelected = status === st;
                const labels: Record<string, string> = {
                  InProgress: 'قيد التنفيذ',
                  Done: 'مكتمل بنجاح',
                  Pending: 'معلق',
                };
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(st)}
                    style={{
                      padding: '9px 10px',
                      borderRadius: '8px',
                      border: isSelected ? '1.5px solid #059669' : '1px solid #CBD5E1',
                      backgroundColor: isSelected ? '#ECFDF5' : '#FFFFFF',
                      color: isSelected ? '#059669' : '#334155',
                      fontSize: '12.5px',
                      fontWeight: isSelected ? 800 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {labels[st]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Completion Percentage Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                نسبة الإنجاز الفعلية
              </label>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#059669' }}>
                {completionPercentage}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={completionPercentage}
              disabled={status === 'Done'}
              onChange={(e) => setCompletionPercentage(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#059669' }}
            />
          </div>

          {/* Due Date */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              الموعد النهائي المستهدف
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
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
          </div>

          {/* Progress Notes */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              المستجدات وتفاصيل الإنجاز الميداني
            </label>
            <textarea
              value={progressDescription}
              onChange={(e) => setProgressDescription(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Footer buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={handleClose}
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
              {readOnly ? 'إغلاق' : 'إلغاء'}
            </button>
            {!readOnly && (
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
                <span>{isSubmitting ? 'جاري الحفظ...' : 'تحديث التقدم'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
