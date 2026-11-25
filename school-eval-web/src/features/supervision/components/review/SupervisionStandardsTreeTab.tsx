import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  Search,
  AlertCircle,
  AlertTriangle,
  FileText,
  Layers,
  Save,
  Check,
  X,
  FileCheck,
  Eye,
  Download,
  MessageSquare,
} from 'lucide-react';
import type {
  SupervisionStandardItem,
  SupervisionIndicatorItem,
} from '../../api/supervisionTypes';
import {
  DEFICIENCY_CATEGORIES,
} from '../../api/supervisionTypes';
import { supervisionApi } from '../../api/supervisionApi';
import { SharedDeficiencyFormFields } from '../common/SharedDeficiencyFormFields';

interface SupervisionStandardsTreeTabProps {
  standards: SupervisionStandardItem[];
  evaluationId: number;
  submissionId: number;
  isReadOnly?: boolean;
  onDeficiencyUpdated?: () => void;
  targetIndicatorId?: number | null;
}

export const SupervisionStandardsTreeTab: React.FC<SupervisionStandardsTreeTabProps> = ({
  standards,
  evaluationId,
  submissionId,
  isReadOnly = false,
  onDeficiencyUpdated,
  targetIndicatorId,
}) => {
  // حالات البحث والفلترة
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'deficiencies' | 'low_score' | 'unscored' | 'needs_evidence'>('all');

  // توسيع وطي المعايير (افتراضياً الأول والثاني مفتوحان)
  const [expandedStandards, setExpandedStandards] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    standards.forEach((s, idx) => {
      init[s.standardId] = idx < 2;
    });
    return init;
  });

  // توسيع وطي المعايير الفرعية
  const [expandedSubStandards, setExpandedSubStandards] = useState<Record<number, boolean>>({});

  // توسيع وطي المؤشرات الفردية
  const [expandedIndicators, setExpandedIndicators] = useState<Record<number, boolean>>({});

  // حالة لوحة رصد النقص للمؤشرات: indicatorId -> boolean
  const [flaggingOpen, setFlaggingOpen] = useState<Record<number, boolean>>({});
  const [flagCategories, setFlagCategories] = useState<Record<number, string[]>>({});
  const [flagNote, setFlagNote] = useState<Record<number, string>>({});
  const [flagDirectives, setFlagDirectives] = useState<Record<number, string>>({});
  const [flagAllowedActions, setFlagAllowedActions] = useState<Record<number, string[]>>({});
  const [savingDeficiency, setSavingDeficiency] = useState<Record<number, boolean>>({});
  const [saveSuccess, setSaveSuccess] = useState<Record<number, boolean>>({});

  // الانتقال والتمرير التلقائي لمؤشر مستهدف من مصفوفة الفجوات بالتبويب الثالث
  useEffect(() => {
    if (!targetIndicatorId || !standards) return;

    for (const std of standards) {
      for (const sub of std.subStandards) {
        const found = sub.indicators.some((ind) => ind.indicatorId === targetIndicatorId);
        if (found) {
          void Promise.resolve().then(() => {
            setExpandedStandards((prev) => ({ ...prev, [std.standardId]: true }));
            setExpandedSubStandards((prev) => ({ ...prev, [sub.subStandardId]: true }));
            setExpandedIndicators((prev) => ({ ...prev, [targetIndicatorId]: true }));
          });

          setTimeout(() => {
            const el = document.getElementById(`indicator-${targetIndicatorId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.style.outline = '2px solid #2563EB';
              el.style.boxShadow = '0 0 12px rgba(37, 99, 235, 0.35)';
              setTimeout(() => {
                el.style.outline = 'none';
                el.style.boxShadow = 'none';
              }, 3500);
            }
          }, 250);
          return;
        }
      }
    }
  }, [targetIndicatorId, standards]);

  // طي الكل / توسيع الكل
  const isAllExpanded = useMemo(() => {
    return standards.every((s) => expandedStandards[s.standardId]);
  }, [standards, expandedStandards]);

  const toggleAllStandards = () => {
    const nextState = !isAllExpanded;
    const updated: Record<number, boolean> = {};
    const updatedSubs: Record<number, boolean> = {};
    standards.forEach((s) => {
      updated[s.standardId] = nextState;
      s.subStandards.forEach((sub) => {
        updatedSubs[sub.subStandardId] = nextState;
      });
    });
    setExpandedStandards(updated);
    setExpandedSubStandards(updatedSubs);
  };

  const toggleStandard = (id: number) => {
    setExpandedStandards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSubStandard = (id: number) => {
    setExpandedSubStandards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleIndicator = (id: number) => {
    setExpandedIndicators((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // فلترة المعايير والمؤشرات
  const filteredStandards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return standards
      .map((std) => {
        const filteredSubs = std.subStandards
          .map((sub) => {
            const filteredInds = sub.indicators.filter((ind) => {
              // فلترة البحث
              const matchesSearch =
                !q ||
                ind.code.toLowerCase().includes(q) ||
                ind.title.toLowerCase().includes(q) ||
                ind.description.toLowerCase().includes(q) ||
                sub.title.toLowerCase().includes(q) ||
                std.title.toLowerCase().includes(q);

              if (!matchesSearch) return false;

              // فلترة الحالات
              if (filterMode === 'deficiencies') return ind.hasDefect;
              if (filterMode === 'low_score') return ind.schoolScore !== null && ind.schoolScore < 2;
              if (filterMode === 'unscored') return ind.schoolScore === null;
              if (filterMode === 'needs_evidence') {
                return (
                  ind.coveredRequirementsCount < ind.mandatoryRequirementsCount ||
                  ind.hasDefect ||
                  (ind.schoolScore !== null && ind.schoolScore < 2)
                );
              }

              return true;
            });

            return { ...sub, indicators: filteredInds };
          })
          .filter((sub) => sub.indicators.length > 0);

        return { ...std, subStandards: filteredSubs };
      })
      .filter((std) => std.subStandards.length > 0);
  }, [standards, searchQuery, filterMode]);

  // حفظ رصد النقص للمؤشر
  const handleSaveDeficiency = async (indicator: SupervisionIndicatorItem) => {
    const indId = indicator.indicatorId;
    const cats = flagCategories[indId] && flagCategories[indId].length > 0
      ? flagCategories[indId]
      : (indicator.defectCategories && indicator.defectCategories.length > 0
          ? indicator.defectCategories
          : (indicator.defectCategory ? [indicator.defectCategory] : [DEFICIENCY_CATEGORIES[0]]));
    const cat = cats.join('، ');
    const note = flagNote[indId] ?? indicator.defectReason ?? '';
    const dir = flagDirectives[indId] ?? indicator.directives ?? '';
    const actions = flagAllowedActions[indId] && flagAllowedActions[indId].length > 0
      ? flagAllowedActions[indId]
      : (indicator.allowedActions && indicator.allowedActions.length > 0
          ? indicator.allowedActions
          : ['upload_replace_evidence']);

    if (!note.trim()) {
      alert('يرجى تدوين الملاحظة الإشرافية حول النقص المرصود قبل الحفظ.');
      return;
    }

    setSavingDeficiency((prev) => ({ ...prev, [indId]: true }));
    try {
      await supervisionApi.saveDeficiencyNote(submissionId || evaluationId, {
        indicatorId: indId,
        deficiencyCategories: cats,
        deficiencyCategory: cat,
        supervisorNote: note.trim(),
        directives: dir.trim() || undefined,
        allowedActions: actions,
      });

      setSaveSuccess((prev) => ({ ...prev, [indId]: true }));
      setTimeout(() => {
        setSaveSuccess((prev) => ({ ...prev, [indId]: false }));
      }, 2505);

      onDeficiencyUpdated?.();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'تعذر حفظ رصد النقص. يرجى المحاولة لاحقاً.');
    } finally {
      setSavingDeficiency((prev) => ({ ...prev, [indId]: false }));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. شريط الأدوات العلوي: البحث، الفلترة، زر طي/توسيع الكل */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '16px 20px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', flex: 1 }}>
          {/* حقل البحث */}
          <div
            style={{
              position: 'relative',
              minWidth: '280px',
              maxWidth: '420px',
              flex: 1,
            }}
          >
            <Search
              size={16}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94A3B8',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برمز المؤشر، العنوان، أو المعيار..."
              style={{
                width: '100%',
                padding: '9px 38px 9px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                color: '#1E293B',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* أزرار الفلترة السريعة */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                border: filterMode === 'all' ? '1px solid #2563EB' : '1px solid #E2E8F0',
                backgroundColor: filterMode === 'all' ? '#EFF6FF' : '#FFFFFF',
                color: filterMode === 'all' ? '#1D4ED8' : '#64748B',
                cursor: 'pointer',
              }}
            >
              كافة المؤشرات (109)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('deficiencies')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                border: filterMode === 'deficiencies' ? '1px solid #DC2626' : '1px solid #E2E8F0',
                backgroundColor: filterMode === 'deficiencies' ? '#FEF2F2' : '#FFFFFF',
                color: filterMode === 'deficiencies' ? '#B91C1C' : '#64748B',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <AlertTriangle size={13} />
              النواقص المرصودة
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('low_score')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                border: filterMode === 'low_score' ? '1px solid #D97706' : '1px solid #E2E8F0',
                backgroundColor: filterMode === 'low_score' ? '#FFFBEB' : '#FFFFFF',
                color: filterMode === 'low_score' ? '#B45309' : '#64748B',
                cursor: 'pointer',
              }}
            >
              الدرجات المنخفضة (0-1)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('unscored')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                border: filterMode === 'unscored' ? '1px solid #64748B' : '1px solid #E2E8F0',
                backgroundColor: filterMode === 'unscored' ? '#F1F5F9' : '#FFFFFF',
                color: filterMode === 'unscored' ? '#334155' : '#64748B',
                cursor: 'pointer',
              }}
            >
              غير مرصودة
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('needs_evidence')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                border: filterMode === 'needs_evidence' ? '1px solid #EA580C' : '1px solid #E2E8F0',
                backgroundColor: filterMode === 'needs_evidence' ? '#FFF7ED' : '#FFFFFF',
                color: filterMode === 'needs_evidence' ? '#C2410C' : '#64748B',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <FileCheck size={13} />
              عناصر بحاجة لاستيفاء التوثيق
            </button>
          </div>
        </div>

        {/* زر طي / توسيع الكل */}
        <button
          type="button"
          onClick={toggleAllStandards}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#334155',
            backgroundColor: '#F8FAFC',
            border: '1px solid #CBD5E1',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Layers size={14} color="#64748B" />
          {isAllExpanded ? 'طي كافة المعايير' : 'توسيع كافة المعايير'}
        </button>
      </div>

      {/* 2. قائمة المعايير السبعة وشجرتها الهيكلية */}
      {filteredStandards.length === 0 ? (
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
          }}
        >
          <Search size={36} color="#94A3B8" style={{ marginBottom: '12px' }} />
          <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 700, color: '#334155' }}>
            لا توجد مؤشرات مطابقة لخيارات البحث أو الفلترة
          </h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
            جرّب تغيير كلمة البحث أو الضغط على «كافة المؤشرات (109)» لاستعراض الشجرة كاملة.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredStandards.map((std) => {
            const isStdOpen = !!expandedStandards[std.standardId];
            const stats = std.stats;

            return (
              <div
                key={std.standardId}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                }}
              >
                {/* ترويسة المعيار الرئيسي */}
                <div
                  onClick={() => toggleStandard(std.standardId)}
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    backgroundColor: isStdOpen ? '#F8FAFC' : '#FFFFFF',
                    borderBottom: isStdOpen ? '1px solid #E2E8F0' : 'none',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: '#EFF6FF',
                        color: '#2563EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '14px',
                      }}
                    >
                      {std.code}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>
                          {std.title}
                        </h3>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: '#F1F5F9',
                            color: '#475569',
                          }}
                        >
                          الوزن: {std.weight}%
                        </span>
                      </div>
                      {std.description && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                          {std.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* إحصائيات المعيار والتوزيع الرباعي ونسبة التغطية */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* شارات توزيع المستويات */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        title="متحقق (المستوى 3)"
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: '#DCFCE7',
                          color: '#15803D',
                        }}
                      >
                        متحقق (3): {stats.level3Count}
                      </span>
                      <span
                        title="متوسط (المستوى 2)"
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: '#DBEAFE',
                          color: '#1D4ED8',
                        }}
                      >
                        متوسط (2): {stats.level2Count}
                      </span>
                      <span
                        title="ضعيف (المستوى 1)"
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: '#FEF3C7',
                          color: '#B45309',
                        }}
                      >
                        ضعيف (1): {stats.level1Count}
                      </span>
                      <span
                        title="غير متوفر (المستوى 0)"
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: '#FEE2E2',
                          color: '#B91C1C',
                        }}
                      >
                        غير متوفر (0): {stats.level0Count}
                      </span>
                    </div>

                    {/* نسبة تغطية الشواهد */}
                    <div style={{ textAlign: 'left', minWidth: '100px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155', textAlign: 'right' }}>
                        شواهد: {stats.totalEvidences} ({stats.coveragePercentage}%)
                      </div>
                      <div
                        style={{
                          width: '100px',
                          height: '5px',
                          backgroundColor: '#E2E8F0',
                          borderRadius: '3px',
                          overflow: 'hidden',
                          marginTop: '3px',
                        }}
                      >
                        <div
                          style={{
                            width: `${stats.coveragePercentage}%`,
                            height: '100%',
                            backgroundColor: stats.coveragePercentage >= 90 ? '#10B981' : '#F59E0B',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ color: '#64748B' }}>
                      {isStdOpen ? <ChevronDown size={18} /> : <ChevronLeft size={18} />}
                    </div>
                  </div>
                </div>

                {/* محتوى المعيار: المعايير الفرعية والمؤشرات */}
                {isStdOpen && (
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {std.subStandards.map((sub) => {
                      const isSubOpen = expandedSubStandards[sub.subStandardId] ?? true;

                      return (
                        <div
                          key={sub.subStandardId}
                          style={{
                            border: '1px solid #E2E8F0',
                            borderRadius: '10px',
                            backgroundColor: '#FFFFFF',
                            overflow: 'hidden',
                          }}
                        >
                          {/* ترويسة المعيار الفرعي */}
                          <div
                            onClick={() => toggleSubStandard(sub.subStandardId)}
                            style={{
                              padding: '12px 16px',
                              backgroundColor: '#F8FAFC',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              borderBottom: isSubOpen ? '1px solid #E2E8F0' : 'none',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  color: '#2563EB',
                                  backgroundColor: '#EFF6FF',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                }}
                              >
                                {sub.code}
                              </span>
                              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                                {sub.title}
                              </h4>
                              <span style={{ fontSize: '11px', color: '#64748B' }}>
                                ({sub.indicators.length} مؤشر)
                              </span>
                            </div>

                            <div style={{ color: '#64748B' }}>
                              {isSubOpen ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
                            </div>
                          </div>

                          {/* مؤشرات هذا المعيار الفرعي */}
                          {isSubOpen && (
                            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {/* الإطار التوجيهي للمعيار الفرعي */}
                              {sub.guidance && (
                                <div
                                  style={{
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    backgroundColor: '#F0F9FF',
                                    border: '1px solid #BAE6FD',
                                    color: '#0369A1',
                                    fontSize: '12px',
                                    lineHeight: '1.6',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '8px',
                                  }}
                                >
                                  <FileText size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
                                  <div>
                                    <strong style={{ color: '#0C4A6E' }}>الإطار التوجيهي للمعيار الفرعي: </strong>
                                    {sub.guidance}
                                  </div>
                                </div>
                              )}
                              {sub.indicators.map((ind) => {
                                const isIndOpen = !!expandedIndicators[ind.indicatorId];
                                const isFlagOpen = !!flaggingOpen[ind.indicatorId];
                                const currentCategories = flagCategories[ind.indicatorId] !== undefined
                                  ? flagCategories[ind.indicatorId]
                                  : (ind.defectCategories && ind.defectCategories.length > 0
                                      ? ind.defectCategories
                                      : (ind.defectCategory ? [ind.defectCategory] : [DEFICIENCY_CATEGORIES[0]]));
                                const currentNote = flagNote[ind.indicatorId] ?? ind.defectReason ?? '';
                                const currentDir = flagDirectives[ind.indicatorId] ?? ind.directives ?? '';
                                const currentActions = flagAllowedActions[ind.indicatorId] !== undefined
                                  ? flagAllowedActions[ind.indicatorId]
                                  : (ind.allowedActions && ind.allowedActions.length > 0
                                      ? ind.allowedActions
                                      : ['upload_replace_evidence']);
                                const isSaving = !!savingDeficiency[ind.indicatorId];
                                const isSaved = !!saveSuccess[ind.indicatorId];

                                // تحديد لون شارة المستوى المرصود
                                const scoreColorMap = {
                                  3: { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' },
                                  2: { bg: '#DBEAFE', text: '#1D4ED8', border: '#93C5FD' },
                                  1: { bg: '#FEF3C7', text: '#B45309', border: '#FCD34D' },
                                  0: { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' },
                                };
                                const badgeColors =
                                  ind.schoolScore !== null
                                    ? scoreColorMap[ind.schoolScore as 0 | 1 | 2 | 3] || { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' }
                                    : { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' };

                                return (
                                  <div
                                    key={ind.indicatorId}
                                    id={`indicator-${ind.indicatorId}`}
                                    style={{
                                      borderRadius: '8px',
                                      border: ind.hasDefect ? '1px solid #FCA5A5' : '1px solid #E2E8F0',
                                      backgroundColor: ind.hasDefect ? '#FFFBFB' : '#FFFFFF',
                                      overflow: 'hidden',
                                      transition: 'box-shadow 0.15s ease',
                                    }}
                                  >
                                    {/* شريط المؤشر المختصر */}
                                    <div
                                      onClick={() => toggleIndicator(ind.indicatorId)}
                                      style={{
                                        padding: '12px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        backgroundColor: isIndOpen ? '#F8FAFC' : 'transparent',
                                        borderBottom: isIndOpen ? '1px solid #E2E8F0' : 'none',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                        <span
                                          style={{
                                            fontSize: '11px',
                                            fontWeight: 800,
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            backgroundColor: '#0F172A',
                                            color: '#FFFFFF',
                                          }}
                                        >
                                          {ind.code}
                                        </span>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                                          {ind.title}
                                        </span>
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {/* شارة الدرجة المرصودة بالسلم الوطني الرسمي */}
                                        <span
                                          style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            backgroundColor: badgeColors.bg,
                                            color: badgeColors.text,
                                            border: `1px solid ${badgeColors.border}`,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                          }}
                                        >
                                          {ind.schoolScore !== null ? ind.scoreLevelName : 'غير مرصود'}
                                        </span>

                                        {/* شارة الشواهد المرفقة وتغطية المتطلبات الإلزامية */}
                                        <span
                                          style={{
                                            padding: '4px 9px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            backgroundColor:
                                              ind.mandatoryRequirementsCount > 0 && ind.coveredRequirementsCount >= ind.mandatoryRequirementsCount && ind.evidenceCount > 0
                                                ? '#ECFDF5'
                                                : ind.evidenceCount > 0
                                                ? '#EFF6FF'
                                                : '#FFFBEB',
                                            color:
                                              ind.mandatoryRequirementsCount > 0 && ind.coveredRequirementsCount >= ind.mandatoryRequirementsCount && ind.evidenceCount > 0
                                                ? '#059669'
                                                : ind.evidenceCount > 0
                                                ? '#1D4ED8'
                                                : '#B45309',
                                            border: `1px solid ${
                                              ind.mandatoryRequirementsCount > 0 && ind.coveredRequirementsCount >= ind.mandatoryRequirementsCount && ind.evidenceCount > 0
                                                ? '#A7F3D0'
                                                : ind.evidenceCount > 0
                                                ? '#BFDBFE'
                                                : '#FDE68A'
                                            }`,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                          }}
                                        >
                                          <FileCheck size={12} />
                                          {ind.mandatoryRequirementsCount > 0
                                            ? `${ind.evidenceCount} شاهد (غطى ${ind.coveredRequirementsCount} من ${ind.mandatoryRequirementsCount} متطلبات)`
                                            : `شواهد (${ind.evidenceCount})`}
                                        </span>

                                        {/* شارة رصد النقص إن وجدت */}
                                        {ind.hasDefect && (
                                          <span
                                            style={{
                                              padding: '4px 8px',
                                              borderRadius: '6px',
                                              fontSize: '11px',
                                              fontWeight: 700,
                                              backgroundColor: '#FEF2F2',
                                              color: '#DC2626',
                                              border: '1px solid #FCA5A5',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                            }}
                                          >
                                            <AlertTriangle size={12} />
                                            نقص مرصود
                                          </span>
                                        )}

                                        <div style={{ color: '#94A3B8' }}>
                                          {isIndOpen ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
                                        </div>
                                      </div>
                                    </div>

                                    {/* التفاصيل الكاملة للمؤشر عند التوسيع */}
                                    {isIndOpen && (
                                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {/* 1. بطاقات واصفات الروبك الرباعية (Rubric Descriptors) */}
                                        <div>
                                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                                            مقياس التقدير الرباعي للمعايير الوطنية (الروبك):
                                          </div>
                                          <div
                                            style={{
                                              display: 'grid',
                                              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                              gap: '10px',
                                            }}
                                          >
                                            {ind.descriptors.map((desc) => {
                                              const isSelected = desc.isSelected;

                                              return (
                                                <div
                                                  key={desc.descriptorId || desc.score}
                                                  style={{
                                                    padding: '12px',
                                                    borderRadius: '8px',
                                                    border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                                                    backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '6px',
                                                  }}
                                                >
                                                  <div
                                                    style={{
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'space-between',
                                                    }}
                                                  >
                                                    <span
                                                      style={{
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        color: isSelected ? '#1D4ED8' : '#475569',
                                                      }}
                                                    >
                                                      {desc.title}
                                                    </span>
                                                    {isSelected && (
                                                      <span
                                                        style={{
                                                          fontSize: '10px',
                                                          fontWeight: 800,
                                                          backgroundColor: '#2563EB',
                                                          color: '#FFFFFF',
                                                          padding: '2px 6px',
                                                          borderRadius: '10px',
                                                        }}
                                                      >
                                                        درجة المدرسة ✓
                                                      </span>
                                                    )}
                                                  </div>
                                                  <p
                                                    style={{
                                                      margin: 0,
                                                      fontSize: '11px',
                                                      lineHeight: '1.5',
                                                      color: isSelected ? '#1E293B' : '#64748B',
                                                    }}
                                                  >
                                                    {desc.description}
                                                  </p>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        {/* 2. تبرير مقيّم المدرسة وملاحظات المراجعة الداخلية */}
                                        {(() => {
                                          const hasInternal = Array.isArray(ind.internalReviewNotes)
                                            ? ind.internalReviewNotes.length > 0
                                            : Boolean(ind.internalReviewNotes);

                                          return (
                                            <div
                                              style={{
                                                display: 'grid',
                                                gridTemplateColumns: hasInternal ? '1fr 1fr' : '1fr',
                                                gap: '12px',
                                              }}
                                            >
                                              {/* تبرير المقيم */}
                                              <div
                                            style={{
                                              padding: '12px',
                                              borderRadius: '8px',
                                              backgroundColor: '#F8FAFC',
                                              border: '1px solid #E2E8F0',
                                            }}
                                          >
                                            <div
                                              style={{
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                color: '#334155',
                                                marginBottom: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                              }}
                                            >
                                              <FileText size={13} color="#2563EB" />
                                              تبرير مقيّم المدرسة للدرجة المرصودة:
                                            </div>
                                            <p
                                              style={{
                                                margin: 0,
                                                fontSize: '12px',
                                                lineHeight: '1.6',
                                                color: '#1E293B',
                                              }}
                                            >
                                              {ind.evaluatorJustification && ind.evaluatorJustification !== 'لا يوجد تبرير مدخل من المدرسة'
                                                ? ind.evaluatorJustification
                                                : 'لا يوجد تبرير مدخل من المدرسة.'}
                                            </p>
                                          </div>

                                          {/* توجيهات وملاحظات المراجعة الداخلية (المدير والمقيم) */}
                                          {hasInternal && (
                                            <div
                                              style={{
                                                padding: '12px',
                                                borderRadius: '8px',
                                                backgroundColor: '#F0FDF4',
                                                border: '1px solid #BBF7D0',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px',
                                              }}
                                            >
                                              <div
                                                style={{
                                                  fontSize: '11px',
                                                  fontWeight: 700,
                                                  color: '#166534',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'space-between',
                                                }}
                                              >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                  <MessageSquare size={13} color="#16A34A" />
                                                  توجيهات وملاحظات المراجعة الداخلية:
                                                </div>
                                                {Array.isArray(ind.internalReviewNotes) && (
                                                  <span style={{ fontSize: '10px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                                    {ind.internalReviewNotes.length} ملاحظة
                                                  </span>
                                                )}
                                              </div>
                                              {Array.isArray(ind.internalReviewNotes) ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                  {ind.internalReviewNotes.map((n) => (
                                                    <div
                                                      key={n.noteId}
                                                      style={{
                                                        padding: '8px 10px',
                                                        borderRadius: '6px',
                                                        backgroundColor: '#FFFFFF',
                                                        border: '1px solid #DCFCE7',
                                                      }}
                                                    >
                                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#166534' }}>{n.authorName}</span>
                                                        <span style={{ fontSize: '9.5px', color: '#475569' }}>{n.authorRole}</span>
                                                      </div>
                                                      <p style={{ margin: 0, fontSize: '11.5px', lineHeight: '1.5', color: '#14532D' }}>{n.text}</p>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', color: '#14532D' }}>
                                                  {ind.internalReviewNotes}
                                                </p>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}

                                        {/* 3. أدوات التحقق الرسمية */}
                                        {ind.verificationTools.length > 0 && (
                                          <div>
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                              أدوات وأساليب التحقق المقررة للمؤشر:
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                              {ind.verificationTools.map((vt) => (
                                                <span
                                                  key={vt.id || vt.name}
                                                  style={{
                                                    fontSize: '11px',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    backgroundColor: '#F1F5F9',
                                                    color: '#334155',
                                                    border: '1px solid #CBD5E1',
                                                  }}
                                                >
                                                  {vt.name}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* 4. مصفوفة متطلبات الإثبات الإلزامية وتغطيتها */}
                                        {ind.evidenceRequirements.length > 0 && (
                                          <div>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                                              متطلبات الإثبات الإلزامية وتغطيتها ({ind.evidenceRequirements.length} متطلب):
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                              {ind.evidenceRequirements.map((req) => (
                                                <div
                                                  key={req.id || req.requirementId}
                                                  style={{
                                                    padding: '10px 14px',
                                                    borderRadius: '8px',
                                                    backgroundColor: req.isCovered ? '#F0FDF4' : '#FFFBEB',
                                                    border: `1px solid ${req.isCovered ? '#BBF7D0' : '#FDE68A'}`,
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: '8px',
                                                  }}
                                                >
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
                                                    <span
                                                      style={{
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        backgroundColor: req.isCovered ? '#DCFCE7' : '#FEF3C7',
                                                        color: req.isCovered ? '#15803D' : '#B45309',
                                                      }}
                                                    >
                                                      {req.isCovered ? 'مستوفى ✓' : 'غير مغطى ⚠'}
                                                    </span>
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>
                                                      {req.title}
                                                    </span>
                                                    {req.isMandatory && (
                                                      <span style={{ fontSize: '10px', color: '#DC2626', fontWeight: 700 }}>
                                                        (إلزامي)
                                                      </span>
                                                    )}
                                                  </div>

                                                  <div style={{ fontSize: '11px', color: '#475569' }}>
                                                    <span style={{ fontWeight: 600 }}>المستند المغطي: </span>
                                                    <span style={{ color: req.isCovered ? '#15803D' : '#B45309', fontWeight: 700 }}>
                                                      {req.coveringDocumentsSummary || (req.coveringDocuments && req.coveringDocuments.length > 0 ? req.coveringDocuments.join('، ') : 'لا يوجد شاهد مرتبط')}
                                                    </span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* 5. الشواهد والأدلة الميدانية المرفقة */}
                                        <div>
                                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                                            ملفات الشواهد المرفقة ({ind.evidences.length}):
                                          </div>

                                          {ind.evidences.length === 0 ? (
                                            <div
                                              style={{
                                                padding: '10px 14px',
                                                borderRadius: '6px',
                                                backgroundColor: '#FFFBEB',
                                                border: '1px solid #FDE68A',
                                                fontSize: '12px',
                                                color: '#B45309',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                              }}
                                            >
                                              <AlertCircle size={14} />
                                              لم تقم المدرسة بإرفاق أي ملفات شواهد ميدانية لهذا المؤشر.
                                            </div>
                                          ) : (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                              {ind.evidences.map((ev) => (
                                                <div
                                                  key={ev.id}
                                                  style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#FFFFFF',
                                                    border: '1px solid #CBD5E1',
                                                    color: '#1E293B',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                  }}
                                                >
                                                  <FileText size={15} color="#2563EB" />
                                                  <span>{ev.fileName}</span>
                                                  <span style={{ fontSize: '10px', color: '#64748B' }}>
                                                    ({ev.fileSizeFormatted})
                                                  </span>
                                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginInlineStart: 'auto' }}>
                                                    <button
                                                      type="button"
                                                      title="معاينة الملف في نافذة جديدة"
                                                      onClick={() => supervisionApi.previewDocumentVersion(ev.versionId || ev.documentVersionId || ev.id || ev.fileUrl)}
                                                      style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        padding: '4px',
                                                        cursor: 'pointer',
                                                        color: '#2563EB',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                      }}
                                                    >
                                                      <Eye size={14} />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      title="تحميل الملف الأصلي"
                                                      onClick={() => supervisionApi.downloadDocumentVersion(ev.versionId || ev.documentVersionId || ev.id || ev.fileUrl, ev.fileName)}
                                                      style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        padding: '4px',
                                                        cursor: 'pointer',
                                                        color: '#059669',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                      }}
                                                    >
                                                      <Download size={14} />
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>

                                        {/* 5. لوحة رصد النقص والتوجيهات الإشرافية المباشرة */}
                                        <div
                                          style={{
                                            borderTop: '1px solid #E2E8F0',
                                            paddingTop: '14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '10px',
                                          }}
                                        >
                                          {!isFlagOpen && !ind.hasDefect ? (
                                            <div>
                                              <button
                                                type="button"
                                                disabled={isReadOnly}
                                                onClick={() =>
                                                  setFlaggingOpen((prev) => ({
                                                    ...prev,
                                                    [ind.indicatorId]: true,
                                                  }))
                                                }
                                                style={{
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '6px',
                                                  padding: '6px 12px',
                                                  borderRadius: '6px',
                                                  fontSize: '12px',
                                                  fontWeight: 700,
                                                  backgroundColor: '#FEF2F2',
                                                  border: '1px solid #FECACA',
                                                  color: '#DC2626',
                                                  cursor: isReadOnly ? 'not-allowed' : 'pointer',
                                                }}
                                              >
                                                <AlertTriangle size={13} />
                                                رصد نقص أو ملاحظة إشرافية على هذا المؤشر
                                              </button>
                                            </div>
                                          ) : (
                                            <div
                                              style={{
                                                padding: '14px',
                                                borderRadius: '8px',
                                                backgroundColor: '#FFF7ED',
                                                border: '1px solid #FDBA74',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '12px',
                                              }}
                                            >
                                              <div
                                                style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'space-between',
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    fontSize: '12px',
                                                    fontWeight: 800,
                                                    color: '#9A3412',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                  }}
                                                >
                                                  <AlertTriangle size={15} color="#EA580C" />
                                                  لوحة رصد النواقص وتوجيهات الاستكمال للمؤشر ({ind.code}):
                                                </div>

                                                {!ind.hasDefect && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setFlaggingOpen((prev) => ({
                                                        ...prev,
                                                        [ind.indicatorId]: false,
                                                      }))
                                                    }
                                                    style={{
                                                      background: 'none',
                                                      border: 'none',
                                                      color: '#94A3B8',
                                                      cursor: 'pointer',
                                                    }}
                                                  >
                                                    <X size={14} />
                                                  </button>
                                                )}
                                              </div>

                                              {/* حقول رصد النقص المشتركة الموحدة */}
                                              <SharedDeficiencyFormFields
                                                categories={currentCategories}
                                                onChangeCategories={(cats) => {
                                                  setFlagCategories((prev) => ({
                                                    ...prev,
                                                    [ind.indicatorId]: cats,
                                                  }));
                                                }}
                                                note={currentNote}
                                                onChangeNote={(val) => {
                                                  setFlagNote((prev) => ({
                                                    ...prev,
                                                    [ind.indicatorId]: val,
                                                  }));
                                                }}
                                                directives={currentDir}
                                                onChangeDirectives={(val) => {
                                                  setFlagDirectives((prev) => ({
                                                    ...prev,
                                                    [ind.indicatorId]: val,
                                                  }));
                                                }}
                                                allowedActions={currentActions}
                                                onChangeAllowedActions={(acts) => {
                                                  setFlagAllowedActions((prev) => ({
                                                    ...prev,
                                                    [ind.indicatorId]: acts,
                                                  }));
                                                }}
                                                isReadOnly={isReadOnly}
                                              />

                                              {/* أزرار الإجراءات: حفظ / إلغاء رصد النقص */}
                                              {!isReadOnly && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                                                  <button
                                                    type="button"
                                                    disabled={isSaving}
                                                    onClick={() => handleSaveDeficiency(ind)}
                                                    style={{
                                                      padding: '7px 16px',
                                                      borderRadius: '6px',
                                                      fontSize: '12px',
                                                      fontWeight: 700,
                                                      backgroundColor: '#EA580C',
                                                      color: '#FFFFFF',
                                                      border: 'none',
                                                      cursor: isSaving ? 'not-allowed' : 'pointer',
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      gap: '6px',
                                                    }}
                                                  >
                                                    <Save size={13} />
                                                    {isSaving ? 'جارٍ الحفظ...' : 'حفظ الرصد الإشرافي'}
                                                  </button>

                                                  {ind.hasDefect && (
                                                    <button
                                                      type="button"
                                                      disabled={isSaving}
                                                      onClick={async () => {
                                                        if (!confirm('هل أنت متأكد من إلغاء رصد النقص عن هذا المؤشر؟')) return;
                                                        setSavingDeficiency((prev) => ({ ...prev, [ind.indicatorId]: true }));
                                                        try {
                                                          await supervisionApi.deleteDeficiencyNote(submissionId || evaluationId, ind.indicatorId);
                                                          onDeficiencyUpdated?.();
                                                        } catch (e: unknown) {
                                                          alert(e instanceof Error ? e.message : 'تعذر إلغاء رصد النقص.');
                                                        } finally {
                                                          setSavingDeficiency((prev) => ({ ...prev, [ind.indicatorId]: false }));
                                                        }
                                                      }}
                                                      style={{
                                                        padding: '7px 14px',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        backgroundColor: '#FEF2F2',
                                                        color: '#DC2626',
                                                        border: '1px solid #FECACA',
                                                        cursor: isSaving ? 'not-allowed' : 'pointer',
                                                      }}
                                                    >
                                                      إلغاء رصد النقص
                                                    </button>
                                                  )}

                                                  {isSaved && (
                                                    <span
                                                      style={{
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        color: '#16A34A',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                      }}
                                                    >
                                                      <Check size={14} />
                                                      تم حفظ الرصد الإشرافي بنجاح
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
