import React from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { theme } from '../styles/theme';
import {
  User as UserIcon,
  ShieldCheck,
  Building2,
  KeyRound,
  CheckCircle,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div style={{ padding: '32px' }}>
      {/* الترحيب والبطاقة الرأسية */}
      <div
        style={{
          background: theme.colors.gradients.darkBanner,
          borderRadius: theme.radii.xl,
          padding: '32px',
          color: theme.colors.neutral.white,
          marginBottom: '32px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: theme.shadows.lg,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            left: '-50px',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            backgroundColor: theme.colors.primary[500],
            opacity: 0.15,
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: theme.radii.full,
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: theme.colors.primary[300],
              fontSize: theme.typography.fontSizes.xs,
              fontWeight: theme.typography.fontWeights.bold,
              marginBottom: '12px',
            }}
          >
            <ShieldCheck size={14} />
            <span>جلسة مصادقة نشطة وآمنة (Bearer Token)</span>
          </div>

          <h1
            style={{
              fontSize: '28px',
              fontWeight: theme.typography.fontWeights.extrabold,
              margin: '0 0 8px 0',
            }}
          >
            مرحباً بك، {user.fullName}
          </h1>
          <p
            style={{
              fontSize: theme.typography.fontSizes.sm,
              color: theme.colors.darkBrand.textSecondary,
              margin: 0,
            }}
          >
            أنت مسجل حالياً بحساب نوع ({user.userType === 'school' ? 'مدرسي' : user.userType === 'ministry' ? 'وزاري' : 'مسؤول نظام'}).
            تم استرجاع بياناتك وصلاحياتك بنجاح من نقطة النهاية <code style={{ color: theme.colors.primary[400] }}>GET /api/v1/auth/me</code>.
          </p>
        </div>
      </div>

      {/* تفاصيل البطاقات الأربع */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {/* بطاقة الحساب والهوية */}
        <div
          style={{
            backgroundColor: theme.colors.neutral.white,
            borderRadius: theme.radii.lg,
            padding: '24px',
            border: `1px solid ${theme.colors.neutral[200]}`,
            boxShadow: theme.shadows.sm,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.primary[50],
                color: theme.colors.primary[600],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserIcon size={20} />
            </div>
            <div>
              <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: theme.typography.fontWeights.bold }}>
                بيانات الهوية والحساب
              </div>
              <div style={{ fontSize: '11px', color: theme.colors.neutral[500] }}>المعرف الرقمي #{user.userId}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: theme.typography.fontSizes.xs }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px dashed ${theme.colors.neutral[200]}`, paddingBottom: '6px' }}>
              <span style={{ color: theme.colors.neutral[500] }}>اسم المستخدم:</span>
              <span style={{ fontWeight: theme.typography.fontWeights.bold }}>{user.username}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px dashed ${theme.colors.neutral[200]}`, paddingBottom: '6px' }}>
              <span style={{ color: theme.colors.neutral[500] }}>البريد الإلكتروني:</span>
              <span style={{ fontWeight: theme.typography.fontWeights.medium }}>{user.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px dashed ${theme.colors.neutral[200]}`, paddingBottom: '6px' }}>
              <span style={{ color: theme.colors.neutral[500] }}>حالة الحساب:</span>
              <span style={{ color: theme.colors.primary[600], fontWeight: theme.typography.fontWeights.bold }}>
                {user.status === 'Active' ? 'نشط ومفعل' : user.status}
              </span>
            </div>
          </div>
        </div>

        {/* بطاقة المؤسسة / المدرسة */}
        <div
          style={{
            backgroundColor: theme.colors.neutral.white,
            borderRadius: theme.radii.lg,
            padding: '24px',
            border: `1px solid ${theme.colors.neutral[200]}`,
            boxShadow: theme.shadows.sm,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: theme.radii.md,
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: theme.typography.fontWeights.bold }}>
                الجهة والمؤسسة التابعة
              </div>
              <div style={{ fontSize: '11px', color: theme.colors.neutral[500] }}>نطاق العزل المؤسسي</div>
            </div>
          </div>

          {user.school ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: theme.typography.fontSizes.xs }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px dashed ${theme.colors.neutral[200]}`, paddingBottom: '6px' }}>
                <span style={{ color: theme.colors.neutral[500] }}>اسم المدرسة:</span>
                <span style={{ fontWeight: theme.typography.fontWeights.bold }}>{user.school.schoolName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px dashed ${theme.colors.neutral[200]}`, paddingBottom: '6px' }}>
                <span style={{ color: theme.colors.neutral[500] }}>معرف المدرسة (ID):</span>
                <span style={{ fontWeight: theme.typography.fontWeights.bold }}>{user.school.schoolId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px dashed ${theme.colors.neutral[200]}`, paddingBottom: '6px' }}>
                <span style={{ color: theme.colors.neutral[500] }}>قاعدة العزل:</span>
                <span style={{ color: theme.colors.primary[700], fontWeight: theme.typography.fontWeights.bold }}>
                  مقيد ببيانات المدرسة حصراً
                </span>
              </div>
            </div>
          ) : user.ministry ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: theme.typography.fontSizes.xs }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: theme.colors.neutral[500] }}>الجهة الوزارية:</span>
                <span style={{ fontWeight: theme.typography.fontWeights.bold }}>{user.ministry.ministryName}</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[500] }}>
              مستخدم نظام مركزي غير مقيد بجهة معينة (System Admin).
            </div>
          )}
        </div>

        {/* بطاقة الأدوار الوظيفية */}
        <div
          style={{
            backgroundColor: theme.colors.neutral.white,
            borderRadius: theme.radii.lg,
            padding: '24px',
            border: `1px solid ${theme.colors.neutral[200]}`,
            boxShadow: theme.shadows.sm,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: theme.radii.md,
                backgroundColor: '#FEF3C7',
                color: '#B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <KeyRound size={20} />
            </div>
            <div>
              <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: theme.typography.fontWeights.bold }}>
                الأدوار الممنوحة (RBAC)
              </div>
              <div style={{ fontSize: '11px', color: theme.colors.neutral[500] }}>
                {user.roles?.length || 0} دور وظيفي نشط
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {user.roles?.map((r) => (
              <div
                key={r.roleId}
                style={{
                  padding: '8px 12px',
                  backgroundColor: theme.colors.neutral[50],
                  borderRadius: theme.radii.sm,
                  border: `1px solid ${theme.colors.neutral[200]}`,
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[800] }}>
                  {r.roleName}
                </div>
                <div style={{ fontSize: '11px', color: theme.colors.neutral[500], marginTop: '2px' }}>
                  {r.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* قائمة الصلاحيات التفصيلية المعتمدة */}
      <div
        style={{
          backgroundColor: theme.colors.neutral.white,
          borderRadius: theme.radii.lg,
          padding: '28px',
          border: `1px solid ${theme.colors.neutral[200]}`,
          boxShadow: theme.shadows.sm,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: `1px solid ${theme.colors.neutral[200]}`,
            paddingBottom: '16px',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: theme.typography.fontSizes.lg,
                fontWeight: theme.typography.fontWeights.bold,
                color: theme.colors.neutral[900],
                margin: 0,
              }}
            >
              قائمة الصلاحيات الذرية الممنوحة (Granted Permissions)
            </h2>
            <p style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[500], margin: '4px 0 0 0' }}>
              مستخرجة مباشرة من ربط أدوار المستخدم بجدول <code style={{ color: theme.colors.primary[600] }}>role_permissions</code> المعتمد (19 صلاحية و 27 ربطًا)
            </p>
          </div>
          <div
            style={{
              padding: '6px 14px',
              backgroundColor: theme.colors.primary[50],
              border: `1px solid ${theme.colors.primary[200]}`,
              borderRadius: theme.radii.full,
              color: theme.colors.primary[800],
              fontSize: theme.typography.fontSizes.xs,
              fontWeight: theme.typography.fontWeights.bold,
            }}
          >
            {user.permissions?.length || 0} صلاحية نشطة
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '12px',
          }}
        >
          {user.permissions?.map((perm) => (
            <div
              key={perm}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: theme.colors.neutral[50],
                border: `1px solid ${theme.colors.neutral[200]}`,
                borderRadius: theme.radii.md,
                fontSize: theme.typography.fontSizes.xs,
                color: theme.colors.neutral[800],
              }}
            >
              <CheckCircle size={15} color={theme.colors.primary[500]} />
              <span style={{ fontWeight: theme.typography.fontWeights.semibold }}>{perm}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
