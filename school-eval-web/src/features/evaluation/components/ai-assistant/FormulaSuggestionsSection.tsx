import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ImprovementSuggestion | null>(null);
  const [isAdoptModalOpen, setIsAdoptModalOpen] = useState(false);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      const data = await evaluatorApi.getImprovementSuggestions();
      setSuggestions(data);
    } catch (err) {
      console.error('Failed to load improvement suggestions:', err);
      onToast('error', 'تعذر تحميل مقترحات التحسين الحسابية.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const totalCount = suggestions.length;
  const highCount = suggestions.filter((s) => s.suggestedPriority === 'High').length;
  const medCount = suggestions.filter((s) => s.suggestedPriority === 'Medium').length;
  const adoptedCount = suggestions.filter((s) => s.isAdopted).length;

  const handleOpenAdopt = (sugg: ImprovementSuggestion) => {
    if (readOnly) return;
    setSelectedSuggestion(sugg);
    setIsAdoptModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', direction: 'rtl' }}>
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
            اقتراحات مجالات التحسين المبنية على نتائج التقييم (FR-SCH-16)
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
            يقوم النظام بحساب الفجوة تلقائيًا للمؤشرات المرصودة بتقدير أقل من المستهدف (المستهدف = 3) وتصنيف الأولويات.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={fetchSuggestions}
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

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>إجمالي الاقتراحات المرصودة</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>
            {totalCount}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fff1f2',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #fecdd3',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '12px', color: '#e11d48', fontWeight: 600 }}>أولوية عالية (تقدير 0 - 1)</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#be123c', marginTop: '4px' }}>
            {highCount}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fffbeb',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #fde68a',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>أولوية متوسطة (تقدير 2)</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#92400e', marginTop: '4px' }}>
            {medCount}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ecfdf5',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #a7f3d0',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>تم تبنيها مسبقاً</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#065f46', marginTop: '4px' }}>
            {adoptedCount}
          </div>
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
                <th style={{ padding: '12px 14px', width: '100px' }}>كود المؤشر</th>
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
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    جارِ احتساب مقترحات الفجوات المعيارية...
                  </td>
                </tr>
              ) : suggestions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#059669', fontWeight: 600 }}>
                    ممتاز! كافة المؤشرات المرصودة حققت التقدير المستهدف ولا توجد فجوات حالياً.
                  </td>
                </tr>
              ) : (
                suggestions.map((sugg) => (
                  <tr
                    key={sugg.resultId}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: sugg.isAdopted ? '#fcfdfd' : '#ffffff',
                    }}
                  >
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
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600, color: '#16a34a' }}>
                      {sugg.targetScore}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#d97706' }}>
                      -{sugg.gap}
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
                      ) : (
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
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
