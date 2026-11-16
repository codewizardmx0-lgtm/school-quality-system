import React, { useState, useEffect } from 'react';
import { theme } from '../../styles/theme';
import { apiClient } from '../../api/apiClient';
import {
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { SYSTEM_FULL_NAME } from '../../constants/systemConstants';

interface ResetPasswordPageProps {
  initialEmail?: string;
  initialToken?: string;
  onNavigateToLogin?: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  initialEmail = '',
  initialToken = '',
  onNavigateToLogin,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // قراءة المعاملات من عنوان الصفحة (URL search params) إن وجدت
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlEmail = searchParams.get('email');
      const urlToken = searchParams.get('token');
      if (urlEmail && !email) setEmail(urlEmail);
      if (urlToken && !token) setToken(urlToken);
    }
  }, []);

  const handleReturnToLogin = () => {
    if (onNavigateToLogin) {
      onNavigateToLogin();
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const clientErrors: Record<string, string[]> = {};
    const trimmedEmail = email.trim();
    const trimmedToken = token.trim();

    if (!trimmedEmail) {
      clientErrors['email'] = ['البريد الإلكتروني مطلوب.'];
    } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      clientErrors['email'] = ['صيغة البريد الإلكتروني غير صالحة.'];
    }

    if (!trimmedToken) {
      clientErrors['token'] = ['رمز الاستعادة مطلوب.'];
    }

    if (!password) {
      clientErrors['password'] = ['حقل كلمة المرور الجديدة مطلوب.'];
    } else if (password.length < 8) {
      clientErrors['password'] = ['يجب ألا تقل كلمة المرور عن 8 أحرف.'];
    }

    if (password !== passwordConfirmation) {
      clientErrors['password_confirmation'] = ['تأكيد كلمة المرور غير متطابق.'];
    }

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response: any = await apiClient.post('/auth/password/reset', {
        email: trimmedEmail,
        token: trimmedToken,
        password,
        password_confirmation: passwordConfirmation,
      });

      setSuccessMessage(
        response?.message || 'تمت إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.'
      );
    } catch (err: any) {
      const resp = err?.response?.data;
      if (resp?.errors) {
        setFieldErrors(resp.errors);
      }
      setErrorMessage(
        resp?.message || 'تعذر إعادة تعيين كلمة المرور. يرجى التأكد من صحة الرمز والبيانات والمحاولة مجدداً.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        direction: 'rtl',
        fontFamily: theme.typography.fontFamily.sans,
        backgroundColor: theme.colors.neutral[50],
      }}
    >
      {/* القسم الأيمن: نموذج إعادة التعيين */}
      <div
        style={{
          flex: '1 1 50%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 24px',
          backgroundColor: theme.colors.neutral.white,
          boxShadow: '0 0 30px rgba(0, 0, 0, 0.03)',
          zIndex: 10,
        }}
      >
        <div style={{ width: '100%', maxWidth: '440px' }}>
          {/* الشعار وعنوان الصفحة */}
          <div style={{ marginBottom: '28px', textAlign: 'right' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: theme.colors.primary[50],
                  border: `1px solid ${theme.colors.primary[200]}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.colors.primary[600],
                }}
              >
                <KeyRound size={22} />
              </div>
              <div>
                <span
                  style={{
                    fontSize: theme.typography.fontSizes.base,
                    fontWeight: theme.typography.fontWeights.bold,
                    color: theme.colors.neutral[900],
                    display: 'block',
                    lineHeight: 1.2,
                  }}
                >
                  {SYSTEM_FULL_NAME}
                </span>
                <span
                  style={{
                    fontSize: theme.typography.fontSizes.xs,
                    color: theme.colors.neutral[500],
                    display: 'block',
                  }}
                >
                  بوابة استعادة الحساب
                </span>
              </div>
            </div>

            <h1
              style={{
                fontSize: theme.typography.fontSizes['2xl'],
                fontWeight: theme.typography.fontWeights.bold,
                color: theme.colors.neutral[900],
                margin: '0 0 8px 0',
                letterSpacing: '-0.02em',
              }}
            >
              إعادة تعيين كلمة المرور
            </h1>
            <p
              style={{
                fontSize: theme.typography.fontSizes.sm,
                color: theme.colors.neutral[600],
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              أدخل رمز الاستعادة المرسل إلى بريدك الإلكتروني، ثم عيّن كلمة مرور جديدة لحسابك.
            </p>
          </div>

          {/* تنبيه الخطأ العام */}
          {errorMessage && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 16px',
                backgroundColor: theme.colors.status.danger.bg,
                border: `1px solid ${theme.colors.status.danger.border}`,
                borderRadius: theme.radii.lg,
                marginBottom: '20px',
                color: theme.colors.status.danger.text,
                fontSize: theme.typography.fontSizes.sm,
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px', color: theme.colors.status.danger.text }} />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* رسالة النجاح والتحويل */}
          {successMessage ? (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 20px',
                backgroundColor: theme.colors.primary[50],
                border: `1px solid ${theme.colors.primary[200]}`,
                borderRadius: theme.radii.xl,
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: theme.colors.primary[100],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: theme.colors.primary[700],
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h3
                style={{
                  fontSize: theme.typography.fontSizes.lg,
                  fontWeight: theme.typography.fontWeights.bold,
                  color: theme.colors.primary[900],
                  marginBottom: '8px',
                }}
              >
                تم تحديث كلمة المرور بنجاح!
              </h3>
              <p
                style={{
                  fontSize: theme.typography.fontSizes.sm,
                  color: theme.colors.primary[800],
                  marginBottom: '24px',
                  lineHeight: 1.6,
                }}
              >
                {successMessage}
              </p>
              <button
                type="button"
                onClick={handleReturnToLogin}
                style={{
                  width: '100%',
                  height: '46px',
                  backgroundColor: theme.colors.primary[600],
                  color: theme.colors.neutral.white,
                  border: 'none',
                  borderRadius: theme.radii.lg,
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: theme.typography.fontWeights.semibold,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = theme.colors.primary[700])}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = theme.colors.primary[600])}
              >
                <span>العودة لتسجيل الدخول الآن</span>
                <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* حقل البريد الإلكتروني */}
              <div>
                <label
                  htmlFor="reset-email"
                  style={{
                    display: 'block',
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.semibold,
                    color: theme.colors.neutral[700],
                    marginBottom: '6px',
                  }}
                >
                  البريد الإلكتروني <span style={{ color: theme.colors.status.danger.text }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reset-email"
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="evaluator@al-farooq.edu.sa"
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      height: '46px',
                      padding: '0 42px 0 14px',
                      borderRadius: theme.radii.md,
                      border: `1.5px solid ${fieldErrors.email ? theme.colors.status.danger.border : theme.colors.neutral[300]}`,
                      backgroundColor: theme.colors.neutral.white,
                      fontSize: theme.typography.fontSizes.sm,
                      color: theme.colors.neutral[900],
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Mail
                    size={18}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '14px',
                      color: theme.colors.neutral[400],
                      pointerEvents: 'none',
                    }}
                  />
                </div>
                {fieldErrors.email && (
                  <p style={{ margin: '4px 0 0', fontSize: theme.typography.fontSizes.xs, color: theme.colors.status.danger.text }}>
                    {fieldErrors.email[0]}
                  </p>
                )}
              </div>

              {/* حقل رمز الاستعادة */}
              <div>
                <label
                  htmlFor="reset-token"
                  style={{
                    display: 'block',
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.semibold,
                    color: theme.colors.neutral[700],
                    marginBottom: '6px',
                  }}
                >
                  رمز الاستعادة (Token) <span style={{ color: theme.colors.status.danger.text }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reset-token"
                    type="text"
                    dir="ltr"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="الصق الرمز المؤقت المستلم هنا"
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      height: '46px',
                      padding: '0 42px 0 14px',
                      borderRadius: theme.radii.md,
                      border: `1.5px solid ${fieldErrors.token ? theme.colors.status.danger.border : theme.colors.neutral[300]}`,
                      backgroundColor: theme.colors.neutral.white,
                      fontSize: theme.typography.fontSizes.sm,
                      fontFamily: 'monospace',
                      color: theme.colors.neutral[900],
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <KeyRound
                    size={18}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '14px',
                      color: theme.colors.neutral[400],
                      pointerEvents: 'none',
                    }}
                  />
                </div>
                {fieldErrors.token && (
                  <p style={{ margin: '4px 0 0', fontSize: theme.typography.fontSizes.xs, color: theme.colors.status.danger.text }}>
                    {fieldErrors.token[0]}
                  </p>
                )}
              </div>

              {/* حقل كلمة المرور الجديدة */}
              <div>
                <label
                  htmlFor="new-password"
                  style={{
                    display: 'block',
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.semibold,
                    color: theme.colors.neutral[700],
                    marginBottom: '6px',
                  }}
                >
                  كلمة المرور الجديدة <span style={{ color: theme.colors.status.danger.text }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      height: '46px',
                      padding: '0 42px 0 42px',
                      borderRadius: theme.radii.md,
                      border: `1.5px solid ${fieldErrors.password ? theme.colors.status.danger.border : theme.colors.neutral[300]}`,
                      backgroundColor: theme.colors.neutral.white,
                      fontSize: theme.typography.fontSizes.sm,
                      color: theme.colors.neutral[900],
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Lock
                    size={18}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '14px',
                      color: theme.colors.neutral[400],
                      pointerEvents: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '13px',
                      background: 'none',
                      border: 'none',
                      color: theme.colors.neutral[400],
                      cursor: 'pointer',
                      padding: '2px',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p style={{ margin: '4px 0 0', fontSize: theme.typography.fontSizes.xs, color: theme.colors.status.danger.text }}>
                    {fieldErrors.password[0]}
                  </p>
                ) : (
                  <span style={{ fontSize: '11px', color: theme.colors.neutral[500], display: 'block', marginTop: '4px' }}>
                    يجب ألا تقل عن 8 خانات وتحتوي على أحرف وأرقام.
                  </span>
                )}
              </div>

              {/* حقل تأكيد كلمة المرور */}
              <div>
                <label
                  htmlFor="confirm-password"
                  style={{
                    display: 'block',
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.semibold,
                    color: theme.colors.neutral[700],
                    marginBottom: '6px',
                  }}
                >
                  تأكيد كلمة المرور <span style={{ color: theme.colors.status.danger.text }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    placeholder="••••••••"
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      height: '46px',
                      padding: '0 42px 0 42px',
                      borderRadius: theme.radii.md,
                      border: `1.5px solid ${fieldErrors.password_confirmation ? theme.colors.status.danger.border : theme.colors.neutral[300]}`,
                      backgroundColor: theme.colors.neutral.white,
                      fontSize: theme.typography.fontSizes.sm,
                      color: theme.colors.neutral[900],
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Lock
                    size={18}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '14px',
                      color: theme.colors.neutral[400],
                      pointerEvents: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '13px',
                      background: 'none',
                      border: 'none',
                      color: theme.colors.neutral[400],
                      cursor: 'pointer',
                      padding: '2px',
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.password_confirmation && (
                  <p style={{ margin: '4px 0 0', fontSize: theme.typography.fontSizes.xs, color: theme.colors.status.danger.text }}>
                    {fieldErrors.password_confirmation[0]}
                  </p>
                )}
              </div>

              {/* زر الحفظ والتأكيد */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  height: '46px',
                  backgroundColor: theme.colors.primary[600],
                  color: theme.colors.neutral.white,
                  border: 'none',
                  borderRadius: theme.radii.lg,
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: theme.typography.fontWeights.semibold,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '8px',
                  transition: 'background-color 0.15s ease',
                  opacity: isSubmitting ? 0.8 : 1,
                }}
                onMouseOver={(e) => {
                  if (!isSubmitting) e.currentTarget.style.backgroundColor = theme.colors.primary[700];
                }}
                onMouseOut={(e) => {
                  if (!isSubmitting) e.currentTarget.style.backgroundColor = theme.colors.primary[600];
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>جاري حفظ كلمة المرور...</span>
                  </>
                ) : (
                  <>
                    <span>تعيين كلمة المرور الجديدة</span>
                    <ShieldCheck size={18} />
                  </>
                )}
              </button>

              {/* العودة إلى تسجيل الدخول */}
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={handleReturnToLogin}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme.colors.neutral[600],
                    fontSize: theme.typography.fontSizes.sm,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: theme.radii.md,
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = theme.colors.primary[600])}
                  onMouseOut={(e) => (e.currentTarget.style.color = theme.colors.neutral[600])}
                >
                  <ArrowRight size={16} />
                  <span>العودة إلى شاشة تسجيل الدخول</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* القسم الأيسر: لوحة الإرشاد والرسالة الأمنية */}
      <div
        style={{
          flex: '1 1 50%',
          backgroundColor: theme.colors.primary[900],
          backgroundImage: 'radial-gradient(circle at 20% 20%, #065F46 0%, #064E3B 50%, #022C22 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px 48px',
          color: theme.colors.neutral.white,
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: '480px', textAlign: 'right' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <ShieldCheck size={32} color="#6EE7B7" />
          </div>

          <h2
            style={{
              fontSize: '28px',
              fontWeight: 800,
              lineHeight: 1.4,
              marginBottom: '16px',
              color: '#FFFFFF',
            }}
          >
            حماية بيانات المؤسسة التعليمية مسؤوليتنا المشتركة
          </h2>

          <p
            style={{
              fontSize: theme.typography.fontSizes.base,
              color: '#D1FAE5',
              lineHeight: 1.7,
              marginBottom: '32px',
            }}
          >
            نظام متقدم لتأمين الحسابات وفق أعلى معايير الحوكمة الوطنية. فور إعادة تعيين كلمة المرور، يتم إبطال جميع جلسات الدخول السابقة لحماية الحساب.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={14} color="#34D399" />
              </div>
              <span style={{ fontSize: theme.typography.fontSizes.sm, color: '#F0FDF4' }}>
                تشفير غير قابل للعكس بكلمات المرور (Argon2id / Bcrypt)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={14} color="#34D399" />
              </div>
              <span style={{ fontSize: theme.typography.fontSizes.sm, color: '#F0FDF4' }}>
                صلاحية مؤقتة للرمز (تنتهي بعد 60 دقيقة من إصداره)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={14} color="#34D399" />
              </div>
              <span style={{ fontSize: theme.typography.fontSizes.sm, color: '#F0FDF4' }}>
                تسجيل ومراقبة كاملة في سجل التدقيق الأمني (Audit Log)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
