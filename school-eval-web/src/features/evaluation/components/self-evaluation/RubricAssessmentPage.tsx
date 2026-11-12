import React, { useState, useEffect } from 'react';
import { useSelfEvaluation } from '../../hooks/useSelfEvaluation';
import { EvidenceUploader } from './EvidenceUploader';
import { EvaluatorJustification } from './EvaluatorJustification';
import { useEvidences } from '../../hooks/useEvidences';
import { evaluatorApi } from '../../api/evaluatorApi';
import { useAuth } from '../../../auth/AuthContext';
import type {
  EvaluatorScreen,
  EvidenceItem,
  LinkedEvidenceBrief,
  IndicatorMetricsContextItem,
} from '../../api/evaluationTypes';
import { LinkEvidenceModal } from '../evidences/LinkEvidenceModal';
import { EditEvidenceMetadataModal } from '../evidences/EditEvidenceMetadataModal';
import { useToast } from '../../../admin/components/common/useToast';
import { ToastNotification } from '../../../admin/components/common/ToastNotification';
import {
  CheckCircle2,
  Save,
  Lock,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Loader2,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  Layers,
  BarChart3,
  Info,
  FileCheck2,
  MessageSquare,
  Send,
  Compass,
} from 'lucide-react';
import { SafeResetConfirmModal } from './SafeResetConfirmModal';
import { QuickNavModal } from './QuickNavModal';

interface RubricAssessmentPageProps {
  selectedIndicatorId?: number | null;
  onNavigate?: (screen: EvaluatorScreen, param?: number) => void;
  isLocked?: boolean;
  onResetSuccess?: () => void;
}

