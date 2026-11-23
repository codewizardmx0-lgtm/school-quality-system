/**
 * Component: CentralSchoolsStatusTab
 * التبويب الثاني: التقرير المركزي لحالة المدارس ومخرجاتها الإشرافية (FR-SUP-15)
 * يعرض حالة كل مدرسة ونسبة إنجازها وطلبات الاستكمال وحالة التأخير التلقائي عند مضي 80% من فترة الدورة
 * مع روابط التنقل السريع لشاشة فحص المخرج (Screen 4) وسجل المتابعة (Screen 6) — وحظر لوحات المنافسة والترتيب (No Leaderboards)
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  ClipboardList,
} from 'lucide-react';
import type { CentralSchoolsReportItem, SupervisionScreenKey } from '../../api/supervisionTypes';

interface CentralSchoolsStatusTabProps {
  schoolsReport?: CentralSchoolsReportItem[];
  onNavigate: (screen: SupervisionScreenKey, params?: { schoolId?: number; submissionId?: number }) => void;
}

export const CentralSchoolsStatusTab: React.FC<CentralSchoolsStatusTabProps> = ({
  schoolsReport = [],
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const filteredSchools = useMemo(() => {
    return schoolsReport.filter((school) => {
      // فلتر الحالة
      if (selectedStatusFilter === 'overdue' && !school.isDelayed && school.status !== 'Overdue') {
        return false;
      }
      if (selectedStatusFilter === 'completed' && school.status !== 'Completed') {
        return false;
      }
      if (selectedStatusFilter === 'needs_completion' && school.status !== 'NeedsCompletion') {
        return false;
      }
      if (selectedStatusFilter === 'under_review' && school.status !== 'UnderReview' && school.status !== 'Submitted') {
        return false;
      }
      if (selectedStatusFilter === 'draft' && school.status !== 'Draft' && (school.status as string) !== 'InProgress') {
        return false;
      }

      // بحث بالاسم أو الكود أو المديرية
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        school.schoolName.toLowerCase().includes(q) ||
        school.schoolCode.toLowerCase().includes(q) ||
        school.directorate.toLowerCase().includes(q)
      );
    });
  }, [schoolsReport, selectedStatusFilter, searchQuery]);

  // إحصائيات سريعة للتبويب
  const stats = useMemo(() => {
    return {
      total: schoolsReport.length,
      overdue: schoolsReport.filter((s) => s.isDelayed || s.status === 'Overdue').length,
      needsCompletion: schoolsReport.filter((s) => s.status === 'NeedsCompletion').length,
      completed: schoolsReport.filter((s) => s.status === 'Completed').length,
      underReview: schoolsReport.filter((s) => s.status === 'UnderReview' || s.status === 'Submitted').length,
      draft: schoolsReport.filter((s) => s.status === 'Draft' || (s.status as string) === 'InProgress').length,
    };
  }, [schoolsReport]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. شريط الفلاتر والإحصائيات السريعة */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        }}
      >
        {/* شريط البحث */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: '240px' }}>
          <Search size={15} color="#94A3B8" style={{ position: 'absolute', right: '10px' }} />
          <input
            type="text"
            placeholder="بحث باسم المدرسة أو الكود أو المديرية..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 32px 7px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#F8FAFC',
              fontSize: '12.5px',
              color: '#0F172A',
              outline: 'none',
            }}
          />
        </div>

        {/* فلاتر الحالة الإشرافية */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
          {[
            { id: 'all', label: `كافة المدارس (${stats.total})` },
            { id: 'overdue', label: `متأخرة عن التسليم 🔴 (${stats.overdue})`, color: '#991B1B', bg: '#FEF2F2', border: '#F87171' },
            { id: 'needs_completion', label: `تحتاج استكمال (${stats.needsCompletion})`, color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
            { id: 'under_review', label: `قيد المراجعة والتدقيق (${stats.underReview})`, color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
            { id: 'completed', label: `مكتملة الإقرار (${stats.completed})`, color: '#15803D', bg: '#F0FDF4', border: '#86EFAC' },
            { id: 'draft', label: `مسودة (${stats.draft})`, color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' },
          ].map((pill) => {
            const isActive = selectedStatusFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSelectedStatusFilter(pill.id)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  border: `1px solid ${isActive ? (pill.border || '#0F766E') : '#E2E8F0'}`,
                  backgroundColor: isActive ? (pill.bg || '#F0FDFA') : '#FFFFFF',
                  color: isActive ? (pill.color || '#0F766E') : '#64748B',
                  transition: 'all 0.15s ease',
                }}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. جدول التقرير المركزي لحالة المدارس ومخرجاتها */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                <th style={{ padding: '12px 14px', textAlign: 'right', width: '110px' }}>كود المدرسة</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', minWidth: '180px' }}>اسم المدرسة</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', width: '130px' }}>المرحلة</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', width: '130px' }}>المديرية</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', width: '170px' }}>حالة الملف الإشرافي</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', width: '160px' }}>إنجاز التقييم (109)</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', width: '100px' }}>المتوسط (0-3)</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', width: '120px' }}>طلبات الاستكمال</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', width: '160px' }}>الإجراءات الإشرافية</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                    لا توجد مدارس مطابقة لمعايير البحث والتصفية المختارة.
                  </td>
                </tr>
              ) : (
                filteredSchools.map((sch, idx) => {
                  const isOverdue = sch.isDelayed || sch.status === 'Overdue';
                  const isCompleted = sch.status === 'Completed';
                  const isNeedsComp = sch.status === 'NeedsCompletion';
                  const isUnderReview = sch.status === 'UnderReview' || sch.status === 'Submitted';

                  return (
                    <tr
                      key={sch.schoolId}
                      style={{
                        borderBottom: idx === filteredSchools.length - 1 ? 'none' : '1px solid #F1F5F9',
                        backgroundColor: isOverdue ? '#FFFDFD' : idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                      }}
                    >
                      {/* كود المدرسة */}
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#475569', fontSize: '12px' }}>
                        {sch.schoolCode}
                      </td>

                      {/* اسم المدرسة */}
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>
                        {sch.schoolName}
                      </td>

                      {/* المرحلة */}
                      <td style={{ padding: '12px 14px', color: '#475569', fontSize: '12px' }}>
                        {sch.stage}
                      </td>

                      {/* المديرية */}
                      <td style={{ padding: '12px 14px', color: '#64748B', fontSize: '12px' }}>
                        {sch.directorate}
                      </td>

                      {/* حالة الملف الإشرافي */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {isOverdue ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              backgroundColor: '#FEF2F2',
                              color: '#991B1B',
                              border: '1px solid #F87171',
                            }}
                          >
                            <AlertCircle size={12} />
                            <span>متأخرة عن التسليم 🔴</span>
                          </span>
                        ) : isCompleted ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              backgroundColor: '#F0FDF4',
                              color: '#15803D',
                              border: '1px solid #86EFAC',
                            }}
                          >
                            <CheckCircle2 size={12} />
                            <span>مكتملة الإقرار</span>
                          </span>
                        ) : isNeedsComp ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              backgroundColor: '#FFFBEB',
                              color: '#B45309',
                              border: '1px solid #FDE68A',
                            }}
                          >
                            <Clock size={12} />
                            <span>تحتاج استكمال ({sch.pendingRequestsCount})</span>
                          </span>
                        ) : isUnderReview ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              backgroundColor: '#EFF6FF',
                              color: '#1D4ED8',
                              border: '1px solid #BFDBFE',
                            }}
                          >
                            <FileCheck size={12} />
                            <span>{sch.statusLabel}</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              backgroundColor: '#F1F5F9',
                              color: '#64748B',
                              border: '1px solid #E2E8F0',
                            }}
                          >
                            مسودة / لم تكتمل
                          </span>
                        )}
                      </td>

                      {/* إنجاز التقييم (من 109) مع شريط تقدم أفقي */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0F172A' }}>
                            {sch.evaluatedIndicatorsCount} من 109 ({sch.completionPercentage}%)
                          </span>
                          <div
                            style={{
                              width: '100px',
                              height: '6px',
                              backgroundColor: '#E2E8F0',
                              borderRadius: '999px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${sch.completionPercentage}%`,
                                height: '100%',
                                backgroundColor: sch.completionPercentage === 100 ? '#10B981' : '#0D9488',
                                borderRadius: '999px',
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* المتوسط الحسابي */}
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#0F172A' }}>
                        {sch.averageScore !== null ? sch.averageScore.toFixed(2) : '—'}
                      </td>

                      {/* طلبات الاستكمال */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {sch.completionRequestsCount > 0 ? (
                          <span style={{ fontSize: '12px', fontWeight: 600, color: sch.pendingRequestsCount > 0 ? '#D97706' : '#64748B' }}>
                            {sch.completionRequestsCount} طلب {sch.pendingRequestsCount > 0 ? `(${sch.pendingRequestsCount} نشط)` : ''}
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94A3B8' }}>—</span>
                        )}
                      </td>

                      {/* الإجراءات الإشرافية السريعة */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          {/* زر فحص المخرج (الشاشة 4) */}
                          <button
                            type="button"
                            onClick={() => onNavigate('submissions', { schoolId: sch.schoolId, submissionId: sch.latestSubmissionId ?? undefined })}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '5px 8px',
                              backgroundColor: '#EFF6FF',
                              color: '#1D4ED8',
                              border: '1px solid #BFDBFE',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            title="الانتقال إلى شاشة فحص وتدقيق مخرج التقييم (الشاشة 4)"
                          >
                            <FileText size={12} />
                            <span>فحص</span>
                          </button>

                          {/* زر سجل المتابعة (الشاشة 6) */}
                          <button
                            type="button"
                            onClick={() => onNavigate('tracking-log', { schoolId: sch.schoolId })}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '5px 8px',
                              backgroundColor: '#F0FDFA',
                              color: '#0F766E',
                              border: '1px solid #99F6E4',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            title="الانتقال إلى سجل إجراءات المتابعة والزيارات الميدانية (الشاشة 6)"
                          >
                            <ClipboardList size={12} />
                            <span>سجل المتابعة</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};