import React, { useState } from 'react';
import { useCompletionRequest } from '../../hooks/useCompletionRequest';
import { useEvidences } from '../../hooks/useEvidences';
import type { EvaluatorScreen, FlaggedCompletionItem } from '../../api/evaluationTypes';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  UploadCloud,
  Send,
  Unlock,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Edit3,
  Target,
  FolderUp,
} from 'lucide-react';

interface HandleCompletionPageProps {
  onNavigate: (screen: EvaluatorScreen, param?: number) => void;
}

export const HandleCompletionPage: React.FC<HandleCompletionPageProps> = ({
  onNavigate,
}) => {
  const {
    completionData,
    isLoading,
    isResolving,
    isResubmitting,
    successMessage,
    resubmitResult,
    resolveItem,
    resubmitToMinistry,
  } = useCompletionRequest();

  const { uploadEvidenceFile } = useEvidences();

  const [resolutionNotes, setResolutionNotes] = useState<Record<number, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<number, File>>({});
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [schoolGeneralNotes, setSchoolGeneralNotes] = useState(
    'تمت معالجة كافة الملاحظات الواردة من سعادة المشرف الوزاري واستيفاء الشواهد الميدانية الرسمية.'
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  if (isLoading && !completionData) {
    return (
      <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        <div style={{ height: '110px', borderRadius: '16px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
        <div style={{ height: '240px', borderRadius: '14px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
      </div>
    );
  }

  // If successfully resubmitted, display the formal resubmission certificate card
  if (resubmitResult) {
    return (
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '18px',
            border: '2px solid #059669',
            padding: '36px 30px',
            boxShadow: '0 12px 36px rgba(5, 150, 105, 0.12)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '18px',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: '#ECFDF5',
              border: '2px solid #A7F3D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={44} color="#059669" />
          </div>

          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 14px',
                borderRadius: '20px',
                backgroundColor: '#ECFDF5',
                color: '#065F46',
                fontSize: '12px',
                fontWeight: 800,
                marginBottom: '10px',
              }}
            >
              <ShieldCheck size={16} />
              <span>إعادة التسليم الرسمية — المحاولة رقم {resubmitResult.submissionAttempt ?? 2}</span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              تمت إعادة رفع ملف التقييم إلى المشرف الوزاري بنجاح
            </h2>
            <p style={{ fontSize: '13.5px', color: '#64748B', maxWidth: '580px', margin: '8px auto 0', lineHeight: 1.6 }}>
              {resubmitResult.message || 'تم قفل التعديل الجزئي وإرسال الشواهد والردود الرسمية المحدثة للمشرف الوزاري لمتابعة التحقق والمراجعة الإشرافية النهائية.'}
            </p>
          </div>

          {/* Tracking Code & Hash Panel */}
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              textAlign: 'right',
            }}
          >
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                رمز التتبع الوطني للمحاولة (National Tracking Code):
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#0369A1',
                }}
              >
                <span>{resubmitResult.trackingCode || 'رمز استكمال موثق'}</span>
                {resubmitResult.trackingCode && (
                  <button
                    onClick={() => copyToClipboard(resubmitResult.trackingCode!)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                      color: '#0369A1',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="نسخ رمز التتبع"
                  >
                    {copiedCode ? (
                      <>
                        <Check size={13} color="#16A34A" />
                        <span style={{ color: '#16A34A' }}>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>نسخ</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {resubmitResult.digitalHash && (
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                  البصمة الرقمية للبيانات المحدثة (SHA-256):
                </div>
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#475569',
                    wordBreak: 'break-all',
                    lineHeight: 1.4,
                  }}
                >
                  {resubmitResult.digitalHash}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#64748B', paddingTop: '6px', borderTop: '1px solid #E2E8F0' }}>
              <span>تاريخ الإرسال: {resubmitResult.resubmittedAt ? new Date(resubmitResult.resubmittedAt).toLocaleString('ar-SA') : 'الآن'}</span>
              <span>الحالة: <strong style={{ color: '#059669' }}>بانتظار مراجعة المشرف الوزاري</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => onNavigate('dashboard')}
              style={{
                padding: '11px 24px',
                borderRadius: '8px',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13.5px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
              }}
            >
              العودة للوحة التحكم الرئيسية
            </button>
            <button
              onClick={() => onNavigate('final-review')}
              style={{
                padding: '11px 20px',
                borderRadius: '8px',
                backgroundColor: '#F1F5F9',
                color: '#334155',
                fontWeight: 700,
                fontSize: '13.5px',
                border: '1px solid #CBD5E1',
                cursor: 'pointer',
              }}
            >
              عرض المراجعة والختم
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!completionData && !isLoading) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', maxWidth: '800px', margin: '32px auto' }}>
        <CheckCircle2 size={48} color="#059669" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>لا توجد طلبات استكمال معلقة حالياً</h3>
        <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '480px', margin: '8px auto 20px', lineHeight: 1.6 }}>
          ملف التقييم الذاتي للمدرسة يسير وفق المسار النظامي، ولم تصدر المراجعة الوزارية أي طلبات استكمال أو نواقص على ملف المدرسة.
        </p>
        <button
          onClick={() => onNavigate('dashboard')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            backgroundColor: '#059669',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          العودة للوحة التحكم
        </button>
      </div>
    );
  }

  const items = completionData?.flaggedItems || [];
  const pendingCount = items.filter((i) => i.status !== 'Resolved').length;
  const allResolved = items.length > 0 && pendingCount === 0;

  const handleResolveClick = async (item: FlaggedCompletionItem) => {
    setErrorMessage(null);
    const notes = resolutionNotes[item.itemId] || 'تم تدقيق المؤشر واستيفاء الشاهد الميداني المطلوب وتحديث السجل.';
    let evidenceVersionId: number | undefined;

    try {
      if (uploadedFiles[item.itemId]) {
        const uploadRes = await uploadEvidenceFile({
          file: uploadedFiles[item.itemId],
          indicatorId: item.indicatorId,
          title: `استكمال ${item.indicatorCode}: ${uploadedFiles[item.itemId].name}`,
          notes,
        });
        evidenceVersionId = uploadRes.versionId;
      }

      await resolveItem(item.itemId, notes, evidenceVersionId);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ معالجة البند');
    }
  };

  const handleFileSelect = (itemId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFiles((prev) => ({ ...prev, [itemId]: e.target.files![0] }));
    }
  };

  const handleResubmit = async () => {
    setErrorMessage(null);
    if (!allResolved) {
      setErrorMessage(`لا يمكن إعادة الرفع حتى يتم استيفاء جميع البنود (متبقي ${pendingCount} بند قيد المعالجة).`);
      return;
    }
    try {
      await resubmitToMinistry(schoolGeneralNotes);
    } catch (err: any) {
      setErrorMessage(err.message || 'فشلت عملية إعادة الرفع للمشرف الوزاري.');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Header & Partial Unlock Countdown Notice */}
      <div
        style={{
          background: 'linear-gradient(135deg, #78350F 0%, #92400E 50%, #B45309 100%)',
          borderRadius: '16px',
          padding: '24px 30px',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 8px 24px rgba(180, 83, 9, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            <AlertTriangle size={28} color="#FDE68A" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '19px', fontWeight: 800, margin: 0 }}>
                طلب استكمال تقييم صادر من المراجعة الوزارية
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                }}
              >
                فتح تعديل جزئي (Partial Unlock)
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#FEF3C7', margin: '4px 0 0 0' }}>
              المشرف المتابع: {completionData?.supervisorName} • تاريخ الإصدار: {completionData?.issuedAt}
            </p>
          </div>
        </div>

        {/* Countdown Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            padding: '10px 18px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <Clock size={20} color="#FDE68A" />
          <div>
            <div style={{ fontSize: '11px', color: '#FDE68A' }}>المهلة المحددة للمعالجة</div>
            <div style={{ fontSize: '14px', fontWeight: 800 }}>
              متبقي {completionData?.remainingDays ?? 5} يوماً (حتى {completionData?.completionDeadline})
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Partial Unlock Explanatory Box */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '18px 22px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <Unlock size={22} color="#059669" />
        <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
          <strong>نطاق الفتح الجزئي للصلاحيات:</strong> تم فك القفل عن المؤشرات الموضحة أدناه فقط لإتاحة تعديل التقدير
          ورفع الشواهد المكملة، بينما تظل بقية مؤشرات المعايير الوطنية السبعة في حالة القراءة فقط لحماية النزاهة التوثيقية وعدم الإنكار.
        </div>
      </div>

      {/* 2. Flagged Items Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            العناصر والمؤشرات المطلوب استيفاؤها ({items.length} مؤشرات)
          </h3>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: allResolved ? '#ECFDF5' : '#FFFBEB',
              color: allResolved ? '#059669' : '#D97706',
              border: `1px solid ${allResolved ? '#A7F3D0' : '#FDE68A'}`,
            }}
          >
            {allResolved ? '✓ تم استيفاء كافة البنود' : `متبقي ${pendingCount} بند غير مستوفى`}
          </span>
        </div>

        {items.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
            <CheckCircle2 size={44} color="#059669" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
              لا توجد طلبات استكمال مفتوحة حالياً
            </div>
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              كافة شواهد ومؤشرات التقييم مستوفاة ولم تسجل أي ملاحظات متبقية من المشرف الوزاري.
            </div>
          </div>
        ) : (
          items.map((item) => {
            const isResolved = item.status === 'Resolved';
            const file = uploadedFiles[item.itemId];
            const actions = (item.allowedActions && item.allowedActions.length > 0)
              ? item.allowedActions
              : ['modify_scores', 'upload_evidences'];

            return (
              <div
                key={item.itemId}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '14px',
                  border: isResolved ? '1.5px solid #059669' : '1.5px solid #FCD34D',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: isResolved ? '#ECFDF5' : '#FFFBEB',
                          color: isResolved ? '#059669' : '#D97706',
                          border: `1px solid ${isResolved ? '#A7F3D0' : '#FDE68A'}`,
                        }}
                      >
                        {item.indicatorCode}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                        {item.indicatorTitle}
                      </span>
                      {item.standardTitle && (
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          ({item.standardTitle})
                        </span>
                      )}
                    </div>

                    {/* Allowed Actions Badges (IR-04 & FR-SUP-07) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                      <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>الإجراءات المصرح بها:</span>
                      {actions.includes('modify_scores') && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                          <Edit3 size={11} />
                          <span>تعديل التقدير</span>
                        </span>
                      )}
                      {actions.includes('upload_evidences') && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}>
                          <UploadCloud size={11} />
                          <span>رفع الشواهد</span>
                        </span>
                      )}
                      {actions.includes('edit_plan') && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', backgroundColor: '#F3E8FF', color: '#6B21A8', border: '1px solid #D8B4FE' }}>
                          <Target size={11} />
                          <span>تعديل الخطة</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Deep Linking Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '12px',
                        backgroundColor: isResolved ? '#ECFDF5' : '#FFFBEB',
                        color: isResolved ? '#059669' : '#D97706',
                      }}
                    >
                      {isResolved ? '✓ تم الاستيفاء والمعالجة' : 'قيد المعالجة'}
                    </span>

                    {actions.includes('modify_scores') && (
                      <button
                        onClick={() => onNavigate('rubric-assessment', item.indicatorId)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          fontSize: '12px',
                          fontWeight: 700,
                          border: '1px solid #BFDBFE',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                        }}
                        title="الانتقال المباشر لتقييم المؤشر وتعديل المستوى"
                      >
                        <Edit3 size={13} />
                        <span>تعديل التقدير</span>
                      </button>
                    )}

                    {actions.includes('upload_evidences') && (
                      <button
                        onClick={() => onNavigate('evidences')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#ECFDF5',
                          color: '#047857',
                          fontSize: '12px',
                          fontWeight: 700,
                          border: '1px solid #A7F3D0',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                        }}
                        title="فتح مستودع الشواهد الرقمية لإدارة الملفات"
                      >
                        <FolderUp size={13} />
                        <span>مستودع الشواهد</span>
                      </button>
                    )}

                    {actions.includes('edit_plan') && (
                      <button
                        onClick={() => onNavigate('improvement-plan')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#F3E8FF',
                          color: '#6B21A8',
                          fontSize: '12px',
                          fontWeight: 700,
                          border: '1px solid #D8B4FE',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                        }}
                        title="الانتقال لخطة التحسين المدرسية لتحديث الأنشطة والإجراءات"
                      >
                        <Target size={13} />
                        <span>خطة التحسين</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Supervisor Feedback Note */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FDE68A',
                    color: '#92400E',
                    fontSize: '12.5px',
                    lineHeight: 1.5,
                  }}
                >
                  <strong>ملاحظة وتوجيه المشرف الوزاري:</strong> {item.missingDescription}
                </div>

                {/* School Formal Response Input & File Uploader */}
                {!isResolved ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                      رد وتوضيح المدرسة على الملاحظة:
                    </label>
                    <textarea
                      value={resolutionNotes[item.itemId] || ''}
                      onChange={(e) =>
                        setResolutionNotes({ ...resolutionNotes, [item.itemId]: e.target.value })
                      }
                      placeholder="أدخل الإجراءات التي اتخذتها المدرسة لاستيفاء الملاحظة وتفاصيل الشاهد المرفق..."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        outline: 'none',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />

                    {/* Targeted File Uploader */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <input
                          type="file"
                          id={`file-${item.itemId}`}
                          onChange={(e) => handleFileSelect(item.itemId, e)}
                          accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
                          style={{ display: 'none' }}
                        />
                        <label
                          htmlFor={`file-${item.itemId}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 14px',
                            borderRadius: '6px',
                            backgroundColor: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            color: '#334155',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <UploadCloud size={15} />
                          <span>{file ? file.name : 'إرفاق شاهد مكمل للمؤشر (PDF / صورة / مستند)'}</span>
                        </label>
                      </div>

                      <button
                        onClick={() => handleResolveClick(item)}
                        disabled={isResolving}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 18px',
                          borderRadius: '6px',
                          backgroundColor: '#059669',
                          color: '#FFFFFF',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          border: 'none',
                          cursor: isResolving ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <CheckCircle2 size={15} />
                        <span>{isResolving ? 'جاري المعالجة...' : 'تأكيد معالجة البند'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: '12.5px',
                      color: '#065F46',
                      backgroundColor: '#F0FDF4',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #BBF7D0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div>
                      <strong>رد المدرسة والمصادقة:</strong> {item.resolutionNotes || 'تم استيفاء النقص وإرفاق الشاهد المطلوب بنجاح.'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#047857' }}>
                      ✓ تم تسجيل المعالجة ويمكنك تعديلها بالضغط على المؤشر أعلاه إذا دعت الحاجة قبل إعادة الرفع النهائي.
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3. Re-submission to Ministry Section */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            كتاب التغطية الرسمي وإعادة الرفع للمشرف الوزاري
          </h3>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            سيتم إصدار رمز تتبع رسمي جديد مرتبط بالمحاولة
          </span>
        </div>

        <textarea
          value={schoolGeneralNotes}
          onChange={(e) => setSchoolGeneralNotes(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #CBD5E1',
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />

        {!allResolved && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              color: '#B45309',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>
              <strong>تنبيه إجرائي:</strong> زر إعادة الرفع معطل حالياً حتى يتم تأكيد معالجة كافة البنود أعلاه ({pendingCount} بند معلق).
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={handleResubmit}
            disabled={isResubmitting || !allResolved}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 24px',
              borderRadius: '8px',
              backgroundColor: allResolved ? '#059669' : '#94A3B8',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 800,
              border: 'none',
              cursor: allResolved && !isResubmitting ? 'pointer' : 'not-allowed',
              boxShadow: allResolved ? '0 4px 12px rgba(5, 150, 105, 0.25)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Send size={16} />
            <span>{isResubmitting ? 'جاري الرفع وتوليد الرمز...' : 'إعادة الرفع النهائي للمشرف الوزاري'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
