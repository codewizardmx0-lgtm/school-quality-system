import React, { useState } from 'react';
import { theme } from '../../styles/theme';

export interface DonutSegment {
  id: string;
  label: string;
  value: number;
  color: string;
  description?: string;
}

interface InteractiveDonutChartProps {
  title?: string;
  subtitle?: string;
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

export const InteractiveDonutChart: React.FC<InteractiveDonutChartProps> = ({
  title = 'توزيع مستويات أداء المؤشرات (0 - 3)',
  subtitle = 'تصنيف المؤشرات المرصودة وفق درجات سلم التقييم الرباعي',
  segments,
  size = 220,
  strokeWidth = 32,
  centerLabel = 'إجمالي المرصود',
  centerValue,
}) => {
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const displayCenterValue = centerValue !== undefined ? centerValue : total;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // حساب أقواس الدائرة لكل شريحة
  let accumulatedAngle = 0;
  const segmentsWithArcs = segments.map((seg) => {
    const fraction = total > 0 ? seg.value / total : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedAngle * circumference;
    accumulatedAngle += fraction;

    return {
      ...seg,
      percentage: total > 0 ? Math.round(fraction * 100) : 0,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeSegment = segmentsWithArcs.find((s) => s.id === activeSegmentId);

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

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '24px',
        }}
      >
        {/* SVG Donut */}
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
            role="img"
            aria-label={title}
          >
            {/* Background Circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={theme.colors.neutral[100]}
              strokeWidth={strokeWidth}
            />

            {/* Segment Arcs */}
            {segmentsWithArcs.map((seg) => {
              const isHovered = seg.id === activeSegmentId;
              return (
                <circle
                  key={seg.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    filter: isHovered ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : 'none',
                    opacity: activeSegmentId && !isHovered ? 0.6 : 1,
                  }}
                  onMouseEnter={() => setActiveSegmentId(seg.id)}
                  onMouseLeave={() => setActiveSegmentId(null)}
                />
              );
            })}
          </svg>

          {/* Donut Center Info */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              textAlign: 'center',
            }}
          >
            <span
              style={{
                fontSize: activeSegment ? '26px' : '28px',
                fontWeight: theme.typography.fontWeights.extrabold,
                color: activeSegment ? activeSegment.color : theme.colors.neutral[900],
                lineHeight: 1.1,
                transition: 'color 0.2s',
              }}
            >
              {activeSegment ? `${activeSegment.percentage}%` : displayCenterValue}
            </span>
            <span
              style={{
                fontSize: theme.typography.fontSizes.xs,
                color: theme.colors.neutral[500],
                marginTop: '4px',
                fontWeight: theme.typography.fontWeights.medium,
              }}
            >
              {activeSegment ? activeSegment.label : centerLabel}
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {segmentsWithArcs.map((seg) => {
            const isHovered = seg.id === activeSegmentId;
            return (
              <div
                key={seg.id}
                onMouseEnter={() => setActiveSegmentId(seg.id)}
                onMouseLeave={() => setActiveSegmentId(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: theme.radii.md,
                  backgroundColor: isHovered ? theme.colors.neutral[50] : 'transparent',
                  border: isHovered ? `1px solid ${theme.colors.neutral[200]}` : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: seg.color,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <span
                      style={{
                        fontSize: theme.typography.fontSizes.sm,
                        fontWeight: isHovered ? theme.typography.fontWeights.bold : theme.typography.fontWeights.medium,
                        color: theme.colors.neutral[800],
                        display: 'block',
                      }}
                    >
                      {seg.label}
                    </span>
                    {seg.description && (
                      <span style={{ fontSize: '11px', color: theme.colors.neutral[400] }}>
                        {seg.description}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'left', minWidth: '55px' }}>
                  <span
                    style={{
                      fontSize: theme.typography.fontSizes.sm,
                      fontWeight: theme.typography.fontWeights.bold,
                      color: theme.colors.neutral[900],
                    }}
                  >
                    {seg.value}
                  </span>
                  <span style={{ fontSize: '11px', color: theme.colors.neutral[400], marginRight: '4px' }}>
                    ({seg.percentage}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
