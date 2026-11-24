/**
 * Component: CreateCompletionRequestPage
 * الشاشة 5: مركز إدارة ومتابعة طلبات الاستكمال والفك الجزئي للمؤشرات (Partial Unlock Hub)
 * منصة ارتقاء للتقييم والتحسين المدرسي
 * يتضمن تبويبين:
 * 1. سجل ومتابعة طلبات الاستكمال (Tracker)
 * 2. صياغة وإصدار طلب استكمال موجه (Composer)
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Send,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  FileText,
  Clock,
  ShieldAlert,
  Plus,
} from 'lucide-react';
import { useCompletionManagement } from '../../hooks/useCompletionManagement';
import { useSubmissionsReview } from '../../hooks/useSubmissionsReview';
import { supervisionApi } from '../../api/supervisionApi';
import { CompletionGovernanceBox } from './CompletionGovernanceBox';
import { CompletionItemsSelector } from './CompletionItemsSelector';
import { CompletionRequestsTrackerTab } from './CompletionRequestsTrackerTab';
import type {
  SupervisionScreenKey,
  PreloadedCompletionItem,
  ReviewableSubmissionItem,
} from '../../api/supervisionTypes';

interface CreateCompletionRequestPageProps {
  submissionId?: number;
  schoolId?: number;
  preloadedItems?: PreloadedCompletionItem[];
  onNavigate: (
    screen: SupervisionScreenKey,
    params?: {
      submissionId?: number;
      schoolId?: number;
      preloadedItems?: PreloadedCompletionItem[];
      targetTab?: string;
    }
  ) => void;
}

export const CreateCompletionRequestPage: React.FC<CreateCompletionRequestPageProps> = ({
  submissionId: initialSubmissionId,
  schoolId: initialSchoolId,
  preloadedItems,
  onNavigate,
}) => {
  // التبويب النشط: إذا تم التحويل بطلب أو مخرج معين يتم فتح الصياغة، عدا ذلك يفتح سجل المتابعة
  const [activeTab, setActiveTab] = useState<'tracker' | 'composer'>(() => {
    return preloadedItems && preloadedItems.length > 0 ? 'composer' : 'tracker';
  });

  useEffect(() => {
    if (preloadedItems && preloadedItems.length > 0) {
      setActiveTab('composer');
    }
  }, [preloadedItems]);

  const [currentSubmissionId, setCurrentSubmissionId] = useState<number | undefined>(
    initialSubmissionId
  );
  const [currentSchoolId, setCurrentSchoolId] = useState<number | undefined>(initialSchoolId);

  // قائمة المدارس / المخرجات المتاحة للاختيار في حال الدخول المباشر
  const [availableSubmissions, setAvailableSubmissions] = useState<ReviewableSubmissionItem[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState<boolean>(false);

  // جلب مراجعة المخرج المحدد
  const { reviewData } = useSubmissionsReview(currentSubmissionId);

  // خطاف إدارة الاستكمال
  const {
    items,
    setItemsList,
    itemsCount,
    notes,
    setNotes,
    deadlineDays,
    updateDeadlineDays,
    deadlineDate,
    setDeadlineDate,
    removeItem,
    updateItem,
    handleSendRequest,
    isSubmitting,
    errorMessage,
    setErrorMessage,
    successMessage,
  } = useCompletionManagement(currentSubmissionId, preloadedItems, () => {
    // نجاح الإرسال: التحويل التلقائي لتبويب المتابعة بعد ثانيتين
    setTimeout(() => {
      setActiveTab('tracker');
    }, 2000);
  });

  // جلب قائمة المخرجات المؤهلة في حال لم يُمرر معرف مسبق
  useEffect(() => {
    const fetchAvailable = async () => {
      setIsLoadingAvailable(true);
      try {
        const list = await supervisionApi.getReviewableSubmissions();
        setAvailableSubmissions(list || []);

        // إذا لم يكن هناك مخرج محدد مسبقاً، اختر أول مخرج مؤهل للاستكمال
        if (!currentSubmissionId && list && list.length > 0) {
          const firstEligible =
            list.find((s) => s.status === 'Submitted' || s.status === 'UnderReview') || list[0];
          setCurrentSubmissionId(firstEligible.submissionId);
          setCurrentSchoolId(firstEligible.schoolId);
        }
      } catch (err) {
        console.error('Failed to load available submissions:', err);
      } finally {
        setIsLoadingAvailable(false);
      }
    };

    fetchAvailable();
  }, []);

  // المزامنة التلقائية للنواقص المرصودة مسبقاً من الشاشة 4 إذا كانت القائمة فارغة
  useEffect(() => {
    if (
      (!items || items.length === 0) &&
      (!preloadedItems || preloadedItems.length === 0) &&
      reviewData?.deficienciesList &&
      reviewData.deficienciesList.length > 0
    ) {
      const mappedItems: PreloadedCompletionItem[] = reviewData.deficienciesList.map((def) => ({
        indicatorId: def.indicatorId,
        code: def.indicatorCode,
        title: def.indicatorTitle,
        defectReason: def.note || def.category || 'نقص في الشاهد أو المبرر',
        grantedPermission: 'استبدال / رفع الشاهد والمبرر',
        directives: def.directives || 'يرجى استيفاء الشاهد المطلوب والمبررات الرسمية.',
        evidenceLinkId: null,
      }));
      setItemsList(mappedItems);
    }
  }, [reviewData?.deficienciesList]);

  // بيانات المدرسة الحالية
  const schoolName = reviewData?.school?.schoolName || 'مدرسة التقييم';
  const schoolCode = reviewData?.school?.schoolCode || (currentSchoolId ? `SCH-${currentSchoolId}` : '—');
  const attemptNo = reviewData?.attemptNo || 1;

  // الحواجز الحوكمية (BR-MIN-02)
  const isAttemptCapReached = attemptNo >= 3;
  const hasExistingOpenRequest = !!reviewData?.openCompletionRequest;

  // نهاية الدورة التقييمية لتقييد تاريخ المهلة
  const cycleEndDate = (reviewData as any)?.cycleEndDate || null;

  // سقف مهلة الاستكمال من الدورة التقييمية (الافتراضي: 14 يوماً وفق الحوكمة)
  const maxAllowedDays: number = (reviewData as any)?.cycleMaxCompletionDays || 14;
  const todayStr = new Date().toISOString().split('T')[0];
  const maxAllowedDateStr = new Date(Date.now() + maxAllowedDays * 86400000).toISOString().split('T')[0];
  const effectiveMaxDeadline = cycleEndDate
    ? (new Date(cycleEndDate) < new Date(maxAllowedDateStr) ? cycleEndDate.split('T')[0] : maxAllowedDateStr)
    : maxAllowedDateStr;

  const handleSchoolChange = (newSubmissionId: number) => {
    const selected = availableSubmissions.find((s) => s.submissionId === newSubmissionId);
    if (selected) {
      setCurrentSubmissionId(selected.submissionId);
      setCurrentSchoolId(selected.schoolId);
      setErrorMessage(null);
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1360px', margin: '0 auto' }}>
      {/* 1. الترويسة الرئيسية والتبويبات العليا */}
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#D97706',
                  backgroundColor: '#FEF3C7',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                الشاشة رقم 5
              </span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                مركز إدارة ومتابعة طلبات الاستكمال (Partial Unlock Hub)
              </span>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
              طلبات الاستكمال والفك الجزئي للمؤشرات
            </h1>
          </div>

          {/* التبديل بين التبويبين */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#F1F5F9',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('tracker')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'tracker' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'tracker' ? '#0F172A' : '#64748B',
                fontWeight: activeTab === 'tracker' ? 800 : 600,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: activeTab === 'tracker' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <FileText size={16} color={activeTab === 'tracker' ? '#2563EB' : '#64748B'} />
              <span>سجل ومتابعة طلبات الاستكمال</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('composer')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'composer' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'composer' ? '#0F172A' : '#64748B',
                fontWeight: activeTab === 'composer' ? 800 : 600,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: activeTab === 'composer' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Plus size={16} color={activeTab === 'composer' ? '#D97706' : '#64748B'} />
              <span>صياغة وإصدار طلب استكمال موجه</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. محتوى التبويب الأول: سجل ومتابعة طلبات الاستكمال */}
      {activeTab === 'tracker' && (
        <CompletionRequestsTrackerTab
          onNavigateToComposer={() => setActiveTab('composer')}
          onNavigateToReview={(subId, schId) => {
            onNavigate('submissions', { submissionId: subId, schoolId: schId });
          }}
        />
      )}

      {/* 3. محتوى التبويب الثاني: صياغة وإصدار طلب استكمال موجه */}
      {activeTab === 'composer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* زر الرجوع لمراجعة المخرج ومحدد المدرسة المستهدفة */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
            }}
          >
            {currentSubmissionId && currentSchoolId ? (
              <button
                type="button"
                onClick={() =>
                  onNavigate('submissions', {
                    submissionId: currentSubmissionId,
                    schoolId: currentSchoolId,
                  })
                }
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
                <span>العودة إلى مراجعة المخرج ({schoolName})</span>
              </button>
            ) : (
              <div />
            )}

            {/* القائمة المنسدلة لاختيار المدرسة المؤهلة */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                المدرسة المستهدفة:
              </span>
              <select
                value={currentSubmissionId || ''}
                onChange={(e) => handleSchoolChange(Number(e.target.value))}
                disabled={isLoadingAvailable || isSubmitting}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0F172A',
                  outline: 'none',
                  cursor: 'pointer',
                  minWidth: '240px',
                }}
              >
                {availableSubmissions.map((sub) => (
                  <option key={sub.submissionId} value={sub.submissionId}>
                    {sub.schoolName} ({sub.schoolCode}) — المحاولة {sub.attemptNo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* بطاقة معلومات المدرسة والمهلة المحددة وسياق المحاولة */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '18px 22px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#D97706',
                    backgroundColor: '#FEF3C7',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  طلب استكمال رسمي موجه
                </span>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: attemptNo >= 3 ? '#DC2626' : attemptNo === 2 ? '#B45309' : '#1D4ED8',
                    backgroundColor: attemptNo >= 3 ? '#FEE2E2' : attemptNo === 2 ? '#FEF3C7' : '#EFF6FF',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {attemptNo === 1
                    ? 'محاولة التسليم رقم (1 من 3) — التقييم الأساسي (متاح طلبان للاستكمال كحد أقصى في هذه الدورة)'
                    : attemptNo === 2
                    ? 'محاولة التسليم رقم (2 من 3) — إعادة التقييم الأولى (متاح طلب استكمال إضافي واحد كحد أقصى)'
                    : 'محاولة التسليم رقم (3 من 3) — المحاولة النهائية (تم استنفاد سقف طلبات الاستكمال وفق BR-MIN-02)'}
                </span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>• {schoolCode}</span>
              </div>
              <h2 style={{ fontSize: '19px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                {schoolName} — إصدار طلب استكمال نواقص التقييم
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', margin: 0 }}>
                سيتم فك الحظر الجزئي عن {itemsCount} مؤشرات فقط، بينما يظل باقي المؤشرات الـ (
                {Math.max(0, 109 - itemsCount)}) مقفلاً بصيغة القراءة فقط.
              </p>
            </div>

            {/* محدد المهلة النظامية المقيد بسقف الدورة */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                padding: '12px 18px',
                borderRadius: '10px',
                maxWidth: '460px',
              }}
            >
              <Calendar size={22} color="#D97706" style={{ flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: '11px', color: '#92400E', fontWeight: 700, display: 'block' }}>
                  مهلة الاستجابة المحددة للمدرسة
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <input
                    type="date"
                    value={deadlineDate}
                    min={todayStr}
                    max={effectiveMaxDeadline}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val > effectiveMaxDeadline) {
                        setDeadlineDate(effectiveMaxDeadline);
                      } else {
                        setDeadlineDate(val);
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#B45309',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {maxAllowedDays >= 7 && (
                      <button
                        type="button"
                        onClick={() => updateDeadlineDays(7)}
                        style={{
                          padding: '3px 7px',
                          borderRadius: '4px',
                          border: '1px solid #FCD34D',
                          backgroundColor: deadlineDays === 7 ? '#FCD34D' : '#FFFFFF',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        7 أيام
                      </button>
                    )}
                    {maxAllowedDays >= 14 && (
                      <button
                        type="button"
                        onClick={() => updateDeadlineDays(14)}
                        style={{
                          padding: '3px 7px',
                          borderRadius: '4px',
                          border: '1px solid #FCD34D',
                          backgroundColor: deadlineDays === 14 ? '#FCD34D' : '#FFFFFF',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        14 يوماً
                      </button>
                    )}
                    {maxAllowedDays !== 7 && maxAllowedDays !== 14 && (
                      <button
                        type="button"
                        onClick={() => updateDeadlineDays(maxAllowedDays)}
                        style={{
                          padding: '3px 7px',
                          borderRadius: '4px',
                          border: '1px solid #FCD34D',
                          backgroundColor: deadlineDays === maxAllowedDays ? '#FCD34D' : '#FFFFFF',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {maxAllowedDays} يوم (الحد الأقصى)
                      </button>
                    )}
                  </div>
                </div>
                <span
                  style={{
                    display: 'block',
                    fontSize: '10.5px',
                    color: '#B45309',
                    marginTop: '4px',
                    lineHeight: 1.4,
                  }}
                >
                  الحد الأقصى لمهلة طلب الاستكمال المعتمد في هذه الدورة هو {maxAllowedDays} يوماً (أو تاريخ إغلاق الدورة أيهما أقرب)، ولتعديل الحد الأقصى يتم ذلك من إعدادات الدورة التقييمية.
                </span>
              </div>
            </div>
          </div>

          {/* تنبيه حاكمي: بلوغ سقف الـ 3 محاولات (BR-MIN-02) */}
          {isAttemptCapReached && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 20px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '10px',
                color: '#991B1B',
              }}
            >
              <ShieldAlert size={22} color="#DC2626" />
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 2px 0' }}>
                  تنبيه حوكمي: استنفاد الحد الأقصى للمحاولات (3 محاولات)
                </h4>
                <p style={{ fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
                  وفقاً لسياسة الحوكمة النظامية لمنصة ارتقاء، بلغت هذه المدرسة المحاولة {attemptNo}.
                  يُحظر إصدار طلب استكمال جديد، ويجب حسم المراجعة بالقرار النهائي المناسب من شاشة المراجعة.
                </p>
              </div>
            </div>
          )}

          {/* تنبيه: وجود طلب استكمال مفتوح بالفعل */}
          {hasExistingOpenRequest && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '16px 20px',
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '10px',
                color: '#92400E',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={20} color="#D97706" />
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, margin: '0 0 2px 0' }}>
                    يوجد طلب استكمال مفتوح حالياً لهذه المدرسة
                  </h4>
                  <p style={{ fontSize: '12px', margin: 0 }}>
                    الطلب #{reviewData?.openCompletionRequest?.requestId} لا يزال قيد الاستيفاء بالمدرسة
                    (متبقي {reviewData?.openCompletionRequest?.daysRemaining} يوم). يُمنع تكرار إصدار الطلبات.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('tracker')}
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #FCD34D',
                  borderRadius: '6px',
                  color: '#B45309',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                متابعة الطلب في السجل
              </button>
            </div>
          )}

          {/* رسائل النجاح والخطأ */}
          {successMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 18px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '10px',
                color: '#065F46',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              <CheckCircle2 size={20} color="#059669" />
              <span>{successMessage} جاري تحويلك إلى سجل المتابعة...</span>
            </div>
          )}

          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 18px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '10px',
                color: '#991B1B',
                fontSize: '13px',
              }}
            >
              <AlertTriangle size={20} color="#DC2626" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* صندوق حاكمية الفك الجزئي والـ 109 مؤشرات */}
          <CompletionGovernanceBox
            unlockedCount={itemsCount}
            totalIndicators={109}
            deadlineDays={deadlineDays}
          />

          {/* محدد ومحرر بنود الاستكمال مع الربط المباشر بشجرة المعايير في الشاشة 4 */}
          <CompletionItemsSelector
            items={items}
            onNavigateToStandardsTree={() => {
              onNavigate('submissions', {
                submissionId: currentSubmissionId,
                schoolId: currentSchoolId,
                targetTab: 'standards-tree',
              });
            }}
            onRemoveItem={removeItem}
            onUpdateItem={updateItem}
          />

          {/* التوجيهات الختامية لإدارة المدرسة */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
              توجيهات ختامية لإدارة المدرسة ولجنة التقييم الذاتي
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px' }}>
              هذه التوجيهات ستظهر بشكل بارز في أعلى بوابة التقييم الذاتي لحساب المدرسة فور إرسال الطلب
            </p>

            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting || isAttemptCapReached}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                color: '#0F172A',
                outline: 'none',
                lineHeight: 1.6,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* أزرار الإجراءات السفلية */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '20px',
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('tracker')}
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#64748B',
                backgroundColor: '#F1F5F9',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              إلغاء والعودة لسجل المتابعة
            </button>

            <button
              type="button"
              onClick={() => handleSendRequest()}
              disabled={isSubmitting || isAttemptCapReached || hasExistingOpenRequest || !!successMessage}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 28px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 800,
                color: '#FFFFFF',
                backgroundColor:
                  isSubmitting || isAttemptCapReached || hasExistingOpenRequest
                    ? '#94A3B8'
                    : '#D97706',
                border: 'none',
                cursor:
                  isSubmitting || isAttemptCapReached || hasExistingOpenRequest
                    ? 'not-allowed'
                    : 'pointer',
                boxShadow:
                  isAttemptCapReached || hasExistingOpenRequest
                    ? 'none'
                    : '0 4px 12px rgba(217, 119, 6, 0.3)',
                transition: 'background-color 0.15s ease',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جاري إرسال الطلب للمدرسة...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>إرسال طلب الاستكمال للمدرسة رسمياً</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
