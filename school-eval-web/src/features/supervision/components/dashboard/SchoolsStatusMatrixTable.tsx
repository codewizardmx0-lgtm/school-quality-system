/**
 * Component: SchoolsStatusMatrixTable
 * مصفوفة حالة المدارس الميدانية الرباعية
 * الامتثال الصارم لمعايير UI_STANDARDS (§4):
 * - احتواء أفقي كامل بـ overflowX: auto و -webkit-overflow-scrolling: touch
 * - minWidth لا يقل عن 1020px لضمان عدم انكسار الجدول في الشاشات الصغيرة
 * - إجراءات إشرافية مباشرة وغير معطلة (Zero Dead Buttons)
 */

import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  ClipboardList,
  AlertCircle,
  History,
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { SchoolStatusMatrixRow } from '../../api/supervisionTypes';

interface SchoolsStatusMatrixTableProps {
  schools: SchoolStatusMatrixRow[];
  onReviewSubmission: (submissionId: number, schoolId: number, schoolName?: string) => void;
  onOpenTrackingLog: (schoolId: number, schoolName?: string) => void;
  onOpenCompletionRequest?: (submissionId: number, schoolId: number, schoolName?: string) => void;
  onCompareHistorical: (schoolId: number, schoolName?: string) => void;
}

type MatrixSortKey =
  | 'schoolName'
  | 'selfEvaluationProgress'
  | 'outputStatus'
  | 'completionRequestsCount'
  | 'improvementPlanStatus';
type SortDirection = 'asc' | 'desc';

/**
 * احتساب وزن الأولوية الإشرافية المركبة لفرز حالات المدارس:
 * Submitted (50) -> UnderReview (40) -> NeedsCompletion (30) -> Draft (20) -> Completed (10)
 * مع منح شارة التأخير (+5) لرفع أولوية المدرسة المتأخرة داخل مجموعتها
 */
const getStatusPriorityWeight = (school: SchoolStatusMatrixRow): number => {
  let weight: number;
  switch (school.outputStatus) {
    case 'Submitted':
      weight = 50;
      break;
    case 'UnderReview':
      weight = 40;
      break;
    case 'NeedsCompletion':
      weight = 30;
      break;
    case 'Draft':
      weight = 20;
      break;
    case 'Completed':
      weight = 10;
      break;
    default:
      weight = 0;
  }
  if (school.isDelayed) {
    weight += 5; // ترفع أولوية المدرسة المتأخرة عن التسليم
  }
  return weight;
};

