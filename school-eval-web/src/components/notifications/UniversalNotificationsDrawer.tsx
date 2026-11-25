/**
 * Component: UniversalNotificationsDrawer
 * الدرج الجانبي المنزلق الموحد للتنبيهات والإشعارات (FE-GAP-10)
 * متوافق تماماً مع دستور الواجهات (UI_STANDARDS.md) ومطابقة الحوكمة (BR-MIN-03)
 * 
 * - انزلاق جانبي احترافي (Slide-over Drawer) بعرض 380px مع خلفية معتمة بتمويه ضبابي
 * - تصنيفات سريعة: الكل، غير المقروءة، الاستكمال، المراجعة والإشراف، الإقرار المعياري، الأمان
 * - بحث نصي سريع مع تمييز غير المقروء بنقطة دلالية ملونة
 * - إجراء «تحديد الكل كمقروء» وتحديد فردي كمقروء عبر الـ API
 * - ربط إجرائي ذكي للنقر: توجيه مباشر للشاشة المعنية مع إغلاق الدرج بسلاسة
 * - تطهير شامل وحظر تام للفظ «الاعتماد» واستبداله بـ «الإقرار الرسمي» أو «المراجعة الإشرافية»
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Search,
  AlertTriangle,
  FileCheck2,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ArrowLeft,
  Inbox,
  RotateCcw,
} from 'lucide-react';
import { useNotifications, type AppNotificationItem } from '../../hooks/useNotifications';
import { SYSTEM_SHORT_NAME } from '../../constants/systemConstants';

interface UniversalNotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (screen: string, param?: unknown) => void;
}

type NotificationTab = 'all' | 'unread' | 'completion' | 'supervision' | 'standards' | 'system';

export const UniversalNotificationsDrawer: React.FC<UniversalNotificationsDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications(isOpen);

  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const drawerRef = useRef<HTMLDivElement>(null);

  // تحديث البيانات عند فتح الدرج
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // إغلاق الدرج عند الضغط على Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // تنسيق التاريخ والوقت بصيغة عربية محلية دقيقة
  const formatTime = (dateStr?: string): string => {
    if (!dateStr) return 'مؤخراً';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'الآن';
      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      if (diffDays === 1) return 'أمس';
      if (diffDays < 7) return `منذ ${diffDays} أيام`;

      return d.toLocaleDateString('ar-YE', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // تطهير نصوص الإشعارات من أي لفظ للاعتماد وفق BR-MIN-03
  const sanitizeText = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/الاعتماد المدرسي/g, 'تقويم الجودة المدرسية')
      .replace(/شهادة الاعتماد/g, 'وثيقة الإقرار المعياري')
      .replace(/قرار الاعتماد/g, 'قرار الإقرار الرسمي')
      .replace(/اعتماد التقييم/g, 'إقرار ومراجعة التقييم')
      .replace(/طلب الاعتماد/g, 'طلب المراجعة والإقرار')
      .replace(/معايير الاعتماد/g, 'المعايير الوطنية لتقويم الجودة')
      .replace(/للاعتماد/g, 'للإقرار الرسمي')
      .replace(/الاعتماد/g, 'الإقرار والمراجعة');
  };

  // تحديد تصنيف ونوع الإشعار واللون والأيقونة المناسبة
  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'completion_requested':
        return {
          icon: <AlertTriangle size={17} color="#D97706" />,
          bgColor: '#FEF3C7',
          borderColor: '#FDE68A',
          badgeText: 'طلب استكمال',
          badgeColor: '#B45309',
          badgeBg: '#FEF3C7',
        };
      case 'cycle_launched':
        return {
          icon: <Calendar size={17} color="#2563EB" />,
          bgColor: '#EFF6FF',
          borderColor: '#BFDBFE',
          badgeText: 'دورة تقييمية',
          badgeColor: '#1D4ED8',
          badgeBg: '#EFF6FF',
        };
      case 'version_activated':
        return {
          icon: <ShieldCheck size={17} color="#059669" />,
          bgColor: '#ECFDF5',
          borderColor: '#A7F3D0',
          badgeText: 'إقرار معياري',
          badgeColor: '#047857',
          badgeBg: '#ECFDF5',
        };
      case 'action_due_soon':
      case 'security_alert':
        return {
          icon: <ShieldAlert size={17} color="#DC2626" />,
          bgColor: '#FEF2F2',
          borderColor: '#FECACA',
          badgeText: 'تنبيه أمان',
          badgeColor: '#B91C1C',
          badgeBg: '#FEF2F2',
        };
      case 'submission_reviewed':
      case 'evaluation_submitted':
        return {
          icon: <FileCheck2 size={17} color="#059669" />,
          bgColor: '#ECFDF5',
          borderColor: '#A7F3D0',
          badgeText: 'مراجعة إشرافية',
          badgeColor: '#065F46',
          badgeBg: '#ECFDF5',
        };
      default:
        return {
          icon: <Bell size={17} color="#64748B" />,
          bgColor: '#F1F5F9',
          borderColor: '#E2E8F0',
          badgeText: 'إشعار نظامي',
          badgeColor: '#475569',
          badgeBg: '#F1F5F9',
        };
    }
  };

  // تصفية الإشعارات بناءً على التبويب المختار ومصطلح البحث
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // 1. تصفية التبويبات
      if (activeTab === 'unread' && item.isRead) return false;
      if (activeTab === 'completion' && item.type !== 'completion_requested') return false;
      if (activeTab === 'supervision' && !['submission_reviewed', 'evaluation_submitted', 'cycle_launched'].includes(item.type)) return false;
      if (activeTab === 'standards' && item.type !== 'version_activated') return false;
      if (activeTab === 'system' && !['security_alert', 'action_due_soon'].includes(item.type)) return false;

      // 2. البحث النصي
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(query);
        const matchesMessage = item.message?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesMessage) return false;
      }

      return true;
    });
  }, [notifications, activeTab, searchTerm]);

  // التفاعل عند النقر على بطاقة الإشعار
  const handleItemClick = async (item: AppNotificationItem) => {
    if (!item.isRead) {
      await markAsRead(item.notificationId);
    }

    if (!onNavigate) {
      return;
    }

    // التوجيه الذكي للشاشة المعنية بحسب نوع الإشعار
    if (item.type === 'completion_requested') {
      onNavigate('completion-request', item.relatedEntityId);
      onClose();
    } else if (item.type === 'cycle_launched') {
      onNavigate('dashboard');
      onClose();
    } else if (item.type === 'version_activated') {
      onNavigate('standards-tree');
      onClose();
    } else if (item.type === 'submission_reviewed' || item.type === 'evaluation_submitted') {
      onNavigate('submissions', item.relatedEntityId);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 1. Backdrop Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 9998,
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* 2. Slide-over Drawer Panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="مركز التنبيهات والإشعارات"
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width: '390px',
          maxWidth: '100vw',
          backgroundColor: '#FFFFFF',
          boxShadow: '4px 0 32px rgba(0, 0, 0, 0.22)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          direction: 'rtl',
          fontFamily: "'Cairo', 'Tajawal', system-ui, -apple-system, sans-serif",
          animation: 'slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Style tag for slide animation */}
        <style>{`
          @keyframes slideInLeft {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB',
              }}
            >
              <Bell size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                  مركز التنبيهات
                </h3>
                {unreadCount > 0 && (
                  <span
                    style={{
                      backgroundColor: '#EF4444',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '1px 7px',
                      borderRadius: '999px',
                    }}
                  >
                    {unreadCount} جديد
                  </span>
                )}
              </div>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                {SYSTEM_SHORT_NAME} • سجل الإجراءات المباشر
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                title="تحديد كافة التنبيهات كمقروءة"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 9px',
                  borderRadius: '7px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  color: '#059669',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0FDF4')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              >
                <CheckCheck size={14} />
                <span>قراءة الكل</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              title="إغلاق الدرج (Esc)"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F1F5F9';
                e.currentTarget.style.color = '#0F172A';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.color = '#64748B';
              }}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Search & Quick Filters */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', backgroundColor: '#FFFFFF', flexShrink: 0 }}>
          {/* Search Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              marginBottom: '10px',
            }}
          >
            <Search size={14} color="#94A3B8" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="البحث في نص أو عنوان التنبيه..."
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                width: '100%',
                fontSize: '12.5px',
                color: '#0F172A',
                fontFamily: 'inherit',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ border: 'none', background: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }} className="hide-scrollbar">
            {(
              [
                { id: 'all', label: 'الكل' },
                { id: 'unread', label: `غير المقروء (${unreadCount})` },
                { id: 'completion', label: 'الاستكمال' },
                { id: 'supervision', label: 'الإشراف' },
                { id: 'standards', label: 'المعايير' },
                { id: 'system', label: 'الأمان' },
              ] as const
            ).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '11.5px',
                    fontWeight: isActive ? 700 : 500,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    border: `1px solid ${isActive ? '#2563EB' : '#E2E8F0'}`,
                    backgroundColor: isActive ? '#2563EB' : '#F8FAFC',
                    color: isActive ? '#FFFFFF' : '#64748B',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications List Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: '#F8FAFC',
          }}
        >
          {isLoading && notifications.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 0' }}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    height: '76px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                textAlign: 'center',
                color: '#94A3B8',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  backgroundColor: '#F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                  color: '#CBD5E1',
                }}
              >
                <Inbox size={28} />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: '#475569' }}>
                لا توجد تنبيهات مطابقة
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', maxWidth: '240px', lineHeight: 1.5 }}>
                {searchTerm || activeTab !== 'all'
                  ? 'لم يتم العثور على تنبيهات وفق الفلاتر المحددة حالياً.'
                  : 'سجل التنبيهات فارغ؛ ستصلك الإشعارات فور صدور قرارات إشرافية أو تحديثات نظامية.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const style = getNotificationStyle(item.type);
              const cleanTitle = sanitizeText(item.title);
              const cleanMessage = sanitizeText(item.message);

              return (
                <div
                  key={item.notificationId}
                  onClick={() => handleItemClick(item)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    backgroundColor: item.isRead ? '#FFFFFF' : '#F0F7FF',
                    border: `1px solid ${item.isRead ? '#E2E8F0' : '#BFDBFE'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    boxShadow: item.isRead ? 'none' : '0 2px 6px rgba(37, 99, 235, 0.06)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#93C5FD';
                    e.currentTarget.style.backgroundColor = item.isRead ? '#F8FAFC' : '#E6F0FA';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = item.isRead ? '#E2E8F0' : '#BFDBFE';
                    e.currentTarget.style.backgroundColor = item.isRead ? '#FFFFFF' : '#F0F7FF';
                  }}
                >
                  {/* Top Row: Type Pill + Timestamp + Unread Dot */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '5px',
                          backgroundColor: style.badgeBg,
                          color: style.badgeColor,
                        }}
                      >
                        {style.icon}
                        {style.badgeText}
                      </span>

                      {!item.isRead && (
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: '#2563EB',
                            display: 'inline-block',
                          }}
                          title="تنبيه غير مقروء"
                        />
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94A3B8', fontSize: '11px' }}>
                      <Clock size={11} />
                      <span>{formatTime(item.createdAt)}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <div style={{ fontSize: '13px', fontWeight: item.isRead ? 600 : 800, color: '#0F172A', lineHeight: 1.3 }}>
                    {cleanTitle}
                  </div>

                  {/* Message body */}
                  <div
                    style={{
                      fontSize: '12px',
                      color: item.isRead ? '#64748B' : '#334155',
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {cleanMessage}
                  </div>

                  {/* Action clue if clickable */}
                  {onNavigate && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#2563EB',
                        marginTop: '2px',
                        alignSelf: 'flex-start',
                      }}
                    >
                      <span>عرض الإجراء والتفاصيل</span>
                      <ArrowLeft size={12} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#64748B',
            flexShrink: 0,
          }}
        >
          <span>سجل التنبيهات الدائم للمنظومة</span>
          <button
            type="button"
            onClick={() => fetchNotifications()}
            title="تحديث قائمة التنبيهات"
            style={{
              border: 'none',
              background: 'none',
              color: '#2563EB',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RotateCcw size={12} />
            <span>تحديث</span>
          </button>
        </div>
      </div>
    </>
  );
};
