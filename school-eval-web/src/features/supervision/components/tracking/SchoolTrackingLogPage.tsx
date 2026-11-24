/**
 * Component: SchoolTrackingLogPage
 * الشاشة 6: سجل إجراءات المتابعة الميدانية والخط الزمني والمذكرات
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 * 
 * متوافق تماماً مع وثيقة التخرج النسخة 5:
 * UC-SUP-06 و FR-SUP-08 و FR-SUP-16 و FR-SUP-17 و BR-MIN-02 و BR-MIN-03 و NFR-INT-02
 * تخطيط 100% Full-Width بنظام التبويبين (Option A)
 * شريط KPIs خماسي، تصدير ثنائي Excel و PDF، وسجل محمي من التعديل والحذف
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
  History,
  FileSpreadsheet,
  FileText,
  MapPin,
  PhoneCall,
  RotateCcw,
  Clock,
  CheckCircle,
  Activity,
  Search,
  X,
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
  schoolId,
  onNavigate,
}) => {
  const {
    school,
    kpis,
    availableSubmissions,
    availableCompletionRequests,
    availableCycles,
    milestones,
    memos,
    error,
    refetch,
    isAddingMemo,
    addMemo,
    handleExportPdf,
    handleExportExcel,
  } = useSchoolTrackingLog(schoolId);

  const [activeTab, setActiveTab] = useState<'timeline' | 'memos'>('timeline');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [memoTypeFilter, setMemoTypeFilter] = useState<string>('all');
  const [memoSearchTerm, setMemoSearchTerm] = useState<string>('');

  // تصفية المذكرات في التبويب الثاني
  const filteredMemos = memos.filter((memo) => {
    if (memoTypeFilter !== 'all') {
      if (memo.memoType !== memoTypeFilter) return false;
    }
    if (memoSearchTerm.trim()) {
      const q = memoSearchTerm.trim().toLowerCase();
      const matchSubject = memo.subject?.toLowerCase().includes(q);
      const matchDetails = memo.details?.toLowerCase().includes(q);
      const matchAuthor = memo.authorName?.toLowerCase().includes(q);
      if (!matchSubject && !matchDetails && !matchAuthor) return false;
    }
    return true;
  });

  const getMemoBadgeStyle = (type: string) => {
    switch (type) {
      case 'زيارة ميدانية':
        return { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', icon: MapPin };
      case 'اتصال هاتفي':
        return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', icon: PhoneCall };
      case 'مذكرة تصحيحية / تعقيبية':
        return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', icon: RotateCcw };
      case 'مذكرة إشرافية':
      default:
        return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', icon: FileText };
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', direction: 'rtl' }}>
      {/* 1. الترويسة وسياق المدرسة وأزرار الإجراءات والتصدير */}
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
            marginBottom: '10px',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
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
            padding: '20px 24px',
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#2563EB',
                  backgroundColor: '#EFF6FF',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: '1px solid #BFDBFE',
                }}
              >
                {school?.schoolCode ?? (schoolId ? `SCH-${schoolId}` : '---')}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#B45309',
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  padding: '3px 10px',
                  borderRadius: '999px',
                }}
              >
                {school?.outputStatusArabic ?? 'قيد المتابعة الميدانية'}
              </span>
              {school?.governorate && (
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  • المحافظة: <strong>{school.governorate}</strong>
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              سجل إجراءات المتابعة والزيارات الإشرافية — {school?.schoolName ?? 'مدرسة التقييم'}
            </h1>
            <p style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px', margin: 0 }}>
              السجل التراكمي المحمي الميداني (FR-SUP-16 و NFR-INT-02) • غير قابل للتعديل أو الحذف
            </p>
          </div>

          {/* أزرار التصدير والإضافة */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleExportExcel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 15px',
                backgroundColor: '#FFFFFF',
                color: '#166534',
                border: '1px solid #BBF7D0',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0FDF4')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            >
              <FileSpreadsheet size={16} color="#16A34A" />
              <span>تصدير السجل (Excel)</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 15px',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            >
              <Download size={16} />
              <span>تصدير السجل (PDF)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              <Plus size={16} />
              <span>إضافة مذكرة / زيارة</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. شريط المؤشرات الكمية الخماسي المعتمد (5-Card KPI Summary Bar) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        {/* بطاقة 1: إجمالي المحطات الموثقة */}
        <div
          style={{
            padding: '16px 18px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', display: 'block' }}>
              إجمالي المحطات الموثقة
            </span>
            <span style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', display: 'block', marginTop: '2px' }}>
              {kpis?.totalMilestones ?? milestones.length}
            </span>
            <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>سجل تراكمي محمي</span>
          </div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={20} />
          </div>
        </div>

        {/* بطاقة 2: محاولات التسليم */}
        <div
          style={{
            padding: '16px 18px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', display: 'block' }}>
              محاولات التسليم
            </span>
            <span style={{ fontSize: '22px', fontWeight: 800, color: '#2563EB', display: 'block', marginTop: '2px' }}>
              {kpis?.submissionAttempts ?? 1} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>من 3</span>
            </span>
            <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>سقف الحوكمة (3 محاولات)</span>
          </div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileCheck2 size={20} />
          </div>
        </div>

        {/* بطاقة 3: طلبات الاستكمال */}
        <div
          style={{
            padding: '16px 18px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', display: 'block' }}>
              طلبات الاستكمال الصادرة
            </span>
            <span style={{ fontSize: '22px', fontWeight: 800, color: '#D97706', display: 'block', marginTop: '2px' }}>
              {kpis?.completionRequests ?? availableCompletionRequests.length}
            </span>
            <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>مهلة 14 يوماً نظامية</span>
          </div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#FFFBEB',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileEdit size={20} />
          </div>
        </div>

        {/* بطاقة 4: الزيارات والمذكرات */}
        <div
          style={{
            padding: '16px 18px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', display: 'block' }}>
              المذكرات والزيارات
            </span>
            <span style={{ fontSize: '22px', fontWeight: 800, color: '#7C3AED', display: 'block', marginTop: '2px' }}>
              {kpis?.memosAndVisits ?? memos.length}
            </span>
            <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>توثيق ميداني رسمي</span>
          </div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#F5F3FF',
              color: '#7C3AED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MapPin size={20} />
          </div>
        </div>

        {/* بطاقة 5: القرار الإشرافي الحالي */}
        <div
          style={{
            padding: '16px 18px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', display: 'block' }}>
              القرار الإشرافي الحالي
            </span>
            <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#059669', display: 'block', marginTop: '4px' }}>
              {kpis?.currentDecision || school?.outputStatusArabic || 'قيد المتابعة'}
            </span>
            <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>حالة ملف المدرسة</span>
          </div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle size={20} />
          </div>
        </div>
      </div>

      {/* 3. شريط التبويبين بعرض كامل 100% (Option A) */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid #E2E8F0',
          marginBottom: '20px',
          gap: '8px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          style={{
            padding: '12px 20px',
            fontSize: '13.5px',
            fontWeight: 800,
            color: activeTab === 'timeline' ? '#2563EB' : '#64748B',
            borderBottom: activeTab === 'timeline' ? '2px solid #2563EB' : '2px solid transparent',
            marginBottom: '-2px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <History size={16} />
          <span>الخط الزمني الشامل للأحداث والتدخلات الميدانية ({milestones.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('memos')}
          style={{
            padding: '12px 20px',
            fontSize: '13.5px',
            fontWeight: 800,
            color: activeTab === 'memos' ? '#2563EB' : '#64748B',
            borderBottom: activeTab === 'memos' ? '2px solid #2563EB' : '2px solid transparent',
            marginBottom: '-2px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <FileText size={16} />
          <span>خزانة المذكرات والزيارات التوجيهية الميدانية ({memos.length})</span>
        </button>
      </div>

      {/* محتوى الشاشة بناء على الخطأ أو التبويب النشط */}
      {error ? (
        <EmptySupervisionState
          isError={true}
          title="تعذر استرجاع سجل المتابعة الميدانية"
          description={error}
          actionText="إعادة المحاولة"
          onAction={refetch}
        />
      ) : activeTab === 'timeline' ? (
        /* التبويب الأول: الخط الزمني المرئي بعرض 100% كامل */
        <MilestoneTimelineView milestones={milestones} availableCycles={availableCycles} />
      ) : (
        /* التبويب الثاني: خزانة المذكرات والزيارات الميدانية بعرض 100% كامل دون تكرار */
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* ترويسة التبويب الثاني وأدوات التصفية */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              paddingBottom: '16px',
              borderBottom: '1px solid #F1F5F9',
              marginBottom: '20px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                خزانة المذكرات الإشرافية والزيارات الميدانية ({filteredMemos.length} مذكرة موثقة)
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', margin: 0 }}>
                توثيق التوجيهات والزيارات الميدانية والاتصالات وفق معيار FR-SUP-16
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* حقل البحث السريع في المذكرات */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  minWidth: '180px',
                }}
              >
                <Search size={14} color="#64748B" />
                <input
                  type="text"
                  placeholder="بحث في المذكرات..."
                  value={memoSearchTerm}
                  onChange={(e) => setMemoSearchTerm(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'none',
                    outline: 'none',
                    fontSize: '12px',
                    color: '#0F172A',
                    width: '100%',
                  }}
                />
                {memoSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setMemoSearchTerm('')}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      color: '#94A3B8',
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* تصنيف نوع المذكرة */}
              <select
                value={memoTypeFilter}
                onChange={(e) => setMemoTypeFilter(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  outline: 'none',
                }}
              >
                <option value="all">كافة أنواع الإجراءات ({memos.length})</option>
                <option value="مذكرة إشرافية">مذكرات إشرافية</option>
                <option value="زيارة ميدانية">زيارات ميدانية</option>
                <option value="اتصال هاتفي">اتصالات هاتفية</option>
                <option value="مذكرة تصحيحية / تعقيبية">مذكرات تعقيبية وتصحيحية</option>
              </select>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                <Plus size={15} />
                <span>إضافة مذكرة / زيارة</span>
              </button>
            </div>
          </div>

          {/* قائمة المذكرات كبطاقات تفصيلية بعرض كامل */}
          {filteredMemos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#64748B' }}>
              <FileText size={36} color="#CBD5E1" style={{ marginBottom: '10px' }} />
              <p style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
                لا توجد مذكرات أو زيارات مسجلة تطابق التصفية.
              </p>
              <button
                type="button"
                onClick={() => setMemoTypeFilter('all')}
                style={{
                  marginTop: '10px',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  color: '#2563EB',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                عرض كافة المذكرات
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              {filteredMemos.map((memo) => {
                const badge = getMemoBadgeStyle(memo.memoType);
                const BadgeIcon = badge.icon;
                const isCorrective = memo.memoType === 'مذكرة تصحيحية / تعقيبية';

                return (
                  <div
                    key={memo.id}
                    style={{
                      padding: '18px 20px',
                      borderRadius: '12px',
                      backgroundColor: isCorrective ? '#FFFDFD' : '#FAFBFD',
                      border: isCorrective ? '1px solid #FECACA' : '1px solid #E2E8F0',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '6px',
                            backgroundColor: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          <BadgeIcon size={13} />
                          <span>{memo.memoType}</span>
                        </span>

                        {memo.submissionId && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#EFF6FF',
                              color: '#1E40AF',
                              border: '1px solid #BFDBFE',
                            }}
                          >
                            محاولة تسليم #{memo.submissionId}
                          </span>
                        )}

                        {memo.completionRequestId && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#FFFBEB',
                              color: '#92400E',
                              border: '1px solid #FDE68A',
                            }}
                          >
                            طلب استكمال #{memo.completionRequestId}
                          </span>
                        )}
                      </div>

                      {/* شارة الرؤية للمدرسة */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}>
                        {memo.isVisibleToSchool ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#059669',
                              backgroundColor: '#ECFDF5',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: '1px solid #A7F3D0',
                              fontWeight: 700,
                            }}
                          >
                            <Eye size={13} /> ظاهرة في سجل المدرسة
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#64748B',
                              backgroundColor: '#F1F5F9',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: '1px solid #E2E8F0',
                              fontWeight: 600,
                            }}
                          >
                            <EyeOff size={13} /> داخلية للمشرفين والوزارة
                          </span>
                        )}
                      </div>
                    </div>

                    <h3
                      style={{
                        fontSize: '14.5px',
                        fontWeight: 800,
                        color: isCorrective ? '#991B1B' : '#0F172A',
                        margin: '0 0 8px 0',
                      }}
                    >
                      {memo.subject}
                    </h3>

                    <p
                      style={{
                        fontSize: '13px',
                        color: '#334155',
                        margin: '0 0 14px 0',
                        lineHeight: 1.65,
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {memo.details}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '11.5px',
                        color: '#64748B',
                        paddingTop: '10px',
                        borderTop: '1px solid #F1F5F9',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#334155' }}>{memo.authorName}</span>
                        <span>(المشرف الوزاري المكلف)</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} color="#94A3B8" />
                        <span>
                          {new Date(memo.createdAt).toLocaleString('ar-YE', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. شريط الإجراءات والتنقل السفلي السريع */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          marginTop: '24px',
          padding: '16px 20px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
          إجراءات سريعة لملف {school?.schoolName ?? 'المدرسة'} ({school?.schoolCode ?? (schoolId ? `SCH-${schoolId}` : '---')}):
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => onNavigate('submissions', { schoolId })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <FileCheck2 size={15} />
            <span>فحص مخرج التقييم ومطابقة الشواهد</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('completion-requests', { schoolId })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#FFFBEB',
              color: '#B45309',
              border: '1px solid #FDE68A',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <FileEdit size={15} />
            <span>إصدار أو متابعة طلب استكمال</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('historical', { schoolId })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#F8FAFC',
              color: '#475569',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <History size={15} />
            <span>المقارنة التاريخية التراكمية</span>
          </button>
        </div>
      </div>

      {/* النافذة المنبثقة لإضافة مذكرة إشرافية أو زيارة أو مذكرة تعقيبية */}
      <AddSupervisorMemoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={addMemo}
        isSubmitting={isAddingMemo}
        availableCycles={availableCycles}
        availableSubmissions={availableSubmissions}
        availableCompletionRequests={availableCompletionRequests}
      />
    </div>
  );
};
