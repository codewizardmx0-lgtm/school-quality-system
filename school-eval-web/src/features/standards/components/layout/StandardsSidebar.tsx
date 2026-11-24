/**
 * Component: StandardsSidebar
 * القائمة الجانبية المظلمة الثابتة (#0B0F19) لبوابة إدارة المرجعية والمعايير
 * متوافقة مع UI_STANDARDS (§1 و §2):
 * - العرض: 260px (ثابت مع تمدد/انكماش)، ارتفاع 100vh ثابت لا يتحرك مع سكرول الصفحة
 * - نصوص أقل من 18 حرفاً مع whitespace: nowrap لمنع التفاف النصوص
 * - تذييل متزن: حالة المنظومة متصلة ومستقرة + إصدار v1.0
 */

import React from 'react';
import {
  BookOpen,
  GitFork,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Award,
  X,
} from 'lucide-react';

export type StandardsScreenKey = 'versions' | 'workspace' | 'diff-log' | 'tree' | 'weights' | 'audit-lock';

interface StandardsSidebarProps {
  activeScreen: StandardsScreenKey;
  onSelectScreen: (screen: StandardsScreenKey) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItemConfig {
  key: StandardsScreenKey;
  label: string;
  badge?: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
}

const navItems: NavItemConfig[] = [
  { key: 'versions', label: 'سجل وثائق المعايير', icon: BookOpen },
  { key: 'workspace', label: 'بيئة عمل الإصدار', icon: GitFork },
  { key: 'diff-log', label: 'سجل الفروقات والتدقيق', icon: ShieldCheck, badge: 'SHA-256' },
];

export const StandardsSidebar: React.FC<StandardsSidebarProps> = ({
  activeScreen,
  onSelectScreen,
  isCollapsed = false,
  onToggleCollapse,
  isMobile = false,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const sidebarWidth = isMobile ? '280px' : isCollapsed ? '76px' : '260px';

  const sidebarStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '280px',
        backgroundColor: '#0B0F19',
        borderLeft: '1px solid #1E293B',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        transform: isMobileOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isMobileOpen ? '-4px 0 24px rgba(0, 0, 0, 0.5)' : 'none',
        color: '#CBD5E1',
        userSelect: 'none',
      }
    : {
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
      };

  return (
    <aside
      className={`std-sidebar-fixed ${isCollapsed && !isMobile ? 'std-sidebar-collapsed' : ''}`}
      style={sidebarStyle}
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

          {(!isCollapsed || isMobile) && (
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
                أمانة المعايير والمؤشرات
              </span>
            </div>
          )}
        </div>

        {/* Mobile Close Button or Toggle Collapse Button */}
        {isMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            style={{
              padding: '6px',
              borderRadius: '8px',
              color: '#94A3B8',
              cursor: 'pointer',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="إغلاق القائمة"
          >
            <X size={18} />
          </button>
        ) : (
          onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
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
          )
        )}
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
          const isActive =
            activeScreen === item.key ||
            (item.key === 'workspace' && (activeScreen === 'tree' || activeScreen === 'weights')) ||
            (item.key === 'diff-log' && activeScreen === 'audit-lock');

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                onSelectScreen(item.key);
                if (isMobile && onCloseMobile) {
                  onCloseMobile();
                }
              }}
              title={isCollapsed && !isMobile ? item.label : undefined}
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
