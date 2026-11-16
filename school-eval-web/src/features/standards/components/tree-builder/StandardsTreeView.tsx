/**
 * Component: StandardsTreeView (Seamless Expandable Master View)
 * الهيكل الشجري الهرمي التفاعلي للمعايير السبعة والمجالات والمؤشرات
 * - تصفح فسيح وسلس بدون أي قيود ارتفاع (No cramped maxHeight)
 * - شريط تنقل سريع بين المعايير السبعة بأرقامها وأوزانها
 * - تمرير طبيعي ومستقر 100% يمنع حبس المؤشر أو اختفاء المعايير
 */

import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  Folder,
  FolderOpen,
  Plus,
  Scale,
  Search,
  Maximize2,
  Minimize2,
  CheckCircle2,
  ArrowDownCircle,
  FileCheck2,
} from 'lucide-react';
import type { StandardNode, SubStandardNode, IndicatorNode } from '../../api/standardsTypes';

interface StandardsTreeViewProps {
  standards: StandardNode[];
  selectedIndicatorId?: number;
  onSelectIndicator: (indicator: IndicatorNode, sub: SubStandardNode, std: StandardNode) => void;
  onAddSubStandard: (std: StandardNode) => void;
  onAddIndicator: (sub: SubStandardNode, std: StandardNode) => void;
}

