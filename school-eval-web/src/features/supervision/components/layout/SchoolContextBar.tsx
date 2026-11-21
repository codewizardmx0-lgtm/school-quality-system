/**
 * Component: SchoolContextBar
 * شريط سياق المدرسة الموحد الثابت للواجهات الإشرافية الأربع:
 * (الشاشة 4: مراجعة المخرجات، الشاشة 5: طلبات الاستكمال، الشاشة 6: سجل المتابعة، الشاشة 8: المقارنة التاريخية)
 * منصة ارتقاء للتقييم والتحسين المدرسي
 */

import React from 'react';
import {
  Building2,
  MapPin,
  GraduationCap,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import type { ReviewableSubmissionItem } from '../../api/supervisionTypes';

interface SchoolContextBarProps {
  schools: ReviewableSubmissionItem[];
  selectedSchoolId?: number;
  selectedSubmissionId?: number;
  onSelectSchool: (school: ReviewableSubmissionItem) => void;
  isLoading?: boolean;
}

export const SchoolContextBar: React.FC<SchoolContextBarProps> = ({
  schools,
  selectedSchoolId,
  selectedSubmissionId,
  onSelectSchool,
  isLoading = false,
}) => {
  // المدرسة النشطة الحالية
  const activeSchool = schools.find(
    (s) =>
      (selectedSubmissionId && s.submissionId === selectedSubmissionId) ||
      (selectedSchoolId && s.schoolId === selectedSchoolId)
  ) || schools[0];

  if (isLoading && schools.length === 0) {
    return (
      <div
        style={{
          padding: '10px 24px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div style={{ width: '220px', height: '32px', backgroundColor: '#E2E8F0', borderRadius: '6px' }} className="animate-pulse" />
        <div style={{ width: '120px', height: '24px', backgroundColor: '#E2E8F0', borderRadius: '6px' }} className="animate-pulse" />
      </div>
    );
  }

  if (schools.length === 0 && !activeSchool) {
    return null;
  }

  const statusConfig = {
    Completed: { label: 'مكتمل المراجعة', bg: '#DCFCE7', text: '#15803D', border: '#86EFAC', icon: CheckCircle2 },
    NeedsCompletion: { label: 'يحتاج استكمال', bg: '#FEF3C7', text: '#B45309', border: '#FCD34D', icon: Clock },
    Submitted: { label: 'مرفوع جديد', bg: '#EFF6FF', text: '#1D4ED8', border: '#93C5FD', icon: RotateCcw },
    UnderReview: { label: 'قيد التدقيق الإشرافي', bg: '#F5F3FF', text: '#6D28D9', border: '#C4B5FD', icon: Clock },
    Draft: { label: 'مسودة', bg: '#F1F5F9', text: '#475569', border: '#CBD5E1', icon: AlertTriangle },
  }[activeSchool?.status || 'Submitted'] || {
    label: activeSchool?.statusArabic || activeSchool?.status || 'مرفوع',
    bg: '#F1F5F9',
    text: '#475569',
    border: '#CBD5E1',
    icon: Clock,
  };

  const StatusIcon = statusConfig.icon;

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
        padding: '10px 28px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      {/* 1. القائمة المنسدلة لاختيار المدرسة ومعلومات الهوية */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', flex: 1, minWidth: '320px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={18} color="#2563EB" />
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B' }}>
            سياق المدرسة:
          </span>
        </div>

        {schools.length > 1 ? (
          <div style={{ position: 'relative' }}>
            <select
              value={activeSchool?.submissionId || ''}
              onChange={(e) => {
                const subId = Number(e.target.value);
                const found = schools.find((s) => s.submissionId === subId);
                if (found) onSelectSchool(found);
              }}
              style={{
                padding: '6px 28px 6px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                fontSize: '13px',
                fontWeight: 800,
                color: '#0F172A',
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                minWidth: '220px',
              }}
            >
              {schools.map((s) => (
                <option key={s.submissionId} value={s.submissionId}>
                  {s.schoolName} ({s.schoolCode}) — {s.statusArabic || s.status}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748B',
                pointerEvents: 'none',
              }}
            />
          </div>
        ) : (
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#0F172A' }}>
            {activeSchool?.schoolName || 'مدرسة التقييم'}
          </div>
        )}

        {/* رمز المدرسة والكود الرسمي */}
        {activeSchool && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: '#1E293B',
              backgroundColor: '#F1F5F9',
              border: '1px solid #CBD5E1',
              padding: '2px 8px',
              borderRadius: '6px',
            }}
          >
            {activeSchool.schoolCode}
          </span>
        )}

        {/* المرحلة التعليمية */}
        {activeSchool?.educationalStage && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#0369A1',
              backgroundColor: '#E0F2FE',
              padding: '2px 8px',
              borderRadius: '6px',
            }}
          >
            <GraduationCap size={13} />
            <span>{activeSchool.educationalStage}</span>
          </span>
        )}

        {/* النطاق الجغرافي: المحافظة والمديرية */}
        {activeSchool?.governorate && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#475569',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: '2px 8px',
              borderRadius: '6px',
            }}
          >
            <MapPin size={12} color="#059669" />
            <span>
              {activeSchool.governorate}
              {activeSchool.directorate ? ` — ${activeSchool.directorate}` : ''}
            </span>
          </span>
        )}
      </div>

      {/* 2. شارات حالة المخرج ورقم المحاولة الحالية */}
      {activeSchool && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* محاولة التسليم */}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: activeSchool.attemptNo >= 3 ? '#991B1B' : '#92400E',
              backgroundColor: activeSchool.attemptNo >= 3 ? '#FEE2E2' : '#FEF3C7',
              border: `1px solid ${activeSchool.attemptNo >= 3 ? '#FECACA' : '#FDE68A'}`,
              padding: '3px 8px',
              borderRadius: '6px',
            }}
          >
            المحاولة {activeSchool.attemptNo} من 3
          </span>

          {/* شارة الحالة النظامية */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor: statusConfig.bg,
              color: statusConfig.text,
              border: `1px solid ${statusConfig.border}`,
            }}
          >
            <StatusIcon size={12} />
            <span>{statusConfig.label}</span>
          </span>
        </div>
      )}
    </div>
  );
};
