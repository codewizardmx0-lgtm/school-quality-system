/**
 * Component: SupervisionSidebar
 * القائمة الجانبية المظلمة الثابتة (#0B0F19) لبوابة المشرف الوزاري
 * متوافقة مع معايير UI_STANDARDS (§1 و §2):
 * - العرض: 260px موسع، 76px مصغر مع منع التفاف النصوص (white-space: nowrap)
 * - نصوص قصيرة أقل من 18 حرفاً لتفادي المشاكل على تكبير 125%-150% DPI
 * - تذييل متزن: حالة المنظومة متصلة ومستقرة + شارة وثيقة المعايير الوطنية v2.1
 * - إزالة أي تكرار لملف المستخدم من التذييل
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  FileCheck2,
  FileEdit,
  ClipboardList,
  BarChart3,
  History,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import type { SupervisionScreenKey } from '../../api/supervisionTypes';

interface SupervisionSidebarProps {
  activeScreen: SupervisionScreenKey;
  onSelectScreen: (screen: SupervisionScreenKey) => void;
  onLogout?: () => void;
}

interface NavItemConfig {
  key: SupervisionScreenKey;
  label: string;
  badge?: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
}

const navItems: NavItemConfig[] = [
  { key: 'dashboard', label: 'لوحة المتابعة', icon: LayoutDashboard },
  { key: 'cycles-new', label: 'إطلاق دورة تقييم', icon: PlusCircle },
  { key: 'submissions', label: 'استلام ومراجعة', icon: FileCheck2, badge: '12' },
  { key: 'completion-requests', label: 'طلبات الاستكمال', icon: FileEdit, badge: '5' },
  { key: 'tracking-log', label: 'سجل إجراءات المتابعة', icon: ClipboardList },
  { key: 'reports', label: 'التقارير والتحليل', icon: BarChart3 },
  { key: 'historical', label: 'المقارنة التاريخية', icon: History },
];

export const SupervisionSidebar: React.FC<SupervisionSidebarProps> = ({
  activeScreen,
  onSelectScreen,
  onLogout,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sidebarWidth = isCollapsed ? '76px' : '260px';

  return (
    <aside
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
      {/* 1. Header: Platform Short Name & Authority Badge */}
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
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            }}
          >
            <Building2 size={20} color="#FFFFFF" />
          </div>

          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  letterSpacing: '-0.3px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                منصة ارتقاء
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#93C5FD',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                المشرف الوزاري
              </div>
            </div>
          )}
        </div>

        {/* زر طي/توسيع القائمة الجانبية */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            backgroundColor: '#1E293B',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: 'none',
            flexShrink: 0,
          }}
        >
          {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* 2. Navigation Items */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {navItems.map((item) => {
          const isActive = activeScreen === item.key;
          const Icon = item.icon;

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
                justifyContent: isCollapsed ? 'center' : 'space-between',
                gap: '12px',
                padding: isCollapsed ? '10px 0' : '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#FFFFFF' : '#94A3B8',
                backgroundColor: isActive ? '#2563EB' : 'transparent',
                cursor: 'pointer',
                border: 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.35)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#1E293B';
                  e.currentTarget.style.color = '#F8FAFC';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#94A3B8';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <Icon size={19} color={isActive ? '#FFFFFF' : '#94A3B8'} />
                {!isCollapsed && (
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.label}
                  </span>
                )}
              </div>

              {!isCollapsed && item.badge && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : '#1E293B',
                    color: isActive ? '#FFFFFF' : '#38BDF8',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. Balanced Footer (§2): Status Widget + Active Version Pill */}
      <div
        style={{
          padding: isCollapsed ? '12px 8px' : '14px 16px',
          borderTop: '1px solid #1E293B',
          backgroundColor: '#070B14',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          flexShrink: 0,
        }}
      >
        {/* Glowing system status widget */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: '8px',
          }}
          title="المنظومة متصلة ومستقرة"
        >
          <span
            style={{
              position: 'relative',
              display: 'flex',
              height: '8px',
              width: '8px',
            }}
          >
            <span
              style={{
                position: 'absolute',
                display: 'inline-flex',
                height: '100%',
                width: '100%',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                opacity: 0.75,
                animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
              }}
            />
            <span
              style={{
                position: 'relative',
                display: 'inline-flex',
                borderRadius: '50%',
                height: '8px',
                width: '8px',
                backgroundColor: '#10B981',
              }}
            />
          </span>

          {!isCollapsed && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#10B981',
                whiteSpace: 'nowrap',
              }}
            >
              المنظومة متصلة ومستقرة
            </span>
          )}
        </div>

        {/* Active standards version pill */}
        {!isCollapsed ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              backgroundColor: '#1E293B',
              borderRadius: '6px',
              border: '1px solid #334155',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="#60A5FA" />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#93C5FD',
                  whiteSpace: 'nowrap',
                }}
              >
                وثيقة المعايير الوطنية
              </span>
            </div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#FFFFFF',
                backgroundColor: '#2563EB',
                padding: '1px 6px',
                borderRadius: '4px',
              }}
            >
              v2.1
            </span>
          </div>
        ) : (
          <div
            title="وثيقة المعايير الوطنية v2.1"
            style={{
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#93C5FD',
                backgroundColor: '#1E293B',
                padding: '2px 5px',
                borderRadius: '4px',
              }}
            >
              v2.1
            </span>
          </div>
        )}

        {/* زر تسجيل الخروج إن وجد */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title={isCollapsed ? 'تسجيل الخروج' : undefined}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '8px',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#94A3B8',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1E293B';
              e.currentTarget.style.color = '#EF4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#94A3B8';
            }}
          >
            <LogOut size={15} />
            {!isCollapsed && <span>تسجيل الخروج</span>}
          </button>
        )}
      </div>
    </aside>
  );
};
