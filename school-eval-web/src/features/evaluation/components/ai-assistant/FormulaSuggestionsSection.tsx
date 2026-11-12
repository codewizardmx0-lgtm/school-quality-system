import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, ArrowRight, RefreshCw, Trash2, Search, ArrowUpDown } from 'lucide-react';
import { evaluatorApi } from '../../api/evaluatorApi';
import type { ImprovementSuggestion } from '../../api/evaluationTypes';
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
  const [targetScore, setTargetScore] = useState<2 | 3>(3);
  const [customTargetScores, setCustomTargetScores] = useState<Record<number, number>>({});
  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'medium' | 'adopted'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [standardFilter, setStandardFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'gap_desc' | 'gap_asc' | 'code' | 'priority'>('gap_desc');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ImprovementSuggestion | null>(null);
  const [isAdoptModalOpen, setIsAdoptModalOpen] = useState(false);

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

  const handleToggleTargetScore = (newScore: 2 | 3) => {
    if (newScore === targetScore) return;
    const confirmed = window.confirm(
      'تغيير التقدير المستهدف الجماعي سيؤدي إلى إعادة احتساب كافة فجوات المؤشرات وفق المستهدف الجديد. هل تريد الاستمرار؟'
    );
    if (!confirmed) return;
    setCustomTargetScores({});
    setTargetScore(newScore);
  };

  const totalCount = suggestions.length;
  const highCount = suggestions.filter((s) => s.suggestedPriority === 'High').length;
  const medCount = suggestions.filter((s) => s.suggestedPriority === 'Medium').length;
  const adoptedCount = suggestions.filter((s) => s.isAdopted).length;

  const standardsList = Array.from(new Set(suggestions.map((s) => s.standardName).filter(Boolean)));

  const filteredSuggestions = suggestions
    .filter((s) => {
      if (activeFilter === 'high') return s.suggestedPriority === 'High';
      if (activeFilter === 'medium') return s.suggestedPriority === 'Medium';
      if (activeFilter === 'adopted') return s.isAdopted;
      return true;
    })
    .filter((s) => {
      if (standardFilter !== 'all' && s.standardName !== standardFilter) return false;
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
      if (sortBy === 'gap_desc') return bGap - aGap;
      if (sortBy === 'gap_asc') return aGap - bGap;
      if (sortBy === 'code') return (a.indicatorCode || '').localeCompare(b.indicatorCode || '');
      if (sortBy === 'priority') {
        const pOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
        return (pOrder[b.suggestedPriority] || 0) - (pOrder[a.suggestedPriority] || 0);
      }
      return 0;
    });

  const [isUnadopting, setIsUnadopting] = useState<number | null>(null);

  const handleUnadopt = async (sugg: ImprovementSuggestion) => {
    if (readOnly) return;
    if (!sugg.adoptedAreaId) {
      onToast('error', 'تعذر تحديد معرف مجال التحسين المتبنى.');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من إلغاء تبني مؤشر «${sugg.indicatorName}» وحذفه من مجالات التحسين؟`)) {
      return;
    }
    setIsUnadopting(sugg.resultId);
    try {
      await evaluatorApi.deleteImprovementArea(sugg.adoptedAreaId);
      onToast('success', 'تم إلغاء تبني المقترح وحذفه من مجالات التحسين بنجاح.');
      await fetchSuggestions(targetScore);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'تعذر إلغاء تبني مجال التحسين.';
      onToast('error', errMsg);
    } finally {
      setIsUnadopting(null);
    }
  };

  const handleOpenAdopt = (sugg: ImprovementSuggestion) => {
    if (readOnly) return;
    const target = customTargetScores[sugg.resultId] ?? sugg.targetScore;
    const gap = Math.max(0, target - sugg.score);
    setSelectedSuggestion({
      ...sugg,
      targetScore: target,
      gap,
    });
    setIsAdoptModalOpen(true);
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
          <span style={{ color: '#1e293b' }}>تبني المؤشر كمجال تحسين</span>
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
            اقتراحات مجالات التحسين وتبني المبادرات (FR-SCH-16)
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
            يقوم النظام بحساب الفجوة تلقائيًا للمؤشرات المرصودة بتقدير أقل من المستهدف (المستهدف العام = {targetScore}) ويتيح تعديل المستهدف لكل مؤشر وتبنيها مباشرة كإجراءات في خطة التحسين المدرسية.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* مفتاح تبديل التقدير المستهدف الجماعي (مع تحذير تأكيدي) */}
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

      {/* Interactive KPI Filter Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
        }}
      >
        <div
          onClick={() => setActiveFilter('all')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: activeFilter === 'all' ? '2px solid #2563eb' : '1px solid #e2e8f0',
            textAlign: 'center',
            cursor: 'pointer',
            boxShadow: activeFilter === 'all' ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>إجمالي الاقتراحات ({activeFilter === 'all' ? 'محدد' : 'عرض الكل'})</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>
            {totalCount}
          </div>
        </div>

        <div
          onClick={() => setActiveFilter('high')}
          style={{
            backgroundColor: '#fff1f2',
            borderRadius: '12px',
            padding: '16px',
            border: activeFilter === 'high' ? '2px solid #e11d48' : '1px solid #fecdd3',
            textAlign: 'center',
            cursor: 'pointer',
            boxShadow: activeFilter === 'high' ? '0 0 0 3px rgba(225,29,72,0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '12px', color: '#e11d48', fontWeight: 600 }}>أولوية عالية (تقدير 0 - 1)</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#be123c', marginTop: '4px' }}>
            {highCount}
          </div>
        </div>

        <div
          onClick={() => setActiveFilter('medium')}
          style={{
            backgroundColor: '#fffbeb',
            borderRadius: '12px',
            padding: '16px',
            border: activeFilter === 'medium' ? '2px solid #d97706' : '1px solid #fde68a',
            textAlign: 'center',
            cursor: 'pointer',
            boxShadow: activeFilter === 'medium' ? '0 0 0 3px rgba(217,119,6,0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>أولوية متوسطة (تقدير 2)</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#92400e', marginTop: '4px' }}>
            {medCount}
          </div>
        </div>

        <div
          onClick={() => setActiveFilter('adopted')}
          style={{
            backgroundColor: '#ecfdf5',
            borderRadius: '12px',
            padding: '16px',
            border: activeFilter === 'adopted' ? '2px solid #059669' : '1px solid #a7f3d0',
            textAlign: 'center',
            cursor: 'pointer',
            boxShadow: activeFilter === 'adopted' ? '0 0 0 3px rgba(5,150,105,0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>تم تبنيها مسبقاً</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#065f46', marginTop: '4px' }}>
            {adoptedCount}
          </div>
        </div>
      </div>

      {/* Search, Filter & Sort Controls */}
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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
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
            <option value="priority">الأولوية المقترحة</option>
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
          <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'right' }}>
                <th style={{ padding: '12px 14px', width: '130px' }}>المعيار الرئيسي</th>
                <th style={{ padding: '12px 14px', width: '90px' }}>كود المؤشر</th>
                <th style={{ padding: '12px 14px' }}>اسم المؤشر المعياري</th>
                <th style={{ padding: '12px 14px', width: '80px', textAlign: 'center' }}>الدرجة</th>
                <th style={{ padding: '12px 14px', width: '80px', textAlign: 'center' }}>المستهدف</th>
                <th style={{ padding: '12px 14px', width: '70px', textAlign: 'center' }}>الفجوة</th>
                <th style={{ padding: '12px 14px', width: '110px', textAlign: 'center' }}>الأولوية</th>
                <th style={{ padding: '12px 14px', width: '100px', textAlign: 'center' }}>حالة التبني</th>
                <th style={{ padding: '12px 14px', width: '130px', textAlign: 'center' }}>الإجراء</th>
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
                      : 'لا توجد مقترحات تطابق خيار التصفية المحدد.'}
                  </td>
                </tr>
              ) : (
                filteredSuggestions.map((sugg) => {
                  const effectiveTarget = customTargetScores[sugg.resultId] ?? sugg.targetScore;
                  const effectiveGap = Math.max(0, effectiveTarget - sugg.score);
                  return (
                    <tr
                      key={sugg.resultId}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: sugg.isAdopted ? '#fcfdfd' : '#ffffff',
                      }}
                    >
                      <td style={{ padding: '12px 14px', color: '#475569', fontSize: '12.5px', fontWeight: 700 }}>
                        {sugg.standardName || 'المعايير الوطنية'}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#2563eb' }}>
                        {sugg.indicatorCode}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{sugg.indicatorName}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          المجال المقترح: {sugg.suggestedName}
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
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            backgroundColor: sugg.suggestedPriority === 'High' ? '#fef2f2' : '#fffbeb',
                            color: sugg.suggestedPriority === 'High' ? '#dc2626' : '#d97706',
                            border: `1px solid ${sugg.suggestedPriority === 'High' ? '#fecaca' : '#fde68a'}`,
                          }}
                        >
                          {sugg.priorityLabel}
                        </span>
                      </td>
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
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {!sugg.isAdopted && !readOnly ? (
                          <button
                            type="button"
                            onClick={() => handleOpenAdopt(sugg)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              backgroundColor: '#059669',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Target size={13} />
                            تبني المقترح
                          </button>
                        ) : sugg.isAdopted && !readOnly && sugg.adoptedAreaId ? (
                          <button
                            type="button"
                            disabled={isUnadopting === sugg.resultId}
                            onClick={() => handleUnadopt(sugg)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: isUnadopting === sugg.resultId ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="إلغاء تبني هذا المؤشر وحذفه من مجالات التحسين"
                          >
                            <Trash2 size={12} />
                            <span>{isUnadopting === sugg.resultId ? 'جارٍ الإلغاء...' : 'إلغاء التبني'}</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '11.5px', color: '#64748b' }}>—</span>
                        )}
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
