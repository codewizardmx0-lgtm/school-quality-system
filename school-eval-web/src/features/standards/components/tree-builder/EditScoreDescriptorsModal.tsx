/**
 * Component: EditScoreDescriptorsModal
 * نافذة تحرير واصفات سلم التقدير اللفظي (0 - 3) للمؤشر المختار (القرار 3: طلب تعديل صريح ومحكوم)
 */

import React, { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ScoreDescriptor, UpdateScoreDescriptorItem } from '../../api/standardsTypes';

interface EditScoreDescriptorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicatorCode: string;
  indicatorName: string;
  descriptors?: ScoreDescriptor[];
  onSave: (descriptors: UpdateScoreDescriptorItem[]) => Promise<unknown>;
}

const defaultLevelTemplates = [
  { scoreValue: 3, label: 'متحقق / مستوفٍ', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', range: '85% – 100%' },
  { scoreValue: 2, label: 'متحقق بدرجة متوسطة', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', range: '65% – 84%' },
  { scoreValue: 1, label: 'متحقق بدرجة ضعيفة', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', range: '40% – 64%' },
  { scoreValue: 0, label: 'غير متوفر', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', range: '0% – 39%' },
];

export const EditScoreDescriptorsModal: React.FC<EditScoreDescriptorsModalProps> = ({
  isOpen,
  onClose,
  indicatorCode,
  indicatorName,
  descriptors = [],
  onSave,
}) => {
  const [levelTexts, setLevelTexts] = useState<Record<number, string>>({
    3: '',
    2: '',
    1: '',
    0: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      void Promise.resolve().then(() => {
        const texts: Record<number, string> = { 3: '', 2: '', 1: '', 0: '' };
        descriptors.forEach((d) => {
          const val = d.scoreValue !== undefined ? d.scoreValue : d.scoreLevelId;
          if (val !== undefined && [0, 1, 2, 3].includes(val)) {
            texts[val] = d.description || '';
          }
        });
        setLevelTexts(texts);
        setError(null);
        setIsSubmitting(false);
      });
    }
  }, [isOpen, descriptors]);

  if (!isOpen) return null;

  const handleTextChange = (scoreValue: number, text: string) => {
    setLevelTexts((prev) => ({ ...prev, [scoreValue]: text }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload: UpdateScoreDescriptorItem[] = [3, 2, 1, 0].map((scoreValue) => {
      const existing = descriptors.find((d) => (d.scoreValue ?? d.scoreLevelId) === scoreValue);
      const template = defaultLevelTemplates.find((t) => t.scoreValue === scoreValue);
      return {
        score_level_id: existing?.scoreLevelId,
        score_value: scoreValue,
        label: existing?.label || template?.label || `المستوى ${scoreValue}`,
        description: (levelTexts[scoreValue] || '').trim(),
      };
    });

    try {
      await onSave(payload);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل تحديث واصفات سلم التقدير للمؤشر.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 25px 30px -5px rgba(0, 0, 0, 0.15)',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          textAlign: 'right',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#FFFBEB',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#B45309',
                    backgroundColor: '#FEF3C7',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  سلم التقدير اللفظي
                </span>
                <span style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>
                  {indicatorCode}
                </span>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '4px 0 0' }}>
                تعديل واصفات الحكم المعياري (المستويات 0 - 3)
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#64748B',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Indicator summary line */}
        <div style={{ flexShrink: 0, padding: '10px 24px', backgroundColor: '#F1F5F9', borderBottom: '1px solid #E2E8F0', fontSize: '12px', color: '#475569' }}>
          <span style={{ fontWeight: 700, color: '#1E293B' }}>المؤشر: </span>
          <span>{indicatorName}</span>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  fontSize: '13px',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {defaultLevelTemplates.map((lvl) => (
              <div
                key={lvl.scoreValue}
                style={{
                  borderRadius: '12px',
                  border: `1px solid ${lvl.border}`,
                  backgroundColor: '#FFFFFF',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: lvl.bg,
                    borderBottom: `1px solid ${lvl.border}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        backgroundColor: lvl.color,
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {lvl.scoreValue}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: lvl.color }}>
                      {lvl.label}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: lvl.color }}>
                    النطاق المستهدف: {lvl.range}
                  </span>
                </div>

                <div style={{ padding: '12px' }}>
                  <textarea
                    rows={4}
                    value={levelTexts[lvl.scoreValue] || ''}
                    onChange={(e) => handleTextChange(lvl.scoreValue, e.target.value)}
                    placeholder={`صياغة الأداء المطلوب لتحقيق المستوى (${lvl.scoreValue})...`}
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none',
                      lineHeight: 1.6,
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Sticky Footer Actions */}
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              padding: '16px 24px',
              borderTop: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="std-btn-secondary"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="std-btn-primary"
              style={{
                opacity: isSubmitting ? 0.6 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>حفظ واصفات سلم التقدير المعتمد ({defaultLevelTemplates.length} مستويات)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
