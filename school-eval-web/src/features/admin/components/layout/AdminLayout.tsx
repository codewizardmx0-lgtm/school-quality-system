import React, { useState } from 'react';
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
        return <SchoolsDirectory onNavigate={setActiveScreen} addToast={addToast} />;
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
        width: '100vw',
        direction: 'rtl',
        backgroundColor: '#F8FAFC',
        fontFamily: "'Cairo', 'Tajawal', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Sidebar */}
      <AdminSidebar
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <AdminTopBar
          activeScreen={activeScreen}
          isMaintenanceMode={isMaintenanceMode}
          onToggleMaintenance={handleToggleMaintenance}
        />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {renderScreen()}
        </main>
      </div>

      {/* Global Toast Notifications */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
