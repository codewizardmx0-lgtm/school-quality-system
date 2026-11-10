import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  Calendar,
  ShieldCheck,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { evaluatorApi } from '../../api/evaluatorApi';

export interface DetailedReportStats {
  completionRate?: number;
  scoredIndicatorsCount?: number;
  totalIndicatorsCount?: number;
  totalEvidencesCount?: number;
}

interface DetailedReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats?: DetailedReportStats | null;
  schoolName?: string;
  schoolCode?: string;
}

export const DetailedReportExportModal: React.FC<DetailedReportExportModalProps> = ({
  isOpen,
  onClose,
  stats,
  schoolName = 'مدرسة الفاروق النموذجية',
  schoolCode = 'SCH-2026-001',
}) => {
  const [downloadingType, setDownloadingType] = useState<'pdf' | 'excel' | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleExportPdf = async () => {
    try {
      setDownloadingType('pdf');
      setFeedbackMsg(null);
      await evaluatorApi.exportDetailedReportPdf();
      setFeedbackMsg({
        type: 'success',
        text: 'تم توليد وتنزيل استمارة التقرير المفصلة (PDF) بنجاح.',
      });
    } catch (err: unknown) {
      console.error('Failed to export detailed PDF report', err);
      setFeedbackMsg({
        type: 'error',
        text: 'حدث خطأ أثناء توليد ملف الـ PDF. يرجى المحاولة مرة أخرى.',
      });
    } finally {
      setDownloadingType(null);
    }
  };

  const handleExportExcel = async () => {
    try {
      setDownloadingType('excel');
      setFeedbackMsg(null);
      await evaluatorApi.exportDetailedReportExcel();
      setFeedbackMsg({
        type: 'success',
        text: 'تم تجهيز وتنزيل مصفوفة التقييم الشاملة (Excel) بنجاح.',
      });
    } catch (err: unknown) {
      console.error('Failed to export detailed Excel report', err);
      setFeedbackMsg({
        type: 'error',
        text: 'حدث خطأ أثناء تجهيز مصنف الـ Excel. يرجى المحاولة مرة أخرى.',
      });
    } finally {
      setDownloadingType(null);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && downloadingType === null) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        direction: 'rtl',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '18px',
          boxShadow: '0 24px 48px rgba(15, 23, 42, 0.25)',
          border: '1px solid #E2E8F0',
          maxWidth: '720px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ترويسة النافذة */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, #065F46 0%, #0F766E 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.14)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={20} color="#CCFBF1" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                استمارة التقرير المفصلة لتقويم المدرسة
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#CCFBF1' }}>
                معاينة المحتوى قبل التصدير الرسمي (Detailed Dossier Report)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={downloadingType !== null}
            style={{
              padding: '6px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              border: 'none',
              cursor: downloadingType !== null ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* جسم النافذة القابل للتمرير */}
        <div
          style={{
            padding: '22px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            color: '#334155',
          }}
        >
          {/* بطاقة المدرسة المختصرة */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 16px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              fontSize: '12.5px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} color="#0F766E" />
              <span style={{ fontWeight: 800, color: '#0F172A' }}>{schoolName}</span>
              <span style={{ color: '#CBD5E1' }}>|</span>
              <span style={{ fontFamily: 'monospace', color: '#64748B', fontWeight: 600 }}>{schoolCode}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B' }}>
              <Calendar size={15} color="#64748B" />
              <span>دورة التقييم الذاتي 2026/2027</span>
            </div>
          </div>

          {/* محتويات الاستمارة المفصلة */}
          <div
            style={{
              backgroundColor: '#F0FDFA',
              border: '1px solid #99F6E4',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
                color: '#115E59',
                fontWeight: 800,
                fontSize: '14px',
              }}
            >
              <Sparkles size={16} color="#0D9488" />
              <span>ماذا تتضمن استمارة التقرير المفصلة؟</span>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '12.5px', color: '#134E4A', lineHeight: 1.6 }}>
              سيتم إنشاء تقرير رسمي شامل يحتوي على كافة نتائج الرصد والشواهد والاعتمادات الميدانية:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', color: '#1E293B' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>مصفوفة المؤشرات الـ 109 كاملة:</strong> مرتبة حسب المعايير السبعة الرئيسية والفرعية برموزها ونصوصها الرسمية.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>توزيع المستويات الأربعة ومتوسط الجودة:</strong> مقارنة جودة المجالات السبعة (من 3.00 نقاط) وأوزانها النسبية.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>أدوات التحقق والشواهد وتبريرات المقيم:</strong> تعداد وعناوين الشواهد المربوطة بكل مؤشر وملاحظات الرصد الميداني.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <ShieldCheck size={16} color="#0F766E" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>توقيعات لجنة الاعتماد الرسمية:</strong> مقيم المدرسة، مدير المدرسة، والمشرف الوزاري.
                </span>
              </div>
            </div>
          </div>

          {/* مقارنة الفرق بين PDF و Excel */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: '#0F766E', fontWeight: 800, fontSize: '13px' }}>
                <FileText size={16} />
                <span>نسخة PDF المفصلة (للطباعة والاعتماد)</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.55 }}>
                وثيقة رسمية منسقة للطباعة (A4) مع ترويسة وزارية ثابتة، جداول المعايير والـ 109 مؤشرات، وخانات الختم والتوقيع الرسمي.
              </p>
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #BBF7D0',
                backgroundColor: '#F0FDF4',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: '#15803D', fontWeight: 800, fontSize: '13px' }}>
                <FileSpreadsheet size={16} />
                <span>نسخة Excel الشاملة (للتحليل والفرز)</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#166534', lineHeight: 1.55 }}>
                مصنف جداول بيانات من 3 أوراق عمل مستقلة: (النتائج والمعايير، سجل الشواهد، وخطط التحسين) لسهولة الفرز والمراجعة.
              </p>
            </div>
          </div>

          {/* لقطة من الإحصاءات الحالية */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div
                style={{
                  padding: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '2px' }}>نسبة اكتمال الرصد</div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#0F766E' }}>
                  {Math.round(stats.completionRate || 0)}%
                </div>
              </div>
              <div
                style={{
                  padding: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '2px' }}>المؤشرات المرصودة</div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#0369A1' }}>
                  {stats.scoredIndicatorsCount || 0} / {stats.totalIndicatorsCount || 109}
                </div>
              </div>
              <div
                style={{
                  padding: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '2px' }}>تغطية الشواهد</div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#4338CA' }}>
                  {stats.totalEvidencesCount || 0}
                </div>
              </div>
            </div>
          )}

          {/* رسائل النجاح أو الخطأ */}
          {feedbackMsg && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: feedbackMsg.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                color: feedbackMsg.type === 'success' ? '#065F46' : '#991B1B',
                border: `1px solid ${feedbackMsg.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
              }}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
              ) : (
                <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}
        </div>

        {/* تذييل النافذة وأزرار التصدير */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={downloadingType !== null}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 700,
              border: '1px solid #CBD5E1',
              cursor: downloadingType !== null ? 'not-allowed' : 'pointer',
            }}
          >
            إلغاء وإغلاق
          </button>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={downloadingType !== null}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: downloadingType !== null ? 'not-allowed' : 'pointer',
                opacity: downloadingType !== null ? 0.65 : 1,
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
              }}
            >
              {downloadingType === 'excel' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جارٍ تجهيز Excel...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet size={16} />
                  <span>تصدير مصفوفة Excel</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={downloadingType !== null}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                backgroundColor: '#0F766E',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: downloadingType !== null ? 'not-allowed' : 'pointer',
                opacity: downloadingType !== null ? 0.65 : 1,
                boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)',
              }}
            >
              {downloadingType === 'pdf' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جارٍ توليد PDF...</span>
                </>
              ) : (
                <>
                  <FileText size={16} />
                  <span>تحميل التقرير المفصل (PDF)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
