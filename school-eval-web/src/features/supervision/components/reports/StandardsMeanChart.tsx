/**
 * Component: StandardsMeanChart
 * تمثيل بياني أفقي لمتوسطات أداء المدارس عبر المعايير الوطنية السبعة (مقياس 0 - 3)
 */

import React from 'react';
import type { StandardMeanItem } from '../../api/supervisionTypes';

interface StandardsMeanChartProps {
  standards: StandardMeanItem[];
}

export const StandardsMeanChart: React.FC<StandardsMeanChartProps> = ({ standards }) => {
  const getBarColor = (score: number) => {
    if (score >= 2.5) return '#2563EB'; // أزرق متميز
    if (score >= 2.0) return '#059669'; // زمردي متوسط مرتفع
    if (score >= 1.9) return '#D97706'; // عنبري متوسط
    return '#DC2626'; // أحمر بحاجة لدعم
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '1px solid #F1F5F9',
        }}
      >
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            المتوسطات الحسابية لنتائج المعايير الوطنية السبعة (0 - 3)
          </h2>
          <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            مؤشر الإنجاز الكلي لمدارس النطاق مقارنة بمستويات الكفاءة الوطنية المعتمدة
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#64748B' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#2563EB', borderRadius: '2px' }} />
            متميز (≥ 2.5)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#059669', borderRadius: '2px' }} />
            متوسط (2.0 - 2.49)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: '#DC2626', borderRadius: '2px' }} />
            بحاجة لدعم (&lt; 2.0)
          </span>
        </div>
      </div>

      {/* قائمة الأعمدة البيانية الأفقية */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {standards.map((item) => {
          const barColor = getBarColor(item.meanScore);
          const barWidthPercent = (item.meanScore / 3.0) * 100;

          return (
            <div key={item.standardId}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#64748B',
                      backgroundColor: '#F1F5F9',
                      padding: '1px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {item.code}
                  </span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{item.name}</span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                    ({item.indicatorsCount} مؤشراً)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: barColor }}>
                    {item.meanScore.toFixed(2)} / 3.0
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#64748B',
                      width: '45px',
                      textAlign: 'left',
                    }}
                  >
                    ({item.percentageAttainment.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* شريط التقدم الأفقي */}
              <div
                style={{
                  width: '100%',
                  height: '10px',
                  backgroundColor: '#F1F5F9',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${barWidthPercent}%`,
                    height: '100%',
                    backgroundColor: barColor,
                    borderRadius: '999px',
                    transition: 'width 0.5s ease',
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