const formatLastActionDate = (dateStr?: string): string => {
  if (!dateStr) return 'لم يُسجل إجراء بعد';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'لم يُسجل إجراء بعد';
  return d.toLocaleDateString('ar-YE', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const SchoolsStatusMatrixTable: React.FC<SchoolsStatusMatrixTableProps> = ({
  schools,
  onReviewSubmission,
  onOpenTrackingLog,
  onCompareHistorical,
}) => {
  const [sortKey, setSortKey] = useState<MatrixSortKey>('schoolName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (key: MatrixSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(
        key === 'selfEvaluationProgress' || key === 'completionRequestsCount' || key === 'outputStatus'
          ? 'desc'
          : 'asc'
      );
    }
  };

  const renderSortIndicator = (key: MatrixSortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown size={13} style={{ opacity: 0.35, flexShrink: 0 }} />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={13} style={{ color: '#2563EB', flexShrink: 0 }} />
    ) : (
      <ArrowDown size={13} style={{ color: '#2563EB', flexShrink: 0 }} />
    );
  };

  const sortedSchools = useMemo(() => {
    const list = [...schools];
    return list.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortKey) {
        case 'schoolName':
          valA = a.schoolName;
          valB = b.schoolName;
          break;
        case 'selfEvaluationProgress':
          valA = a.selfEvaluationProgress ?? 0;
          valB = b.selfEvaluationProgress ?? 0;
          break;
        case 'outputStatus':
          valA = getStatusPriorityWeight(a);
          valB = getStatusPriorityWeight(b);
          break;
        case 'completionRequestsCount':
          valA = a.completionRequestsCount ?? 0;
          valB = b.completionRequestsCount ?? 0;
          break;
        case 'improvementPlanStatus':
          valA = a.improvementPlanStatus || '';
          valB = b.improvementPlanStatus || '';
          break;
        default:
          return 0;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA || '');
      const strB = String(valB || '');
      return sortDirection === 'asc'
        ? strA.localeCompare(strB, 'ar')
        : strB.localeCompare(strA, 'ar');
    });
  }, [schools, sortKey, sortDirection]);
  const getStatusBadge = (status: string, statusArabic: string, isDelayed?: boolean) => {
    if (isDelayed) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '999px',
            backgroundColor: '#FEF2F2',
            color: '#B91C1C',
            border: '1px solid #FECACA',
            fontSize: '12px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          <AlertCircle size={13} color="#DC2626" />
          متأخرة عن التسليم
        </span>
      );
    }

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
            {statusArabic || 'مكتمل'}
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
              <th
                onClick={() => handleSort('schoolName')}
                style={{
                  padding: '14px 16px',
                  fontWeight: 700,
                  width: '22%',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background-color 0.15s ease',
                  backgroundColor: sortKey === 'schoolName' ? '#EFF6FF' : undefined,
                  color: sortKey === 'schoolName' ? '#1D4ED8' : undefined,
                }}
                title="انقر لفرز المدارس أبجدياً"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>المدرسة والرمز</span>
                  {renderSortIndicator('schoolName')}
                </div>
              </th>

              <th
                onClick={() => handleSort('selfEvaluationProgress')}
                style={{
                  padding: '14px 14px',
                  fontWeight: 700,
                  width: '18%',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background-color 0.15s ease',
                  backgroundColor: sortKey === 'selfEvaluationProgress' ? '#EFF6FF' : undefined,
                  color: sortKey === 'selfEvaluationProgress' ? '#1D4ED8' : undefined,
                }}
                title="انقر للفرز بحسب نسبة إنجاز التقييم الذاتي"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>إنجاز التقييم الذاتي</span>
                  {renderSortIndicator('selfEvaluationProgress')}
                </div>
              </th>

              <th
                onClick={() => handleSort('outputStatus')}
                style={{
                  padding: '14px 14px',
                  fontWeight: 700,
                  width: '16%',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background-color 0.15s ease',
                  backgroundColor: sortKey === 'outputStatus' ? '#EFF6FF' : undefined,
                  color: sortKey === 'outputStatus' ? '#1D4ED8' : undefined,
                }}
                title="انقر للفرز بحسب حالة المخرج الوزاري"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>حالة المخرج الوزاري</span>
                  {renderSortIndicator('outputStatus')}
                </div>
              </th>

              <th
                onClick={() => handleSort('completionRequestsCount')}
                style={{
                  padding: '14px 14px',
                  fontWeight: 700,
                  width: '14%',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background-color 0.15s ease',
                  backgroundColor: sortKey === 'completionRequestsCount' ? '#EFF6FF' : undefined,
                  color: sortKey === 'completionRequestsCount' ? '#1D4ED8' : undefined,
                }}
                title="انقر للفرز بحسب طلبات الاستكمال"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>طلبات الاستكمال</span>
                  {renderSortIndicator('completionRequestsCount')}
                </div>
              </th>

              <th
                onClick={() => handleSort('improvementPlanStatus')}
                style={{
                  padding: '14px 14px',
                  fontWeight: 700,
                  width: '12%',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background-color 0.15s ease',
                  backgroundColor: sortKey === 'improvementPlanStatus' ? '#EFF6FF' : undefined,
                  color: sortKey === 'improvementPlanStatus' ? '#1D4ED8' : undefined,
                }}
                title="انقر للفرز بحسب حالة خطة التحسين"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>خطة التحسين</span>
                  {renderSortIndicator('improvementPlanStatus')}
                </div>
              </th>

              <th style={{ padding: '14px 16px', fontWeight: 700, width: '18%', textAlign: 'center' }}>
                الإجراءات الإشرافية
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedSchools.map((school, idx) => {
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
                  {/* المدرسة والرمز والمرحلة وفريق التقييم */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: '#0F172A',
                          fontSize: '14px',
                        }}
                      >
                        {school.schoolName}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                          {school.educationalStage} • {school.governorate}
                        </span>
                      </div>
                      {/* بيانات مدير المدرسة والمقيم وتاريخ آخر إجراء */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px', fontSize: '11px', color: '#64748B' }}>
                        <span>
                          <strong style={{ color: '#475569' }}>المدير:</strong> {school.principalName || 'غير محدد'}
                          {' • '}
                          <strong style={{ color: '#475569' }}>المقيم:</strong> {school.evaluatorName || 'غير محدد'}
                        </span>
                        <span style={{ fontSize: '10px', color: '#94A3B8' }}>
                          آخر إجراء: {formatLastActionDate(school.lastActionDate)}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* نسبة إنجاز التقييم الذاتي وتغطية الشواهد */}
                  <td style={{ padding: '14px 14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '210px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                        <span style={{ color: school.selfEvaluationProgress === 100 ? '#059669' : '#D97706' }}>
                          {school.selfEvaluationProgress}%
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                          {school.scoredIndicatorsCount ?? (school.selfEvaluationProgress === 100 ? 109 : Math.round((school.selfEvaluationProgress * 109) / 100))} / {school.totalIndicatorsCount ?? 109} مؤشراً
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
                      {/* تفصيلة تغطية متطلبات الشواهد */}
                      <div
                        style={{
                          fontSize: '10.5px',
                          color: '#475569',
                          backgroundColor: '#F8FAFC',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          border: '1px solid #E2E8F0',
                          lineHeight: 1.4,
                        }}
                      >
                        <div>
                          <strong style={{ color: '#2563EB' }}>الشواهد:</strong> {school.coveredRequirementsCount ?? 0} / {school.totalRequirementsCount ?? 278} متطلب
                        </div>
                        <div style={{ color: '#64748B', fontSize: '10px' }}>
                          ({school.documentsCount ?? 0} وثيقة • {school.evidenceCount ?? 0} مرفق)
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* حالة المخرج */}
                  <td style={{ padding: '14px 14px' }}>
                    {getStatusBadge(school.outputStatus, school.outputStatusArabic, school.isDelayed)}
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
                      {/* زر مراجعة المخرج (معطل بحالة المسودة Draft) */}
                      {school.outputStatus === 'Draft' ? (
                        <button
                          type="button"
                          disabled={true}
                          title="لم يُرفع مخرج التقييم من قِبل المدرسة بعد"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            backgroundColor: '#F1F5F9',
                            color: '#94A3B8',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'not-allowed',
                            border: '1px solid #E2E8F0',
                            boxShadow: 'none',
                          }}
                        >
                          <FileCheck2 size={14} color="#94A3B8" />
                          <span>مراجعة</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            onReviewSubmission(school.latestSubmissionId, school.schoolId, school.schoolName)
                          }
                          title="مراجعة وتدقيق مخرج التقييم"
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
                      )}

                      {/* زر سجل إجراءات المتابعة */}
                      <button
                        type="button"
                        onClick={() => onOpenTrackingLog(school.schoolId, school.schoolName)}
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
                        onClick={() => onCompareHistorical(school.schoolId, school.schoolName)}
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
