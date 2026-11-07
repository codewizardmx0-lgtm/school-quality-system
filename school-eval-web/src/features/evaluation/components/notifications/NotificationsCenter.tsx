import React, { useState } from 'react';
import type { EvaluatorScreen } from '../../api/evaluationTypes';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Target,
  CheckCheck,
} from 'lucide-react';

interface NotificationItem {
  id: number;
  type: 'cycle_launched' | 'completion_requested' | 'action_due_soon' | 'version_activated';
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  targetScreen?: EvaluatorScreen;
}

interface NotificationsCenterProps {
  onNavigate: (screen: EvaluatorScreen) => void;
}

export const NotificationsCenter: React.FC<NotificationsCenterProps> = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 1,
      type: 'completion_requested',
      title: 'طلب استكمال صادر من المشرف الوزاري',
      message: 'أصدر المشرف د. عبدالرحمن الأنسي ملاحظات تدقيق واستكمال على 3 مؤشرات لشواهد الفاقد التعليمي.',
      date: 'منذ ساعتين',
      isRead: false,
      targetScreen: 'completion-request',
    },
    {
      id: 2,
      type: 'action_due_soon',
      title: 'اقتراب موعد استحقاق إجراء تحسين',
      message: 'إجراء "تطوير كفايات المعلمين في استخدام التكنولوجيا التفاعلية" يقترب موعد إنجازه المستهدف.',
      date: 'أمس',
      isRead: false,
      targetScreen: 'improvement-plan',
    },
    {
      id: 3,
      type: 'version_activated',
      title: 'تفعيل المعايير الوطنية المحدثة 2026',
      message: 'تم اعتماد الإصدار المعياري الوطني NSS-2026-V1 وتعميمه على كافة مدارس الجمهورية.',
      date: '2026-10-15',
      isRead: true,
      targetScreen: 'standards-tree',
    },
    {
      id: 4,
      type: 'cycle_launched',
      title: 'إطلاق الدورة الرسمية للتقييم الذاتي 2026/2027',
      message: 'تم تدشين دورة التقييم الذاتي واعتماد حسابات مسؤولي الجودة والتقييم بالمدارس.',
      date: '2026-09-01',
      isRead: true,
      targetScreen: 'dashboard',
    },
  ]);

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = notifications.filter((n) => (filter === 'unread' ? !n.isRead : true));

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markSingleAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'completion_requested':
        return <AlertTriangle size={18} color="#D97706" />;
      case 'action_due_soon':
        return <Target size={18} color="#2563EB" />;
      case 'version_activated':
        return <BookOpen size={18} color="#059669" />;
      case 'cycle_launched':
        return <CheckCircle2 size={18} color="#059669" />;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bell size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              مركز التنبيهات والإشعارات النظامية
            </h2>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '3px 0 0 0' }}>
              سجل الأحداث الإدارية والتنبيهات الميدانية لملف المدرسة
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '8px', padding: '3px' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: filter === 'all' ? '#FFFFFF' : 'transparent',
                color: filter === 'all' ? '#059669' : '#64748B',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              الكل ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: filter === 'unread' ? '#FFFFFF' : 'transparent',
                color: filter === 'unread' ? '#059669' : '#64748B',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              غير المقروءة ({notifications.filter((n) => !n.isRead).length})
            </button>
          </div>

          <button
            onClick={markAllAsRead}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <CheckCheck size={14} />
            تحديد الكل كمقروء
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
            }}
          >
            <CheckCircle2 size={36} color="#059669" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A' }}>
              لا توجد تنبيهات غير مقروءة حالياً
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              كافة الإشعارات الإدارية والتنبيهات الميدانية تمت قراءتها والاطلاع عليها.
            </div>
          </div>
        ) : (
          filtered.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              markSingleAsRead(item.id);
              if (item.targetScreen) {
                onNavigate(item.targetScreen);
              }
            }}
            style={{
              backgroundColor: item.isRead ? '#FFFFFF' : '#F0FDF4',
              borderRadius: '12px',
              border: item.isRead ? '1px solid #E2E8F0' : '1px solid #A7F3D0',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              cursor: item.targetScreen ? 'pointer' : 'default',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (item.targetScreen) e.currentTarget.style.backgroundColor = '#F8FAFC';
            }}
            onMouseLeave={(e) => {
              if (item.targetScreen) {
                e.currentTarget.style.backgroundColor = item.isRead ? '#FFFFFF' : '#F0FDF4';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '2px',
                }}
              >
                {getIcon(item.type)}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: item.isRead ? 700 : 800, color: '#0F172A', margin: 0 }}>
                    {item.title}
                  </h4>
                  {!item.isRead && (
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: '#10B981',
                      }}
                    />
                  )}
                </div>
                <p style={{ fontSize: '12.5px', color: '#475569', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                  {item.message}
                </p>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                  {item.date}
                </div>
              </div>
            </div>
          </div>
        ))
        )}
      </div>
    </div>
  );
};
