import React from 'react';
import {
  LayoutDashboard,
  Users,
  School,
  ShieldCheck,
  Database,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';
import { theme } from '../../theme';
import type { AdminScreen } from '../../types/admin.types';
import { SYSTEM_SHORT_NAME } from '../../../../constants/systemConstants';

interface AdminSidebarProps {
  activeScreen: AdminScreen;
  onNavigate: (screen: AdminScreen) => void;
  onLogout?: () => void;
  onOpenChangePassword?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeScreen,
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
  isMobile = false,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems: Array<{ id: AdminScreen; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'dashboard', label: 'لوحة التحكم الرئيسية', icon: <LayoutDashboard size={20} /> },
    { id: 'users', label: 'المستخدمين والصلاحيات', icon: <Users size={20} /> },
    { id: 'schools', label: 'دليل المدارس والمديريات', icon: <School size={20} /> },
    { id: 'audit', label: 'الأمان والتدقيق', icon: <ShieldCheck size={20} />, badge: 'نشط' },
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
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '1.15rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              flexShrink: 0,
            }}
          >
            {SYSTEM_SHORT_NAME[0]}
          </div>
          {(!isCollapsed || isMobile) && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {SYSTEM_SHORT_NAME}
              </span>
              <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>
                لوحة الإدارة المركزية
              </span>
            </div>
          )}
        </div>

        {/* Mobile Close Button */}
        {isMobile && onCloseMobile && (
          <button
            onClick={onCloseMobile}
            title="إغلاق القائمة"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#94A3B8',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        )}

        {/* Desktop Collapse Toggle in Header */}
        {!isMobile && !isCollapsed && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title="طي القائمة الجانبية"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: '1px solid #1E293B',
              backgroundColor: 'transparent',
              color: '#64748B',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#F8FAFC';
              e.currentTarget.style.borderColor = '#334155';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#64748B';
              e.currentTarget.style.borderColor = '#1E293B';
            }}
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav
        style={{
          flex: 1,
          padding: isCollapsed && !isMobile ? '16px 8px' : '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          overflowY: 'auto',
        }}
      >
        {navItems.map((item) => {
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={isCollapsed && !isMobile ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isCollapsed && !isMobile ? 0 : '12px',
                justifyContent: isCollapsed && !isMobile ? 'center' : 'flex-start',
                padding: isCollapsed && !isMobile ? '12px' : '12px 14px',
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
        <div style={{ padding: '8px', borderTop: '1px solid #1E293B', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onToggleCollapse}
            title="توسيع القائمة الجانبية"
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
              width: '100%',
            }}
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      )}

      {/* System Status & Identity Balanced Footer */}
      <div
        style={{
          padding: isCollapsed && !isMobile ? '14px 8px' : '14px 16px',
          borderTop: '1px solid #1E293B',
          backgroundColor: '#080C14',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {isCollapsed && !isMobile ? (
          <div
            title={`${SYSTEM_SHORT_NAME} • الخادم متصل ومستقر (v1.0)`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.7)',
              }}
            />
            <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 700 }}>
              v1.0
            </span>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                  }}
                />
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94A3B8' }}>
                  المنظومة متصلة ومستقرة
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  color: '#818CF8',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                }}
              >
                v1.0
              </span>
            </div>
            <div style={{ fontSize: '0.65rem', color: '#64748B', lineHeight: 1.4, marginTop: '2px' }}>
              وزارة التربية والتعليم والبحث العلمي
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
