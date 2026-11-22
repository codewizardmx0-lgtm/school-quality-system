/**
 * Component: AddSupervisorMemoModal
 * نافذة تسجيل مذكرة إشرافية أو تقرير زيارة ميدانية أو مذكرة تصحيحية جديدة
 * متوافقة مع متطلبات FR-SUP-16 و NFR-INT-02 (سجل غير قابل للتعديل أو الحذف - Append-Only Audit Trail)
 */

import React, { useState } from 'react';
import {
  X,
  Loader2,
  Save,
  FileText,
  MapPin,
  PhoneCall,
  RotateCcw,
  Info,
  Layers,
  HelpCircle,
} from 'lucide-react';
import type { TrackingSelectorItem } from '../../api/supervisionTypes';

export type MemoTypeOption =
  | 'مذكرة إشرافية'
  | 'زيارة ميدانية'
  | 'اتصال هاتفي'
  | 'مذكرة تصحيحية / تعقيبية';

interface AddSupervisorMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memoData: {
    memoType: MemoTypeOption;
    subject: string;
    details: string;
    isVisibleToSchool: boolean;
    cycle_id?: number;
    submission_id?: number;
    completion_request_id?: number;
  }) => Promise<boolean>;
  isSubmitting?: boolean;
  availableCycles?: TrackingSelectorItem[];
  availableSubmissions?: TrackingSelectorItem[];
  availableCompletionRequests?: TrackingSelectorItem[];
}

