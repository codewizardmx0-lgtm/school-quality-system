import React from 'react';
import type { EvaluatorScreen } from '../../api/evaluationTypes';
import {
  LayoutDashboard,
  ClipboardList,
  SlidersHorizontal,
  FolderLock,
  Sparkles,
  Target,
  FileCheck2,
  AlertCircle,
  Bell,
  LogOut,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Lock,
  X,
} from 'lucide-react';
import { SYSTEM_SHORT_NAME } from '../../../../constants/systemConstants';

interface EvaluatorSidebarProps {
  activeScreen: EvaluatorScreen;
  onNavigate: (screen: EvaluatorScreen) => void;
  hasOpenCompletionRequest?: boolean;
  isLocked?: boolean;
  onLogout?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const EvaluatorSidebar: React.FC<EvaluatorSidebarProps> = ({
  activeScreen,
  onNavigate,
  hasOpenCompletionRequest = false,
  isLocked = false,
  onLogout,
  isCollapsed = false,
  onToggleCollapse,
  isMobile = false,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems: {
    id: EvaluatorScreen;
    label: string;
    icon: React.ReactNode;
    badge?: string;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم',
      icon: <LayoutDashboard size={19} />,
    },
    {
      id: 'standards-tree',
      label: 'شجرة المعايير',
      icon: <ClipboardList size={19} />,
    },
    {
      id: 'rubric-assessment',
      label: 'استمارة الرصد',
      icon: <SlidersHorizontal size={19} />,
      badge: isLocked ? 'مقفل' : undefined,
      badgeColor: '#EF4444',
    },
    {
      id: 'evidences',
      label: 'مستودع الشواهد',
      icon: <FolderLock size={19} />,
      badge: '38',
      badgeColor: '#059669',
    },
    {
      id: 'ai-assistant',
      label: 'المساعد الذكي (AI)',
      icon: <Sparkles size={19} />,
      badge: 'جديد',
      badgeColor: '#10B981',
    },
    {
      id: 'improvement-plan',
      label: 'خطة التحسين',
      icon: <Target size={19} />,
    },
    {
      id: 'final-review',
      label: 'المراجعة والختم',
      icon: <FileCheck2 size={19} />,
      badge: isLocked ? 'مختوم' : undefined,
      badgeColor: '#10B981',
    },
    {
      id: 'completion-request',
      label: 'طلب الاستكمال',
      icon: <AlertCircle size={19} />,
      badge: hasOpenCompletionRequest ? 'تنبيه' : undefined,
      badgeColor: '#F59E0B',
    },
    {
      id: 'notifications',
      label: 'مركز التنبيهات',
      icon: <Bell size={19} />,
    },
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
        fontFamily: "'Cairo', 'Tajawal', system-ui, -apple-system, sans-serif",
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
        fontFamily: "'Cairo', 'Tajawal', system-ui, -apple-system, sans-serif",
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        overflowX: 'hidden',
      };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && isMobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9998,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      <aside className="evaluator-sidebar" style={sidebarStyle}>
        {/* 1. Brand Header */}
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
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={22} color="#FFFFFF" />
            </div>

            {(!isCollapsed || isMobile) && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
                  {SYSTEM_SHORT_NAME}
                </div>
                <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  بوابة التقييم والتحسين
                </div>
              </div>
            )}
          </div>

          {/* Close button for Mobile Drawer */}
          {isMobile && (
            <button
              onClick={onCloseMobile}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
              }}
            >
              <X size={20} />
            </button>
          )}

          {/* Desktop Collapse Toggle */}
          {!isMobile && !isCollapsed && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title="طي القائمة الجانبية"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid #1E293B',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
              }}
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* Lock indicator if applicable */}
        {isLocked && (
          <div
            style={{
              margin: isCollapsed && !isMobile ? '8px 6px 0' : '12px 14px 0',
              padding: isCollapsed && !isMobile ? '8px 4px' : '8px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed && !isMobile ? 'center' : 'flex-start',
              gap: '8px',
            }}
            title={isCollapsed && !isMobile ? 'الملف مقفل (للقراءة فقط)' : undefined}
          >
            <Lock size={15} color="#EF4444" />
            {(!isCollapsed || isMobile) && (
              <div style={{ fontSize: '11.5px', color: '#FCA5A5', fontWeight: 600, whiteSpace: 'nowrap' }}>
                الملف مقفل (للقراءة فقط)
              </div>
            )}
          </div>
        )}

        {/* 2. Navigation Items */}
        <nav
          className="hide-scrollbar"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: isCollapsed && !isMobile ? '12px 6px' : '14px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {navItems.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (isMobile && onCloseMobile) {
                    onCloseMobile();
                  }
                }}
                title={isCollapsed && !isMobile ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCollapsed && !isMobile ? 'center' : 'space-between',
                  width: '100%',
                  padding: isCollapsed && !isMobile ? '10px 0' : '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: isActive ? 'rgba(5, 150, 105, 0.18)' : 'transparent',
                  color: isActive ? '#34D399' : '#94A3B8',
                  border: isActive ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  textAlign: 'right',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#131A29';
                    e.currentTarget.style.color = '#F1F5F9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#94A3B8';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <span style={{ color: isActive ? '#10B981' : '#64748B', flexShrink: 0 }}>{item.icon}</span>
                  {(!isCollapsed || isMobile) && (
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: isActive ? 700 : 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </div>

                {(!isCollapsed || isMobile) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {item.badge && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '12px',
                          backgroundColor: item.badgeColor || '#059669',
                          color: '#FFFFFF',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronLeft size={15} color="#10B981" />}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Expand toggle when collapsed */}
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

        {/* 3. Footer Balanced Identity (UI_STANDARDS.md §2.5) */}
        <div
          style={{
            marginTop: 'auto',
            flexShrink: 0,
            padding: isCollapsed && !isMobile ? '12px 6px' : '14px',
            borderTop: '1px solid #1E293B',
            backgroundColor: '#080C14',
          }}
        >
          {isCollapsed && !isMobile ? (
            <div
              title={`${SYSTEM_SHORT_NAME} • بوابة التقييم الذاتي متصلة ومستقرة`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 8px rgba(16, 185, 129, 0.7)',
                }}
              />
              <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 700 }}>v1.0</span>
            </div>
          ) : (
            <>
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#131A29',
                  marginBottom: '8px',
                  border: '1px solid #1E293B',
                }}
              >
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  مدرسة الأمل النموذجية
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                  المقيم: عمار عمر عبدالله
                </div>
                <div style={{ fontSize: '10px', color: '#10B981', marginTop: '3px', fontWeight: 600 }}>
                  العام الدراسي 2026/2027
                </div>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    color: '#F87171',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    justifyContent: 'center',
                  }}
                >
                  <LogOut size={15} />
                  تسجيل الخروج
                </button>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
};
