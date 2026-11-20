/**
 * Component: SupervisionDashboardPage
 * الشاشة 1: لوحة المتابعة المركزية لحالة المدارس الميدانية ومصفوفة الحالات
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 */

import React, { useMemo } from 'react';
import {
  Plus,
  FileSpreadsheet,
  Search,
  ShieldAlert,
  RefreshCw,
  TrendingUp,
  X,
  Filter,
  Calendar,
} from 'lucide-react';
import { useSupervisionDashboard } from '../../hooks/useSupervisionDashboard';
import { SupervisorKpiGrid } from './SupervisorKpiGrid';
import { SchoolsStatusMatrixTable } from './SchoolsStatusMatrixTable';
import { EmptySupervisionState } from '../common/EmptySupervisionState';
import { exportSchoolsStatusMatrixToExcel } from '../../utils/supervisionExportUtils';
import type { SupervisionScreenKey } from '../../api/supervisionTypes';

interface SupervisionDashboardPageProps {
  onNavigate: (
    screen: SupervisionScreenKey,
    params?: { submissionId?: number; schoolId?: number; schoolName?: string }
  ) => void;
}

export const SupervisionDashboardPage: React.FC<SupervisionDashboardPageProps> = ({ onNavigate }) => {
  const {
    dashboardData,
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

  const statusCounts = useMemo(() => {
    const raw = dashboardData?.schools || [];
    return {
      all: raw.length,
      Submitted: raw.filter((s) => s.outputStatus === 'Submitted').length,
      NeedsCompletion: raw.filter((s) => s.outputStatus === 'NeedsCompletion').length,
      UnderReview: raw.filter((s) => s.outputStatus === 'UnderReview').length,
      Completed: raw.filter((s) => s.outputStatus === 'Completed').length,
      Delayed: raw.filter((s) => s.isDelayed).length,
      Draft: raw.filter((s) => s.outputStatus === 'Draft').length,
    };
  }, [dashboardData?.schools]);

  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'all' || stageFilter !== 'all';

  const statusTabs = [
    { key: 'all', label: 'كافة المدارس', count: statusCounts.all },
    { key: 'Submitted', label: 'مرفوع جديد', count: statusCounts.Submitted, color: '#2563EB' },
    { key: 'NeedsCompletion', label: 'يحتاج استكمال', count: statusCounts.NeedsCompletion, color: '#D97706' },
    { key: 'UnderReview', label: 'قيد التدقيق', count: statusCounts.UnderReview, color: '#7C3AED' },
    { key: 'Completed', label: 'مكتمل', count: statusCounts.Completed, color: '#059669' },
    { key: 'Delayed', label: 'متأخرة عن التسليم (80%)', count: statusCounts.Delayed, color: '#DC2626' },
    { key: 'Draft', label: 'مسودة', count: statusCounts.Draft, color: '#64748B' },
  ];

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
          marginBottom: '20px',
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
              منصة ارتقاء • الإدارة العامة لتقويم الجودة المدرسية
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
            رصد مباشر لتقدم مخرجات التقييم الذاتي وتدقيق الشواهد لنطاق {scope?.governorate ? `محافظة ${scope.governorate}` : (scope?.name || 'الإشراف المركزي العام')} ({totalCount} مدرسة)
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

          {/* زر سجل الدورات التقييمية */}
          <button
            type="button"
            onClick={() => onNavigate('cycles-list')}
            title="الانتقال إلى سجل وإدارة دورات التقييم"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              backgroundColor: '#FFFFFF',
              color: '#1E293B',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
              e.currentTarget.style.borderColor = '#94A3B8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
          >
            <Calendar size={16} />
            <span>سجل الدورات</span>
          </button>

          {/* زر إطلاق دورة تقييم جديدة */}
          <button
            type="button"
            onClick={() => {
              if (!scope?.hasActiveCycle) {
                onNavigate('cycles-new');
              }
            }}
            disabled={scope?.hasActiveCycle}
            title={
              scope?.hasActiveCycle
                ? `توجد دورة تقييم نشطة حالياً (${scope.activeCycleName || scope.activeCycle}). يمنع النظام إطلاق دورة ثانية حتى يتم إغلاق الدورة القائمة من سجل الدورات.`
                : 'إطلاق دورة تقييم جديدة وتحديد المدارس المستهدفة'
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              backgroundColor: scope?.hasActiveCycle ? '#94A3B8' : '#2563EB',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: scope?.hasActiveCycle ? 'not-allowed' : 'pointer',
              border: 'none',
              boxShadow: scope?.hasActiveCycle ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.3)',
              opacity: scope?.hasActiveCycle ? 0.7 : 1,
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!scope?.hasActiveCycle) e.currentTarget.style.backgroundColor = '#1D4ED8';
            }}
            onMouseLeave={(e) => {
              if (!scope?.hasActiveCycle) e.currentTarget.style.backgroundColor = '#2563EB';
            }}
          >
            <Plus size={16} />
            <span>إطلاق دورة تقييم جديدة</span>
          </button>
        </div>
      </div>

      {/* 2. بطاقة سياق الدورة النشطة والوثيقة المعيارية الحاكمة */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '16px 20px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB',
              flexShrink: 0,
            }}
          >
            <Calendar size={22} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                {scope?.activeCycleName || 'الدورة الوطنية للتقييم الذاتي المدرسي'}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: scope?.cycleStatus === 'Active' ? '#047857' : '#64748B',
                  backgroundColor: scope?.cycleStatus === 'Active' ? '#ECFDF5' : '#F1F5F9',
                  border: `1px solid ${scope?.cycleStatus === 'Active' ? '#A7F3D0' : '#E2E8F0'}`,
                  padding: '1px 8px',
                  borderRadius: '999px',
                }}
              >
                {scope?.cycleStatus === 'Active' ? 'دورة نشطة ونافذة' : (scope?.cycleStatus || 'غير محددة')}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', fontSize: '12px', color: '#64748B', flexWrap: 'wrap' }}>
              <span>
                <strong>الفترة:</strong> {scope?.startDate || 'غير محدد'} إلى {scope?.endDate || 'غير محدد'}
              </span>
              <span>•</span>
              <span style={{ color: (scope?.daysRemaining ?? 30) <= 7 ? '#DC2626' : '#2563EB', fontWeight: 700 }}>
                متبقي {scope?.daysRemaining ?? 0} يوماً على إغلاق الدورة
              </span>
              <span>•</span>
              <span>
                <strong>الوثيقة المعيارية:</strong> {scope?.standardVersion?.versionTitle || 'الوثيقة الوطنية لمعايير جودة التعليم المدرسي'} (v{scope?.standardVersion?.versionNo || '1.0'})
              </span>
            </div>
          </div>
        </div>

        {scope?.isOverdueThresholdReached && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#B91C1C',
            }}
          >
            <ShieldAlert size={15} color="#DC2626" />
            <span>انقضى 80% أو أكثر من فترة الدورة (فترة تقديم متأخرة للمدارس)</span>
          </div>
        )}
      </div>

      {/* 3. بطاقات المؤشرات الرئيسية الأربعة */}
      <SupervisorKpiGrid
        kpis={kpis}
        isLoading={isLoading}
        scopeNote={scope?.governorate ? `محافظة ${scope.governorate}` : (scope?.name || 'الإشراف المركزي العام')}
        activeFilter={statusFilter}
        onSelectFilter={(filterKey) => {
          setStatusFilter(filterKey);
          const targetSection = document.getElementById('schools-status-matrix-section');
          if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
      />

      {/* 4. صندوق التوجيه والمحددات الحوكمية BR-MIN-03 */}
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
              'تقتصر صلاحيات المشرف الوزاري على المراجعة الإشرافية وإصدار طلبات الاستكمال الموجهة للمدارس فقط، دون أي تعديل مباشر على درجات التقييم أو إعادة ترتيب المدارس تنافسياً (قاعدة BR-MIN-03).'}
          </p>
        </div>
      </div>

      {/* 4. كرت البحث والتصفية المتقدم بالهوية الإشرافية الزرقاء */}
      <div
        id="schools-status-matrix-section"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          marginBottom: '20px',
          overflow: 'hidden',
        }}
      >
        {/* صف البحث والمرحلة والتحديث */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '1px solid #F1F5F9',
          }}
        >
          {/* حقل البحث مع زر المسح X */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '8px 14px',
              minWidth: '280px',
              flex: 1,
              maxWidth: '460px',
            }}
          >
            <Search size={16} color="#64748B" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="بحث باسم المدرسة أو الرمز، المدير، المقيم، أو المحافظة..."
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
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                title="مسح البحث"
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* فلاتر المرحلة والتحديث */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* فلتر المرحلة الدراسية */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>المرحلة:</span>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                style={{
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0F172A',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
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
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#F8FAFC',
                color: '#64748B',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#EFF6FF';
                e.currentTarget.style.color = '#2563EB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.color = '#64748B';
              }}
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* صف ألسنة / شرائح تصفية الحالة التفاعلية */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#FAFCFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginLeft: '4px' }}>
              تصفية الحالة:
            </span>
            {statusTabs.map((tab) => {
              const isSelected = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: isSelected ? 800 : 600,
                    cursor: 'pointer',
                    border: isSelected ? '1px solid #1D4ED8' : '1px solid #E2E8F0',
                    backgroundColor: isSelected ? '#2563EB' : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : '#334155',
                    boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '999px',
                      backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.25)' : '#F1F5F9',
                      color: isSelected ? '#FFFFFF' : '#475569',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
            المدارس المعروضة: <span style={{ color: '#2563EB', fontWeight: 800 }}>{schools.length}</span> من أصل{' '}
            <span style={{ color: '#0F172A', fontWeight: 800 }}>{totalCount}</span>
          </div>
        </div>

        {/* شريط الفلاتر النشطة مع إمكانية الإلغاء الفردي أو الكلي */}
        {hasActiveFilters && (
          <div
            style={{
              padding: '10px 20px',
              backgroundColor: '#EFF6FF',
              borderTop: '1px solid #DBEAFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#1E40AF', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Filter size={13} />
                الفلاتر المطبقة:
              </span>

              {searchTerm.trim() && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#1D4ED8',
                  }}
                >
                  بحث: "{searchTerm.trim()}"
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#1D4ED8' }}
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {statusFilter !== 'all' && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#1D4ED8',
                  }}
                >
                  الحالة: {statusTabs.find((t) => t.key === statusFilter)?.label || statusFilter}
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#1D4ED8' }}
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {stageFilter !== 'all' && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#1D4ED8',
                  }}
                >
                  المرحلة: {stageFilter}
                  <button
                    type="button"
                    onClick={() => setStageFilter('all')}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#1D4ED8' }}
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setStageFilter('all');
              }}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#DC2626',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              مسح كافة الفلاتر
            </button>
          </div>
        )}
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
          onReviewSubmission={(submissionId, schoolId, schoolName) =>
            onNavigate('submissions', { submissionId, schoolId, schoolName })
          }
          onOpenTrackingLog={(schoolId, schoolName) =>
            onNavigate('tracking-log', { schoolId, schoolName })
          }
          onOpenCompletionRequest={(submissionId, schoolId, schoolName) =>
            onNavigate('completion-requests', { submissionId, schoolId, schoolName })
          }
          onCompareHistorical={(schoolId, schoolName) =>
            onNavigate('historical', { schoolId, schoolName })
          }
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
