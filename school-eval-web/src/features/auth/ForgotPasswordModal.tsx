import React, { useState } from 'react';
import { Mail, X, Loader2, CheckCircle2, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { theme } from '../../styles/theme';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToReset?: (email: string, token: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onNavigateToReset,
}) => {
  if (!isOpen) return null;

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const handleClose = () => {
    if (isLoading) return;
    setEmail('');
    setError(null);
    setSuccessMessage(null);
    setDevResetToken(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setDevResetToken(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('الرجاء إدخال البريد الإلكتروني.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setError('صيغة البريد الإلكتروني غير صالحة.');
      return;
    }

    setIsLoading(true);
    try {
      const response: any = await apiClient.post('/auth/password/forgot', {
        email: trimmedEmail,
      });

      setSuccessMessage(
        response?.message || 'إذا كان البريد الإلكتروني مسجلاً، فقد تم إرسال تعليمات استعادة كلمة المرور.'
      );

      // في بيئة التطوير، نقرأ التوكن لتسهيل التجربة
      if (response?.data?.resetToken) {
        setDevResetToken(response.data.resetToken);
      }
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.errors?.email?.[0] ||
        err?.response?.data?.message ||
        'حدث خطأ أثناء معالجة طلب الاستعادة. يرجى المحاولة لاحقاً.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: theme.spacing[4],
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.neutral.white,
          borderRadius: theme.radii.xl,
          boxShadow: theme.shadows.xl,
          width: '100%',
          maxWidth: '460px',
          overflow: 'hidden',
          direction: 'rtl',
          fontFamily: theme.typography.fontFamily.sans,
          animation: 'modalSlideIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: `${theme.spacing[5]} ${theme.spacing[6]}`,
            borderBottom: `1px solid ${theme.colors.neutral[200]}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.colors.neutral[50],
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: theme.radii.lg,
                backgroundColor: theme.colors.primary[100],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.colors.primary[700],
              }}
            >
              <KeyRound size={20} />
            </div>
            <div>
              <h2
                id="forgot-password-title"
                style={{
                  margin: 0,
                  fontSize: theme.typography.fontSizes.lg,
                  fontWeight: theme.typography.fontWeights.bold,
                  color: theme.colors.neutral[900],
                }}
              >
                استعادة كلمة المرور
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: theme.typography.fontSizes.xs,
                  color: theme.colors.neutral[500],
                }}
              >
                إرسال رمز إعادة التعيين لحسابك المسجل
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="إغلاق النافذة"
            style={{
              background: 'none',
              border: 'none',
              color: theme.colors.neutral[400],
              cursor: 'pointer',
              padding: theme.spacing[2],
              borderRadius: theme.radii.md,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = theme.colors.neutral[700])}
            onMouseOut={(e) => (e.currentTarget.style.color = theme.colors.neutral[400])}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: theme.spacing[6] }}>
          {error && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[3],
                padding: theme.spacing[3],
                backgroundColor: theme.colors.status.danger.bg,
                border: `1px solid ${theme.colors.status.danger.border}`,
                borderRadius: theme.radii.md,
                marginBottom: theme.spacing[4],
                color: theme.colors.status.danger.text,
                fontSize: theme.typography.fontSizes.sm,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              style={{
                padding: theme.spacing[4],
                backgroundColor: theme.colors.status.success.bg,
                border: `1px solid ${theme.colors.status.success.border}`,
                borderRadius: theme.radii.md,
                marginBottom: theme.spacing[4],
                color: theme.colors.status.success.text,
                fontSize: theme.typography.fontSizes.sm,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: theme.spacing[2], marginBottom: devResetToken ? theme.spacing[3] : 0 }}>
                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{successMessage}</span>
              </div>

              {devResetToken && (
                <div
                  style={{
                    marginTop: theme.spacing[2],
                    padding: theme.spacing[3],
                    backgroundColor: theme.colors.neutral.white,
                    border: `1px dashed ${theme.colors.primary[300]}`,
                    borderRadius: theme.radii.md,
                  }}
                >
                  <div
                    style={{
                      fontSize: theme.typography.fontSizes.xs,
                      fontWeight: theme.typography.fontWeights.semibold,
                      color: theme.colors.primary[800],
                      marginBottom: '4px',
                    }}
                  >
                    رمز الاستعادة (بيئة التطوير والاختبار):
                  </div>
                  <code
                    style={{
                      display: 'block',
                      fontFamily: theme.typography.fontFamily.mono,
                      fontSize: theme.typography.fontSizes.xs,
                      color: theme.colors.neutral[800],
                      wordBreak: 'break-all',
                      direction: 'ltr',
                      textAlign: 'left',
                      padding: '4px 6px',
                      backgroundColor: theme.colors.neutral[50],
                      borderRadius: theme.radii.sm,
                    }}
                  >
                    {devResetToken}
                  </code>

                  {onNavigateToReset && (
                    <button
                      type="button"
                      onClick={() => onNavigateToReset(email, devResetToken)}
                      style={{
                        marginTop: theme.spacing[3],
                        width: '100%',
                        padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                        backgroundColor: theme.colors.primary[600],
                        color: theme.colors.neutral.white,
                        border: 'none',
                        borderRadius: theme.radii.md,
                        fontSize: theme.typography.fontSizes.xs,
                        fontWeight: theme.typography.fontWeights.semibold,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: theme.spacing[2],
                      }}
                    >
                      <span>الانتقال فوراً لتعيين كلمة المرور الجديدة</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit}>
              <p
                style={{
                  margin: `0 0 ${theme.spacing[4]} 0`,
                  fontSize: theme.typography.fontSizes.sm,
                  color: theme.colors.neutral[600],
                  lineHeight: 1.6,
                }}
              >
                أدخل البريد الإلكتروني المرتبط بحسابك. سنقوم بإرسال تعليمات ورمز التحقق اللازم لتعيين كلمة مرور جديدة.
              </p>

              <div style={{ marginBottom: theme.spacing[4] }}>
                <label
                  htmlFor="forgot-email"
                  style={{
                    display: 'block',
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.semibold,
                    color: theme.colors.neutral[700],
                    marginBottom: theme.spacing[1],
                  }}
                >
                  البريد الإلكتروني
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="forgot-email"
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="evaluator@al-farooq.edu.sa"
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: `0 ${theme.spacing[10]} 0 ${theme.spacing[3]}`,
                      borderRadius: theme.radii.md,
                      border: `1.5px solid ${theme.colors.neutral[300]}`,
                      fontSize: theme.typography.fontSizes.sm,
                      color: theme.colors.neutral[900],
                      backgroundColor: theme.colors.neutral.white,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Mail
                    size={18}
                    style={{
                      position: 'absolute',
                      right: theme.spacing[3],
                      top: '12px',
                      color: theme.colors.neutral[400],
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: theme.spacing[3], justifyContent: 'flex-end', marginTop: theme.spacing[6] }}>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  style={{
                    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                    borderRadius: theme.radii.md,
                    border: `1px solid ${theme.colors.neutral[300]}`,
                    backgroundColor: theme.colors.neutral.white,
                    color: theme.colors.neutral[700],
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.medium,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    padding: `${theme.spacing[2]} ${theme.spacing[5]}`,
                    borderRadius: theme.radii.md,
                    border: 'none',
                    backgroundColor: theme.colors.primary[600],
                    color: theme.colors.neutral.white,
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.semibold,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                    opacity: isLoading ? 0.8 : 1,
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>جاري الإرسال...</span>
                    </>
                  ) : (
                    <span>إرسال الرمز</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {successMessage && !devResetToken && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: theme.spacing[4] }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[5]}`,
                  borderRadius: theme.radii.md,
                  border: 'none',
                  backgroundColor: theme.colors.primary[600],
                  color: theme.colors.neutral.white,
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: theme.typography.fontWeights.semibold,
                  cursor: 'pointer',
                }}
              >
                حسناً، تم
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
