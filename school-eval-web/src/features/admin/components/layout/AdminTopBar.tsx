import React, { useState } from 'react';
import {
  Power,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  KeyRound,
  LogOut,
} from 'lucide-react';
import { theme } from '../../theme';
import { useAuth } from '../../../auth/AuthContext';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
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
  onOpenChangePassword?: () => void;
  onLogout?: () => void;
}

const SCREEN_TITLES: Record<AdminScreen, { title: string; breadcrumb: string }> = {
  dashboard: { title: 'لوحة التحكم الرئيسية وإدارة العمليات', breadcrumb: `${SYSTEM_SHORT_NAME} / لوحة التحكم المركزية` },
  users: { title: 'إدارة المستخدمين والأدوار والصلاحيات', breadcrumb: 'لوحة التحكم / المستخدمين والصلاحيات' },
  schools: { title: 'دليل المدارس والربط الإداري', breadcrumb: 'لوحة التحكم / المدارس والمديريات' },
  audit: { title: 'سجل الأمان والتدقيق الأمني ومراقبة النزاهة', breadcrumb: 'لوحة التحكم / الأمان والتدقيق' },
  backup: { title: 'النسخ الاحتياطي وتهيئة الخدمات المركزية', breadcrumb: 'لوحة التحكم / النسخ والتهيئة' },
};

