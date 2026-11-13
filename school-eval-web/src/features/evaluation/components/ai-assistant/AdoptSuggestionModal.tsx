import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Target, AlertTriangle, Lightbulb, FolderCheck } from 'lucide-react';
import { evaluatorApi } from '../../api/evaluatorApi';
import type { ImprovementSuggestion, PriorityLevel, ImprovementPlanListItem, PlanType } from '../../api/evaluationTypes';

interface AdoptSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: ImprovementSuggestion | null;
  onSuccess: (message: string) => void;
}

export const getRecommendedPlanType = (
  suggestion: ImprovementSuggestion
): { type: PlanType; label: string; reason: string } => {
  const code = (suggestion.standardCode || suggestion.indicatorCode || '').toUpperCase();
  const name = (suggestion.standardName || suggestion.indicatorName || '').toLowerCase();

  if (
    code.includes('STD-02') ||
    name.includes('معلم') ||
    name.includes('تدريب') ||
    name.includes('مهني') ||
    name.includes('كوادر') ||
    name.includes('تأهيل') ||
    name.includes('تدريسي')
  ) {
    return {
      type: 'StaffProfessionalDevelopment',
      label: 'خطة التطوير المهني والتربوي للكوادر',
      reason: 'يرتبط هذا المؤشر بالمعيار الثاني (تنمية الكفايات والتطوير المهني المستمر للكوادر التعليمية والإدارية)',
    };
  }

  if (
    name.includes('تشغيل') ||
    name.includes('سنوي') ||
    name.includes('مبنى') ||
    name.includes('مرافق') ||
    name.includes('تجهيزات') ||
    name.includes('أمن') ||
    name.includes('سلامة') ||
    name.includes('صيانة')
  ) {
    return {
      type: 'AnnualOperational',
      label: 'الخطة التشغيلية السنوية للمدرسة',
      reason: 'يرتبط هذا المؤشر بالعمليات والموارد التشغيلية والبيئة المادية للمدرسة',
    };
  }

  return {
    type: 'QualityImprovement',
    label: 'خطة تحسين الجودة المدرسية الشاملة',
    reason: 'يرتبط هذا المؤشر بمعايير نواتج التعليم والتعلم والفاعلية المؤسسية العامة',
  };
};

