/**
 * Component: SupervisionTopBar
 * الشريط العلوي الثابت بارتفاع 68px لبوابة المشرف الوزاري
 * متوافق تماماً مع معايير UI_STANDARDS (§1 و §3):
 * - الارتفاع: 68px بالضبط (height: '68px')
 * - مسار التنقل (Breadcrumb) يبدأ بـ SYSTEM_SHORT_NAME («منصة ارتقاء»)
 * - منع وجود تواريخ أو تقاويم عشوائية في الشريط العلوي (NO RANDOM DATES)
 * - جرس الإشعارات التفاعلي مع عداد غير المقروء المرتبط بالـ API
 * - كبسولة المستخدم التفاعلية: الحروف الأولى، الاسم الكامل، اللقب، مع قائمة منسدلة (الملف الشخصي، تغيير كلمة المرور، تسجيل الخروج)
 * - شارة النطاق المعتمدة: نطاق الإشراف الجغرافي الميداني المعتمد
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  MapPin,
  Bell,
  ChevronDown,
  User as UserIcon,
  KeyRound,
  LogOut,
} from 'lucide-react';
import type { SupervisionScreenKey } from '../../api/supervisionTypes';
import { useAuth } from '../../../../features/auth/AuthContext';
import { ProfileModal } from '../../../auth/ProfileModal';
import { ChangePasswordModal } from '../../../auth/ChangePasswordModal';
import { get } from '../../../../api/apiClient';

interface SupervisionTopBarProps {
  activeScreen: SupervisionScreenKey;
  onNavigate: (screen: SupervisionScreenKey) => void;
  scopeText?: string;
  userName?: string;
  userRole?: string;
}

const screenTitleMap: Record<SupervisionScreenKey, string> = {
  dashboard: 'لوحة المتابعة الميدانية',
  'cycles-list': 'سجل الدورات التقييمية',
  'cycles-new': 'إطلاق دورة تقييم جديدة',
  submissions: 'استلام ومراجعة المخرجات',
  'completion-requests': 'طلبات الاستكمال الموجهة',
  'tracking-log': 'سجل إجراءات المتابعة',
  reports: 'التقارير والتحليلات المركزية',
  historical: 'المقارنة التاريخية التراكمية',
};

const getInitials = (name: string): string => {
  if (!name) return 'م.و';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}.${parts[parts.length - 1][0]}`;
  }
  return parts[0]?.substring(0, 2) ?? 'م.و';
};

export const SupervisionTopBar: React.FC<SupervisionTopBarProps> = ({
  activeScreen,
  onNavigate,
  scopeText = 'الإشراف العام',
  userName = 'المشرف الوزاري',
  userRole = 'المشرف الوزاري',
}) => {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const effectiveName = user?.fullName || userName;
  const effectiveRole = user?.roles?.[0]?.description || userRole;
  const initials = getInitials(effectiveName);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // استرجاع عدد الإشعارات غير المقروءة
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

  const handleLogout = async () => {
    setIsMenuOpen(false);
    if (window.confirm('هل أنت متأكد من رغبتك في تسجيل الخروج من منصة ارتقاء؟')) {
      await logout();
    }
  };

  return (
    <>
      <header
        style={{
          height: '68px',
          maxHeight: '68px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* 1. مسار التنقل النظيف (Breadcrumb) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#64748B',
              cursor: 'pointer',
              padding: 0,
              border: 'none',
              background: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
          >
            منصة ارتقاء
          </button>

          <ChevronLeft size={14} color="#94A3B8" />

          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#64748B',
              cursor: 'pointer',
              padding: 0,
              border: 'none',
              background: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
          >
            بوابة الإشراف الوزاري
          </button>

          {activeScreen !== 'dashboard' && (
            <>
              <ChevronLeft size={14} color="#94A3B8" />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0F172A',
                  whiteSpace: 'nowrap',
                }}
              >
                {screenTitleMap[activeScreen]}
              </span>
            </>
          )}
        </div>

        {/* 2. الجانب الأيسر: شارة النطاق، جرس الإشعارات، وكبسولة المستخدم التفاعلية */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          {/* شارة النطاق الإشرافي (Scope Badge) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '999px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#1E40AF',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <MapPin size={14} color="#2563EB" />
            <span>نطاق: {scopeText}</span>
          </div>

          {/* جرس الإشعارات مع عداد التنبيهات غير المقروءة */}
          <button
            type="button"
            onClick={() => {
              if (unreadCount > 0) {
                alert(`لديك ${unreadCount} إشعار غير مقروء في سجل المتابعة والنظام.`);
              } else {
                alert('لا توجد إشعارات جديدة غير مقروءة.');
              }
            }}
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
            title={unreadCount > 0 ? `لديك ${unreadCount} إشعار جديد` : 'مركز التنبيهات الإشرافية'}
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

          {/* خط فاصل أنيق */}
          <div style={{ width: '1px', height: '26px', backgroundColor: '#E2E8F0' }} />

          {/* كبسولة المستخدم التفاعلية مع القائمة المنسدلة */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '4px 12px 4px 6px',
                borderRadius: '10px',
                backgroundColor: isMenuOpen ? '#F1F5F9' : '#F8FAFC',
                border: '1px solid #E2E8F0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="خيارات الحساب الشخصي"
            >
              {/* الصورة الرمزية بالحروف الأولى */}
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 800,
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                }}
              >
                {initials}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#0F172A',
                    lineHeight: 1.25,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {effectiveName}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#64748B',
                    lineHeight: 1.25,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {effectiveRole}
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

            {/* القائمة المنسدلة للكبسولة */}
            {isMenuOpen && (
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
                    setIsMenuOpen(false);
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
                  <UserIcon size={15} color="#2563EB" />
                  <span>الملف الشخصي</span>
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

                <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '4px 0' }} />

                <button
                  type="button"
                  onClick={handleLogout}
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
              </div>
            )}
          </div>
        </div>
      </header>

      {/* نوافذ الملف الشخصي وتغيير كلمة المرور */}
      {isProfileOpen && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          addToast={() => {}}
        />
      )}
      {isChangePasswordOpen && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          addToast={() => {}}
        />
      )}
    </>
  );
};