export const StandardsTreeView: React.FC<StandardsTreeViewProps> = ({
  standards,
  selectedIndicatorId,
  onSelectIndicator,
  onAddSubStandard,
  onAddIndicator,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // تتبع المعايير المفتوحة - المعيار الأول مفتوح افتراضياً
  const [expandedStandards, setExpandedStandards] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    if (standards.length > 0) {
      init[standards[0].standardId] = true;
    }
    return init;
  });

  // تتبع المجالات الفرعية المفتوحة
  const [expandedSubStandards, setExpandedSubStandards] = useState<Record<number, boolean>>({});

  const toggleStandard = (stdId: number) => {
    setExpandedStandards((prev) => ({
      ...prev,
      [stdId]: !prev[stdId],
    }));
  };

  const toggleSubStandard = (subId: number) => {
    setExpandedSubStandards((prev) => ({
      ...prev,
      [subId]: !prev[subId],
    }));
  };

  const expandAll = () => {
    const allStds: Record<number, boolean> = {};
    const allSubs: Record<number, boolean> = {};
    standards.forEach((std) => {
      allStds[std.standardId] = true;
      (std.subStandards || []).forEach((sub) => {
        allSubs[sub.subStandardId] = true;
      });
    });
    setExpandedStandards(allStds);
    setExpandedSubStandards(allSubs);
  };

  const collapseAll = () => {
    setExpandedStandards({});
    setExpandedSubStandards({});
  };

  const scrollToStandard = (stdId: number) => {
    setExpandedStandards((prev) => ({ ...prev, [stdId]: true }));
    const el = document.getElementById(`std-node-${stdId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // فلترة بالبحث الفوري
  const filteredStandards = useMemo(() => {
    if (!searchQuery.trim()) return standards;
    const q = searchQuery.toLowerCase();
    return standards.filter((std) => {
      const matchStd = std.name.toLowerCase().includes(q) || std.code.toLowerCase().includes(q);
      const matchSub = (std.subStandards || []).some(
        (sub) =>
          sub.name.toLowerCase().includes(q) ||
          sub.code.toLowerCase().includes(q) ||
          (sub.indicators || []).some(
            (ind) => ind.name.toLowerCase().includes(q) || ind.code.toLowerCase().includes(q)
          )
      );
      return matchStd || matchSub;
    });
  }, [standards, searchQuery]);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
    >
      {/* 1. Header Toolbar (Search + Expand/Collapse) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          backgroundColor: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '320px', flex: 1, maxWidth: '520px' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={16}
              color="#94A3B8"
              style={{ position: 'absolute', right: '12px', pointerEvents: 'none' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث فوري في أسماء المعايير أو أكواد المؤشرات..."
              style={{
                width: '100%',
                padding: '9px 38px 9px 12px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                backgroundColor: '#FFFFFF',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Expand / Collapse Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={expandAll}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Maximize2 size={13} color="#D97706" />
            <span>توسيع جميع المعايير</span>
          </button>

          <button
            type="button"
            onClick={collapseAll}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Minimize2 size={13} color="#64748B" />
            <span>طي الكل</span>
          </button>
        </div>
      </div>

      {/* 2. Quick Standards Horizontal Selector Bar (التنقل السريع بين المعايير السبعة) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          backgroundColor: '#F1F5F9',
          borderBottom: '1px solid #E2E8F0',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', whiteSpace: 'nowrap', marginLeft: '6px' }}>
          تنقل سريع:
        </span>
        {standards.map((std, i) => {
          const isCurrentExpanded = !!expandedStandards[std.standardId];
          return (
            <button
              key={std.standardId}
              type="button"
              onClick={() => scrollToStandard(std.standardId)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: isCurrentExpanded ? '1px solid #D97706' : '1px solid #CBD5E1',
                backgroundColor: isCurrentExpanded ? '#FFFBEB' : '#FFFFFF',
                color: isCurrentExpanded ? '#92400E' : '#475569',
                fontSize: '11px',
                fontWeight: isCurrentExpanded ? 800 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: isCurrentExpanded ? '#D97706' : '#E2E8F0',
                  color: isCurrentExpanded ? '#FFFFFF' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 800,
                }}
              >
                {i + 1}
              </span>
              <span>{std.name}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Standards Flow List (بدون أي تقييد maxHeight ليتمكن المستخدم من النزول والتمرير بسلاسة) */}
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredStandards.map((std, idx) => {
          const isExpanded = !!expandedStandards[std.standardId] || !!searchQuery.trim();
          const subStandards = std.subStandards || [];
          const totalIndicators = subStandards.reduce(
            (acc, s) => acc + (s.indicators?.length || 0),
            0
          );

          return (
            <div
              id={`std-node-${std.standardId}`}
              key={std.standardId}
              style={{
                border: isExpanded ? '1px solid #FCD34D' : '1px solid #E2E8F0',
                borderRadius: '14px',
                overflow: 'hidden',
                backgroundColor: '#FFFFFF',
                boxShadow: isExpanded ? '0 4px 14px rgba(245, 158, 11, 0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              {/* Standard Header Row */}
              <div
                onClick={() => toggleStandard(std.standardId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  backgroundColor: isExpanded ? '#FFFBEB' : '#FFFFFF',
                  borderBottom: isExpanded ? '1px solid #FDE68A' : 'none',
                  cursor: 'pointer',
                  userSelect: 'none',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <button
                    type="button"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: isExpanded ? '#FEF3C7' : '#F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      color: isExpanded ? '#B45309' : '#64748B',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronLeft size={18} />}
                  </button>

                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#D97706',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '14px',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)',
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '15px' }}>
                        {std.name}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          color: '#64748B',
                          backgroundColor: '#F1F5F9',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontWeight: 600,
                        }}
                      >
                        {std.code}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Standard Meta Badges & Action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      backgroundColor: '#FEF3C7',
                      color: '#92400E',
                      border: '1px solid #FCD34D',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    <Scale size={13} color="#D97706" />
                    <span>الوزن: {std.weight}%</span>
                  </span>

                  <span
                    style={{
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {subStandards.length} مجالات • {totalIndicators} مؤشراً
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddSubStandard(std);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: '#B45309',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    title="+ إضافة معيار فرعي لهذا المعيار"
                  >
                    <Plus size={14} />
                    <span>+ إضافة مجال</span>
                  </button>
                </div>
              </div>

              {/* SubStandards & Indicators Body */}
              {isExpanded && (
                <div style={{ padding: '20px', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {subStandards.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', fontSize: '13px', color: '#94A3B8' }}>
                      لا توجد مجالات فرعية مضافة في هذا المعيار بعد. انقر على "+ إضافة مجال" للبدء.
                    </div>
                  ) : (
                    subStandards.map((sub) => {
                      const isSubExpanded = expandedSubStandards[sub.subStandardId] ?? true;
                      const indicators = sub.indicators || [];

                      return (
                        <div
                          key={sub.subStandardId}
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                          }}
                        >
                          {/* SubStandard Header */}
                          <div
                            onClick={() => toggleSubStandard(sub.subStandardId)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 18px',
                              backgroundColor: '#FFFFFF',
                              borderBottom: isSubExpanded ? '1px solid #F1F5F9' : 'none',
                              cursor: 'pointer',
                              userSelect: 'none',
                              flexWrap: 'wrap',
                              gap: '10px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {isSubExpanded ? (
                                <FolderOpen size={18} color="#D97706" />
                              ) : (
                                <Folder size={18} color="#94A3B8" />
                              )}
                              <span style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>
                                {sub.name}
                              </span>
                              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748B', backgroundColor: '#F1F5F9', padding: '1px 6px', borderRadius: '4px' }}>
                                {sub.code}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                                {indicators.length} مؤشرات معتمدة
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddIndicator(sub, std);
                                }}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  backgroundColor: '#ECFDF5',
                                  border: '1px solid #A7F3D0',
                                  color: '#047857',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                title="+ إضافة مؤشر لهذا المجال"
                              >
                                <Plus size={13} />
                                <span>+ مؤشر جديد</span>
                              </button>
                            </div>
                          </div>

                          {/* Indicators Grid (Full Width Cards with comfortable scrolling) */}
                          {isSubExpanded && (
                            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '12px', backgroundColor: '#FAFAFA' }}>
                              {indicators.length === 0 ? (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '16px', fontSize: '12px', color: '#94A3B8' }}>
                                  لا توجد مؤشرات في هذا المجال بعد.
                                </div>
                              ) : (
                                indicators.map((ind) => {
                                  const isSelected = selectedIndicatorId === ind.indicatorId;

                                  return (
                                    <div
                                      key={ind.indicatorId}
                                      onClick={() => onSelectIndicator(ind, sub, std)}
                                      style={{
                                        padding: '14px 16px',
                                        borderRadius: '12px',
                                        border: isSelected ? '2px solid #D97706' : '1px solid #E2E8F0',
                                        backgroundColor: isSelected ? '#FFFBEB' : '#FFFFFF',
                                        boxShadow: isSelected ? '0 4px 14px rgba(217, 119, 6, 0.16)' : '0 1px 2px rgba(0,0,0,0.02)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                      }}
                                    >
                                      {/* Indicator Card Top */}
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span
                                            style={{
                                              fontSize: '11px',
                                              fontFamily: 'monospace',
                                              fontWeight: 800,
                                              padding: '2px 8px',
                                              borderRadius: '6px',
                                              backgroundColor: isSelected ? '#D97706' : '#F1F5F9',
                                              color: isSelected ? '#FFFFFF' : '#334155',
                                            }}
                                          >
                                            {ind.code}
                                          </span>
                                          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                                            الوزن: {ind.weight || 1}%
                                          </span>
                                        </div>

                                        {isSelected ? (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#D97706', fontSize: '11px', fontWeight: 800 }}>
                                            <CheckCircle2 size={14} />
                                            <span>محدد للتحرير</span>
                                          </div>
                                        ) : (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748B', fontSize: '11px', fontWeight: 600 }}>
                                            <ArrowDownCircle size={13} color="#94A3B8" />
                                            <span>تعديل ↓</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Indicator Name */}
                                      <p
                                        style={{
                                          fontSize: '13px',
                                          fontWeight: isSelected ? 800 : 600,
                                          color: isSelected ? '#78350F' : '#1E293B',
                                          margin: 0,
                                          lineHeight: 1.5,
                                        }}
                                      >
                                        {ind.name}
                                      </p>

                                      {/* Indicator Footer Badges */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '8px', marginTop: 'auto' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}>
                                          <FileCheck2 size={12} color="#059669" />
                                          <span>شواهد وأدوات ملزمة</span>
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
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
