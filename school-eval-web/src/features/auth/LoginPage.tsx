import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { theme } from '../../styles/theme';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Building2,
  BarChart3,
  Sparkles,
  HelpCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, authError, clearAuthError } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setErrorMessage(null);
    setFieldErrors({});

    // التحقق المحلي الأساسي
    const clientErrors: Record<string, string[]> = {};
    if (!username.trim()) {
      clientErrors['username'] = ['حقل اسم المستخدم مطلوب.'];
    }
    if (!password) {
      clientErrors['password'] = ['حقل كلمة المرور مطلوب.'];
    }

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ username: username.trim(), password });
    } catch (err: unknown) {
      const errorObj = err as { message?: string; errors?: Record<string, string[]> };
      setErrorMessage(errorObj.message || 'فشل تسجيل الدخول. يرجى التأكد من البيانات المدخلة.');
      if (errorObj.errors) {
        setFieldErrors(errorObj.errors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // تعبئة سريعة للحسابات التجريبية لاختبار الأدوار (تُستدعى كلمة المرور من متغيرات البيئة)
  const fillCredentials = (user: string) => {
    setUsername(user);
    const devPassword = (import.meta.env.VITE_DEV_DEFAULT_PASSWORD as string | undefined) || '';
    setPassword(devPassword);
    setFieldErrors({});
    setErrorMessage(null);
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100vw',
        direction: 'rtl',
        fontFamily: theme.typography.fontFamily.sans,
        backgroundColor: theme.colors.neutral[50],
      }}
    >
      {/* =========================================================================
          القسم الأيمن: واجهة تسجيل الدخول والبطاقة البيضاء (Left visual in LTR, Right in RTL)
          ========================================================================= */}
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
          {/* الشعار وعنوان الترحيب */}
          <div style={{ marginBottom: '28px', textAlign: 'right' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                backgroundColor: theme.colors.primary[50],
                border: `1px solid ${theme.colors.primary[200]}`,
                borderRadius: theme.radii.full,
                marginBottom: '16px',
              }}
            >
              <ShieldCheck size={16} color={theme.colors.primary[600]} />
              <span
                style={{
                  fontSize: theme.typography.fontSizes.xs,
                  fontWeight: theme.typography.fontWeights.bold,
                  color: theme.colors.primary[700],
                }}
              >
                بوابة الاعتماد وضبط الجودة الوطنية
              </span>
            </div>

            <h1
              style={{
                fontSize: theme.typography.fontSizes['3xl'],
                fontWeight: theme.typography.fontWeights.extrabold,
                color: theme.colors.neutral[900],
                lineHeight: theme.typography.lineHeights.tight,
                margin: '0 0 8px 0',
              }}
            >
              تسجيل الدخول الموحد
            </h1>
            <p
              style={{
                fontSize: theme.typography.fontSizes.sm,
                color: theme.colors.neutral[500],
                margin: 0,
              }}
            >
              منصة التقييم الذاتي والتحسين المدرسي — يرجى إدخال بيانات حسابك
            </p>
          </div>

          {/* تنبيه رسالة الخطأ العامة أو انتهاء الجلسة */}
          {(errorMessage || authError) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 16px',
                backgroundColor: theme.colors.status.danger.bg,
                border: `1px solid ${theme.colors.status.danger.border}`,
                borderRadius: theme.radii.lg,
                marginBottom: '20px',
                color: theme.colors.status.danger.text,
                fontSize: theme.typography.fontSizes.sm,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{errorMessage || authError}</div>
            </div>
          )}

          {/* استمارة تسجيل الدخول */}
          <form onSubmit={handleSubmit} noValidate>
            {/* حقل اسم المستخدم */}
            <div style={{ marginBottom: '18px' }}>
              <label
                htmlFor="username"
                style={{
                  display: 'block',
                  fontSize: theme.typography.fontSizes.sm,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: theme.colors.neutral[700],
                  marginBottom: '6px',
                  textAlign: 'right',
                }}
              >
                اسم المستخدم / المعرف الوظيفي
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم (مثال: quality_belqees)"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    height: '46px',
                    padding: '0 40px 0 14px',
                    backgroundColor: theme.colors.neutral[50],
                    border: `1.5px solid ${
                      fieldErrors['username']
                        ? theme.colors.status.danger.text
                        : theme.colors.neutral[300]
                    }`,
                    borderRadius: theme.radii.md,
                    fontSize: theme.typography.fontSizes.sm,
                    color: theme.colors.neutral[900],
                    outline: 'none',
                    transition: theme.transitions.fast,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = theme.colors.primary[500])}
                  onBlur={(e) => {
                    e.target.style.borderColor = fieldErrors['username']
                      ? theme.colors.status.danger.text
                      : theme.colors.neutral[300];
                  }}
                />
                <UserIcon
                  size={18}
                  style={{
                    position: 'absolute',
                    top: '14px',
                    right: '12px',
                    color: theme.colors.neutral[400],
                    pointerEvents: 'none',
                  }}
                />
              </div>
              {fieldErrors['username'] && (
                <div
                  style={{
                    fontSize: theme.typography.fontSizes.xs,
                    color: theme.colors.status.danger.text,
                    marginTop: '4px',
                    textAlign: 'right',
                  }}
                >
                  {fieldErrors['username'][0]}
                </div>
              )}
            </div>

            {/* حقل كلمة المرور */}
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <label
                  htmlFor="password"
                  style={{
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.semibold,
                    color: theme.colors.neutral[700],
                  }}
                >
                  كلمة المرور
                </label>
                <button
                  type="button"
                  onClick={() => alert('لإعادة تعيين كلمة المرور يرجى مراجعة مسؤول النظام.')}
                  style={{
                    fontSize: theme.typography.fontSizes.xs,
                    color: theme.colors.primary[600],
                    fontWeight: theme.typography.fontWeights.semibold,
                    textDecoration: 'none',
                  }}
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    height: '46px',
                    padding: '0 40px 0 40px',
                    backgroundColor: theme.colors.neutral[50],
                    border: `1.5px solid ${
                      fieldErrors['password']
                        ? theme.colors.status.danger.text
                        : theme.colors.neutral[300]
                    }`,
                    borderRadius: theme.radii.md,
                    fontSize: theme.typography.fontSizes.sm,
                    color: theme.colors.neutral[900],
                    outline: 'none',
                    transition: theme.transitions.fast,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = theme.colors.primary[500])}
                  onBlur={(e) => {
                    e.target.style.borderColor = fieldErrors['password']
                      ? theme.colors.status.danger.text
                      : theme.colors.neutral[300];
                  }}
                />
                <Lock
                  size={18}
                  style={{
                    position: 'absolute',
                    top: '14px',
                    right: '12px',
                    color: theme.colors.neutral[400],
                    pointerEvents: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    top: '13px',
                    left: '12px',
                    color: theme.colors.neutral[400],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors['password'] && (
                <div
                  style={{
                    fontSize: theme.typography.fontSizes.xs,
                    color: theme.colors.status.danger.text,
                    marginTop: '4px',
                    textAlign: 'right',
                  }}
                >
                  {fieldErrors['password'][0]}
                </div>
              )}
            </div>

            {/* تذكرني */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '22px',
              }}
            >
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: theme.colors.primary[600],
                  cursor: 'pointer',
                }}
              />
              <label
                htmlFor="rememberMe"
                style={{
                  fontSize: theme.typography.fontSizes.xs,
                  color: theme.colors.neutral[600],
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                تذكر بيانات الاعتماد على هذا المتصفح
              </label>
            </div>

            {/* زر تسجيل الدخول الرئيسي */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                height: '48px',
                background: theme.colors.gradients.primaryButton,
                color: theme.colors.neutral.white,
                fontSize: theme.typography.fontSizes.base,
                fontWeight: theme.typography.fontWeights.bold,
                borderRadius: theme.radii.md,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: theme.shadows.emeraldGlow,
                transition: theme.transitions.normal,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.8 : 1,
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>جاري التحقق من الهوية...</span>
                </>
              ) : (
                <span>دخول إلى النظام</span>
              )}
            </button>
          </form>

          {/* قائمة تعبئة تجريبية سريعة للأدوار الخمسة (تظهر فقط في بيئة التطوير) */}
          {import.meta.env.DEV && (
            <div
              style={{
                marginTop: '28px',
                paddingTop: '20px',
                borderTop: `1px solid ${theme.colors.neutral[200]}`,
              }}
            >
              <div
                style={{
                  fontSize: theme.typography.fontSizes.xs,
                  fontWeight: theme.typography.fontWeights.bold,
                  color: theme.colors.neutral[500],
                  marginBottom: '10px',
                  textAlign: 'center',
                }}
              >
                حسابات تجريبية سريعة (بيئة التطوير والاختبار):
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={() => fillCredentials('quality_belqees')}
                  style={{
                    padding: '7px 10px',
                    fontSize: '11px',
                    backgroundColor: theme.colors.primary[50],
                    border: `1px solid ${theme.colors.primary[200]}`,
                    borderRadius: theme.radii.sm,
                    color: theme.colors.primary[800],
                    fontWeight: theme.typography.fontWeights.semibold,
                    textAlign: 'center',
                  }}
                >
                  تقييم (مدرسة بلقيس)
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('principal_belqees')}
                  style={{
                    padding: '7px 10px',
                    fontSize: '11px',
                    backgroundColor: theme.colors.neutral[100],
                    border: `1px solid ${theme.colors.neutral[300]}`,
                    borderRadius: theme.radii.sm,
                    color: theme.colors.neutral[700],
                    fontWeight: theme.typography.fontWeights.semibold,
                    textAlign: 'center',
                  }}
                >
                  مدير (مدرسة بلقيس)
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('quality_farouq')}
                  style={{
                    padding: '7px 10px',
                    fontSize: '11px',
                    backgroundColor: theme.colors.primary[50],
                    border: `1px solid ${theme.colors.primary[200]}`,
                    borderRadius: theme.radii.sm,
                    color: theme.colors.primary[800],
                    fontWeight: theme.typography.fontWeights.semibold,
                    textAlign: 'center',
                  }}
                >
                  تقييم (مدرسة الفاروق)
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('principal_farouq')}
                  style={{
                    padding: '7px 10px',
                    fontSize: '11px',
                    backgroundColor: theme.colors.neutral[100],
                    border: `1px solid ${theme.colors.neutral[300]}`,
                    borderRadius: theme.radii.sm,
                    color: theme.colors.neutral[700],
                    fontWeight: theme.typography.fontWeights.semibold,
                    textAlign: 'center',
                  }}
                >
                  مدير (مدرسة الفاروق)
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('supervisor_ministry')}
                  style={{
                    padding: '7px 10px',
                    fontSize: '11px',
                    backgroundColor: theme.colors.neutral[100],
                    border: `1px solid ${theme.colors.neutral[300]}`,
                    borderRadius: theme.radii.sm,
                    color: theme.colors.neutral[700],
                    fontWeight: theme.typography.fontWeights.semibold,
                    textAlign: 'center',
                  }}
                >
                  مشرف تربوي (وزاري)
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('standards_manager_ministry')}
                  style={{
                    padding: '7px 10px',
                    fontSize: '11px',
                    backgroundColor: theme.colors.neutral[100],
                    border: `1px solid ${theme.colors.neutral[300]}`,
                    borderRadius: theme.radii.sm,
                    color: theme.colors.neutral[700],
                    fontWeight: theme.typography.fontWeights.semibold,
                    textAlign: 'center',
                  }}
                >
                  مدير المعايير (وزاري)
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('admin')}
                  style={{
                    gridColumn: 'span 2',
                    padding: '7px 10px',
                    fontSize: '11px',
                    backgroundColor: theme.colors.neutral[800],
                    color: theme.colors.neutral.white,
                    borderRadius: theme.radii.sm,
                    fontWeight: theme.typography.fontWeights.semibold,
                    textAlign: 'center',
                  }}
                >
                  مسؤول النظام الفني (Admin)
                </button>
              </div>
            </div>
          )}

          {/* حاشية الدعم الفني والأمان */}
          <div
            style={{
              marginTop: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: theme.typography.fontSizes.xs,
              color: theme.colors.neutral[400],
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} color={theme.colors.primary[500]} />
              <span>اتصال مشفر وآمن بموجب المعيار الأمني NFR-SEC</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <HelpCircle size={14} />
              <span>المساعدة</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          القسم الأيسر: اللوح الإرشادي البصري الداكن (Left dark branding banner)
          مطابق بالكامل لخلفية وعناصر والبطاقات والألوان المستخرجة من SVG شاشة الدخول
          ========================================================================= */}
      <div
        style={{
          flex: '1 1 50%',
          background: theme.colors.gradients.darkBanner,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          color: theme.colors.neutral.white,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* هالات الإضاءة الخلفية (Glowing orbs from SVG) */}
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '380px',
            height: '380px',
            borderRadius: '50%',
            backgroundColor: theme.colors.primary[500],
            opacity: 0.12,
            filter: 'blur(80px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            left: '-60px',
            width: '340px',
            height: '340px',
            borderRadius: '50%',
            backgroundColor: '#0284C7',
            opacity: 0.1,
            filter: 'blur(70px)',
            pointerEvents: 'none',
          }}
        />

        {/* الترويسة العلوية للبانر: شارة النظام والمؤشر النشط */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 16px',
              backgroundColor: theme.colors.darkBrand.cardBg,
              border: `1px solid ${theme.colors.darkBrand.cardBorder}`,
              borderRadius: theme.radii.full,
              marginBottom: '28px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: theme.colors.primary[400],
                boxShadow: '0 0 8px #34D399',
              }}
            />
            <span
              style={{
                fontSize: theme.typography.fontSizes.xs,
                color: theme.colors.primary[300],
                fontWeight: theme.typography.fontWeights.semibold,
              }}
            >
              المنظومة الوطنية المعتمدة — دورة 2026/2027
            </span>
          </div>

          <h2
            style={{
              fontSize: '32px',
              fontWeight: theme.typography.fontWeights.extrabold,
              color: theme.colors.neutral.white,
              lineHeight: '1.35',
              marginBottom: '16px',
            }}
          >
            نحو بيئة تعليمية يمنية <br />
            <span style={{ color: theme.colors.primary[400] }}>
              تحقق أعلى معايير الجودة والاعتماد
            </span>
          </h2>
          <p
            style={{
              fontSize: theme.typography.fontSizes.base,
              color: theme.colors.darkBrand.textSecondary,
              lineHeight: theme.typography.lineHeights.relaxed,
              maxWidth: '520px',
            }}
          >
            منظومة رقمية رائدة لأتمتة التقييم الذاتي وبناء خطط التحسين المدرسي ورفع الشواهد،
            معززة بنظام ذكاء اصطناعي استشاري يدعم فرق الجودة والإشراف التربوي.
          </p>
        </div>

        {/* البطاقة الإرشادية المركزية المضيئة (مستخرجة من بطاقة SVG: Path 20) */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            background: theme.colors.gradients.cardGlow,
            border: `1px solid ${theme.colors.darkBrand.cardBorder}`,
            borderRadius: theme.radii.xl,
            padding: '28px',
            margin: '28px 0',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '18px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.primary[900],
                border: `1px solid ${theme.colors.primary[500]}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={20} color={theme.colors.primary[400]} />
            </div>
            <div>
              <div
                style={{
                  fontSize: theme.typography.fontSizes.base,
                  fontWeight: theme.typography.fontWeights.bold,
                  color: theme.colors.neutral.white,
                }}
              >
                ركائز دورة التقييم والاعتماد
              </div>
              <div
                style={{
                  fontSize: theme.typography.fontSizes.xs,
                  color: theme.colors.darkBrand.textMuted,
                }}
              >
                مسار رقمي متكامل من التقييم الذاتي إلى التحسين المستمر
              </div>
            </div>
          </div>

          {/* الخطوات الأربع */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                backgroundColor: 'rgba(11, 38, 32, 0.6)',
                borderRadius: theme.radii.md,
                border: '1px solid rgba(27, 77, 64, 0.5)',
              }}
            >
              <CheckCircle2 size={16} color={theme.colors.primary[400]} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral.white }}>
                  معايير ومؤشرات مقننة
                </div>
                <div style={{ fontSize: '11px', color: theme.colors.darkBrand.textMuted }}>
                  7 معايير و 109 مؤشرات و 436 واصفة أداء
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                backgroundColor: 'rgba(11, 38, 32, 0.6)',
                borderRadius: theme.radii.md,
                border: '1px solid rgba(27, 77, 64, 0.5)',
              }}
            >
              <Building2 size={16} color={theme.colors.primary[400]} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral.white }}>
                  عزل مؤسسي صارم
                </div>
                <div style={{ fontSize: '11px', color: theme.colors.darkBrand.textMuted }}>
                  خصوصية تامة لبيانات وشواهد كل مدرسة
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                backgroundColor: 'rgba(11, 38, 32, 0.6)',
                borderRadius: theme.radii.md,
                border: '1px solid rgba(27, 77, 64, 0.5)',
              }}
            >
              <BarChart3 size={16} color={theme.colors.primary[400]} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral.white }}>
                  خطط تحسين موجهة
                </div>
                <div style={{ fontSize: '11px', color: theme.colors.darkBrand.textMuted }}>
                  ربط الثغرات بإجراءات تنفيذية ومسؤوليات
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                backgroundColor: 'rgba(11, 38, 32, 0.6)',
                borderRadius: theme.radii.md,
                border: '1px solid rgba(27, 77, 64, 0.5)',
              }}
            >
              <ShieldCheck size={16} color={theme.colors.primary[400]} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral.white }}>
                  إشراف واستكمال رقمي
                </div>
                <div style={{ fontSize: '11px', color: theme.colors.darkBrand.textMuted }}>
                  تدقيق شواهد وإصدار طلبات استكمال مركزية
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* شريط الإحصائيات السفلي (مستخرج من شريط SVG: Path 40) */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            backgroundColor: theme.colors.darkBrand.statsBoxBg,
            border: `1px solid ${theme.colors.darkBrand.statsBoxBorder}`,
            borderRadius: theme.radii.lg,
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: theme.typography.fontWeights.bold, color: theme.colors.primary[400] }}>
              7
            </div>
            <div style={{ fontSize: '11px', color: theme.colors.darkBrand.textMuted }}>
              مجالات معيارية
            </div>
          </div>
          <div style={{ width: '1px', height: '24px', backgroundColor: theme.colors.darkBrand.cardBorder }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral.white }}>
              109
            </div>
            <div style={{ fontSize: '11px', color: theme.colors.darkBrand.textMuted }}>
              مؤشر أداء معتمد
            </div>
          </div>
          <div style={{ width: '1px', height: '24px', backgroundColor: theme.colors.darkBrand.cardBorder }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: theme.typography.fontWeights.bold, color: theme.colors.primary[400] }}>
              100%
            </div>
            <div style={{ fontSize: '11px', color: theme.colors.darkBrand.textMuted }}>
              أوزان نسبية محكمة
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
