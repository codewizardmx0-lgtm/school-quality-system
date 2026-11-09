import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useSelfEvaluation } from '../../hooks/useSelfEvaluation';
import type { EvaluatorScreen } from '../../api/evaluationTypes';
import {
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Search,
  ArrowLeft,
  FileSpreadsheet,
} from 'lucide-react';

interface StandardsTreePageProps {
  onSelectIndicator: (indicatorId: number) => void;
  onNavigate: (screen: EvaluatorScreen, param?: number) => void;
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

  const handleExportExcel = () => {
    if (!treeData || !treeData.standards) return;

    const rows: any[] = [];
    treeData.standards.forEach((std) => {
      std.subStandards.forEach((sub) => {
        sub.indicators.forEach((ind) => {
          rows.push({
            'رمز المعيار': std.code,
            'المعيار الوطني': std.title,
            'الوزن النسبي للمعيار': `${std.weight}%`,
            'رمز المعيار الفرعي': sub.code,
            'المعيار الفرعي': sub.title,
            'رمز المؤشر': ind.code,
            'عنوان المؤشر': ind.title,
            'وصف المؤشر واشتراطاته': ind.description,
            'التقدير المرصود': ind.score !== null && ind.score !== undefined ? `المستوى ${ind.score}` : 'غير مدخل',
            'عدد الشواهد المرفقة': ind.evidenceCount ?? 0,
          });
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'المعايير والمؤشرات');

    // RTL direction on worksheet
    worksheet['!dir'] = 'rtl';

    XLSX.writeFile(workbook, `دليل_المعايير_الوطنية_والتقييم_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
      {/* Header, Search & Contextual Excel Export */}
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

        {/* Action Buttons & Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              fontSize: '12.5px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
            }}
          >
            <FileSpreadsheet size={16} />
            <span>تصدير المعايير (Excel)</span>
          </button>

          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', right: '12px', top: '11px' }} />
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
                fontFamily: 'inherit',
              }}
            />
          </div>
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
            const stats = std.stats || {
              totalIndicators: totalIndsCount,
              scoredIndicators: 0,
              unenteredIndicators: totalIndsCount,
              level3Count: 0,
              level2Count: 0,
              level1Count: 0,
              level0Count: 0,
              totalEvidences: 0,
            };

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
                {/* Standard Header (Enhanced per Note 19) */}
                <div
                  onClick={() => toggleStandard(std.standardId)}
                  style={{
                    padding: '16px 20px',
                    backgroundColor: '#F8FAFC',
                    borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
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

                  {/* Enhanced Header Summary Badges (Official Nomenclature & BiDi Safe) */}
                  <div dir="rtl" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Weight badge */}
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: '#065F46',
                        backgroundColor: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>الوزن:</span>
                      <strong>{std.weight}%</strong>
                    </span>

                    {/* Entry status badge */}
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: '#1E40AF',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>رُصد</span>
                      <strong>{stats.scoredIndicators}</strong>
                      <span>من</span>
                      <strong>{totalIndsCount}</strong>
                    </span>

                    {/* Score breakdown pills */}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#047857',
                        backgroundColor: '#D1FAE5',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="المستوى 3: متحقق"
                    >
                      <span>متحقق (3):</span>
                      <strong>{stats.level3Count}</strong>
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#1D4ED8',
                        backgroundColor: '#DBEAFE',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="المستوى 2: متحقق بدرجة متوسطة"
                    >
                      <span>متوسط (2):</span>
                      <strong>{stats.level2Count}</strong>
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#B45309',
                        backgroundColor: '#FEF3C7',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="المستوى 1: متحقق بدرجة ضعيفة"
                    >
                      <span>ضعيف (1):</span>
                      <strong>{stats.level1Count}</strong>
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#B91C1C',
                        backgroundColor: '#FEE2E2',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="المستوى 0: غير متوفر"
                    >
                      <span>غير متوفر (0):</span>
                      <strong>{stats.level0Count}</strong>
                    </span>

                    {/* Total evidences badge */}
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: '#4338CA',
                        backgroundColor: '#EEF2FF',
                        border: '1px solid #C7D2FE',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <strong>{stats.totalEvidences}</strong>
                      <span>{stats.totalEvidences === 1 ? 'شاهد' : 'شواهد'}</span>
                    </span>

                    {/* Unentered badge */}
                    {stats.unenteredIndicators > 0 && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#64748B',
                          backgroundColor: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <strong>{stats.unenteredIndicators}</strong>
                        <span>معلق</span>
                      </span>
                    )}

                    {isExpanded ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
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
                          {sub.indicators.map((ind) => {
                            const isScored = ind.score !== null && ind.score !== undefined;
                            const evCount = ind.evidenceCount ?? 0;

                            return (
                              <div
                                key={ind.indicatorId}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '12px',
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
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span>{ind.title}</span>
                                      {/* Indicator Score Badge */}
                                      {isScored ? (
                                        <span
                                          style={{
                                            fontSize: '10.5px',
                                            fontWeight: 800,
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            backgroundColor:
                                              ind.score === 3 ? '#D1FAE5' : ind.score === 2 ? '#DBEAFE' : ind.score === 1 ? '#FEF3C7' : '#FEE2E2',
                                            color:
                                              ind.score === 3 ? '#065F46' : ind.score === 2 ? '#1E40AF' : ind.score === 1 ? '#92400E' : '#991B1B',
                                          }}
                                        >
                                          {ind.score === 3
                                            ? 'المستوى 3: متحقق'
                                            : ind.score === 2
                                            ? 'المستوى 2: متحقق بدرجة متوسطة'
                                            : ind.score === 1
                                            ? 'المستوى 1: متحقق بدرجة ضعيفة'
                                            : 'المستوى 0: غير متوفر'}
                                        </span>
                                      ) : (
                                        <span
                                          style={{
                                            fontSize: '10.5px',
                                            fontWeight: 700,
                                            padding: '2px 6px',
                                            borderRadius: '6px',
                                            backgroundColor: '#F1F5F9',
                                            color: '#64748B',
                                          }}
                                        >
                                          غير مدخل
                                        </span>
                                      )}

                                      {/* Evidence count badge */}
                                      <span
                                        style={{
                                          fontSize: '10.5px',
                                          fontWeight: 700,
                                          padding: '2px 6px',
                                          borderRadius: '6px',
                                          backgroundColor: evCount > 0 ? '#ECFDF5' : '#FEF2F2',
                                          color: evCount > 0 ? '#059669' : '#DC2626',
                                          border: `1px solid ${evCount > 0 ? '#A7F3D0' : '#FECACA'}`,
                                        }}
                                      >
                                        {evCount} {evCount === 1 ? 'شاهد' : 'شواهد'}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '3px' }}>
                                      {ind.description}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectIndicator(ind.indicatorId);
                                    onNavigate('rubric-assessment', ind.indicatorId);
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
                                  <span>{isScored ? 'تعديل التقدير والشواهد' : 'رصد التقدير والشواهد'}</span>
                                  <ArrowLeft size={14} />
                                </button>
                              </div>
                            );
                          })}
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
