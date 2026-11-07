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
  ArrowLeft,
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
    resolveItem,
    resubmitToMinistry,
  } = useCompletionRequest();

  const { uploadEvidenceFile } = useEvidences();

  const [resolutionNotes, setResolutionNotes] = useState<Record<number, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<number, File>>({});
  const [schoolGeneralNotes, setSchoolGeneralNotes] = useState(
    'تمت معالجة كافة الملاحظات الواردة من سعادة المشرف الوزاري واستيفاء الشواهد الميدانية المعتمدة.'
  );

  if (isLoading && !completionData) {
    return (
      <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        <div style={{ height: '100px', borderRadius: '16px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
        <div style={{ height: '220px', borderRadius: '14px', backgroundColor: '#E2E8F0' }} className="animate-pulse" />
      </div>
    );
  }

  const items = completionData?.flaggedItems || [];

  const handleResolveClick = async (item: FlaggedCompletionItem) => {
    const notes = resolutionNotes[item.itemId] || 'تم تدقيق المؤشر وإرفاق المستند المعتمد.';
    let evidenceVersionId: number | undefined;

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
  };

  const handleFileSelect = (itemId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFiles((prev) => ({ ...prev, [itemId]: e.target.files![0] }));
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
              متبقي {completionData?.remainingDays ?? 11} يوماً (حتى {completionData?.completionDeadline})
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
          <strong>نطاق الفتح الجزئي للصلاحيات:</strong> تم فك القفل عن المؤشرات الثلاثة الموضحة أدناه فقط لإتاحة تعديل التقدير
          ورفع الشواهد المكملة، بينما تظل بقية مؤشرات المعايير الوطنية السبعة في حالة القراءة فقط لحماية النزاهة التوثيقية.
        </div>
      </div>

      {/* 2. Flagged Items Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
          العناصر والمؤشرات المطلوب استيفاؤها ({items.length} مؤشرات)
        </h3>

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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '12px',
                      backgroundColor: isResolved ? '#ECFDF5' : '#FFFBEB',
                      color: isResolved ? '#059669' : '#D97706',
                    }}
                  >
                    {isResolved ? '✓ تم الاستيفاء والمعالجة' : 'قيد المعالجة'}
                  </span>

                  <button
                    onClick={() => onNavigate('rubric-assessment', item.indicatorId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#F1F5F9',
                      color: '#334155',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <span>فتح المؤشر</span>
                    <ArrowLeft size={13} />
                  </button>
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
                    placeholder="أدخل الإجراءات التي اتخذتها المدرسة لاستيفاء الملاحظة والشواهد المرفقة..."
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
                        <span>{file ? file.name : 'إرفاق شاهد مكمل للمؤشر'}</span>
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
                        cursor: 'pointer',
                      }}
                    >
                      <CheckCircle2 size={15} />
                      <span>تأكيد معالجة البند</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#065F46', backgroundColor: '#F0FDF4', padding: '10px 14px', borderRadius: '8px' }}>
                  <strong>رد المدرسة المعتمد:</strong> {item.resolutionNotes || 'تم استيفاء النقص وإرفاق الشاهد المطلوب بنجاح.'}
                </div>
              )}
            </div>
          );
        }))}
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
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
          كتاب التغطية الرسمي وإعادة الرفع للمشرف الوزاري
        </h3>

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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={() => resubmitToMinistry(schoolGeneralNotes)}
            disabled={isResubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 24px',
              borderRadius: '8px',
              backgroundColor: '#059669',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 800,
              border: 'none',
              cursor: isResubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
            }}
          >
            <Send size={16} />
            <span>{isResubmitting ? 'جاري الرفع...' : 'إعادة الرفع النهائي للمشرف الوزاري'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
