/**
 * Component: CyclesListPage
 * الشاشة: سجل الدورات التقييمية والاعتماد المدرسي (UC-SUP-01)
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  PlusCircle,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { supervisionApi } from '../../api/supervisionApi';
import { EmptySupervisionState } from '../common/EmptySupervisionState';
import type { SupervisionScreenKey } from '../../api/supervisionTypes';

interface CyclesListPageProps {
  onNavigate: (screen: SupervisionScreenKey, params?: { cycleId?: number }) => void;
}

interface EvaluationCycleItem {
  cycleId?: number;
  id?: number;
  academicYear: string;
  name?: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Closed' | 'Planned' | 'Draft';
  participatingSchoolsCount?: number;
  schoolsCount?: number;
  completedSchoolsCount?: number;
  standardVersion?: {
    versionNumber: string;
    title: string;
  };
}

export const CyclesListPage: React.FC<CyclesListPageProps> = ({ onNavigate }) => {
  const [cycles, setCycles] = useState<EvaluationCycleItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchCycles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await supervisionApi.getEvaluationCycles();
      // Normalize camelCase / snake_case from API
      const normalized: EvaluationCycleItem[] = (Array.isArray(data) ? data : []).map((c: any) => ({
        cycleId: c.cycleId ?? c.cycle_id ?? c.id,
        academicYear: c.academicYear ?? c.academic_year ?? 'غير محدد',
        name: c.name ?? 'الدورة الوطنية للتقييم المدرسي',
        startDate: c.startDate ?? c.start_date ?? '',
        endDate: c.endDate ?? c.end_date ?? '',
        status: c.status ?? 'Active',
        participatingSchoolsCount: c.participatingSchoolsCount ?? c.participations_count ?? c.schools_count ?? 0,
        completedSchoolsCount: c.completedSchoolsCount ?? c.completed_evaluations_count ?? 0,
        standardVersion: c.standardVersion ?? c.standard_version ?? {
          versionNumber: '2026.1',
          title: 'المعايير الوطنية لجودة التعليم المدرسي',
        },
      }));
      setCycles(normalized);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل سجل الدورات التقييمية.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  const filteredCycles = cycles.filter((c) => {
    const matchesSearch =
      c.academicYear.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || c.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* 1. الترويسة الرئيسية والإجراءات */}
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
              marginBottom: '6px',
            }}
          >
            <ArrowRight size={16} />
            <span>العودة إلى لوحة المتابعة</span>
          </button>

          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            سجل الدورات التقييمية والاعتماد المدرسي
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            إدارة ومتابعة الدورات التقييمية المعتمدة وتواريخ الإطلاق والإغلاق ونطاق المدارس المشاركة
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchCycles}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} />
            <span>تحديث</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('cycles-new')}
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
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            }}
          >
            <PlusCircle size={16} />
            <span>إطلاق دورة تقييم جديدة</span>
          </button>
        </div>
      </div>

      {/* 2. شريط البحث والتصفية */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '16px 20px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
          <Search
            size={16}
            color="#94A3B8"
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="البحث بالعام الدراسي أو اسم الدورة..."
            style={{
              width: '100%',
              padding: '9px 38px 9px 12px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#F8FAFC',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>الحالة:</span>
          {['all', 'active', 'closed'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: statusFilter === st ? 700 : 500,
                backgroundColor: statusFilter === st ? '#EFF6FF' : '#F8FAFC',
                color: statusFilter === st ? '#2563EB' : '#64748B',
                border: statusFilter === st ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                cursor: 'pointer',
              }}
            >
              {st === 'all' ? 'الكل' : st === 'active' ? 'النشطة' : 'المغلقة'}
            </button>
          ))}
        </div>
      </div>

      {/* 3. محتوى الجدول أو الحالات الخاصة */}
      {isLoading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748B' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />
          <span>جاري تحميل سجل الدورات التقييمية...</span>
        </div>
      ) : error ? (
        <EmptySupervisionState
          isError={true}
          title="تعذر تحميل سجل الدورات"
          description={error}
          actionText="إعادة المحاولة"
          onAction={fetchCycles}
        />
      ) : filteredCycles.length === 0 ? (
        <EmptySupervisionState
          title="لا توجد دورات تقييمية مطابقة"
          description={
            searchTerm
              ? 'لم يتم العثور على أي دورة تطابق معايير البحث المدخلة.'
              : 'لم يتم إطلاق أي دورات تقييمية بعد في النظام.'
          }
          actionText="إطلاق دورة تقييم جديدة"
          onAction={() => onNavigate('cycles-new')}
        />
      ) : (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  العام الدراسي والدورة
                </th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  الإصدار المعياري
                </th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  الفترة الزمنية والمدة
                </th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  المدارس المشاركة
                </th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  الحالة
                </th>
                <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#475569', textAlign: 'left' }}>
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCycles.map((cycle, idx) => {
                const isActive = cycle.status === 'Active';
                const startStr = cycle.startDate ? cycle.startDate.split('T')[0] : '—';
                const endStr = cycle.endDate ? cycle.endDate.split('T')[0] : '—';

                return (
                  <tr
                    key={cycle.cycleId ?? idx}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            backgroundColor: isActive ? '#EFF6FF' : '#F1F5F9',
                            color: isActive ? '#2563EB' : '#64748B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Calendar size={18} />
                        </div>
                        <div>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'block' }}>
                            {cycle.academicYear}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748B' }}>
                            {cycle.name}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '16px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldCheck size={15} color="#2563EB" />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                          {cycle.standardVersion?.title ?? 'المعايير الوطنية'}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                          }}
                        >
                          {cycle.standardVersion?.versionNumber ?? '2026.1'}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '16px 16px' }}>
                      <div style={{ fontSize: '12px', color: '#0F172A', fontWeight: 600 }}>
                        {startStr} إلى {endStr}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        الحد الأدنى نظامياً: 30 يوماً (FR-SUP-01)
                      </div>
                    </td>

                    <td style={{ padding: '16px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={15} color="#64748B" />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          {cycle.participatingSchoolsCount ?? 0} مدرسة
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '16px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '999px',
                          backgroundColor: isActive ? '#ECFDF5' : '#F1F5F9',
                          color: isActive ? '#047857' : '#475569',
                          border: `1px solid ${isActive ? '#A7F3D0' : '#E2E8F0'}`,
                        }}
                      >
                        {isActive ? <CheckCircle2 size={13} color="#059669" /> : <Clock size={13} color="#64748B" />}
                        <span>{isActive ? 'دورة نشطة وسارية' : 'مغلقة ومؤرشفة'}</span>
                      </span>
                    </td>

                    <td style={{ padding: '16px 20px', textAlign: 'left' }}>
                      <button
                        type="button"
                        onClick={() => onNavigate('dashboard')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 14px',
                          backgroundColor: '#F8FAFC',
                          color: '#2563EB',
                          border: '1px solid #BFDBFE',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <span>متابعة مدارس الدورة</span>
                        <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
