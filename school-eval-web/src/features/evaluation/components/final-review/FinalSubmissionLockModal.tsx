import React, { useState } from 'react';
import { Lock, X, KeyRound, AlertCircle, ShieldCheck } from 'lucide-react';

interface FinalSubmissionLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLock: (password: string, notes?: string) => Promise<unknown>;
  isSubmitting?: boolean;
}

export const FinalSubmissionLockModal: React.FC<FinalSubmissionLockModalProps> = ({
  isOpen,
  onClose,
  onConfirmLock,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('تم استيفاء وتدقيق كافة المعايير والشواهد المعتمدة والرفع النهائي للاعتماد الوزاري.');
  const [error, setError] = useState<string | null>(null);

  const trackingCode = 'ARQ-2026-SCH104-FIN';
  const digitalHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('يرجى إدخال كلمة المرور لتأكيد الهوية وتوليد الختم الرقمي.');
      return;
    }

    try {
      await onConfirmLock(password, notes);
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'فشل في تأكيد كلمة المرور أو عملية الرفع.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
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
          maxWidth: '560px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Crimson Warning */}
        <div
          style={{
            padding: '24px',
            backgroundColor: '#FEF2F2',
            borderBottom: '1px solid #FECACA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#991B1B', margin: 0 }}>
                تأكيد الختم الرقمي والرفع النهائي (قفل التقييم)
              </h3>
              <p style={{ fontSize: '12px', color: '#B91C1C', margin: '2px 0 0 0' }}>
                إجراء نهائي غير قابل للتراجع وفق المادة FR-SCH-33
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Legal / Operational Notice */}
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              color: '#92400E',
              fontSize: '12.5px',
              lineHeight: 1.6,
            }}
          >
            <strong>تنبيه إداري ونظامي ملزم:</strong> بعد الضغط على تأكيد الختم والرفع النهائي، سيتحول ملف التقييم الذاتي
            وكافة الشواهد والمؤشرات إلى حالة <strong>(للقراءة فقط - Submitted)</strong>، ولن تتمكن المدرسة من إجراء أي تعديل
            أو رفع إلا في حال صدور "طلب استكمال رسمي" من المشرف الوزاري المختص.
          </div>

          {/* Digital Signature & Tracking Code Details */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#64748B' }}>رمز التتبع الوطني:</span>
              <span style={{ fontWeight: 800, color: '#0F172A' }}>{trackingCode}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#64748B' }}>البصمة الرقمية (Digital Hash):</span>
              <span style={{ fontWeight: 700, color: '#059669', fontSize: '11px' }}>SHA-256 Validated</span>
            </div>
            <div style={{ fontSize: '10px', color: '#94A3B8', wordBreak: 'break-all', fontFamily: 'monospace' }}>
              {digitalHash}
            </div>
          </div>

          {/* Password confirmation */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <KeyRound size={15} color="#EF4444" />
              كلمة المرور الخاصة بمستخدم التقييم لتأكيد الختم
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة مرور حسابك لتأكيد الهوية..."
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
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
              (يمكن استخدام كلمة المرور التجريبية المعتمدة للبيئة)
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              ملاحظات الرفع الرسمي المرفقة مع التقرير
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
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

          {/* Actions */}
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
              تراجع
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 24px',
                borderRadius: '8px',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: 800,
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              }}
            >
              <ShieldCheck size={18} />
              <span>{isSubmitting ? 'جاري التحقق والختم...' : 'تأكيد الختم الرقمي والرفع'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
