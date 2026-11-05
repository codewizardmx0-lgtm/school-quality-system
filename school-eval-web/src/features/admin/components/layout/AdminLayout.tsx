import React, { useState, useEffect } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';
import { ToastNotification } from '../common/ToastNotification';
import { useToast } from '../common/useToast';
import { AdminDashboard } from '../dashboard/AdminDashboard';
import { UsersManagement } from '../users/UsersManagement';
import { SchoolsDirectory } from '../schools/SchoolsDirectory';
import { SecurityAudit } from '../audit/SecurityAudit';
import { BackupAndSettings } from '../backup/BackupAndSettings';
import type { AdminScreen } from '../../types/admin.types';

interface AdminLayoutProps {
  initialScreen?: AdminScreen;
  onLogout?: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  initialScreen = 'dashboard',
  onLogout,
}) => {
  const [activeScreen, setActiveScreen] = useState<AdminScreen>(initialScreen);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const { toasts, addToast, dismissToast } = useToast();

  // Responsive & Sidebar Collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleMaintenance = () => {
    setIsMaintenanceMode((prev) => {
      const next = !prev;
      addToast(
        next ? 'warning' : 'info',
        next
          ? 'تم تفعيل وضع الصيانة المجدولة: تم تعليق وصول المستخدمين العاديين للنظام'
          : 'تم إلغاء وضع الصيانة: النظام متاح الآن لكافة المدارس والمشرفين'
      );
      return next;
    });
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <AdminDashboard onNavigate={setActiveScreen} addToast={addToast} />;
      case 'users':
        return <UsersManagement onNavigate={setActiveScreen} addToast={addToast} />;
      case 'schools':
        return <SchoolsDirectory onNavigate={setActiveScreen} addToast={addToast} isMobile={isMobile} />;
      case 'audit':
        return <SecurityAudit onNavigate={setActiveScreen} addToast={addToast} />;
      case 'backup':
        return <BackupAndSettings onNavigate={setActiveScreen} addToast={addToast} />;
      default:
        return <AdminDashboard onNavigate={setActiveScreen} addToast={addToast} />;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100vw',
        direction: 'rtl',
        backgroundColor: '#F8FAFC',
        fontFamily: "'Cairo', 'Tajawal', system-ui, -apple-system, sans-serif",
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Backdrop for Mobile Drawer */}
      {isMobile && isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 9998,
            transition: 'opacity 0.25s ease',
          }}
        />
      )}

      {/* Sidebar: Persistent on Desktop (Expandable/Collapsible), Slide-over Drawer on Mobile */}
      <AdminSidebar
        activeScreen={activeScreen}
        onNavigate={(screen) => {
          setActiveScreen(screen);
          if (isMobile) setIsMobileOpen(false);
        }}
        onLogout={onLogout}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        isMobile={isMobile}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          marginRight: isMobile ? 0 : isCollapsed ? '76px' : '260px',
          width: isMobile ? '100%' : isCollapsed ? 'calc(100% - 76px)' : 'calc(100% - 260px)',
          transition: 'margin-right 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <AdminTopBar
          activeScreen={activeScreen}
          isMaintenanceMode={isMaintenanceMode}
          onToggleMaintenance={handleToggleMaintenance}
          isMobile={isMobile}
          onToggleMobileMenu={() => setIsMobileOpen((prev) => !prev)}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        />
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            maxWidth: '100%',
          }}
        >
          {renderScreen()}
        </main>
      </div>

      {/* Global Toast Notifications */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
