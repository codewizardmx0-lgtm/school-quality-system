/**
 * Component: CyclesListPage
 * الشاشة المدمجة: إدارة الدورات التقييمية المركزية (التبويب 1: سجل الدورات + التبويب 2: إطلاق وتعديل دورة)
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 * متوافقة مع ضوابط الحوكمة الصارمة (FR-SUP-01/02, BR-MIN-03, BR-GEN-05):
 * - إطلاق وتعديل وإغلاق الدورات محصور بالمشرف الوزاري المركزي العام (governorate IS NULL)
 * - حظر لفظ "الاعتماد" واستبداله بالمصطلحات النظامية المعتمدة
 * - قفل الإصدار المعياري بعد الإطلاق
 * - أرشفة المدارس غير المكتملة بحالتها الراهنة عند إغلاق الدورة وتجميد الرصد والرفع بالمدارس
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  Copy,
  BarChart3,
  X,
  Plus,
  Check,
  Loader2,
  Edit3,
  Lock,
  Archive,
  RefreshCw,
  AlertTriangle,
  FileSpreadsheet,
  PlusCircle,
} from 'lucide-react';
import { supervisionApi } from '../../api/supervisionApi';
import { useAuth } from '../../../auth/AuthContext';
import { EmptySupervisionState } from '../common/EmptySupervisionState';
import { CycleFormTab, type FormMode } from './CycleFormTab';
import { exportCycleParticipatingSchoolsToExcel } from '../../utils/supervisionExportUtils';
import type {
  SupervisionScreenKey,
  CycleLaunchPayload,
  EvaluationCycleItem,
  ParticipatingSchoolItem,
} from '../../api/supervisionTypes';

interface CyclesListPageProps {
  initialTab?: 'list' | 'form';
  prefillData?: Partial<CycleLaunchPayload>;
  onNavigate: (
    screen: SupervisionScreenKey,
    params?: {
      cycleId?: number;
      prefillCycleLaunch?: Partial<CycleLaunchPayload>;
      schoolId?: number;
      schoolName?: string;
    }
  ) => void;
}

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return 'غير محدد';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'غير محدد';
  return d.toLocaleDateString('ar-YE', { year: 'numeric', month: 'short', day: 'numeric' });
};

const calculateDurationDays = (start?: string, end?: string): number => {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e) || e < s) return 0;
  return Math.round((e - s) / (1000 * 60 * 60 * 24));
};

const calculateDaysRemaining = (end?: string): number => {
  if (!end) return 0;
  const e = new Date(end).getTime();
  const now = new Date().getTime();
  if (isNaN(e)) return 0;
  return Math.max(0, Math.ceil((e - now) / (1000 * 60 * 60 * 24)));
};

const formatEnrolledDate = (dateStr?: string): string => {
  if (!dateStr) return 'غير محدد';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'غير محدد';
  return d.toLocaleDateString('ar-YE', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const CyclesListPage: React.FC<CyclesListPageProps> = ({
  initialTab = 'list',
  prefillData,
  onNavigate,
}) => {
  const { user } = useAuth();
  const userGov = user?.governorate || null;
  const isCentralSupervisor = !userGov;

  // إدارة التبويب النشط (سجل الدورات vs إطلاق وتعديل)
  const [activeTab, setActiveTab] = useState<'list' | 'form'>(initialTab);
  const [formMode, setFormMode] = useState<FormMode>(prefillData ? 'clone' : 'new');
  const [selectedEditCycleId, setSelectedEditCycleId] = useState<number | undefined>(undefined);

  // قائمة الدورات والتحميل
  const [cycles, setCycles] = useState<EvaluationCycleItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // نافذة استعراض المدارس المشاركة
  const [selectedCycleForSchools, setSelectedCycleForSchools] = useState<EvaluationCycleItem | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState<string>('');
  const [isEnrollingOpen, setIsEnrollingOpen] = useState<boolean>(false);
  const [availableSchools, setAvailableSchools] = useState<ParticipatingSchoolItem[]>([]);
  const [isLoadingAvailableSchools, setIsLoadingAvailableSchools] = useState<boolean>(false);
  const [selectedSchoolIdsToEnroll, setSelectedSchoolIdsToEnroll] = useState<number[]>([]);
  const [isSubmittingEnrollment, setIsSubmittingEnrollment] = useState<boolean>(false);
  const [enrollSuccessMessage, setEnrollSuccessMessage] = useState<string | null>(null);
  const [enrollErrorMessage, setEnrollErrorMessage] = useState<string | null>(null);

  // نافذة تأكيد إغلاق الدورة
  const [cycleToClose, setCycleToClose] = useState<EvaluationCycleItem | null>(null);
  const [isClosingCycle, setIsClosingCycle] = useState<boolean>(false);
  const [closeSuccessMessage, setCloseSuccessMessage] = useState<string | null>(null);
  const [closeErrorMessage, setCloseErrorMessage] = useState<string | null>(null);

  // جلب الدورات من السيرفر
  const fetchCycles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await supervisionApi.getEvaluationCycles();
      const normalized: EvaluationCycleItem[] = (Array.isArray(data) ? data : []).map((c: any) => ({
        cycleId: c.cycleId ?? c.cycle_id ?? c.id,
        academicYear: c.academicYear ?? c.academic_year ?? 'غير محدد',
        name: c.name ?? `دورة التقييم الذاتي للعام ${c.academicYear ?? c.academic_year}`,
        scopeGovernorate: c.scopeGovernorate ?? c.scope_governorate ?? null,
        startDate: c.startDate ?? c.start_date ?? '',
        endDate: c.endDate ?? c.end_date ?? '',
        status: (c.status === 'Active' ? 'Active' : 'Closed') as 'Active' | 'Closed',
        participationsCount: c.participationsCount ?? c.participations_count ?? 0,
        evaluationsCount: c.evaluationsCount ?? c.evaluations_count ?? 0,
        version: c.version
          ? {
              versionId: c.version.versionId ?? c.version.version_id,
              versionName: c.version.versionName ?? c.version.version_name ?? 'الإصدار المعتمد',
              versionNumber: c.version.versionNumber ?? c.version.version_number ?? '1.0.0',
            }
          : undefined,
        participatingSchools: (c.participatingSchools ?? []).map((s: any) => ({
          schoolId: s.schoolId ?? s.school_id,
          schoolName: s.schoolName ?? s.school_name,
          schoolCode: s.schoolCode ?? s.school_code,
          stage: s.stage ?? s.educational_stage,
          governorate: s.governorate,
          district: s.district ?? s.educational_district,
          enrolledAt: s.enrolledAt ?? s.created_at,
        })),
      }));

      // فرز: الدورة النشطة أولاً، ثم الأحدث تاريخاً
      normalized.sort((a, b) => {
        if (a.status === 'Active' && b.status !== 'Active') return -1;
        if (b.status === 'Active' && a.status !== 'Active') return 1;
        return new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime();
      });

      setCycles(normalized);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل سجل الدورات التقييمية من الخادم.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  // تحديد الدورات النشطة الحالية والنطاق العام
  const activeCycles = useMemo(() => cycles.filter((c) => c.status === 'Active'), [cycles]);
  const activeCycle = useMemo(() => activeCycles[0] || null, [activeCycles]);
  const generalActiveCycle = useMemo(() => activeCycles.find((c) => !c.scopeGovernorate) || null, [activeCycles]);
  const canLaunchNewCycle = isCentralSupervisor && !generalActiveCycle;

  // إحصائيات الكروت العلوية
  const kpiStats = useMemo(() => {
    const total = cycles.length;
    const archived = cycles.filter((c) => c.status === 'Closed').length;
    const totalSchools = cycles.reduce((acc, c) => acc + (c.participationsCount || 0), 0);
    const daysRemaining = activeCycle ? calculateDaysRemaining(activeCycle.endDate) : 0;

    return {
      total,
      archived,
      totalSchools,
      daysRemaining,
    };
  }, [cycles, activeCycle]);

  // تصفية الدورات في جدول السجل
  const filteredCycles = useMemo(() => {
    return cycles.filter((c) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.academicYear.toLowerCase().includes(term) ||
        (c.scopeGovernorate && c.scopeGovernorate.toLowerCase().includes(term)) ||
        (c.version?.versionName && c.version.versionName.toLowerCase().includes(term));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && c.status === 'Active') ||
        (statusFilter === 'closed' && c.status === 'Closed');

      return matchesSearch && matchesStatus;
    });
  }, [cycles, searchTerm, statusFilter]);

  // المدارس المشاركة المفلترة في النافذة المنبثقة
  const filteredModalSchools = useMemo(() => {
    if (!selectedCycleForSchools) return [];
    const list = selectedCycleForSchools.participatingSchools || [];
    const t = modalSearchTerm.trim().toLowerCase();
    if (!t) return list;
    return list.filter(
      (s: ParticipatingSchoolItem) =>
        s.schoolName.toLowerCase().includes(t) || s.schoolCode.toLowerCase().includes(t)
    );
  }, [selectedCycleForSchools, modalSearchTerm]);

  // فتح نافذة المدارس المشاركة
  const handleOpenSchoolsModal = (cycle: EvaluationCycleItem) => {
    setSelectedCycleForSchools(cycle);
    setModalSearchTerm('');
    setIsEnrollingOpen(false);
    setAvailableSchools([]);
    setSelectedSchoolIdsToEnroll([]);
    setEnrollSuccessMessage(null);
    setEnrollErrorMessage(null);
  };

  // فتح وإغلاق قسم إلحاق المدارس
  const handleToggleEnrollSection = async () => {
    if (!selectedCycleForSchools) return;
    if (isEnrollingOpen) {
      setIsEnrollingOpen(false);
      return;
    }

    setIsLoadingAvailableSchools(true);
    setEnrollErrorMessage(null);
    try {
      const schools = await supervisionApi.getAvailableSchoolsForCycle(selectedCycleForSchools.cycleId);
      setAvailableSchools(schools);
      setIsEnrollingOpen(true);
    } catch (err: any) {
      setEnrollErrorMessage(err?.message || 'تعذر استرجاع المدارس المتاحة للإلحاق.');
    } finally {
      setIsLoadingAvailableSchools(false);
    }
  };

  // تأكيد إلحاق المدارس
  const handleConfirmEnrollment = async () => {
    if (!selectedCycleForSchools || selectedSchoolIdsToEnroll.length === 0) return;

    setIsSubmittingEnrollment(true);
    setEnrollErrorMessage(null);
    setEnrollSuccessMessage(null);
    try {
      await supervisionApi.enrollSchoolsInCycle(selectedCycleForSchools.cycleId, selectedSchoolIdsToEnroll);
      setEnrollSuccessMessage(`تم إلحاق ${selectedSchoolIdsToEnroll.length} مدرسة بنجاح بالدورة.`);
      setSelectedSchoolIdsToEnroll([]);
      setIsEnrollingOpen(false);

      await fetchCycles();
      const updatedList = await supervisionApi.getEvaluationCycles();
      const updatedCycle = updatedList.find((c: any) => (c.cycleId ?? c.id) === selectedCycleForSchools.cycleId);
      if (updatedCycle) {
        setSelectedCycleForSchools((prev: EvaluationCycleItem | null) =>
          prev
            ? {
                ...prev,
                participationsCount: updatedCycle.participationsCount ?? updatedCycle.participations_count,
                participatingSchools: (updatedCycle.participatingSchools ?? []).map((s: any) => ({
                  schoolId: s.schoolId ?? s.school_id,
                  schoolName: s.schoolName ?? s.school_name,
                  schoolCode: s.schoolCode ?? s.school_code,
                  stage: s.stage ?? s.educational_stage,
                  governorate: s.governorate,
                  district: s.district ?? s.educational_district,
                  enrolledAt: s.enrolledAt ?? s.created_at,
                })),
              }
            : null
        );
      }
    } catch (err: any) {
      setEnrollErrorMessage(err?.message || 'تعذر إلحاق المدارس بالدورة.');
    } finally {
      setIsSubmittingEnrollment(false);
    }
  };

  // فتح نافذة إغلاق الدورة
  const handleRequestCloseCycle = (cycle: EvaluationCycleItem) => {
    setCycleToClose(cycle);
    setCloseErrorMessage(null);
    setCloseSuccessMessage(null);
  };

  // تأكيد إغلاق الدورة
  const handleConfirmCloseCycle = async () => {
    if (!cycleToClose) return;

    setIsClosingCycle(true);
    setCloseErrorMessage(null);
    setCloseSuccessMessage(null);

    try {
      await supervisionApi.closeCycle(cycleToClose.cycleId);
      setCloseSuccessMessage(`تم إغلاق وأرشفة الدورة التقييمية «${cycleToClose.name}» بنجاح وتجميد التعديلات في المدارس.`);
      await fetchCycles();
      setTimeout(() => {
        setCycleToClose(null);
        setCloseSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      setCloseErrorMessage(err?.message || 'فشل إغلاق الدورة التقييمية.');
    } finally {
      setIsClosingCycle(false);
    }
  };

  // الانتقال المباشر للتعديل
  const handleOpenEditCycle = (cycleId: number) => {
    setSelectedEditCycleId(cycleId);
    setFormMode('edit');
    setActiveTab('form');
  };

  // الانتقال المباشر للاستنساخ
  const handleOpenCloneCycle = (cycle: EvaluationCycleItem) => {
    setSelectedEditCycleId(cycle.cycleId);
    setFormMode('clone');
    setActiveTab('form');
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* 1. الترويسة الرئيسية وشريط التبويبات */}
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
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#64748B',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              marginBottom: '4px',
            }}
          >
            <ArrowRight size={15} />
            <span>العودة إلى لوحة المتابعة</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.3px',
                margin: 0,
              }}
            >
              إدارة الدورات التقييمية
            </h1>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: isCentralSupervisor ? '#059669' : '#D97706',
                backgroundColor: isCentralSupervisor ? '#ECFDF5' : '#FEF3C7',
                border: isCentralSupervisor ? '1px solid #A7F3D0' : '1px solid #FDE68A',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              {isCentralSupervisor
                ? 'نطاق الإشراف المركزي العام (كافة المحافظات)'
                : `المشرف الجغرافي (${userGov})`}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            إدارة وجدولة دورات التقييم المركزي وتحديد النطاقات الزمنية والميدانية وأرشفة الدورات المكتملة
          </p>
        </div>

        {/* أزرار الإجراءات العلوية */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isCentralSupervisor && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('form');
                setFormMode('new');
              }}
              disabled={!canLaunchNewCycle}
              title={
                !canLaunchNewCycle
                  ? generalActiveCycle
                    ? `معطل: توجد دورة عامة نشطة («${generalActiveCycle.name}») تغطي كافة المحافظات`
                    : 'معطل: كافة محافظات الجمهورية مشغولة بدورات نشطة'
                  : 'إطلاق دورة تقييم جديدة لنطاق جغرافي متاح'
              }
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                backgroundColor: canLaunchNewCycle ? '#2563EB' : '#94A3B8',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: canLaunchNewCycle ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: canLaunchNewCycle ? 1 : 0.6,
                transition: 'all 0.15s ease',
              }}
            >
              <PlusCircle size={15} />
              <span>إطلاق دورة جديدة</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchCycles}
            disabled={isLoading}
            title="تحديث البيانات من السيرفر"
            style={{
              padding: '9px 12px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* 2. شريط التبويبات المتكامل (سجل الدورات vs إطلاق / تعديل) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '2px solid #E2E8F0',
          marginBottom: '24px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 800,
            cursor: 'pointer',
            border: 'none',
            borderBottom: activeTab === 'list' ? '3px solid #2563EB' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'list' ? '#2563EB' : '#64748B',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
          }}
        >
          <Calendar size={18} />
          <span>سجل الدورات التقييمية</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: activeTab === 'list' ? '#EFF6FF' : '#F1F5F9',
              color: activeTab === 'list' ? '#1D4ED8' : '#64748B',
              padding: '2px 7px',
              borderRadius: '999px',
            }}
          >
            {cycles.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('form');
            if (activeTab !== 'form') setFormMode(canLaunchNewCycle ? 'new' : 'edit');
          }}
          style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 800,
            cursor: 'pointer',
            border: 'none',
            borderBottom: activeTab === 'form' ? '3px solid #2563EB' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'form' ? '#2563EB' : '#64748B',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
          }}
        >
          <Edit3 size={18} />
          <span>إطلاق / تعديل دورة تقييم</span>
          {activeCycles.length > 0 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: '#ECFDF5',
                color: '#065F46',
                border: '1px solid #A7F3D0',
                padding: '1px 6px',
                borderRadius: '6px',
              }}
            >
              {activeCycles.length === 1 ? 'توجد دورة نشطة' : `${activeCycles.length} دورات نشطة`}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* محتوى التبويب 1: سجل الدورات التقييمية                                    */}
      {/* ========================================================================= */}
      {activeTab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* كروت المؤشرات الإحصائية (KPI Grid) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
            }}
          >
            {/* كرت 1: الدورة النشطة والعد التنازلي */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: activeCycle ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>الدورة التقييمية الجارية</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: activeCycle ? '#EFF6FF' : '#F1F5F9',
                    color: activeCycle ? '#1D4ED8' : '#64748B',
                  }}
                >
                  <Clock size={12} />
                  {activeCycle ? `${kpiStats.daysRemaining} يوماً متبقياً` : 'لا توجد دورة نشطة'}
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
                {activeCycle ? activeCycle.name : 'الدورة مغلقة حالياً'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                {activeCycle
                  ? `العام الدراسي ${activeCycle.academicYear} • تنتهي في ${formatDate(activeCycle.endDate)}`
                  : 'يمكن للمشرف العام إطلاق دورة جديدة من التبويب المخصص'}
              </div>
            </div>

            {/* كرت 2: إجمالي الدورات والمؤرشفة */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>سجل الدورات التاريخي</span>
                <Layers size={16} color="#64748B" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>{kpiStats.total}</span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>دورات مسجلة</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                منها <strong style={{ color: '#0F172A' }}>{kpiStats.archived}</strong> دورة مغلقة ومؤرشفة نظامياً
              </div>
            </div>

            {/* كرت 3: إجمالي المدارس المستهدفة */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>المدارس المستهدفة والمشاركة</span>
                <Building2 size={16} color="#64748B" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
                  {activeCycle?.participationsCount ?? kpiStats.totalSchools}
                </span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>مدرسة مشاركة</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                {activeCycle
                  ? `ملحقة بالدورة النشطة (${activeCycle.academicYear})`
                  : 'إجمالي المدارس المسجلة عبر كافة الدورات'}
              </div>
            </div>
          </div>

          {/* شريط الفلاتر والبحث في الجدول */}
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
              gap: '14px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            {/* البحث السريع */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '8px 12px',
                width: '100%',
                maxWidth: '380px',
              }}
            >
              <Search size={16} color="#94A3B8" />
              <input
                type="text"
                placeholder="ابحث باسم الدورة، العام الدراسي، أو الإصدار..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
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
                  style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', padding: 0 }}
                >
                  <X size={14} color="#94A3B8" />
                </button>
              )}
            </div>

            {/* فلاتر الحالة */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>الحالة:</span>
              {[
                { id: 'all', label: 'الكل' },
                { id: 'active', label: 'نشطة وجارية' },
                { id: 'closed', label: 'مؤرشفة' },
              ].map((filter) => {
                const isSelected = statusFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setStatusFilter(filter.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #2563EB' : '1px solid #E2E8F0',
                      backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                      color: isSelected ? '#1D4ED8' : '#64748B',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* شريط تنبيه العد التنازلي عند اقتراب انتهاء الدورة النشطة (<= 7 أيام) */}
          {activeCycle && kpiStats.daysRemaining <= 7 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '14px 18px',
                borderRadius: '10px',
                backgroundColor: kpiStats.daysRemaining === 0 ? '#FEF2F2' : '#FFFBEB',
                border: kpiStats.daysRemaining === 0 ? '1px solid #FCA5A5' : '1px solid #FCD34D',
                color: kpiStats.daysRemaining === 0 ? '#991B1B' : '#92400E',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: kpiStats.daysRemaining === 0 ? '#FEE2E2' : '#FEF3C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={18} color={kpiStats.daysRemaining === 0 ? '#DC2626' : '#D97706'} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800 }}>
                    {kpiStats.daysRemaining === 0
                      ? `تنبيه حرج: اليوم هو الموعد النهائي لإغلاق الدورة النشطة «${activeCycle.name}»`
                      : `تنبيه زمني: يتبقى ${kpiStats.daysRemaining} ${kpiStats.daysRemaining === 1 ? 'يوم واحد' : kpiStats.daysRemaining === 2 ? 'يومان' : 'أيام'} فقط على موعد إغلاق الدورة النشطة`}
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '2px', opacity: 0.9 }}>
                    تاريخ الإغلاق المحدد: {formatDate(activeCycle.endDate)} • يرجى مراجعة موقف استكمال المدارس وتمديد الدورة من صلاحيات المشرف العام إذا لزم الأمر قبل إغلاقها.
                  </div>
                </div>
              </div>

              {isCentralSupervisor && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEditCycle(activeCycle.cycleId)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: kpiStats.daysRemaining === 0 ? '#DC2626' : '#D97706',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Edit3 size={13} />
                    <span>تمديد الدورة الآن</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequestCloseCycle(activeCycle)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: '#FFFFFF',
                      color: kpiStats.daysRemaining === 0 ? '#DC2626' : '#B45309',
                      border: kpiStats.daysRemaining === 0 ? '1px solid #FCA5A5' : '1px solid #FDE68A',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Archive size={13} />
                    <span>إغلاق وأرشفة</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* جدول الدورات التقييمية */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            {isLoading ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
                <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#2563EB' }} />
                <p style={{ fontSize: '14px', margin: 0 }}>جاري استرجاع سجل الدورات التقييمية...</p>
              </div>
            ) : error ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <EmptySupervisionState
                  title="تعذر تحميل سجل الدورات"
                  description={error}
                  onAction={fetchCycles}
                  actionText="إعادة المحاولة"
                />
              </div>
            ) : filteredCycles.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <EmptySupervisionState
                  title="لا توجد دورات مطابقة للبحث"
                  description="لم يتم العثور على أي دورات تقييمية مطابقة للفلاتر المحددة."
                  onAction={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  actionText="إعادة ضبط الفلاتر"
                />
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                      <th style={{ padding: '14px 16px', fontWeight: 800 }}>الدورة التقييمية والعام الدراسي</th>
                      <th style={{ padding: '14px 16px', fontWeight: 800 }}>الإصدار المعياري المعتمد</th>
                      <th style={{ padding: '14px 16px', fontWeight: 800 }}>الجدول الزمني والمدة</th>
                      <th style={{ padding: '14px 16px', fontWeight: 800 }}>النطاق الجغرافي</th>
                      <th style={{ padding: '14px 16px', fontWeight: 800 }}>المدارس المشاركة</th>
                      <th style={{ padding: '14px 16px', fontWeight: 800 }}>الحالة النظامية</th>
                      <th style={{ padding: '14px 16px', fontWeight: 800, textAlign: 'center' }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCycles.map((cycle) => {
                      const isActive = cycle.status === 'Active';
                      const duration = calculateDurationDays(cycle.startDate, cycle.endDate);
                      const daysLeft = isActive ? calculateDaysRemaining(cycle.endDate) : 0;

                      return (
                        <tr
                          key={cycle.cycleId}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            backgroundColor: isActive ? 'rgba(239, 246, 255, 0.4)' : '#FFFFFF',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          {/* 1. اسم الدورة والعام الدراسي */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '13.5px' }}>
                              {cycle.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                              العام الدراسي: <strong>{cycle.academicYear}</strong>
                            </div>
                          </td>

                          {/* 2. الإصدار المعياري */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <ShieldCheck size={16} color="#059669" />
                              <span style={{ fontWeight: 700, color: '#1E293B' }}>
                                {cycle.version?.versionName || 'وثيقة المعايير الوطنية'}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                              رقم الإصدار: {cycle.version?.versionNumber || '1.0.0'} (مُقر نظامياً)
                            </div>
                          </td>

                          {/* 3. الجدول الزمني */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ color: '#0F172A', fontWeight: 600 }}>
                              {formatDate(cycle.startDate)} ← {formatDate(cycle.endDate)}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', marginTop: '2px' }}>
                              <span style={{ color: '#64748B' }}>المدة: {duration} يوماً</span>
                              {isActive && (
                                <span style={{ color: daysLeft > 10 ? '#059669' : '#DC2626', fontWeight: 700 }}>
                                  ({daysLeft > 0 ? `${daysLeft} يوماً متبقياً` : 'منتهية زمنياً'})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 4. النطاق الجغرافي */}
                          <td style={{ padding: '14px 16px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: cycle.scopeGovernorate ? '#1D4ED8' : '#0F172A',
                                backgroundColor: cycle.scopeGovernorate ? '#EFF6FF' : '#F1F5F9',
                                padding: '3px 8px',
                                borderRadius: '6px',
                              }}
                            >
                              {cycle.scopeGovernorate || 'عام (كافة المحافظات)'}
                            </span>
                          </td>

                          {/* 5. المدارس المشاركة (زر منبثق) */}
                          <td style={{ padding: '14px 16px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenSchoolsModal(cycle)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #CBD5E1',
                                color: '#1E293B',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              <Building2 size={14} color="#2563EB" />
                              <span>{cycle.participationsCount ?? 0} مدرسة</span>
                            </button>
                          </td>

                          {/* 6. الحالة النظامية */}
                          <td style={{ padding: '14px 16px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 10px',
                                borderRadius: '999px',
                                fontSize: '11.5px',
                                fontWeight: 800,
                                backgroundColor: isActive ? '#ECFDF5' : '#F1F5F9',
                                color: isActive ? '#065F46' : '#64748B',
                                border: isActive ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                              }}
                            >
                              {isActive ? (
                                <>
                                  <CheckCircle2 size={13} color="#059669" />
                                  <span>نشطة وجارية</span>
                                </>
                              ) : (
                                <>
                                  <Archive size={13} color="#64748B" />
                                  <span>مؤرشفة</span>
                                </>
                              )}
                            </span>
                          </td>

                          {/* 7. الإجراءات المتاحة */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              {/* متابعة مدارس الدورة */}
                              <button
                                type="button"
                                onClick={() => onNavigate('dashboard', { cycleId: cycle.cycleId })}
                                title="متابعة مصفوفة مدارس الدورة في لوحة المتابعة"
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  color: '#1D4ED8',
                                  backgroundColor: '#EFF6FF',
                                  border: '1px solid #BFDBFE',
                                  cursor: 'pointer',
                                }}
                              >
                                متابعة المدارس
                              </button>

                              {/* التقارير */}
                              <button
                                type="button"
                                onClick={() => onNavigate('reports', { cycleId: cycle.cycleId })}
                                title="استعراض التقارير والتحليلات المركزية الخاصة بهذه الدورة"
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #CBD5E1',
                                  color: '#475569',
                                  cursor: 'pointer',
                                }}
                              >
                                <BarChart3 size={14} />
                              </button>

                              {/* تعديل الدورة النشطة (للمشرف العام فقط) */}
                              {isActive && isCentralSupervisor && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditCycle(cycle.cycleId)}
                                  title="تعديل المحددات الزمنية والمسمى للدورة النشطة"
                                  style={{
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #0D9488',
                                    color: '#0D9488',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Edit3 size={14} />
                                </button>
                              )}

                              {/* إغلاق الدورة النشطة (للمشرف العام فقط) */}
                              {isActive && isCentralSupervisor && (
                                <button
                                  type="button"
                                  onClick={() => handleRequestCloseCycle(cycle)}
                                  title="إغلاق وأرشفة الدورة التقييمية وتجميد الرفع بالمدارس"
                                  style={{
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#FEF2F2',
                                    border: '1px solid #FCA5A5',
                                    color: '#DC2626',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Lock size={14} />
                                </button>
                              )}

                              {/* استنساخ دورة جديدة */}
                              <button
                                type="button"
                                onClick={() => handleOpenCloneCycle(cycle)}
                                title="تهيئة واستنساخ دورة جديدة من هذه الدورة للعام القادم"
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #CBD5E1',
                                  color: '#64748B',
                                  cursor: 'pointer',
                                }}
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* محتوى التبويب 2: إطلاق / تعديل دورة تقييم                                */}
      {/* ========================================================================= */}
      {activeTab === 'form' && (
        <CycleFormTab
          mode={formMode}
          onModeChange={setFormMode}
          cycles={cycles}
          activeCycle={activeCycle}
          isCentralSupervisor={isCentralSupervisor}
          selectedEditCycleId={selectedEditCycleId}
          prefillData={prefillData}
          onSuccess={fetchCycles}
          onRequestCloseCycle={handleRequestCloseCycle}
          onSwitchToListTab={() => setActiveTab('list')}
        />
      )}

      {/* ========================================================================= */}
      {/* نافذة استعراض وإلحاق المدارس المشاركة (Participating Schools Modal)       */}
      {/* ========================================================================= */}
      {selectedCycleForSchools && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '820px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
          >
            {/* ترويسة النافذة */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  المدارس المشاركة في: {selectedCycleForSchools.name}
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0 0' }}>
                  العام الدراسي: {selectedCycleForSchools.academicYear} • الحالة: {selectedCycleForSchools.status === 'Active' ? 'نشطة جارية' : 'مؤرشفة'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCycleForSchools(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* رسائل التنبيهات في المودال */}
            {enrollSuccessMessage && (
              <div style={{ margin: '12px 24px 0', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#ECFDF5', color: '#065F46', fontSize: '12.5px', fontWeight: 700 }}>
                {enrollSuccessMessage}
              </div>
            )}
            {enrollErrorMessage && (
              <div style={{ margin: '12px 24px 0', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', color: '#991B1B', fontSize: '12.5px', fontWeight: 700 }}>
                {enrollErrorMessage}
              </div>
            )}

            {/* شريط الأدوات في المودال */}
            <div
              style={{
                padding: '14px 24px',
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px', maxWidth: '320px', backgroundColor: '#FFFFFF', padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                <Search size={14} color="#94A3B8" />
                <input
                  type="text"
                  placeholder="ابحث باسم المدرسة أو الكود..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: '12px', width: '100%', color: '#0F172A' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* زر تصدير كشف المدارس Excel */}
                <button
                  type="button"
                  onClick={() =>
                    exportCycleParticipatingSchoolsToExcel(
                      selectedCycleForSchools.name,
                      selectedCycleForSchools.academicYear,
                      filteredModalSchools
                    )
                  }
                  disabled={filteredModalSchools.length === 0}
                  title="تصدير كشف المدارس المشاركة في الدورة إلى جدول Excel (.xlsx)"
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: filteredModalSchools.length === 0 ? 'not-allowed' : 'pointer',
                    backgroundColor: '#FFFFFF',
                    color: filteredModalSchools.length === 0 ? '#94A3B8' : '#059669',
                    border: filteredModalSchools.length === 0 ? '1px solid #E2E8F0' : '1px solid #A7F3D0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (filteredModalSchools.length > 0) {
                      e.currentTarget.style.backgroundColor = '#ECFDF5';
                      e.currentTarget.style.borderColor = '#059669';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (filteredModalSchools.length > 0) {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#A7F3D0';
                    }
                  }}
                >
                  <FileSpreadsheet size={15} />
                  <span>تصدير كشف المدارس (Excel)</span>
                </button>

                {/* زر إلحاق مدارس إضافية للدورة النشطة */}
                {selectedCycleForSchools.status === 'Active' && (
                  <button
                    type="button"
                    onClick={handleToggleEnrollSection}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      backgroundColor: isEnrollingOpen ? '#F1F5F9' : '#2563EB',
                      color: isEnrollingOpen ? '#475569' : '#FFFFFF',
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Plus size={14} />
                    <span>{isEnrollingOpen ? 'إلغاء الإلحاق' : 'إلحاق مدارس إضافية بالدورة'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* قسم إلحاق المدارس المفتوح */}
            {isEnrollingOpen && (
              <div style={{ padding: '16px 24px', backgroundColor: '#EFF6FF', borderBottom: '1px solid #BFDBFE' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E40AF' }}>
                    اختر المدارس المتاحة للتسجيل في الدورة:
                  </span>
                  <button
                    type="button"
                    onClick={handleConfirmEnrollment}
                    disabled={selectedSchoolIdsToEnroll.length === 0 || isSubmittingEnrollment}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: selectedSchoolIdsToEnroll.length === 0 ? '#94A3B8' : '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: selectedSchoolIdsToEnroll.length === 0 || isSubmittingEnrollment ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {isSubmittingEnrollment ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>تسجيل المدارس المحددة ({selectedSchoolIdsToEnroll.length})</span>
                  </button>
                </div>

                {isLoadingAvailableSchools ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
                    <Loader2 size={16} className="animate-spin" style={{ margin: '0 auto 6px' }} />
                    جاري تحميل المدارس المتاحة...
                  </div>
                ) : availableSchools.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#64748B', padding: '10px 0' }}>
                    كافة المدارس النشطة مسجلة بالفعل في هذه الدورة.
                  </div>
                ) : (
                  <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {availableSchools.map((s) => {
                      const isChecked = selectedSchoolIdsToEnroll.includes(s.schoolId);
                      return (
                        <label
                          key={s.schoolId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '6px 10px',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '6px',
                            border: isChecked ? '1px solid #2563EB' : '1px solid #E2E8F0',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedSchoolIdsToEnroll((prev) =>
                                prev.includes(s.schoolId) ? prev.filter((id) => id !== s.schoolId) : [...prev, s.schoolId]
                              );
                            }}
                          />
                          <span style={{ fontWeight: 700, color: '#0F172A' }}>{s.schoolName}</span>
                          <span style={{ color: '#64748B' }}>({s.schoolCode})</span>
                          <span style={{ marginRight: 'auto', color: '#64748B', fontSize: '11px' }}>
                            {s.governorate} • {s.stage}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* جدول المدارس المشاركة */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {(() => {
                const schools = filteredModalSchools;

                if (schools.length === 0) {
                  return (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                      {modalSearchTerm ? 'لا توجد مدارس مطابقة للبحث داخل الدورة.' : 'لا توجد مدارس ملحقة بهذه الدورة بعد.'}
                    </div>
                  );
                }

                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                        <th style={{ padding: '8px 12px', fontWeight: 800 }}>#</th>
                        <th style={{ padding: '8px 12px', fontWeight: 800 }}>رمز المدرسة</th>
                        <th style={{ padding: '8px 12px', fontWeight: 800 }}>اسم المدرسة</th>
                        <th style={{ padding: '8px 12px', fontWeight: 800 }}>المحافظة / المديرية</th>
                        <th style={{ padding: '8px 12px', fontWeight: 800 }}>المرحلة</th>
                        <th style={{ padding: '8px 12px', fontWeight: 800 }}>تاريخ الإلحاق</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schools.map((s: ParticipatingSchoolItem, idx: number) => (
                        <tr key={s.schoolId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '10px 12px', color: '#64748B' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1E293B', fontFamily: 'monospace' }}>
                            {s.schoolCode}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0F172A' }}>{s.schoolName}</td>
                          <td style={{ padding: '10px 12px', color: '#64748B' }}>
                            {s.governorate} {s.district ? `• ${s.district}` : ''}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748B' }}>{s.stage || 'أساسي/ثانوي'}</td>
                          <td style={{ padding: '10px 12px', color: '#64748B' }}>{formatEnrolledDate(s.enrolledAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* تذييل المودال */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC',
              }}
            >
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                إجمالي المدارس: <strong>{selectedCycleForSchools.participatingSchools?.length || 0}</strong> مدرسة
              </span>
              <button
                type="button"
                onClick={() => setSelectedCycleForSchools(null)}
                style={{
                  padding: '7px 18px',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* نافذة تأكيد إغلاق الدورة التقييمية (Close Cycle Confirmation Modal)        */}
      {/* ========================================================================= */}
      {cycleToClose && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '24px 24px 16px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#FEF2F2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626',
                  flexShrink: 0,
                }}
              >
                <Lock size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  تأكيد إغلاق وأرشفة الدورة التقييمية
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', marginTop: '6px', margin: 0 }}>
                  «{cycleToClose.name}» (العام الدراسي {cycleToClose.academicYear})
                </p>
              </div>
            </div>

            <div style={{ padding: '0 24px 20px', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
              <div
                style={{
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: '10px',
                  padding: '14px',
                  marginBottom: '16px',
                  color: '#92400E',
                  fontSize: '12.5px',
                }}
              >
                <strong>الآثار النظامية للإغلاق (FR-SUP-01 / BR-GEN-05):</strong>
                <ul style={{ margin: '6px 0 0', paddingRight: '20px' }}>
                  <li>تُؤرشف سجلات كافة المدارس غير المكتملة بحالتها الراهنة (مسودة، مرفوعة، قيد التدقيق، طلب استكمال) كسجل تاريخي دون ترحيلها تلقائياً.</li>
                  <li>تتوقف بوابتا مقيم ومدير المدرسة عن قبول أي رصد جديد أو رفع مخرجات لتلك الدورة.</li>
                  <li>تظل المخرجات المكتملة متاحة للقراءة والتقارير ومتابعة خطط التحسين المدرسية.</li>
                  <li>يتم تحويل حالة الدورة إلى مغلقة ومؤرشفة (<code style={{ fontWeight: 700 }}>Closed</code>) وتسجيل العملية في سجل التدقيق.</li>
                </ul>
              </div>

              {closeSuccessMessage && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#ECFDF5', color: '#065F46', fontWeight: 700, marginBottom: '12px' }}>
                  {closeSuccessMessage}
                </div>
              )}

              {closeErrorMessage && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', color: '#991B1B', fontWeight: 700, marginBottom: '12px' }}>
                  {closeErrorMessage}
                </div>
              )}
            </div>

            <div
              style={{
                padding: '16px 24px',
                backgroundColor: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                type="button"
                onClick={() => setCycleToClose(null)}
                disabled={isClosingCycle}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                إلغاء التراجع
              </button>

              <button
                type="button"
                onClick={handleConfirmCloseCycle}
                disabled={isClosingCycle}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  backgroundColor: isClosingCycle ? '#94A3B8' : '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isClosingCycle ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
                }}
              >
                {isClosingCycle && <Loader2 size={15} className="animate-spin" />}
                <span>تأكيد إغلاق وأرشفة الدورة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
