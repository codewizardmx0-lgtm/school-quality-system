import React from 'react';
import { Filter, User, Clock, RefreshCw } from 'lucide-react';
import { theme } from '../../theme';

interface AuditFilterBarProps {
  actionType: string;
  onActionTypeChange: (val: string) => void;
  actor: string;
  onActorChange: (val: string) => void;
  timeScope: string;
  onTimeScopeChange: (val: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  totalFiltered: number;
  totalLogs: number;
}

const ACTION_OPTIONS = [
  'الكل',
  'قفل وثيقة معايير',
  'إصدار طلب استكمال',
  'رفع مخرج نهائي',
  'فشل تسجيل دخول',
  'تعديل صلاحية حساب',
  'إنشاء نسخة احتياطية',
  'تسجيل مدرسة جديدة',
  'إنشاء مستخدم جديد',
  'مراجعة تقرير مدرسة',
];

const ACTOR_OPTIONS = [
  'الكل',
  'د. خالد الرازحي',
  'أ. عبدالرحمن الشامي',
  'عمار عمر عبدالله',
  'حساب مجهول',
  'المهندس عادل ناصر',
  'أحمد محمد الحربي',
  'أ. وليد الحسني',
];

const TIME_OPTIONS = [
  { label: 'آخر 24 ساعة', value: '24h' },
  { label: 'آخر 7 أيام', value: '7d' },
  { label: 'كل السجلات', value: 'all' },
];

export const AuditFilterBar: React.FC<AuditFilterBarProps> = ({
  actionType,
  onActionTypeChange,
  actor,
  onActorChange,
  timeScope,
  onTimeScopeChange,
  onRefresh,
  isLoading,
  totalFiltered,
  totalLogs,
}) => {
  const selectStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: theme.radii.lg,
    border: `1px solid ${theme.colors.neutral[200]}`,
    fontSize: theme.typography.fontSizes.xs,
    backgroundColor: theme.colors.neutral.white,
    color: theme.colors.neutral[800],
    outline: 'none',
    fontFamily: theme.typography.fontFamily.sans,
    cursor: 'pointer',
  };

  return (
    <div
      style={{
        backgroundColor: theme.colors.neutral.white,
        borderRadius: theme.radii.xl,
        padding: '16px 20px',
        border: `1px solid ${theme.colors.neutral[200]}`,
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      {/* Action Type Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Filter size={15} color={theme.colors.neutral[400]} />
        <span style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[600], fontWeight: 600 }}>
          نوع الحدث:
        </span>
        <select value={actionType} onChange={(e) => onActionTypeChange(e.target.value)} style={selectStyle}>
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Actor Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <User size={15} color={theme.colors.neutral[400]} />
        <span style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[600], fontWeight: 600 }}>
          الفاعل / الحساب:
        </span>
        <select value={actor} onChange={(e) => onActorChange(e.target.value)} style={selectStyle}>
          {ACTOR_OPTIONS.map((act) => (
            <option key={act} value={act}>
              {act}
            </option>
          ))}
        </select>
      </div>

      {/* Time Scope Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Clock size={15} color={theme.colors.neutral[400]} />
        <span style={{ fontSize: theme.typography.fontSizes.xs, color: theme.colors.neutral[600], fontWeight: 600 }}>
          النطاق الزمني:
        </span>
        <select value={timeScope} onChange={(e) => onTimeScopeChange(e.target.value)} style={selectStyle}>
          {TIME_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        title="تحديث السجلات"
        style={{
          padding: '7px 12px',
          borderRadius: theme.radii.lg,
          border: `1px solid ${theme.colors.neutral[200]}`,
          backgroundColor: theme.colors.neutral.white,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: theme.colors.neutral[600],
          fontSize: theme.typography.fontSizes.xs,
          fontFamily: theme.typography.fontFamily.sans,
        }}
      >
        <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        تحديث
      </button>

      <span style={{ marginRight: 'auto', fontSize: '0.75rem', color: theme.colors.neutral[400] }}>
        عرض {totalFiltered} من أصل {totalLogs} سجلاً موثقاً
      </span>
    </div>
  );
};
