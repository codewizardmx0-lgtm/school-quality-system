import React, { useState, useEffect } from 'react';
import { useSelfEvaluation } from '../../hooks/useSelfEvaluation';
import { EvidenceUploader } from './EvidenceUploader';
import { EvaluatorJustification } from './EvaluatorJustification';
import { useEvidences } from '../../hooks/useEvidences';
import { evaluatorApi } from '../../api/evaluatorApi';
import type { EvaluatorScreen } from '../../api/evaluationTypes';
import {
  CheckCircle2,
  Save,
  Lock,
  ArrowRight,
  ArrowLeft,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  Loader2,
  AlertCircle,
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
    saveStatus,
    saveRubricAssessment,
    retryLastSave,
    goToPreviousIndicator,
    goToNextIndicator,
    hasPrevious,
    hasNext,
    isOffline,
    pendingOfflineCount,
    isSyncing,
    conflictWarning,
    syncOfflineDrafts,
    resolveConflictWithLocal,
    dismissConflict,
  } = useSelfEvaluation(selectedIndicatorId || undefined, isLocked);

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

  // Rubric levels specification (Official National Standards Nomenclature)
  const rubricLevels = [
    {
      level: 0,
      title: 'المستوى 0: غير متوفر',
      description: 'عدم قيام المدرسة بالأداءات المطلوبة منها وبحاجة لمراجعة أدائها وتصحيح أخطائها.',
      badgeColor: '#EF4444',
      badgeBg: '#FEF2F2',
      borderActive: '#DC2626',
    },
    {
      level: 1,
      title: 'المستوى 1: متحقق بدرجة ضعيفة',
      description: 'أداءات كتابية أو متحققة أحياناً وتفتقر للمنهجية وبحاجة لمجهود واستكمال الشواهد.',
      badgeColor: '#F59E0B',
      badgeBg: '#FFFBEB',
      borderActive: '#D97706',
    },
    {
      level: 2,
      title: 'المستوى 2: متحقق بدرجة متوسطة',
      description: 'أداءات متحققة بصورة متوسطة الفاعلية مع وجود مجال للتحسين وخطط للتطوير.',
      badgeColor: '#2563EB',
      badgeBg: '#EFF6FF',
      borderActive: '#1D4ED8',
    },
    {
      level: 3,
      title: 'المستوى 3: متحقق',
      description: 'وصول المؤسسة للمستوى المطلوب تحقيقه وبشكل مستمر مع متابعة دورية وخطط تحسين.',
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
    if (activeId) {
      setSelectedIndicatorId(activeId);
    }
  };

  const handleUnlinkEvidence = async (linkId: number) => {
    await evaluatorApi.unlinkEvidence(linkId);
    if (activeId) {
      setSelectedIndicatorId(activeId);
    }
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

      {/* Offline Alert & Pending Sync Banner (FE-GAP-05 / U-35) */}
      {(isOffline || pendingOfflineCount > 0) && (
        <div
          role="status"
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '10px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            color: '#92400E',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <WifiOff size={18} color="#D97706" />
            <span>
              {isOffline
                ? 'وضع عدم الاتصال — المسودة والتعديلات تُحفظ محلياً تلقائياً.'
                : `توجد ${pendingOfflineCount} تقييمات محفوظة محلياً بانتظار المزامنة مع الخادم.`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => syncOfflineDrafts()}
            disabled={isSyncing}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة الآن'}</span>
          </button>
        </div>
      )}

      {/* Conflict Warning Banner (FE-GAP-05 Simple Conflict Resolution) */}
      {conflictWarning && (
        <div
          role="alert"
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            padding: '14px 18px',
            color: '#991B1B',
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontWeight: 700 }}>
            <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{conflictWarning}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={dismissConflict}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              إلغاء والتراجع
            </button>
            <button
              type="button"
              onClick={resolveConflictWithLocal}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              اعتماد نسختي المحلية (آخر تعديل يفوز)
            </button>
          </div>
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

          {/* مؤشر حالة الحفظ التفاعلي الصريح */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {saveStatus === 'saving' && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#2563EB',
                  backgroundColor: '#EFF6FF',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Loader2 size={13} className="animate-spin" />
                <span>قيد الحفظ...</span>
              </span>
            )}

            {saveStatus === 'saved_server' && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#059669',
                  backgroundColor: '#ECFDF5',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <CheckCircle2 size={13} />
                <span>محفوظ على الخادم</span>
              </span>
            )}

            {saveStatus === 'saved_local' && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#D97706',
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <WifiOff size={13} />
                <span>محفوظ محلياً (أوفلاين)</span>
              </span>
            )}

            {saveStatus === 'error' && (
              <button
                type="button"
                onClick={retryLastSave}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#DC2626',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <AlertCircle size={13} />
                <span>تعذر الحفظ (اضغط لإعادة المحاولة)</span>
              </button>
            )}
          </div>
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
          evidenceRequirements={currentResult?.evidenceRequirements || indicator?.evidenceRequirements || []}
          onUploadFile={handleUploadIndicatorEvidence}
          onUnlinkEvidence={handleUnlinkEvidence}
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
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '16px 20px',
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
              title="حفظ التقدير والملاحظات مع البقاء في هذا المؤشر"
            >
              <Save size={16} />
              <span>حفظ التعديلات الحالية</span>
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
            title="حفظ التقدير والانتقال المباشر للمؤشر التالي"
          >
            <span>{isLocked ? 'المؤشر التالي' : 'حفظ والانتقال للمؤشر التالي'}</span>
            <ArrowLeft size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
