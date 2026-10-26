import React from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { theme } from '../styles/theme';
import {
  LayoutDashboard,
  School,
  Users,
  BookOpen,
  ClipboardList,
  Target,
  FileText,
  UserCheck,
  Sparkles,
  Bell,
  LogOut,
  ShieldCheck,
  ChevronLeft,
} from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

export const Sidebar: React.FC<{ activeTab: string; onSelectTab: (tab: string) => void }> = ({
  activeTab,
  onSelectTab,
}) => {
  const { user, logout, isLoggingOut } = useAuth();

  const primaryRole = user?.roles?.[0]?.roleName || 'guest';

  // تحديد عناصر القائمة الجانبية بالاعتماد على الصلاحيات الفعلية للمستخدم (user.permissions)
  const getNavItems = (): SidebarItem[] => {
    const items: SidebarItem[] = [
      { id: 'dashboard', label: 'لوحة التحكم', icon: <LayoutDashboard size={18} /> },
    ];

    const perms = user?.permissions || [];

    if (perms.includes('schools.manage')) {
      items.push({ id: 'schools', label: 'إدارة المدارس', icon: <School size={18} /> });
    }
    if (perms.includes('users.manage')) {
      items.push({ id: 'users', label: 'إدارة المستخدمين', icon: <Users size={18} /> });
    }
    if (perms.includes('standards.manage')) {
      items.push(
        { id: 'standards-versions', label: 'إصدارات المعايير', icon: <BookOpen size={18} /> },
        { id: 'standards-tree', label: 'شجرة المعايير والمؤشرات', icon: <ClipboardList size={18} /> }
      );
    }
    if (perms.includes('evaluations.view') || perms.includes('evaluations.edit')) {
      items.push({ id: 'evaluation-form', label: 'استمارة التقييم الذاتي', icon: <ClipboardList size={18} /> });
    }
    if (perms.includes('evidence.manage')) {
      items.push({ id: 'evidences', label: 'إدارة الشواهد والأدلة', icon: <FileText size={18} /> });
    }
    if (perms.includes('plans.manage')) {
      items.push({ id: 'improvement-plan', label: 'خطة التحسين المدرسي', icon: <Target size={18} /> });
    }
    if (perms.includes('reviews.write')) {
      items.push(
        { id: 'review-reports', label: 'مراجعة تقرير التقييم', icon: <FileText size={18} /> },
        { id: 'review-plans', label: 'مراجعة واعتماد خطة التحسين', icon: <Target size={18} /> }
      );
    }
    if (perms.includes('cycles.manage')) {
      items.push({ id: 'cycles', label: 'إدارة دورات التقييم', icon: <BookOpen size={18} /> });
    }
    if (perms.includes('submissions.review')) {
      items.push({ id: 'submissions', label: 'فحص مخرجات المدارس', icon: <UserCheck size={18} /> });
    }
    if (perms.includes('ai.use')) {
      items.push({ id: 'ai-assistant', label: 'المساعد الذكي للاستشارة', icon: <Sparkles size={18} /> });
    }
    if (perms.includes('notifications.view')) {
      items.push({ id: 'notifications', label: 'مركز الإشعارات', icon: <Bell size={18} /> });
    }

    return items;
  };

  const navItems = getNavItems();

  const getRoleArabicTitle = (roleName: string) => {
    switch (roleName) {
      case 'admin':
        return 'مسؤول النظام الفني';
      case 'school_evaluator':
        return 'مسؤول جودة وتقييم';
      case 'school_principal':
        return 'مدير المدرسة';
      case 'ministry_supervisor':
        return 'مشرف تربوي وزاري';
      case 'ministry_standards_manager':
        return 'مدير إدارة المعايير';
      default:
        return roleName;
    }
  };

  return (
    <aside
      style={{
        width: '270px',
        minWidth: '270px',
        backgroundColor: theme.colors.neutral.white,
        borderLeft: `1px solid ${theme.colors.neutral[200]}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <div>
        {/* ترويسة القائمة وشعار المنظومة */}
        <div
          style={{
            padding: '24px 20px',
            borderBottom: `1px solid ${theme.colors.neutral[200]}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: theme.radii.lg,
              background: theme.colors.gradients.primaryButton,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: theme.shadows.emeraldGlow,
            }}
          >
            <ShieldCheck size={22} color={theme.colors.neutral.white} />
          </div>
          <div>
            <div
              style={{
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: theme.typography.fontWeights.extrabold,
                color: theme.colors.neutral[900],
                lineHeight: '1.2',
              }}
            >
              التقييم الذاتي
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSizes.xs,
                color: theme.colors.primary[600],
                fontWeight: theme.typography.fontWeights.semibold,
              }}
            >
              والاعتماد المدرسي
            </div>
          </div>
        </div>

        {/* معلومات الفاعل الحالي والجهة */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: theme.colors.neutral[50],
            borderBottom: `1px solid ${theme.colors.neutral[200]}`,
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: theme.colors.neutral[500],
              marginBottom: '4px',
            }}
          >
            الدور الوظيفي النشط:
          </div>
          <div
            style={{
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: theme.typography.fontWeights.bold,
              color: theme.colors.neutral[900],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{getRoleArabicTitle(primaryRole)}</span>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: theme.radii.full,
                backgroundColor: theme.colors.primary[100],
                color: theme.colors.primary[800],
              }}
            >
              {user?.userType === 'school' ? 'مدرسي' : user?.userType === 'ministry' ? 'وزاري' : 'نظام'}
            </span>
          </div>

          {user?.school && (
            <div
              style={{
                marginTop: '6px',
                fontSize: '12px',
                color: theme.colors.primary[700],
                fontWeight: theme.typography.fontWeights.medium,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <School size={14} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.school.schoolName}
              </span>
            </div>
          )}
        </div>

        {/* روابط التنقل الشجرية */}
        <nav style={{ padding: '16px 12px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: theme.typography.fontWeights.bold,
              color: theme.colors.neutral[400],
              padding: '0 12px 8px',
            }}
          >
            قائمة المهام المتاحة
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: theme.radii.md,
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: isActive
                      ? theme.typography.fontWeights.bold
                      : theme.typography.fontWeights.medium,
                    backgroundColor: isActive
                      ? theme.colors.primary[50]
                      : 'transparent',
                    color: isActive
                      ? theme.colors.primary[700]
                      : theme.colors.neutral[700],
                    border: isActive
                      ? `1px solid ${theme.colors.primary[200]}`
                      : '1px solid transparent',
                    transition: theme.transitions.fast,
                    textAlign: 'right',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = theme.colors.neutral[50];
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: isActive ? theme.colors.primary[600] : theme.colors.neutral[500] }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronLeft size={16} color={theme.colors.primary[600]} />}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* زر تسجيل الخروج والحاشية السفلية */}
      <div
        style={{
          padding: '16px',
          borderTop: `1px solid ${theme.colors.neutral[200]}`,
        }}
      >
        <button
          type="button"
          onClick={() => logout()}
          disabled={isLoggingOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '10px 16px',
            backgroundColor: theme.colors.status.danger.bg,
            border: `1px solid ${theme.colors.status.danger.border}`,
            borderRadius: theme.radii.md,
            color: theme.colors.status.danger.text,
            fontSize: theme.typography.fontSizes.sm,
            fontWeight: theme.typography.fontWeights.bold,
            transition: theme.transitions.fast,
            cursor: isLoggingOut ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.colors.status.danger.bg)}
        >
          <LogOut size={16} />
          <span>{isLoggingOut ? 'جاري الخروج...' : 'تسجيل الخروج'}</span>
        </button>
      </div>
    </aside>
  );
};
