/**
 * Component: SupervisionDashboardPage
 * الشاشة 1: لوحة المتابعة المركزية لحالة المدارس الميدانية ومصفوفة الحالات
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 */

import React from 'react';
import {
  Plus,
  FileSpreadsheet,
  Search,
  ShieldAlert,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { useSupervisionDashboard } from '../../hooks/useSupervisionDashboard';
import { SupervisorKpiGrid } from './SupervisorKpiGrid';
import { SchoolsStatusMatrixTable } from './SchoolsStatusMatrixTable';
import { EmptySupervisionState } from '../common/EmptySupervisionState';
import { exportSchoolsStatusMatrixToExcel } from '../../utils/supervisionExportUtils';
import type { SupervisionScreenKey } from '../../api/supervisionTypes';

interface SupervisionDashboardPageProps {
  onNavigate: (screen: SupervisionScreenKey, params?: { submissionId?: number; schoolId?: number }) => void;
}

export const SupervisionDashboardPage: React.FC<SupervisionDashboardPageProps> = ({ onNavigate }) => {
  const {
    schools,
    totalCount,
    kpis,
    governanceCallout,
    scope,
    isLoading,
    error,
    refetch,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    stageFilter,
    setStageFilter,
  } = useSupervisionDashboard();

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* 1. الترويسة الرئيسية والإجراء البارز */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#2563EB',
                backgroundColor: '#EFF6FF',
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              منصة ارتقاء • الإدارة العامة لضمان الجودة والاعتماد
            </span>
          </div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.3px',
              margin: 0,
            }}
          >
            لوحة المتابعة المركزية لحالة المدارس الميدانية
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            رصد مباشر لتقدم مخرجات التقييم الذاتي وتدقيق الشواهد لنطاق {scope?.name ?? 'أمانة العاصمة'} ({totalCount} مدرسة)
          </p>
        </div>

        {/* أزرار الإجراءات الرئيسية */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* تصدير المصفوفة Excel */}
          <button
            type="button"
            onClick={() => exportSchoolsStatusMatrixToExcel(schools)}
            title="تصدير مصفوفة حالة المدارس إلى جدول Excel (.xlsx)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              backgroundColor: '#FFFFFF',
              color: '#059669',
              border: '1px solid #A7F3D0',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ECFDF5';
              e.currentTarget.style.borderColor = '#059669';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#A7F3D0';
            }}
          >
            <FileSpreadsheet size={16} />
            <span>تصدير المصفوفة (XLSX)</span>
          </button>

          {/* زر إطلاق دورة تقييم */}
          <button
            type="button"
            onClick={() => onNavigate('cycles-new')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
          >
            <Plus size={16} />
            <span>إطلاق دورة تقييم (02-V)</span>
          </button>
        </div>
      </div>

      {/* 2. بطاقات المؤشرات الرئيسية الأربعة */}
      <SupervisorKpiGrid kpis={kpis} isLoading={isLoading} />

      {/* 3. صندوق التوجيه والمحددات الحوكمية BR-MIN-03 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '14px 18px',
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '10px',
          marginBottom: '20px',
        }}
      >
        <ShieldAlert size={20} color="#2563EB" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E40AF' }}>
              محددات الصلاحيات الإشرافية الميدانية (قاعدة عمل {governanceCallout?.ruleCode ?? 'BR-MIN-03'})
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#2563EB',
                backgroundColor: '#DBEAFE',
                padding: '1px 6px',
                borderRadius: '4px',
              }}
            >
              حاكمية نظامية
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#1E3A8A', margin: 0, lineHeight: 1.5 }}>
            {governanceCallout?.description ??
              'تقتصر صلاحيات المشرف الوزاري على المراجعة الإدارية وإصدار طلبات الاستكمال الموجهة للمدارس فقط، دون أي تعديل مباشر على درجات التقييم أو منح الاعتماد الخارجي النهائي.'}
          </p>
        </div>
      </div>

      {/* 4. شريط البحث والتصفية */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '14px 16px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          marginBottom: '16px',
        }}
      >
        {/* حقل البحث */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            padding: '7px 12px',
            minWidth: '280px',
            flex: 1,
            maxWidth: '380px',
          }}
        >
          <Search size={16} color="#64748B" />
          <input
            type="text"
            placeholder="بحث باسم المدرسة أو الرمز (مثال: بلقيس أو SCH-104)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              border: 'none',
              background: 'none',
              outline: 'none',
              fontSize: '13px',
              color: '#0F172A',
              width: '100%',
            }}
          />
        </div>

        {/* فلاتر الحالة والمرحلة */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* فلتر حالة المخرج */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>الحالة:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0F172A',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="all">كافة الحالات</option>
              <option value="NeedsCompletion">يحتاج استكمال</option>
              <option value="Submitted">مرفوع جديد</option>
              <option value="UnderReview">قيد التدقيق الإشرافي</option>
              <option value="Completed">مكتمل المراجعة</option>
              <option value="Draft">مسودة</option>
            </select>
          </div>

          {/* فلتر المرحلة الدراسية */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>المرحلة:</span>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0F172A',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="all">جميع المراحل</option>
              <option value="أساسي">المرحلة الأساسية (1-9)</option>
              <option value="ثانوي">المرحلة الثانوية (10-12)</option>
            </select>
          </div>

          {/* زر التحديث */}
          <button
            type="button"
            onClick={refetch}
            title="تحديث البيانات"
            style={{
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#F8FAFC',
              color: '#64748B',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* 5. جدول مصفوفة حالة المدارس أو الحالة الفارغة */}
      {error ? (
        <EmptySupervisionState
          isError={true}
          title="تعذر تحميل مصفوفة المدارس"
          description={error}
          actionText="إعادة المحاولة"
          onAction={refetch}
        />
      ) : schools.length === 0 ? (
        <EmptySupervisionState
          title="لم يتم العثور على مدارس مطابقة"
          description="لا توجد مدارس تطابق معايير البحث والتصفية المحددة حالياً."
          actionText="إلغاء الفلاتر"
          onAction={() => {
            setSearchTerm('');
            setStatusFilter('all');
            setStageFilter('all');
          }}
        />
      ) : (
        <SchoolsStatusMatrixTable
          schools={schools}
          onReviewSubmission={(submissionId, schoolId) =>
            onNavigate('submissions', { submissionId, schoolId })
          }
          onOpenTrackingLog={(schoolId) => onNavigate('tracking-log', { schoolId })}
          onOpenCompletionRequest={(submissionId, schoolId) =>
            onNavigate('completion-requests', { submissionId, schoolId })
          }
          onCompareHistorical={(schoolId) => onNavigate('historical', { schoolId })}
        />
      )}

      {/* 6. إجراءات التذييل الانتقالية السريعة */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginTop: '20px',
          padding: '16px 20px',
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
        }}
      >
        <span style={{ fontSize: '13px', color: '#64748B' }}>
          إجمالي المدارس المعروضة:{' '}
          <strong style={{ color: '#0F172A' }}>{schools.length}</strong> من أصل{' '}
          <strong style={{ color: '#0F172A' }}>{totalCount}</strong> مدرسة
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => onNavigate('tracking-log')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#F8FAFC',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span>سجل الإجراءات الشامل</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('reports')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              border: '1px solid #BFDBFE',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <TrendingUp size={15} />
            <span>الانتقال للتحليلات التراكمية المركزية</span>
          </button>
        </div>
      </div>
    </div>
  );
};