export const RubricAssessmentPage: React.FC<RubricAssessmentPageProps> = ({
  selectedIndicatorId,
  isLocked = false,
  onResetSuccess,
}) => {
  const {
    treeData,
    selectedIndicatorId: activeId,
    setSelectedStandardId,
    setSelectedIndicatorId,
    currentIndicatorInfo,
    currentResult,
    isSaving,
    saveStatus,
    saveSuccessMessage,
    saveRubricAssessment,
    resetIndicatorAssessment,
    retryLastSave,
    goToPreviousIndicator,
    goToNextIndicator,
    hasPrevious,
    hasNext,
    reloadTree,
    reloadIndicatorResult,
  } = useSelfEvaluation(selectedIndicatorId || undefined, isLocked);

  const { uploadEvidenceFile, isUploading, uploadProgress } = useEvidences();
  const { toasts, addToast, dismissToast } = useToast();

  // Local form state
  const { user } = useAuth();
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [justification, setJustification] = useState<string>('');
  const [selectedVerificationMethods, setSelectedVerificationMethods] = useState<number[]>([]);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [linkModalEvidence, setLinkModalEvidence] = useState<EvidenceItem | null>(null);
  const [linkModalMode, setLinkModalMode] = useState<'single' | 'multi' | 'unlink'>('single');
  const [editModalEvidence, setEditModalEvidence] = useState<EvidenceItem | null>(null);
  const [isQuickNavOpen, setIsQuickNavOpen] = useState<boolean>(false);
  const [newReviewerNote, setNewReviewerNote] = useState<string>('');
  const [isAddingNote, setIsAddingNote] = useState<boolean>(false);

  // IMP-07: School Quantitative Metrics Context
  const [indicatorsContextMap, setIndicatorsContextMap] = useState<Record<string, IndicatorMetricsContextItem>>({});
  const [indicatorsContextNotice, setIndicatorsContextNotice] = useState<string>('');

  const evaluationId = treeData?.evaluationId || currentResult?.evaluationId;

  const hasIndicatorData =
    selectedScore !== null ||
    (currentResult?.score !== null && currentResult?.score !== undefined) ||
    (currentResult?.evidenceLinks?.length ?? 0) > 0;

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

  // IMP-07: Fetch Indicators Quantitative Context once per evaluationId
  useEffect(() => {
    if (!evaluationId) return;
    let cancelled = false;
    evaluatorApi
      .getIndicatorsContext(evaluationId)
      .then((res) => {
        if (!cancelled) {
          setIndicatorsContextMap(res.indicators || {});
          setIndicatorsContextNotice(res.notice || '');
        }
      })
      .catch(() => {
        if (!cancelled) setIndicatorsContextMap({});
      });
    return () => {
      cancelled = true;
    };
  }, [evaluationId]);

  const indicator = currentIndicatorInfo?.indicator;
  const standard = currentIndicatorInfo?.standard;
  const subStandard = currentIndicatorInfo?.subStandard;

  const normalizedIndCode = indicator?.code ? indicator.code.replace(/\./g, '-') : '';
  const indicatorMetricsContext =
    (indicator?.code && indicatorsContextMap[indicator.code]) ||
    (normalizedIndCode && indicatorsContextMap[normalizedIndCode]) ||
    null;

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

  // أساليب وأدوات التحقق الديناميكية الخاصة بالمؤشر من وثيقة المعايير الوطنية (IMP-01) - من قاعدة البيانات حصراً
  const officialMethods = indicator?.verificationMethods && indicator.verificationMethods.length > 0
    ? indicator.verificationMethods
    : [];

  const handleScoreSelect = (level: number) => {
    if (isLocked) return;
    setSelectedScore(level);
    // Instant save according to zero dead button guideline
    saveRubricAssessment({
      score: level,
      justification,
      verificationMethods: selectedVerificationMethods,
      completionStatus: 'Completed',
    }).then(() => {
      onResetSuccess?.();
    });
  };

  const isDirty =
    (selectedScore !== null && selectedScore !== (currentResult?.score ?? null)) ||
    (justification !== (currentResult?.justification || ''));

  const handleSaveDraft = async () => {
    if (isLocked || selectedScore === null) return;
    await saveRubricAssessment({
      score: selectedScore,
      justification,
      verificationMethods: selectedVerificationMethods,
      completionStatus: 'Completed',
    });
    onResetSuccess?.();
    addToast('success', 'تم حفظ تقييم المؤشر بنجاح على الخادم.');
  };

  const handleSaveAndNext = async () => {
    if (isLocked) {
      goToNextIndicator();
      return;
    }
    if (selectedScore !== null) {
      await saveRubricAssessment({
        score: selectedScore,
        justification,
        verificationMethods: selectedVerificationMethods,
        completionStatus: 'Completed',
      });
      onResetSuccess?.();
      addToast('success', 'تم حفظ التقييم بنجاح، جاري الانتقال للمؤشر التالي.');
    }
    goToNextIndicator();
  };

  const handleUploadIndicatorEvidence = async (
    file: File,
    notes?: string,
    documentId?: number,
    coveredRequirements?: number[]
  ) => {
    if (!indicator) return;
    await uploadEvidenceFile({
      file,
      indicatorId: indicator.indicatorId,
      title: file.name,
      notes,
      documentId,
      coveredRequirements,
    });
    await reloadIndicatorResult();
    await reloadTree();
    onResetSuccess?.();
    addToast('success', 'تم رفع الشاهد وربطه بالمؤشر بنجاح.');
  };

  const handleUnlinkEvidence = async (linkId: number) => {
    await evaluatorApi.unlinkEvidence(linkId);
    await reloadIndicatorResult();
    await reloadTree();
    onResetSuccess?.();
    addToast('success', 'تم فك ارتباط الشاهد بنجاح.');
  };

  const handleUpdateCoveredRequirements = async (linkId: number, coveredRequirements: number[]) => {
    await evaluatorApi.updateLinkCoveredRequirements(linkId, coveredRequirements);
    await reloadIndicatorResult();
    addToast('success', 'تم تحديث المتطلبات الإلزامية المغطاة للشاهد.');
  };

  const handleManageEvidenceLink = (link: LinkedEvidenceBrief, mode: 'single' | 'multi' | 'unlink') => {
    if (isLocked) return;
    const item: EvidenceItem = {
      id: link.versionId || link.linkId,
      documentId: link.documentId || link.linkId,
      linkId: link.linkId,
      indicatorId: link.indicatorId || indicator?.indicatorId,
      title: link.title,
      fileName: link.fileName,
      mimeType: 'application/pdf',
      fileSize: link.fileSize,
      formattedSize: `${(link.fileSize / (1024 * 1024)).toFixed(2)} MB`,
      versionNumber: link.versionNumber,
      standardCode: standard?.code || 'STD',
      standardName: standard?.title || '',
      indicatorCode: indicator?.code || '',
      indicatorTitle: indicator?.title || '',
      uploadedAt: '',
      uploadedBy: '',
      verificationStatus: 'Compliant',
      verificationStatusArabic: 'موثق',
    };
    setLinkModalMode(mode);
    setLinkModalEvidence(item);
  };

  const handleOpenEditMetadata = (link: LinkedEvidenceBrief) => {
    if (isLocked) return;
    setEditModalEvidence({
      id: link.versionId || link.linkId,
      documentId: link.documentId || link.linkId,
      linkId: link.linkId,
      indicatorId: link.indicatorId || indicator?.indicatorId,
      title: link.title,
      fileName: link.fileName,
      mimeType: 'application/pdf',
      fileSize: link.fileSize,
      formattedSize: `${(link.fileSize / (1024 * 1024)).toFixed(2)} MB`,
      versionNumber: link.versionNumber,
      standardCode: standard?.code || 'STD',
      standardName: standard?.title || '',
      indicatorCode: indicator?.code || '',
      indicatorTitle: indicator?.title || '',
      documentType: link.documentType || 'evidence',
      description: link.description || '',
      justification: link.justification || '',
      uploadedAt: link.uploadedAt || '',
      uploadedBy: '',
      verificationStatus: 'Compliant',
      verificationStatusArabic: 'موثق',
    });
  };

  const handleSaveEvidenceMetadata = async (payload: {
    documentId: number;
    title: string;
    documentType: string;
    description: string;
    justification: string;
    linkId?: number;
  }) => {
    try {
      await evaluatorApi.updateDocumentMetadata(payload.documentId, payload);
      await reloadIndicatorResult();
      addToast('success', 'تم تحديث بيانات الشاهد بنجاح.');
      setEditModalEvidence(null);
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'تعذر تحديث بيانات الشاهد.');
    }
  };

  const handleAddReviewerNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewerNote.trim() || !currentResult?.resultId) return;
    setIsAddingNote(true);
    try {
      await evaluatorApi.addEvaluationResultNote(currentResult.resultId, newReviewerNote.trim());
      addToast('success', 'تمت إضافة الملاحظة التوجيهية بنجاح.');
      setNewReviewerNote('');
      await reloadIndicatorResult();
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'تعذر إضافة الملاحظة.');
    } finally {
      setIsAddingNote(false);
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

      {/* Network / Save Error Banner with Retry */}
      {saveStatus === 'error' && (
        <div
          role="alert"
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            color: '#991B1B',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} color="#DC2626" />
            <span>{saveSuccessMessage || 'تعذر الحفظ على الخادم بسبب انقطاع الاتصال أو خطأ في الشبكة.'}</span>
          </div>

          <button
            type="button"
            onClick={retryLastSave}
            disabled={isSaving}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={14} className={isSaving ? 'animate-spin' : ''} />
            <span>{isSaving ? 'جاري إعادة المحاولة...' : 'إعادة المحاولة الآن'}</span>
          </button>
        </div>
      )}

      {/* Quick Searchable Standards & Indicators Dropdown (UX-8 / UX-Extra-3) */}
      {treeData && treeData.standards.length > 0 && (
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setIsQuickNavOpen((prev) => !prev)}
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <Layers size={18} color="#059669" />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                  التنقل بين المعايير والمؤشرات:
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#059669' }}>
                  {standard?.code} — {standard?.title}
                </span>
                {standard?.stats && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#ECFDF5',
                      color: '#065F46',
                      border: '1px solid #A7F3D0',
                    }}
                  >
                    ممتلئة: {standard.stats.scoredIndicators ?? 0} • فارغة:{' '}
                    {Math.max(0, (standard.stats.totalIndicators ?? 0) - (standard.stats.scoredIndicators ?? 0))}
                  </span>
                )}
              </div>
              <ChevronDown
                size={18}
                color="#64748B"
                style={{
                  transform: isQuickNavOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              />
            </button>

            <button
              type="button"
              onClick={() => setIsQuickNavOpen(true)}
              style={{
                padding: '0 16px',
                borderRadius: '12px',
                border: '1.5px solid #4F46E5',
                backgroundColor: '#EEF2FF',
                color: '#4338CA',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
              title="دليل التنقل السريع بين كافة المعايير والمؤشرات الـ 109"
            >
              <Compass size={15} />
              تصفح المعايير والمؤشرات (109)
            </button>

            <button
              type="button"
              onClick={async () => {
                await reloadIndicatorResult();
                await reloadTree();
                addToast('success', 'تم تحديث بيانات المؤشر والشواهد من الخادم.');
              }}
              style={{
                padding: '0 14px',
                borderRadius: '12px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
              title="تحديث بيانات المؤشر والشواهد من الخادم"
            >
              <RefreshCw size={14} />
              تحديث
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#64748B', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: '#1E293B' }}>{standard?.title || 'المعيار الرئيسي'}</span>
              <span>›</span>
              <span style={{ fontWeight: 600, color: '#059669' }}>
                {subStandard ? `${subStandard.code}: ${subStandard.title}` : 'المعيار الفرعي'}
              </span>
              <span>›</span>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  border: '1px solid #A7F3D0',
                }}
              >
                {indicator?.code || 'IND-01-01'}
              </span>
            </div>
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

      {/* IMP-07 (GAP-EV-08): Quantitative School Metrics Context Card */}
      {indicatorMetricsContext && (
        <div
          data-testid="indicator-metrics-context-card"
          style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #93C5FD',
            borderRight: '4px solid #2563EB',
            borderRadius: '14px',
            padding: '18px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} color="#1D4ED8" />
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#1E3A8A' }}>
                السياق الاسترشادي من بيانات المدرسة الكمية
              </span>
            </div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                padding: '4px 12px',
                borderRadius: '99px',
                backgroundColor:
                  indicatorMetricsContext.suggested_level === 3
                    ? '#D1FAE5'
                    : indicatorMetricsContext.suggested_level === 2
                    ? '#DBEAFE'
                    : indicatorMetricsContext.suggested_level === 1
                    ? '#FEF3C7'
                    : '#E2E8F0',
                color:
                  indicatorMetricsContext.suggested_level === 3
                    ? '#065F46'
                    : indicatorMetricsContext.suggested_level === 2
                    ? '#1E40AF'
                    : indicatorMetricsContext.suggested_level === 1
                    ? '#92400E'
                    : '#475569',
              }}
            >
              {indicatorMetricsContext.badge}
            </span>
          </div>

          <p style={{ fontSize: '13px', color: '#1E293B', margin: 0, lineHeight: 1.6 }}>
            {indicatorMetricsContext.message}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Info size={13} color="#2563EB" />
              تقدير استرشادي لدعم القرار — لا يغيّر الدرجة المعتمدة تلقائياً (الواصفات الرسمية هي الأساس).
            </span>
            {indicatorsContextNotice && (
              <span style={{ color: '#64748B', fontWeight: 600 }}>{indicatorsContextNotice}</span>
            )}
          </div>
        </div>
      )}

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
            const officialDesc = indicator?.descriptors?.find((d) => Number(d.level) === lvl.level);
            const levelTitle = officialDesc?.title || lvl.title;
            const levelDesc = officialDesc?.description || lvl.description;

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
                  {levelTitle}
                </div>

                <div style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.5' }}>
                  {levelDesc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Verification Tools Reference (Static Cards per National Standards - Decision 2) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCheck2 size={18} color="#2563EB" />
              أساليب وأدوات التحقق المعتمدة لهذا المؤشر (وفق وثيقة المعايير الوطنية)
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
              أدوات التقييم المعتمدة رسمياً للتثبت من استيفاء شواهد وأداء المؤشر (مرجعية نظامية للعرض والاسترشاد).
            </p>
          </div>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              border: '1px solid #BFDBFE',
            }}
          >
            {officialMethods.length} أدوات معتمدة
          </span>
        </div>

        {officialMethods.length === 0 ? (
          <div style={{ marginTop: '14px', padding: '16px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            لا توجد أساليب أو أدوات تحقق مخصصة لهذا المؤشر في دليل المعايير.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '16px' }}>
            {officialMethods.map((method) => {
              return (
                <div
                  key={method.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#1E293B' }}>
                    {method.name}
                  </span>
                  {method.toolType && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#EEF2FF',
                        color: '#4F46E5',
                        border: '1px solid #C7D2FE',
                      }}
                    >
                      {method.toolType}
                    </span>
                  )}
                </div>
                {method.description && (
                  <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                    {method.description}
                  </p>
                )}
                {method.guidance && (
                  <div style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>• {method.guidance}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
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
          onManageEvidenceLink={handleManageEvidenceLink}
          onEditEvidenceMetadata={handleOpenEditMetadata}
          onUpdateCoveredRequirements={handleUpdateCoveredRequirements}
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

      {/* Reviewer Notes Section (Item 22) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} color="#4338CA" />
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              ملاحظات وتوجيهات المدير والمراجع (Reviewer Notes):
            </h4>
          </div>
          <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
            {currentResult?.reviewerNotes?.length ?? 0} ملاحظة مسجلة
          </span>
        </div>

        {/* Existing notes list */}
        {currentResult?.reviewerNotes && currentResult.reviewerNotes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentResult.reviewerNotes.map((n) => (
              <div
                key={n.noteId}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E293B' }}>{n.authorName}</span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '1px 8px',
                        borderRadius: '4px',
                        backgroundColor: n.authorRole === 'ministry_supervisor' ? '#E0F2FE' : '#EEF2FF',
                        color: n.authorRole === 'ministry_supervisor' ? '#0369A1' : '#4338CA',
                      }}
                    >
                      {n.authorRole === 'ministry_supervisor'
                        ? 'مشرف الوزارة (توجيه وزاري)'
                        : n.authorRole === 'school_principal'
                        ? 'مدير المدرسة (مراجعة داخلية)'
                        : n.authorRole || 'مراجع'}
                    </span>
                  </div>
                  {n.createdAt && (
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                      {new Date(n.createdAt).toLocaleDateString('ar-SA')}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#334155', lineHeight: 1.6 }}>{n.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1', color: '#64748B', fontSize: '12.5px', textAlign: 'center' }}>
            لا توجد ملاحظات أو توجيهات مسجلة من المدير أو المراجع على هذا المؤشر حتى الآن.
          </div>
        )}

        {/* Add note form for supervisors / principals / admins (Decision 4: Evaluator has read-only access) */}
        {!isLocked && currentResult?.resultId && (
          user?.roles?.some((r) => ['admin', 'school_principal', 'ministry_supervisor'].includes(r.roleName)) ||
          user?.userType === 'ministry'
        ) ? (
          <form onSubmit={handleAddReviewerNote} style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <input
              type="text"
              value={newReviewerNote}
              onChange={(e) => setNewReviewerNote(e.target.value)}
              placeholder={
                user?.roles?.some((r) => r.roleName === 'ministry_supervisor') || user?.userType === 'ministry'
                  ? 'اكتب توجيهاً إشرافياً وزارياً حول هذا المؤشر...'
                  : 'اكتب ملاحظة وتوجيه مراجعة داخلية حول هذا المؤشر...'
              }
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12.5px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={isAddingNote || !newReviewerNote.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: '#4338CA',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: isAddingNote || !newReviewerNote.trim() ? 'not-allowed' : 'pointer',
                opacity: isAddingNote || !newReviewerNote.trim() ? 0.6 : 1,
              }}
            >
              <Send size={13} />
              <span>{isAddingNote ? 'جارِ الإرسال...' : 'إرسال الملاحظة'}</span>
            </button>
          </form>
        ) : (
          <div style={{ fontSize: '11.5px', color: '#64748B', backgroundColor: '#F8FAFC', padding: '8px 12px', borderRadius: '6px' }}>
            سجل الملاحظات مخصص لتوجيهات مدير المدرسة والمشرف التربوي (للقراءة فقط لمقيم المدرسة).
          </div>
        )}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {!isLocked && hasIndicatorData && (
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              disabled={isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                fontWeight: 700,
                fontSize: '13px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
              title="تصفير رصد هذا المؤشر وإعادته إلى قائمة العناصر غير المرصودة"
            >
              <RotateCcw size={15} />
              <span>تصفير المؤشر</span>
            </button>
          )}

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
                backgroundColor: isDirty ? '#FFFBEB' : '#F8FAFC',
                color: isDirty ? '#B45309' : '#475569',
                border: isDirty ? '1px solid #FCD34D' : '1px solid #CBD5E1',
                fontWeight: 700,
                fontSize: '13px',
                cursor: selectedScore !== null ? 'pointer' : 'not-allowed',
              }}
              title="حفظ التقدير والملاحظات مع البقاء في هذا المؤشر"
            >
              <Save size={16} />
              <span>حفظ التعديلات الحالية</span>
              {isDirty && (
                <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 800 }}>* غير محفوظ</span>
              )}
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

      {/* نافذة تأكيد التصفير الآمن للمؤشر (الملاحظة 7) */}
      <SafeResetConfirmModal
        isOpen={isResetModalOpen}
        mode="indicator"
        targetTitle={`${indicator?.code || ''} - ${indicator?.title || 'المؤشر المحدد'}`}
        affectedCount={1}
        hasLinkedEvidences={(currentResult?.evidenceLinks?.length ?? 0) > 0}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={async (unlinkEvidences) => {
          if (!activeId) return;
          await resetIndicatorAssessment(activeId, unlinkEvidences);
          setSelectedScore(null);
          setJustification('');
          setSelectedVerificationMethods([]);
          onResetSuccess?.();
        }}
      />

      {/* نافذة ربط ونقل الشواهد (IMP-02) */}
      <LinkEvidenceModal
        isOpen={!!linkModalEvidence}
        onClose={() => setLinkModalEvidence(null)}
        evidence={linkModalEvidence}
        initialMode={linkModalMode}
        onSuccess={async (msg) => {
          addToast('success', msg);
          await reloadIndicatorResult();
          await reloadTree();
        }}
        onError={(msg) => addToast('error', msg)}
      />

      {/* نافذة تعديل بيانات الشاهد (العنوان والنوع والوصف والمبررات) */}
      <EditEvidenceMetadataModal
        isOpen={Boolean(editModalEvidence)}
        onClose={() => setEditModalEvidence(null)}
        evidence={editModalEvidence}
        onSave={handleSaveEvidenceMetadata}
      />

      {/* نافذة التنقل السريع التفاعلية بين الـ 109 مؤشراً (Modal مركزي تفاعلي) */}
      <QuickNavModal
        isOpen={isQuickNavOpen}
        onClose={() => setIsQuickNavOpen(false)}
        standards={treeData?.standards || []}
        currentStandardId={standard?.standardId}
        currentIndicatorId={selectedIndicatorId || undefined}
        onSelectIndicator={(stdId, indId) => {
          setSelectedStandardId(stdId);
          setSelectedIndicatorId(indId);
        }}
      />

      {/* الإشعارات المنبثقة */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
