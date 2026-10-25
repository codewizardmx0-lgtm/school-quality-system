import React, { useState } from 'react';
import { useAuth } from './features/auth/AuthContext';
import { LoginPage } from './features/auth/LoginPage';
import { Sidebar } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { DashboardPage } from './components/DashboardPage';
import { AdminDashboardOverview } from './features/admin/AdminDashboardOverview';
import { SchoolsManagementPage } from './features/admin/SchoolsManagementPage';
import { UsersManagementPage } from './features/admin/UsersManagementPage';
import { theme } from './styles/theme';
import { Loader2 } from 'lucide-react';

export const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: theme.colors.neutral[50],
          gap: '16px',
        }}
      >
        <Loader2 size={36} color={theme.colors.primary[600]} className="animate-spin" />
        <div
          style={{
            fontSize: theme.typography.fontSizes.sm,
            color: theme.colors.neutral[600],
            fontWeight: theme.typography.fontWeights.semibold,
          }}
        >
          جاري التحقق من جلسة المصادقة...
        </div>
      </div>
    );
  }

  // إذا لم يكن مصادقًا، اعرض شاشة تسجيل الدخول الموحد (UI-GEN-01)
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const isAdmin = user?.roles?.some((r) => r.roleName === 'admin');

  // اختيار المحتوى بحسب التبويب النشط ودور المستخدم
  const renderMainContent = () => {
    if (activeTab === 'dashboard') {
      if (isAdmin) {
        return <AdminDashboardOverview onNavigate={setActiveTab} />;
      }
      return <DashboardPage />;
    }

    if (activeTab === 'schools') {
      return <SchoolsManagementPage />;
    }

    if (activeTab === 'users') {
      return <UsersManagementPage />;
    }

    return (
      <div style={{ padding: '32px' }}>
        <div
          style={{
            backgroundColor: theme.colors.neutral.white,
            borderRadius: theme.radii.lg,
            padding: '48px 32px',
            textAlign: 'center',
            border: `1px solid ${theme.colors.neutral[200]}`,
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: theme.colors.neutral[800], marginBottom: '8px' }}>
            وحدة العمل: {activeTab}
          </h2>
          <p style={{ fontSize: '14px', color: theme.colors.neutral[500] }}>
            هذه الشاشة مخصصة للمراحل التالية بحسب هيكل وحدات الفصل الرابع.
          </p>
        </div>
      </div>
    );
  };

  // إذا كان مصادقًا، اعرض الهيكل الرئيسي (القائمة الجانبية المخصصة للدور + الشريط العلوي + المحتوى)
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
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopNavbar />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
};
