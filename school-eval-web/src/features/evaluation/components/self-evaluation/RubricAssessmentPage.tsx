import React, { useState, useEffect } from 'react';
import { useSelfEvaluation } from '../../hooks/useSelfEvaluation';
import { EvidenceUploader } from './EvidenceUploader';
import { EvaluatorJustification } from './EvaluatorJustification';
import { useEvidences } from '../../hooks/useEvidences';
import type { EvaluatorScreen } from '../../api/evaluationTypes';
import {
  CheckCircle2,
  Save,
  Lock,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

interface RubricAssessmentPageProps {
  selectedIndicatorId?: number | null;
  onNavigate?: (screen: EvaluatorScreen, param?: number) => void;
  isLocked?: boolean;
}

export const RubricAssessmentPage: React.FC<RubricAssessmentPageProps> = ({
  selectedIndicatorId,
  isLocked = false,
}) => {
  const {
    selectedIndicatorId: activeId,
    setSelectedIndicatorId,
    currentIndicatorInfo,
    currentResult,
    isSaving,
    saveSuccessMessage,
    saveRubricAssessment,
    goToPreviousIndicator,
    goToNextIndicator,
    hasPrevious,
    hasNext,
  } = useSelfEvaluation(selectedIndicatorId || undefined);

  const { uploadEvidenceFile, isUploading, uploadProgress } = useEvidences();

  // Local form state
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [justification, setJustification] = useState<string>('');
  const [selectedVerificationMethods, setSelectedVerificationMethods] = useState<number[]>([]);

  useEffect(() => {
    if (selectedIndicatorId && selectedIndicatorId !== activeId) {
      setSelectedIndicatorId(selectedIndicatorId);
    }
  }, [selectedIndicatorId, activeId, setSelectedIndicatorId]);

  useEffect(() => {
    if (currentResult) {
      setSelectedScore(currentResult.score);
      setJustification(currentResult.justification || '');
      setSelectedVerificationMethods(currentResult.verificationMethods || []);
    }
  }, [currentResult]);

  const indicator = currentIndicatorInfo?.indicator;
  const standard = currentIndicatorInfo?.standard;

  // Rubric levels specification
  const rubricLevels = [
    {
      level: 0,
      title: 'غير متحقق',
      description: 'لم تنفذ المدرسة أياً من متطلبات التقييم ولا تتوفر أدلة أو ممارسات ميدانية موثقة.',
      badgeColor: '#EF4444',
      badgeBg: '#FEF2F2',
      borderActive: '#DC2626',
    },
    {
      level: 1,
      title: 'متحقق بدرجة ضعيفة',
      description: 'أداءات متفرقة وتحتاج استكمالاً وتفتقر للمنهجية النظامية أو الشواهد الداعمة.',
      badgeColor: '#F59E0B',
      badgeBg: '#FFFBEB',
      borderActive: '#D97706',
    },
    {
      level: 2,
      title: 'متحقق بدرجة متوسطة',
      description: 'متحقق بفاعلية متوسطة مع وجود خطة تحسين معتمدة ومتابعة دورية للتنفيذ.',
      badgeColor: '#10B981',
      badgeBg: '#ECFDF5',
      borderActive: '#059669',
    },
    {
      level: 3,
      title: 'متحقق كلياً ومستمر',
      description: 'المستوى المطلوب متحقق باستمرار بجودة عالية مع تقارير دورية ونتائج استثنائية.',
      badgeColor: '#059669',
      badgeBg: '#D1FAE5',
      borderActive: '#047857',
    },
  ];

  // Official verification methods
  const officialMethods = [
    { id: 1, name: 'فحص الوثائق والسجلات المدرسية' },
    { id: 2, name: 'بطاقة ملاحظة صفية وميدانية' },
    { id: 3, name: 'مقابلة المعلمين والطلبة وأولياء الأمور' },
    { id: 4, name: 'استبانة قياس رضا المستفيدين وتحليل الاستجابات' },
  ];

  const handleScoreSelect = (level: number) => {
    if (isLocked) return;
    setSelectedScore(level);
    // Instant save according to zero dead button guideline
    saveRubricAssessment({
      score: level,
      justification,
      verificationMethods: selectedVerificationMethods,
      completionStatus: 'Completed',
    });
  };

  const handleToggleVerificationMethod = (methodId: number) => {
    if (isLocked) return;
    const next = selectedVerificationMethods.includes(methodId)
      ? selectedVerificationMethods.filter((id) => id !== methodId)
      : [...selectedVerificationMethods, methodId];
    setSelectedVerificationMethods(next);
  };

  const handleSaveDraft = () => {
    if (isLocked || selectedScore === null) return;
    saveRubricAssessment({
      score: selectedScore,
      justification,
      verificationMethods: selectedVerificationMethods,
      completionStatus: 'Pending',
    });
  };

  const handleSaveAndNext = () => {
    if (isLocked) {
      goToNextIndicator();
      return;
    }
    if (selectedScore !== null) {
      saveRubricAssessment({
        score: selectedScore,
        justification,
        verificationMethods: selectedVerificationMethods,
        completionStatus: 'Completed',
      });
    }
    goToNextIndicator();
  };

  const handleUploadIndicatorEvidence = async (file: File, notes?: string, documentId?: number) => {
    if (!indicator) return;
    await uploadEvidenceFile({
      file,
      indicatorId: indicator.indicatorId,
      title: file.name,
      notes,
      documentId,
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Banner Notice if Locked */}
      {isLocked && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#B91C1C',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          <Lock size={18} />
          <span>تم إقفال ملف التقييم بالختم الرقمي النهائي. شاشة الرصد في وضع القراءة فقط.</span>
        </div>
      )}

      {/* Indicator Context Header */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '6px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
              }}
            >
              {indicator?.code || 'IND-01-01'}
            </span>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
              المعيار: {standard?.title || 'القيادة والإدارة المدرسية'}
            </span>
          </div>

          {saveSuccessMessage && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#059669',
                backgroundColor: '#ECFDF5',
                padding: '4px 10px',
                borderRadius: '6px',
              }}
            >
              ✓ {saveSuccessMessage}
            </span>
          )}
        </div>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
          {indicator?.title || 'وضوح الرؤية والرسالة والأهداف الإجرائية للمدرسة ومشاركتها مع المجتمع المدرسي'}
        </h2>
        <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
          {indicator?.description || 'تمتلك المدرسة خطة تشغيلية واضحة وموثقة تعكس الرؤية الوطنية لجودة التعليم.'}
        </p>
      </div>

      {/* Rubric Grading Scale 0 to 3 */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              مقياس التقدير والواصفات المعيارية (Rubric Scale 0 - 3)
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0 0' }}>
              حدد المستوى الذي يطابق واقع الأداء المدرسي الحالي بناءً على فحص الشواهد
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '14px',
          }}
        >
          {rubricLevels.map((lvl) => {
            const isSelected = selectedScore === lvl.level;

            return (
              <div
                key={lvl.level}
                onClick={() => handleScoreSelect(lvl.level)}
                style={{
                  padding: '18px',
                  borderRadius: '12px',
                  border: isSelected ? `2px solid ${lvl.borderActive}` : '1px solid #E2E8F0',
                  backgroundColor: isSelected ? lvl.badgeBg : '#FFFFFF',
                  cursor: isLocked ? 'default' : 'pointer',
                  transition: 'all 0.18s ease',
                  position: 'relative',
                  boxShadow: isSelected ? '0 4px 12px rgba(5, 150, 105, 0.12)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isLocked && !isSelected) {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLocked && !isSelected) {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: lvl.badgeColor,
                      color: '#FFFFFF',
                    }}
                  >
                    المستوى {lvl.level}
                  </span>
                  {isSelected && <CheckCircle2 size={18} color={lvl.borderActive} />}
                </div>

                <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B', marginBottom: '6px' }}>
                  {lvl.title}
                </div>

                <div style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.5' }}>
                  {lvl.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Verification Methods Checkboxes */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
          أساليب وأدوات التحقق المستخدمة (Official Verification Methods)
        </h3>
        <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px 0' }}>
          اختر جميع الطرق التي استخدمها فريق التقييم للتثبت من درجة المؤشر
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {officialMethods.map((method) => {
            const isChecked = selectedVerificationMethods.includes(method.id);
            return (
              <label
                key={method.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: isChecked ? '1px solid #059669' : '1px solid #E2E8F0',
                  backgroundColor: isChecked ? '#ECFDF5' : '#FFFFFF',
                  cursor: isLocked ? 'default' : 'pointer',
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isLocked}
                  onChange={() => handleToggleVerificationMethod(method.id)}
                  style={{ accentColor: '#059669', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', fontWeight: isChecked ? 700 : 500, color: '#1E293B' }}>
                  {method.name}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Evidence Uploader */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <EvidenceUploader
          indicatorId={indicator?.indicatorId}
          evidenceLinks={currentResult?.evidenceLinks || []}
          onUploadFile={handleUploadIndicatorEvidence}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          readOnly={isLocked}
        />
      </div>

      {/* Evaluator Justification Notes */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <EvaluatorJustification
          value={justification}
          onChange={setJustification}
          readOnly={isLocked}
        />
      </div>

      {/* Bottom Sticky Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '16px 24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        <button
          onClick={goToPreviousIndicator}
          disabled={!hasPrevious}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 18px',
            borderRadius: '8px',
            backgroundColor: '#F1F5F9',
            color: hasPrevious ? '#334155' : '#94A3B8',
            fontWeight: 700,
            fontSize: '13px',
            border: 'none',
            cursor: hasPrevious ? 'pointer' : 'not-allowed',
          }}
        >
          <ArrowRight size={16} />
          <span>المؤشر السابق</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!isLocked && (
            <button
              onClick={handleSaveDraft}
              disabled={isSaving || selectedScore === null}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                borderRadius: '8px',
                backgroundColor: '#F8FAFC',
                color: '#475569',
                border: '1px solid #CBD5E1',
                fontWeight: 700,
                fontSize: '13px',
                cursor: selectedScore !== null ? 'pointer' : 'not-allowed',
              }}
            >
              <Save size={16} />
              <span>حفظ كمسودة</span>
            </button>
          )}

          <button
            onClick={handleSaveAndNext}
            disabled={!hasNext}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 22px',
              borderRadius: '8px',
              backgroundColor: '#059669',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '13.5px',
              border: 'none',
              cursor: hasNext ? 'pointer' : 'not-allowed',
              boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
            }}
          >
            <span>{isLocked ? 'المؤشر التالي' : 'حفظ ومتابعة للمؤشر التالي'}</span>
            <ArrowLeft size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
