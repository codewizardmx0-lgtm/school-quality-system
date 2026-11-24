/**
 * Component: StandardsAndIndicatorsTab
 * التبويب الأول: تحليل المعايير السبعة ومصفوفة المؤشرات الـ 109 التفصيلية
 * يغطي متطلبات (FR-SUP-12) و (FR-SUP-13)
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  Search,
  Filter,
} from 'lucide-react';
import { StandardsMeanChart } from './StandardsMeanChart';
import type { StandardMeanItem, IndicatorMeanItem } from '../../api/supervisionTypes';

interface StandardsAndIndicatorsTabProps {
  standards: StandardMeanItem[];
  allIndicators?: IndicatorMeanItem[];
}

export const StandardsAndIndicatorsTab: React.FC<StandardsAndIndicatorsTabProps> = ({
  standards,
  allIndicators: _allIndicators = [],
}) => {
  // تتبع المعايير المفتوحة في الأكورديون (افتراضياً الأول مفتوح)
  const [expandedStandards, setExpandedStandards] = useState<Record<number, boolean>>({
    [standards[0]?.standardId ?? 1]: true,
  });

  // فلاتر البحث والمستوى المعياري للمؤشرات
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBenchmark, setSelectedBenchmark] = useState<string>('all');

  const toggleStandard = (standardId: number) => {
    setExpandedStandards((prev) => ({
      ...prev,
      [standardId]: !prev[standardId],
    }));
  };

  const expandAll = () => {
    const all: Record<number, boolean> = {};
    standards.forEach((s) => {
      all[s.standardId] = true;
    });
    setExpandedStandards(all);
  };

  const collapseAll = () => {
    setExpandedStandards({});
  };

  // تصفية المؤشرات داخل كل معيار
  const filterIndicator = (ind: IndicatorMeanItem) => {
    if (selectedBenchmark !== 'all' && ind.status !== selectedBenchmark) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      ind.name.toLowerCase().includes(q) ||
      ind.code.toLowerCase().includes(q) ||
      ind.subStandardName?.toLowerCase().includes(q)
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. الرسم البياني لمتوسطات المعايير السبعة */}
      <StandardsMeanChart standards={standards} />

      {/* 2. شريط أدوات مصفوفة المؤشرات الـ 109 */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', flex: '1 1 auto' }}>
          {/* حقل البحث */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              minWidth: '240px',
            }}
          >
            <Search size={15} color="#94A3B8" style={{ position: 'absolute', right: '10px' }} />
            <input
              type="text"
              placeholder="بحث في المؤشرات الـ 109..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 32px 7px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                fontSize: '12.5px',
                color: '#0F172A',
                outline: 'none',
              }}
            />
          </div>

          {/* أزرار تصفية المستوى المعياري */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={13} />
              المستوى:
            </span>
            {[
              { id: 'all', label: 'كافة المؤشرات' },
              { id: 'advanced', label: 'متميز (≥ 80%)', color: '#047857', bg: '#ECFDF5', border: '#A7F3D0' },
              { id: 'proficient', label: 'متوسط (60-79%)', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
              { id: 'needs_support', label: 'بحاجة لدعم (< 60%)', color: '#BE123C', bg: '#FFF1F2', border: '#FECDD3' },
            ].map((pill) => {
              const isActive = selectedBenchmark === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setSelectedBenchmark(pill.id)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    border: `1px solid ${isActive ? (pill.border || '#0F766E') : '#E2E8F0'}`,
                    backgroundColor: isActive ? (pill.bg || '#F0FDFA') : '#FFFFFF',
                    color: isActive ? (pill.color || '#0F766E') : '#64748B',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* أزرار توسيع وطي الكل */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={expandAll}
            style={{
              padding: '5px 10px',
              backgroundColor: '#F8FAFC',
              color: '#475569',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            توسيع الكل
          </button>
          <button
            type="button"
            onClick={collapseAll}
            style={{
              padding: '5px 10px',
              backgroundColor: '#F8FAFC',
              color: '#475569',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            طي الكل
          </button>
        </div>
      </div>

      {/* 3. قائمة المعايير السبعة مع الأكورديون للمؤشرات */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {standards.map((std) => {
          const isExpanded = Boolean(expandedStandards[std.standardId]);
          const rawIndicators = std.indicators || [];
          const indicators = rawIndicators.filter(filterIndicator);

          return (
            <div
              key={std.standardId}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              }}
            >
              {/* شريط رأس المعيار (قابل للنقر للتوسيع/الطي) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleStandard(std.standardId)}
                onKeyDown={(e) => e.key === 'Enter' && toggleStandard(std.standardId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  backgroundColor: isExpanded ? '#F8FAFC' : '#FFFFFF',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: isExpanded ? '#0F766E' : '#F1F5F9',
                      color: isExpanded ? '#FFFFFF' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronLeft size={18} />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: '#E0F2FE',
                          color: '#0369A1',
                          padding: '1px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {std.code}
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                        {std.name}
                      </span>
                      {std.weight !== undefined && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#0D9488',
                            backgroundColor: '#F0FDFA',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid #CCFBF1',
                          }}
                        >
                          الوزن: {std.weight}%
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                      يتضمن {rawIndicators.length} مؤشراً وطنياً
                      {searchQuery || selectedBenchmark !== 'all' ? ` (المطابق: ${indicators.length})` : ''}
                    </div>
                  </div>
                </div>

                {/* مقاييس المعيار السريعة */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                      {std.meanScore.toFixed(2)} / 3.00
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                      نسبة التحقق: {std.percentageAttainment.toFixed(1)}%
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor:
                        std.percentageAttainment >= 80
                          ? '#ECFDF5'
                          : std.percentageAttainment >= 60
                          ? '#EFF6FF'
                          : '#FFF1F2',
                      color:
                        std.percentageAttainment >= 80
                          ? '#047857'
                          : std.percentageAttainment >= 60
                          ? '#1D4ED8'
                          : '#BE123C',
                      border: `1px solid ${
                        std.percentageAttainment >= 80
                          ? '#A7F3D0'
                          : std.percentageAttainment >= 60
                          ? '#BFDBFE'
                          : '#FECDD3'
                      }`,
                    }}
                  >
                    {std.benchmarkLevel}
                  </span>
                </div>
              </div>

              {/* محتوى المؤشرات عند الفتح */}
              {isExpanded && (
                <div>
                  {indicators.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: '#94A3B8' }}>
                      لا توجد مؤشرات مطابقة لمعايير البحث أو التصفية الحالية في هذا المعيار.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                            <th style={{ padding: '10px 14px', textAlign: 'right', width: '100px' }}>الرمز</th>
                            <th style={{ padding: '10px 14px', textAlign: 'right' }}>اسم المؤشر الوطني</th>
                            <th style={{ padding: '10px 14px', textAlign: 'right', width: '180px' }}>المعيار الفرعي</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', width: '120px' }}>المتوسط (0-3.00)</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', width: '110px' }}>نسبة التحقق</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', width: '120px' }}>المستوى المعياري</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', width: '100px' }}>المدارس المقيمة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {indicators.map((ind, idx) => {
                            const isAdvanced = ind.percentageAttainment >= 80;
                            const isProficient = ind.percentageAttainment >= 60 && !isAdvanced;

                            return (
                              <tr
                                key={ind.indicatorId}
                                style={{
                                  borderBottom: idx === indicators.length - 1 ? 'none' : '1px solid #F1F5F9',
                                  backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                                }}
                              >
                                <td style={{ padding: '9px 14px', fontWeight: 700, color: '#475569', fontSize: '12px' }}>
                                  {ind.code}
                                </td>
                                <td style={{ padding: '9px 14px', fontWeight: 600, color: '#0F172A' }}>
                                  {ind.name}
                                </td>
                                <td style={{ padding: '9px 14px', color: '#64748B', fontSize: '12px' }}>
                                  {ind.subStandardName || '—'}
                                </td>
                                <td style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 700, color: '#0F172A' }}>
                                  {ind.meanScore.toFixed(2)}
                                </td>
                                <td style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 700 }}>
                                  <span
                                    style={{
                                      color: isAdvanced ? '#047857' : isProficient ? '#1D4ED8' : '#BE123C',
                                    }}
                                  >
                                    {ind.percentageAttainment.toFixed(1)}%
                                  </span>
                                </td>
                                <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      backgroundColor: isAdvanced ? '#ECFDF5' : isProficient ? '#EFF6FF' : '#FFF1F2',
                                      color: isAdvanced ? '#047857' : isProficient ? '#1D4ED8' : '#BE123C',
                                      border: `1px solid ${isAdvanced ? '#A7F3D0' : isProficient ? '#BFDBFE' : '#FECDD3'}`,
                                    }}
                                  >
                                    {ind.benchmarkLevel}
                                  </span>
                                </td>
                                <td style={{ padding: '9px 14px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
                                  {ind.evaluatedCount}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};