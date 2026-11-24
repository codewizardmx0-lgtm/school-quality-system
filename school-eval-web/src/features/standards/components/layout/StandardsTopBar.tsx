/**
 * Component: StandardsTopBar
 * الشريط العلوي الموحد الثابت (68px) لقطاع المعايير والمرجعية
 * متوافق تماماً مع UI_STANDARDS (§1 و §3 و §7):
 * - الارتفاع: 68px تماماً ثابت
 * - مسار التتبع يبدأ بـ «منصة ارتقاء»
 * - شارة الإصدار الرسمي المعتمد الحاكم للدورات
 * - كبسولة المستخدم التفاعلية مع قائمة الإجراءات (الملف الشخصي، تغيير كلمة المرور، تسجيل الخروج)
 * - ربط حقيقي بالمودالات وسياق المصادقة useAuth
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ShieldCheck,
  ChevronDown,
  User as UserIcon,
  KeyRound,
  LogOut,
  Bell,
  Menu,
} from 'lucide-react';
import type { StandardsScreenKey } from './StandardsSidebar';
import { useAuth } from '../../../../hooks/useAuth';
import { ProfileModal } from '../../../auth/ProfileModal';
import { ChangePasswordModal } from '../../../auth/ChangePasswordModal';
import { ConfirmationDialog } from '../../../admin/components/common/ConfirmationDialog';
import { UniversalNotificationsDrawer } from '../../../../components/notifications/UniversalNotificationsDrawer';
import { get } from '../../../../api/apiClient';

interface StandardsTopBarProps {
  activeScreen: StandardsScreenKey;
  activeVersionNo?: string;
  onNavigateHome?: () => void;
  isMobile?: boolean;
  onToggleMobileMenu?: () => void;
  onLogout?: () => void;
}

const screenTitles: Record<StandardsScreenKey, string> = {
  versions: 'سجل وثائق المعايير الوطنية',
  workspace: 'بيئة عمل وتطوير الإصدار المعياري الموحدة',
  'diff-log': 'سجل الفروقات والتدقيق الوزاري وقفل الإقرار',
  tree: 'بناء وهيكلة الشجرة المعيارية والمؤشرات',
  weights: 'معايرة الأوزان وسلالم التقدير',
  'audit-lock': 'تدقيق الفروقات وقفل الإقرار المعياري',
};

export const StandardsTopBar: React.FC<StandardsTopBarProps> = ({
  activeScreen,
  activeVersionNo = '2026.1',
  onNavigateHome,
  isMobile = false,
  onToggleMobileMenu,
  onLogout,
}) => {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isNotificationsDrawerOpen, setIsNotificationsDrawerOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
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

  const handleLogout = () => {
    setIsMenuOpen(false);
    setIsLogoutConfirmOpen(true);
  };

  const displayName = user?.fullName || 'د. خالد الرازحي';
  const roleName = user?.roles?.[0]?.description || 'مسؤول إدارة المعايير والمؤشرات';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('.') || 'د.خ';

  return (
    <>
      <header
        className="std-topbar-fixed"
        style={{
          height: '68px',
          minHeight: '68px',
          maxHeight: '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 12px' : '0 28px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          flexShrink: 0,
          zIndex: 40,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* 1. Breadcrumbs + Mobile Menu Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          {isMobile && onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              title="فتح القائمة الجانبية"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                color: '#1E293B',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Menu size={20} />
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateHome}
            style={{
              fontWeight: 700,
              color: '#1E293B',
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              padding: 0,
            }}
          >
            منصة ارتقاء
          </button>
          <ChevronLeft size={14} color="#94A3B8" />
          <span style={{ color: '#64748B', fontWeight: 500 }}>إدارة المعايير والمؤشرات</span>
          <ChevronLeft size={14} color="#94A3B8" />
          <span style={{ fontWeight: 700, color: '#D97706' }}>{screenTitles[activeScreen]}</span>
        </div>

        {/* 2. Right Side: Official Version Pill & User Capsule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Active Official Version Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '9999px',
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              fontSize: '12px',
              fontWeight: 700,
              color: '#065F46',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
                display: 'inline-block',
              }}
            />
            <ShieldCheck size={15} color="#059669" />
            <span>إصدار رسمي مُقرّ ونافذ ({activeVersionNo})</span>
          </div>

          {/* Notification Bell Button */}
          <button
            type="button"
            onClick={() => setIsNotificationsDrawerOpen(true)}
            style={{
              position: 'relative',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B',
              transition: 'all 0.15s ease',
            }}
            title={unreadCount > 0 ? `لديك ${unreadCount} إشعار غير مقروء` : 'مركز التنبيهات'}
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

          {/* User Capsule with Interactive Dropdown Menu */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '5px 12px 5px 6px',
                backgroundColor: isMenuOpen ? '#F1F5F9' : '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '9999px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="خيارات الحساب الشخصي"
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #D97706, #92400E)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '12px',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B', lineHeight: 1.25 }}>
                  {displayName}
                </span>
                <span style={{ fontSize: '10px', fontWeight: 500, color: '#64748B', lineHeight: 1.25 }}>
                  {roleName}
                </span>
              </div>
              <ChevronDown
                size={14}
                style={{
                  color: '#94A3B8',
                  transform: isMenuOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                  marginRight: '2px',
                }}
              />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  width: '210px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '14px',
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
                    setIsMenuOpen(false);
                    setIsProfileOpen(true);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '9px',
                    fontSize: '12px',
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
                  <UserIcon size={15} color="#D97706" />
                  <span>ملفي الشخصي</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsChangePasswordOpen(true);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '9px',
                    fontSize: '12px',
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

                <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '4px 0' }} />

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '9px',
                    fontSize: '12px',
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
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Profile Modal */}
      {isProfileOpen && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          addToast={() => {}}
        />
      )}

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          addToast={() => {}}
        />
      )}

      {/* Confirmation Dialog for Logout */}
      {isLogoutConfirmOpen && (
        <ConfirmationDialog
          isOpen={isLogoutConfirmOpen}
          title="تأكيد تسجيل الخروج"
          message="هل أنت متأكد من رغبتك في تسجيل الخروج من منصة ارتقاء لإدارة المعايير؟"
          confirmLabel="نعم، تسجيل الخروج"
          cancelLabel="إلغاء"
          variant="danger"
          onConfirm={async () => {
            setIsLogoutConfirmOpen(false);
            if (onLogout) {
              onLogout();
            } else {
              await logout();
            }
          }}
          onCancel={() => setIsLogoutConfirmOpen(false)}
        />
      )}

      {/* Universal Notifications Drawer (FE-GAP-10) */}
      <UniversalNotificationsDrawer
        isOpen={isNotificationsDrawerOpen}
        onClose={() => setIsNotificationsDrawerOpen(false)}
      />
    </>
  );
};
