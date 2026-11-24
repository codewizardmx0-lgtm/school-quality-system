import React, { useState, useEffect, useRef } from 'react';
import {
  Power,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  KeyRound,
  LogOut,
  Bell,
  ChevronDown,
  User as UserIcon,
} from 'lucide-react';
import { theme } from '../../theme';
import { useAuth } from '../../../auth/AuthContext';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { ProfileModal } from '../../../auth/ProfileModal';
import { UniversalNotificationsDrawer } from '../../../../components/notifications/UniversalNotificationsDrawer';
import { get } from '../../../../api/apiClient';
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
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsDrawerOpen, setIsNotificationsDrawerOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread notifications count
  useEffect(() => {
    let isMounted = true;
    get<{ unreadCount: number }>('/notifications/unread-count')
      .then((res) => {
        if (isMounted && res?.data?.unreadCount !== undefined) {
          setUnreadCount(res.data.unreadCount);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);
  const current = SCREEN_TITLES[activeScreen] || SCREEN_TITLES.dashboard;

  const { user: authUser } = useAuth();
  const displayName = authUser?.fullName || authUser?.username || 'مسؤول النظام';
  const roleObj = authUser?.roles?.[0];
  const roleNameMap: Record<string, string> = {
    admin: 'مدير النظام المركزي',
    school_evaluator: 'مقيّم المدرسة',
    school_principal: 'مدير المدرسة',
    ministry_standards_manager: 'مسؤول إدارة المعايير',
    ministry_supervisor: 'المشرف الوزاري',
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
          {/* Notifications Bell (ADM-TOP-01) */}
          <button
            type="button"
            onClick={() => setIsNotificationsDrawerOpen(true)}
            style={{
              position: 'relative',
              width: '38px',
              height: '38px',
              borderRadius: '9px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B',
              transition: 'all 0.15s ease',
            }}
            title={unreadCount > 0 ? `لديك ${unreadCount} إشعار جديد` : 'مركز التنبيهات والإشعارات'}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#EFF6FF';
              e.currentTarget.style.color = '#2563EB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.color = '#64748B';
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 4px',
                  borderRadius: '999px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
                  border: '2px solid #FFFFFF',
                  boxSizing: 'border-box',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Capsule with Dropdown Menu (UI_STANDARDS.md §7.1) */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px 4px 6px',
                borderRadius: '10px',
                backgroundColor: isUserMenuOpen ? '#F1F5F9' : '#F8FAFC',
                border: '1px solid #E2E8F0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="خيارات الحساب الشخصي"
            >
              {/* Avatar Circle with Initials */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#4F46E5',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '12px',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
                }}
              >
                {userInitials}
              </div>

              {/* User Name & Role text */}
              {!isMobile && (
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: '140px', textAlign: 'right' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#0F172A',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.25,
                    }}
                  >
                    {displayName}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#64748B',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.2,
                      marginTop: '1px',
                      fontWeight: 500,
                    }}
                  >
                    {displayRole}
                  </span>
                </div>
              )}

              <ChevronDown
                size={14}
                style={{
                  color: '#94A3B8',
                  transform: isUserMenuOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                  marginRight: '2px',
                }}
              />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  width: '210px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  border: '1px solid #E2E8F0',
                  padding: '6px',
                  zIndex: 50,
                  direction: 'rtl',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsProfileOpen(true);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#334155',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    textAlign: 'right',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <UserIcon size={15} color="#4F46E5" />
                  <span>ملفي الشخصي</span>
                </button>

                {onOpenChangePassword && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenChangePassword();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#334155',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      textAlign: 'right',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <KeyRound size={15} color="#64748B" />
                    <span>تغيير كلمة المرور</span>
                  </button>
                )}

                {onLogout && (
                  <>
                    <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '4px 0' }} />
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsLogoutConfirmOpen(true);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: '#DC2626',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        textAlign: 'right',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <LogOut size={15} color="#DC2626" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </>
                )}
              </div>
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

      {/* Confirmation Dialog for Logout */}
      {isLogoutConfirmOpen && (
        <ConfirmationDialog
          isOpen={isLogoutConfirmOpen}
          title="تأكيد تسجيل الخروج"
          message="هل أنت متأكد من رغبتك في تسجيل الخروج من لوحة الإدارة المركزية لمنصة ارتقاء؟"
          confirmLabel="نعم، تسجيل الخروج"
          cancelLabel="إلغاء"
          variant="danger"
          onConfirm={() => {
            setIsLogoutConfirmOpen(false);
            onLogout?.();
          }}
          onCancel={() => setIsLogoutConfirmOpen(false)}
        />
      )}

      {/* Profile Modal */}
      {isProfileOpen && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          addToast={() => {}}
        />
      )}

      {/* Universal Notifications Drawer (ADM-TOP-01 / FE-GAP-10) */}
      <UniversalNotificationsDrawer
        isOpen={isNotificationsDrawerOpen}
        onClose={() => setIsNotificationsDrawerOpen(false)}
      />

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
