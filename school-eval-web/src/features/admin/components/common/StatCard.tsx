import React from 'react';
import { theme } from '../../theme';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  trend?: { value: string; positive: boolean };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = theme.colors.primary[50],
  iconColor = theme.colors.primary[600],
  trend,
}) => {
  return (
    <div
      style={{
        backgroundColor: theme.colors.neutral.white,
        borderRadius: theme.radii.xl,
        padding: '24px',
        border: `1px solid ${theme.colors.neutral[200]}`,
        boxShadow: theme.shadows.sm,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
        transition: theme.transitions.normal,
        flex: '1 1 200px',
        minWidth: '180px',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: theme.radii.lg,
          backgroundColor: iconBgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: iconColor,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: theme.typography.fontSizes.sm,
            color: theme.colors.neutral[500],
            fontWeight: theme.typography.fontWeights.medium,
            marginBottom: '4px',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: '1.75rem',
            fontWeight: theme.typography.fontWeights.bold,
            color: theme.colors.neutral[900],
            lineHeight: 1.2,
          }}
        >
          {value}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: theme.typography.fontSizes.xs,
              color: theme.colors.neutral[400],
              marginTop: '4px',
            }}
          >
            {subtitle}
          </div>
        )}
        {trend && (
          <div
            style={{
              fontSize: theme.typography.fontSizes.xs,
              color: trend.positive ? theme.colors.status.success.text : theme.colors.status.danger.text,
              marginTop: '4px',
              fontWeight: theme.typography.fontWeights.medium,
            }}
          >
            {trend.value}
          </div>
        )}
      </div>
    </div>
  );
};