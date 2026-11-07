import React, { useState, useEffect, useCallback } from 'react';
import type { EvaluatorScreen, EvaluatorNotificationItem } from '../../api/evaluationTypes';
import { evaluatorApi } from '../../api/evaluatorApi';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Target,
  CheckCheck,
} from 'lucide-react';

interface NotificationsCenterProps {
  onNavigate: (screen: EvaluatorScreen) => void;
}

export const NotificationsCenter: React.FC<NotificationsCenterProps> = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState<EvaluatorNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await evaluatorApi.getNotifications();
      setNotifications(items);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'فشل في تحميل الإشعارات من الخادم.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filtered = notifications.filter((n) => (filter === 'unread' ? !n.isRead : true));

  const markAllAsRead = async () => {
    try {
      await evaluatorApi.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const markSingleAsRead = async (id: number) => {
    try {
      await evaluatorApi.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(`Failed to mark notification ${id} as read:`, err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'completion_requested':
        return <AlertTriangle size={18} color="#D97706" />;
      case 'action_due_soon':
        return <Target size={18} color="#2563EB" />;
      case 'version_activated':
        return <BookOpen size={18} color="#059669" />;
      case 'cycle_launched':
      default:
        return <CheckCircle2 size={18} color="#059669" />;
    }
  };

  const getTargetScreen = (item: EvaluatorNotificationItem): EvaluatorScreen | undefined => {
    if (item.type === 'completion_requested' || item.relatedEntityType === 'completion_request') {
      return 'completion-request';
    }
    if (item.type === 'action_due_soon' || item.relatedEntityType === 'improvement_action') {
      return 'improvement-plan';
    }
    if (item.type === 'version_activated' || item.relatedEntityType === 'standard_version') {
      return 'standards-tree';
    }
    if (item.type === 'cycle_launched' || item.relatedEntityType === 'cycle') {
      return 'dashboard';
    }
    return undefined;
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
            disabled={notifications.length === 0}
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
              cursor: notifications.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <CheckCheck size={14} />
            تحديد الكل كمقروء
          </button>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: '80px', borderRadius: '12px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div style={{ padding: '36px 20px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #FECACA' }}>
          <AlertTriangle size={36} color="#DC2626" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#991B1B' }}>تعذر استرجاع الإشعارات</div>
          <p style={{ fontSize: '12.5px', color: '#64748B', margin: '4px 0 16px' }}>{error}</p>
          <button
            onClick={fetchNotifications}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: '#059669',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '12px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      ) : filtered.length === 0 ? (
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
            {filter === 'unread' ? 'لا توجد تنبيهات غير مقروءة حالياً' : 'لا توجد أي إشعارات مسجلة لحسابك حالياً'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            {filter === 'unread'
              ? 'كافة الإشعارات الإدارية والتنبيهات الميدانية تمت قراءتها والاطلاع عليها.'
              : 'سيتم إشعارك فور حدوث أي إجراءات أو تكليفات جديدة في دورة التقييم.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((item) => {
            const targetScreen = getTargetScreen(item);
            return (
              <div
                key={item.notificationId}
                onClick={() => {
                  markSingleAsRead(item.notificationId);
                  if (targetScreen) {
                    onNavigate(targetScreen);
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
                  cursor: targetScreen ? 'pointer' : 'default',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (targetScreen) e.currentTarget.style.backgroundColor = '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  if (targetScreen) {
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
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ar-YE') : 'مؤخراً'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
