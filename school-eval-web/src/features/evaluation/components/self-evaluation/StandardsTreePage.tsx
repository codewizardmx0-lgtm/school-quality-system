import React, { useState } from 'react';
import { useSelfEvaluation } from '../../hooks/useSelfEvaluation';
import type { EvaluatorScreen } from '../../api/evaluationTypes';
import {
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Search,
  ArrowLeft,
} from 'lucide-react';

interface StandardsTreePageProps {
  onSelectIndicator: (indicatorId: number) => void;
  onNavigate: (screen: EvaluatorScreen) => void;
}

export const StandardsTreePage: React.FC<StandardsTreePageProps> = ({
  onSelectIndicator,
  onNavigate,
}) => {
  const { treeData, isLoadingTree } = useSelfEvaluation();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedStandards, setExpandedStandards] = useState<Record<number, boolean>>({ 1: true, 2: true });

  const toggleStandard = (id: number) => {
    setExpandedStandards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoadingTree && !treeData) {
    return (
      <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ height: '80px', borderRadius: '14px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: '140px', borderRadius: '12px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
        ))}
      </div>
    );
  }

  const standards = treeData?.standards || [];

  const filteredStandards = standards
    .map((std) => {
      const filteredSubs = std.subStandards
        .map((sub) => {
          const filteredInds = sub.indicators.filter(
            (ind) =>
              ind.title.includes(searchTerm) ||
              ind.code.includes(searchTerm) ||
              sub.title.includes(searchTerm) ||
              std.title.includes(searchTerm)
          );
          return { ...sub, indicators: filteredInds };
        })
        .filter((sub) => sub.indicators.length > 0);

      return { ...std, subStandards: filteredSubs };
    })
    .filter((std) => std.subStandards.length > 0);

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Search */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            مستكشف المعايير الوطنية والمؤشرات المعتمدة
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            {treeData?.title || 'المعايير الوطنية لتقويم جودة الأداء المدرسي 2026'} — {standards.length} معايير وطنية رئيسية
          </p>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', right: '12px', top: '12px' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث في المعايير أو المؤشرات..."
            style={{
              width: '100%',
              padding: '9px 36px 9px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Standards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredStandards.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
              لا توجد معايير أو مؤشرات مطابقة لبحثك «{searchTerm}»
            </div>
            <div style={{ fontSize: '12.5px', color: '#64748B' }}>
              يرجى التحقق من صياغة البحث أو مسح حقل البحث لاستعراض كافة المعايير.
            </div>
          </div>
        ) : (
          filteredStandards.map((std) => {
          const isExpanded = expandedStandards[std.standardId] ?? false;
          const totalIndsCount = std.subStandards.reduce((acc, sub) => acc + sub.indicators.length, 0);

          return (
            <div
              key={std.standardId}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              {/* Standard Header */}
              <div
                onClick={() => toggleStandard(std.standardId)}
                style={{
                  padding: '16px 20px',
                  backgroundColor: '#F8FAFC',
                  borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#059669',
                      color: '#FFFFFF',
                    }}
                  >
                    {std.code}
                  </span>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      {std.title}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                      {std.description}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#059669',
                      backgroundColor: '#ECFDF5',
                      padding: '4px 10px',
                      borderRadius: '12px',
                    }}
                  >
                    الوزن النسبي: {std.weight}%
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    {totalIndsCount} مؤشرات
                  </span>
                  {isExpanded ? <ChevronUp size={20} color="#64748B" /> : <ChevronDown size={20} color="#64748B" />}
                </div>
              </div>

              {/* SubStandards & Indicators */}
              {isExpanded && (
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {std.subStandards.map((sub) => (
                    <div key={sub.subStandardId} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#334155',
                          padding: '6px 12px',
                          backgroundColor: '#F1F5F9',
                          borderRadius: '6px',
                          display: 'inline-block',
                          alignSelf: 'flex-start',
                        }}
                      >
                        {sub.code}: {sub.title}
                      </div>

                      {/* Indicators Cards */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {sub.indicators.map((ind) => (
                          <div
                            key={ind.indicatorId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '8px',
                              border: '1px solid #E2E8F0',
                              backgroundColor: '#FFFFFF',
                              transition: 'background-color 0.15s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: '#EFF6FF',
                                  color: '#2563EB',
                                  marginTop: '2px',
                                }}
                              >
                                {ind.code}
                              </span>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                                  {ind.title}
                                </div>
                                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '3px' }}>
                                  {ind.description}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                onSelectIndicator(ind.indicatorId);
                                onNavigate('rubric-assessment');
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '7px 14px',
                                borderRadius: '6px',
                                backgroundColor: '#059669',
                                color: '#FFFFFF',
                                fontSize: '12px',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <SlidersHorizontal size={14} />
                              <span>رصد التقدير والشواهد</span>
                              <ArrowLeft size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
      </div>
    </div>
  );
};
