/**
 * Component: HistoricalMatrixTable
 * جدول مقارنة الفروقات التراكمية (Delta Matrix) عبر الدورات السابقة
 * محمي بحاوية تمرير أفقي ومطابق لمعايير UI_STANDARDS (§4)
 */

import React, { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, Minus, ArrowUpDown } from 'lucide-react';
import type { HistoricalStandardDelta } from '../../api/supervisionTypes';

interface HistoricalMatrixTableProps {
  standardsDeltas: HistoricalStandardDelta[];
  baseCycleYear: string;
  comparedCycleYear: string;
  previousTotal: number;
  currentTotal: number;
  netDelta: number;
}

type DeltaSortKey = 'name' | 'previousScore' | 'currentScore' | 'delta';
type SortDirection = 'asc' | 'desc';

export const HistoricalMatrixTable: React.FC<HistoricalMatrixTableProps> = ({
  standardsDeltas,
  baseCycleYear,
  comparedCycleYear,
  previousTotal,
  currentTotal,
  netDelta,
}) => {
  const [sortKey, setSortKey] = useState<DeltaSortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (key: DeltaSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'name' ? 'asc' : 'desc');
    }
  };

  const renderSortIndicator = (key: DeltaSortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown size={13} style={{ opacity: 0.35, flexShrink: 0 }} />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={13} style={{ color: '#2563EB', flexShrink: 0 }} />
    ) : (
      <ArrowDown size={13} style={{ color: '#2563EB', flexShrink: 0 }} />
    );
  };

  const sortedDeltas = useMemo(() => {
    const list = [...standardsDeltas];
    return list.sort((a, b) => {
      let valA: any = a[sortKey];
      let valB: any = b[sortKey];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA || '');
      const strB = String(valB || '');
      return sortDirection === 'asc'
        ? strA.localeCompare(strB, 'ar')
        : strB.localeCompare(strA, 'ar');
    });
  }, [standardsDeltas, sortKey, sortDirection]);
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
              <th
                onClick={() => handleSort('name')}
                style={{
                  padding: '14px 18px',
                  fontWeight: 800,
                  width: '40%',
                  cursor: 'pointer',
                  userSelect: 'none',
                  backgroundColor: sortKey === 'name' ? '#EFF6FF' : undefined,
                  color: sortKey === 'name' ? '#1D4ED8' : undefined,
                }}
                title="انقر لفرز المعايير أبجدياً"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>المعيار الوطني الرئيسي</span>
                  {renderSortIndicator('name')}
                </div>
              </th>

              <th
                onClick={() => handleSort('previousScore')}
                style={{
                  padding: '14px 16px',
                  fontWeight: 700,
                  width: '20%',
                  cursor: 'pointer',
                  userSelect: 'none',
                  backgroundColor: sortKey === 'previousScore' ? '#EFF6FF' : undefined,
                  color: sortKey === 'previousScore' ? '#1D4ED8' : undefined,
                }}
                title="انقر للفرز بحسب نتيجة الدورة السابقة"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>دورة {comparedCycleYear} (السابقة)</span>
                  {renderSortIndicator('previousScore')}
                </div>
              </th>

              <th
                onClick={() => handleSort('currentScore')}
                style={{
                  padding: '14px 16px',
                  fontWeight: 700,
                  width: '20%',
                  cursor: 'pointer',
                  userSelect: 'none',
                  backgroundColor: sortKey === 'currentScore' ? '#EFF6FF' : undefined,
                  color: sortKey === 'currentScore' ? '#1D4ED8' : undefined,
                }}
                title="انقر للفرز بحسب نتيجة الدورة الحالية"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>دورة {baseCycleYear} (الحالية)</span>
                  {renderSortIndicator('currentScore')}
                </div>
              </th>

              <th
                onClick={() => handleSort('delta')}
                style={{
                  padding: '14px 18px',
                  fontWeight: 800,
                  width: '20%',
                  textAlign: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                  backgroundColor: sortKey === 'delta' ? '#EFF6FF' : undefined,
                  color: sortKey === 'delta' ? '#1D4ED8' : undefined,
                }}
                title="انقر للفرز بحسب قيمة الفارق (Delta)"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <span>الفارق والاتجاه (Delta)</span>
                  {renderSortIndicator('delta')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedDeltas.map((item, idx) => {
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