export const AddSupervisorMemoModal: React.FC<AddSupervisorMemoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isSubmitting = false,
  availableCycles = [],
  availableSubmissions = [],
  availableCompletionRequests = [],
}) => {
  const [memoType, setMemoType] = useState<MemoTypeOption>('مذكرة إشرافية');
  const [subject, setSubject] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [isVisibleToSchool, setIsVisibleToSchool] = useState<boolean>(true);
  const [cycleId, setCycleId] = useState<string>('');
  const [submissionId, setSubmissionId] = useState<string>('');
  const [completionRequestId, setCompletionRequestId] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setValidationError('يرجى إدخال موضوع الإجراء الإشرافي أو الزيارة.');
      return;
    }
    if (!details.trim()) {
      setValidationError('يرجى تدوين تفاصيل وتوجيهات الإجراء الإشرافي.');
      return;
    }

    setValidationError(null);
    const success = await onSave({
      memoType,
      subject: subject.trim(),
      details: details.trim(),
      isVisibleToSchool,
      cycle_id: cycleId ? Number(cycleId) : undefined,
      submission_id: submissionId ? Number(submissionId) : undefined,
      completion_request_id: completionRequestId ? Number(completionRequestId) : undefined,
    });

    if (success) {
      // إعادة ضبط النموذج والإغلاق
      setSubject('');
      setDetails('');
      setMemoType('مذكرة إشرافية');
      setIsVisibleToSchool(true);
      setCycleId('');
      setSubmissionId('');
      setCompletionRequestId('');
      onClose();
    }
  };

  const memoOptions: Array<{
    type: MemoTypeOption;
    icon: React.ComponentType<{ size?: number; color?: string }>;
    label: string;
    description: string;
  }> = [
    {
      type: 'مذكرة إشرافية',
      icon: FileText,
      label: 'مذكرة إشرافية',
      description: 'توجيه مكتوب رسمي للمدرسة',
    },
    {
      type: 'زيارة ميدانية',
      icon: MapPin,
      label: 'زيارة ميدانية',
      description: 'معاينة واقعية لمقر المدرسة والشواهد',
    },
    {
      type: 'اتصال هاتفي',
      icon: PhoneCall,
      label: 'اتصال هاتفي',
      description: 'تواصل إداري أو توجيهي عاجل',
    },
    {
      type: 'مذكرة تصحيحية / تعقيبية',
      icon: RotateCcw,
      label: 'مذكرة تصحيحية',
      description: 'تعقيب على تدقيق سابق (سجل تراكمي)',
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 15, 25, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          direction: 'rtl',
        }}
      >
        {/* الترويسة */}
        <div
          style={{
            padding: '18px 24px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: memoType === 'مذكرة تصحيحية / تعقيبية' ? '#FEF2F2' : '#EFF6FF',
                color: memoType === 'مذكرة تصحيحية / تعقيبية' ? '#DC2626' : '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {memoType === 'مذكرة تصحيحية / تعقيبية' ? (
                <RotateCcw size={20} />
              ) : (
                <FileText size={20} />
              )}
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                توثيق إجراء إشرافي / زيارة ميدانية
              </h3>
              <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                توثيق رسمي محمي وفق حوكمة السجل التراكمي الميداني (FR-SUP-16)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* جسم النموذج القابل للتمرير */}
        <form
          onSubmit={handleFormSubmit}
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {validationError && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {validationError}
            </div>
          )}

          {/* تنبيه حوكمة الأثر التراكمي (Append-Only Audit Trail) */}
          {memoType === 'مذكرة تصحيحية / تعقيبية' ? (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <Info size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px', color: '#92400E', lineHeight: 1.5 }}>
                <strong style={{ display: 'block', marginBottom: '2px' }}>
                  حوكمة المذكرات التعقيبية والتصحيحية (NFR-INT-02):
                </strong>
                سجل المتابعة غير قابل للتعديل أو الحذف إطلاقاً. المذكرات السابقة تظل ثابتة للتاريخ
                الإشرافي، وأي تصحيح لتوجيه أو استدراك لقرار يتم عبر إلحاق هذه المذكرة بصفتها قيداً
                جديداً يرتبط بالواقعة المعنية.
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11.5px',
                color: '#64748B',
              }}
            >
              <HelpCircle size={15} color="#94A3B8" />
              <span>
                وفق معيار <strong>NFR-INT-02</strong>، كافة القيود في سجل المتابعة نهائية وموثقة زمنياً
                باسم المشرف وتاريخ التنفيذ.
              </span>
            </div>
          )}

          {/* 1. اختيار نوع الإجراء */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '8px',
              }}
            >
              نوع الإجراء الإشرافي <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
              }}
            >
              {memoOptions.map((item) => {
                const isSelected = memoType === item.type;
                const Icon = item.icon;
                const isCorrective = item.type === 'مذكرة تصحيحية / تعقيبية';

                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setMemoType(item.type)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: '6px',
                      padding: '10px 8px',
                      borderRadius: '10px',
                      border: isSelected
                        ? isCorrective
                          ? '2px solid #DC2626'
                          : '2px solid #2563EB'
                        : '1px solid #CBD5E1',
                      backgroundColor: isSelected
                        ? isCorrective
                          ? '#FEF2F2'
                          : '#EFF6FF'
                        : '#FFFFFF',
                      color: isSelected
                        ? isCorrective
                          ? '#B91C1C'
                          : '#1D4ED8'
                        : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.04)' : 'none',
                    }}
                  >
                    <Icon size={18} />
                    <span style={{ fontSize: '12px', fontWeight: 800 }}>{item.label}</span>
                    <span style={{ fontSize: '10px', color: '#64748B', lineHeight: 1.2 }}>
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. الموضوع */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              موضوع الإجراء / المذكرة <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="مثال: زيارة توجيهية لفحص أدلة مؤشر القيادة والتحسين..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                color: '#0F172A',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          {/* 3. سياق الربط الاختياري (FR-SUP-16): الدورة / محاولة التسليم / طلب الاستكمال */}
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Layers size={14} color="#2563EB" />
              <span>ربط المذكرة بسياق إشرافي محدد (اختياري - يعزز دقة التوثيق):</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '12px',
              }}
            >
              {/* ربط بالدورة التقييمية */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#64748B',
                    marginBottom: '4px',
                  }}
                >
                  الدورة التقييمية:
                </label>
                <select
                  value={cycleId}
                  onChange={(e) => setCycleId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="">(عام لكافة الدورات)</option>
                  {availableCycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* ربط بمحاولة التسليم */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#64748B',
                    marginBottom: '4px',
                  }}
                >
                  محاولة التسليم:
                </label>
                <select
                  value={submissionId}
                  onChange={(e) => setSubmissionId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="">(غير مرتبط بمحاولة محددة)</option>
                  {availableSubmissions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* ربط بطلب الاستكمال */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#64748B',
                    marginBottom: '4px',
                  }}
                >
                  طلب الاستكمال:
                </label>
                <select
                  value={completionRequestId}
                  onChange={(e) => setCompletionRequestId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="">(غير مرتبط بطلب استكمال)</option>
                  {availableCompletionRequests.map((cr) => (
                    <option key={cr.id} value={cr.id}>
                      {cr.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 4. تفاصيل المذكرة / التوجيهات */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              نص التوجيهات أو وقائع الزيارة الميدانية <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              rows={5}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="اكتب التوجيهات الميدانية بدقة، والملاحظات التي تم رصدها، والخطوات الإجرائية المطلوبة من المدرسة..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                color: '#0F172A',
                boxSizing: 'border-box',
                outline: 'none',
                resize: 'vertical',
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* 5. خيار إتاحة الرؤية لإدارة المدرسة */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#0F172A',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={isVisibleToSchool}
                onChange={(e) => setIsVisibleToSchool(e.target.checked)}
                style={{ width: '17px', height: '17px', accentColor: '#2563EB' }}
              />
              <span>إظهار المذكرة في سجل المدرسة (اطلاع إدارة المدرسة وفريق الجودة)</span>
            </label>
            <span
              style={{
                fontSize: '11px',
                color: '#64748B',
                display: 'block',
                marginRight: '27px',
                marginTop: '4px',
              }}
            >
              عند إلغاء التحديد، تُحفظ المذكرة كتدوين إشرافي داخلي للمشرفين والوزارة فقط دون إظهارها
              في بوابة المدرسة.
            </span>
          </div>

          {/* أزرار الإجراءات */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #E2E8F0',
              marginTop: '4px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#64748B',
                backgroundColor: '#F1F5F9',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 22px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#FFFFFF',
                backgroundColor: isSubmitting
                  ? '#93C5FD'
                  : memoType === 'مذكرة تصحيحية / تعقيبية'
                  ? '#DC2626'
                  : '#2563EB',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جاري التوثيق في السجل...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>توثيق الإجراء في السجل</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
