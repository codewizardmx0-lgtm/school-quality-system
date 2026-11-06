import React from 'react';
import { RefreshCw } from 'lucide-react';
import { theme } from '../../theme';

interface RefreshButtonProps {
  onRefresh: () => void | Promise<void>;
  loading?: boolean;
  lastUpdated?: string;
  size?: 'sm' | 'md';
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  loading = false,
  lastUpdated,
  size = 'md',
}) => {
  return (
    <button
      onClick={onRefresh}
      disabled={loading}
      type="button"
      title={lastUpdated ? `إعادة جلب البيانات اللحظية (آخر تحديث: ${lastUpdated})` : 'إعادة جلب وتحديث البيانات من الخادم'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: size === 'sm' ? '6px 12px' : '8px 14px',
        borderRadius: theme.radii.lg,
        border: `1px solid ${theme.colors.neutral[200]}`,
        backgroundColor: theme.colors.neutral.white,
        color: loading ? theme.colors.neutral[400] : theme.colors.neutral[700],
        fontSize: theme.typography.fontSizes.xs,
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: theme.typography.fontFamily.sans,
        transition: 'all 0.15s ease',
        boxShadow: theme.shadows.sm,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.backgroundColor = theme.colors.neutral[50];
          e.currentTarget.style.borderColor = theme.colors.neutral[300];
        }
      }}
      onMouseLeave={(e) => {
        if (!loading) {
          e.currentTarget.style.backgroundColor = theme.colors.neutral.white;
          e.currentTarget.style.borderColor = theme.colors.neutral[200];
        }
      }}
    >
      <RefreshCw
        size={14}
        className={loading ? 'animate-spin' : ''}
        style={{
          color: loading ? '#4F46E5' : theme.colors.neutral[500],
          transition: 'transform 0.3s ease',
        }}
      />
      <span>{loading ? 'جارٍ التحديث...' : 'تحديث البيانات'}</span>
      {lastUpdated && !loading && (
        <span
          style={{
            fontSize: '0.68rem',
            color: theme.colors.neutral[400],
            backgroundColor: theme.colors.neutral[100],
            padding: '1px 6px',
            borderRadius: '4px',
            marginRight: '2px',
          }}
        >
          {lastUpdated}
        </span>
      )}
    </button>
  );
};
