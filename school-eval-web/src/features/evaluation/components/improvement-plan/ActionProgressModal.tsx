import React, { useState, useEffect } from 'react';
import type { ActionStatus, ImprovementPlanAction, PriorityLevel, UpdateImprovementActionPayload } from '../../api/evaluationTypes';
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
  const [title, setTitle] = useState<string>(action?.title || '');
  const [leader, setLeader] = useState<string>(action?.leader || '');
  const [startDate, setStartDate] = useState<string>(action?.startDate || '');
  const [dueDate, setDueDate] = useState<string>(action?.dueDate || '');
  const [status, setStatus] = useState<ActionStatus>(action?.status || 'Pending');
  const [priority, setPriority] = useState<PriorityLevel>(action?.priority || 'High');
  const [targetScore, setTargetScore] = useState<number>(action?.targetScore || 3);
  const [completionPercentage, setCompletionPercentage] = useState<number>(action?.completionPercentage ?? 0);
  const [progressDescription, setProgressDescription] = useState<string>(action?.progressDescription || '');

  useEffect(() => {
    if (action) {
      setTitle(action.title);
      setLeader(action.leader || '');
      setStartDate(action.startDate || '');
      setDueDate(action.dueDate || '');
      setStatus(action.status);
      setPriority(action.priority || 'High');
      setTargetScore(action.targetScore || 3);
      setCompletionPercentage(action.completionPercentage);
      setProgressDescription(action.progressDescription);
    }
  }, [action]);

  if (!isOpen || !action) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateAction(action.actionId, {
      title: title.trim(),
      leader: leader.trim(),
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      status,
      priority,
      targetScore,
      completionPercentage: status === 'Done' ? 100 : completionPercentage,
      progressDescription,
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
          maxWidth: '620px',
          maxHeight: '90vh',
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
            backgroundColor: '#F8FAFC',
          }}
        >
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              تعديل وتحديث الإجراء التنفيذي
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
              تعديل تفاصيل الإجراء، المسؤول، التواريخ، ومتابعة نسبة الإنجاز الميداني
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
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

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {/* Indicator & Evaluation Context Badge */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '12.5px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, color: '#1D4ED8', backgroundColor: '#DBEAFE', padding: '2px 8px', borderRadius: '6px' }}>
                  {action.indicatorCode || 'المؤشر المرتبط'}
                </span>
                <span style={{ fontWeight: 700, color: '#1E293B' }}>
                  {action.indicatorName || action.standardName}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <span style={{ color: '#64748B' }}>الدرجة الحالية:</span>
                <strong style={{ color: '#2563EB' }}>{action.score !== undefined && action.score !== null ? `${action.score}★` : 'غير مرصودة'}</strong>
                <span style={{ color: '#CBD5E1' }}>|</span>
                <span style={{ color: '#64748B' }}>المستهدف:</span>
                <strong style={{ color: '#059669' }}>{action.targetScore || 3}★</strong>
                <span style={{ color: '#CBD5E1' }}>|</span>
                <span style={{ color: '#64748B' }}>الفجوة:</span>
                <strong style={{ color: '#DC2626' }}>{action.gap !== undefined && action.gap !== null ? `${action.gap} درجات` : '-'}</strong>
              </div>
            </div>
            {action.standardName && action.indicatorName && (
              <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                المعيار: {action.standardCode ? `${action.standardCode} — ` : ''}{action.standardName}
              </div>
            )}
          </div>

          {/* Action Title Input */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              عنوان الإجراء التنفيذي <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              disabled={readOnly}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
                fontWeight: 600,
              }}
            />
          </div>

          {/* Leader Input */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              المسؤول عن التنفيذ (قائد الإجراء)
            </label>
            <input
              type="text"
              value={leader}
              disabled={readOnly}
              onChange={(e) => setLeader(e.target.value)}
              placeholder="مثال: أ. أحمد العريقي — مسؤول التطوير المهني"
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

          {/* Timeline Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                تاريخ البدء
              </label>
              <input
                type="date"
                value={startDate}
                disabled={readOnly}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                الموعد النهائي المستهدف
              </label>
              <input
                type="date"
                value={dueDate}
                disabled={readOnly}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Priority & Target Score */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                مستوى الأولوية والأهمية
              </label>
              <select
                value={priority}
                disabled={readOnly}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  boxSizing: 'border-box',
                  fontWeight: 600,
                }}
              >
                <option value="High">عالية (High)</option>
                <option value="Medium">متوسطة (Medium)</option>
                <option value="Low">منخفضة (Low)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                التقدير المستهدف (الهدف)
              </label>
              <select
                value={targetScore}
                disabled={readOnly}
                onChange={(e) => setTargetScore(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  boxSizing: 'border-box',
                  fontWeight: 600,
                }}
              >
                <option value={3}>المستوى 3 (متحقق كلياً / التميز)</option>
                <option value={2}>المستوى 2 (متحقق بدرجة متوسطة)</option>
                <option value={1}>المستوى 1 (مقبول / الحد الأدنى)</option>
              </select>
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

          {/* Progress Notes */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              المستجدات وتفاصيل الإنجاز الميداني
            </label>
            <textarea
              value={progressDescription}
              disabled={readOnly}
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
                <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ كافة التعديلات'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
