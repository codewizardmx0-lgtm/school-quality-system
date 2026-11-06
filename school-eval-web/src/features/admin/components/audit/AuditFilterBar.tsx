import React from 'react';
import { Filter, User, Clock, RefreshCw } from 'lucide-react';
import { theme } from '../../theme';
import { AUDIT_EVENT_LABELS } from '../../hooks/useAdminAudit';

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
  currentPage?: number;
  perPage?: number;
  availableEventTypes?: string[];
  availableActors?: string[];
}

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
  totalFiltered: _totalFiltered,
  totalLogs,
  currentPage = 1,
  perPage = 15,
  availableEventTypes = [],
  availableActors = [],
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
          <option value="الكل">الكل (جميع العمليات)</option>
          {availableEventTypes.map((evt) => (
            <option key={evt} value={evt}>
              {AUDIT_EVENT_LABELS[evt] ? `${AUDIT_EVENT_LABELS[evt]} (${evt})` : evt}
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
          <option value="الكل">الكل (جميع الحسابات)</option>
          {availableActors.map((act) => (
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
        {totalLogs > 0 ? `عرض ${(currentPage - 1) * perPage + 1}-${Math.min(currentPage * perPage, totalLogs)} من أصل ${totalLogs} سجلاً موثقاً` : 'لا توجد سجلات موثقة'}
      </span>
    </div>
  );
};
