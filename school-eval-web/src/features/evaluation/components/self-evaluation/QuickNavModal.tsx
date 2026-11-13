import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Compass,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { StandardNode } from '../../api/evaluationTypes';

interface QuickNavModalProps {
  isOpen: boolean;
  onClose: () => void;
  standards: StandardNode[];
  currentStandardId?: number;
  currentIndicatorId?: number;
  onSelectIndicator: (standardId: number, indicatorId: number) => void;
}

export const QuickNavModal: React.FC<QuickNavModalProps> = ({
  isOpen,
  onClose,
  standards,
  currentStandardId,
  currentIndicatorId,
  onSelectIndicator,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scored' | 'unscored' | 'missing_evidence'>('all');
  const [expandedStandardIds, setExpandedStandardIds] = useState<number[]>([]);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize expanded standards when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setStatusFilter('all');
      if (currentStandardId) {
        setExpandedStandardIds([currentStandardId]);
      } else if (standards.length > 0) {
        setExpandedStandardIds([standards[0].standardId]);
      }
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentStandardId, standards]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleStandard = (standardId: number) => {
    setExpandedStandardIds((prev) =>
      prev.includes(standardId) ? prev.filter((id) => id !== standardId) : [...prev, standardId]
    );
  };

  const expandAll = () => {
    setExpandedStandardIds(standards.map((s) => s.standardId));
  };

  const collapseAll = () => {
    setExpandedStandardIds([]);
  };

  // Global KPIs across all standards
  const globalStats = useMemo(() => {
    let totalInd = 0;
    let scoredInd = 0;
    let missingEvidenceInd = 0;

    standards.forEach((std) => {
      std.subStandards.forEach((sub) => {
        sub.indicators.forEach((ind) => {
          totalInd++;
          if (ind.score !== null && ind.score !== undefined) {
            scoredInd++;
          }
          const mCnt = ind.mandatoryRequirementsCount ?? 0;
          const cCnt = ind.coveredRequirementsCount ?? 0;
          const evCnt = ind.evidenceCount ?? 0;
          if (mCnt > 0 ? cCnt < mCnt : evCnt === 0) {
            missingEvidenceInd++;
          }
        });
      });
    });

    return {
      total: totalInd || 109,
      scored: scoredInd,
      unscored: Math.max(0, (totalInd || 109) - scoredInd),
      missingEvidence: missingEvidenceInd,
    };
  }, [standards]);

  // Filtered standards and indicators
  const filteredStandards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return standards
      .map((std) => {
        const stdMatch = std.code.toLowerCase().includes(q) || std.title.toLowerCase().includes(q);

        const filteredSubStandards = std.subStandards
          .map((sub) => {
            const subMatch = sub.code.toLowerCase().includes(q) || sub.title.toLowerCase().includes(q);

            const filteredIndicators = sub.indicators.filter((ind) => {
              // Search query filter
              const indMatch =
                stdMatch ||
                subMatch ||
                !q ||
                ind.code.toLowerCase().includes(q) ||
                ind.title.toLowerCase().includes(q) ||
                (ind.description && ind.description.toLowerCase().includes(q));

              if (!indMatch) return false;

              // Status filter
              const isScored = ind.score !== null && ind.score !== undefined;
              if (statusFilter === 'scored') return isScored;
              if (statusFilter === 'unscored') return !isScored;
              if (statusFilter === 'missing_evidence') {
                const mCnt = ind.mandatoryRequirementsCount ?? 0;
                const cCnt = ind.coveredRequirementsCount ?? 0;
                const evCnt = ind.evidenceCount ?? 0;
                return mCnt > 0 ? cCnt < mCnt : evCnt === 0;
              }

              return true;
            });

            return {
              ...sub,
              indicators: filteredIndicators,
            };
          })
          .filter((sub) => sub.indicators.length > 0);

        const totalMatchingIndicators = filteredSubStandards.reduce(
          (acc, sub) => acc + sub.indicators.length,
          0
        );

        return {
          ...std,
          subStandards: filteredSubStandards,
          matchingIndicatorsCount: totalMatchingIndicators,
        };
      })
      .filter((std) => std.matchingIndicatorsCount > 0);
  }, [standards, searchQuery, statusFilter]);

  if (!isOpen) return null;

  const isSearching = searchQuery.trim().length > 0 || statusFilter !== 'all';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '840px',
          height: '88vh',
          maxHeight: '88vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          direction: 'rtl',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #F1F5F9',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Compass size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                دليل التنقل السريع بين المعايير والمؤشرات (109 مؤشراً)
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748B' }}>
                ابحث مباشرة باسم المعيار، رمز المؤشر أو عنوانه، وانقر للانتقال الفوري إليه.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            title="إغلاق النافذة (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Fast Filters */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #F1F5F9',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={18}
              color="#94A3B8"
              style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="اكتب اسم المعيار، أو رمز المؤشر (مثال: 1-1-1)، أو عنوان المؤشر..."
              style={{
                width: '100%',
                padding: '11px 42px 11px 38px',
                borderRadius: '10px',
                border: '1.5px solid #CBD5E1',
                fontSize: '13.5px',
                fontWeight: 500,
                color: '#0F172A',
                backgroundColor: '#F8FAFC',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s, background-color 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#4F46E5';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.backgroundColor = '#F8FAFC';
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#94A3B8',
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Quick Filter Tabs & Accordion Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: statusFilter === 'all' ? '1.5px solid #4F46E5' : '1px solid #E2E8F0',
                  backgroundColor: statusFilter === 'all' ? '#EEF2FF' : '#F8FAFC',
                  color: statusFilter === 'all' ? '#4338CA' : '#64748B',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Layers size={13} />
                الكل ({globalStats.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('scored')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: statusFilter === 'scored' ? '1.5px solid #059669' : '1px solid #E2E8F0',
                  backgroundColor: statusFilter === 'scored' ? '#ECFDF5' : '#F8FAFC',
                  color: statusFilter === 'scored' ? '#065F46' : '#64748B',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <CheckCircle2 size={13} color="#059669" />
                المرصودة ({globalStats.scored})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('unscored')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: statusFilter === 'unscored' ? '1.5px solid #D97706' : '1px solid #E2E8F0',
                  backgroundColor: statusFilter === 'unscored' ? '#FFFBEB' : '#F8FAFC',
                  color: statusFilter === 'unscored' ? '#92400E' : '#64748B',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <AlertCircle size={13} color="#D97706" />
                غير المرصودة ({globalStats.unscored})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('missing_evidence')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: statusFilter === 'missing_evidence' ? '1.5px solid #DC2626' : '1px solid #E2E8F0',
                  backgroundColor: statusFilter === 'missing_evidence' ? '#FEF2F2' : '#F8FAFC',
                  color: statusFilter === 'missing_evidence' ? '#991B1B' : '#64748B',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <FileCheck size={13} color="#DC2626" />
                شواهد ناقصة ({globalStats.missingEvidence})
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={expandAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4F46E5',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '3px 6px',
                }}
              >
                توسيع الكل
              </button>
              <span style={{ color: '#CBD5E1' }}>•</span>
              <button
                type="button"
                onClick={collapseAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '3px 6px',
                }}
              >
                طي الكل
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable List of Standards & Indicators */}
        <div
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '20px 24px',
            backgroundColor: '#F8FAFC',
            scrollbarWidth: 'thin',
            scrollbarColor: '#CBD5E1 transparent',
          }}
        >
          {filteredStandards.length === 0 ? (
            <div
              style={{
                padding: '48px 20px',
                textAlign: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px dashed #CBD5E1',
              }}
            >
              <Compass size={36} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#334155' }}>
                لم يتم العثور على أي مؤشرات مطابقة لبحثك
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: '#64748B' }}>
                جرب تغيير كلمة البحث أو إعادة تعيين الفلاتر.
              </p>
            </div>
          ) : (
            filteredStandards.map((std) => {
              const isExpanded = isSearching || expandedStandardIds.includes(std.standardId);
              const scoredCount = std.stats?.scoredIndicators ?? 0;
              const totalCount = std.stats?.totalIndicators ?? 0;
              const isStdActive = std.standardId === currentStandardId;

              return (
                <div
                  key={std.standardId}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: isStdActive ? '1.5px solid #6366F1' : '1px solid #E2E8F0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                    marginBottom: '14px',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Standard Header Accordion Bar */}
                  <div
                    onClick={() => toggleStandard(std.standardId)}
                    style={{
                      padding: '12px 18px',
                      backgroundColor: isStdActive ? '#F5F3FF' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderBottom: isExpanded ? '1px solid #F1F5F9' : 'none',
                      userSelect: 'none',
                      minHeight: '48px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: isStdActive ? '#EDE9FE' : '#F1F5F9',
                          color: isStdActive ? '#5B21B6' : '#475569',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {std.code}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                        {std.title}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: '12px',
                            backgroundColor: scoredCount === totalCount && totalCount > 0 ? '#ECFDF5' : '#FFFBEB',
                            color: scoredCount === totalCount && totalCount > 0 ? '#065F46' : '#B45309',
                          }}
                        >
                          رصد: {scoredCount} من {totalCount}
                        </span>
                      </div>
                      <div
                        style={{
                          color: '#94A3B8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Standard Content: SubStandards & Indicators */}
                  {isExpanded && (
                    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '14px', flexShrink: 0 }}>
                      {std.subStandards.map((sub) => (
                        <div key={sub.subStandardId} style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                          {/* Substandard Title */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#64748B',
                              paddingBottom: '4px',
                              borderBottom: '1px dashed #E2E8F0',
                            }}
                          >
                            <span style={{ color: '#4F46E5', fontWeight: 800 }}>{sub.code}:</span>
                            <span>{sub.title}</span>
                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                              ({sub.indicators.length} مؤشر)
                            </span>
                          </div>

                          {/* Indicators Grid */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                              gap: '8px',
                            }}
                          >
                            {sub.indicators.map((ind) => {
                              const isCurrent = ind.indicatorId === currentIndicatorId;
                              const isScored = ind.score !== null && ind.score !== undefined;
                              const mCnt = ind.mandatoryRequirementsCount ?? 0;
                              const cCnt = ind.coveredRequirementsCount ?? 0;
                              const evCnt = ind.evidenceCount ?? 0;
                              const isEvidenceSatisfied = mCnt > 0 ? cCnt >= mCnt : evCnt > 0;

                              return (
                                <div
                                  key={ind.indicatorId}
                                  onClick={() => {
                                    onSelectIndicator(std.standardId, ind.indicatorId);
                                    onClose();
                                  }}
                                  style={{
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: isCurrent
                                      ? '2px solid #4F46E5'
                                      : isScored
                                      ? '1px solid #BBF7D0'
                                      : '1px solid #E2E8F0',
                                    backgroundColor: isCurrent
                                      ? '#EEF2FF'
                                      : isScored
                                      ? '#F0FDF4'
                                      : '#FFFFFF',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    minHeight: '95px',
                                    boxSizing: 'border-box',
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isCurrent) {
                                      e.currentTarget.style.borderColor = '#6366F1';
                                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.07)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isCurrent) {
                                      e.currentTarget.style.borderColor = isScored ? '#BBF7D0' : '#E2E8F0';
                                      e.currentTarget.style.boxShadow = 'none';
                                    }
                                  }}
                                >
                                  {/* Code & Score Badge */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '6px',
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: '11.5px',
                                        fontWeight: 800,
                                        color: isCurrent ? '#4338CA' : isScored ? '#15803D' : '#0F172A',
                                      }}
                                    >
                                      {ind.code}
                                    </span>
                                    {isScored ? (
                                      <span
                                        style={{
                                          fontSize: '10.5px',
                                          fontWeight: 800,
                                          padding: '2px 6px',
                                          borderRadius: '6px',
                                          backgroundColor: '#DCFCE7',
                                          color: '#166534',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                        }}
                                      >
                                        <CheckCircle2 size={10} />
                                        تقدير {ind.score}
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          fontSize: '10.5px',
                                          fontWeight: 700,
                                          padding: '2px 6px',
                                          borderRadius: '6px',
                                          backgroundColor: '#FEF3C7',
                                          color: '#92400E',
                                        }}
                                      >
                                        غير مرصود
                                      </span>
                                    )}
                                  </div>

                                  {/* Indicator Title */}
                                  <div
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: isCurrent ? 800 : 600,
                                      color: isCurrent ? '#1E1B4B' : '#334155',
                                      lineHeight: '1.45',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}
                                    title={ind.title}
                                  >
                                    {ind.title}
                                  </div>

                                  {/* Footer: Evidence & Requirements */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      fontSize: '10.5px',
                                      fontWeight: 600,
                                      color: isEvidenceSatisfied ? '#059669' : '#DC2626',
                                      marginTop: '2px',
                                    }}
                                  >
                                    <span>شواهد: {evCnt}</span>
                                    <span>
                                      متطلبات: {cCnt}/{mCnt}
                                    </span>
                                  </div>
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

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#64748B',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={14} color="#6366F1" />
            <span>
              إجمالي المؤشرات المتاحة في القائمة:{' '}
              <strong style={{ color: '#0F172A' }}>
                {filteredStandards.reduce((acc, s) => acc + s.matchingIndicatorsCount, 0)}
              </strong>{' '}
              مؤشراً
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#F8FAFC',
              color: '#334155',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
