import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Target, AlertTriangle, Lightbulb, FolderCheck, Calendar, User, FileText } from 'lucide-react';
import { evaluatorApi } from '../../api/evaluatorApi';
import type {
  ImprovementSuggestion,
  AiInitiative,
  PriorityLevel,
  ImprovementPlanListItem,
} from '../../api/evaluationTypes';
import { getRecommendedPlanType } from '../../utils/planRecommendation';

interface AdoptSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion?: ImprovementSuggestion | null;
  initiative?: AiInitiative | null;
  onSuccess: (message: string) => void;
}

export const AdoptSuggestionModal: React.FC<AdoptSuggestionModalProps> = ({
  isOpen,
  onClose,
  suggestion,
  initiative,
  onSuccess,
}) => {
  // 7 Standard Action Fields
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [name, setName] = useState('');
  const [leader, setLeader] = useState('فريق التطوير والجودة المدرسية');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('High');
  const [description, setDescription] = useState('');
  const [targetScore, setTargetScore] = useState(3);

  const [plans, setPlans] = useState<ImprovementPlanListItem[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load available improvement plans
  useEffect(() => {
    if (isOpen) {
      void Promise.resolve().then(() => setIsLoadingPlans(true));
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

  const activeItem = suggestion || initiative;

  const recommendation = useMemo(() => {
    if (!activeItem) return null;
    return getRecommendedPlanType(activeItem);
  }, [activeItem]);

  // Pre-fill form fields
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const defaultDue = new Date();
    defaultDue.setMonth(defaultDue.getMonth() + 3);
    const defaultDueStr = defaultDue.toISOString().split('T')[0];

    void Promise.resolve().then(() => {
      if (suggestion) {
        setName(suggestion.suggestedName || `تحسين أداء: ${suggestion.indicatorName}`);
        setLeader('فريق التطوير والجودة المدرسية');
        setStartDate(today);
        setDueDate(defaultDueStr);
        setPriority(suggestion.suggestedPriority || 'High');
        setTargetScore(suggestion.targetScore || 3);
        setDescription(
          `إجراء تحسين مبني على نتائج التقييم الذاتي للمؤشر (${suggestion.indicatorCode}). الدرجة المرصودة (${suggestion.score}) والدرجة المستهدفة (${suggestion.targetScore}) بفجوة قدرها (${suggestion.gap}).`
        );
      } else if (initiative) {
        setName(initiative.humanModifications || initiative.title || '');
        setLeader('مسؤول الجودة والتطوير المدرسي');
        setStartDate(today);
        setDueDate(defaultDueStr);
        setPriority(initiative.priority || 'High');
        setTargetScore(3);
        setDescription(initiative.description || '');
      }
    });
  }, [suggestion, initiative]);

  // Auto-select recommended plan
  useEffect(() => {
    if (plans.length > 0 && recommendation) {
      void Promise.resolve().then(() => {
        const matchingActive = plans.find(
          (p) => p.planType === recommendation.type && (p.status === 'Active' || p.status === 'Draft')
        );
        if (matchingActive) {
          setSelectedPlanId(String(matchingActive.planId));
          return;
        }
        const anyActive = plans.find((p) => p.status === 'Active' || p.status === 'Draft');
        if (anyActive) {
          setSelectedPlanId(String(anyActive.planId));
          return;
        }
        setSelectedPlanId(String(plans[0].planId));
      });
    }
  }, [plans, recommendation]);

  if (!isOpen || !activeItem) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const planIdNum = selectedPlanId ? Number(selectedPlanId) : undefined;
      const targetPlanName = plans.find((p) => String(p.planId) === selectedPlanId)?.title;
      const targetText = targetPlanName ? ` في (${targetPlanName})` : '';

      if (suggestion) {
        await evaluatorApi.adoptSuggestion({
          resultId: suggestion.resultId,
          name,
          actionTitle: name,
          leader,
          startDate,
          dueDate,
          priority,
          targetScore,
          description,
          planId: planIdNum,
        });
        onSuccess(`تم تبني إجراء التحسين "${name}" بنجاح وإدراجه${targetText}.`);
      } else if (initiative) {
        await evaluatorApi.createImprovementAction({
          planId: planIdNum,
          title: name,
          leader,
          startDate,
          dueDate,
          status: 'InProgress',
          completionPercentage: 0,
          progressDescription: description,
          recommendationId: initiative.id,
        });
        try {
          await evaluatorApi.updateAiRecommendationStatus(initiative.id, 'Accepted');
        } catch {
          // ignore status update error if already accepted
        }
        onSuccess(`تم تبني المبادرة "${name}" بنجاح وإدراجها كإجراء تنفيذي${targetText}.`);
      }
      onClose();
    } catch (err) {
      console.error('Failed to adopt in unified modal:', err);
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
          maxWidth: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
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
                تبني مقترح وإدراجه في خطة التحسين المدرسي
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                تحويل المقترح الميداني إلى إجراء تنفيذي رسمي معتمد بالخطة المستهدفة
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

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowY: 'auto',
          }}
        >
          {/* Source Alert */}
          {suggestion && (
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
          )}

          {initiative && (
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
                مبادرة التحليل الذكي للتقييم: <strong>{initiative.title}</strong>
              </span>
            </div>
          )}

          {/* Institutional Recommendation Banner */}
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

          {/* Field 1: Target Plan Selector */}
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

          {/* Field 2: Action Title */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <FileText size={15} style={{ color: '#2563EB' }} />
              عنوان إجراء التحسين التنفيذي <span style={{ color: '#DC2626' }}>*</span>
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

          {/* Field 3: Responsible Person / Leader */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <User size={15} style={{ color: '#059669' }} />
              المسؤول عن التنفيذ والمتابعة <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              value={leader}
              onChange={(e) => setLeader(e.target.value)}
              required
              placeholder="مثال: أ. أحمد الزهراني — رئيس قسم الجودة"
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

          {/* Fields 4 & 5: Start Date and Due Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Calendar size={15} style={{ color: '#475569' }} />
                تاريخ بداية التنفيذ <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
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
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Calendar size={15} style={{ color: '#DC2626' }} />
                الموعد المستهدف للإنجاز <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
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
              />
            </div>
          </div>

          {/* Field 6 & Target Score / Priority */}
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

            {suggestion ? (
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
            ) : (
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  الحالة الابتدائية
                </label>
                <div
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#F8FAFC',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0284C7',
                  }}
                >
                  قيد التنفيذ (In Progress)
                </div>
              </div>
            )}
          </div>

          {/* Field 7: Description / Progress note */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              وصف ومبررات إجراء التحسين التنفيذي <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
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
                lineHeight: 1.5,
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
              <span>{isSubmitting ? 'جارِ الإدراج بالخطة...' : 'تبني وإدراج في الخطة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
