import React, { useState, useEffect } from 'react';
import type { PlanType, ImprovementAreaBrief, CreateImprovementPlanPayload } from '../../api/evaluationTypes';
import { FolderPlus, X, Check, Target, Calendar } from 'lucide-react';

interface AddPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableAreas?: ImprovementAreaBrief[];
  defaultPlanType?: PlanType;
  onCreatePlan: (payload: CreateImprovementPlanPayload) => Promise<any>;
  isSubmitting?: boolean;
}

export const AddPlanModal: React.FC<AddPlanModalProps> = ({
  isOpen,
  onClose,
  availableAreas = [],
  defaultPlanType = 'QualityImprovement',
  onCreatePlan,
  isSubmitting = false,
}) => {
  const [title, setTitle] = useState('');
  const [planType, setPlanType] = useState<PlanType>(defaultPlanType);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  });
  const [selectedAreaIds, setSelectedAreaIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const defaultTitles: Record<PlanType, string> = {
    QualityImprovement: 'خطة تحسين الجودة المدرسية الشاملة 2026/2027',
    StaffProfessionalDevelopment: 'خطة التطوير المهني والتربوي للكوادر التعليمية',
    AnnualOperational: 'الخطة التشغيلية السنوية للأنشطة والبرامج المدرسية',
  };

  useEffect(() => {
    if (isOpen) {
      setPlanType(defaultPlanType);
      setTitle(defaultTitles[defaultPlanType]);
      setStartDate(new Date().toISOString().split('T')[0]);
      const d = new Date();
      d.setMonth(d.getMonth() + 6);
      setEndDate(d.toISOString().split('T')[0]);
      setSelectedAreaIds(availableAreas.map((a) => a.areaId));
      setError(null);
    }
  }, [isOpen, defaultPlanType, availableAreas]);

  if (!isOpen) return null;

  const handlePlanTypeChange = (newType: PlanType) => {
    setPlanType(newType);
    if (!title || Object.values(defaultTitles).includes(title)) {
      setTitle(defaultTitles[newType]);
    }
  };

  const toggleArea = (areaId: number) => {
    setSelectedAreaIds((prev) =>
      prev.includes(areaId) ? prev.filter((id) => id !== areaId) : [...prev, areaId]
    );
  };

  const handleSelectAllAreas = () => {
    if (selectedAreaIds.length === availableAreas.length) {
      setSelectedAreaIds([]);
    } else {
      setSelectedAreaIds(availableAreas.map((a) => a.areaId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('يرجى إدخال عنوان خطة التحسين.');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('تاريخ نهاية الخطة يجب أن يكون مساوياً أو لاحقاً لتاريخ البداية.');
      return;
    }

    try {
      setError(null);
      await onCreatePlan({
        planType,
        title: title.trim(),
        startDate,
        endDate,
        areaIds: selectedAreaIds,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'تعذر إنشاء خطة التحسين. يرجى التحقق من المدخلات.');
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
        zIndex: 50,
        padding: '16px',
        direction: 'rtl',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderPlus size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                إنشاء خطة تحسين وتطوير جديدة
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                إعداد مسار خطة معيارية وربطها بمجالات التطوير للمدرسة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#B91C1C',
                fontSize: '12.5px',
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          {/* Plan Type Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              نوع الخطة المدرسية <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
              {(
                [
                  { id: 'QualityImprovement', label: 'تحسين الجودة', desc: 'معالجة الفجوات' },
                  { id: 'StaffProfessionalDevelopment', label: 'التطوير المهني', desc: 'تأهيل الكوادر' },
                  { id: 'AnnualOperational', label: 'الخطة التشغيلية', desc: 'البرامج السنوية' },
                ] as const
              ).map((t) => {
                const isSelected = planType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handlePlanTypeChange(t.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #2563EB' : '1px solid #CBD5E1',
                      backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                      color: isSelected ? '#1D4ED8' : '#475569',
                      fontSize: '12.5px',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      textAlign: 'right',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <span>{t.label}</span>
                    <span style={{ fontSize: '11px', color: isSelected ? '#2563EB' : '#94A3B8', fontWeight: 500 }}>
                      {t.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Plan Title */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              عنوان الخطة <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="أدخل عنواناً واضحاً ومعبراً للخطة..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                <Calendar size={14} color="#64748B" />
                <span>تاريخ بداية الخطة</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                <Calendar size={14} color="#64748B" />
                <span>تاريخ نهاية الخطة</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Associated Improvement Areas */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={15} color="#059669" />
                <span>مجالات التحسين المرتبطة ({selectedAreaIds.length} من {availableAreas.length})</span>
              </label>
              {availableAreas.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllAreas}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {selectedAreaIds.length === availableAreas.length ? 'إلغاء تحديد الكل' : 'تحديد كل المجالات'}
                </button>
              )}
            </div>

            {availableAreas.length === 0 ? (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#F8FAFC',
                  border: '1px dashed #CBD5E1',
                  fontSize: '12px',
                  color: '#64748B',
                }}
              >
                لا توجد مجالات تحسين مرصودة بعد؛ سيتم ربط مجالات عامة تلقائياً أو يمكنك رصد نتائج المؤشرات أولاً.
              </div>
            ) : (
              <div
                style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  backgroundColor: '#F8FAFC',
                }}
              >
                {availableAreas.map((area) => {
                  const isChecked = selectedAreaIds.includes(area.areaId);
                  return (
                    <label
                      key={area.areaId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: isChecked ? '#EFF6FF' : '#FFFFFF',
                        border: isChecked ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                        cursor: 'pointer',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: isChecked ? '#1E3A8A' : '#334155',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleArea(area.areaId)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{area.name}</span>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor:
                            area.priority === 'High'
                              ? '#FEE2E2'
                              : area.priority === 'Medium'
                              ? '#FEF3C7'
                              : '#E0E7FF',
                          color:
                            area.priority === 'High'
                              ? '#991B1B'
                              : area.priority === 'Medium'
                              ? '#92400E'
                              : '#3730A3',
                          fontWeight: 700,
                        }}
                      >
                        أولوية {area.priority === 'High' ? 'عالية' : area.priority === 'Medium' ? 'متوسطة' : 'عادية'}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
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
                padding: '9px 22px',
                borderRadius: '8px',
                backgroundColor: '#1D4ED8',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(29, 78, 216, 0.25)',
              }}
            >
              <Check size={16} />
              <span>{isSubmitting ? 'جاري الإنشاء...' : 'حفظ وإنشاء الخطة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
