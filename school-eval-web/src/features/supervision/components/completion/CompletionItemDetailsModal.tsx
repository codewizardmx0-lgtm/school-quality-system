/**
 * Component: CompletionItemDetailsModal
 * نافذة عرض تفاصيل وبنود طلب الاستكمال الصادر
 * منصة ارتقاء للتقييم والتحسين المدرسي
 */

import React from 'react';
import {
  X,
  FileText,
  RotateCcw,
} from 'lucide-react';
import type { CompletionTrackerItem } from '../../api/supervisionTypes';

interface CompletionItemDetailsModalProps {
  request: CompletionTrackerItem | null;
  onClose: () => void;
  onReviewUpdatedSubmission?: (submissionId: number, schoolId: number) => void;
}

export const CompletionItemDetailsModal: React.FC<CompletionItemDetailsModalProps> = ({
  request,
  onClose,
  onReviewUpdatedSubmission,
}) => {
  if (!request) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* الترويسة */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D97706',
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  طلب استكمال #{request.requestId}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#1E293B',
                    backgroundColor: '#E2E8F0',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  المحاولة {request.attemptNo}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: request.isOverdue
                      ? '#DC2626'
                      : request.isResubmitted
                      ? '#0284C7'
                      : request.status === 'Open'
                      ? '#D97706'
                      : '#059669',
                    backgroundColor: request.isOverdue
                      ? '#FEE2E2'
                      : request.isResubmitted
                      ? '#E0F2FE'
                      : request.status === 'Open'
                      ? '#FEF3C7'
                      : '#ECFDF5',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {request.statusDisplay}
                </span>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '4px 0 0 0' }}>
                {request.schoolName} ({request.schoolCode})
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* جسم النافذة */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            maxHeight: 'calc(90vh - 170px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* شريط معلومات السياق والمهلة */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              backgroundColor: '#F8FAFC',
              padding: '14px 18px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600 }}>
                النطاق الجغرافي
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                {request.governorate} — {request.directorate}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600 }}>
                تاريخ الإصدار
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                {request.issuedAt ? new Date(request.issuedAt).toLocaleDateString('ar-YE') : '—'}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600 }}>
                تاريخ المهلة النظامية
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: request.isOverdue ? '#DC2626' : '#B45309',
                }}
              >
                {request.deadline || '—'}{' '}
                {request.isOverdue ? (
                  <span style={{ fontSize: '11px', color: '#DC2626' }}>(متأخر)</span>
                ) : (
                  <span style={{ fontSize: '11px', color: '#059669' }}>
                    (متبقي {request.daysRemaining} يوم)
                  </span>
                )}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600 }}>
                مرات التمديد
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                {request.extensionsCount > 0 ? `${request.extensionsCount} مرات تمديد` : 'لم تُمدد'}
              </span>
            </div>
          </div>

          {/* التوجيهات العامة */}
          {request.notes && (
            <div
              style={{
                padding: '14px 18px',
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '10px',
              }}
            >
              <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#92400E', margin: '0 0 4px 0' }}>
                توجيهات وملاحظات المشرف الوزاري:
              </h4>
              <p style={{ fontSize: '13px', color: '#78350F', margin: 0, lineHeight: 1.6 }}>
                {request.notes}
              </p>
            </div>
          )}

          {/* جدول البنود المحددة */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: '0 0 10px 0' }}>
              البنود والمؤشرات المشمولة بالفك الجزئي ({request.itemsCount} مؤشرات):
            </h3>

            <div
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'right' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', width: '90px' }}>
                      الرمز
                    </th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>
                      المؤشر والمعيار
                    </th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>
                      الخلل / النقص المرصود
                    </th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', width: '90px' }}>
                      الحالة
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {request.items.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      style={{
                        borderBottom: idx < request.items.length - 1 ? '1px solid #F1F5F9' : 'none',
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#0F766E' }}>
                        {item.code}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: '2px' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {item.standardName}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155', lineHeight: 1.5 }}>
                        <div>{item.missingDescription || '—'}</div>
                        {item.directives && (
                          <div style={{ fontSize: '11px', color: '#92400E', marginTop: '4px' }}>
                            <strong>التوجيه الإشرافي:</strong> {item.directives}
                          </div>
                        )}
                        {item.allowedActions && item.allowedActions.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                            {item.allowedActions.map((act) => {
                              const labels: Record<string, string> = {
                                upload_replace_evidence: 'رفع / استبدال الشواهد',
                                edit_justification: 'تعديل مبرر التقدير',
                                review_score: 'مراجعة وتصويب الدرجة',
                                link_improvement_plan: 'ربط بخطة التحسين',
                              };
                              return (
                                <span
                                  key={act}
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: '#EFF6FF',
                                    color: '#1D4ED8',
                                    border: '1px solid #BFDBFE',
                                  }}
                                >
                                  {labels[act] || act}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: item.status === 'Resolved' ? '#ECFDF5' : '#FEF3C7',
                            color: item.status === 'Resolved' ? '#059669' : '#D97706',
                          }}
                        >
                          {item.status === 'Resolved' ? 'مستوفى' : 'قيد الانتظار'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* التذييل */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {request.isResubmitted && onReviewUpdatedSubmission && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReviewUpdatedSubmission(request.submissionId, request.schoolId);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: '#0284C7',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={15} />
                <span>مراجعة المخرج المحدّث في الشاشة 4</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
