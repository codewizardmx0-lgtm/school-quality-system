import React from 'react';
import {
  Power,
  Calendar,
  Menu,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { theme } from '../../theme';
import { formatArabicDate } from '../../utils/dateUtils';
import type { AdminScreen } from '../../types/admin.types';
import { SYSTEM_SHORT_NAME } from '../../../../constants/systemConstants';

interface AdminTopBarProps {
  activeScreen: AdminScreen;
  isMaintenanceMode: boolean;
  onToggleMaintenance: () => void;
  isMobile?: boolean;
  onToggleMobileMenu?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SCREEN_TITLES: Record<AdminScreen, { title: string; breadcrumb: string }> = {
  dashboard: { title: 'لوحة التحكم الرئيسية وإدارة العمليات', breadcrumb: `${SYSTEM_SHORT_NAME} / لوحة التحكم المركزية` },
  users: { title: 'إدارة المستخدمين والأدوار', breadcrumb: 'لوحة التحكم / المستخدمين والصلاحيات' },
  schools: { title: 'دليل المدارس والربط الإداري', breadcrumb: 'لوحة التحكم / المدارس والمديريات' },
  audit: { title: 'سجل التدقيق الأمني ومراقبة النزاهة', breadcrumb: 'لوحة التحكم / الأمان والرقابة' },
  backup: { title: 'النسخ الاحتياطي وتهيئة الخدمات', breadcrumb: 'لوحة التحكم / النسخ والتهيئة المركزية' },
};

export const AdminTopBar: React.FC<AdminTopBarProps> = ({
  activeScreen,
  isMaintenanceMode,
  onToggleMaintenance,
  isMobile = false,
  onToggleMobileMenu,
  isCollapsed = false,
  onToggleCollapse,
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
        padding: isMobile ? '0 12px' : '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        fontFamily: theme.typography.fontFamily.sans,
        boxSizing: 'border-box',
        maxWidth: '100%',
        gap: '8px',
      }}
    >
      {/* Title & Mobile Menu Button / Collapse Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', minWidth: 0, flex: 1 }}>
        {isMobile && onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            title="فتح القائمة الجانبية"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: theme.radii.lg,
              border: `1px solid ${theme.colors.neutral[200]}`,
              backgroundColor: theme.colors.neutral[50],
              color: theme.colors.neutral[800],
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Menu size={20} />
          </button>
        )}

        {!isMobile && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: theme.radii.md,
              border: `1px solid ${theme.colors.neutral[200]}`,
              backgroundColor: theme.colors.neutral[50],
              color: theme.colors.neutral[700],
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            {isCollapsed ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </button>
        )}

        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          {!isMobile && (
            <div style={{ fontSize: '0.7rem', color: theme.colors.neutral[400], marginBottom: '2px', whiteSpace: 'nowrap' }}>
              {current.breadcrumb}
            </div>
          )}
          <h2
            style={{
              fontSize: isMobile ? '0.88rem' : '1.1rem',
              fontWeight: 700,
              color: theme.colors.neutral[900],
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {current.title}
          </h2>
        </div>
      </div>

      {/* Status Indicators & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '16px', flexShrink: 0 }}>
        {/* Maintenance mode toggle button */}
        <button
          onClick={onToggleMaintenance}
          title={isMaintenanceMode ? 'انقر لإلغاء وضع الصيانة' : 'انقر لتفعيل وضع الصيانة'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '4px' : '8px',
            padding: isMobile ? '6px 10px' : '6px 14px',
            borderRadius: theme.radii.lg,
            border: isMaintenanceMode ? '1px solid #FECACA' : '1px solid #E2E8F0',
            backgroundColor: isMaintenanceMode ? '#FEF2F2' : '#F8FAFC',
            color: isMaintenanceMode ? '#B91C1C' : '#64748B',
            cursor: 'pointer',
            fontSize: isMobile ? '0.72rem' : '0.75rem',
            fontWeight: 600,
            fontFamily: theme.typography.fontFamily.sans,
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Power size={isMobile ? 13 : 14} color={isMaintenanceMode ? '#DC2626' : '#64748B'} />
          <span>
            {isMobile
              ? isMaintenanceMode
                ? 'صيانة نشطة ⚠'
                : 'وضع الصيانة'
              : isMaintenanceMode
              ? 'وضع الصيانة نشط ⚠'
              : 'وضع الصيانة: معطل'}
          </span>
        </button>

        {/* Date Display (hide on mobile) */}
        {!isMobile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: theme.colors.neutral[500],
              padding: '6px 12px',
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.neutral[50],
              border: `1px solid ${theme.colors.neutral[200]}`,
              whiteSpace: 'nowrap',
            }}
          >
            <Calendar size={13} color={theme.colors.neutral[400]} />
            <span>{todayStr}</span>
          </div>
        )}
      </div>
    </header>
  );
};
