/**
 * Component: SchoolsStatusMatrixTable
 * مصفوفة حالة المدارس الميدانية الرباعية
 * الامتثال الصارم لمعايير UI_STANDARDS (§4):
 * - احتواء أفقي كامل بـ overflowX: auto و -webkit-overflow-scrolling: touch
 * - minWidth لا يقل عن 1020px لضمان عدم انكسار الجدول في الشاشات الصغيرة
 * - إجراءات إشرافية مباشرة وغير معطلة (Zero Dead Buttons)
 */

import React from 'react';
import {
  FileCheck2,
  ClipboardList,
  AlertCircle,
  History,
  CheckCircle2,
} from 'lucide-react';
import type { SchoolStatusMatrixRow } from '../../api/supervisionTypes';

interface SchoolsStatusMatrixTableProps {
  schools: SchoolStatusMatrixRow[];
  onReviewSubmission: (submissionId: number, schoolId: number) => void;
  onOpenTrackingLog: (schoolId: number) => void;
  onOpenCompletionRequest?: (submissionId: number, schoolId: number) => void;
  onCompareHistorical: (schoolId: number) => void;
}

export const SchoolsStatusMatrixTable: React.FC<SchoolsStatusMatrixTableProps> = ({
  schools,
  onReviewSubmission,
  onOpenTrackingLog,
  onCompareHistorical,
}) => {
  const getStatusBadge = (status: string, statusArabic: string) => {
    switch (status) {
      case 'NeedsCompletion':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: '#FEF3C7',
              color: '#B45309',
              border: '1px solid #FDE68A',
              fontSize: '12px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D97706' }} />
            {statusArabic || 'يحتاج استكمال'}
          </span>
        );

      case 'Submitted':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              border: '1px solid #BFDBFE',
              fontSize: '12px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
            {statusArabic || 'مرفوع جديد'}
          </span>
        );

      case 'UnderReview':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: '#F5F3FF',
              color: '#6D28D9',
              border: '1px solid #DDD6FE',
              fontSize: '12px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#7C3AED' }} />
            {statusArabic || 'قيد المراجعة'}
          </span>
        );

      case 'Completed':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: '#ECFDF5',
              color: '#047857',
              border: '1px solid #A7F3D0',
              fontSize: '12px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            <CheckCircle2 size={13} color="#059669" />
            {statusArabic || 'مكتمل المراجعة'}
          </span>
        );

      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: '#F1F5F9',
              color: '#475569',
              border: '1px solid #E2E8F0',
              fontSize: '12px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#94A3B8' }} />
            {statusArabic || 'مسودة'}
          </span>
        );
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
      }}
    >
      {/* Scroll Container الإلزامي لحماية التجاوب (§4) */}
      <div
        style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          width: '100%',
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: '1040px',
            borderCollapse: 'collapse',
            textAlign: 'right',
            direction: 'rtl',
            fontSize: '13px',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                color: '#475569',
              }}
            >
              <th style={{ padding: '14px 16px', fontWeight: 700, width: '22%' }}>المدرسة والرمز</th>
              <th style={{ padding: '14px 14px', fontWeight: 700, width: '18%' }}>إنجاز التقييم الذاتي</th>
              <th style={{ padding: '14px 14px', fontWeight: 700, width: '16%' }}>حالة المخرج الوزاري</th>
              <th style={{ padding: '14px 14px', fontWeight: 700, width: '14%' }}>طلبات الاستكمال</th>
              <th style={{ padding: '14px 14px', fontWeight: 700, width: '12%' }}>خطة التحسين</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, width: '18%', textAlign: 'center' }}>
                الإجراءات الإشرافية
              </th>
            </tr>
          </thead>
          <tbody>
            {schools.map((school, idx) => {
              const isEven = idx % 2 === 1;
              return (
                <tr
                  key={school.schoolId}
                  style={{
                    backgroundColor: isEven ? '#FAFBFD' : '#FFFFFF',
                    borderBottom: '1px solid #F1F5F9',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0F7FF')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isEven ? '#FAFBFD' : '#FFFFFF')}
                >
                  {/* المدرسة والرمز والمرحلة */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: '#0F172A',
                          fontSize: '14px',
                        }}
                      >
                        {school.schoolName}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#2563EB',
                            backgroundColor: '#EFF6FF',
                            padding: '1px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {school.schoolCode}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          {school.educationalStage}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* نسبة إنجاز التقييم الذاتي */}
                  <td style={{ padding: '14px 14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '160px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                        <span style={{ color: school.selfEvaluationProgress === 100 ? '#059669' : '#D97706' }}>
                          {school.selfEvaluationProgress}%
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                          {school.selfEvaluationProgress === 100 ? 'مكتمل (56/56)' : 'قيد الإدخال'}
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '6px',
                          backgroundColor: '#E2E8F0',
                          borderRadius: '999px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${school.selfEvaluationProgress}%`,
                            height: '100%',
                            backgroundColor:
                              school.selfEvaluationProgress === 100 ? '#10B981' : '#F59E0B',
                            borderRadius: '999px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* حالة المخرج */}
                  <td style={{ padding: '14px 14px' }}>
                    {getStatusBadge(school.outputStatus, school.outputStatusArabic)}
                  </td>

                  {/* طلبات الاستكمال */}
                  <td style={{ padding: '14px 14px' }}>
                    {school.completionRequestsCount > 0 ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#B45309',
                        }}
                      >
                        <AlertCircle size={14} color="#D97706" />
                        <span>{school.completionRequestsCount} طلب استكمال</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>لا توجد طلبات</span>
                    )}
                  </td>

                  {/* خطة التحسين */}
                  <td style={{ padding: '14px 14px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: school.improvementPlanStatus === 'مكتملة' ? '#059669' : '#64748B',
                      }}
                    >
                      {school.improvementPlanStatus}
                    </span>
                  </td>

                  {/* الإجراءات الإشرافية المباشرة */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      {/* زر مراجعة المخرج */}
                      <button
                        type="button"
                        onClick={() =>
                          onReviewSubmission(school.latestSubmissionId, school.schoolId)
                        }
                        title="مراجعة وتدقيق المخرج"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 10px',
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: 'none',
                          boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
                      >
                        <FileCheck2 size={14} />
                        <span>مراجعة</span>
                      </button>

                      {/* زر سجل إجراءات المتابعة */}
                      <button
                        type="button"
                        onClick={() => onOpenTrackingLog(school.schoolId)}
                        title="سجل المتابعة والمذكرات الإشرافية"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 8px',
                          backgroundColor: '#F8FAFC',
                          color: '#475569',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#EFF6FF';
                          e.currentTarget.style.color = '#2563EB';
                          e.currentTarget.style.borderColor = '#BFDBFE';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#F8FAFC';
                          e.currentTarget.style.color = '#475569';
                          e.currentTarget.style.borderColor = '#CBD5E1';
                        }}
                      >
                        <ClipboardList size={14} />
                        <span>سجل</span>
                      </button>

                      {/* زر المقارنة التاريخية */}
                      <button
                        type="button"
                        onClick={() => onCompareHistorical(school.schoolId)}
                        title="المقارنة التراكمية عبر الدورات"
                        style={{
                          width: '30px',
                          height: '30px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#F8FAFC',
                          color: '#64748B',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F1F5F9';
                          e.currentTarget.style.color = '#0F172A';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#F8FAFC';
                          e.currentTarget.style.color = '#64748B';
                        }}
                      >
                        <History size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
