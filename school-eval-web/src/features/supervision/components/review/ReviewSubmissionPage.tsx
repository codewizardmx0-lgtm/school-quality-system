/**
 * Component: ReviewSubmissionPage
 * الشاشة 4: مركز استلام ومراجعة وتدقيق مخرجات التقييم المدرسي
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 * 
 * متوافقة 100% مع:
 * - FR-SUP-03..11, UC-SUP-03, BR-MIN-02, BR-MIN-03, BR-SCH-03
 * - عرض كامل 100% (Full-Width Layout) بدون العمود الجانبي الضيق
 * - شريط علوي مدمج لاختيار المدارس المستلم مخرجاتها مع مزامنة القائمة الجانبية تلقائياً
 * - 4 تبويبات رئيسية عريضة وشاملة:
 *   1. شجرة المعايير والتقييم الذاتي (109 مؤشرات مع واصفات الروبك الرباعية ورصد النواقص)
 *   2. مستودع وجرد الشواهد الميدانية (إحصائيات الوثائق الفريدة الحقيقية، خزانة الوثائق، وجرد الشواهد)
 *   3. خطة تحسين الأداء المدرسية (مجالات التحسين، الفجوة المعيارية، جدول الإجراءات التنفيذية)
 *   4. نتائج الفحص الآلي والقرار الإشرافي (الفحص الآلي، سجل النواقص، ضوابط الحوكمة، خيارات القرار)
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  ChevronRight,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  AlertTriangle,
  Layers,
  FolderGit2,
  TrendingUp,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { supervisionApi } from '../../api/supervisionApi';
import { useSubmissionsReview } from '../../hooks/useSubmissionsReview';
import { SupervisionStandardsTreeTab } from './SupervisionStandardsTreeTab';
import { SupervisionEvidenceVaultTab } from './SupervisionEvidenceVaultTab';
import { SupervisionImprovementPlanTab } from './SupervisionImprovementPlanTab';
import { SupervisionDecisionTab } from './SupervisionDecisionTab';
import { EmptySupervisionState } from '../common/EmptySupervisionState';
import type { SupervisionScreenKey } from '../../api/supervisionTypes';

interface ReviewSubmissionPageProps {
  submissionId?: number;
  schoolId?: number;
  onSelectSchool?: (schoolId: number, schoolName: string) => void;
  onNavigate: (
    screen: SupervisionScreenKey,
    params?: { submissionId?: number; schoolId?: number; preloadedItems?: any[] }
  ) => void;
}

export const ReviewSubmissionPage: React.FC<ReviewSubmissionPageProps> = ({
  submissionId,
  schoolId: _schoolId,
  onSelectSchool,
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
  } = useSubmissionsReview(submissionId);

  // التبويب النشط (افتراضياً: شجرة المعايير)
  const [activeTab, setActiveTab] = useState<'standards' | 'vault' | 'plan' | 'decision'>('standards');
  const [targetIndicatorId, setTargetIndicatorId] = useState<number | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // الانتقال المباشر للمؤشر في شجرة المعايير
  const handleNavigateToIndicator = (indicatorId: number) => {
    setActiveTab('standards');
    setTargetIndicatorId(indicatorId);
  };

  // تصدير PDF مصادق
  const handleExportPdf = async () => {
    if (!reviewData) return;
    setIsExportingPdf(true);
    try {
      await supervisionApi.exportEvaluationPdf(reviewData.evaluationId, reviewData.school?.schoolName);
    } catch (e: any) {
      alert(e?.message || 'تعذر تصدير تقرير التقييم PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // تصدير Excel مصادق
  const handleExportExcel = async () => {
    if (!reviewData) return;
    setIsExportingExcel(true);
    try {
      await supervisionApi.exportEvaluationExcel(reviewData.evaluationId, reviewData.school?.schoolName);
    } catch (e: any) {
      alert(e?.message || 'تعذر تصدير سجل التقييم Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // مزامنة المدرسة المختارة مع الشريط الجانبي والـ Layout
  useEffect(() => {
    if (reviewData?.school && onSelectSchool) {
      onSelectSchool(
        reviewData.school.schoolId,
        reviewData.school.schoolName || 'مدرسة التقييم'
      );
    }
  }, [reviewData?.school?.schoolId, reviewData?.school?.schoolName, onSelectSchool]);

  // حالة عدم وجود أي مخرجات متاحة للمراجعة
  if (!isLoadingAvailable && availableSubmissions.length === 0 && !reviewData && !isLoading) {
    return (
      <div style={{ padding: '32px', maxWidth: '1440px', margin: '0 auto' }}>
        <EmptySupervisionState
          title="لا توجد مخرجات تقييم مرفوعة حالياً للمراجعة"
          description="لم تقم أي مدرسة برفع مخرج تقييمها الذاتي في نطاقك الجغرافي حتى الآن، أو أن كافة المدارس ما زالت في مرحلة المسودة والإعداد الميداني."
          actionText="العودة للوحة المتابعة المركزية"
          onAction={() => onNavigate('dashboard')}
        />
      </div>
    );
  }

  // حالة التحميل الأولي
  if (isLoading && !reviewData) {
    return (
      <div style={{ padding: '32px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ height: '70px', borderRadius: '12px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
        <div style={{ height: '54px', borderRadius: '10px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
        <div style={{ height: '360px', borderRadius: '12px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
      </div>
    );
  }

  // حالة حدوث خطأ
  if (error && !reviewData) {
    return (
      <div style={{ padding: '32px', maxWidth: '1440px', margin: '0 auto' }}>
        <div
          style={{
            padding: '24px',
            borderRadius: '12px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            <AlertTriangle size={18} />
            <span>تعذر تحميل مخرج التقييم المطلوب</span>
          </div>
          <p style={{ margin: 0, fontSize: '13px' }}>{error}</p>
          <button
            type="button"
            onClick={refetch}
            style={{
              alignSelf: 'flex-start',
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px',
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!reviewData) return null;

  const school = reviewData.school;
  const status = reviewData.status;
  const isReReview = reviewData.isReReview || reviewData.attemptNo > 1;
  const attemptNo = reviewData.attemptNo || 1;
  const deficienciesCount = reviewData.deficienciesCount || 0;

  // شارة حالة المخرج
  const statusConfig = {
    Completed: { label: 'مكتمل المراجعة', bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' },
    NeedsCompletion: { label: 'يحتاج استكمال', bg: '#FEF3C7', text: '#B45309', border: '#FCD34D' },
    Submitted: { label: 'مرفوع جديد', bg: '#EFF6FF', text: '#1D4ED8', border: '#93C5FD' },
    UnderReview: { label: 'قيد التدقيق الإشرافي', bg: '#F5F3FF', text: '#6D28D9', border: '#C4B5FD' },
    Draft: { label: 'مسودة', bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
  }[status] || { label: status, bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. مسار التصفح (Breadcrumb) وأدوات التصدير */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#2563EB',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            لوحة المتابعة المركزية
          </button>
          <ChevronRight size={14} />
          <span style={{ color: '#1E293B', fontWeight: 700 }}>
            مركز استلام ومراجعة المخرجات
          </span>
        </div>

        {/* أزرار التصدير وتحديث البيانات */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={refetch}
            title="تحديث بيانات المخرج"
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#475569',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={13} />
            تحديث
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#1E293B',
              cursor: isExportingPdf ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              opacity: isExportingPdf ? 0.7 : 1,
            }}
          >
            {isExportingPdf ? (
              <Loader2 size={14} className="animate-spin" color="#DC2626" />
            ) : (
              <FileText size={14} color="#DC2626" />
            )}
            {isExportingPdf ? 'جارِ التصدير...' : 'تصدير تقرير الجودة (PDF)'}
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#1E293B',
              cursor: isExportingExcel ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              opacity: isExportingExcel ? 0.7 : 1,
            }}
          >
            {isExportingExcel ? (
              <Loader2 size={14} className="animate-spin" color="#16A34A" />
            ) : (
              <FileSpreadsheet size={14} color="#16A34A" />
            )}
            {isExportingExcel ? 'جارِ التصدير...' : 'تصدير سجل المراجعة (Excel)'}
          </button>
        </div>
      </div>

      {/* 2. الشريط العلوي المدمج: اختيار المدرسة والبيانات التعريفية والشارات */}
      <div
        style={{
          padding: '18px 24px',
          borderRadius: '14px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '320px' }}>
          {/* القائمة المنسدلة لاختيار المدرسة من المخرجات المتاحة */}
          {availableSubmissions.length > 1 ? (
            <div style={{ position: 'relative', minWidth: '280px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#64748B',
                  marginBottom: '3px',
                }}
              >
                المدرسة المعروضة حالياً للمراجعة:
              </label>
              <select
                value={activeSubmissionId ?? ''}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val) {
                    selectSubmission(val);
                    const found = availableSubmissions.find((s) => s.submissionId === val);
                    if (found && onSelectSchool) {
                      onSelectSchool(found.schoolId, found.schoolName);
                    }
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #2563EB',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0F172A',
                  backgroundColor: '#EFF6FF',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {availableSubmissions.map((sub) => (
                  <option key={sub.submissionId} value={sub.submissionId}>
                    {sub.schoolName} ({sub.schoolCode}) — [{sub.statusArabic}]
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Building2 size={24} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                  {school.schoolName}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '3px', fontSize: '12px', color: '#64748B' }}>
                  <span>رمز المدرسة: <strong>{school.schoolCode}</strong></span>
                  <span>المرحلة: <strong>{school.educationalStage}</strong></span>
                  <span>المحافظة: <strong>{school.governorate}</strong></span>
                  <span>المديرية: <strong>{school.directorate}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* تفاصيل المدرسة إن كانت القائمة المنسدلة ظاهرة */}
          {availableSubmissions.length > 1 && (
            <div style={{ borderRight: '1px solid #E2E8F0', paddingRight: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>
                {school.schoolName}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                {school.educationalStage} · {school.directorate} ({school.governorate}) · المدير: {school.principalName}
              </div>
            </div>
          )}
        </div>

        {/* الشارات والحالة */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* شارة إعادة المراجعة إن كانت المحاولة > 1 */}
          {isReReview && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 800,
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                border: '1.5px solid #93C5FD',
              }}
            >
              <RefreshCw size={13} />
              إعادة مراجعة (المحاولة {attemptNo})
            </span>
          )}

          {/* شارة الحالة الرسمية للمخرج */}
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 800,
              backgroundColor: statusConfig.bg,
              color: statusConfig.text,
              border: `1px solid ${statusConfig.border}`,
            }}
          >
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* 3. شريط التبويبات الأربعة الرئيسية (عرض 100%) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          backgroundColor: '#F1F5F9',
          padding: '4px',
          borderRadius: '12px',
          gap: '4px',
        }}
      >
        {/* التبويب 1 */}
        <button
          type="button"
          onClick={() => setActiveTab('standards')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: '9px',
            fontSize: '13px',
            fontWeight: 700,
            color: activeTab === 'standards' ? '#1D4ED8' : '#475569',
            backgroundColor: activeTab === 'standards' ? '#FFFFFF' : 'transparent',
            boxShadow: activeTab === 'standards' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Layers size={16} color={activeTab === 'standards' ? '#2563EB' : '#64748B'} />
          <span>شجرة المعايير والتقييم الذاتي</span>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '10px',
              backgroundColor: activeTab === 'standards' ? '#DBEAFE' : '#E2E8F0',
              color: activeTab === 'standards' ? '#1E40AF' : '#64748B',
              fontWeight: 700,
            }}
          >
            109
          </span>
        </button>

        {/* التبويب 2 */}
        <button
          type="button"
          onClick={() => setActiveTab('vault')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: '9px',
            fontSize: '13px',
            fontWeight: 700,
            color: activeTab === 'vault' ? '#1D4ED8' : '#475569',
            backgroundColor: activeTab === 'vault' ? '#FFFFFF' : 'transparent',
            boxShadow: activeTab === 'vault' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <FolderGit2 size={16} color={activeTab === 'vault' ? '#2563EB' : '#64748B'} />
          <span>مستودع وجرد الشواهد الميدانية</span>
          {reviewData.vault?.stats?.totalDocuments !== undefined && (
            <span
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '10px',
                backgroundColor: activeTab === 'vault' ? '#DBEAFE' : '#E2E8F0',
                color: activeTab === 'vault' ? '#1E40AF' : '#64748B',
                fontWeight: 700,
              }}
            >
              {reviewData.vault.stats.totalDocuments}
            </span>
          )}
        </button>

        {/* التبويب 3 */}
        <button
          type="button"
          onClick={() => setActiveTab('plan')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: '9px',
            fontSize: '13px',
            fontWeight: 700,
            color: activeTab === 'plan' ? '#1D4ED8' : '#475569',
            backgroundColor: activeTab === 'plan' ? '#FFFFFF' : 'transparent',
            boxShadow: activeTab === 'plan' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <TrendingUp size={16} color={activeTab === 'plan' ? '#2563EB' : '#64748B'} />
          <span>خطة تحسين الأداء المدرسية</span>
          {(reviewData.planDetails?.stats?.totalActions ?? reviewData.improvementPlan?.actionsCount) !== undefined && (
            <span
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '10px',
                backgroundColor: activeTab === 'plan' ? '#DBEAFE' : '#E2E8F0',
                color: activeTab === 'plan' ? '#1E40AF' : '#64748B',
                fontWeight: 700,
              }}
            >
              {reviewData.planDetails?.stats?.totalActions ?? reviewData.improvementPlan?.actionsCount}
            </span>
          )}
        </button>

        {/* التبويب 4 */}
        <button
          type="button"
          onClick={() => setActiveTab('decision')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: '9px',
            fontSize: '13px',
            fontWeight: 700,
            color: activeTab === 'decision' ? '#1D4ED8' : '#475569',
            backgroundColor: activeTab === 'decision' ? '#FFFFFF' : 'transparent',
            boxShadow: activeTab === 'decision' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <ShieldCheck size={16} color={activeTab === 'decision' ? '#2563EB' : '#64748B'} />
          <span>نتائج الفحص والقرار الإشرافي</span>
          {deficienciesCount > 0 && (
            <span
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '10px',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                fontWeight: 800,
              }}
            >
              {deficienciesCount} نقص
            </span>
          )}
        </button>
      </div>

      {/* 4. محتوى التبويب المختار */}
      <div>
        {activeTab === 'standards' && (
          <SupervisionStandardsTreeTab
            standards={reviewData.standards || []}
            evaluationId={reviewData.evaluationId}
            submissionId={reviewData.submissionId}
            isReadOnly={status === 'Completed'}
            onDeficiencyUpdated={refetch}
            targetIndicatorId={targetIndicatorId}
          />
        )}

        {activeTab === 'vault' && (
          <SupervisionEvidenceVaultTab
            vault={reviewData.vault}
            evidenceInventory={reviewData.evidenceInventory}
            standards={reviewData.standards || []}
          />
        )}

        {activeTab === 'plan' && (
          <SupervisionImprovementPlanTab
            planDetails={reviewData.planDetails}
            plans={reviewData.plans || reviewData.allPlans || (reviewData.planDetails ? [reviewData.planDetails] : [])}
            lowIndicatorsMatrix={reviewData.lowIndicatorsMatrix}
            indicatorsAudit={reviewData.indicators}
            onNavigateToIndicator={handleNavigateToIndicator}
          />
        )}

        {activeTab === 'decision' && (
          <SupervisionDecisionTab
            data={reviewData}
            evaluationId={reviewData.evaluationId}
            submissionId={reviewData.submissionId}
            onDecisionSuccess={() => {
              refetch();
            }}
            onNavigateToCompletionRequest={() => {
              onNavigate('completion-requests', {
                submissionId: reviewData.submissionId,
                schoolId: reviewData.school.schoolId,
                preloadedItems: reviewData.deficienciesList?.map((d) => ({
                  indicatorId: d.indicatorId,
                  code: d.indicatorCode,
                  title: d.indicatorTitle,
                  defectReason: d.note,
                  grantedPermission: 'UploadEvidence',
                  directives: d.directives || 'استيفاء الوثائق والشواهد اللازمة وفق أداة التحقق المقررة.',
                })),
              });
            }}
          />
        )}
      </div>
    </div>
  );
};
