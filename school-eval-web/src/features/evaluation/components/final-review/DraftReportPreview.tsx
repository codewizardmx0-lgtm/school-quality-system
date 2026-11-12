import React, { useState, useEffect } from 'react';
import { Download, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { evaluatorApi } from '../../api/evaluatorApi';
import type { EvaluatorDashboardData } from '../../api/evaluationTypes';

interface DraftReportPreviewProps {
  onExportPdf: () => void;
  isLocked?: boolean;
  isPrincipal?: boolean;
  trackingCode?: string;
}

export const DraftReportPreview: React.FC<DraftReportPreviewProps> = ({
  onExportPdf,
  isPrincipal = false,
  trackingCode,
}) => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<EvaluatorDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [principalNotes, setPrincipalNotes] = useState<string>('');
  const [noteMetadata, setNoteMetadata] = useState<{ authorName?: string; updatedAt?: string } | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  const handleSaveNotes = async () => {
    if (!principalNotes.trim()) return;
    setIsSavingNote(true);
    try {
      const res = await evaluatorApi.saveInternalReviewNote(principalNotes.trim());
      setIsSaved(true);
      setNoteMetadata({
        authorName: res.authorName,
        updatedAt: res.updatedAt,
      });
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      alert('تعذر حفظ ملاحظات المراجعة: ' + (err?.response?.data?.message || err?.message));
    } finally {
      setIsSavingNote(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    evaluatorApi
      .getDashboardStats()
      .then((data) => {
        if (isMounted) setDashboardData(data);
      })
      .catch((err) => {
        console.error('Failed to load dashboard data for report preview:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    evaluatorApi
      .getInternalReviewNote()
      .then((res) => {
        if (isMounted && res) {
          setPrincipalNotes(res.text || '');
          if (res.authorName || res.updatedAt) {
            setNoteMetadata({
              authorName: res.authorName,
              updatedAt: res.updatedAt,
            });
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load internal review note:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const schoolName = user?.school?.schoolName || dashboardData?.schoolInfo?.schoolName || 'مدرسة غير محددة';
  const academicYear = dashboardData?.schoolInfo?.academicYear || '2026/2027';
  const evaluatorName = user?.fullName || dashboardData?.schoolInfo?.currentEvaluator || 'المقيم المعتمد';
  const finalTrackingCode = trackingCode || 'ARQ-2026-SCH-FIN';

  const getStatusBadge = (percentage: number) => {
    if (percentage === 100) {
      return { text: 'مستوفى بالكامل', bg: '#ECFDF5', color: '#059669' };
    }
    if (percentage >= 70) {
      return { text: 'متحقق بدرجة جيدة', bg: '#F0FDF4', color: '#16A34A' };
    }
    if (percentage >= 50) {
      return { text: 'متحقق بدرجة متوسطة', bg: '#FEF3C7', color: '#D97706' };
    }
    if (percentage > 0) {
      return { text: 'يتطلب تحسيناً', bg: '#FEE2E2', color: '#DC2626' };
    }
    return { text: 'لم يبدأ بعد', bg: '#F1F5F9', color: '#64748B' };
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        padding: '24px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
      }}
    >
      {/* Document Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          borderBottom: '2px solid #E2E8F0',
          paddingBottom: '20px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#059669',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 700 }}>
              الجمهورية اليمنية — وزارة التربية والتعليم والبحث العلمي
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: '2px 0 0 0' }}>
              تقرير التقييم الذاتي المدرسي الشامل (النسخة الرسمية 2026)
            </h2>
          </div>
        </div>

        <button
          onClick={onExportPdf}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 18px',
            borderRadius: '8px',
            backgroundColor: '#059669',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Download size={15} />
          تصدير التقرير الرسمي (PDF)
        </button>
      </div>

      {/* Meta Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          backgroundColor: '#F8FAFC',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '24px',
        }}
      >
        <div>
          <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>المدرسة</span>
          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>{schoolName}</span>
        </div>
        <div>
          <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>العام الدراسي</span>
          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>{academicYear}</span>
        </div>
        <div>
          <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>المقيم المعتمد</span>
          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>{evaluatorName}</span>
        </div>
        <div>
          <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>رمز الاعتماد والتتبع</span>
          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#059669' }}>{finalTrackingCode}</span>
        </div>
      </div>

      {/* Standards Summary Table in Report */}
      <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
        خلاصة مؤشرات المعايير الوطنية
      </h3>
      <div style={{ overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
        <table style={{ minWidth: '600px', width: '100%', borderCollapse: 'collapse', textAlign: 'right', marginBottom: '24px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #CBD5E1' }}>
              <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700 }}>المعيار الوطني</th>
              <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700 }}>المؤشرات المنجزة</th>
              <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700 }}>نسبة الاستيفاء</th>
              <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700 }}>مستوى التحقق</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                  <Loader2 size={20} className="animate-spin" style={{ display: 'inline', marginLeft: '8px' }} />
                  جاري تحميل بيانات المعايير...
                </td>
              </tr>
            ) : !dashboardData?.standardsProgress || dashboardData.standardsProgress.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                  لا توجد معايير مسجلة في دورة التقييم الحالية.
                </td>
              </tr>
            ) : (
              dashboardData.standardsProgress.map((row) => {
                const badge = getStatusBadge(row.percentage);
                return (
                  <tr key={row.standardId} style={{ borderBottom: '1px solid #E2E8F0', fontSize: '12.5px' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1E293B' }}>
                      {row.code ? `${row.code}: ` : ''}{row.title}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#059669', fontWeight: 600 }}>
                      {row.scoredIndicators} / {row.totalIndicators}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 800 }}>{row.percentage}%</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.text}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Internal Review Note from School Principal */}
      <div
        style={{
          border: '1px dashed #059669',
          borderRadius: '10px',
          padding: '16px 20px',
          backgroundColor: '#F0FDF4',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#065F46' }}>
            اعتماد المراجعة الداخلية لمدير المدرسة
          </div>
          {isPrincipal && (
            <span style={{ fontSize: '11px', color: '#047857', backgroundColor: '#D1FAE5', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              صلاحية التدوين والاعتماد متاحة لمدير المدرسة
            </span>
          )}
        </div>

        {isPrincipal ? (
          <div>
            {noteMetadata && (
              <div style={{ fontSize: '11px', color: '#047857', marginBottom: '6px', fontWeight: 600 }}>
                آخر تحديث بواسطة {noteMetadata.authorName || 'مدير المدرسة'} {noteMetadata.updatedAt ? `بتاريخ ${noteMetadata.updatedAt.slice(0, 10)}` : ''}
              </div>
            )}
            <textarea
              value={principalNotes}
              onChange={(e) => {
                setPrincipalNotes(e.target.value);
                setIsSaved(false);
              }}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #A7F3D0',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                fontSize: '12.5px',
                lineHeight: 1.6,
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
              placeholder="اكتب ملاحظات وتوصيات المراجعة والاعتماد الداخلي لمدير المدرسة..."
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNote || !principalNotes.trim()}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: isSavingNote || !principalNotes.trim() ? 'not-allowed' : 'pointer',
                  opacity: isSavingNote || !principalNotes.trim() ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle2 size={14} />
                <span>{isSavingNote ? 'جاري الحفظ...' : 'حفظ وتثبيت ملاحظات المراجعة الداخلية'}</span>
              </button>
              {isSaved && (
                <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 700 }}>
                  ✓ تم حفظ ملاحظات المراجعة بنجاح
                </span>
              )}
            </div>
          </div>
        ) : principalNotes ? (
          <div>
            <p style={{ fontSize: '12.5px', color: '#166534', margin: 0, lineHeight: 1.6 }}>
              «{principalNotes}»
            </p>
            {noteMetadata && (
              <div style={{ fontSize: '11px', color: '#047857', marginTop: '6px', fontWeight: 600 }}>
                — {noteMetadata.authorName || 'مدير المدرسة'} {noteMetadata.updatedAt ? `(${noteMetadata.updatedAt.slice(0, 10)})` : ''}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400E', padding: '8px 12px', backgroundColor: '#FEF3C7', borderRadius: '6px', border: '1px solid #FDE68A' }}>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>
              لم يتم تدوين ملاحظات المراجعة الداخلية من قبل مدير المدرسة بعد (بانتظار المراجعة والاعتماد).
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
