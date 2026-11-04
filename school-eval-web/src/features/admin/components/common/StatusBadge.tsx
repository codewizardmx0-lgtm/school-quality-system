import React from 'react';

type BadgeVariant = 'active' | 'disabled' | 'warning' | 'info' | 'school' | 'ministry' | 'system' | 'verified' | 'blocked' | 'normal' | 'sensitive' | 'breach' | 'completed' | 'failed' | 'in_progress' | 'linked' | 'unlinked';

interface StatusBadgeProps {
  variant: BadgeVariant;
  label: string;
  size?: 'sm' | 'md';
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string; border: string; dot?: string }> = {
  active:      { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0', dot: '#16A34A' },
  disabled:    { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA', dot: '#DC2626' },
  warning:     { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A', dot: '#D97706' },
  info:        { bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE', dot: '#3B82F6' },
  school:      { bg: '#EDE9FE', text: '#6D28D9', border: '#DDD6FE' },
  ministry:    { bg: '#CFFAFE', text: '#0E7490', border: '#A5F3FC' },
  system:      { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  verified:    { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' },
  blocked:     { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
  normal:      { bg: '#F0F9FF', text: '#0369A1', border: '#BAE6FD' },
  sensitive:   { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  breach:      { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
  completed:   { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' },
  failed:      { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' },
  in_progress: { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  linked:      { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' },
  unlinked:    { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ variant, label, size = 'sm' }) => {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.info;
  const padding = size === 'sm' ? '2px 8px' : '4px 12px';
  const fontSize = size === 'sm' ? '0.7rem' : '0.75rem';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding,
        fontSize,
        fontWeight: 600,
        borderRadius: '9999px',
        backgroundColor: styles.bg,
        color: styles.text,
        border: `1px solid ${styles.border}`,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}
    >
      {styles.dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: styles.dot,
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </span>
  );
};