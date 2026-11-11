import React, { useState, useEffect, useRef } from 'react';
import { useSelfEvaluation } from '../../hooks/useSelfEvaluation';
import { EvidenceUploader } from './EvidenceUploader';
import { EvaluatorJustification } from './EvaluatorJustification';
import { useEvidences } from '../../hooks/useEvidences';
import { evaluatorApi } from '../../api/evaluatorApi';
import type {
  EvaluatorScreen,
  EvidenceItem,
  LinkedEvidenceBrief,
  IndicatorMetricsContextItem,
  ActionCatalogRecommendationItem,
  PlanType,
  VerificationMethod,
} from '../../api/evaluationTypes';
import { LinkEvidenceModal } from '../evidences/LinkEvidenceModal';
import { useToast } from '../../../admin/components/common/useToast';
import { ToastNotification } from '../../../admin/components/common/ToastNotification';
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
  RotateCcw,
  ChevronDown,
  Search,
  Layers,
  BarChart3,
  Lightbulb,
  Plus,
  Check,
  Info,
  FileCheck2,
} from 'lucide-react';
import { SafeResetConfirmModal } from './SafeResetConfirmModal';

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
    saveRubricAssessment,
    resetIndicatorAssessment,
    retryLastSave,
    goToPreviousIndicator,
    goToNextIndicator,
    hasPrevious,
    hasNext,
    reloadTree,
    reloadIndicatorResult,
    isOffline,
    pendingOfflineCount,
    isSyncing,
    conflictWarning,
    syncOfflineDrafts,
    resolveConflictWithLocal,
    dismissConflict,
  } = useSelfEvaluation(selectedIndicatorId || undefined, isLocked);

  const { uploadEvidenceFile, isUploading, uploadProgress } = useEvidences();
  const { toasts, addToast, dismissToast } = useToast();

  // Local form state
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [justification, setJustification] = useState<string>('');
  const [selectedVerificationMethods, setSelectedVerificationMethods] = useState<number[]>([]);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [linkModalEvidence, setLinkModalEvidence] = useState<EvidenceItem | null>(null);
  const [linkModalMode, setLinkModalMode] = useState<'single' | 'multi' | 'unlink'>('single');
  const [isQuickNavOpen, setIsQuickNavOpen] = useState<boolean>(false);
  const [quickNavSearch, setQuickNavSearch] = useState<string>('');
  const quickNavRef = useRef<HTMLDivElement | null>(null);
  const quickNavInputRef = useRef<HTMLInputElement | null>(null);

  // IMP-07: School Quantitative Metrics Context
  const [indicatorsContextMap, setIndicatorsContextMap] = useState<Record<string, IndicatorMetricsContextItem>>({});
  const [indicatorsContextNotice, setIndicatorsContextNotice] = useState<string>('');

  // IMP-08: Action Catalog Recommendations (when score is 0 or 1 or manually toggled)
  const [actionRecommendations, setActionRecommendations] = useState<ActionCatalogRecommendationItem[]>([]);
  const [forceShowRecommendations, setForceShowRecommendations] = useState<boolean>(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState<boolean>(false);
  const [addingRecId, setAddingRecId] = useState<number | null>(null);
  const [addedRecIds, setAddedRecIds] = useState<number[]>([]);

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

  // Close QuickNav dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quickNavRef.current && !quickNavRef.current.contains(e.target as Node)) {
        setIsQuickNavOpen(false);
      }
    };
    if (isQuickNavOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => quickNavInputRef.current?.focus(), 40);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isQuickNavOpen]);

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

  // IMP-08: Fetch Action Recommendations whenever indicator has weak score (0 or 1) or manually requested
  useEffect(() => {
    if (!evaluationId || !indicator?.code) {
      setActionRecommendations([]);
      return;
    }
    const isWeak = selectedScore === 0 || selectedScore === 1;
    if (!isWeak && !forceShowRecommendations) {
      setActionRecommendations([]);
      return;
    }
    let cancelled = false;
    setIsLoadingRecommendations(true);
    evaluatorApi
      .getActionRecommendations(evaluationId, indicator.code)
      .then((res) => {
        if (!cancelled) {
          setActionRecommendations(res.recommendations || []);
        }
      })
      .catch(() => {
        if (!cancelled) setActionRecommendations([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRecommendations(false);
      });
    return () => {
      cancelled = true;
    };
  }, [evaluationId, indicator?.code, selectedScore, forceShowRecommendations]);

  const normalizedIndCode = indicator?.code ? indicator.code.replace(/\./g, '-') : '';
  const indicatorMetricsContext =
    (indicator?.code && indicatorsContextMap[indicator.code]) ||
    (normalizedIndCode && indicatorsContextMap[normalizedIndCode]) ||
    null;

  const handleAdoptRecommendation = async (rec: ActionCatalogRecommendationItem) => {
    if (isLocked || !indicator || addingRecId !== null) return;
    setAddingRecId(rec.catalog_id);
    try {
      const due = new Date();
      due.setDate(due.getDate() + (rec.suggested_duration_days || 45));
      await evaluatorApi.createImprovementAction({
        planType: (rec.plan_type as PlanType) || 'QualityImprovement',
        title: rec.title,
        leader: rec.suggested_responsible_description || 'فريق التحسين والجودة المدرسي',
        dueDate: due.toISOString().split('T')[0],
        progressDescription: `إجراء معتمد من بنك التدخلات لمعالجة المؤشر (${indicator.code}).`,
      });
      setAddedRecIds((prev) => [...prev, rec.catalog_id]);
      addToast('success', 'تمت إضافة الإجراء المقترح إلى خطة التحسين بنجاح.');
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'تعذر إضافة الإجراء إلى خطة التحسين.');
    } finally {
      setAddingRecId(null);
    }
  };

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

  const fallbackMethods: VerificationMethod[] = [
    { id: 1, name: 'فحص الوثائق والسجلات المدرسية', toolType: 'وثائقي', description: 'فحص الوثائق والخطط والسجلات الرسمية المعتمدة.' },
    { id: 2, name: 'بطاقة ملاحظة صفية وميدانية', toolType: 'ميداني', description: 'الملاحظة المباشرة للبيئة المدرسية والمرافق التعليمية.' },
    { id: 3, name: 'مقابلة المعلمين والطلبة وأولياء الأمور', toolType: 'مقابلات', description: 'المقابلات المقننة مع الفئات المعنية.' },
    { id: 4, name: 'استبانة قياس رضا المستفيدين', toolType: 'استبانة', description: 'استطلاع وتحليل آراء المستفيدين.' },
  ];

  // أساليب وأدوات التحقق الديناميكية الخاصة بالمؤشر من وثيقة المعايير الوطنية (IMP-01)
  const officialMethods =
    indicator?.verificationMethods && indicator.verificationMethods.length > 0
      ? indicator.verificationMethods
      : fallbackMethods;

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

  const isDirty =
    (selectedScore !== null && selectedScore !== (currentResult?.score ?? null)) ||
    (justification !== (currentResult?.justification || ''));

  const handleSaveDraft = async () => {
    if (isLocked || selectedScore === null) return;
    await saveRubricAssessment({
      score: selectedScore,
      justification,
      verificationMethods: selectedVerificationMethods,
      completionStatus: 'Pending',
    });
    addToast('success', 'تم حفظ مسودة المؤشر بنجاح.');
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
    addToast('success', 'تم رفع الشاهد وربطه بالمؤشر بنجاح.');
  };

  const handleUnlinkEvidence = async (linkId: number) => {
    await evaluatorApi.unlinkEvidence(linkId);
    await reloadIndicatorResult();
    await reloadTree();
    addToast('success', 'تم فك ارتباط الشاهد من المؤشر.');
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

      {/* Quick Searchable Standards & Indicators Dropdown (UX-8 / UX-Extra-3) */}
      {treeData && treeData.standards.length > 0 && (
        <div ref={quickNavRef} style={{ position: 'relative' }}>
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
                border: '1px solid #059669',
                backgroundColor: '#ECFDF5',
                color: '#065F46',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <Search size={15} />
              بحث في المعايير
            </button>
          </div>

          {isQuickNavOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                zIndex: 40,
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ position: 'relative' }}>
                <Search size={15} color="#94A3B8" style={{ position: 'absolute', right: '12px', top: '10px' }} />
                <input
                  ref={quickNavInputRef}
                  type="text"
                  value={quickNavSearch}
                  onChange={(e) => setQuickNavSearch(e.target.value)}
                  placeholder="ابحث باسم المعيار أو رمز أو عنوان المؤشر..."
                  style={{
                    width: '100%',
                    padding: '8px 36px 8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {treeData.standards.map((std) => {
                  const query = quickNavSearch.trim().toLowerCase();
                  const stdMatches =
                    std.code.toLowerCase().includes(query) || std.title.toLowerCase().includes(query);
                  const matchingIndicators = std.subStandards.flatMap((sub) =>
                    sub.indicators.filter(
                      (ind) =>
                        !query ||
                        stdMatches ||
                        ind.code.toLowerCase().includes(query) ||
                        ind.title.toLowerCase().includes(query)
                    )
                  );
                  if (matchingIndicators.length === 0) return null;

                  const stdScored = std.stats?.scoredIndicators ?? 0;
                  const stdTotal = std.stats?.totalIndicators ?? matchingIndicators.length;
                  const stdEmpty = Math.max(0, stdTotal - stdScored);
                  const stdCovered = std.stats?.coveredRequirements ?? 0;
                  const stdMandatory = std.stats?.totalMandatoryRequirements ?? 0;

                  return (
                    <div
                      key={std.standardId}
                      style={{
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: '#F8FAFC',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          flexWrap: 'wrap',
                          borderBottom: '1px solid #E2E8F0',
                        }}
                      >
                        <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0F172A' }}>
                          {std.code}: {std.title}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#4338CA' }}>
                          ممتلئة: {stdScored} • فارغة: {stdEmpty} • متطلبات مغطاة: {stdCovered}/{stdMandatory}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {matchingIndicators.map((ind) => {
                          const isCurrent = ind.indicatorId === indicator?.indicatorId;
                          const mCnt = ind.mandatoryRequirementsCount ?? 0;
                          const cCnt = ind.coveredRequirementsCount ?? 0;
                          const evCnt = ind.evidenceCount ?? 0;
                          return (
                            <button
                              key={ind.indicatorId}
                              type="button"
                              onClick={() => {
                                setSelectedStandardId(std.standardId);
                                setSelectedIndicatorId(ind.indicatorId);
                                setIsQuickNavOpen(false);
                              }}
                              style={{
                                textAlign: 'right',
                                padding: '8px 12px',
                                border: 'none',
                                borderBottom: '1px solid #F1F5F9',
                                backgroundColor: isCurrent ? '#ECFDF5' : '#FFFFFF',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                              }}
                            >
                              <span style={{ fontSize: '12px', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? '#065F46' : '#334155' }}>
                                <strong style={{ color: '#059669', marginLeft: '6px' }}>{ind.code}</strong>
                                {ind.title}
                              </span>
                              <span style={{ fontSize: '11px', color: mCnt > 0 && cCnt >= mCnt ? '#059669' : '#B45309', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                {ind.score !== null && ind.score !== undefined ? `تقدير: ${ind.score}` : 'غير مرصود'} • شواهد: {evCnt} • متطلبات مغطاة: {cCnt}/{mCnt}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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

      {/* IMP-08 (GAP-EV-09): Action Catalog Recommendations Card when Score <= 1 or manually requested */}
      {!(selectedScore === 0 || selectedScore === 1 || forceShowRecommendations) && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '-6px 0 4px 0' }}>
          <button
            type="button"
            onClick={() => setForceShowRecommendations(true)}
            style={{
              background: '#FFFBEB',
              border: '1px dashed #FCD34D',
              borderRadius: '8px',
              color: '#B45309',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
            }}
          >
            <Lightbulb size={15} />
            <span>استعراض التدخلات التربوية المقترحة من بنك الإجراءات لهذا المؤشر</span>
          </button>
        </div>
      )}

      {(selectedScore === 0 || selectedScore === 1 || forceShowRecommendations) && (
        <div
          data-testid="action-recommendations-card"
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FCD34D',
            borderRight: '4px solid #D97706',
            borderRadius: '14px',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lightbulb size={18} color="#B45309" />
              <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: '#92400E', margin: 0 }}>
                توصيات بنك الإجراءات النموذجية لمعالجة الفجوة {selectedScore !== null && selectedScore !== undefined ? `(الدرجة ${selectedScore})` : ''}
              </h3>
            </div>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#B45309' }}>
              بنك التدخلات المدرسية ({actionRecommendations.length})
            </span>
          </div>

          {isLoadingRecommendations ? (
            <div style={{ fontSize: '12.5px', color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Loader2 size={14} className="animate-spin" />
              <span>جاري استخراج التدخلات المقترحة للمؤشر...</span>
            </div>
          ) : actionRecommendations.length === 0 ? (
            <p style={{ fontSize: '12.5px', color: '#92400E', margin: 0 }}>
              لا توجد توصيات نموذجية مطابقة حالياً؛ يمكنك إضافة إجراء مخصص من شاشة خطة التحسين.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {actionRecommendations.map((rec) => {
                const isAdded = addedRecIds.includes(rec.catalog_id);
                const planTypeArabic =
                  rec.plan_type === 'StaffProfessionalDevelopment'
                    ? 'التطوير المهني'
                    : rec.plan_type === 'AnnualOperational'
                    ? 'الخطة التشغيلية'
                    : 'تحسين الجودة';
                return (
                  <div
                    key={rec.catalog_id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #FDE68A',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                        {rec.title}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '11.5px', color: '#64748B' }}>
                        <span style={{ color: '#047857', fontWeight: 700 }}>نوع الخطة: {planTypeArabic}</span>
                        {rec.suggested_responsible_description && (
                          <span>المسؤول المقترح: {rec.suggested_responsible_description}</span>
                        )}
                        {rec.suggested_duration_days && <span>المدة: {rec.suggested_duration_days} يوماً</span>}
                      </div>
                    </div>

                    {!isLocked && (
                      <button
                        type="button"
                        disabled={isAdded || addingRecId === rec.catalog_id}
                        onClick={() => handleAdoptRecommendation(rec)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: isAdded ? '#ECFDF5' : '#D97706',
                          color: isAdded ? '#059669' : '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: isAdded ? 'default' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isAdded ? <Check size={14} /> : <Plus size={14} />}
                        <span>{isAdded ? 'تمت الإضافة للخطة' : addingRecId === rec.catalog_id ? 'جاري الإضافة...' : 'إضافة إلى خطة التحسين'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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

          <button
            type="button"
            onClick={async () => {
              await reloadIndicatorResult();
              await reloadTree();
              addToast('success', 'تم تحديث بيانات المؤشر والشواهد من الخادم.');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              border: '1px solid #CBD5E1',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
            title="تحديث بيانات المؤشر والشواهد"
          >
            <RefreshCw size={14} />
            <span>تحديث</span>
          </button>

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

      {/* الإشعارات المنبثقة */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
