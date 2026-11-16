/**
 * Component: AddSupervisorMemoModal
 * نافذة تسجيل مذكرة إشرافية أو تقرير زيارة ميدانية جديدة
 */

import React, { useState } from 'react';
import { X, Loader2, Save, FileText, MapPin, PhoneCall } from 'lucide-react';

interface AddSupervisorMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memoData: {
    memoType: 'مذكرة إشرافية' | 'زيارة ميدانية' | 'اتصال هاتفي';
    subject: string;
    details: string;
    isVisibleToSchool: boolean;
  }) => Promise<boolean>;
  isSubmitting?: boolean;
}

export const AddSupervisorMemoModal: React.FC<AddSupervisorMemoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isSubmitting = false,
}) => {
  const [memoType, setMemoType] = useState<'مذكرة إشرافية' | 'زيارة ميدانية' | 'اتصال هاتفي'>('مذكرة إشرافية');
  const [subject, setSubject] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [isVisibleToSchool, setIsVisibleToSchool] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setValidationError('يرجى إدخال موضوع المذكرة الإشرافية.');
      return;
    }
    if (!details.trim()) {
      setValidationError('يرجى إدخال تفاصيل الإجراء أو الزيارة.');
      return;
    }

    setValidationError(null);
    const success = await onSave({
      memoType,
      subject,
      details,
      isVisibleToSchool,
    });

    if (success) {
      // إعادة ضبط النموذج والإغلاق
      setSubject('');
      setDetails('');
      setMemoType('مذكرة إشرافية');
      setIsVisibleToSchool(true);
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 15, 25, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          direction: 'rtl',
        }}
      >
        {/* الترويسة */}
        <div
          style={{
            padding: '18px 24px',
            backgroundColor: '#F8FAFC',
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
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                تسجيل إجراء إشرافي / زيارة ميدانية
              </h3>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                توثيق رسمي في السجل التراكمي للمدرسة
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* جسم النموذج */}
        <form onSubmit={handleFormSubmit} style={{ padding: '24px' }}>
          {validationError && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: '12px',
                marginBottom: '16px',
                fontWeight: 600,
              }}
            >
              {validationError}
            </div>
          )}

          {/* نوع الإجراء */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              نوع الإجراء الإشرافي
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {[
                { type: 'مذكرة إشرافية', icon: FileText },
                { type: 'زيارة ميدانية', icon: MapPin },
                { type: 'اتصال هاتفي', icon: PhoneCall },
              ].map((item) => {
                const isSelected = memoType === item.type;
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setMemoType(item.type as any)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #2563EB' : '1px solid #CBD5E1',
                      backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                      color: isSelected ? '#1D4ED8' : '#64748B',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 700,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={16} />
                    <span>{item.type}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* الموضوع */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              موضوع الإجراء / الزيارة <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="مثال: متابعة شواهد مجتمعات التعلم المهنية..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                color: '#0F172A',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          {/* التفاصيل */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              تفاصيل ومخرجات الإجراء الإشرافي <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="اكتب التوجيهات أو الملاحظات التي تم رصدها خلال الزيارة أو الاتصال..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                color: '#0F172A',
                boxSizing: 'border-box',
                outline: 'none',
                resize: 'vertical',
                lineHeight: 1.5,
              }}
            />
          </div>

          {/* خيار الرؤية للمدرسة */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0F172A',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={isVisibleToSchool}
                onChange={(e) => setIsVisibleToSchool(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#2563EB' }}
              />
              <span>إظهار المذكرة في سجل المدرسة (اطلاع إدارة المدرسة وفريق الجودة)</span>
            </label>
            <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginRight: '24px', marginTop: '2px' }}>
              عند إلغاء التحديد، تظل المذكرة داخلية للمشرفين والوزارة فقط.
            </span>
          </div>

          {/* أزرار الإرسال */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              paddingTop: '16px',
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#64748B',
                backgroundColor: '#F1F5F9',
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 20px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#FFFFFF',
                backgroundColor: isSubmitting ? '#93C5FD' : '#2563EB',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>حفظ في السجل</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
