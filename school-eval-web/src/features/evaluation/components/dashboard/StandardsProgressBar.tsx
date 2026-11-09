import React from 'react';
import type { StandardProgressItem } from '../../api/evaluationTypes';
import { BookOpen, ChevronLeft } from 'lucide-react';

interface StandardsProgressBarProps {
  standards: StandardProgressItem[];
  onSelectStandard?: (standardId: number) => void;
}

export const StandardsProgressBar: React.FC<StandardsProgressBarProps> = ({
  standards,
  onSelectStandard,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        padding: '24px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#ECFDF5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
            }}
          >
            <BookOpen size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              نسبة اكتمال إدخال ورصد المؤشرات (7 معايير - من 100%)
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
              متابعة مدى اكتمال إدخال ورصد مؤشرات الأداء الـ 109 وشواهدها في كل مجال
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bars List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {standards.map((std) => {
          const isHigh = std.percentage >= 80;
          const isMedium = std.percentage >= 60 && std.percentage < 80;
          const barColor = isHigh ? '#059669' : isMedium ? '#10B981' : '#F59E0B';

          return (
            <div
              key={std.standardId}
              onClick={() => onSelectStandard && onSelectStandard(std.standardId)}
              style={{
                cursor: onSelectStandard ? 'pointer' : 'default',
                padding: '8px',
                borderRadius: '8px',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (onSelectStandard) e.currentTarget.style.backgroundColor = '#F8FAFC';
              }}
              onMouseLeave={(e) => {
                if (onSelectStandard) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                    }}
                  >
                    {std.code}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                    {std.title}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    {std.scoredIndicators} من {std.totalIndicators} مؤشراً
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: barColor, minWidth: '40px', textAlign: 'left' }}>
                    {std.percentage}%
                  </span>
                  {onSelectStandard && <ChevronLeft size={16} color="#94A3B8" />}
                </div>
              </div>

              {/* Bar */}
              <div
                style={{
                  height: '8px',
                  width: '100%',
                  backgroundColor: '#F1F5F9',
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${std.percentage}%`,
                    backgroundColor: barColor,
                    borderRadius: '10px',
                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
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
