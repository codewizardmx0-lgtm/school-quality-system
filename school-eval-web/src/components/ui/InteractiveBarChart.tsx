import React, { useState } from 'react';
import { theme } from '../../styles/theme';

export interface BarChartItem {
  id: string | number;
  label: string;
  value: number; // e.g. percentage 0 - 100
  secondaryValue?: string | number;
  total?: number;
  scored?: number;
  weight?: string | number;
}

interface InteractiveBarChartProps {
  title?: string;
  subtitle?: string;
  items: BarChartItem[];
  onSelectItem?: (id: string | number) => void;
  maxScore?: number;
}

export const InteractiveBarChart: React.FC<InteractiveBarChartProps> = ({
  title = 'نسبة استيفاء المجالات المعيارية السبعة',
  subtitle = 'مقارنة معدلات الإنجاز ومستوى التحقق عبر مجالات الأداء المدرسي',
  items,
  onSelectItem,
  maxScore = 100,
}) => {
  const [activeItemId, setActiveItemId] = useState<string | number | null>(null);

  const getBarColor = (percentage: number) => {
    if (percentage >= 80) return theme.colors.primary[600]; // أخضر زمردي
    if (percentage >= 50) return '#0D9488'; // تيل / أزرق بترولي
    if (percentage >= 25) return '#D97706'; // كهرماني
    return '#DC2626'; // أحمر
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: theme.radii.xl,
        padding: '22px 24px',
        border: `1px solid ${theme.colors.neutral[200]}`,
        boxShadow: theme.shadows.sm,
        direction: 'rtl',
        fontFamily: theme.typography.fontFamily.sans,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '18px' }}>
        <h3
          style={{
            fontSize: theme.typography.fontSizes.base,
            fontWeight: theme.typography.fontWeights.bold,
            color: theme.colors.neutral[900],
            margin: 0,
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            style={{
              fontSize: theme.typography.fontSizes.xs,
              color: theme.colors.neutral[500],
              margin: '3px 0 0 0',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Bars Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {items.map((item) => {
          const isHovered = item.id === activeItemId;
          const percentage = Math.min(100, Math.max(0, Math.round((item.value / maxScore) * 100)));
          const barColor = getBarColor(percentage);

          return (
            <div
              key={item.id}
              onClick={() => onSelectItem?.(item.id)}
              onMouseEnter={() => setActiveItemId(item.id)}
              onMouseLeave={() => setActiveItemId(null)}
              style={{
                cursor: onSelectItem ? 'pointer' : 'default',
                padding: '8px 12px',
                borderRadius: theme.radii.md,
                backgroundColor: isHovered ? theme.colors.neutral[50] : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Row Label and Values */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: theme.typography.fontSizes.sm,
                      fontWeight: isHovered ? theme.typography.fontWeights.bold : theme.typography.fontWeights.semibold,
                      color: theme.colors.neutral[800],
                    }}
                  >
                    {item.label}
                  </span>
                  {item.weight && (
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: theme.radii.sm,
                        backgroundColor: theme.colors.neutral[100],
                        color: theme.colors.neutral[600],
                      }}
                    >
                      الوزن: {item.weight}%
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {item.scored !== undefined && item.total !== undefined && (
                    <span style={{ fontSize: '11.5px', color: theme.colors.neutral[500] }}>
                      {item.scored} / {item.total} مؤشر
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: theme.typography.fontSizes.sm,
                      fontWeight: theme.typography.fontWeights.bold,
                      color: barColor,
                    }}
                  >
                    {percentage}%
                  </span>
                </div>
              </div>

              {/* Progress Bar Track */}
              <div
                style={{
                  height: '10px',
                  backgroundColor: theme.colors.neutral[100],
                  borderRadius: '5px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${percentage}%`,
                    backgroundColor: barColor,
                    borderRadius: '5px',
                    transition: 'width 0.4s ease-out, background-color 0.2s',
                    boxShadow: isHovered ? `0 0 8px ${barColor}55` : 'none',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
