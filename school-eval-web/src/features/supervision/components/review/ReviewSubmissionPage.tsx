/**
 * Component: ReviewSubmissionPage
 * الشاشة 3: استلام وفحص وتدقيق مخرجات التقييم المدرسي
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 */

import React from 'react';
import {
  ArrowRight,
  Download,
  Lock,
  FileText,
  Target,
  Layers,
} from 'lucide-react';
import { useSubmissionsReview, type ReviewTabType } from '../../hooks/useSubmissionsReview';
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
  submissionId = 101,
  schoolId: _schoolId = 104,
  onNavigate,
}) => {
  const {
    reviewData,
    error,
    refetch,
    activeTab,
    setActiveTab,
    decisionMode,
    setDecisionMode,
    supervisorNotes,
    setSupervisorNotes,
    defectiveItems,
    defectiveCount,
    toggleIndicatorDefect,
    handleApprove,
    isActionLoading,
    actionSuccessMessage,
    actionErrorMessage,
  } = useSubmissionsReview(submissionId);

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
      submissionId,
      schoolId: reviewData.school.schoolId,
      preloadedItems: preloaded,
    });
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* 1. الترويسة الرئيسية وسياق المدرسة */}
      <div style={{ marginBottom: '20px' }}>
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
            marginBottom: '8px',
          }}
        >
          <ArrowRight size={16} />
          <span>العودة إلى لوحة المتابعة الميدانية</span>
        </button>

        {/* شريط معلومات المخرج وحالة التسليم */}
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
                {reviewData?.school.schoolCode ?? 'SCH-104'}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#1D4ED8',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                {reviewData?.statusArabic ?? 'مرفوع للمراجعة الأولى'}
              </span>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {reviewData?.school.schoolName ?? 'مدرسة بلقيس النموذجية للبنات'}
            </h1>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              المرحلة: {reviewData?.school.educationalStage ?? 'أساسي / ثانوي (1-12)'} • مدير المدرسة:{' '}
              {reviewData?.school.principalName ?? 'أ. سعاد القاضي'} • تاريخ الرفع: 14 سبتمبر 2026
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => alert('جاري تنزيل حزمة مخرجات التقييم والشواهد (ZIP)...')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                backgroundColor: '#F8FAFC',
                color: '#334155',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Download size={16} />
              <span>تنزيل الحزمة (ZIP)</span>
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <EmptySupervisionState
          isError={true}
          title="تعذر تحميل مخرج التقييم"
          description={error}
          actionText="إعادة المحاولة"
          onAction={refetch}
        />
      ) : (
        /* 2. تخطيط المراجعة بعمودين */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* العمود الأيمن: التبويبات والمؤشرات والشواهد */}
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
                { key: 'indicators', label: 'عناصر التقييم والتقديرات', count: reviewData?.summary.totalElements ?? 56, icon: Layers },
                { key: 'evidences', label: 'ملفات الشواهد المرفقة', count: reviewData?.summary.attachedEvidencesCount ?? 48, icon: FileText },
                { key: 'improvement-plan', label: 'خطة تحسين الأداء', count: reviewData?.improvementPlan.actionsCount ?? 4, icon: Target },
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
                وفق قاعدة العمل BR-MIN-03. لتوجيه تعديل، يرجى تفعيل خيار الاستكمال.
              </span>
            </div>

            {/* محتوى التبويب */}
            {activeTab === 'indicators' && (
              <div>
                {reviewData?.indicators.map((ind) => (
                  <IndicatorAuditRow
                    key={ind.indicatorId}
                    indicator={ind}
                    isDefective={defectiveItems.has(ind.indicatorId)}
                    onToggleDefect={() =>
                      toggleIndicatorDefect(
                        ind,
                        ind.defectReason || 'نقص وثيقة الشاهد الميداني ومحضر المعالجة',
                        ind.directives || 'يرجى استيفاء الشاهد المطلوب.'
                      )
                    }
                  />
                ))}
              </div>
            )}

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
                  فهرس الشواهد الميدانية المرفقة ({reviewData?.summary.attachedEvidencesCount} وثيقة)
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
                              المؤشر: {ind.code} • الحجم: {ev.fileSizeFormatted}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => alert(`معاينة الملف: ${ev.fileName}`)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#2563EB',
                            cursor: 'pointer',
                          }}
                        >
                          معاينة الشاهد
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

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
                  {reviewData?.improvementPlan.title}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
                  تتضمن الخطة {reviewData?.improvementPlan.actionsCount} أولويات معتمدة لمعالجة فجوات الأداء:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {reviewData?.improvementPlan.priorities.map((item, idx) => (
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
                flagsCount: 2,
              }
            }
            decisionMode={decisionMode}
            onSelectDecisionMode={setDecisionMode}
            supervisorNotes={supervisorNotes}
            onChangeNotes={setSupervisorNotes}
            defectiveCount={defectiveCount}
            onProceedToCompletion={handleProceedToCompletion}
            onApproveReview={handleApprove}
            isActionLoading={isActionLoading}
            actionSuccessMessage={actionSuccessMessage}
            actionErrorMessage={actionErrorMessage}
          />
        </div>
      )}
    </div>
  );
};
