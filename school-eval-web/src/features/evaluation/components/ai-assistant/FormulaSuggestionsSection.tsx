import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, ArrowRight, RefreshCw, Trash2, Search, ArrowUpDown, EyeOff, RotateCcw } from 'lucide-react';
import { evaluatorApi } from '../../api/evaluatorApi';
import type { ImprovementSuggestion, PriorityLevel } from '../../api/evaluationTypes';
import { AdoptSuggestionModal } from './AdoptSuggestionModal';

interface FormulaSuggestionsSectionProps {
  readOnly?: boolean;
  onNavigateToPlans?: () => void;
  onToast: (type: 'success' | 'error', msg: string) => void;
}

export const FormulaSuggestionsSection: React.FC<FormulaSuggestionsSectionProps> = ({
  readOnly = false,
  onNavigateToPlans,
  onToast,
}) => {
  const [suggestions, setSuggestions] = useState<ImprovementSuggestion[]>([]);
  const [targetScore, setTargetScore] = useState<1 | 2 | 3>(3);
  const [customTargetScores, setCustomTargetScores] = useState<Record<number, number>>({});
  const [customPriorities, setCustomPriorities] = useState<Record<number, PriorityLevel>>({});
  
  // Unified Filters (replaces old scattered cards)
  const [scorePriorityFilter, setScorePriorityFilter] = useState<'all' | 'score_0' | 'score_1' | 'score_2' | 'score_3'>('all');
  const [adoptionFilter, setAdoptionFilter] = useState<'all' | 'unadopted' | 'adopted'>('all');
  const [exclusionFilter, setExclusionFilter] = useState<'active' | 'excluded' | 'all'>('active');
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [standardFilter, setStandardFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'gap_desc' | 'gap_asc' | 'code' | 'priority'>('gap_desc');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ImprovementSuggestion | null>(null);
  const [isAdoptModalOpen, setIsAdoptModalOpen] = useState(false);
  const [isExcluding, setIsExcluding] = useState<number | null>(null);
  const [isUnadopting, setIsUnadopting] = useState<number | null>(null);

  const fetchSuggestions = async (scoreTarget: number = targetScore) => {
    setIsLoading(true);
    try {
      const data = await evaluatorApi.getImprovementSuggestions(scoreTarget);
      setSuggestions(data);
    } catch (err) {
      console.error('Failed to load improvement suggestions:', err);
      onToast('error', 'تعذر تحميل مقترحات التحسين الحسابية.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions(targetScore);
  }, [targetScore]);

  const handleToggleTargetScore = (newScore: 1 | 2 | 3) => {
    if (newScore === targetScore) return;
    const confirmed = window.confirm(
      'تغيير التقدير المستهدف الجماعي سيؤدي إلى إعادة احتساب كافة فجوات المؤشرات وفق المستهدف الجديد. هل تريد الاستمرار؟'
    );
    if (!confirmed) return;
    setCustomTargetScores({});
    setTargetScore(newScore);
  };

  // Dynamic counts for dropdown filters
  const totalCount = suggestions.length;
  const count0 = suggestions.filter((s) => s.score === 0).length;
  const count1 = suggestions.filter((s) => s.score === 1).length;
  const count2 = suggestions.filter((s) => s.score === 2).length;
  const count3 = suggestions.filter((s) => s.score === 3).length;

  const adoptedCount = suggestions.filter((s) => s.isAdopted).length;
  const unadoptedCount = suggestions.filter((s) => !s.isAdopted).length;

  const excludedCount = suggestions.filter((s) => s.isExcluded).length;
  const activeCount = suggestions.filter((s) => !s.isExcluded).length;

  const standardsList = Array.from(new Set(suggestions.map((s) => s.standardName).filter(Boolean)));

  const filteredSuggestions = suggestions
    // 1. Exclusion filter
    .filter((s) => {
      if (exclusionFilter === 'active') return !s.isExcluded;
      if (exclusionFilter === 'excluded') return Boolean(s.isExcluded);
      return true; // 'all'
    })
    // 2. Score / Priority Level filter
    .filter((s) => {
      if (scorePriorityFilter === 'score_0') return s.score === 0;
      if (scorePriorityFilter === 'score_1') return s.score === 1;
      if (scorePriorityFilter === 'score_2') return s.score === 2;
      if (scorePriorityFilter === 'score_3') return s.score === 3;
      return true;
    })
    // 3. Adoption status filter
    .filter((s) => {
      if (adoptionFilter === 'unadopted') return !s.isAdopted;
      if (adoptionFilter === 'adopted') return s.isAdopted;
      return true;
    })
    // 4. Standard filter
    .filter((s) => {
      if (standardFilter !== 'all' && s.standardName !== standardFilter) return false;
      return true;
    })
    // 5. Search query
    .filter((s) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.trim().toLowerCase();
      return (
        s.indicatorCode?.toLowerCase().includes(term) ||
        s.indicatorName?.toLowerCase().includes(term) ||
        s.standardName?.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      const aTarget = customTargetScores[a.resultId] ?? a.targetScore;
      const aGap = Math.max(0, aTarget - a.score);
      const bTarget = customTargetScores[b.resultId] ?? b.targetScore;
      const bGap = Math.max(0, bTarget - b.score);

      const parseCodeNumeric = (code?: string): [number, number, number] => {
        if (!code) return [999, 999, 999];
        const parts = code.split(/[-._]/).map((p) => parseInt(p.replace(/\D/g, ''), 10)).filter((n) => !isNaN(n));
        if (parts.length >= 3) {
          // Format is IND-SUB-STD in Arabic notation (e.g. 1-1-1, 5-2-1, 1-1-2)
          // parts[2] = Standard, parts[1] = Substandard, parts[0] = Indicator
          return [parts[2] ?? 999, parts[1] ?? 999, parts[0] ?? 999];
        }
        return [parts[0] ?? 999, parts[1] ?? 999, parts[2] ?? 999];
      };

      const compareCodesNumeric = (codeA?: string, codeB?: string): number => {
        const [sA, subA, iA] = parseCodeNumeric(codeA);
        const [sB, subB, iB] = parseCodeNumeric(codeB);
        if (sA !== sB) return sA - sB;
        if (subA !== subB) return subA - subB;
        return iA - iB;
      };

      if (sortBy === 'gap_desc') {
        const diff = bGap - aGap;
        if (diff !== 0) return diff;
        return compareCodesNumeric(a.indicatorCode, b.indicatorCode);
      }
      if (sortBy === 'gap_asc') {
        const diff = aGap - bGap;
        if (diff !== 0) return diff;
        return compareCodesNumeric(a.indicatorCode, b.indicatorCode);
      }
      if (sortBy === 'code') {
        return compareCodesNumeric(a.indicatorCode, b.indicatorCode);
      }
      if (sortBy === 'priority') {
        const pOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
        const pA = customPriorities[a.resultId] ?? a.suggestedPriority;
        const pB = customPriorities[b.resultId] ?? b.suggestedPriority;
        const diff = (pOrder[pB] || 0) - (pOrder[pA] || 0);
        if (diff !== 0) return diff;
        return compareCodesNumeric(a.indicatorCode, b.indicatorCode);
      }
      return compareCodesNumeric(a.indicatorCode, b.indicatorCode);
    });

  const handleUnadopt = async (sugg: ImprovementSuggestion) => {
    if (readOnly) return;
    if (!sugg.adoptedAreaId) {
      onToast('error', 'تعذر تحديد معرف إجراء التحسين المتبنى.');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من إلغاء تبني مؤشر «${sugg.indicatorName}» وحذفه من إجراءات التحسين؟`)) {
      return;
    }
    setIsUnadopting(sugg.resultId);
    try {
      await evaluatorApi.deleteImprovementArea(sugg.adoptedAreaId);
      onToast('success', 'تم إلغاء تبني المقترح وحذفه من إجراءات التحسين بنجاح.');
      await fetchSuggestions(targetScore);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'تعذر إلغاء تبني إجراء التحسين.';
      onToast('error', errMsg);
    } finally {
      setIsUnadopting(null);
    }
  };

  const handleOpenAdopt = (sugg: ImprovementSuggestion) => {
    if (readOnly) return;
    const target = customTargetScores[sugg.resultId] ?? sugg.targetScore;
    const priority = customPriorities[sugg.resultId] ?? sugg.suggestedPriority;
    const gap = Math.max(0, target - sugg.score);
    setSelectedSuggestion({
      ...sugg,
      targetScore: target,
      suggestedPriority: priority,
      gap,
    });
    setIsAdoptModalOpen(true);
  };

  const handleExclude = async (sugg: ImprovementSuggestion) => {
    if (readOnly) return;
    if (sugg.isAdopted) {
      onToast('error', 'لا يمكن استبعاد مقترح تم تبنيه كإجراء تحسين مسبقاً.');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من استبعاد مقترح المؤشر «${sugg.indicatorName}» من خطة العمل الحالية؟`)) {
      return;
    }
    setIsExcluding(sugg.resultId);
    try {
      await evaluatorApi.excludeSuggestion(sugg.resultId);
      onToast('success', 'تم استبعاد المقترح من قائمة العمل بنجاح.');
      await fetchSuggestions(targetScore);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'تعذر استبعاد المقترح.';
      onToast('error', errMsg);
    } finally {
      setIsExcluding(null);
    }
  };

  const handleRestore = async (sugg: ImprovementSuggestion) => {
    if (readOnly) return;
    setIsExcluding(sugg.resultId);
    try {
      await evaluatorApi.restoreSuggestion(sugg.resultId);
      onToast('success', 'تمت استعادة المقترح وإعادته لقائمة الاقتراحات النشطة بنجاح.');
      await fetchSuggestions(targetScore);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'تعذر استعادة المقترح.';
      onToast('error', errMsg);
    } finally {
      setIsExcluding(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', direction: 'rtl' }}>
      {/* Workflow Guidance Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          padding: '12px 20px',
          border: '1px solid #e2e8f0',
          fontSize: '12.5px',
          fontWeight: 700,
          color: '#475569',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: '11px' }}>1</span>
          <span style={{ color: '#1e293b' }}>رصد الفجوة المعيارية</span>
        </div>
        <span style={{ color: '#94a3b8' }}>←</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#b45309', fontSize: '11px' }}>2</span>
          <span style={{ color: '#1e293b' }}>تبني المؤشر كإجراء تحسين</span>
        </div>
        <span style={{ color: '#94a3b8' }}>←</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#15803d', fontSize: '11px' }}>3</span>
          <span style={{ color: '#1e293b' }}>صياغة الأهداف والإجراءات التنفيذية</span>
        </div>
      </div>

      {/* Description & Navigation Header */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '18px 24px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
            اقتراحات إجراءات التحسين وتبني المبادرات (FR-SCH-16)
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
            يقوم النظام بحساب الفجوة تلقائيًا للمؤشرات المرصودة بتقدير أقل من المستهدف (المستهدف العام = {targetScore}) ويتيح التحكم المباشر بالأولوية والتقدير المستهدف واستبعاد المقترحات غير المرغوبة.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* مفتاح تبديل التقدير المستهدف الجماعي (مع تحذير تأكيدي) - يشمل المستويات 1 و 2 و 3 */}
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: '#F1F5F9',
              borderRadius: '8px',
              padding: '3px',
              border: '1px solid #E2E8F0',
            }}
          >
            <button
              type="button"
              onClick={() => handleToggleTargetScore(3)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: targetScore === 3 ? '#FFFFFF' : 'transparent',
                color: targetScore === 3 ? '#059669' : '#64748B',
                boxShadow: targetScore === 3 ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              المستهدف: 3 (التميز)
            </button>
            <button
              type="button"
              onClick={() => handleToggleTargetScore(2)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: targetScore === 2 ? '#FFFFFF' : 'transparent',
                color: targetScore === 2 ? '#B45309' : '#64748B',
                boxShadow: targetScore === 2 ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              المستهدف: 2 (الفجوات الحرجة)
            </button>
            <button
              type="button"
              onClick={() => handleToggleTargetScore(1)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: targetScore === 1 ? '#FFFFFF' : 'transparent',
                color: targetScore === 1 ? '#DC2626' : '#64748B',
                boxShadow: targetScore === 1 ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              المستهدف: 1 (الحد الأدنى)
            </button>
          </div>

          <button
            type="button"
            onClick={() => fetchSuggestions(targetScore)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            تحديث الاقتراحات
          </button>
          {onNavigateToPlans && (
            <button
              type="button"
              onClick={onNavigateToPlans}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#059669',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <span>الذهاب لخطط التحسين</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Unified Search, Filter & Sort Controls (Replaces old scattered boxes) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '14px 18px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '300px', flexWrap: 'wrap' }}>
          {/* Search box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '300px' }}>
            <Search size={15} color="#94A3B8" style={{ position: 'absolute', right: '12px', top: '10px' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث برمز المؤشر أو اسمه أو المعيار..."
              style={{
                width: '100%',
                padding: '8px 36px 8px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12.5px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Unified Filter 1: Score & Priority Breakdown */}
          <select
            value={scorePriorityFilter}
            onChange={(e) => setScorePriorityFilter(e.target.value as any)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '12.5px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#1E293B',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">كافة مستويات الفجوة ({totalCount})</option>
            <option value="score_0">أولوية حرجة — درجة 0 ({count0})</option>
            <option value="score_1">أولوية عالية — درجة 1 ({count1})</option>
            <option value="score_2">أولوية متوسطة — درجة 2 ({count2})</option>
            <option value="score_3">فجوات التميز — درجة 3 ({count3})</option>
          </select>

          {/* Unified Filter 2: Adoption Status */}
          <select
            value={adoptionFilter}
            onChange={(e) => setAdoptionFilter(e.target.value as any)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '12.5px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#1E293B',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">حالة التبني: الكل</option>
            <option value="unadopted">لم يتم تبنيها بعد ({unadoptedCount})</option>
            <option value="adopted">تم تبنيها مسبقاً ({adoptedCount})</option>
          </select>

          {/* Unified Filter 3: Exclusion Filter */}
          <select
            value={exclusionFilter}
            onChange={(e) => setExclusionFilter(e.target.value as any)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '12.5px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: exclusionFilter === 'excluded' ? '#DC2626' : '#1E293B',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="active">غير المستبعدة ({activeCount})</option>
            <option value="excluded">المستبعدة فقط ({excludedCount})</option>
            <option value="all">عرض الكل ({totalCount})</option>
          </select>

          {/* Standard Filter */}
          <select
            value={standardFilter}
            onChange={(e) => setStandardFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '12.5px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">كافة المعايير الرئيسية</option>
            {standardsList.map((std) => (
              <option key={std} value={std}>
                {std}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowUpDown size={15} color="#64748B" />
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>ترتيب حسب:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '12.5px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="gap_desc">حجم الفجوة (من الأكبر للأصغر)</option>
            <option value="gap_asc">حجم الفجوة (من الأصغر للأكبر)</option>
            <option value="code">رمز المؤشر</option>
            <option value="priority">الأولوية المحددة</option>
          </select>
        </div>
      </div>

      {/* Suggestions Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'right' }}>
                <th style={{ padding: '12px 14px', width: '130px' }}>المعيار الرئيسي</th>
                <th style={{ padding: '12px 14px', width: '90px' }}>كود المؤشر</th>
                <th style={{ padding: '12px 14px' }}>اسم المؤشر المعياري</th>
                <th style={{ padding: '12px 14px', width: '80px', textAlign: 'center' }}>الدرجة</th>
                <th style={{ padding: '12px 14px', width: '90px', textAlign: 'center' }}>المستهدف</th>
                <th style={{ padding: '12px 14px', width: '70px', textAlign: 'center' }}>الفجوة</th>
                <th style={{ padding: '12px 14px', width: '120px', textAlign: 'center' }}>الأولوية (تعديل مباشر)</th>
                <th style={{ padding: '12px 14px', width: '100px', textAlign: 'center' }}>حالة التبني</th>
                <th style={{ padding: '12px 14px', width: '180px', textAlign: 'center' }}>إجراء التحسين</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    جارِ احتساب مقترحات الفجوات المعيارية...
                  </td>
                </tr>
              ) : filteredSuggestions.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontWeight: 600 }}>
                    {suggestions.length === 0
                      ? 'ممتاز! كافة المؤشرات المرصودة حققت التقدير المستهدف ولا توجد فجوات حالياً.'
                      : 'لا توجد مقترحات تطابق خيارات التصفية المحددة.'}
                  </td>
                </tr>
              ) : (
                filteredSuggestions.map((sugg) => {
                  const effectiveTarget = customTargetScores[sugg.resultId] ?? sugg.targetScore;
                  const effectiveGap = Math.max(0, effectiveTarget - sugg.score);
                  const effectivePriority = customPriorities[sugg.resultId] ?? sugg.suggestedPriority;
                  const isBusy = isExcluding === sugg.resultId || isUnadopting === sugg.resultId;

                  return (
                    <tr
                      key={sugg.resultId}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: sugg.isExcluded ? '#FEF2F2' : sugg.isAdopted ? '#fcfdfd' : '#ffffff',
                        opacity: sugg.isExcluded ? 0.75 : 1,
                      }}
                    >
                      <td style={{ padding: '12px 14px', color: '#475569', fontSize: '12.5px', fontWeight: 700 }}>
                        {sugg.standardName || 'المعايير الوطنية'}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#2563eb' }}>
                        {sugg.indicatorCode}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {sugg.indicatorName}
                          {sugg.isExcluded && (
                            <span
                              style={{
                                marginRight: '8px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#FEE2E2',
                                color: '#991B1B',
                                fontSize: '10.5px',
                                fontWeight: 700,
                              }}
                            >
                              مستبعد من الخطة
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          الإجراء المقترح: {sugg.suggestedName}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>
                        {sugg.score}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <select
                          disabled={sugg.isAdopted || readOnly}
                          value={effectiveTarget}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCustomTargetScores((prev) => ({ ...prev, [sugg.resultId]: val }));
                          }}
                          style={{
                            padding: '4px 6px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            backgroundColor: '#ffffff',
                            color: '#16a34a',
                            cursor: sugg.isAdopted || readOnly ? 'default' : 'pointer',
                          }}
                        >
                          <option value={1}>1 (مقبول)</option>
                          <option value={2}>2 (جيد)</option>
                          <option value={3}>3 (متميز)</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#d97706' }}>
                        -{effectiveGap}
                      </td>

                      {/* Priority Control Directly from Table */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <select
                          disabled={sugg.isAdopted || readOnly}
                          value={effectivePriority}
                          onChange={(e) => {
                            const val = e.target.value as PriorityLevel;
                            setCustomPriorities((prev) => ({ ...prev, [sugg.resultId]: val }));
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            backgroundColor:
                              effectivePriority === 'High'
                                ? '#fef2f2'
                                : effectivePriority === 'Medium'
                                ? '#fffbeb'
                                : '#f0fdf4',
                            color:
                              effectivePriority === 'High'
                                ? '#dc2626'
                                : effectivePriority === 'Medium'
                                ? '#d97706'
                                : '#15803d',
                            border: `1px solid ${
                              effectivePriority === 'High'
                                ? '#fecaca'
                                : effectivePriority === 'Medium'
                                ? '#fde68a'
                                : '#bbf7d0'
                            }`,
                            cursor: sugg.isAdopted || readOnly ? 'default' : 'pointer',
                            outline: 'none',
                          }}
                        >
                          <option value="High">عالية</option>
                          <option value="Medium">متوسطة</option>
                          <option value="Low">منخفضة</option>
                        </select>
                      </td>

                      {/* Adoption Status */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {sugg.isAdopted ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#059669',
                              fontSize: '12px',
                              fontWeight: 700,
                            }}
                          >
                            <CheckCircle2 size={14} />
                            متبنى
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>بانتظار التبني</span>
                        )}
                      </td>

                      {/* Action & Exclude Controls */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                          {!sugg.isAdopted && !readOnly ? (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleOpenAdopt(sugg)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: '#059669',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  cursor: isBusy ? 'not-allowed' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 1px 2px rgba(5,150,105,0.2)',
                                }}
                                title="تبني هذا المؤشر كإجراء تحسين في الخطة المدرسية"
                              >
                                <Target size={13} />
                                تبني الإجراء
                              </button>

                              {!sugg.isExcluded ? (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleExclude(sugg)}
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#FFFFFF',
                                    color: '#64748B',
                                    border: '1px solid #CBD5E1',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: isBusy ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                  title="استبعاد هذا المقترح من خطة العمل الحالية"
                                >
                                  <EyeOff size={12} color="#94A3B8" />
                                  <span>استبعاد</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleRestore(sugg)}
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#EFF6FF',
                                    color: '#1D4ED8',
                                    border: '1px solid #BFDBFE',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: isBusy ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                  title="استعادة هذا المقترح وإعادته للمقترحات النشطة"
                                >
                                  <RotateCcw size={12} color="#2563EB" />
                                  <span>استعادة</span>
                                </button>
                              )}
                            </>
                          ) : sugg.isAdopted && !readOnly && sugg.adoptedAreaId ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleUnadopt(sugg)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                backgroundColor: '#FEF2F2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: isBusy ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="إلغاء تبني هذا المؤشر وحذفه من إجراءات التحسين"
                            >
                              <Trash2 size={12} />
                              <span>{isUnadopting === sugg.resultId ? 'جارٍ الإلغاء...' : 'إلغاء التبني'}</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '11.5px', color: '#64748b' }}>—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adopt Suggestion Modal */}
      <AdoptSuggestionModal
        isOpen={isAdoptModalOpen}
        onClose={() => {
          setIsAdoptModalOpen(false);
          setSelectedSuggestion(null);
        }}
        suggestion={selectedSuggestion}
        onSuccess={(msg) => {
          onToast('success', msg);
          fetchSuggestions();
        }}
      />
    </div>
  );
};
