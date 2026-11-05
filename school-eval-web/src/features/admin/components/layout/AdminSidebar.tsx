import React from 'react';
import {
  LayoutDashboard,
  Users,
  School,
  ShieldCheck,
  Database,
  LogOut,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';
import { theme } from '../../theme';
import type { AdminScreen } from '../../types/admin.types';

interface AdminSidebarProps {
  activeScreen: AdminScreen;
  onNavigate: (screen: AdminScreen) => void;
  onLogout?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeScreen,
  onNavigate,
  onLogout,
  isCollapsed = false,
  onToggleCollapse,
  isMobile = false,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems: Array<{ id: AdminScreen; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'dashboard', label: 'لوحة التحكم الرئيسية', icon: <LayoutDashboard size={20} /> },
    { id: 'users', label: 'إدارة المستخدمين والصلاحيات', icon: <Users size={20} /> },
    { id: 'schools', label: 'دليل المدارس والمديريات', icon: <School size={20} /> },
    { id: 'audit', label: 'سجل الأمان والتدقيق العام', icon: <ShieldCheck size={20} />, badge: 'نشط' },
    { id: 'backup', label: 'النسخ الاحتياطي والتهيئة', icon: <Database size={20} /> },
  ];

  const sidebarWidth = isMobile ? '280px' : isCollapsed ? '76px' : '260px';

  const sidebarStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '280px',
        backgroundColor: '#0B0F19',
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        transform: isMobileOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isMobileOpen ? '-4px 0 24px rgba(0, 0, 0, 0.5)' : 'none',
        fontFamily: theme.typography.fontFamily.sans,
      }
    : {
        width: sidebarWidth,
        backgroundColor: '#0B0F19',
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        top: 0,
        bottom: 0,
        right: 0,
        zIndex: 30,
        borderLeft: '1px solid #1E293B',
        fontFamily: theme.typography.fontFamily.sans,
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        overflowX: 'hidden',
      };

  return (
    <aside style={sidebarStyle}>
      {/* Brand Header */}
      <div
        style={{
          padding: isCollapsed && !isMobile ? '20px 12px' : '20px',
          borderBottom: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed && !isMobile ? 'center' : 'space-between',
          gap: '12px',
          minHeight: '68px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            title="منصة ارتقاء للتقييم المدرسي"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: '1.1rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              flexShrink: 0,
            }}
          >
            ار
          </div>
          {(!isCollapsed || isMobile) && (
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                منصة ارتقاء
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '2px', whiteSpace: 'nowrap' }}>
                بوابة مسؤول النظام المركزي
              </div>
            </div>
          )}
        </div>

        {/* Mobile Close Button */}
        {isMobile && (
          <button
            onClick={onCloseMobile}
            title="إغلاق القائمة"
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        )}

        {/* Desktop Collapse Button in Header */}
        {!isMobile && !isCollapsed && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title="طي القائمة الجانبية"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid #1E293B',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Nav List */}
      <nav
        style={{
          flex: 1,
          padding: isCollapsed && !isMobile ? '16px 8px' : '20px 12px',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {(!isCollapsed || isMobile) && (
          <div
            style={{
              padding: '0 8px 8px 8px',
              fontSize: '0.65rem',
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            الوحدات الإدارية المركزية
          </div>
        )}

        {navItems.map((item) => {
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                if (isMobile && onCloseMobile) onCloseMobile();
              }}
              title={isCollapsed && !isMobile ? item.label : undefined}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed && !isMobile ? 'center' : 'flex-start',
                gap: isCollapsed && !isMobile ? '0' : '12px',
                padding: isCollapsed && !isMobile ? '12px 0' : '11px 14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: isActive ? '#1E293B' : 'transparent',
                color: isActive ? '#34D399' : '#94A3B8',
                cursor: 'pointer',
                fontFamily: theme.typography.fontFamily.sans,
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: isActive ? 700 : 500,
                textAlign: 'right',
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
            >
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '8px',
                    bottom: '8px',
                    width: '3px',
                    borderRadius: '2px',
                    backgroundColor: '#10B981',
                  }}
                />
              )}
              <span style={{ color: isActive ? '#34D399' : '#64748B', flexShrink: 0 }}>
                {item.icon}
              </span>
              {(!isCollapsed || isMobile) && (
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.label}
                </span>
              )}
              {(!isCollapsed || isMobile) && item.badge && (
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    color: '#34D399',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle Footer for Desktop when collapsed */}
      {!isMobile && isCollapsed && onToggleCollapse && (
        <div style={{ padding: '10px', borderTop: '1px solid #1E293B', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onToggleCollapse}
            title="توسيع القائمة الجانبية"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid #1E293B',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              width: '100%',
            }}
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      )}

      {/* Admin User Info Footer */}
      <div
        style={{
          padding: isCollapsed && !isMobile ? '14px 8px' : '16px 20px',
          borderTop: '1px solid #1E293B',
          backgroundColor: '#080C14',
          display: 'flex',
          flexDirection: isCollapsed && !isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div
          title="المهندس عادل ناصر - مدير النظام المركزي (SYS)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            justifyContent: isCollapsed && !isMobile ? 'center' : 'flex-start',
            width: isCollapsed && !isMobile ? 'auto' : undefined,
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: '#4F46E5',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.75rem',
              flexShrink: 0,
            }}
          >
            عن
          </div>
          {(!isCollapsed || isMobile) && (
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F8FAFC', whiteSpace: 'nowrap' }}>
                المهندس عادل ناصر
              </div>
              <div style={{ fontSize: '0.65rem', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                مدير النظام المركزي (SYS)
              </div>
            </div>
          )}
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            title="تسجيل الخروج"
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
            }}
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
};
