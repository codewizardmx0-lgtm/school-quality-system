/**
 * Component: SchoolTrackingLogPage
 * الشاشة 5: سجل إجراءات المتابعة الميدانية والخط الزمني والمذكرات
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 */

import React, { useState } from 'react';
import {
  ArrowRight,
  Plus,
  FileCheck2,
  FileEdit,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useSchoolTrackingLog } from '../../hooks/useSchoolTrackingLog';
import { MilestoneTimelineView } from './MilestoneTimelineView';
import { AddSupervisorMemoModal } from './AddSupervisorMemoModal';
import { EmptySupervisionState } from '../common/EmptySupervisionState';
import type { SupervisionScreenKey } from '../../api/supervisionTypes';

interface SchoolTrackingLogPageProps {
  schoolId?: number;
  onNavigate: (screen: SupervisionScreenKey, params?: { submissionId?: number; schoolId?: number }) => void;
}

export const SchoolTrackingLogPage: React.FC<SchoolTrackingLogPageProps> = ({
  schoolId = 104,
  onNavigate,
}) => {
  const {
    school,
    milestones,
    memos,
    error,
    refetch,
    isAddingMemo,
    addMemo,
    handleExportPdf,
  } = useSchoolTrackingLog(schoolId);

  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* 1. الترويسة وسياق المدرسة وأزرار الإجراءات */}
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
                {school?.schoolCode ?? 'SCH-104'}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#B45309',
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                {school?.outputStatusArabic ?? 'يحتاج استكمال'}
              </span>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              سجل إجراءات المتابعة والزيارات الإشرافية — {school?.schoolName ?? 'مدرسة بلقيس النموذجية للبنات'}
            </h1>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              النطاق: {school?.governorate ?? 'أمانة العاصمة'} • إجمالي المحطات الموثقة:{' '}
              {school?.totalMilestones ?? milestones.length} محطات
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleExportPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Download size={15} />
              <span>تصدير السجل (PDF)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              }}
            >
              <Plus size={16} />
              <span>إضافة مذكرة / زيارة</span>
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <EmptySupervisionState
          isError={true}
          title="تعذر تحميل سجل المتابعة"
          description={error}
          actionText="إعادة المحاولة"
          onAction={refetch}
        />
      ) : (
        /* 2. مساحة العمل بعمودين */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* العمود الأيمن: الخط الزمني المرئي */}
          <MilestoneTimelineView milestones={milestones} />

          {/* العمود الأيسر: المذكرات والزيارات الرسمية الميدانية */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                المذكرات الإشرافية والزيارات ({memos.length})
              </h2>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#2563EB',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                + إضافة جديدة
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {memos.map((memo) => (
                <div
                  key={memo.id}
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    backgroundColor: '#FAFBFD',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor:
                          memo.memoType === 'زيارة ميدانية'
                            ? '#F5F3FF'
                            : memo.memoType === 'اتصال هاتفي'
                            ? '#FEF3C7'
                            : '#EFF6FF',
                        color:
                          memo.memoType === 'زيارة ميدانية'
                            ? '#6D28D9'
                            : memo.memoType === 'اتصال هاتفي'
                            ? '#92400E'
                            : '#1D4ED8',
                      }}
                    >
                      {memo.memoType}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}>
                      {memo.isVisibleToSchool ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#059669' }}>
                          <Eye size={12} /> ظاهرة للمدرسة
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#64748B' }}>
                          <EyeOff size={12} /> داخلية
                        </span>
                      )}
                    </div>
                  </div>

                  <h3
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#0F172A',
                      margin: '0 0 6px 0',
                    }}
                  >
                    {memo.subject}
                  </h3>

                  <p
                    style={{
                      fontSize: '12px',
                      color: '#475569',
                      margin: '0 0 10px 0',
                      lineHeight: 1.5,
                    }}
                  >
                    {memo.details}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: '#94A3B8',
                      paddingTop: '6px',
                      borderTop: '1px solid #F1F5F9',
                    }}
                  >
                    <span>{memo.authorName}</span>
                    <span>
                      {new Date(memo.createdAt).toLocaleDateString('ar-YE', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. شريط التنقل السفلي السريع */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginTop: '24px',
          padding: '16px 20px',
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
        }}
      >
        <span style={{ fontSize: '13px', color: '#64748B' }}>
          إجراءات سريعة لملف مدرسة بلقيس النموذجية للبنات (SCH-104)
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => onNavigate('submissions', { submissionId: 101, schoolId })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              border: '1px solid #BFDBFE',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <FileCheck2 size={15} />
            <span>فتح مخرج التقييم الكامل</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('completion-requests', { submissionId: 101, schoolId })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#FEF3C7',
              color: '#B45309',
              border: '1px solid #FDE68A',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <FileEdit size={15} />
            <span>عرض طلب الاستكمال النشط</span>
          </button>
        </div>
      </div>

      {/* النافذة المنبثقة لإضافة مذكرة */}
      <AddSupervisorMemoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={addMemo}
        isSubmitting={isAddingMemo}
      />
    </div>
  );
};
