import React, { useState } from 'react';
import type { ActionStatus, CreateImprovementActionPayload, ActionCatalogItem } from '../../api/evaluationTypes';
import { Target, X, Check, BookOpen } from 'lucide-react';
import { ActionCatalogModal } from './ActionCatalogModal';

interface AddActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAction: (payload: CreateImprovementActionPayload) => Promise<void>;
  isSubmitting?: boolean;
}

export const AddActionModal: React.FC<AddActionModalProps> = ({
  isOpen,
  onClose,
  onAddAction,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [leader, setLeader] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('2026-12-31');
  const [status, setStatus] = useState<ActionStatus>('InProgress');
  const [progressDescription, setProgressDescription] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  const handleSelectCatalogAction = (action: ActionCatalogItem) => {
    setTitle(action.action_title || action.title || '');
    if (action.description) setProgressDescription(action.description);
    if (action.responsible_role) setLeader(action.responsible_role);
    setIsCatalogOpen(false);
  };

    const handleClose = () => {
    if (isSubmitting) return;
    setTitle('');
    setLeader('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setDueDate('2026-12-31');
    setStatus('InProgress');
    setProgressDescription('');
    setCompletionPercentage(10);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('عنوان الإجراء التنفيذي مطلوب.');
      return;
    }

    try {
      await onAddAction({
        title,
        leader: leader || 'فريق التطوير والتحسين',
        startDate,
        dueDate,
        status,
        progressDescription: progressDescription || 'تم اعتماد الإجراء والبدء في تنفيذه.',
        completionPercentage: status === 'Done' ? 100 : completionPercentage,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'فشل في حفظ إجراء التحسين.');
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
          maxWidth: '540px',
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
                إضافة إجراء تنفيذي جديد لخطة التحسين
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                تحديد الهدف، المسؤوليات، الجدول الزمني، ومؤشر الإنجاز
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsCatalogOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1D4ED8',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="تصفح بنك الإجراءات النموذجية المعتمدة لملء الحقول تلقائياً"
            >
              <BookOpen size={14} />
              استيراد من بنك الإجراءات
            </button>
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
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                fontSize: '12.5px',
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              عنوان الإجراء التنفيذي
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تطبيق استراتيجيات التعلم التفاعلي والدروس النموذجية المصغرة"
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

          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              المسؤول عن التنفيذ (قائد الفريق)
            </label>
            <input
              type="text"
              value={leader}
              onChange={(e) => setLeader(e.target.value)}
              placeholder="مثال: أ. منير شرف — رئيس شعبة التدريب"
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                تاريخ البداية
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
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
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                تاريخ الإنجاز المستهدف
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                حالة الإجراء
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ActionStatus)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="InProgress">قيد التنفيذ</option>
                <option value="Pending">معلق</option>
                <option value="Done">مكتمل</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                نسبة الإنجاز ({status === 'Done' ? 100 : completionPercentage}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={status === 'Done' ? 100 : completionPercentage}
                disabled={status === 'Done'}
                onChange={(e) => setCompletionPercentage(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#059669', marginTop: '10px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              وصف التقدم الحالي
            </label>
            <textarea
              value={progressDescription}
              onChange={(e) => setProgressDescription(e.target.value)}
              placeholder="بيان الخطوات المنجزة حتى اللحظة..."
              rows={3}
              style={{
                width: '100%',
                padding: '9px 12px',
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
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
              <span>{isSubmitting ? 'جاري الحفظ...' : 'إضافة الإجراء'}</span>
            </button>
          </div>
        </form>
        {/* Action Catalog Modal */}
        <ActionCatalogModal
          isOpen={isCatalogOpen}
          onClose={() => setIsCatalogOpen(false)}
          onSelectAction={handleSelectCatalogAction}
        />
      </div>
    </div>
  );
};
