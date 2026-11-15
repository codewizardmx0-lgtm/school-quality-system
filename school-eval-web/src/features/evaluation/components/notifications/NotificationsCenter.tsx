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
  ShieldAlert,
  ArrowLeft,
  Inbox,
  Search,
  ArrowUpDown,
  Filter,
  X,
  RotateCcw,
} from 'lucide-react';

interface NotificationsCenterProps {
  onNavigate: (screen: EvaluatorScreen, param?: number) => void;
  onNotificationsChanged?: () => void;
}

type NotificationCategory = 'all' | 'procedural' | 'completion' | 'improvement' | 'general';

const formatNotificationDate = (dateStr?: string): string => {
  if (!dateStr) return 'مؤخراً';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return dateStr;
  }
};

export const NotificationsCenter: React.FC<NotificationsCenterProps> = ({
  onNavigate,
  onNotificationsChanged,
}) => {
  const [notifications, setNotifications] = useState<EvaluatorNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<NotificationCategory>('all');
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await evaluatorApi.getNotifications();
      setNotifications(Array.isArray(items) ? items : []);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'فشل في تحميل الإشعارات من الخادم.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    try {
      await evaluatorApi.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      onNotificationsChanged?.();
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
      onNotificationsChanged?.();
    } catch (err) {
      console.error(`Failed to mark notification ${id} as read:`, err);
    }
  };

  const classifyNotification = (item: EvaluatorNotificationItem): NotificationCategory => {
    const type = item.type?.toLowerCase() || '';
    if (type.includes('completion') || type.includes('supervisor') || item.relatedEntityType === 'completion_request') {
      return 'completion';
    }
    if (type.includes('action') || type.includes('improvement') || type.includes('plan') || item.relatedEntityType === 'improvement_action') {
      return 'improvement';
    }
    if (type.includes('cycle') || type.includes('locked') || type.includes('seal') || type.includes('legal') || type.includes('procedural')) {
      return 'procedural';
    }
    return 'general';
  };

  const getTargetInfo = (item: EvaluatorNotificationItem): { screen: EvaluatorScreen; label: string } | null => {
    const type = item.type?.toLowerCase() || '';
    if (type.includes('completion') || item.relatedEntityType === 'completion_request') {
      return { screen: 'completion-request', label: 'معالجة طلب الاستكمال' };
    }
    if (type.includes('action') || type.includes('plan') || item.relatedEntityType === 'improvement_action') {
      return { screen: 'improvement-plan', label: 'استعراض خطة التحسين' };
    }
    if (type.includes('version') || item.relatedEntityType === 'standard_version') {
      return { screen: 'standards-tree', label: 'دليل المعايير الوطنية' };
    }
    if (type.includes('report') || type.includes('dossier')) {
      return { screen: 'reports', label: 'مركز التقارير' };
    }
    if (type.includes('seal') || type.includes('review')) {
      return { screen: 'final-review', label: 'المراجعة والختم' };
    }
    return { screen: 'dashboard', label: 'لوحة التحكم' };
  };

  const getIcon = (item: EvaluatorNotificationItem) => {
    const cat = classifyNotification(item);
    switch (cat) {
      case 'completion':
        return <AlertTriangle size={18} color="#D97706" />;
      case 'improvement':
        return <Target size={18} color="#059669" />;
      case 'procedural':
        return <ShieldAlert size={18} color="#2563EB" />;
      default:
        return <Bell size={18} color="#6366F1" />;
    }
  };

  // Filter counts
  const counts = {
    all: notifications.length,
    procedural: notifications.filter((n) => classifyNotification(n) === 'procedural').length,
    completion: notifications.filter((n) => classifyNotification(n) === 'completion').length,
    improvement: notifications.filter((n) => classifyNotification(n) === 'improvement').length,
    general: notifications.filter((n) => classifyNotification(n) === 'general').length,
  };

  const filtered = notifications
    .filter((n) => {
      if (unreadOnly && n.isRead) return false;
      if (category !== 'all' && classifyNotification(n) !== category) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          n.title?.toLowerCase().includes(term) ||
          n.message?.toLowerCase().includes(term)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') {
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      }
      if (sortBy === 'priority') {
        const catWeight: Record<string, number> = { completion: 3, improvement: 2, procedural: 2, general: 1 };
        const pA = (a as any).priority ? ((a as any).priority === 'high' ? 3 : 2) : (catWeight[classifyNotification(a)] || 1);
        const pB = (b as any).priority ? ((b as any).priority === 'high' ? 3 : 2) : (catWeight[classifyNotification(b)] || 1);
        if (pB !== pA) return pB - pA;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

  const hasActiveFilters = Boolean(
    category !== 'all' ||
    unreadOnly ||
    searchTerm.trim() ||
    sortBy !== 'newest'
  );

  const clearAllFilters = () => {
    setCategory('all');
    setUnreadOnly(false);
    setSearchTerm('');
    setSortBy('newest');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
          borderRadius: '16px',
          padding: '24px 30px',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Bell size={26} color="#38BDF8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
                مركز الإشعارات والتنبيهات الإجرائية
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(56, 189, 248, 0.2)',
                  color: '#38BDF8',
                }}
              >
                {notifications.filter((n) => !n.isRead).length} غير مقروء
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0 0' }}>
              المتابعة الإجرائية لطلبات الاستكمال، ومواعيد خطط التحسين، والقرارات التنظيمية المعتمدة
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: unreadOnly ? '#38BDF8' : 'rgba(255, 255, 255, 0.12)',
              color: unreadOnly ? '#0F172A' : '#FFFFFF',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {unreadOnly ? 'عرض الكل' : 'غير المقروء فقط'}
          </button>
          <button
            onClick={markAllAsRead}
            disabled={notifications.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: notifications.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <CheckCheck size={14} />
            <span>تحديد الكل كمقروء</span>
          </button>
        </div>
      </div>

      {/* 5 Category Filter Tabs (Matching Figma) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}
      >
        <button
          onClick={() => setCategory('all')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 16px',
            borderRadius: '10px',
            backgroundColor: category === 'all' ? '#059669' : '#FFFFFF',
            color: category === 'all' ? '#FFFFFF' : '#334155',
            border: `1px solid ${category === 'all' ? '#059669' : '#E2E8F0'}`,
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <span>الكل</span>
          <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', backgroundColor: category === 'all' ? 'rgba(255,255,255,0.25)' : '#F1F5F9' }}>
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => setCategory('completion')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 16px',
            borderRadius: '10px',
            backgroundColor: category === 'completion' ? '#D97706' : '#FFFFFF',
            color: category === 'completion' ? '#FFFFFF' : '#334155',
            border: `1px solid ${category === 'completion' ? '#D97706' : '#E2E8F0'}`,
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <AlertTriangle size={14} />
          <span>طلبات استكمال وملاحظات المشرف</span>
          <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', backgroundColor: category === 'completion' ? 'rgba(255,255,255,0.25)' : '#F1F5F9' }}>
            {counts.completion}
          </span>
        </button>

        <button
          onClick={() => setCategory('improvement')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 16px',
            borderRadius: '10px',
            backgroundColor: category === 'improvement' ? '#059669' : '#FFFFFF',
            color: category === 'improvement' ? '#FFFFFF' : '#334155',
            border: `1px solid ${category === 'improvement' ? '#059669' : '#E2E8F0'}`,
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Target size={14} />
          <span>مواعيد خطة التحسين</span>
          <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', backgroundColor: category === 'improvement' ? 'rgba(255,255,255,0.25)' : '#F1F5F9' }}>
            {counts.improvement}
          </span>
        </button>

        <button
          onClick={() => setCategory('procedural')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 16px',
            borderRadius: '10px',
            backgroundColor: category === 'procedural' ? '#2563EB' : '#FFFFFF',
            color: category === 'procedural' ? '#FFFFFF' : '#334155',
            border: `1px solid ${category === 'procedural' ? '#2563EB' : '#E2E8F0'}`,
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <ShieldAlert size={14} />
          <span>تنبيهات إجرائية وقانونية</span>
          <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', backgroundColor: category === 'procedural' ? 'rgba(255,255,255,0.25)' : '#F1F5F9' }}>
            {counts.procedural}
          </span>
        </button>

        <button
          onClick={() => setCategory('general')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 16px',
            borderRadius: '10px',
            backgroundColor: category === 'general' ? '#475569' : '#FFFFFF',
            color: category === 'general' ? '#FFFFFF' : '#334155',
            border: `1px solid ${category === 'general' ? '#475569' : '#E2E8F0'}`,
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <BookOpen size={14} />
          <span>إشعارات النظام العامة</span>
          <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', backgroundColor: category === 'general' ? 'rgba(255,255,255,0.25)' : '#F1F5F9' }}>
            {counts.general}
          </span>
        </button>
      </div>

      {/* Search and Sort Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '400px' }}>
          <Search size={15} style={{ position: 'absolute', right: '10px', top: '9px', color: '#94A3B8' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث في نص التنبيه أو العنوان..."
            style={{
              width: '100%',
              padding: '6px 32px 6px 10px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '12.5px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowUpDown size={14} color="#64748B" />
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>ترتيب حسب:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
              fontWeight: sortBy !== 'newest' ? 700 : 500,
            }}
          >
            <option value="newest">الأحدث أولاً</option>
            <option value="oldest">الأقدم أولاً</option>
            <option value="priority">الأولوية والأهمية</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RotateCcw size={12} />
              <span>إعادة ضبط</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {hasActiveFilters && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            padding: '10px 14px',
            backgroundColor: '#F8FAFC',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={12} />
            الفلاتر النشطة:
          </span>

          {searchTerm.trim() && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1E40AF',
                fontSize: '11.5px',
                fontWeight: 600,
              }}
            >
              <span>البحث: &quot;{searchTerm}&quot;</span>
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />
            </span>
          )}

          {category !== 'all' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: category === 'completion' ? '#FFFBEB' : category === 'improvement' ? '#ECFDF5' : '#EFF6FF',
                border: `1px solid ${category === 'completion' ? '#FDE68A' : category === 'improvement' ? '#A7F3D0' : '#BFDBFE'}`,
                color: category === 'completion' ? '#92400E' : category === 'improvement' ? '#065F46' : '#1E40AF',
                fontSize: '11.5px',
                fontWeight: 600,
              }}
            >
              <span>
                التصنيف: {category === 'completion' ? 'طلبات استكمال' : category === 'improvement' ? 'مواعيد تحسين' : category === 'procedural' ? 'إجرائية' : 'عامة'}
              </span>
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setCategory('all')} />
            </span>
          )}

          {unreadOnly && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                color: '#15803D',
                fontSize: '11.5px',
                fontWeight: 600,
              }}
            >
              <span>غير المقروء فقط</span>
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setUnreadOnly(false)} />
            </span>
          )}

          {sortBy !== 'newest' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#F1F5F9',
                border: '1px solid #CBD5E1',
                color: '#334155',
                fontSize: '11.5px',
                fontWeight: 600,
              }}
            >
              <span>ترتيب: {sortBy === 'oldest' ? 'الأقدم' : 'الأولوية'}</span>
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSortBy('newest')} />
            </span>
          )}

          <button
            type="button"
            onClick={clearAllFilters}
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#DC2626',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginRight: 'auto',
            }}
          >
            <RotateCcw size={11} />
            <span>مسح كافة الفلاتر</span>
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: '90px', borderRadius: '14px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div style={{ padding: '36px 20px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #FECACA' }}>
          <AlertTriangle size={36} color="#DC2626" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#991B1B' }}>تعذر استرجاع الإشعارات</div>
          <p style={{ fontSize: '12.5px', color: '#64748B', margin: '4px 0 16px' }}>{error}</p>
          <button
            onClick={fetchNotifications}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              backgroundColor: '#0F766E',
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
            padding: '54px 24px',
            textAlign: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
          }}
        >
          <Inbox size={40} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
            {unreadOnly ? 'لا توجد تنبيهات غير مقروءة في هذا التصنيف' : 'لا توجد أي إشعارات مسجلة في هذا التصنيف'}
          </div>
          <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '6px' }}>
            كافة العمليات والإجراءات محدثة ولا توجد مهام معلقة تتطلب التدخل الفوري.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((item) => {
            const target = getTargetInfo(item);
            const isUnread = !item.isRead;

            return (
              <div
                key={item.notificationId}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '14px',
                  border: isUnread ? '1.5px solid #0F766E' : '1px solid #E2E8F0',
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                  boxShadow: isUnread ? '0 4px 12px rgba(15, 118, 110, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '280px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: isUnread ? '#F0FDFA' : '#F8FAFC',
                      border: `1px solid ${isUnread ? '#CCFBF1' : '#E2E8F0'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {getIcon(item)}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: isUnread ? 800 : 700, color: '#0F172A', margin: 0 }}>
                        {item.title}
                      </h3>
                      {isUnread && (
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '10px',
                            backgroundColor: '#ECFDF5',
                            color: '#059669',
                          }}
                        >
                          جديد
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '12.8px', color: '#475569', margin: '4px 0 0 0', lineHeight: 1.55 }}>
                      {item.message}
                    </p>

                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                      {formatNotificationDate(item.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Deep Link Action Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {target && (
                    <button
                      onClick={() => {
                        markSingleAsRead(item.notificationId);
                        onNavigate(target.screen);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        backgroundColor: '#F0FDFA',
                        color: '#0F766E',
                        border: '1px solid #CCFBF1',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span>{target.label}</span>
                      <ArrowLeft size={13} />
                    </button>
                  )}

                  {isUnread && (
                    <button
                      onClick={() => markSingleAsRead(item.notificationId)}
                      title="تحديد كمقروء"
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        color: '#64748B',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
