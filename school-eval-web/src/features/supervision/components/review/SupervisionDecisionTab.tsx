import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Target,
  BarChart3,
  Lock,
  ArrowRight,
  Send,
  Info,
  Clock,
} from 'lucide-react';
import type { SubmissionReviewData } from '../../api/supervisionTypes';
import { supervisionApi } from '../../api/supervisionApi';

interface SupervisionDecisionTabProps {
  data: SubmissionReviewData;
  evaluationId: number;
  submissionId?: number;
  onDecisionSuccess?: () => void;
  onNavigateToCompletionRequest?: () => void;
}

export const SupervisionDecisionTab: React.FC<SupervisionDecisionTabProps> = ({
  data,
  evaluationId,
  submissionId: _submissionId,
  onDecisionSuccess,
  onNavigateToCompletionRequest,
}) => {
  const [closureNotes, setClosureNotes] = useState('');
  const [isSubmittingClosure, setIsSubmittingClosure] = useState(false);
  const [closureError, setClosureError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const checks = data.automatedChecks || {
    rubricCompleteness: true,
    allEvidencesAttached: true,
    minEvidenceMet: true,
    flagsCount: 0,
    notes: 'تم فحص الرصد بنجاح.',
  };

  const deficiencies = data.deficienciesList || [];
  const status = data.status;
  const isCompleted = status === 'Completed';
  const isNeedsCompletion = status === 'NeedsCompletion';
  const openReq = data.openCompletionRequest;

  // إكمال المراجعة وقفل المخرج نهائياً
  const handleCompleteReview = async () => {
    setIsSubmittingClosure(true);
    setClosureError(null);
    try {
      await supervisionApi.closeEvaluation(evaluationId, closureNotes);
      setShowConfirmModal(false);
      onDecisionSuccess?.();
    } catch (e: any) {
      setClosureError(e?.message || 'تعذر إكمال المراجعة الإشرافية. يرجى مراجعة الاشتراطات.');
    } finally {
      setIsSubmittingClosure(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. القسم الأول: بطاقات الفحص والتحقق الآلي (Automated Checks) */}
      <div>
        <h3
          style={{
            margin: '0 0 14px 0',
            fontSize: '15px',
            fontWeight: 800,
            color: '#1E293B',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ShieldCheck size={18} color="#2563EB" />
          نتائج الفحص والتحقق الآلي لمخرج التقييم
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '14px',
          }}
        >
          {/* بطاقة شمولية المؤشرات */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: checks.rubricCompleteness ? '1px solid #BBF7D0' : '1px solid #FECACA',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: checks.rubricCompleteness ? '#DCFCE7' : '#FEE2E2',
                color: checks.rubricCompleteness ? '#15803D' : '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {checks.rubricCompleteness ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                شمولية رصد المؤشرات (109)
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', lineHeight: '1.4' }}>
                {checks.rubricCompleteness
                  ? 'رصدت المدرسة كافة المؤشرات الوطنية الـ 109 بمستويات التقدير الرباعي.'
                  : `تنبيه: توجد مؤشرات لم يتم رصد درجاتها من قِبل مقيّم المدرسة.`}
              </div>
            </div>
          </div>

          {/* بطاقة الشواهد الميدانية */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: checks.allEvidencesAttached ? '1px solid #BBF7D0' : '1px solid #FED7AA',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: checks.allEvidencesAttached ? '#DCFCE7' : '#FFEDD5',
                color: checks.allEvidencesAttached ? '#15803D' : '#EA580C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                استيفاء الشواهد الميدانية
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', lineHeight: '1.4' }}>
                {checks.allEvidencesAttached
                  ? 'تم إيداع ملفات الشواهد الميدانية وأدلة التحقق في مستودع المدرسة.'
                  : 'تنبيه: يوجد نقص في الشواهد الإلزامية المقررة في أدوات التحقق.'}
              </div>
            </div>
          </div>

          {/* بطاقة خطة التحسين المدرسية */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: data.improvementPlan ? '1px solid #BBF7D0' : '1px solid #FECACA',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: data.improvementPlan ? '#DCFCE7' : '#FEE2E2',
                color: data.improvementPlan ? '#15803D' : '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Target size={20} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                جاهزية خطة التحسين المدرسية
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', lineHeight: '1.4' }}>
                {data.improvementPlan
                  ? `خطة تحسين تشغيلية مرفقة تتضمن (${data.improvementPlan.actionsCount || 0}) إجراءً تنفيذياً.`
                  : 'لم ترفق المدرسة خطة تحسين تشغيلية مع مخرج التقييم.'}
              </div>
            </div>
          </div>

          {/* بطاقة متوسط الأداء ومستوى الجودة */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <BarChart3 size={20} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                المستوى العام ومعدل الامتثال
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', lineHeight: '1.4' }}>
                نسبة الامتثال المعياري: <strong>{data.summary.compliancePercentage}%</strong> من إجمالي المعايير.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. القسم الثاني: جدول رصد النواقص الإشرافية الموثقة في النظام */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 800,
            color: '#1E293B',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={18} color="#EA580C" />
          سجل النواقص والملاحظات الإشرافية المرصودة ({deficiencies.length})
        </h3>

        {deficiencies.length === 0 ? (
          <div
            style={{
              padding: '24px',
              borderRadius: '10px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <CheckCircle2 size={24} color="#16A34A" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>
                لم يتم رصد أي نواقص إشرافية على هذا المخرج حتى الآن
              </div>
              <div style={{ fontSize: '12px', color: '#15803D', marginTop: '2px' }}>
                كافة مؤشرات المعايير الوطنية السبعة مستوفاة وفق الفحص الميداني، أو يمكنك رصد ملاحظات إضافية عبر التبويب الأول (شجرة المعايير).
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                      المؤشر المعياري
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                      المعيار
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                      تصنيف النقص
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                      الملاحظة الإشرافية
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                      التوجيهات المطلوبة للمدرسة
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deficiencies.map((def, idx) => (
                    <tr
                      key={def.id || def.indicatorId}
                      style={{
                        borderBottom: idx === deficiencies.length - 1 ? 'none' : '1px solid #F1F5F9',
                        backgroundColor: '#FFFDFD',
                      }}
                    >
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>
                          {def.indicatorCode}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', maxWidth: '200px' }}>
                          {def.indicatorTitle}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: '12px', color: '#475569' }}>
                        {def.standardName}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            border: '1px solid #FECACA',
                          }}
                        >
                          {def.category}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: '12px', color: '#1E293B', maxWidth: '280px' }}>
                        {def.note}
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: '12px', color: '#2563EB', maxWidth: '280px' }}>
                        {def.directives || 'استيفاء الوثائق والشواهد اللازمة وفق أداة التحقق المقررة.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 3. القسم الثالث: صندوق الضوابط الحاكمة لقرار المشرف الوزاري (BR-MIN-02 & BR-MIN-03) */}
      <div
        style={{
          padding: '16px 20px',
          borderRadius: '10px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #CBD5E1',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <Info size={20} color="#0D9488" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#334155' }}>
          <strong>ضوابط الحوكمة الوزارية (المادة 14 & BR-MIN-03):</strong>
          <br />
          لا يمنح النظام أي اعتماد نهائي للمدارس نهائياً، بل تنحصر مهمة الإشراف والمتابعة المركزية في التحقق من صحة رصد المؤشرات الوطنية واكتمال الشواهد الميدانية. عند استيفاء المخرج، يتم <strong>«إكمال المراجعة الإشرافية»</strong> وقفل المخرج رقمياً، وعند وجود نواقص جوهرية يتم <strong>«إصدار طلب استكمال موجه»</strong> للمدرسة بمهلة محددة.
        </div>
      </div>

      {/* 4. القسم الرابع: حالة وقرار المراجعة الإشرافية */}
      <div>
        <h3
          style={{
            margin: '0 0 14px 0',
            fontSize: '15px',
            fontWeight: 800,
            color: '#1E293B',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Lock size={18} color="#2563EB" />
          القرار الإشرافي وإغلاق المراجعة
        </h3>

        {/* إذا كان المخرج مكتملاً ومقفل رقمياً */}
        {isCompleted && (
          <div
            style={{
              padding: '24px',
              borderRadius: '12px',
              backgroundColor: '#F0FDF4',
              border: '2px solid #86EFAC',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 800, color: '#166534' }}>
                تم إكمال المراجعة الإشرافية وقفل المخرج رقمياً بنجاح
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#15803D' }}>
                المخرج مستوفٍ لكافة الاشتراطات الفنية المعتمدة وتم توثيقه في السجل المركزي. الشاشة الآن في وضع العرض فقط (Read-Only).
              </p>
            </div>
          </div>
        )}

        {/* إذا كان المخرج في حالة طلب استكمال مفتوح */}
        {!isCompleted && isNeedsCompletion && (
          <div
            style={{
              padding: '24px',
              borderRadius: '12px',
              backgroundColor: '#FFFBEB',
              border: '2px solid #FCD34D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#FEF3C7',
                  color: '#B45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Clock size={28} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 800, color: '#92400E' }}>
                  يوجد طلب استكمال موجه ومفتوح حالياً للمدرسة
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#B45309' }}>
                  بانتظار استجابة فريق الجودة بالمدرسة وإعادة رفع المخرج مع الشواهد المطلوبة. (المتبقي: {openReq?.daysRemaining ?? 14} يوماً).
                </p>
              </div>
            </div>

            {onNavigateToCompletionRequest && (
              <button
                type="button"
                onClick={onNavigateToCompletionRequest}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                استعراض طلب الاستكمال المفتوح
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* إذا كان المخرج نشطاً وقابلاً لاتخاذ القرار (Submitted أو UnderReview) */}
        {!isCompleted && !isNeedsCompletion && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px',
            }}
          >
            {/* الخيار الأول: إصدار طلب استكمال */}
            <div
              style={{
                padding: '20px',
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #FCD34D',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <AlertTriangle size={18} color="#D97706" />
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#92400E' }}>
                    الخيار الأول: إصدار طلب استكمال موجه للمدرسة
                  </h4>
                </div>
                <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', color: '#78350F' }}>
                  إذا تبيّن لك وجود نواقص في الشواهد الميدانية، أو ضعف في التبريرات، أو عدم مطابقة درجات الرصد. سيتم ترحيل كافة النواقص المرصودة ({deficiencies.length}) إلى طلب استكمال رسمي مع مهلة زمنية للتصحيح.
                </p>
              </div>

              <button
                type="button"
                onClick={onNavigateToCompletionRequest}
                style={{
                  padding: '11px 20px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Send size={15} />
                الانتقال لنموذج إصدار طلب الاستكمال ({deficiencies.length} بنود)
              </button>
            </div>

            {/* الخيار الثاني: إكمال المراجعة وقفل المخرج */}
            <div
              style={{
                padding: '20px',
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #86EFAC',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <CheckCircle2 size={18} color="#16A34A" />
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#166534' }}>
                    الخيار الثاني: إكمال المراجعة الإشرافية وقفل المخرج
                  </h4>
                </div>
                <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', color: '#14532D' }}>
                  عند استيفاء المدرسة لكافة المعايير والشواهد الميدانية، يتم إكمال المراجعة وقفل المخرج التقييمي رقمياً ليصبح معتمداً وموثقاً في السجل المركزي.
                </p>
              </div>

              <button
                type="button"
                disabled={deficiencies.length > 0}
                onClick={() => setShowConfirmModal(true)}
                title={deficiencies.length > 0 ? 'لا يمكن إكمال المراجعة أثناء وجود نواقص مرصودة لم تستكمل' : undefined}
                style={{
                  padding: '11px 20px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  backgroundColor: deficiencies.length > 0 ? '#94A3B8' : '#16A34A',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: deficiencies.length > 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={16} />
                إكمال المراجعة الإشرافية وقفل المخرج نهائياً
              </button>
            </div>
          </div>
        )}
      </div>

      {/* نافذة تأكيد إكمال المراجعة الإشرافية */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#DCFCE7',
                  color: '#15803D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                  تأكيد إكمال المراجعة الإشرافية وقفل المخرج
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                  مدرسة {data.school.schoolName} ({data.school.schoolCode})
                </p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: '#334155' }}>
              هل أنت متأكد من اكتمال فحص وتدقيق مخرج التقييم الذاتي وكافة الشواهد وخطة التحسين؟ بعد الإكمال، سيتم قفل ملف المدرسة رقمياً ولن يُسمح بتعديل الرصد أو الشواهد.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                بيان أو ملاحظة إشرافية ختامية (اختياري):
              </label>
              <textarea
                rows={3}
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                placeholder="اكتب خلاصة تقرير المراجعة الإشرافية حول مستوى أداء المدرسة واستيفائها للمعايير..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {closureError && (
              <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '12px' }}>
                {closureError}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={isSubmittingClosure}
                onClick={handleCompleteReview}
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: isSubmittingClosure ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmittingClosure ? 'جارٍ الحفظ والقفل...' : 'تأكيد وقفل المخرج نهائياً'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
