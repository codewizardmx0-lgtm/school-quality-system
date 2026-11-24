/**
 * useCycleLaunch.ts
 * خطاف معالج إطلاق دورة تقييم جديدة وربطها بالنسخة المعيارية المقفلة
 */

import { useState, useEffect, useCallback } from 'react';
import { supervisionApi } from '../api/supervisionApi';
import type { ActiveStandardVersion, CycleLaunchPayload } from '../api/supervisionTypes';

export function useCycleLaunch(onSuccess?: () => void, prefillData?: any) {
  const [activeVersion, setActiveVersion] = useState<ActiveStandardVersion | null>(null);
  const [isLoadingVersion, setIsLoadingVersion] = useState<boolean>(true);
  const [versionError, setVersionError] = useState<string | null>(null);

  // حالة نموذج الإطلاق مع التهيئة المسبقة الآمنة (Smart Clone Prefill)
  const [academicYear, setAcademicYear] = useState<string>(prefillData?.academicYear || '2026/2027');
  const [cycleTitle, setCycleTitle] = useState<string>(
    prefillData?.name || prefillData?.cycleTitle || `دورة التقييم الذاتي المدرسي ${prefillData?.academicYear || '2026/2027'}`
  );
  const [targetTerm, setTargetTerm] = useState<string>(prefillData?.targetTerm || 'الفصل الدراسي الأول');
  const [startDate, setStartDate] = useState<string>(prefillData?.startDate || '2026-09-01');
  const [endDate, setEndDate] = useState<string>(prefillData?.endDate || '2026-11-30');
  const [completionDeadlineDays, setCompletionDeadlineDays] = useState<number>(
    prefillData?.completionDeadlineDays || 14
  );
  const [publicDirectives, setPublicDirectives] = useState<string>(
    prefillData?.publicDirectives ||
      'الالتزام الصارم بوثيقة المعايير الوطنية v2.1 ورفع الشواهد الميدانية المعتمدة مع خطة تحسين تشغيلية قابلة للقياس.'
  );

  // النطاق المستهدف
  const [targetGovernorate, setTargetGovernorate] = useState<string>(
    prefillData?.targetGovernorate || 'كافة المحافظات'
  );
  const [selectedStages, setSelectedStages] = useState<string[]>(
    prefillData?.selectedStages || ['المرحلة الأساسية (1-9)', 'المرحلة الثانوية (10-12)']
  );
  const [schoolIds, setSchoolIds] = useState<number[]>(prefillData?.schoolIds || []);
  const [enrollAllSchools, setEnrollAllSchools] = useState<boolean>(
    prefillData?.enrollAllSchools ?? (!prefillData?.schoolIds || prefillData.schoolIds.length === 0)
  );

  // حالة الإرسال والتحقق
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // جلب الإصدار المعياري النشط
  const fetchActiveVersion = useCallback(async () => {
    setIsLoadingVersion(true);
    setVersionError(null);
    try {
      const version = await supervisionApi.getActiveStandardVersion();
      setActiveVersion(version);
    } catch (err: any) {
      setVersionError(err?.message || 'تعذر استرجاع وثيقة المعايير المقفلة.');
    } finally {
      setIsLoadingVersion(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveVersion();
  }, [fetchActiveVersion]);

  // التحقق من صحة التواريخ والقواعد النظامية
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!academicYear.trim()) {
      errors.academicYear = 'العام الدراسي إلزامي.';
    }
    if (!cycleTitle.trim()) {
      errors.cycleTitle = 'عنوان الدورة إلزامي.';
    }
    if (!startDate) {
      errors.startDate = 'تاريخ بداية الدورة إلزامي.';
    }
    if (!endDate) {
      errors.endDate = 'تاريخ قفل المخرجات إلزامي.';
    }
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      errors.endDate = 'يجب أن يكون تاريخ قفل المخرجات لاحقاً لتاريخ بداية الدورة.';
    }
    if (completionDeadlineDays < 1 || completionDeadlineDays > 60) {
      errors.completionDeadlineDays = 'مهلة الاستكمال يجب أن تكون بين 1 و 60 يوماً.';
    }
    if (selectedStages.length === 0) {
      errors.selectedStages = 'يرجى اختيار مرحلة دراسية واحدة على الأقل.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLaunch = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
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
        schoolIds: !enrollAllSchools ? schoolIds : undefined,
      };

      await supervisionApi.launchCycle(payload);
      setSubmitSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'تعذر إطلاق الدورة. يرجى التحقق من المدخلات والمحاولة مجدداً.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStage = (stage: string) => {
    setSelectedStages((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]
    );
  };

  return {
    activeVersion,
    isLoadingVersion,
    versionError,
    // Form fields
    academicYear,
    setAcademicYear,
    cycleTitle,
    setCycleTitle,
    targetTerm,
    setTargetTerm,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    completionDeadlineDays,
    setCompletionDeadlineDays,
    publicDirectives,
    setPublicDirectives,
    targetGovernorate,
    setTargetGovernorate,
    selectedStages,
    toggleStage,
    schoolIds,
    setSchoolIds,
    enrollAllSchools,
    setEnrollAllSchools,
    // Validation & state
    validationErrors,
    isSubmitting,
    submitError,
    submitSuccess,
    handleLaunch,
    refetchVersion: fetchActiveVersion,
  };
}
