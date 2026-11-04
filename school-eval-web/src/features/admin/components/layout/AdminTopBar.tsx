import React from 'react';
import {
  Power,
  Calendar,
} from 'lucide-react';
import { theme } from '../../theme';
import { formatArabicDate } from '../../utils/dateUtils';
import type { AdminScreen } from '../../types/admin.types';

interface AdminTopBarProps {
  activeScreen: AdminScreen;
  isMaintenanceMode: boolean;
  onToggleMaintenance: () => void;
}

const SCREEN_TITLES: Record<AdminScreen, { title: string; breadcrumb: string }> = {
  dashboard: { title: 'لوحة التحكم الرئيسية وإدارة العمليات', breadcrumb: 'منصة ارتقاء / لوحة التحكم المركزية' },
  users: { title: 'إدارة المستخدمين والأدوار', breadcrumb: 'لوحة التحكم / المستخدمين والصلاحيات' },
  schools: { title: 'دليل المدارس والربط الإداري', breadcrumb: 'لوحة التحكم / المدارس والمديريات' },
  audit: { title: 'سجل التدقيق الأمني ومراقبة النزاهة', breadcrumb: 'لوحة التحكم / الأمان والرقابة' },
  backup: { title: 'النسخ الاحتياطي وتهيئة الخدمات', breadcrumb: 'لوحة التحكم / النسخ والتهيئة المركزية' },
};

export const AdminTopBar: React.FC<AdminTopBarProps> = ({
  activeScreen,
  isMaintenanceMode,
  onToggleMaintenance,
}) => {
  const current = SCREEN_TITLES[activeScreen] || SCREEN_TITLES.dashboard;
  const todayStr = formatArabicDate(new Date().toISOString());

  return (
    <header
      style={{
        height: '68px',
        backgroundColor: theme.colors.neutral.white,
        borderBottom: `1px solid ${theme.colors.neutral[200]}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        fontFamily: theme.typography.fontFamily.sans,
      }}
    >
      {/* Title & Breadcrumb */}
      <div>
        <div style={{ fontSize: '0.7rem', color: theme.colors.neutral[400], marginBottom: '2px' }}>
          {current.breadcrumb}
        </div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: theme.colors.neutral[900], margin: 0 }}>
          {current.title}
        </h2>
      </div>

      {/* Status Indicators & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Maintenance mode toggle banner / button */}
        <button
          onClick={onToggleMaintenance}
          title={isMaintenanceMode ? 'انقر لإلغاء وضع الصيانة' : 'انقر لتفعيل وضع الصيانة'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: theme.radii.lg,
            border: isMaintenanceMode ? '1px solid #FECACA' : '1px solid #E2E8F0',
            backgroundColor: isMaintenanceMode ? '#FEF2F2' : '#F8FAFC',
            color: isMaintenanceMode ? '#B91C1C' : '#64748B',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 600,
            fontFamily: theme.typography.fontFamily.sans,
            transition: 'all 0.15s ease',
          }}
        >
          <Power size={14} color={isMaintenanceMode ? '#DC2626' : '#64748B'} />
          <span>{isMaintenanceMode ? 'وضع الصيانة نشط ⚠' : 'وضع الصيانة: معطل'}</span>
        </button>

        {/* Date Display */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            color: theme.colors.neutral[600],
            padding: '6px 12px',
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.neutral[50],
            border: `1px solid ${theme.colors.neutral[200]}`,
          }}
        >
          <Calendar size={14} color={theme.colors.neutral[400]} />
          <span>{todayStr}</span>
        </div>

        {/* System Health Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '9999px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #BBF7D0',
            color: '#15803D',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
          المنظومة مؤمّنة ومستقرة
        </div>
      </div>
    </header>
  );
};
