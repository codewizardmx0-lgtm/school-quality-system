import React, { useState, useEffect } from 'react';
import { AlertTriangle, RotateCcw, ShieldAlert, X, Loader2 } from 'lucide-react';

interface SafeResetConfirmModalProps {
  isOpen: boolean;
  mode: 'indicator' | 'standard';
  targetTitle: string;
  affectedCount?: number;
  hasLinkedEvidences?: boolean;
  onClose: () => void;
  onConfirm: (unlinkEvidences: boolean) => Promise<void>;
}

export const SafeResetConfirmModal: React.FC<SafeResetConfirmModalProps> = ({
  isOpen,
  mode,
  targetTitle,
  affectedCount = 1,
  hasLinkedEvidences = false,
  onClose,
  onConfirm,
}) => {
  const [unlinkEvidences, setUnlinkEvidences] = useState<boolean>(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [doubleConfirmChecked, setDoubleConfirmChecked] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUnlinkEvidences(false);
      setStep(1);
      setDoubleConfirmChecked(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isStandard = mode === 'standard';

  const handleSubmit = async () => {
    if (isStandard && step === 1) {
      setStep(2);
      return;
    }
    if (isStandard && !doubleConfirmChecked) {
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onConfirm(unlinkEvidences);
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          'تعذر تنفيذ عملية التصفير. قد يكون ملف التقييم مقفلاً أو مُرسلاً للمراجعة.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        direction: 'rtl',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #FECACA',
          boxShadow: '0 24px 48px rgba(15, 23, 42, 0.25)',
          maxWidth: '520px',
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 22px',
            backgroundColor: '#FEF2F2',
            borderBottom: '1px solid #FECACA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isStandard ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#991B1B' }}>
                {isStandard
                  ? step === 1
                    ? 'تأكيد تصفير معيار وطني كامل'
                    : 'التأكيد النهائي المضاعف (خطوة 2 من 2)'
                  : 'تأكيد تصفير رصد المؤشر'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#B91C1C' }}>
                {targetTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '6px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              color: '#991B1B',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px', color: '#334155' }}>
          {step === 1 ? (
            <>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#FFF7ED',
                  border: '1px solid #FED7AA',
                  color: '#9A3412',
                  lineHeight: 1.6,
                }}
              >
                {isStandard ? (
                  <span>
                    سيتم مسح <strong>التقديرات المرصودة والمبررات وأدوات التحقق</strong> لعدد{' '}
                    <strong>{affectedCount} مؤشراً</strong> ضمن هذا المعيار، وإعادتها إلى قائمة{' '}
                    <strong>«عناصر بحاجة لاستيفاء التقديرات والشواهد»</strong>.
                  </span>
                ) : (
                  <span>
                    سيتم مسح <strong>الدرجة المرصودة والمبرر النصي وأداة التحقق</strong> لهذا المؤشر،
                    وسيعود المؤشر إلى حالة <strong>«غير مدخل»</strong> في قائمة العناصر بانتظار الاستيفاء.
                  </span>
                )}
              </div>

              {(hasLinkedEvidences || isStandard) && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={unlinkEvidences}
                    onChange={(e) => setUnlinkEvidences(e.target.checked)}
                    style={{ marginTop: '3px', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>
                      فك ارتباط الشواهد المربوطة {isStandard ? 'بمؤشرات هذا المعيار' : 'بهذا المؤشر'} أيضاً (اختياري)
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#059669', marginTop: '3px', fontWeight: 600 }}>
                      ملاحظة مطمئنة: لن يتم حذف أي ملف فعلي من مستودع المدرسة؛ ستبقى جميع الوثائق محفوظة بالأرشيف ويمكن إعادة ربطها لاحقاً.
                    </div>
                  </div>
                </label>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#7F1D1D',
                  lineHeight: 1.65,
                }}
              >
                <strong>تحذير أخير:</strong> أنت على وشك تصفير <strong>{affectedCount} مؤشراً</strong> في معيار{' '}
                <strong>«{targetTitle}»</strong>
                {unlinkEvidences
                  ? ' مع فك ارتباط جميع الشواهد المربوطة بهذه المؤشرات (دون حذف الملفات الأصلية).'
                  : ' مع الإبقاء على روابط الشواهد الحالية.'}
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: '#0F172A',
                }}
              >
                <input
                  type="checkbox"
                  checked={doubleConfirmChecked}
                  onChange={(e) => setDoubleConfirmChecked(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>أؤكد رغبتي في تصفير كافة التقديرات المرصودة لهذا المعيار ({affectedCount} مؤشراً)</span>
              </label>
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 22px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (step === 2) {
                setStep(1);
                setDoubleConfirmChecked(false);
              } else {
                onClose();
              }
            }}
            disabled={isSubmitting}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 700,
              border: '1px solid #CBD5E1',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {step === 2 ? 'رجوع' : 'إلغاء'}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (isStandard && step === 2 && !doubleConfirmChecked)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '8px',
              backgroundColor:
                isStandard && step === 2 && !doubleConfirmChecked ? '#FCA5A5' : '#DC2626',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor:
                isSubmitting || (isStandard && step === 2 && !doubleConfirmChecked)
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>جارٍ التصفير...</span>
              </>
            ) : (
              <>
                <RotateCcw size={15} />
                <span>
                  {isStandard
                    ? step === 1
                      ? 'متابعة للتأكيد النهائي'
                      : 'تأكيد تصفير المعيار نهائياً'
                    : 'تأكيد تصفير المؤشر'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
