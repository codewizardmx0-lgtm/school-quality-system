/**
 * Component: HistoricalMatrixTable
 * جدول مقارنة الفروقات التراكمية (Delta Matrix) عبر الدورات السابقة
 * محمي بحاوية تمرير أفقي ومطابق لمعايير UI_STANDARDS (§4)
 */

import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { HistoricalStandardDelta } from '../../api/supervisionTypes';

interface HistoricalMatrixTableProps {
  standardsDeltas: HistoricalStandardDelta[];
  baseCycleYear: string;
  comparedCycleYear: string;
  previousTotal: number;
  currentTotal: number;
  netDelta: number;
}

export const HistoricalMatrixTable: React.FC<HistoricalMatrixTableProps> = ({
  standardsDeltas,
  baseCycleYear,
  comparedCycleYear,
  previousTotal,
  currentTotal,
  netDelta,
}) => {
  const getTrendBadge = (trend: string, delta: number) => {
    if (trend === 'up') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '999px',
            backgroundColor: '#ECFDF5',
            color: '#047857',
            border: '1px solid #A7F3D0',
            fontSize: '11px',
            fontWeight: 800,
          }}
        >
          <ArrowUp size={12} />
          <span>+{delta.toFixed(2)}</span>
        </span>
      );
    }
    if (trend === 'down') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '999px',
            backgroundColor: '#FEF2F2',
            color: '#B91C1C',
            border: '1px solid #FECACA',
            fontSize: '11px',
            fontWeight: 800,
          }}
        >
          <ArrowDown size={12} />
          <span>{delta.toFixed(2)}</span>
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '999px',
          backgroundColor: '#F1F5F9',
          color: '#475569',
          border: '1px solid #E2E8F0',
          fontSize: '11px',
          fontWeight: 700,
        }}
      >
        <Minus size={12} />
        <span>0.00</span>
      </span>
    );
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
      }}
    >
      {/* حاوية التمرير الأفقي المحمية */}
      <div
        style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          width: '100%',
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: '920px',
            borderCollapse: 'collapse',
            textAlign: 'right',
            direction: 'rtl',
            fontSize: '13px',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                color: '#475569',
              }}
            >
              <th style={{ padding: '14px 18px', fontWeight: 800, width: '40%' }}>المعيار الوطني الرئيسي</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, width: '20%' }}>
                دورة {comparedCycleYear} (السابقة)
              </th>
              <th style={{ padding: '14px 16px', fontWeight: 700, width: '20%' }}>
                دورة {baseCycleYear} (الحالية)
              </th>
              <th style={{ padding: '14px 18px', fontWeight: 800, width: '20%', textAlign: 'center' }}>
                الفارق والاتجاه (Delta)
              </th>
            </tr>
          </thead>
          <tbody>
            {standardsDeltas.map((item, idx) => {
              const isEven = idx % 2 === 1;
              return (
                <tr
                  key={item.standardId}
                  style={{
                    backgroundColor: isEven ? '#FAFBFD' : '#FFFFFF',
                    borderBottom: '1px solid #F1F5F9',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0F7FF')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isEven ? '#FAFBFD' : '#FFFFFF')}
                >
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0F172A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#2563EB',
                          backgroundColor: '#EFF6FF',
                          padding: '1px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {item.standardId}
                      </span>
                      <span>{item.name}</span>
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', color: '#64748B', fontWeight: 600 }}>
                    {item.previousScore.toFixed(2)} / 3.0
                  </td>

                  <td style={{ padding: '14px 16px', color: '#0F172A', fontWeight: 800 }}>
                    {item.currentScore.toFixed(2)} / 3.0
                  </td>

                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    {getTrendBadge(item.trend, item.delta)}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* تذييل المجموع التراكمي الشامل */}
          <tfoot>
            <tr
              style={{
                backgroundColor: '#EFF6FF',
                borderTop: '2px solid #BFDBFE',
                fontWeight: 800,
                color: '#1E3A8A',
              }}
            >
              <td style={{ padding: '16px 18px', fontSize: '14px' }}>
                المتوسط التراكمي العام للمدرسة
              </td>
              <td style={{ padding: '16px 16px', fontSize: '14px', color: '#475569' }}>
                {previousTotal.toFixed(2)} / 3.0
              </td>
              <td style={{ padding: '16px 16px', fontSize: '15px', color: '#1E40AF' }}>
                {currentTotal.toFixed(2)} / 3.0
              </td>
              <td style={{ padding: '16px 18px', textAlign: 'center' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 800,
                  }}
                >
                  <ArrowUp size={14} />
                  <span>+{netDelta.toFixed(2)} نمو إيجابي صافي</span>
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
