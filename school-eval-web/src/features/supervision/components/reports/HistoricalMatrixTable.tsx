/**
 * Component: HistoricalMatrixTable
 * جدول مصفوفة المقارنة التراكمية للهيكل الوطني (المعايير السبعة والمؤشرات الـ 109)
 * بعرض كامل 100% ومطابق لمعايير UI_STANDARDS (§5)
 */

import React, { useState, useMemo } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Minus,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { HistoricalStandardDelta, HistoricalIndicatorDelta } from '../../api/supervisionTypes';

interface HistoricalMatrixTableProps {
  standardsDeltas: HistoricalStandardDelta[];
  allIndicatorsDeltas?: HistoricalIndicatorDelta[];
  baseCycleYear: string;
  comparedCycleYear: string;
  previousTotal: number;
  currentTotal: number;
  netDelta: number;
  isSameCycle?: boolean;
}

type DeltaSortKey = 'name' | 'previousScore' | 'currentScore' | 'delta';
type SortDirection = 'asc' | 'desc';
type IndicatorFilterType = 'all' | 'improved' | 'regressed' | 'maintained' | 'new';

export const HistoricalMatrixTable: React.FC<HistoricalMatrixTableProps> = ({
  standardsDeltas,
  allIndicatorsDeltas = [],
  baseCycleYear,
  comparedCycleYear,
  previousTotal,
  currentTotal,
  netDelta,
  isSameCycle = false,
}) => {
  const [sortKey, setSortKey] = useState<DeltaSortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedStandards, setExpandedStandards] = useState<Record<number, boolean>>({});
  const [indicatorFilter, setIndicatorFilter] = useState<IndicatorFilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // في حال اختيار نفس الدورة، تصفر كافة الفوارق ويصبح الأداء متطابقاً 0.00
  const effectiveStandardsDeltas = useMemo(() => {
    if (!isSameCycle) return standardsDeltas;
    return standardsDeltas.map((s) => ({
      ...s,
      previousScore: s.currentScore,
      delta: 0.0,
      percentage: 0.0,
      trend: 'neutral' as const,
    }));
  }, [standardsDeltas, isSameCycle]);

  const effectiveIndicatorsDeltas = useMemo(() => {
    if (!isSameCycle) return allIndicatorsDeltas;
    return allIndicatorsDeltas.map((ind) => ({
      ...ind,
      previousScore: ind.currentScore,
      delta: 0,
      trend: 'maintained' as const,
    }));
  }, [allIndicatorsDeltas, isSameCycle]);

  const displayPrevTotal = isSameCycle ? currentTotal : previousTotal;
  const displayNetDelta = isSameCycle ? 0.0 : netDelta;

  // تبديل توسيع معيار معين
  const toggleStandard = (stdId: number) => {
    setExpandedStandards((prev) => ({
      ...prev,
      [stdId]: !prev[stdId],
    }));
  };

  // توسيع / طي الكل
  const toggleAll = (expand: boolean) => {
    const updated: Record<number, boolean> = {};
    effectiveStandardsDeltas.forEach((s) => {
      updated[s.standardId] = expand;
    });
    setExpandedStandards(updated);
  };

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

  // فرز المعايير السبعة
  const sortedDeltas = useMemo(() => {
    const list = [...effectiveStandardsDeltas];
    return list.sort((a, b) => {
      const valA: unknown = a[sortKey];
      const valB: unknown = b[sortKey];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA || '');
      const strB = String(valB || '');
      return sortDirection === 'asc'
        ? strA.localeCompare(strB, 'ar')
        : strB.localeCompare(strA, 'ar');
    });
  }, [effectiveStandardsDeltas, sortKey, sortDirection]);

  // تصفية المؤشرات بحسب الفلتر والبحث
  const filteredIndicatorsMap = useMemo(() => {
    const map: Record<number, HistoricalIndicatorDelta[]> = {};

    effectiveStandardsDeltas.forEach((s) => {
      map[s.standardId] = [];
    });

    effectiveIndicatorsDeltas.forEach((ind) => {
      // 1. فحص الفلتر
      if (indicatorFilter !== 'all' && ind.trend !== indicatorFilter) {
        return;
      }
      // 2. فحص البحث
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchCode = ind.code.toLowerCase().includes(q);
        const matchName = ind.name.toLowerCase().includes(q);
        const matchSub = ind.subStandardName?.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchSub) {
          return;
        }
      }

      if (!map[ind.standardId]) {
        map[ind.standardId] = [];
      }
      map[ind.standardId].push(ind);
    });

    return map;
  }, [effectiveStandardsDeltas, effectiveIndicatorsDeltas, indicatorFilter, searchQuery]);

  // إحصاءات المؤشرات للفلاتر
  const indicatorsCounts = useMemo(() => {
    let improved = 0;
    let regressed = 0;
    let maintained = 0;
    let newlyAdded = 0;

    allIndicatorsDeltas.forEach((i) => {
      if (i.trend === 'improved') improved++;
      else if (i.trend === 'regressed') regressed++;
      else if (i.trend === 'maintained') maintained++;
      else if (i.trend === 'new') newlyAdded++;
    });

    return {
      all: allIndicatorsDeltas.length,
      improved,
      regressed,
      maintained,
      new: newlyAdded,
    };
  }, [allIndicatorsDeltas]);

  const getTrendBadge = (trend: string, delta: number) => {
    if (trend === 'up' || trend === 'improved') {
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
    if (trend === 'down' || trend === 'regressed') {
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

  const getIndicatorTrendPill = (trend: string, delta: number) => {
    switch (trend) {
      case 'improved':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '2px 7px',
              borderRadius: '999px',
              backgroundColor: '#ECFDF5',
              color: '#047857',
              border: '1px solid #A7F3D0',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            <ArrowUp size={11} />
            <span>تحسن (+{delta})</span>
          </span>
        );
      case 'regressed':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '2px 7px',
              borderRadius: '999px',
              backgroundColor: '#FEF2F2',
              color: '#B91C1C',
              border: '1px solid #FECACA',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            <ArrowDown size={11} />
            <span>تراجع ({delta})</span>
          </span>
        );
      case 'new':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '2px 7px',
              borderRadius: '999px',
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              border: '1px solid #BFDBFE',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            <Sparkles size={11} />
            <span>مستحدث 🆕</span>
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '2px 7px',
              borderRadius: '999px',
              backgroundColor: '#F8FAFC',
              color: '#64748B',
              border: '1px solid #E2E8F0',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            <Minus size={11} />
            <span>ثبات (0)</span>
          </span>
        );
    }
  };

  const isAllExpanded = useMemo(() => {
    return standardsDeltas.length > 0 && standardsDeltas.every((s) => expandedStandards[s.standardId]);
  }, [standardsDeltas, expandedStandards]);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      {/* 1. شريط التحكم والفلاتر والبحث أعلى الجدول */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#FAFBFD',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        {/* فلاتر تصنيف المؤشرات */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={14} color="#64748B" />
            <span>فلترة حركة المؤشرات:</span>
          </span>

          <button
            type="button"
            onClick={() => setIndicatorFilter('all')}
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: indicatorFilter === 'all' ? 800 : 600,
              backgroundColor: indicatorFilter === 'all' ? '#0F172A' : '#FFFFFF',
              color: indicatorFilter === 'all' ? '#FFFFFF' : '#475569',
              border: '1px solid ' + (indicatorFilter === 'all' ? '#0F172A' : '#CBD5E1'),
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            الكل ({indicatorsCounts.all})
          </button>

          <button
            type="button"
            onClick={() => setIndicatorFilter('improved')}
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: indicatorFilter === 'improved' ? 800 : 600,
              backgroundColor: indicatorFilter === 'improved' ? '#ECFDF5' : '#FFFFFF',
              color: indicatorFilter === 'improved' ? '#047857' : '#475569',
              border: '1px solid ' + (indicatorFilter === 'improved' ? '#A7F3D0' : '#CBD5E1'),
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ArrowUp size={12} color="#059669" />
            <span>المتحسنة ({indicatorsCounts.improved})</span>
          </button>

          <button
            type="button"
            onClick={() => setIndicatorFilter('regressed')}
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: indicatorFilter === 'regressed' ? 800 : 600,
              backgroundColor: indicatorFilter === 'regressed' ? '#FEF2F2' : '#FFFFFF',
              color: indicatorFilter === 'regressed' ? '#B91C1C' : '#475569',
              border: '1px solid ' + (indicatorFilter === 'regressed' ? '#FECACA' : '#CBD5E1'),
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ArrowDown size={12} color="#DC2626" />
            <span>المتراجعة ({indicatorsCounts.regressed})</span>
          </button>

          <button
            type="button"
            onClick={() => setIndicatorFilter('maintained')}
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: indicatorFilter === 'maintained' ? 800 : 600,
              backgroundColor: indicatorFilter === 'maintained' ? '#F1F5F9' : '#FFFFFF',
              color: indicatorFilter === 'maintained' ? '#1E293B' : '#475569',
              border: '1px solid ' + (indicatorFilter === 'maintained' ? '#CBD5E1' : '#E2E8F0'),
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Minus size={12} color="#64748B" />
            <span>المستقرة ({indicatorsCounts.maintained})</span>
          </button>

          {indicatorsCounts.new > 0 && (
            <button
              type="button"
              onClick={() => setIndicatorFilter('new')}
              style={{
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: indicatorFilter === 'new' ? 800 : 600,
                backgroundColor: indicatorFilter === 'new' ? '#EFF6FF' : '#FFFFFF',
                color: indicatorFilter === 'new' ? '#1D4ED8' : '#475569',
                border: '1px solid ' + (indicatorFilter === 'new' ? '#BFDBFE' : '#CBD5E1'),
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Sparkles size={12} color="#2563EB" />
              <span>مستحدثة ({indicatorsCounts.new})</span>
            </button>
          )}
        </div>

        {/* البحث السريع وزر طي/توسيع الكل */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} style={{ position: 'absolute', right: '10px', top: '9px', color: '#94A3B8' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برمز أو عنوان المؤشر..."
              style={{
                width: '100%',
                padding: '6px 30px 6px 10px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => toggleAll(!isAllExpanded)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Layers size={14} color="#64748B" />
            <span>{isAllExpanded ? 'طي مؤشرات الكل' : 'توسيع كافة المؤشرات'}</span>
          </button>
        </div>
      </div>

      {/* 2. جدول المقارنة الهرمي الشامل */}
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
                  width: '44%',
                  cursor: 'pointer',
                  userSelect: 'none',
                  backgroundColor: sortKey === 'name' ? '#EFF6FF' : undefined,
                  color: sortKey === 'name' ? '#1D4ED8' : undefined,
                }}
                title="انقر لفرز المعايير أبجدياً"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>المعيار الوطني الرئيسي / المؤشرات التفصيلية</span>
                  {renderSortIndicator('name')}
                </div>
              </th>

              <th
                onClick={() => handleSort('previousScore')}
                style={{
                  padding: '14px 16px',
                  fontWeight: 700,
                  width: '18%',
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
                  width: '18%',
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
            {sortedDeltas.map((std, idx) => {
              const isExpanded = !!expandedStandards[std.standardId];
              const indicators = filteredIndicatorsMap[std.standardId] || [];

              return (
                <React.Fragment key={std.standardId}>
                  {/* صف المعيار الرئيسي */}
                  <tr
                    style={{
                      backgroundColor: isExpanded ? '#F1F5F9' : idx % 2 === 1 ? '#FAFBFD' : '#FFFFFF',
                      borderBottom: '1px solid #E2E8F0',
                      borderTop: isExpanded ? '2px solid #CBD5E1' : undefined,
                      transition: 'background-color 0.15s ease',
                      fontWeight: 700,
                    }}
                  >
                    <td style={{ padding: '14px 18px', color: '#0F172A' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => toggleStandard(std.standardId)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            backgroundColor: isExpanded ? '#2563EB' : '#E2E8F0',
                            color: isExpanded ? '#FFFFFF' : '#475569',
                            border: 'none',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                          title={isExpanded ? 'طي المؤشرات' : 'عرض مؤشرات المعيار'}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#2563EB',
                            backgroundColor: '#EFF6FF',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                          }}
                        >
                          {std.code || `STD-0${std.standardId}`}
                        </span>

                        <span style={{ fontSize: '14px', fontWeight: 800 }}>{std.name}</span>

                        {std.weight !== undefined && (
                          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                            ({std.weight}%)
                          </span>
                        )}

                        <span
                          style={{
                            fontSize: '11px',
                            color: '#64748B',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            padding: '1px 6px',
                            borderRadius: '999px',
                            marginRight: 'auto',
                          }}
                        >
                          {indicators.length} مؤشر
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', color: '#64748B', fontWeight: 700, fontSize: '14px' }}>
                      {std.previousScore.toFixed(2)} / 3.0
                    </td>

                    <td style={{ padding: '14px 16px', color: '#0F172A', fontWeight: 800, fontSize: '14px' }}>
                      {std.currentScore.toFixed(2)} / 3.0
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      {getTrendBadge(std.trend, std.delta)}
                    </td>
                  </tr>

                  {/* صفوف المؤشرات عند التوسيع */}
                  {isExpanded && (
                    <>
                      {indicators.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: '12px 24px', backgroundColor: '#F8FAFC', color: '#64748B', fontSize: '12px', textAlign: 'center' }}>
                            لا توجد مؤشرات مطابقة لمعايير البحث أو الفلتر في هذا المعيار.
                          </td>
                        </tr>
                      ) : (
                        indicators.map((ind, indIdx) => (
                          <tr
                            key={ind.indicatorId}
                            style={{
                              backgroundColor: indIdx % 2 === 1 ? '#F8FAFC' : '#FFFFFF',
                              borderBottom: '1px solid #F1F5F9',
                              fontSize: '12px',
                            }}
                          >
                            <td style={{ padding: '10px 18px 10px 48px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#475569',
                                    backgroundColor: '#F1F5F9',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontFamily: 'monospace',
                                    flexShrink: 0,
                                  }}
                                >
                                  {ind.code}
                                </span>
                                <span style={{ color: '#1E293B', fontWeight: 600 }}>{ind.name}</span>
                                {ind.subStandardName && (
                                  <span style={{ fontSize: '10px', color: '#94A3B8', marginRight: '4px' }}>
                                    • {ind.subStandardName}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td style={{ padding: '10px 16px', color: '#64748B' }}>
                              <span style={{ fontWeight: 700 }}>{ind.previousScore}</span> / 3
                            </td>

                            <td style={{ padding: '10px 16px', color: '#0F172A', fontWeight: 700 }}>
                              <span>{ind.currentScore}</span> / 3
                            </td>

                            <td style={{ padding: '10px 18px', textAlign: 'center' }}>
                              {getIndicatorTrendPill(ind.trend, ind.delta)}
                            </td>
                          </tr>
                        ))
                      )}
                    </>
                  )}
                </React.Fragment>
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
                {displayPrevTotal.toFixed(2)} / 3.0
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
                    backgroundColor: isSameCycle ? '#64748B' : (displayNetDelta >= 0 ? '#10B981' : '#EF4444'),
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 800,
                  }}
                >
                  {isSameCycle ? <Minus size={14} /> : (displayNetDelta >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                  <span>
                    {isSameCycle
                      ? '0.00 أداء متطابق'
                      : (displayNetDelta >= 0 ? `+${displayNetDelta.toFixed(2)} نمو إيجابي صافي` : `${displayNetDelta.toFixed(2)} تراجع صافي`)}
                  </span>
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
