/**
 * Component: CycleFormTab
 * التبويب 2: إطلاق وتعديل واستنساخ دورة التقييم
 * يتيح للمشرف الوزاري المركزي العام:
 * 1. إطلاق دورة جديدة عند عدم وجود دورة نشطة
 * 2. تهيئة واستنساخ دورة جديدة من دورة سابقة (نسخ المدارس والعام الدراسي دون ترحيل أي نتائج سابقة)
 * 3. تعديل بيانات الدورة النشطة (تمديد التاريخ والاسم مع قفل الإصدار المعياري BR-GEN-05)
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  Lock,
  Copy,
  PlusCircle,
  Edit3,
  Loader2,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { ActiveVersionBadge } from './ActiveVersionBadge';
import { CycleSchoolsSelectorCard } from './CycleSchoolsSelectorCard';
import { supervisionApi } from '../../api/supervisionApi';
import type {
  ActiveStandardVersion,
  EvaluationCycleItem,
  CycleLaunchPayload,
} from '../../api/supervisionTypes';

export type FormMode = 'new' | 'clone' | 'edit';

interface CycleFormTabProps {
  mode: FormMode;
  onModeChange: (mode: FormMode) => void;
  cycles: EvaluationCycleItem[];
  activeCycle?: EvaluationCycleItem | null;
  isCentralSupervisor: boolean;
  selectedEditCycleId?: number;
  prefillData?: Partial<CycleLaunchPayload>;
  onSuccess: () => void;
  onRequestCloseCycle?: (cycle: EvaluationCycleItem) => void;
  onSwitchToListTab: () => void;
}

export const CycleFormTab: React.FC<CycleFormTabProps> = ({
  mode,
  onModeChange,
  cycles,
  activeCycle,
  isCentralSupervisor,
  selectedEditCycleId,
  prefillData,
  onSuccess,
  onRequestCloseCycle,
  onSwitchToListTab,
}) => {
  // قائمة المحافظات المعتمدة في الجمهورية اليمنية
  const ALL_GOVERNORATES = useMemo(
    () => [
      'أمانة العاصمة',
      'محافظة تعز',
      'محافظة إب',
      'محافظة الحديدة',
      'محافظة صنعاء',
      'محافظة ذمار',
      'محافظة عمران',
      'محافظة صعدة',
      'محافظة حجة',
      'محافظة المحويت',
      'محافظة البيضاء',
      'محافظة مأرب',
      'محافظة الجوف',
      'محافظة ريمة',
      'محافظة عدن',
      'محافظة لحج',
      'محافظة أبين',
      'محافظة شبوة',
      'محافظة حضرموت',
      'محافظة المهرة',
      'محافظة سقطرى',
      'محافظة الضالع',
    ],
    []
  );

  // حساب النطاقات المشغولة والمتاحة بالدورات النشطة
  const activeCycles = useMemo(() => cycles.filter((c) => c.status === 'Active'), [cycles]);
  const generalActiveCycle = useMemo(() => activeCycles.find((c) => !c.scopeGovernorate) || null, [activeCycles]);
  const occupiedGovernorates = useMemo(
    () => activeCycles.map((c) => c.scopeGovernorate).filter((g): g is string => !!g),
    [activeCycles]
  );
  const isAllGovernoratesOccupied = useMemo(
    () => ALL_GOVERNORATES.every((gov) => occupiedGovernorates.includes(gov)),
    [ALL_GOVERNORATES, occupiedGovernorates]
  );
  // إمكانية إطلاق دورة جديدة: مسموح إلا إذا كانت هناك دورة عامة تغطي كافة المحافظات أو شُغلت كافة المحافظات
  const canLaunchNewCycle = !generalActiveCycle && !isAllGovernoratesOccupied;

  // 1. الإصدار المعياري النشط
  const [activeVersion, setActiveVersion] = useState<ActiveStandardVersion | null>(null);
  const [isLoadingVersion, setIsLoadingVersion] = useState<boolean>(true);

  // 2. حقول النموذج المشتركة
  const [academicYear, setAcademicYear] = useState<string>('2026/2027');
  const [cycleTitle, setCycleTitle] = useState<string>('دورة التقييم الذاتي للعام 2026/2027');
  const [targetTerm, setTargetTerm] = useState<string>('الفصل الدراسي الأول');
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>('2026-11-30');
  const [completionDeadlineDays, setCompletionDeadlineDays] = useState<number>(14);
  const [publicDirectives, setPublicDirectives] = useState<string>(
    'الالتزام الصارم بالوثيقة الوطنية للمعايير المعتمدة ورفع الشواهد الميدانية مع خطة تحسين تشغيلية قابلة للقياس.'
  );
  const [targetGovernorate, setTargetGovernorate] = useState<string>('كافة المحافظات');

  // التحقق من تعارض النطاق الجغرافي المختار مع الدورات النشطة
  const isScopeConflict = useMemo(() => {
    if (mode === 'edit') return false;
    if (targetGovernorate === 'كافة المحافظات') {
      return activeCycles.length > 0;
    }
    return !!generalActiveCycle || occupiedGovernorates.includes(targetGovernorate);
  }, [mode, targetGovernorate, activeCycles.length, generalActiveCycle, occupiedGovernorates]);
  const [selectedStages, setSelectedStages] = useState<string[]>([
    'المرحلة الأساسية (1-9)',
    'المرحلة الثانوية (10-12)',
  ]);
  interface CycleAvailableSchool {
    schoolId?: number;
    school_id?: number;
    schoolName?: string;
    school_name?: string;
    schoolCode?: string;
    identification_data?: string;
    identificationData?: string;
    governorate?: string;
    educationalDistrict?: string;
    educational_district?: string;
    [key: string]: unknown;
  }
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<number[]>([]);
  const [enrollAllSchools, setEnrollAllSchools] = useState<boolean>(true);
  const [availableSchools, setAvailableSchools] = useState<CycleAvailableSchool[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState<boolean>(false);
  const [schoolSearchQuery, setSchoolSearchQuery] = useState<string>('');

  // للدورة المختارة للاستنساخ
  const [selectedCloneCycleId, setSelectedCloneCycleId] = useState<number | null>(
    cycles[0]?.cycleId ?? null
  );

  // للدورة المختارة للتعديل
  const [currentEditCycleId, setCurrentEditCycleId] = useState<number | null>(
    selectedEditCycleId ?? activeCycle?.cycleId ?? cycles[0]?.cycleId ?? null
  );

  // حالات الإرسال والتحقق
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // تحميل الإصدار المعياري
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoadingVersion(true);
      try {
        const v = await supervisionApi.getActiveStandardVersion();
        if (isMounted) setActiveVersion(v);
      } catch {
        // Fallback
      } finally {
        if (isMounted) setIsLoadingVersion(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // تحميل قائمة المدارس الفعّالة للنطاق الجغرافي المحدد
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoadingSchools(true);
      try {
        const schools = await supervisionApi.getActiveSchools(
          targetGovernorate === 'كافة المحافظات' ? null : targetGovernorate
        );
        if (isMounted) {
          setAvailableSchools(schools as CycleAvailableSchool[]);
        }
      } catch {
        if (isMounted) setAvailableSchools([]);
      } finally {
        if (isMounted) setIsLoadingSchools(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [targetGovernorate]);

  // المدارس المفلترة في القائمة التفاعلية بحسب كلمة البحث
  const filteredAvailableSchools = useMemo(() => {
    const q = schoolSearchQuery.trim().toLowerCase();
    if (!q) return availableSchools;
    return availableSchools.filter((s) => {
      const name = String(s.schoolName || s.school_name || '').toLowerCase();
      const code = String(s.schoolCode || s.identification_data || s.identificationData || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [availableSchools, schoolSearchQuery]);

  // في وضع الاستنساخ: تفعيل خيار التحديد اليدوي تلقائياً واسترجاع مدارس الدورة المستنسخة
  useEffect(() => {
    if (mode === 'clone') {
      void Promise.resolve().then(() => {
        setEnrollAllSchools(false);
        if (selectedCloneCycleId) {
          const sourceCycle = cycles.find((c) => c.cycleId === selectedCloneCycleId);
          if (sourceCycle?.participatingSchools && sourceCycle.participatingSchools.length > 0) {
            setSelectedSchoolIds(sourceCycle.participatingSchools.map((s) => s.schoolId));
          }
        }
      });
    }
  }, [mode, selectedCloneCycleId, cycles]);

  // الاستجابة لتغيير الدورة المراد تعديلها
  useEffect(() => {
    if (mode === 'edit') {
      const target = cycles.find((c) => c.cycleId === currentEditCycleId) || activeCycle;
      if (target) {
        void Promise.resolve().then(() => {
          setCycleTitle(target.name);
          setAcademicYear(target.academicYear);
          if (target.startDate) setStartDate(target.startDate.split('T')[0]);
          if (target.endDate) setEndDate(target.endDate.split('T')[0]);
          setTargetGovernorate(target.scopeGovernorate || 'كافة المحافظات');
          if (target.maxCompletionDays) setCompletionDeadlineDays(target.maxCompletionDays);
        });
      }
    }
  }, [mode, currentEditCycleId, cycles, activeCycle]);

  // الاستجابة لبيانات التهيئة المسبقة (Prefill) أو الاستنساخ
  useEffect(() => {
    if (prefillData) {
      void Promise.resolve().then(() => {
        if (prefillData.academicYear) setAcademicYear(prefillData.academicYear);
        if (prefillData.name) setCycleTitle(prefillData.name);
        if (prefillData.startDate) setStartDate(prefillData.startDate);
        if (prefillData.endDate) setEndDate(prefillData.endDate);
        if (prefillData.schoolIds) {
          setSelectedSchoolIds(prefillData.schoolIds);
          setEnrollAllSchools(prefillData.enrollAllSchools ?? false);
        }
      });
    }
  }, [prefillData]);

  // التوجيه التلقائي للمحافظات المتاحة عند وجود دورات نشطة لمحافظات أخرى
  useEffect(() => {
    if (mode === 'new') {
      if (activeCycles.length > 0 && targetGovernorate === 'كافة المحافظات') {
        const firstAvailable = ALL_GOVERNORATES.find((g) => !occupiedGovernorates.includes(g));
        if (firstAvailable) {
          void Promise.resolve().then(() => {
            setTargetGovernorate(firstAvailable);
            setCycleTitle(`دورة التقييم الذاتي للعام ${academicYear} - ${firstAvailable}`);
          });
        }
      }
    }
  }, [mode, activeCycles.length, occupiedGovernorates, ALL_GOVERNORATES, academicYear, targetGovernorate]);

  // استنساخ دورة عند اختيارها
  const handleSelectCycleToClone = (cycleIdNum: number) => {
    setSelectedCloneCycleId(cycleIdNum);
    const sourceCycle = cycles.find((c) => c.cycleId === cycleIdNum);
    if (!sourceCycle) return;

    // اقتراح العام الدراسي التالي
    const parts = sourceCycle.academicYear.split('/');
    let nextYear = '2027/2028';
    if (parts.length === 2) {
      const y1 = parseInt(parts[0], 10);
      const y2 = parseInt(parts[1], 10);
      if (!isNaN(y1) && !isNaN(y2)) {
        nextYear = `${y1 + 1}/${y2 + 1}`;
      }
    }

    setAcademicYear(nextYear);
    setCycleTitle(`دورة التقييم الذاتي للعام ${nextYear}`);
    setTargetGovernorate(sourceCycle.scopeGovernorate || 'كافة المحافظات');

    // استنساخ المدارس: تفعيل وضع التحديد اليدوي تلقائياً وتحديد مدارس الدورة المستنسخة
    const schools = sourceCycle.participatingSchools || [];
    setEnrollAllSchools(false);
    setSelectedSchoolIds(schools.map((s) => s.schoolId));
  };

  const toggleStage = (stage: string) => {
    setSelectedStages((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]
    );
  };

  // التحقق من صحة النموذج
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!cycleTitle.trim()) {
      errs.cycleTitle = 'مسمى الدورة إلزامي.';
    }

    if (!academicYear.trim()) {
      errs.academicYear = 'العام الدراسي إلزامي.';
    }

    if (!startDate) {
      errs.startDate = 'تاريخ بداية الدورة إلزامي.';
    }

    if (!endDate) {
      errs.endDate = 'تاريخ نهاية الدورة إلزامي.';
    }

    if (startDate && endDate) {
      const s = new Date(startDate).getTime();
      const e = new Date(endDate).getTime();
      if (e <= s) {
        errs.endDate = 'تاريخ نهاية الدورة يجب أن يكون لاحقاً لتاريخ البداية.';
      } else {
        const days = (e - s) / (1000 * 60 * 60 * 24);
        if (days < 30) {
          errs.endDate = 'يجب ألا تقل مدة الدورة التقييمية عن 30 يوماً نظامياً وفق قواعد الحوكمة (FR-SUP-01).';
        }
      }

      if (mode === 'edit' && e < new Date().setHours(0, 0, 0, 0)) {
        errs.endDate = 'تاريخ نهاية الدورة لا يمكن أن يسبق تاريخ اليوم.';
      }
    }

    if (completionDeadlineDays < 1 || completionDeadlineDays > 60) {
      errs.completionDeadlineDays = 'الحد الأقصى لمهلة الاستكمال يجب أن يكون بين 1 و 60 يوماً.';
    }

    if (mode !== 'edit' && !enrollAllSchools && selectedSchoolIds.length === 0) {
      errs.selectedSchools = 'يرجى تحديد مدرسة واحدة على الأقل عند اختيار التحديد اليدوي للمدارس.';
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // معالجة الحفظ / الإطلاق
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!isCentralSupervisor) {
      setSubmitError('غير مصرح: إدارة وإطلاق وتعديل دورات التقييم محصورة بالمشرف الوزاري المركزي العام حصرًا.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      if (mode === 'edit') {
        const targetId = currentEditCycleId || activeCycle?.cycleId;
        if (!targetId) throw new Error('يرجى تحديد دورة لتعديلها.');

        await supervisionApi.updateCycle(targetId, {
          name: cycleTitle,
          startDate,
          endDate,
          scopeGovernorate: targetGovernorate === 'كافة المحافظات' ? null : targetGovernorate,
          maxCompletionDays: completionDeadlineDays,
        });

        setSubmitSuccess('تم تحديث بيانات الدورة التقييمية بنجاح وتسجيل العملية في سجل التدقيق.');
        setTimeout(() => {
          onSuccess();
          onSwitchToListTab();
        }, 1200);
      } else {
        // إطلاق جديد أو استنساخ: التحقق الذكي من عدم التداخل الجغرافي (Scope-Aware Conflict Check)
        const isGeneral = targetGovernorate === 'كافة المحافظات';

        if (isGeneral && activeCycles.length > 0) {
          throw new Error(
            'لا يمكن إطلاق دورة عامة لكافة المحافظات في ظل وجود دورات نشطة قائمة. يجب إغلاق كافة الدورات النشطة أولاً أو تحديد نطاق محافظة معينة.'
          );
        }

        if (!isGeneral) {
          if (generalActiveCycle) {
            throw new Error(
              `توجد دورة عامة نشطة حالياً («${generalActiveCycle.name}») تغطي كافة المحافظات. يجب إغلاقها أولاً قبل إطلاق دورة جديدة.`
            );
          }
          const existingSameGov = activeCycles.find((c) => c.scopeGovernorate === targetGovernorate);
          if (existingSameGov) {
            throw new Error(
              `توجد بالفعل دورة نشطة جارية لنطاق «${targetGovernorate}» («${existingSameGov.name}»). يجب إغلاقها أولاً قبل إطلاق دورة جديدة لنفس المحافظة.`
            );
          }
        }

        const payload: CycleLaunchPayload = {
          academicYear,
          name: cycleTitle,
          targetTerm,
          startDate,
          endDate,
          completionDeadlineDays,
          publicDirectives,
          targetGovernorate: targetGovernorate === 'كافة المحافظات' ? undefined : targetGovernorate,
          educationalStages: selectedStages,
          enrollAllSchools,
          schoolIds: !enrollAllSchools ? selectedSchoolIds : undefined,
        };

        await supervisionApi.launchCycle(payload);
        setSubmitSuccess('تم إطلاق دورة التقييم الجديدة بنجاح وربطها بنطاق المدارس المستهدفة.');
        setTimeout(() => {
          onSuccess();
          onSwitchToListTab();
        }, 1400);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : undefined;
      setSubmitError(msg || 'حدث خطأ أثناء معالجة الطلب. يرجى التحقق من المدخلات.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // حساب عدد المدارس المستهدفة الفعلي
  const estimatedSchoolsCount = enrollAllSchools
    ? availableSchools.length
    : selectedSchoolIds.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. القائمة العلوية لاختيار وضع النموذج */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '16px 20px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB',
            }}
          >
            {mode === 'edit' ? <Edit3 size={20} /> : mode === 'clone' ? <Copy size={20} /> : <PlusCircle size={20} />}
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {mode === 'edit'
                ? 'تعديل بيانات الدورة التقييمية النشطة'
                : mode === 'clone'
                ? 'تهيئة واستنساخ دورة تقييم من دورة سابقة'
                : 'إطلاق دورة تقييم ذاتي جديدة'}
            </h2>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
              {mode === 'edit'
                ? 'تمديد النطاق الزمني للدورة وتحديث المسمى مع قفل الإصدار المعياري (BR-GEN-05)'
                : mode === 'clone'
                ? 'استنساخ المدارس المشاركة والإعدادات فقط بدون أي نتائج أو تقييمات سابقة'
                : 'جدولة دورة مركزية جديدة وربطها بنطاق المدارس المعتمدة'}
            </p>
          </div>
        </div>

        {/* أزرار التبديل السريع لوضع النموذج */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => onModeChange('new')}
            disabled={!canLaunchNewCycle}
            title={
              !canLaunchNewCycle
                ? generalActiveCycle
                  ? `معطل: توجد دورة عامة نشطة («${generalActiveCycle.name}») تغطي كافة المحافظات`
                  : 'معطل: كافة محافظات الجمهورية مشغولة بدورات نشطة حالياً'
                : 'إطلاق دورة تقييم ذاتي جديدة'
            }
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: canLaunchNewCycle ? 'pointer' : 'not-allowed',
              border: mode === 'new' ? '1px solid #2563EB' : '1px solid #E2E8F0',
              backgroundColor: mode === 'new' ? '#EFF6FF' : '#FFFFFF',
              color: mode === 'new' ? '#1D4ED8' : '#64748B',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              opacity: canLaunchNewCycle ? 1 : 0.5,
            }}
          >
            <PlusCircle size={14} />
            <span>إطلاق جديد</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('clone')}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              border: mode === 'clone' ? '1px solid #2563EB' : '1px solid #E2E8F0',
              backgroundColor: mode === 'clone' ? '#EFF6FF' : '#FFFFFF',
              color: mode === 'clone' ? '#1D4ED8' : '#64748B',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Copy size={14} />
            <span>استنساخ دورة سابقة</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('edit')}
            disabled={!activeCycle && cycles.length === 0}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: !activeCycle && cycles.length === 0 ? 'not-allowed' : 'pointer',
              border: mode === 'edit' ? '1px solid #2563EB' : '1px solid #E2E8F0',
              backgroundColor: mode === 'edit' ? '#EFF6FF' : '#FFFFFF',
              color: mode === 'edit' ? '#1D4ED8' : '#64748B',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              opacity: !activeCycle && cycles.length === 0 ? 0.5 : 1,
            }}
          >
            <Edit3 size={14} />
            <span>تعديل الدورة الحالية</span>
          </button>
        </div>
      </div>

      {/* تنبيه المشرف الجغرافي (غير مصرح) */}
      {!isCentralSupervisor && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            color: '#991B1B',
            fontSize: '13px',
          }}
        >
          <ShieldAlert size={20} color="#DC2626" style={{ flexShrink: 0 }} />
          <div>
            <strong>تنبيه الصلاحية الحوكمية:</strong> إطلاق وتعديل وإغلاق دورات التقييم هي صلاحيات على
            المستوى الكلي للنظام ومحصورة حصراً بالمشرف الوزاري المركزي العام. بصفتك مشرفاً جغرافياً،
            يمكنك استعراض الدورات وإلحاق مدارس محافظتك بالدورة النشطة من التبويب الأول.
          </div>
        </div>
      )}

      {/* تنبيه حالة الدورات النشطة في وضعي الإطلاق والاستنساخ */}
      {mode !== 'edit' && (
        <>
          {generalActiveCycle && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 18px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '10px',
                color: '#991B1B',
                fontSize: '13px',
              }}
            >
              <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0 }} />
              <div>
                <strong>توجد دورة تقييم وطنية عامة نشطة حالياً:</strong> ({generalActiveCycle.name} - العام الدراسي{' '}
                {generalActiveCycle.academicYear}). وفق ضوابط الحوكمة (FR-SUP-01)، تغطي هذه الدورة كافة المحافظات ولا يمكن
                إطلاق أي دورة إضافية حتى يتم إغلاقها أولاً أو تعديل بياناتها.
              </div>
            </div>
          )}

          {!generalActiveCycle && activeCycles.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 18px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '10px',
                color: '#1E40AF',
                fontSize: '13px',
              }}
            >
              <CheckCircle2 size={20} color="#2563EB" style={{ flexShrink: 0 }} />
              <div>
                <strong>تعدد الدورات النشطة جغرافياً:</strong> توجد حالياً ({activeCycles.length}) دورات نشطة لمحافظات محددة (
                {occupiedGovernorates.join('، ')}). يسمح النظام بإطلاق دورات تقييم متزامنة للمحافظات المتبقية غير المشمولة،
                مع منع التداخل الجغرافي داخل نفس المحافظة (FR-SUP-01).
              </div>
            </div>
          )}
        </>
      )}

      {/* قائمة اختيار الدورة السابقة في وضع الاستنساخ */}
      {mode === 'clone' && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#F8FAFC',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#2563EB" />
            <label style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>
              اختر الدورة المراد الاستنساخ منها:
            </label>
          </div>
          <select
            value={selectedCloneCycleId ?? ''}
            onChange={(e) => handleSelectCycleToClone(Number(e.target.value))}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              color: '#0F172A',
              backgroundColor: '#FFFFFF',
              minWidth: '280px',
            }}
          >
            {cycles.map((c) => (
              <option key={c.cycleId} value={c.cycleId}>
                {c.name} ({c.academicYear}) — {c.participationsCount ?? 0} مدرسة
              </option>
            ))}
          </select>
          <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
            ✓ سيتم استنساخ المدارس المشاركة فقط، ولن يتم ترحيل أي نتائج أو تقييمات سابقة (BR-GEN-05)
          </span>
        </div>
      )}

      {/* قائمة اختيار الدورة في وضع التعديل */}
      {mode === 'edit' && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#F8FAFC',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>
              الدورة المستهدفة بالتعديل:
            </label>
            <select
              value={currentEditCycleId ?? ''}
              onChange={(e) => setCurrentEditCycleId(Number(e.target.value))}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0F172A',
                backgroundColor: '#FFFFFF',
                minWidth: '280px',
              }}
            >
              {cycles.map((c) => (
                <option key={c.cycleId} value={c.cycleId}>
                  {c.name} ({c.academicYear}) — {c.status === 'Active' ? 'نشطة جارية' : 'مؤرشفة'}
                </option>
              ))}
            </select>
          </div>

          {/* زر إغلاق الدورة النشطة مباشرة من وضع التعديل */}
          {activeCycle && isCentralSupervisor && onRequestCloseCycle && (
            <button
              type="button"
              onClick={() => onRequestCloseCycle(activeCycle)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#DC2626',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                cursor: 'pointer',
              }}
            >
              إغلاق وأرشفة الدورة النشطة
            </button>
          )}
        </div>
      )}

      {/* 2. شارة ربط وثيقة المعايير الوطنية النشطة */}
      <ActiveVersionBadge version={activeVersion} isLoading={isLoadingVersion} />

      {/* رسائل النجاح أو الفشل */}
      {submitSuccess && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '10px',
            color: '#065F46',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={20} color="#059669" />
          <span>{submitSuccess}</span>
        </div>
      )}

      {submitError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            color: '#991B1B',
            fontSize: '13px',
          }}
        >
          <ShieldAlert size={20} color="#DC2626" />
          <span>{submitError}</span>
        </div>
      )}

      {/* 3. نموذج إدخال البيانات المنظم في عمودين */}
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* العمود الأيمن: التواريخ والمسميات */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <h3
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: '#0F172A',
                marginBottom: '16px',
                paddingBottom: '10px',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              المحددات الزمنية والبيانات الرسمية
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* مسمى الدورة */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  مسمى دورة التقييم <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={cycleTitle}
                  onChange={(e) => setCycleTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: validationErrors.cycleTitle ? '1px solid #EF4444' : '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                    boxSizing: 'border-box',
                  }}
                />
                {validationErrors.cycleTitle && (
                  <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', display: 'block' }}>
                    {validationErrors.cycleTitle}
                  </span>
                )}
              </div>

              {/* العام الدراسي والفصل */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    العام الدراسي <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={academicYear}
                    disabled={mode === 'edit'}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="2026/2027"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: validationErrors.academicYear ? '1px solid #EF4444' : '1px solid #CBD5E1',
                      fontSize: '13px',
                      color: mode === 'edit' ? '#64748B' : '#0F172A',
                      backgroundColor: mode === 'edit' ? '#F8FAFC' : '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    الفصل المستهدف
                  </label>
                  <select
                    value={targetTerm}
                    disabled={mode === 'edit'}
                    onChange={(e) => setTargetTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      color: mode === 'edit' ? '#64748B' : '#0F172A',
                      backgroundColor: mode === 'edit' ? '#F8FAFC' : '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="الفصل الدراسي الأول">الفصل الدراسي الأول</option>
                    <option value="الفصل الدراسي الثاني">الفصل الدراسي الثاني</option>
                    <option value="الدورة السنوية الشاملة">الدورة السنوية الشاملة</option>
                  </select>
                </div>
              </div>

              {/* تاريخ البداية وتاريخ النهاية */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    تاريخ بداية الدورة <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    disabled={mode === 'edit'}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: validationErrors.startDate ? '1px solid #EF4444' : '1px solid #CBD5E1',
                      fontSize: '13px',
                      color: mode === 'edit' ? '#64748B' : '#0F172A',
                      backgroundColor: mode === 'edit' ? '#F8FAFC' : '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    تاريخ نهاية الدورة <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: validationErrors.endDate ? '1px solid #EF4444' : '1px solid #CBD5E1',
                      fontSize: '13px',
                      color: '#0F172A',
                      boxSizing: 'border-box',
                    }}
                  />
                  {validationErrors.endDate && (
                    <span style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', display: 'block' }}>
                      {validationErrors.endDate}
                    </span>
                  )}
                </div>
              </div>

              {/* الحد الأقصى لمهلة طلبات الاستكمال */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  الحد الأقصى لمهلة الاستكمال (بالأيام)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={completionDeadlineDays}
                    onChange={(e) => setCompletionDeadlineDays(Number(e.target.value))}
                    style={{
                      width: '90px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 700,
                      textAlign: 'center',
                      color: '#0F172A',
                    }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    يوماً
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                  الحد الأقصى لعدد الأيام المسموح للمشرف بمنحه للمدرسة لاستيفاء النواقص عند إصدار طلب استكمال لها خلال هذه الدورة (القيمة الافتراضية 14 يوماً وفق الحوكمة، المدى من 1 إلى 60 يوماً).
                </p>
                {validationErrors.completionDeadlineDays && (
                  <span style={{ fontSize: '11px', color: '#EF4444', display: 'block', marginTop: '4px' }}>
                    {validationErrors.completionDeadlineDays}
                  </span>
                )}
              </div>

              {/* التوجيهات العامة */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  التوجيهات والتعليمات العامة للمدارس
                </label>
                <textarea
                  rows={3}
                  value={publicDirectives}
                  onChange={(e) => setPublicDirectives(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                    lineHeight: 1.6,
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* العمود الأيسر: النطاق والمراحل */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: '#0F172A',
                  marginBottom: '16px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid #F1F5F9',
                }}
              >
                النطاق الجغرافي والمراحل التعليمية
              </h3>

              {/* المحافظة */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  النطاق الجغرافي المستهدف للدورة
                </label>
                <select
                  value={targetGovernorate}
                  disabled={mode === 'edit'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTargetGovernorate(val);
                    if (mode === 'new') {
                      if (val === 'كافة المحافظات') {
                        setCycleTitle(`دورة التقييم الذاتي للعام ${academicYear}`);
                      } else {
                        setCycleTitle(`دورة التقييم الذاتي للعام ${academicYear} - ${val}`);
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: mode === 'edit' ? '#64748B' : '#0F172A',
                    backgroundColor: mode === 'edit' ? '#F8FAFC' : '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                >
                  <option
                    value="كافة المحافظات"
                    disabled={mode !== 'edit' && activeCycles.length > 0}
                  >
                    كافة محافظات الجمهورية (دورة وطنية مركزية عامة)
                    {mode !== 'edit' && activeCycles.length > 0 ? ' — [غير متاح: توجد دورات نشطة لمحافظات]' : ''}
                  </option>
                  {ALL_GOVERNORATES.map((gov) => {
                    const isOccupied = occupiedGovernorates.includes(gov);
                    const occupiedCycle = activeCycles.find((c) => c.scopeGovernorate === gov);
                    return (
                      <option
                        key={gov}
                        value={gov}
                        disabled={mode !== 'edit' && (generalActiveCycle ? true : isOccupied)}
                      >
                        {gov} {isOccupied ? `— [مشغولة حالياً: ${occupiedCycle?.name}]` : '— (متاحة للإطلاق)'}
                      </option>
                    );
                  })}
                </select>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                  {generalActiveCycle
                    ? `توجد دورة عامة نشطة («${generalActiveCycle.name}») تشمل كافة المحافظات.`
                    : activeCycles.length > 0
                    ? `توجد دورات نشطة قائمة لـ (${occupiedGovernorates.join('، ')}). يمكنك إطلاق دورة مستقلة لأي محافظة أخرى متاحة.`
                    : 'يمكنك إطلاق دورة وطنية عامة تغطي كافة المحافظات، أو إطلاق دورة مخصصة لمحافظة محددة.'}
                </p>
              </div>

              {/* المراحل الدراسية */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  المراحل التعليمية المشمولة
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {['المرحلة الأساسية (1-9)', 'المرحلة الثانوية (10-12)'].map((stage) => {
                    const isChecked = selectedStages.includes(stage);
                    return (
                      <label
                        key={stage}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: isChecked ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                          backgroundColor: isChecked ? '#EFF6FF' : '#F8FAFC',
                          cursor: mode === 'edit' ? 'default' : 'pointer',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: isChecked ? '#1E40AF' : '#475569',
                        }}
                      >
                        <input
                          type="checkbox"
                          disabled={mode === 'edit'}
                          checked={isChecked}
                          onChange={() => toggleStage(stage)}
                          style={{ width: '16px', height: '16px', accentColor: '#2563EB' }}
                        />
                        <span>{stage}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* اختيار المدارس المستهدفة: الكل أو تحديد يدوي (الواجهة 28) */}
              <CycleSchoolsSelectorCard
                mode={mode}
                targetGovernorate={targetGovernorate}
                enrollAllSchools={enrollAllSchools}
                onEnrollAllChange={setEnrollAllSchools}
                availableSchools={availableSchools}
                filteredAvailableSchools={filteredAvailableSchools}
                selectedSchoolIds={selectedSchoolIds}
                onSelectedSchoolIdsChange={setSelectedSchoolIds}
                schoolSearchQuery={schoolSearchQuery}
                onSchoolSearchChange={setSchoolSearchQuery}
                isLoadingSchools={isLoadingSchools}
                validationError={validationErrors.selectedSchools}
              />

              {/* معاينة حجم النطاق المستهدف */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>
                    إجمالي المدارس المستهدفة بالدورة
                  </span>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                    {estimatedSchoolsCount} مدرسة مشاركة
                  </span>
                </div>
                <Building size={26} color="#2563EB" />
              </div>
            </div>

            {/* بطاقة تأكيد قفل الإصدار المعياري */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <Lock size={18} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.5 }}>
                <strong>حوكمة الإصدار المعياري (BR-GEN-05):</strong> ترتبط الدورة تلقائياً بآخر وثيقة
                معايير مُقرة رسمياً ونشطة في النظام، ويُحظر تغيير الإصدار أو تعديل أوزان المؤشرات الـ 109
                بعد إطلاق الدورة لضمان النزاهة الإحصائية واستقرار التقييمات.
              </div>
            </div>
          </div>
        </div>

        {/* 4. تذييل الإجراءات */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid #E2E8F0',
          }}
        >
          <button
            type="button"
            onClick={onSwitchToListTab}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#475569',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              cursor: 'pointer',
            }}
          >
            إلغاء والعودة للسجل
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !isCentralSupervisor || isScopeConflict}
            title={
              !isCentralSupervisor
                ? 'مخصص للمشرف العام فقط'
                : isScopeConflict
                ? 'النطاق الجغرافي المختار مشغول بدورة نشطة حالياً'
                : undefined
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#FFFFFF',
              backgroundColor:
                isSubmitting || !isCentralSupervisor || isScopeConflict
                  ? '#94A3B8'
                  : mode === 'edit'
                  ? '#0D9488'
                  : '#2563EB',
              border: 'none',
              cursor:
                isSubmitting || !isCentralSupervisor || isScopeConflict
                  ? 'not-allowed'
                  : 'pointer',
              boxShadow:
                isSubmitting || !isCentralSupervisor || isScopeConflict
                  ? 'none'
                  : '0 2px 8px rgba(37, 99, 235, 0.25)',
            }}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            <span>
              {mode === 'edit'
                ? 'حفظ التعديلات على الدورة النشطة'
                : mode === 'clone'
                ? 'تأكيد استنساخ وإطلاق الدورة'
                : 'تأكيد إطلاق دورة التقييم الجديدة'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