export const AdoptSuggestionModal: React.FC<AdoptSuggestionModalProps> = ({
  isOpen,
  onClose,
  suggestion,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('High');
  const [targetScore, setTargetScore] = useState(3);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [plans, setPlans] = useState<ImprovementPlanListItem[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // تحميل قائمة الخطط المتاحة للمدرسة
  useEffect(() => {
    if (isOpen) {
      setIsLoadingPlans(true);
      evaluatorApi
        .getSchoolImprovementPlans()
        .then((list) => {
          setPlans(list);
        })
        .catch((err) => {
          console.error('Failed to load plans in adopt modal:', err);
        })
        .finally(() => {
          setIsLoadingPlans(false);
        });
    }
  }, [isOpen]);

  const recommendation = useMemo(() => {
    if (!suggestion) return null;
    return getRecommendedPlanType(suggestion);
  }, [suggestion]);

  useEffect(() => {
    if (suggestion) {
      setName(suggestion.suggestedName || `تحسين أداء: ${suggestion.indicatorName}`);
      setDescription(
        `إجراء تحسين مبني على نتائج التقييم الذاتي للمؤشر (${suggestion.indicatorCode}). الدرجة المرصودة (${suggestion.score}) والدرجة المستهدفة (${suggestion.targetScore}) بفجوة قدرها (${suggestion.gap}).`
      );
      setPriority(suggestion.suggestedPriority || 'High');
      setTargetScore(suggestion.targetScore || 3);
    }
  }, [suggestion]);

  // تحديد الخطة المستهدفة تلقائياً بناءً على التوصية الذكية
  useEffect(() => {
    if (plans.length > 0 && recommendation) {
      // 1. البحث عن خطة نشطة تطابق النوع الموصى به
      const matchingActive = plans.find(
        (p) => p.planType === recommendation.type && (p.status === 'Active' || p.status === 'Draft')
      );
      if (matchingActive) {
        setSelectedPlanId(String(matchingActive.planId));
        return;
      }
      // 2. البحث عن أي خطة نشطة أخرى
      const anyActive = plans.find((p) => p.status === 'Active' || p.status === 'Draft');
      if (anyActive) {
        setSelectedPlanId(String(anyActive.planId));
        return;
      }
      // 3. التراجع لأول خطة في القائمة
      setSelectedPlanId(String(plans[0].planId));
    }
  }, [plans, recommendation]);

  if (!isOpen || !suggestion) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await evaluatorApi.adoptSuggestion({
        resultId: suggestion.resultId,
        name,
        description,
        priority,
        targetScore,
        planId: selectedPlanId ? Number(selectedPlanId) : undefined,
      });
      const targetPlanName = plans.find((p) => String(p.planId) === selectedPlanId)?.title;
      const targetText = targetPlanName ? ` في (${targetPlanName})` : '';
      onSuccess(`تم تبني إجراء التحسين "${name}" بنجاح وإدراجه${targetText}.`);
      onClose();
    } catch (err) {
      console.error('Failed to adopt suggestion:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '620px',
          boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
          direction: 'rtl',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
              }}
            >
              <Target size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>
                تبني مقترح إجراء التحسين (FR-SCH-16)
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                تحويل الفجوة المرصودة بالمؤشر إلى إجراء تحسين مدرسي معتمد وربطه بالخطة المستهدفة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Indicator Info Alert */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#eff6ff',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              fontSize: '12.5px',
              color: '#1e40af',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={16} color="#2563eb" style={{ flexShrink: 0 }} />
            <span>
              المؤشر: <strong>{suggestion.indicatorCode}</strong> — الدرجة الحالية: <strong>{suggestion.score}</strong> | الفجوة: <strong>{suggestion.gap}</strong> درجات
            </span>
          </div>

          {/* Institutional Soft Recommendation Banner */}
          {recommendation && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#FFFBEB',
                borderRadius: '10px',
                border: '1px solid #FDE68A',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
              }}
            >
              <Lightbulb size={18} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px', color: '#92400E', lineHeight: '1.5' }}>
                <strong style={{ color: '#78350F' }}>توجيه نظام الجودة والاعتماد: </strong>
                {recommendation.reason}. يُفضل إدراج هذا الإجراء ضمن <strong>{recommendation.label}</strong>.
              </div>
            </div>
          )}

          {/* Target Plan Selector */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <FolderCheck size={16} style={{ color: '#059669' }} />
              الخطة المستهدفة لاستيعاب الإجراء <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              required
              disabled={isLoadingPlans || plans.length === 0}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
                color: '#0F172A',
                fontWeight: 600,
              }}
            >
              {plans.length === 0 ? (
                <option value="">{isLoadingPlans ? 'جاري تحميل الخطط...' : 'الخطة النشطة الافتراضية'}</option>
              ) : (
                plans.map((p) => {
                  const isRec = recommendation && p.planType === recommendation.type;
                  return (
                    <option key={p.planId} value={p.planId}>
                      {p.title} ({p.planTypeLabel}) — {p.statusArabic} {isRec ? '★ [الموصى بها]' : ''}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              عنوان إجراء التحسين <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                الأولوية المقترحة
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                }}
              >
                <option value="High">عالية (High)</option>
                <option value="Medium">متوسطة (Medium)</option>
                <option value="Low">منخفضة (Low)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                التقدير المستهدف
              </label>
              <select
                value={targetScore}
                onChange={(e) => setTargetScore(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                }}
              >
                <option value={3}>المستوى 3 (متحقق كلياً / التميز)</option>
                <option value={2}>المستوى 2 (متحقق بدرجة متوسطة)</option>
                <option value={1}>المستوى 1 (مقبول / الحد الأدنى)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              وصف ومبررات إجراء التحسين
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Footer Controls */}
          <div
            style={{
              paddingTop: '12px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 20px',
                borderRadius: '8px',
                backgroundColor: '#059669',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
              }}
            >
              <Check size={16} />
              <span>{isSubmitting ? 'جارِ الحفظ...' : 'تأكيد تبني المقترح'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
