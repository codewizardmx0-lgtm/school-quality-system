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
  Lock,
} from 'lucide-react';

interface EvaluatorSidebarProps {
  activeScreen: EvaluatorScreen;
  onNavigate: (screen: EvaluatorScreen) => void;
  hasOpenCompletionRequest?: boolean;
  isLocked?: boolean;
  onLogout?: () => void;
}

export const EvaluatorSidebar: React.FC<EvaluatorSidebarProps> = ({
  activeScreen,
  onNavigate,
  hasOpenCompletionRequest = false,
  isLocked = false,
  onLogout,
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
      label: 'لوحة تحكم التقييم',
      icon: <LayoutDashboard size={19} />,
    },
    {
      id: 'standards-tree',
      label: 'شجرة المعايير والمؤشرات',
      icon: <ClipboardList size={19} />,
    },
    {
      id: 'rubric-assessment',
      label: 'استمارة الرصد والتقدير',
      icon: <SlidersHorizontal size={19} />,
      badge: isLocked ? 'مقفل' : undefined,
      badgeColor: '#EF4444',
    },
    {
      id: 'evidences',
      label: 'مستودع الشواهد والأدلة',
      icon: <FolderLock size={19} />,
      badge: '38',
      badgeColor: '#059669',
    },
    {
      id: 'ai-assistant',
      label: 'تحليل الفجوات الذكي (AI)',
      icon: <Sparkles size={19} />,
      badge: 'جديد',
      badgeColor: '#10B981',
    },
    {
      id: 'improvement-plan',
      label: 'خطة التحسين المدرسي',
      icon: <Target size={19} />,
    },
    {
      id: 'final-review',
      label: 'المراجعة والختم الرقمي',
      icon: <FileCheck2 size={19} />,
      badge: isLocked ? 'مختوم' : undefined,
      badgeColor: '#10B981',
    },
    {
      id: 'completion-request',
      label: 'طلب استكمال المشرف',
      icon: <AlertCircle size={19} />,
      badge: hasOpenCompletionRequest ? 'تنبيه' : undefined,
      badgeColor: '#F59E0B',
    },
    {
      id: 'notifications',
      label: 'مركز التنبيهات والإشعارات',
      icon: <Bell size={19} />,
    },
  ];

  return (
    <aside
      className="evaluator-sidebar"
      style={{
        width: '280px',
        minWidth: '280px',
        backgroundColor: '#0B0F19', // Dark Slate Sidebar
        borderLeft: '1px solid #1E293B',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        color: '#F8FAFC',
        userSelect: 'none',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* 1. Brand Header & Notice (Fixed top, flexShrink: 0) */}
      <div style={{ flexShrink: 0 }}>
        {/* Brand Header */}
        <div
          style={{
            padding: '24px 20px',
            borderBottom: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
            }}
          >
            <ShieldCheck size={24} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
              منصة ارتقاء
            </div>
            <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>
              بوابة التقييم والتحسين المدرسي
            </div>
          </div>
        </div>

        {/* Lock / Readonly indicator if applicable */}
        {isLocked && (
          <div
            style={{
              margin: '12px 16px 0',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Lock size={16} color="#EF4444" />
            <div style={{ fontSize: '12px', color: '#FCA5A5', fontWeight: 600 }}>
              الملف مقفل (للقراءة فقط)
            </div>
          </div>
        )}
      </div>

      {/* 2. Navigation Items (Scrollable middle, hidden scrollbar) */}
      <nav
        className="hide-scrollbar"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '16px 12px',
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
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '11px 14px',
                borderRadius: '10px',
                backgroundColor: isActive ? 'rgba(5, 150, 105, 0.18)' : 'transparent',
                color: isActive ? '#34D399' : '#94A3B8',
                border: isActive ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                textAlign: 'right',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: isActive ? '#10B981' : '#64748B' }}>{item.icon}</span>
                <span style={{ fontSize: '13.5px', fontWeight: isActive ? 700 : 500 }}>
                  {item.label}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {item.badge && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '20px',
                      backgroundColor: item.badgeColor || '#059669',
                      color: '#FFFFFF',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronLeft size={16} color="#10B981" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* 3. Footer Info & Logout (Always fixed at bottom with mt-auto, flexShrink: 0) */}
      <div
        style={{
          marginTop: 'auto',
          flexShrink: 0,
          padding: '16px',
          borderTop: '1px solid #1E293B',
          backgroundColor: '#0B0F19',
        }}
      >
        <div
          style={{
            padding: '12px',
            borderRadius: '10px',
            backgroundColor: '#131A29',
            marginBottom: '10px',
            border: '1px solid #1E293B',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0' }}>
            مدرسة الأمل النموذجية
          </div>
          <div style={{ fontSize: '11px', color: '#64748B' }}>
            المقيم: عمار عمر عبدالله
          </div>
          <div style={{ fontSize: '10.5px', color: '#10B981', marginTop: '4px', fontWeight: 600 }}>
            العام الدراسي 2026/2027
          </div>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              color: '#F87171',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              justifyContent: 'center',
            }}
          >
            <LogOut size={16} />
            تسجيل الخروج
          </button>
        )}
      </div>
    </aside>
  );
};