export const AdminTopBar: React.FC<AdminTopBarProps> = ({
  activeScreen,
  isMaintenanceMode,
  onToggleMaintenance,
  isMobile = false,
  onToggleMobileMenu,
  isCollapsed = false,
  onToggleCollapse,
  onOpenChangePassword,
  onLogout,
}) => {
  const [isConfirmMaintenanceOpen, setIsConfirmMaintenanceOpen] = useState(false);
  const current = SCREEN_TITLES[activeScreen] || SCREEN_TITLES.dashboard;

  const { user: authUser } = useAuth();
  const displayName = authUser?.fullName || authUser?.username || 'مسؤول النظام';
  const roleObj = authUser?.roles?.[0];
  const roleNameMap: Record<string, string> = {
    admin: 'مدير النظام المركزي',
    school_evaluator: 'مقيّم المدرسة',
    school_principal: 'مدير المدرسة',
    ministry_standards_manager: 'مسؤول إدارة المعايير',
    ministry_supervisor: 'مشرف وزاري معتمد',
  };
  const displayRole = roleObj
    ? (roleNameMap[roleObj.roleName] || roleObj.description || roleObj.roleName)
    : 'مدير النظام المركزي';

  const userInitials = displayName
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('') || 'من';

  return (
    <>
      <header
        style={{
          height: '68px',
          backgroundColor: theme.colors.neutral.white,
          borderBottom: `1px solid ${theme.colors.neutral[200]}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 12px' : '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 20,
          fontFamily: theme.typography.fontFamily.sans,
          boxSizing: 'border-box',
          maxWidth: '100%',
          gap: '12px',
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
                fontSize: isMobile ? '0.88rem' : '1.05rem',
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

        {/* User Profile & Actions Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px', flexShrink: 0 }}>
          {/* User Profile Capsule */}
          <div
            title={`${displayName} • ${displayRole}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: isMobile ? '4px' : '4px 10px 4px 6px',
              borderRadius: theme.radii.xl,
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
            }}
          >
            {/* Avatar Circle with Initials */}
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: '#4F46E5',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.75rem',
                flexShrink: 0,
                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)',
              }}
            >
              {userInitials}
            </div>

            {/* User Name & Role text */}
            {!isMobile && (
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: '140px' }}>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#0F172A',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2,
                  }}
                >
                  {displayName}
                </span>
                <span
                  style={{
                    fontSize: '0.66rem',
                    color: '#64748B',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2,
                    marginTop: '2px',
                    fontWeight: 500,
                  }}
                >
                  {displayRole}
                </span>
              </div>
            )}
          </div>

          {/* User Action Buttons: Change Password & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {onOpenChangePassword && (
              <button
                onClick={onOpenChangePassword}
                title="تغيير كلمة المرور"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: theme.radii.lg,
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F0F9FF';
                  e.currentTarget.style.color = '#0284C7';
                  e.currentTarget.style.borderColor = '#BAE6FD';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.color = '#475569';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
              >
                <KeyRound size={15} />
              </button>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                title="تسجيل الخروج من النظام"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: theme.radii.lg,
                  border: '1px solid #FEE2E2',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FEE2E2';
                  e.currentTarget.style.borderColor = '#FCA5A5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FEF2F2';
                  e.currentTarget.style.borderColor = '#FEE2E2';
                }}
              >
                <LogOut size={15} />
              </button>
            )}
          </div>

          {/* Subtle Vertical Divider */}
          <div style={{ width: '1px', height: '24px', backgroundColor: '#E2E8F0', margin: '0 2px' }} />

          {/* Maintenance Mode Button (with prominent confirmation dialog guard) */}
          <button
            onClick={() => setIsConfirmMaintenanceOpen(true)}
            title={
              isMaintenanceMode
                ? 'وضع الصيانة نشط حالياً — انقر لإلغائه واستئناف العمليات'
                : 'انقر لتفعيل وضع الصيانة المجدولة وتعليق وصول المدارس'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: isMobile ? '6px 8px' : '6px 12px',
              borderRadius: theme.radii.lg,
              border: isMaintenanceMode ? '1px solid #FECACA' : '1px solid #E2E8F0',
              backgroundColor: isMaintenanceMode ? '#FEF2F2' : '#F8FAFC',
              color: isMaintenanceMode ? '#B91C1C' : '#64748B',
              cursor: 'pointer',
              fontSize: isMobile ? '0.7rem' : '0.74rem',
              fontWeight: 700,
              fontFamily: theme.typography.fontFamily.sans,
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              boxShadow: isMaintenanceMode ? '0 0 10px rgba(220, 38, 38, 0.15)' : 'none',
            }}
          >
            <Power size={14} color={isMaintenanceMode ? '#DC2626' : '#64748B'} />
            <span>
              {isMobile
                ? isMaintenanceMode
                  ? 'صيانة ⚠'
                  : 'الصيانة'
                : isMaintenanceMode
                ? 'وضع الصيانة نشط ⚠'
                : 'وضع الصيانة'}
            </span>
          </button>
        </div>
      </header>

      {/* Prominent Confirmation Dialog for Maintenance Mode Toggle */}
      <ConfirmationDialog
        isOpen={isConfirmMaintenanceOpen}
        title={
          isMaintenanceMode
            ? 'تأكيد استئناف المنظومة وإنهاء وضع الصيانة'
            : 'تحذير هام: تأكيد تفعيل وضع الصيانة المجدولة'
        }
        message={
          isMaintenanceMode
            ? 'هل أنت متأكد من إنهاء وضع الصيانة؟ ستتم إتاحة المنظومة فوراً لكافة المدارس والمقيمين والمشرفين لاستئناف تسجيل الدخول وإجراء عمليات التقييم والاستكمال.'
            : 'تنبيه أمني عاجل: سيؤدي تفعيل وضع الصيانة إلى حظر وصول كافة مديري المدارس والمقيمين والمشرفين الوزاريين فوراً، ولن يُسمح بالدخول سوى لمديري النظام المركزي لإجراء التحديثات. هل أنت متأكد من المتابعة وتفعيل وضع الصيانة؟'
        }
        confirmLabel={
          isMaintenanceMode
            ? 'نعم، استئناف تشغيل المنظومة'
            : 'نعم، تفعيل وضع الصيانة فوراً'
        }
        cancelLabel="تراجع وإلغاء"
        variant={isMaintenanceMode ? 'info' : 'danger'}
        onConfirm={() => {
          setIsConfirmMaintenanceOpen(false);
          onToggleMaintenance();
        }}
        onCancel={() => setIsConfirmMaintenanceOpen(false)}
      />
    </>
  );
};
