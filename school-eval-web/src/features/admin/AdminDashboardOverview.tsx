import React, { useState, useEffect } from 'react';
import { theme } from '../../styles/theme';
import { adminApi } from './adminApi';
import {
  ShieldCheck,
  School,
  Users,
  Activity,
  CheckCircle2,
  Building2,
  Server,
  Lock,
  ArrowUpRight,
  Database,
  Layers,
} from 'lucide-react';

interface Props {
  onNavigate: (tab: string) => void;
}

export const AdminDashboardOverview: React.FC<Props> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    totalSchools: 0,
    activeSchools: 0,
    totalUsers: 0,
    activeUsers: 0,
    schoolUsers: 0,
    ministryUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const [schools, users] = await Promise.all([
          adminApi.getSchools(),
          adminApi.getUsers(),
        ]);

        setStats({
          totalSchools: schools.length,
          activeSchools: schools.filter((s) => s.status === 'Active').length,
          totalUsers: users.length,
          activeUsers: users.filter((u) => u.status === 'Active').length,
          schoolUsers: users.filter((u) => u.userType === 'school').length,
          ministryUsers: users.filter((u) => u.userType === 'ministry').length,
        });
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  return (
    <div style={{ padding: '32px' }}>
      {/* البانر الترحيبي الداكن لمسؤول النظام */}
      <div
        style={{
          background: theme.colors.gradients.darkBanner,
          borderRadius: theme.radii.xl,
          padding: '36px',
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
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            backgroundColor: theme.colors.primary[500],
            opacity: 0.15,
            filter: 'blur(70px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 14px',
              borderRadius: theme.radii.full,
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: theme.colors.primary[300],
              fontSize: theme.typography.fontSizes.xs,
              fontWeight: theme.typography.fontWeights.bold,
              marginBottom: '14px',
            }}
          >
            <ShieldCheck size={15} />
            <span>لوحة تحكم إدارة النظام المركزية (UI-ADM-01)</span>
          </div>

          <h1
            style={{
              fontSize: '28px',
              fontWeight: theme.typography.fontWeights.extrabold,
              margin: '0 0 10px 0',
              lineHeight: 1.2,
            }}
          >
            مركز التحكم والتهيئة والأمان
          </h1>
          <p
            style={{
              fontSize: theme.typography.fontSizes.sm,
              color: theme.colors.darkBrand.textSecondary,
              margin: 0,
              maxWidth: '750px',
              lineHeight: 1.6,
            }}
          >
            مرحباً بك في لوحة تحكم مسؤول النظام. من هنا يمكنك إدارة دليل المدارس المعتمدة، التحكم في حسابات وصلاحيات
            المستخدمين بالأدوار الخمسة (RBAC)، متابعة سلامة العزل بين المؤسسات، وحفظ استمرارية النظام بموجب مبدأ تعطيل لا حذف.
          </p>
        </div>
      </div>

      {/* بطاقات الإحصائيات الحية */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {/* بطاقة المدارس */}
        <div
          onClick={() => onNavigate('schools')}
          style={{
            backgroundColor: theme.colors.neutral.white,
            borderRadius: theme.radii.lg,
            padding: '24px',
            border: `1px solid ${theme.colors.neutral[200]}`,
            boxShadow: theme.shadows.sm,
            cursor: 'pointer',
            transition: theme.transitions.fast,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme.colors.primary[500];
            e.currentTarget.style.boxShadow = theme.shadows.md;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.colors.neutral[200];
            e.currentTarget.style.boxShadow = theme.shadows.sm;
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.primary[50],
                color: theme.colors.primary[700],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <School size={22} />
            </div>
            <ArrowUpRight size={18} color={theme.colors.neutral[400]} />
          </div>
          <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[500], fontWeight: theme.typography.fontWeights.semibold }}>
            دليل المدارس المسجلة
          </div>
          <div style={{ fontSize: '28px', fontWeight: theme.typography.fontWeights.extrabold, color: theme.colors.neutral[900], margin: '4px 0' }}>
            {loading ? '...' : stats.totalSchools}
          </div>
          <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.status.success.text, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} />
            <span>{stats.activeSchools} مدرسة بحالة نشطة ومؤهلة للتقويم</span>
          </div>
        </div>

        {/* بطاقة المستخدمين */}
        <div
          onClick={() => onNavigate('users')}
          style={{
            backgroundColor: theme.colors.neutral.white,
            borderRadius: theme.radii.lg,
            padding: '24px',
            border: `1px solid ${theme.colors.neutral[200]}`,
            boxShadow: theme.shadows.sm,
            cursor: 'pointer',
            transition: theme.transitions.fast,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme.colors.primary[500];
            e.currentTarget.style.boxShadow = theme.shadows.md;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.colors.neutral[200];
            e.currentTarget.style.boxShadow = theme.shadows.sm;
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.neutral[100],
                color: theme.colors.neutral[800],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={22} />
            </div>
            <ArrowUpRight size={18} color={theme.colors.neutral[400]} />
          </div>
          <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[500], fontWeight: theme.typography.fontWeights.semibold }}>
            حسابات المستخدمين النشطة
          </div>
          <div style={{ fontSize: '28px', fontWeight: theme.typography.fontWeights.extrabold, color: theme.colors.neutral[900], margin: '4px 0' }}>
            {loading ? '...' : stats.totalUsers}
          </div>
          <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.primary[700], display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Activity size={13} />
            <span>{stats.activeUsers} حساب مفعّل ومصرّح له بالدخول</span>
          </div>
        </div>

        {/* بطاقة الحسابات المدرسية */}
        <div
          style={{
            backgroundColor: theme.colors.neutral.white,
            borderRadius: theme.radii.lg,
            padding: '24px',
            border: `1px solid ${theme.colors.neutral[200]}`,
            boxShadow: theme.shadows.sm,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.status.info.bg,
                color: theme.colors.status.info.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={22} />
            </div>
            <span style={{ fontSize: '11px', color: theme.colors.neutral[400] }}>School Users</span>
          </div>
          <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[500], fontWeight: theme.typography.fontWeights.semibold }}>
            مستخدمو المدارس (مدراء ومقيمون)
          </div>
          <div style={{ fontSize: '28px', fontWeight: theme.typography.fontWeights.extrabold, color: theme.colors.neutral[900], margin: '4px 0' }}>
            {loading ? '...' : stats.schoolUsers}
          </div>
          <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[500] }}>
            معزولون تلقائياً بموجب سياسة NFR-SEC-03
          </div>
        </div>

        {/* بطاقة الحسابات الوزارية */}
        <div
          style={{
            backgroundColor: theme.colors.neutral.white,
            borderRadius: theme.radii.lg,
            padding: '24px',
            border: `1px solid ${theme.colors.neutral[200]}`,
            boxShadow: theme.shadows.sm,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.status.warning.bg,
                color: theme.colors.status.warning.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Server size={22} />
            </div>
            <span style={{ fontSize: '11px', color: theme.colors.neutral[400] }}>Ministry Users</span>
          </div>
          <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[500], fontWeight: theme.typography.fontWeights.semibold }}>
            المستخدمون الوزاريون (إشراف ومعايير)
          </div>
          <div style={{ fontSize: '28px', fontWeight: theme.typography.fontWeights.extrabold, color: theme.colors.neutral[900], margin: '4px 0' }}>
            {loading ? '...' : stats.ministryUsers}
          </div>
          <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[500] }}>
            يملكون حق الاطلاع الشامل على تقارير المحافظات
          </div>
        </div>
      </div>

      {/* أقسام العمليات السريعة والضوابط المعمارية */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* بطاقة الضوابط والسياسات الأمنية النشطة */}
        <div
          style={{
            backgroundColor: theme.colors.neutral.white,
            borderRadius: theme.radii.xl,
            padding: '28px',
            border: `1px solid ${theme.colors.neutral[200]}`,
            boxShadow: theme.shadows.sm,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Lock size={20} color={theme.colors.primary[600]} />
            <h3 style={{ fontSize: theme.typography.fontSizes.base, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[900], margin: 0 }}>
              السياسات والضوابط الأمنية المطبقة
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <CheckCircle2 size={16} color={theme.colors.primary[600]} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[800] }}>
                  قاعدة التبعية الحصرية (XOR Constraint)
                </div>
                <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[500], marginTop: '2px' }}>
                  يرتبط كل حساب بمدرسة فقط أو بجهة وزارية فقط، ولا يجوز الجمع بينهما نهائياً لحماية سرية البيانات.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <CheckCircle2 size={16} color={theme.colors.primary[600]} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[800] }}>
                  مبدأ «تعطيل لا حذف» (Disable Not Delete)
                </div>
                <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[500], marginTop: '2px' }}>
                  لا يتم حذف أي مدرسة أو حساب مستخدم من قاعدة البيانات للحفاظ على سلامة التقييمات وسجلات التدقيق المرجعية.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <CheckCircle2 size={16} color={theme.colors.primary[600]} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[800] }}>
                  العزل المؤسسي وحجب الموارد (404 Not Found)
                </div>
                <div style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[500], marginTop: '2px' }}>
                  أي محاولة للوصول إلى مورد مدرسة أخرى تُرجع 404 لمنع استكشاف وجود البيانات (القرار 9).
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* بطاقة روابط الوصول السريع لإدارة النظام */}
        <div
          style={{
            backgroundColor: theme.colors.neutral.white,
            borderRadius: theme.radii.xl,
            padding: '28px',
            border: `1px solid ${theme.colors.neutral[200]}`,
            boxShadow: theme.shadows.sm,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <Layers size={20} color={theme.colors.primary[600]} />
              <h3 style={{ fontSize: theme.typography.fontSizes.base, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[900], margin: 0 }}>
                إجراءات التشغيل السريع
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => onNavigate('schools')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: theme.colors.neutral[50],
                  border: `1px solid ${theme.colors.neutral[200]}`,
                  borderRadius: theme.radii.md,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'right',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <School size={18} color={theme.colors.primary[700]} />
                  <div>
                    <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[800] }}>
                      فتح دليل المدارس والمؤسسات
                    </div>
                    <div style={{ fontSize: '11px', color: theme.colors.neutral[500] }}>
                      استعراض المدارس، تعديل البيانات، وتفعيل المدارس الجديدة
                    </div>
                  </div>
                </div>
                <ArrowUpRight size={16} color={theme.colors.neutral[400]} />
              </button>

              <button
                onClick={() => onNavigate('users')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: theme.colors.neutral[50],
                  border: `1px solid ${theme.colors.neutral[200]}`,
                  borderRadius: theme.radii.md,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'right',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Users size={18} color={theme.colors.primary[700]} />
                  <div>
                    <div style={{ fontSize: theme.typography.fontSizes.sm, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.neutral[800] }}>
                      إدارة المستخدمين والصلاحيات
                    </div>
                    <div style={{ fontSize: '11px', color: theme.colors.neutral[500] }}>
                      إنشاء حسابات جديدة، تعيين كلمات المرور، وإسناد الأدوار
                    </div>
                  </div>
                </div>
                <ArrowUpRight size={16} color={theme.colors.neutral[400]} />
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: '20px',
              padding: '12px 16px',
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.neutral[100],
              fontSize: theme.typography.fontSizes.xs,
              color: theme.colors.neutral[600],
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Database size={15} color={theme.colors.neutral[500]} />
            <span>خادم قاعدة البيانات: MySQL 8.4 مع 40 جدولاً أساسياً مرتبطاً بالـ API</span>
          </div>
        </div>
      </div>
    </div>
  );
};
