import React from 'react';
import {
  LayoutDashboard,
  Users,
  School,
  ShieldCheck,
  Database,
  LogOut,
} from 'lucide-react';
import { theme } from '../../theme';
import type { AdminScreen } from '../../types/admin.types';

interface AdminSidebarProps {
  activeScreen: AdminScreen;
  onNavigate: (screen: AdminScreen) => void;
  onLogout?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeScreen,
  onNavigate,
  onLogout,
}) => {
  const navItems: Array<{ id: AdminScreen; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'dashboard', label: 'لوحة التحكم الرئيسية', icon: <LayoutDashboard size={18} /> },
    { id: 'users', label: 'إدارة المستخدمين والصلاحيات', icon: <Users size={18} /> },
    { id: 'schools', label: 'دليل المدارس والمديريات', icon: <School size={18} /> },
    { id: 'audit', label: 'سجل الأمان والتدقيق العام', icon: <ShieldCheck size={18} />, badge: 'نشط' },
    { id: 'backup', label: 'النسخ الاحتياطي والتهيئة', icon: <Database size={18} /> },
  ];

  return (
    <aside
      className="admin-sidebar"
      style={{
        width: '260px',
        backgroundColor: '#0B0F19', // Dark Navy as specified
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        borderLeft: '1px solid #1E293B',
        fontFamily: theme.typography.fontFamily.sans,
        overflow: 'hidden',
      }}
    >
      {/* Brand Header (flexShrink: 0) */}
      <div
        style={{
          flexShrink: 0,
          padding: '24px 20px',
          borderBottom: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
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
          }}
        >
          ار
        </div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>
            منصة ارتقاء
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '2px' }}>
            بوابة مسؤول النظام المركزي
          </div>
        </div>
      </div>

      {/* Nav List (flex: 1, minHeight: 0, overflowY: 'auto', hidden scrollbar) */}
      <nav
        className="hide-scrollbar"
        style={{
          flex: 1,
          minHeight: 0,
          padding: '20px 12px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div style={{ padding: '0 8px 8px 8px', fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          الوحدات الإدارية المركزية
        </div>

        {navItems.map((item) => {
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
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
                    top: '6px',
                    bottom: '6px',
                    width: '3px',
                    borderRadius: '2px',
                    backgroundColor: '#10B981',
                  }}
                />
              )}
              <span style={{ color: isActive ? '#34D399' : '#64748B' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
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

      {/* Admin User Info Footer & Logout (Fixed at bottom with mt-auto, flexShrink: 0) */}
      <div
        style={{
          marginTop: 'auto',
          flexShrink: 0,
          padding: '16px 20px',
          borderTop: '1px solid #1E293B',
          backgroundColor: '#080C14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            }}
          >
            عن
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F8FAFC' }}>
              المهندس عادل ناصر
            </div>
            <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>
              مدير النظام المركزي (SYS)
            </div>
          </div>
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
