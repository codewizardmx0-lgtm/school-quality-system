/**
 * Component: StandardsSidebar
 * القائمة الجانبية المظلمة الثابتة (#0B0F19) لبوابة إدارة المرجعية والمعايير
 * متوافقة مع UI_STANDARDS (§1 و §2):
 * - العرض: 260px (ثابت مع تمدد/انكماش)، ارتفاع 100vh ثابت لا يتحرك مع سكرول الصفحة
 * - نصوص أقل من 18 حرفاً مع whitespace: nowrap لمنع التفاف النصوص
 * - تذييل متزن: حالة المنظومة متصلة ومستقرة + إصدار v1.0
 */

import React, { useState } from 'react';
import {
  BookOpen,
  GitFork,
  Scale,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Award,
} from 'lucide-react';

export type StandardsScreenKey = 'versions' | 'tree' | 'weights' | 'audit-lock';

interface StandardsSidebarProps {
  activeScreen: StandardsScreenKey;
  onSelectScreen: (screen: StandardsScreenKey) => void;
  onLogout?: () => void;
}

interface NavItemConfig {
  key: StandardsScreenKey;
  label: string;
  badge?: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
}

const navItems: NavItemConfig[] = [
  { key: 'versions', label: 'سجل الإصدارات', icon: BookOpen },
  { key: 'tree', label: 'بناء الشجرة', icon: GitFork },
  { key: 'weights', label: 'معايرة الأوزان', icon: Scale },
  { key: 'audit-lock', label: 'تدقيق القفل', icon: ShieldCheck, badge: '4/4' },
];

export const StandardsSidebar: React.FC<StandardsSidebarProps> = ({
  activeScreen,
  onSelectScreen,
  onLogout,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sidebarWidth = isCollapsed ? '76px' : '260px';

  return (
    <aside
      className={`std-sidebar-fixed ${isCollapsed ? 'std-sidebar-collapsed' : ''}`}
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        maxWidth: sidebarWidth,
        height: '100vh',
        maxHeight: '100vh',
        backgroundColor: '#0B0F19',
        borderLeft: '1px solid #1E293B',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        zIndex: 50,
        position: 'relative',
        color: '#CBD5E1',
        transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        userSelect: 'none',
      }}
    >
      {/* 1. Header: Platform Name & Authority Badge */}
      <div
        style={{
          height: '68px',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1E293B',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #F59E0B, #B45309)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
            }}
          >
            <Award size={20} color="#FFFFFF" />
          </div>

          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  letterSpacing: '0.01em',
                }}
              >
                منصة ارتقاء
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#FBBF24',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                أمانة المعايير والاعتماد
              </span>
            </div>
          )}
        </div>

        {/* Toggle Collapse Button */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            padding: '6px',
            borderRadius: '8px',
            color: '#94A3B8',
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
        >
          {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* 2. Navigation Items */}
      <nav
        style={{
          flex: 1,
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {!isCollapsed && (
          <div
            style={{
              padding: '0 12px 6px',
              fontSize: '10px',
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            وحدات بوابة المعايير
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectScreen(item.key)}
              title={isCollapsed ? item.label : undefined}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#F59E0B' : '#94A3B8',
                backgroundColor: isActive ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent',
                cursor: 'pointer',
                textAlign: 'right',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon
                size={18}
                color={isActive ? '#F59E0B' : '#64748B'}
                style={{ flexShrink: 0 }}
              />

              {!isCollapsed && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    minWidth: 0,
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 7px',
                        borderRadius: '9999px',
                        fontWeight: 700,
                        backgroundColor: isActive ? '#F59E0B' : '#1E293B',
                        color: isActive ? '#0B0F19' : '#94A3B8',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. Balanced Footer: System Status & Version (§2 UI_STANDARDS) */}
      <div
        style={{
          padding: '14px',
          borderTop: '1px solid #1E293B',
          backgroundColor: 'rgba(3, 7, 18, 0.6)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {!isCollapsed ? (
          <>
            {/* Glowing System Status Indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                fontSize: '11px',
                fontWeight: 600,
                color: '#CBD5E1',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 8px #10B981',
                  display: 'inline-block',
                }}
              />
              <span style={{ whiteSpace: 'nowrap' }}>المنظومة متصلة ومستقرة</span>
              <span
                style={{
                  marginRight: 'auto',
                  fontSize: '9px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: '#0F172A',
                  color: '#94A3B8',
                  fontWeight: 700,
                }}
              >
                v1.0
              </span>
            </div>

            {/* Logout button */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#EF4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  cursor: 'pointer',
                  textAlign: 'right',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <LogOut size={14} />
                <span>تسجيل الخروج</span>
              </button>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                boxShadow: '0 0 8px #10B981',
              }}
              title="المنظومة متصلة ومستقرة v1.0"
            />
          </div>
        )}
      </div>
    </aside>
  );
};
