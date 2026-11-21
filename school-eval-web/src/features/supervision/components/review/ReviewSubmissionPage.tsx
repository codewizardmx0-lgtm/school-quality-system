/**
 * Component: ReviewSubmissionPage
 * الشاشة 4: مركز استلام ومراجعة وتدقيق مخرجات التقييم المدرسي
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 * 
 * متوافقة مع FR-SUP-03..11, UC-SUP-03, BR-MIN-02, BR-MIN-03, BR-SCH-03
 * - تصفح ديناميكي لكافة المخرجات المتاحة في النطاق الجغرافي
 * - استئصال تام للفظ الاعتماد والقيم الوهمية الثابتة
 * - فلترة متقدمة للمعايير الوطنية السبعة وفلاتر سريعة للمؤشرات الـ 109
 * - طي افتراضي للشواهد وأدوات التحقق (FR-SUP-07)
 * - حوكمة الحالات الثلاث (NeedsCompletion, Re-review, Completed Lock Mode)
 * - تصدير رسمي للتقارير بصيغة PDF و Excel وروابط حقيقية للشواهد
 */

import React, { useMemo } from 'react';
import {
  ArrowRight,
  Download,
  Lock,
  FileText,
  Target,
  Layers,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Search,
  Filter,
  FileSpreadsheet,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { useSubmissionsReview, type ReviewTabType, type QuickFilterType } from '../../hooks/useSubmissionsReview';
import { IndicatorAuditRow } from './IndicatorAuditRow';
import { SupervisorDecisionPanel } from './SupervisorDecisionPanel';
import { EmptySupervisionState } from '../common/EmptySupervisionState';
import type { SupervisionScreenKey } from '../../api/supervisionTypes';

interface ReviewSubmissionPageProps {
  submissionId?: number;
  schoolId?: number;
  onNavigate: (
    screen: SupervisionScreenKey,
    params?: { submissionId?: number; schoolId?: number; preloadedItems?: any[] }
  ) => void;
}

export const ReviewSubmissionPage: React.FC<ReviewSubmissionPageProps> = ({
  submissionId,
  schoolId: _schoolId,
  onNavigate,
}) => {
  const {
    reviewData,
    isLoading,
    error,
    refetch,
    activeSubmissionId,
    availableSubmissions,
    isLoadingAvailable,
    selectSubmission,
    activeTab,
    setActiveTab,
    decisionMode,
    setDecisionMode,
    supervisorNotes,
    setSupervisorNotes,
    defectiveItems,
    defectiveCount,
    saveDeficiency,
    removeDeficiency,
    toggleIndicatorDefect,
    handleCloseReview,
    isActionLoading,
    actionSuccessMessage,
    actionErrorMessage,
    selectedStandardId,
    setSelectedStandardId,
    quickFilter,
    setQuickFilter,
    searchQuery,
    setSearchQuery,
    filteredIndicators,
    standardsList,
  } = useSubmissionsReview(submissionId);

  // إحصائيات سريعة للفلترة
  const filterCounts = useMemo(() => {
    if (!reviewData?.indicators) {
      return { total: 0, defective: 0, missingEvidence: 0, lowScore: 0 };
    }
    const total = reviewData.indicators.length;
    const defective = reviewData.indicators.filter(
      (i) => i.hasDefect || defectiveItems.has(i.indicatorId)
    ).length;
    const missingEvidence = reviewData.indicators.filter(
      (i) => i.schoolScore > 0 && i.evidences.length === 0
    ).length;
    const lowScore = reviewData.indicators.filter((i) => i.schoolScore <= 1).length;

    return { total, defective, missingEvidence, lowScore };
  }, [reviewData?.indicators, defectiveItems]);

  // التحويل لشاشة إصدار طلب الاستكمال مع تمرير البنود المحددة
  const handleProceedToCompletion = () => {
    if (!reviewData) return;

    const preloaded: any[] = [];
    reviewData.indicators.forEach((ind) => {
      if (defectiveItems.has(ind.indicatorId)) {
        const itemInfo = defectiveItems.get(ind.indicatorId)!;
        preloaded.push({
          indicatorId: ind.indicatorId,
          code: ind.code,
          title: ind.title,
          defectReason: itemInfo.defectReason,
          grantedPermission: 'استبدال / تحديث مرفق الشاهد',
          directives: itemInfo.directives,
          evidenceLinkId: ind.evidences[0]?.id ?? null,
        });
      }
    });

    onNavigate('completion-requests', {
      submissionId: activeSubmissionId,
      schoolId: reviewData?.school?.schoolId ?? _schoolId,
      preloadedItems: preloaded,
    });
  };

  // حالة عدم وجود مخرجات في النطاق الإشرافي
  if (!isLoading && !reviewData && availableSubmissions.length === 0) {
    return (
      <div style={{ padding: '32px' }}>
        <EmptySupervisionState
          title="لا توجد مخرجات تقييم بانتظار المراجعة"
          description="كافة مدارس نطاقك الإشرافي إما لم ترفع مخرجاتها بعد أو تم إغلاق مراجعتها بالكامل بنجاح."
          actionText="العودة إلى لوحة المتابعة المركزية"
          onAction={() => onNavigate('dashboard')}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      <style>{`
        @media (max-width: 1024px) {
          .supervision-review-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* 1. الترويسة العلوية، زر الرجوع، وشريط اختيار المخرج النشط */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#64748B',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <ArrowRight size={16} />
            <span>العودة إلى لوحة المتابعة المركزية</span>
          </button>

          {/* محدد التبديل بين المدارس المتاحة للمراجعة */}
          {availableSubmissions.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} color="#64748B" />
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                المدرسة قيد التدقيق:
              </label>
              <select
                value={activeSubmissionId ?? ''}
                onChange={(e) => selectSubmission(Number(e.target.value))}
                disabled={isLoadingAvailable}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#0F172A',
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: '320px',
                }}
              >
                {availableSubmissions.map((sub) => (
                  <option key={sub.submissionId} value={sub.submissionId}>
                    {sub.schoolName} ({sub.schoolCode}) — {sub.statusArabic}{' '}
                    {sub.attemptNo > 1 ? `[محاولة ${sub.attemptNo}]` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* كرت سياق المدرسة والمخرج التقييمي */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '16px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#2563EB',
                  backgroundColor: '#EFF6FF',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                {reviewData?.school?.schoolCode ?? '—'}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color:
                    reviewData?.status === 'Completed'
                      ? '#065F46'
                      : reviewData?.status === 'NeedsCompletion'
                      ? '#92400E'
                      : '#1D4ED8',
                  backgroundColor:
                    reviewData?.status === 'Completed'
                      ? '#ECFDF5'
                      : reviewData?.status === 'NeedsCompletion'
                      ? '#FEF3C7'
                      : '#EFF6FF',
                  border: `1px solid ${
                    reviewData?.status === 'Completed'
                      ? '#A7F3D0'
                      : reviewData?.status === 'NeedsCompletion'
                      ? '#FDE68A'
                      : '#BFDBFE'
                  }`,
                  padding: '2px 10px',
                  borderRadius: '999px',
                }}
              >
                {reviewData?.statusArabic ?? 'قيد المراجعة'}
              </span>

              {reviewData?.isReReview && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#7C3AED',
                    backgroundColor: '#F5F3FF',
                    border: '1px solid #DDD6FE',
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}
                >
                  إعادة مراجعة (محاولة {reviewData.attemptNo})
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {reviewData?.school?.schoolName ?? 'مدرسة التقييم'}
            </h1>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              المرحلة: {reviewData?.school?.educationalStage ?? '—'} • المحافظة:{' '}
              {reviewData?.school?.governorate ?? '—'} • مدير المدرسة:{' '}
              {reviewData?.school?.principalName ?? 'إدارة المدرسة'} • تاريخ الرفع:{' '}
              {reviewData?.submittedAt
                ? new Date(reviewData.submittedAt).toLocaleDateString('ar-YE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '—'}
            </div>
          </div>

          {/* أزرار تصدير التقارير الرسمية وحزم المخرجات */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            {reviewData?.exportPdfUrl ? (
              <a
                href={reviewData.exportPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: '#FFFFFF',
                  color: '#DC2626',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <Download size={14} />
                <span>تقرير PDF</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() =>
                  reviewData?.evaluationId &&
                  window.open(`/api/v1/evaluations/${reviewData.evaluationId}/export-pdf`, '_blank')
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: '#FFFFFF',
                  color: '#DC2626',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Download size={14} />
                <span>تقرير PDF</span>
              </button>
            )}

            {reviewData?.exportExcelUrl ? (
              <a
                href={reviewData.exportExcelUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: '#FFFFFF',
                  color: '#059669',
                  border: '1px solid #A7F3D0',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <FileSpreadsheet size={14} />
                <span>تصدير Excel</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() =>
                  reviewData?.evaluationId &&
                  window.open(`/api/v1/evaluations/${reviewData.evaluationId}/export-excel`, '_blank')
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: '#FFFFFF',
                  color: '#059669',
                  border: '1px solid #A7F3D0',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <FileSpreadsheet size={14} />
                <span>تصدير Excel</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. بانرات الحوكمة الميدانية للحالات الثلاث */}

      {/* أ. بانر حالة NeedsCompletion (طلب استكمال مفتوح) */}
      {reviewData?.status === 'NeedsCompletion' && reviewData.openCompletionRequest && (
        <div
          style={{
            marginBottom: '16px',
            padding: '14px 18px',
            borderRadius: '10px',
            backgroundColor: '#FFFBEB',
            border: '1.5px solid #F59E0B',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} color="#D97706" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#92400E' }}>
                طلب استكمال رسمي مفتوح (طلب #{reviewData.openCompletionRequest.requestId})
              </div>
              <div style={{ fontSize: '12px', color: '#B45309', marginTop: '2px' }}>
                المدرسة بصدد معالجة {reviewData.openCompletionRequest.itemsCount} بنود محددة • المهلة النظامية:{' '}
                {reviewData.openCompletionRequest.deadline
                  ? new Date(reviewData.openCompletionRequest.deadline).toLocaleDateString('ar-YE')
                  : '14 يوماً'}{' '}
                (متبقي {reviewData.openCompletionRequest.daysRemaining} يوماً)
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onNavigate('completion-requests', {
                submissionId: activeSubmissionId,
                schoolId: reviewData.school.schoolId,
              })
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '6px',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span>متابعة سجل طلب الاستكمال</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ب. بانر حالة إعادة المراجعة بعد استكمال المدرسة (Re-Review Mode) */}
      {reviewData?.isReReview && reviewData?.status !== 'Completed' && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#F5F3FF',
            border: '1px solid #DDD6FE',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12px',
            color: '#5B21B6',
          }}
        >
          <RefreshCw size={16} color="#7C3AED" />
          <span>
            <strong>إعادة مراجعة نشطة:</strong> رفعت المدرسة الشواهد المحدثة استجابة لطلب الاستكمال السابق (محاولة تسليم رقم{' '}
            {reviewData.attemptNo}). يرجى تدقيق البنود المستوفاة وتحديد ما إذا كان الملف مؤهلاً للإغلاق.
          </span>
        </div>
      )}

      {/* ج. بانر حالة الملف المكتمل (Completed Lock Mode) */}
      {reviewData?.status === 'Completed' && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12px',
            color: '#065F46',
          }}
        >
          <CheckCircle2 size={16} color="#059669" />
          <span>
            <strong>ملف تقييم مكتمل:</strong> تم إغلاق المراجعة الإشرافية لهذا المخرج ونقل حالته إلى مكتمل (Completed) وفق قاعدة العمل BR-MIN-03. الملف مقفل بصيغة التوثيق والقراءة فقط.
          </span>
        </div>
      )}

      {error ? (
        <EmptySupervisionState
          isError={true}
          title="تعذر تحميل مخرج التقييم"
          description={error}
          actionText="إعادة المحاولة"
          onAction={refetch}
        />
      ) : (
        /* 3. تخطيط المراجعة بعمودين */
        <div
          className="supervision-review-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* العمود الأيمن: التبويبات، الفلاتر، المؤشرات الـ 109 */}
          <div>
            {/* التبويبات الثلاثة */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                borderBottom: '1px solid #E2E8F0',
                paddingBottom: '8px',
              }}
            >
              {[
                {
                  key: 'indicators',
                  label: 'عناصر التقييم والتقديرات',
                  count: reviewData?.summary?.totalElements ?? 109,
                  icon: Layers,
                },
                {
                  key: 'evidences',
                  label: 'ملفات الشواهد المرفقة',
                  count: reviewData?.summary?.attachedEvidencesCount ?? 0,
                  icon: FileText,
                },
                {
                  key: 'improvement-plan',
                  label: 'خطة تحسين الأداء',
                  count: reviewData?.improvementPlan?.actionsCount ?? 0,
                  icon: Target,
                },
              ].map((tab) => {
                const isActive = activeTab === tab.key;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as ReviewTabType)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? '#2563EB' : '#64748B',
                      backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                      border: isActive ? '1px solid #BFDBFE' : '1px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={16} color={isActive ? '#2563EB' : '#64748B'} />
                    <span>{tab.label}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: isActive ? '#2563EB' : '#E2E8F0',
                        color: isActive ? '#FFFFFF' : '#475569',
                        padding: '1px 6px',
                        borderRadius: '999px',
                      }}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* إشعار فرض صيغة القراءة فقط للمشرف (Read-Only Enforcement) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#64748B',
                marginBottom: '16px',
              }}
            >
              <Lock size={14} color="#64748B" />
              <span>
                <strong>وضع التدقيق الميداني:</strong> التقديرات والشواهد معروضة بصيغة القراءة فقط
                وفق قاعدة العمل BR-MIN-03. لتوجيه تعديل للمدرسة، يرجى رصد النواقص وتفعيل خيار الاستكمال.
              </span>
            </div>

            {/* محتوى تبويب المؤشرات والتقديرات */}
            {activeTab === 'indicators' && (
              <div>
                {/* أ. شريط التصفية بالمعايير الوطنية السبعة */}
                {standardsList.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      overflowX: 'auto',
                      paddingBottom: '8px',
                      marginBottom: '12px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedStandardId('all')}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: selectedStandardId === 'all' ? 800 : 600,
                        backgroundColor: selectedStandardId === 'all' ? '#2563EB' : '#F1F5F9',
                        color: selectedStandardId === 'all' ? '#FFFFFF' : '#475569',
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      كافة المعايير ({filterCounts.total})
                    </button>
                    {standardsList.map((std) => {
                      const isSelected = selectedStandardId === std.id;
                      return (
                        <button
                          key={std.id}
                          type="button"
                          onClick={() => setSelectedStandardId(std.id)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: isSelected ? 800 : 600,
                            backgroundColor: isSelected ? '#2563EB' : '#F1F5F9',
                            color: isSelected ? '#FFFFFF' : '#475569',
                            border: 'none',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {std.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* ب. الفلاتر السريعة وشريط البحث النصي */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    marginBottom: '14px',
                    backgroundColor: '#FFFFFF',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  {/* الفلاتر السريعة */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                    <Filter size={14} color="#64748B" />
                    {(
                      [
                        { key: 'all', label: 'الكل', count: filterCounts.total },
                        { key: 'defective', label: 'نواقص مرصودة', count: filterCounts.defective, highlight: true },
                        { key: 'missing-evidence', label: 'تقدير > 0 بدون شاهد', count: filterCounts.missingEvidence },
                        { key: 'low-score', label: 'مؤشرات متدنية (0-1)', count: filterCounts.lowScore },
                      ] as Array<{ key: QuickFilterType; label: string; count: number; highlight?: boolean }>
                    ).map((f) => {
                      const isSelected = quickFilter === f.key;
                      return (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => setQuickFilter(f.key)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: isSelected
                              ? '1px solid #2563EB'
                              : f.highlight && f.count > 0
                              ? '1px solid #FCD34D'
                              : '1px solid #CBD5E1',
                            backgroundColor: isSelected
                              ? '#EFF6FF'
                              : f.highlight && f.count > 0
                              ? '#FFFBEB'
                              : '#FFFFFF',
                            color: isSelected
                              ? '#1D4ED8'
                              : f.highlight && f.count > 0
                              ? '#92400E'
                              : '#475569',
                          }}
                        >
                          {f.label} ({f.count})
                        </button>
                      );
                    })}
                  </div>

                  {/* حقل البحث بالرمز أو العنوان */}
                  <div style={{ position: 'relative', minWidth: '180px' }}>
                    <Search
                      size={14}
                      color="#94A3B8"
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="بحث بالرمز أو العنوان..."
                      style={{
                        width: '100%',
                        padding: '5px 28px 5px 8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '11px',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* ج. قائمة المؤشرات المفلترة */}
                {filteredIndicators.length > 0 ? (
                  filteredIndicators.map((ind) => (
                    <IndicatorAuditRow
                      key={ind.indicatorId}
                      indicator={ind}
                      isDefective={defectiveItems.has(ind.indicatorId)}
                      onSaveDeficiency={(category, reason, directives) =>
                        saveDeficiency(ind, category, reason, directives)
                      }
                      onDeleteDeficiency={() => removeDeficiency(ind.indicatorId)}
                      onToggleDefect={() =>
                        toggleIndicatorDefect(
                          ind,
                          ind.defectReason || 'نقص وثيقة الشاهد الميداني ومحضر المعالجة',
                          ind.directives || 'يرجى استيفاء الشاهد المطلوب.'
                        )
                      }
                      isReadOnly={
                        reviewData?.status === 'Completed' ||
                        reviewData?.status === 'NeedsCompletion'
                      }
                    />
                  ))
                ) : (
                  <div
                    style={{
                      padding: '30px',
                      textAlign: 'center',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      color: '#64748B',
                      fontSize: '13px',
                    }}
                  >
                    لا توجد مؤشرات تطابق معايير الفلترة أو البحث الحالية.
                  </div>
                )}
              </div>
            )}

            {/* محتوى تبويب الشواهد */}
            {activeTab === 'evidences' && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '20px',
                }}
              >
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '14px' }}>
                  فهرس الشواهد الميدانية المرفقة ({reviewData?.summary?.attachedEvidencesCount ?? 0} وثيقة)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {reviewData?.indicators.flatMap((ind) =>
                    ind.evidences.map((ev) => (
                      <div
                        key={ev.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FileText size={18} color="#2563EB" />
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block' }}>
                              {ev.fileName}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748B' }}>
                              المؤشر: {ind.code} ({ind.standardName}) • الحجم: {ev.fileSizeFormatted}
                            </span>
                          </div>
                        </div>

                        {ev.fileUrl ? (
                          <a
                            href={ev.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#2563EB',
                              textDecoration: 'none',
                            }}
                          >
                            معاينة / تنزيل
                          </a>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>غير متوفر</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* محتوى تبويب خطة التحسين */}
            {activeTab === 'improvement-plan' && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '20px',
                }}
              >
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '14px' }}>
                  {reviewData?.improvementPlan?.title ?? 'خطة التحسين والتطوير المدرسي'}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
                  تتضمن الخطة {reviewData?.improvementPlan?.actionsCount ?? 0} أولويات لمعالجة فجوات الأداء:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(reviewData?.improvementPlan?.priorities ?? []).map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#0F172A',
                      }}
                    >
                      {idx + 1}. {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* العمود الأيسر: لوحة القرار الإشرافي */}
          <SupervisorDecisionPanel
            automatedChecks={
              reviewData?.automatedChecks ?? {
                rubricCompleteness: true,
                allEvidencesAttached: false,
                minEvidenceMet: true,
                flagsCount: 0,
              }
            }
            summary={reviewData?.summary}
            outputStatus={reviewData?.status}
            closedAt={reviewData?.closedAt}
            decisionMode={decisionMode}
            onSelectDecisionMode={setDecisionMode}
            supervisorNotes={supervisorNotes}
            onChangeNotes={setSupervisorNotes}
            defectiveCount={defectiveCount}
            onProceedToCompletion={handleProceedToCompletion}
            onCloseReview={handleCloseReview}
            isActionLoading={isActionLoading}
            actionSuccessMessage={actionSuccessMessage}
            actionErrorMessage={actionErrorMessage}
          />
        </div>
      )}
    </div>
  );
};
