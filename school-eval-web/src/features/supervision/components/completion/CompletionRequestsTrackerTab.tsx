/**
 * Component: CompletionRequestsTrackerTab
 * التبويب الأول: سجل ومتابعة طلبات الاستكمال في النطاق الجغرافي للمشرف
 * منصة ارتقاء للتقييم والتحسين المدرسي
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Plus,
  Search,
  Eye,
  Loader2,
  Building,
  RefreshCw,
} from 'lucide-react';
import { supervisionApi } from '../../api/supervisionApi';
import { CompletionItemDetailsModal } from './CompletionItemDetailsModal';
import { ExtendDeadlineModal } from './ExtendDeadlineModal';
import type {
  CompletionTrackerResponse,
  CompletionTrackerItem,
  CompletionTrackerSummary,
} from '../../api/supervisionTypes';

interface CompletionRequestsTrackerTabProps {
  onNavigateToComposer: () => void;
  onNavigateToReview: (submissionId: number, schoolId: number) => void;
}

type FilterStatusType = 'all' | 'open' | 'resubmitted' | 'overdue';

export const CompletionRequestsTrackerTab: React.FC<CompletionRequestsTrackerTabProps> = ({
  onNavigateToComposer,
  onNavigateToReview,
}) => {
  const [data, setData] = useState<CompletionTrackerResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<FilterStatusType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // حالة النوافذ المنبثقة
  const [selectedDetailsRequest, setSelectedDetailsRequest] = useState<CompletionTrackerItem | null>(null);
  const [selectedExtendRequest, setSelectedExtendRequest] = useState<CompletionTrackerItem | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await supervisionApi.getCompletionRequestsTracker();
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل سجل طلبات الاستكمال.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchData());
  }, []);

  const summary: CompletionTrackerSummary = data?.summary || {
    totalRequests: 0,
    openRequests: 0,
    resubmittedRequests: 0,
    overdueRequests: 0,
  };

  const filteredRequests = useMemo(() => {
    if (!data?.requests) return [];

    const q = searchQuery.trim().toLowerCase();

    return data.requests.filter((req) => {
      // فلترة النوع
      if (activeFilter === 'open' && (req.status !== 'Open' || req.isOverdue)) return false;
      if (activeFilter === 'resubmitted' && !req.isResubmitted) return false;
      if (activeFilter === 'overdue' && !req.isOverdue) return false;

      // فلترة البحث
      if (q) {
        const matchesSchool = req.schoolName?.toLowerCase().includes(q);
        const matchesCode = req.schoolCode?.toLowerCase().includes(q);
        const matchesGov = req.governorate?.toLowerCase().includes(q);
        const matchesItem = req.items?.some((i) => i.code?.toLowerCase().includes(q) || i.title?.toLowerCase().includes(q));
        if (!matchesSchool && !matchesCode && !matchesGov && !matchesItem) return false;
      }

      return true;
    });
  }, [data, activeFilter, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. بطاقات المؤشرات الرئيسية (4 KPIs) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '16px',
        }}
      >
        {/* إجمالي الطلبات */}
        <div
          onClick={() => setActiveFilter('all')}
          style={{
            padding: '18px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: activeFilter === 'all' ? '2px solid #2563EB' : '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>
              إجمالي طلبات الاستكمال
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB',
              }}
            >
              <FileText size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A' }}>
            {summary.totalRequests}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            لكافة المدارس في النطاق الجغرافي
          </div>
        </div>

        {/* قيد الاستيفاء بالمدرسة */}
        <div
          onClick={() => setActiveFilter('open')}
          style={{
            padding: '18px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: activeFilter === 'open' ? '2px solid #D97706' : '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#B45309' }}>
              قيد الاستيفاء بالمدرسة
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D97706',
              }}
            >
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#B45309' }}>
            {summary.openRequests}
          </div>
          <div style={{ fontSize: '11px', color: '#92400E', marginTop: '4px' }}>
            تنتظر استكمال الشواهد من إدارة المدرسة
          </div>
        </div>

        {/* أُعيد رفعها للمراجعة */}
        <div
          onClick={() => setActiveFilter('resubmitted')}
          style={{
            padding: '18px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: activeFilter === 'resubmitted' ? '2px solid #0284C7' : '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0369A1' }}>
              أُعيد رفعها للمراجعة
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#E0F2FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284C7',
              }}
            >
              <RotateCcw size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#0369A1' }}>
            {summary.resubmittedRequests}
          </div>
          <div style={{ fontSize: '11px', color: '#0284C7', marginTop: '4px' }}>
            مخرجات محدّثة تنتظر إعادة تدقيق المشرف
          </div>
        </div>

        {/* متأخرة عن المهلة */}
        <div
          onClick={() => setActiveFilter('overdue')}
          style={{
            padding: '18px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: activeFilter === 'overdue' ? '2px solid #DC2626' : '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#991B1B' }}>
              متأخرة عن المهلة
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#DC2626',
              }}
            >
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#DC2626' }}>
            {summary.overdueRequests}
          </div>
          <div style={{ fontSize: '11px', color: '#991B1B', marginTop: '4px' }}>
            تجاوزت التاريخ النهائي المحدد للمهلة
          </div>
        </div>
      </div>

      {/* 2. شريط الأدوات والبحث والفلترة وزر الإصدار */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          padding: '16px 20px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* أزرار الفلترة */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              border: activeFilter === 'all' ? '1px solid #2563EB' : '1px solid #E2E8F0',
              backgroundColor: activeFilter === 'all' ? '#EFF6FF' : '#FFFFFF',
              color: activeFilter === 'all' ? '#2563EB' : '#64748B',
              cursor: 'pointer',
            }}
          >
            الكل ({summary.totalRequests})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('open')}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              border: activeFilter === 'open' ? '1px solid #D97706' : '1px solid #E2E8F0',
              backgroundColor: activeFilter === 'open' ? '#FEF3C7' : '#FFFFFF',
              color: activeFilter === 'open' ? '#B45309' : '#64748B',
              cursor: 'pointer',
            }}
          >
            قيد الاستيفاء ({summary.openRequests})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('resubmitted')}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              border: activeFilter === 'resubmitted' ? '1px solid #0284C7' : '1px solid #E2E8F0',
              backgroundColor: activeFilter === 'resubmitted' ? '#E0F2FE' : '#FFFFFF',
              color: activeFilter === 'resubmitted' ? '#0369A1' : '#64748B',
              cursor: 'pointer',
            }}
          >
            أُعيد رفعها ({summary.resubmittedRequests})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('overdue')}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              border: activeFilter === 'overdue' ? '1px solid #DC2626' : '1px solid #E2E8F0',
              backgroundColor: activeFilter === 'overdue' ? '#FEE2E2' : '#FFFFFF',
              color: activeFilter === 'overdue' ? '#991B1B' : '#64748B',
              cursor: 'pointer',
            }}
          >
            متأخرة ({summary.overdueRequests})
          </button>
        </div>

        {/* حقل البحث وزر إصدار طلب جديد */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94A3B8',
              }}
            />
            <input
              type="text"
              placeholder="بحث بالمدرسة أو المؤشر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 32px 7px 10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="button"
            onClick={fetchData}
            title="تحديث البيانات"
            style={{
              padding: '7px 10px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              color: '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={onNavigateToComposer}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)',
            }}
          >
            <Plus size={16} />
            <span>+ إصدار طلب استكمال جديد</span>
          </button>
        </div>
      </div>

      {/* تنبيه حالة تجاوز المهلة الحوكمي */}
      {summary.overdueRequests > 0 && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 18px',
            backgroundColor: '#FEF2F2',
            borderRadius: '10px',
            border: '1px solid #FECACA',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12.5px',
            color: '#991B1B',
            lineHeight: 1.5,
          }}
        >
          <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
          <span>
            <strong>تنويه للمشرف الوزاري حول الطلبات المتأخرة:</strong> لا تزال المدرسة قادرة على رفع الاستكمال ما دامت الدورة التقييمية نشطة، ويمكن للمشرف إما تمديد المهلة مع توثيق المبرر النظامي أو إغلاق المراجعة الإشرافية من شاشة المراجعة.
          </span>
        </div>
      )}

      {/* 3. جدول البيانات التفاعلي */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        {isLoading && (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#D97706' }} />
            <p style={{ fontSize: '13px', fontWeight: 600 }}>جاري استرجاع سجل طلبات الاستكمال والمتابعة...</p>
          </div>
        )}

        {error && (
          <div style={{ padding: '24px', backgroundColor: '#FEF2F2', color: '#991B1B' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          </div>
        )}

        {!isLoading && !error && filteredRequests.length === 0 && (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748B' }}>
            <FileText size={44} style={{ margin: '0 auto 12px', color: '#CBD5E1' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#334155', margin: '0 0 6px 0' }}>
              لا توجد طلبات استكمال مطابقة
            </h3>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 16px 0' }}>
              لم يتم رصد أي طلبات استكمال وفق محددات البحث المختارة
            </p>
            <button
              type="button"
              onClick={onNavigateToComposer}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                border: '1px solid #BFDBFE',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Plus size={15} />
              <span>صياغة طلب استكمال جديد لمدرسة</span>
            </button>
          </div>
        )}

        {!isLoading && !error && filteredRequests.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569' }}>المدرسة والنطاق</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, color: '#475569', width: '95px' }}>المحاولة</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, color: '#475569', width: '100px' }}>البنود</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569' }}>تاريخ الإصدار</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569' }}>تاريخ المهلة</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', width: '140px' }}>الحالة</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: '#475569', width: '160px', textAlign: 'center' }}>
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req, idx) => (
                  <tr
                    key={req.requestId}
                    style={{
                      borderBottom: idx < filteredRequests.length - 1 ? '1px solid #F1F5F9' : 'none',
                      backgroundColor: req.isOverdue
                        ? '#FFF5F5'
                        : req.isResubmitted
                        ? '#F0F9FF'
                        : idx % 2 === 0
                        ? '#FFFFFF'
                        : '#FAFAFA',
                      transition: 'background-color 0.1s ease',
                    }}
                  >
                    {/* المدرسة والنطاق */}
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building size={16} color="#64748B" />
                        <div>
                          <div style={{ fontWeight: 800, color: '#0F172A' }}>
                            {req.schoolName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            {req.schoolCode} • {req.governorate} — {req.directorate}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* المحاولة */}
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#F1F5F9',
                          color: '#334155',
                          display: 'inline-block',
                        }}
                      >
                        المحاولة {req.attemptNo}
                      </span>
                    </td>

                    {/* البنود */}
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedDetailsRequest(req)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          border: '1px solid #DBEAFE',
                          cursor: 'pointer',
                        }}
                      >
                        <Eye size={12} />
                        <span>{req.itemsCount} مؤشرات</span>
                      </button>
                    </td>

                    {/* تاريخ الإصدار */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        {req.issuedAt ? new Date(req.issuedAt).toLocaleDateString('ar-YE') : '—'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                        بواسطة: {req.issuedByName || 'المشرف'}
                      </div>
                    </td>

                    {/* المهلة والمتبقي */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: req.isOverdue ? '#DC2626' : '#92400E',
                          }}
                        >
                          {req.deadline || '—'}
                        </span>
                        {req.extensionsCount > 0 && (
                          <span
                            title={`تم تمديد المهلة ${req.extensionsCount} مرات`}
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor: '#FEF3C7',
                              color: '#B45309',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            +ت{req.extensionsCount}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '2px' }}>
                        {req.isOverdue ? (
                          <span style={{ color: '#DC2626', fontWeight: 700 }}>
                            متأخر عن المهلة
                          </span>
                        ) : req.status === 'Open' ? (
                          <span style={{ color: '#059669', fontWeight: 600 }}>
                            متبقي {req.daysRemaining} يوم
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>—</span>
                        )}
                      </div>
                    </td>

                    {/* الحالة النظامية */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        title={
                          req.isOverdue
                            ? 'تنويه: لا تزال المدرسة قادرة على رفع الاستكمال ما دامت الدورة التقييمية نشطة، ويمكن للمشرف إما تمديد المهلة أو إغلاق المراجعة الإشرافية من شاشة المراجعة.'
                            : undefined
                        }
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          backgroundColor: req.isOverdue
                            ? '#FEE2E2'
                            : req.isResubmitted
                            ? '#E0F2FE'
                            : req.status === 'Open'
                            ? '#FEF3C7'
                            : '#ECFDF5',
                          color: req.isOverdue
                            ? '#DC2626'
                            : req.isResubmitted
                            ? '#0284C7'
                            : req.status === 'Open'
                            ? '#B45309'
                            : '#059669',
                        }}
                      >
                        {req.isOverdue ? (
                          <AlertTriangle size={12} />
                        ) : req.isResubmitted ? (
                          <RotateCcw size={12} />
                        ) : req.status === 'Open' ? (
                          <Clock size={12} />
                        ) : (
                          <CheckCircle2 size={12} />
                        )}
                        <span>{req.statusDisplay}</span>
                      </span>

                      {req.isOverdue && (
                        <span
                          title="تنويه: لا تزال المدرسة قادرة على رفع الاستكمال ما دامت الدورة التقييمية نشطة، ويمكن للمشرف إما تمديد المهلة أو إغلاق المراجعة الإشرافية من شاشة المراجعة."
                          style={{
                            display: 'block',
                            fontSize: '10px',
                            color: '#991B1B',
                            marginTop: '3px',
                            fontWeight: 600,
                          }}
                        >
                          متاح التمديد أو الإغلاق
                        </span>
                      )}
                    </td>

                    {/* الإجراءات */}
                    <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {/* زر تفاصيل البنود */}
                        <button
                          type="button"
                          onClick={() => setSelectedDetailsRequest(req)}
                          title="عرض تفاصيل الطلب وبنوده"
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            color: '#475569',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Eye size={13} />
                          <span>التفاصيل</span>
                        </button>

                        {/* زر تمديد المهلة (فقط إذا كان مفتوحاً) */}
                        {req.status === 'Open' && (
                          <button
                            type="button"
                            onClick={() => setSelectedExtendRequest(req)}
                            title="تمديد المهلة للمدرسة مع توثيق المبرر"
                            style={{
                              padding: '6px 10px',
                              backgroundColor: '#FFFBEB',
                              border: '1px solid #FDE68A',
                              borderRadius: '6px',
                              color: '#B45309',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Clock size={13} />
                            <span>تمديد</span>
                          </button>
                        )}

                        {/* زر مراجعة المخرج المحدّث (إذا أُعيد الرفع) */}
                        {req.isResubmitted && (
                          <button
                            type="button"
                            onClick={() => onNavigateToReview(req.submissionId, req.schoolId)}
                            title="الانتقال لمراجعة وتدقيق المخرج المحدّث في الشاشة 4"
                            style={{
                              padding: '6px 10px',
                              backgroundColor: '#0284C7',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#FFFFFF',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <RotateCcw size={13} />
                            <span>مراجعة</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* النوافذ المنبثقة */}
      <CompletionItemDetailsModal
        request={selectedDetailsRequest}
        onClose={() => setSelectedDetailsRequest(null)}
        onReviewUpdatedSubmission={onNavigateToReview}
      />

      <ExtendDeadlineModal
        request={selectedExtendRequest}
        onClose={() => setSelectedExtendRequest(null)}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
};
