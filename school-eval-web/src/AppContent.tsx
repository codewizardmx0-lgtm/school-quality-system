import React, { useState, useEffect } from 'react';
import { useAuth } from './features/auth/AuthContext';
import { LoginPage } from './features/auth/LoginPage';
import { Sidebar } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { DashboardPage } from './components/DashboardPage';
import { AdminLayout } from './features/admin';
import type { AdminScreen } from './features/admin';
import { EvaluatorLayout } from './features/evaluation';
import type { EvaluatorScreen } from './features/evaluation';
import { theme } from './styles/theme';
import { Loader2 } from 'lucide-react';

export const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentPath, setCurrentPath] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
  const isSchoolUser = user?.userType === 'school' || user?.roles?.some((r) => r.roleName === 'school_evaluator' || r.roleName === 'school_principal');

  // خريطة مسارات /school/* إلى شاشات EvaluatorScreen
  const getEvaluatorScreenFromPath = (path: string): EvaluatorScreen => {
    if (path.includes('/standards-tree')) return 'standards-tree';
    if (path.includes('/rubric') || path.includes('/assessment')) return 'rubric-assessment';
    if (path.includes('/evidences')) return 'evidences';
    if (path.includes('/ai')) return 'ai-assistant';
    if (path.includes('/plan')) return 'improvement-plan';
    if (path.includes('/review') || path.includes('/final')) return 'final-review';
    if (path.includes('/completion')) return 'completion-request';
    if (path.includes('/notifications')) return 'notifications';
    return 'dashboard';
  };

  // خريطة تبويبات القائمة الجانبية إلى شاشات بوابة المقيم
  const evaluatorTabMap: Record<string, EvaluatorScreen> = {
    'evaluator-suite': 'dashboard',
    'evaluation-form': 'rubric-assessment',
    'standards-tree': 'standards-tree',
    'evidences': 'evidences',
    'improvement-plan': 'improvement-plan',
    'ai-assistant': 'ai-assistant',
    'review-reports': 'final-review',
    'completion-request': 'completion-request',
  };

  // 1. إذا كان المسار يبدأ بـ /school/*
  if (currentPath.startsWith('/school')) {
    const screen = getEvaluatorScreenFromPath(currentPath);
    return <EvaluatorLayout initialScreen={screen} onLogout={logout} />;
  }

  // 2. إذا كان المستخدم مسؤول نظام، يتم توجيهه مباشرة إلى بوابة مسؤول النظام المركزية
  if (isAdmin && activeTab !== 'evaluator-suite' && !evaluatorTabMap[activeTab]) {
    return <AdminLayout onLogout={logout} />;
  }

  // 3. إذا كان التبويب هو بوابة إدارة النظام المركزية (ارتقاء)
  if (activeTab === 'admin-suite' || activeTab === 'schools' || activeTab === 'users') {
    const screenMap: Record<string, AdminScreen> = {
      schools: 'schools',
      users: 'users',
      'admin-suite': 'dashboard',
    };
    return (
      <AdminLayout
        initialScreen={screenMap[activeTab] || 'dashboard'}
        onLogout={() => setActiveTab('dashboard')}
      />
    );
  }

  // 4. إذا كان المستخدم مستخدم مدرسة، يتم توجيهه إلى بوابة مستخدم التقييم المدرسي المعتمدة (ارتقاء)
  if (isSchoolUser) {
    const screen = evaluatorTabMap[activeTab] || 'dashboard';
    return <EvaluatorLayout initialScreen={screen} onLogout={logout} />;
  }

  // 5. إذا كان التبويب يخص شاشات التقييم الذاتي
  if (evaluatorTabMap[activeTab]) {
    return <EvaluatorLayout initialScreen={evaluatorTabMap[activeTab]} onLogout={logout} />;
  }

  // اختيار المحتوى بحسب التبويب النشط ودور المستخدم
  const renderMainContent = () => {
    if (activeTab === 'dashboard') {
      return <DashboardPage />;
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
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        <TopNavbar />
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
};
