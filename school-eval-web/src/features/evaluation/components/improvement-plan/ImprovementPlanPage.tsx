import React, { useState, useEffect } from 'react';
import { evaluatorApi } from '../../api/evaluatorApi';
import { useImprovementPlan } from '../../hooks/useImprovementPlan';
import { AddActionModal } from './AddActionModal';
import { AddPlanModal } from './AddPlanModal';
import { ActionProgressModal } from './ActionProgressModal';
import { PlanExplanationsCard } from './PlanExplanationsCard';
import { MasterPlansSection } from './MasterPlansSection';
import { PlanSummaryCards } from './PlanSummaryCards';
import { PlanActionFilterBar } from './PlanActionFilterBar';
import { PlanActionsTable } from './PlanActionsTable';
import { PlanReviewNotesSection } from './PlanReviewNotesSection';
import { useToast } from '../../../admin/components/common/useToast';
import { ToastNotification } from '../../../admin/components/common/ToastNotification';
import { extractApiErrorMessage } from '../../../../api/apiTypes';
import type {
  ImprovementPlanAction,
  EvaluatorScreen,
  PlanType,
  CompletionRequestData,
  PriorityLevel,
} from '../../api/evaluationTypes';
import {
  Target,
  Plus,
  CheckCircle2,
  FileSpreadsheet,
  FolderPlus,
  RefreshCw,
  GitBranch,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Lock,
  AlertTriangle,
} from 'lucide-react';

interface ImprovementPlanPageProps {
  onNavigate?: (screen: EvaluatorScreen, param?: number) => void;
  readOnly?: boolean;
  isPrincipal?: boolean;
}

export const ImprovementPlanPage: React.FC<ImprovementPlanPageProps> = ({
  onNavigate,
  readOnly = false,
  isPrincipal = false,
}) => {
  const {
    selectedPlanType,
    selectPlan,
    switchPlan,
    plansList,
    refreshPlansList,
    cloneVersion,
    planData,
    summary,
    isLoading,
    isSubmitting,
    editingAction,
    setEditingAction,
    addAction,
    updateAction,
    createPlan,
    addReviewNote,
    refreshPlan,
  } = useImprovementPlan();

  const { toasts, addToast, dismissToast } = useToast();

  const planTypeTabs: { id: PlanType; label: string; desc: string }[] = [
    { id: 'QualityImprovement', label: 'خطة تحسين الجودة المدرسية', desc: 'معالجة الفجوات المعيارية الشاملة' },
    { id: 'StaffProfessionalDevelopment', label: 'خطة التطوير المهني للكوادر', desc: 'تأهيل وتدريب المعلمين والإدارة' },
    { id: 'AnnualOperational', label: 'الخطة التشغيلية السنوية', desc: 'البرامج والأنشطة الميدانية المجدولة' },
  ];

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterAreaId, setFilterAreaId] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterGap, setFilterGap] = useState<string>('ALL');
  const [filterTimeRemaining, setFilterTimeRemaining] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('default');
  const [searchActionTerm, setSearchActionTerm] = useState<string>('');
  const [isMasterTableExpanded, setIsMasterTableExpanded] = useState<boolean>(false);
  const [newReviewNoteText, setNewReviewNoteText] = useState('');
  const [isSubmittingReviewNote, setIsSubmittingReviewNote] = useState(false);
  const [isExportingWorkbook, setIsExportingWorkbook] = useState(false);
  const [isCloningVersion, setIsCloningVersion] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);
  const [completionRequest, setCompletionRequest] = useState<CompletionRequestData | null>(null);
  const [preselectedAreaId, setPreselectedAreaId] = useState<number | null>(null);

  // مجالات التحسين المتبناة بالخطة الحالية التي لا تزال بحالة pending_action أو ليس لها أي إجراءات تنفيذية بعد
  const areasWithoutActions = React.useMemo(() => {
    if (!planData?.areas || planData.areas.length === 0) return [];
    const scheduledAreaIds = new Set((planData.actions || []).map((a) => a.areaId));
    return planData.areas.filter((area) => area.status === 'pending_action' || !scheduledAreaIds.has(area.areaId));
  }, [planData]);

  // قائمة خطط النوع المحدد بالتبويب فقط للسجل الماستر
  const tabPlansList = React.useMemo(() => {
    return plansList.filter((p) => p.planType === selectedPlanType);
  }, [plansList, selectedPlanType]);

  // التحقق من حالة الخطة وقفل التعديل
  const isPlanReadOnly = readOnly || isPrincipal || planData?.status === 'Archived' || planData?.status === 'Submitted';
  const isCurrentVersionActive = planData?.status === 'Active' || planData?.status === 'Draft';
  const newerVersion = React.useMemo(() => {
    return tabPlansList.find((p) => (p.versionNumber || 1) > (planData?.versionNumber || 1)) || null;
  }, [tabPlansList, planData?.versionNumber]);

  // دالة مساعدة لتنسيق التاريخ بالعربية مع اسم اليوم
  const formatArabicDateWithDay = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const dayName = dayNames[d.getDay()];
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${dayName}، ${yyyy}-${mm}-${dd}`;
    } catch {
      return dateStr;
    }
  };

  // دالة حساب المهلة والوقت المتبقي بدقة
  const getRemainingDaysInfo = (dueDateStr?: string | null, status?: string) => {
    if (!dueDateStr) return null;
    if (status === 'Done') {
      return { text: 'مكتمل', isOverdue: false, isToday: false, days: 0 };
    }
    const due = new Date(dueDateStr);
    if (isNaN(due.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { text: `متأخر (${Math.abs(diffDays)} يوم)`, isOverdue: true, isToday: false, days: diffDays };
    } else if (diffDays === 0) {
      return { text: 'يستحق اليوم', isOverdue: false, isToday: true, days: 0 };
    } else {
      return { text: `متبقي ${diffDays} يوم`, isOverdue: false, isToday: false, days: diffDays };
    }
  };

  // التنقل المباشر وتحديد الخطة تلقائياً إذا تم التوجيه من شاشة المقترحات
  useEffect(() => {
    const savedPlanId = sessionStorage.getItem('selectedImprovementPlanId');
    if (savedPlanId) {
      const pId = Number(savedPlanId);
      if (!isNaN(pId)) {
        const matching = plansList.find((p) => p.planId === pId);
        if (matching) {
          switchPlan(matching.planType, pId);
          sessionStorage.removeItem('selectedImprovementPlanId');
        } else {
          selectPlan(pId);
        }
      }
    }
  }, [selectPlan, switchPlan, plansList]);

  // فحص طلبات الاستكمال المفتوحة من المشرف
  useEffect(() => {
    evaluatorApi
      .getCurrentCompletionRequest()
      .then((data) => {
        setCompletionRequest(data);
      })
      .catch((err) => {
        console.error('Failed to check completion request:', err);
      });
  }, []);

  const actions = React.useMemo(() => planData?.actions || [], [planData?.actions]);

  // قائمة المجالات المتاحة للفلترة
  const availableAreasForFilter = React.useMemo(() => {
    if (planData?.availableAreas && planData.availableAreas.length > 0) {
      return planData.availableAreas;
    }
    const map = new Map<number, { areaId: number; name: string; indicatorCode?: string; standardCode?: string; standardName?: string; priority: PriorityLevel }>();
    actions.forEach((a) => {
      if (a.areaId) {
        map.set(a.areaId, {
          areaId: a.areaId,
          name: a.indicatorName || a.areaName || `مجال #${a.areaId}`,
          indicatorCode: a.indicatorCode,
          standardCode: a.standardCode,
          standardName: a.standardName,
          priority: a.priority || 'High',
        });
      }
    });
    return Array.from(map.values());
  }, [planData?.availableAreas, actions]);

  // فحص ما إذا كان الإجراء متأخراً عن تاريخ الاستحقاق
  const isActionOverdue = (act: ImprovementPlanAction) => {
    if (act.status === 'Done') return false;
    if (!act.dueDate) return false;
    const due = new Date(act.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const filteredActions = actions.filter((act) => {
    // 1. فلتر الحالة
    if (filterStatus !== 'ALL' && act.status !== filterStatus) return false;

    // 2. فلتر المجال
    if (filterAreaId !== 'ALL' && act.areaId !== Number(filterAreaId)) return false;

    // 3. فلتر الأولوية
    if (filterPriority !== 'ALL' && act.priority !== filterPriority) return false;

    // 4. فلتر الفجوة
    if (filterGap !== 'ALL') {
      const g = act.gap ?? (act.targetScore && act.score !== undefined && act.score !== null ? Math.max(0, act.targetScore - act.score) : 0);
      if (filterGap === 'has_gap' && g <= 0) return false;
      if (filterGap === 'gap_1' && g !== 1) return false;
      if (filterGap === 'gap_2' && g !== 2) return false;
      if (filterGap === 'gap_3' && g < 3) return false;
    }

    // 5. فلتر المهلة والوقت المتبقي
    if (filterTimeRemaining !== 'ALL') {
      const rem = getRemainingDaysInfo(act.dueDate, act.status);
      if (!rem) return false;
      if (filterTimeRemaining === 'overdue' && !rem.isOverdue) return false;
      if (filterTimeRemaining === 'today' && !rem.isToday) return false;
      if (filterTimeRemaining === 'this_week' && (rem.isOverdue || rem.days > 7)) return false;
      if (filterTimeRemaining === 'this_month' && (rem.isOverdue || rem.days > 30)) return false;
      if (filterTimeRemaining === 'more' && (rem.isOverdue || rem.days <= 30)) return false;
    }

    // 6. فلتر البحث النصي
    if (searchActionTerm.trim()) {
      const term = searchActionTerm.trim().toLowerCase();
      const matchTitle = (act.title || '').toLowerCase().includes(term);
      const matchLeader = (act.leader || '').toLowerCase().includes(term);
      const matchStandard = (act.standardName || '').toLowerCase().includes(term);
      const matchProgress = (act.progressDescription || '').toLowerCase().includes(term);
      const matchArea = (act.areaName || '').toLowerCase().includes(term);
      const matchIndicatorCode = (act.indicatorCode || '').toLowerCase().includes(term);
      const matchIndicatorName = (act.indicatorName || '').toLowerCase().includes(term);
      if (!matchTitle && !matchLeader && !matchStandard && !matchProgress && !matchArea && !matchIndicatorCode && !matchIndicatorName) {
        return false;
      }
    }

    return true;
  });

  // فرز الإجراءات حسب الأولوية، الفجوة، المهلة المتبقية، أو تاريخ البدء
  const sortedActions = React.useMemo(() => {
    const list = [...filteredActions];
    if (sortBy === 'default') return list;

    const priorityWeight: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

    list.sort((a, b) => {
      if (sortBy === 'priority_desc') {
        return (priorityWeight[b.priority || 'Low'] || 0) - (priorityWeight[a.priority || 'Low'] || 0);
      }
      if (sortBy === 'priority_asc') {
        return (priorityWeight[a.priority || 'Low'] || 0) - (priorityWeight[b.priority || 'Low'] || 0);
      }
      if (sortBy === 'gap_desc') {
        const gapA = a.gap ?? 0;
        const gapB = b.gap ?? 0;
        return gapB - gapA;
      }
      if (sortBy === 'gap_asc') {
        const gapA = a.gap ?? 0;
        const gapB = b.gap ?? 0;
        return gapA - gapB;
      }
      if (sortBy === 'time_remaining_asc') {
        const daysA = getRemainingDaysInfo(a.dueDate, a.status)?.days ?? 99999;
        const daysB = getRemainingDaysInfo(b.dueDate, b.status)?.days ?? 99999;
        return daysA - daysB;
      }
      if (sortBy === 'time_remaining_desc') {
        const daysA = getRemainingDaysInfo(a.dueDate, a.status)?.days ?? -99999;
        const daysB = getRemainingDaysInfo(b.dueDate, b.status)?.days ?? -99999;
        return daysB - daysA;
      }
      if (sortBy === 'start_date_asc') {
        return (a.startDate || '').localeCompare(b.startDate || '');
      }
      if (sortBy === 'start_date_desc') {
        return (b.startDate || '').localeCompare(a.startDate || '');
      }
      if (sortBy === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '', 'ar');
      }
      if (sortBy === 'title_desc') {
        return (b.title || '').localeCompare(a.title || '', 'ar');
      }
      if (sortBy === 'indicator_asc') {
        return (a.indicatorCode || a.standardName || '').localeCompare(b.indicatorCode || b.standardName || '', 'ar');
      }
      if (sortBy === 'indicator_desc') {
        return (b.indicatorCode || b.standardName || '').localeCompare(a.indicatorCode || a.standardName || '', 'ar');
      }
      if (sortBy === 'owner_asc') {
        return (a.leader || '').localeCompare(b.leader || '', 'ar');
      }
      if (sortBy === 'owner_desc') {
        return (b.leader || '').localeCompare(a.leader || '', 'ar');
      }
      if (sortBy === 'progress_asc') {
        return (a.completionPercentage ?? 0) - (b.completionPercentage ?? 0);
      }
      if (sortBy === 'progress_desc') {
        return (b.completionPercentage ?? 0) - (a.completionPercentage ?? 0);
      }
      if (sortBy === 'status_asc') {
        return (a.status || '').localeCompare(b.status || '');
      }
      if (sortBy === 'status_desc') {
        return (b.status || '').localeCompare(a.status || '');
      }
      return 0;
    });
    return list;
  }, [filteredActions, sortBy]);

  const handleActionHeaderSort = (columnKey: string) => {
    if (sortBy === `${columnKey}_asc`) {
      setSortBy(`${columnKey}_desc`);
    } else if (sortBy === `${columnKey}_desc`) {
      setSortBy('default');
    } else {
      setSortBy(`${columnKey}_asc`);
    }
  };

  const renderActionSortIcon = (columnKey: string) => {
    if (sortBy === `${columnKey}_asc`) {
      return <ArrowUp size={12} color="#059669" />;
    }
    if (sortBy === `${columnKey}_desc`) {
      return <ArrowDown size={12} color="#059669" />;
    }
    return <ArrowUpDown size={12} color="#94A3B8" />;
  };

  if (isLoading && !planData) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
        جاري تحميل خطة التحسين المدرسي...
      </div>
    );
  }

  const handleExportUnifiedWorkbook = async () => {
    setIsExportingWorkbook(true);
    try {
      await evaluatorApi.exportImprovementWorkbook();
      addToast('success', 'تم تصدير المصنف الموحد للخطط والمقترحات (3 أوراق) بنجاح.');
    } catch (err: unknown) {
      addToast('error', 'تعذر تصدير المصنف الموحد: ' + extractApiErrorMessage(err, 'خطأ في الخادم'));
    } finally {
      setIsExportingWorkbook(false);
    }
  };

  const handleAddReviewNoteSubmit = async () => {
    if (!newReviewNoteText.trim() || !planData?.planId || isSubmittingReviewNote) return;
    setIsSubmittingReviewNote(true);
    try {
      await addReviewNote(planData.planId, newReviewNoteText.trim());
      setNewReviewNoteText('');
      addToast('success', 'تم تدوين ملاحظة المراجعة الداخلية بنجاح.');
    } catch (err: unknown) {
      addToast('error', extractApiErrorMessage(err, 'تعذر تسجيل ملاحظة المراجعة.'));
    } finally {
      setIsSubmittingReviewNote(false);
    }
  };

  // استنساخ ذكي لإصدار جديد (v1 -> v2) عند طلب الاستكمال
  const handleCloneVersion = async () => {
    if (!planData?.planId) return;
    const nextVer = (planData.versionNumber || 1) + 1;
    const confirmed = window.confirm(
      `هل أنت متأكد من إنشاء النسخة الجديدة (v${nextVer})؟\nسيتم استنساخ كافة المجالات والإجراءات الحالية تلقائياً، وتفعيل الإصدار الجديد للتعديل، مع أرشفة الإصدار الحالي (v${planData.versionNumber || 1}) للقراءة فقط كمرجع تاريخي.`
    );
    if (!confirmed) return;

    setIsCloningVersion(true);
    try {
      await cloneVersion(planData.planId);
      addToast('success', `تم إنشاء الإصدار الجديد (v${nextVer}) بنجاح وأرشفة الإصدار السابق.`);
    } catch (err: unknown) {
      addToast('error', extractApiErrorMessage(err, 'تعذر استنساخ إصدار الخطة.'));
    } finally {
      setIsCloningVersion(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px', direction: 'rtl' }}>
      
      {/* Supervisor Completion Request / Plan Version Status Banner */}
      {completionRequest && (
        isCurrentVersionActive ? (
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '12px',
              backgroundColor: '#F0FDF4',
              border: '1.5px solid #86EFAC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#DCFCE7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669',
                }}
              >
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#166534' }}>
                  طلب استكمال نشط — أنت تعمل الآن على الإصدار الأحدث المستنسخ (v{planData?.versionNumber || 1})
                </h4>
                <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#15803D' }}>
                  الخطة الحالية مفتوحة للتعديل استجابةً لملاحظات المشرف الوزاري ({completionRequest.supervisorName}). يمكنك استكمال وإضافة الإجراءات التنفيذية لمعالجة الفجوات قبل إعادة الاعتماد.
                </p>
              </div>
            </div>
          </div>
        ) : newerVersion ? (
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '12px',
              backgroundColor: '#EFF6FF',
              border: '1.5px solid #93C5FD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563EB',
                }}
              >
                <Lock size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#1E40AF' }}>
                  نسخة سابقة مؤرشفة — تم استنساخ إصدار أحدث بالفعل (v{newerVersion.versionNumber})
                </h4>
                <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#1D4ED8' }}>
                  هذه النسخة (v{planData?.versionNumber || 1}) مقفلة ومؤرشفة للقراءة فقط بعد استنساخ الإصدار الجديد لمعالجة ملاحظات المشرف الوزاري ({completionRequest.supervisorName}).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                switchPlan(newerVersion.planType, newerVersion.planId);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                borderRadius: '8px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
              }}
            >
              <GitBranch size={16} />
              <span>الانتقال إلى النسخة الأحدث (v{newerVersion.versionNumber})</span>
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '12px',
              backgroundColor: '#FFFBEB',
              border: '1.5px solid #F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#FEF3C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#D97706',
                }}
              >
                <ShieldAlert size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#92400E' }}>
                  طلب استكمال رسمي من المشرف الوزاري ({completionRequest.supervisorName})
                </h4>
                <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#B45309' }}>
                  الخطة الحالية مقفلة بعد التسليم السابق. يمكنك الضغط على «إنشاء نسخة جديدة (v{(planData?.versionNumber || 1) + 1})» لاستنساخ الخطة ومتابعة التعديلات المطلوبة.
                </p>
              </div>
            </div>
            {!isPrincipal && (
              <button
                type="button"
                onClick={handleCloneVersion}
                disabled={isCloningVersion}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: isCloningVersion ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)',
                }}
              >
                <GitBranch size={16} />
                <span>{isCloningVersion ? 'جاري الاستنساخ...' : `إنشاء نسخة جديدة (v${(planData?.versionNumber || 1) + 1})`}</span>
              </button>
            )}
          </div>
        )
      )}

      {/* ReadOnly banner for archived/submitted plans without completion request */}
      {!completionRequest && (planData?.status === 'Archived' || planData?.status === 'Submitted') && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '10px',
            backgroundColor: '#F8FAFC',
            border: '1.5px solid #CBD5E1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lock size={18} color="#64748B" />
            <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
              {planData?.status === 'Archived'
                ? '🔒 هذه النسخة من خطة التحسين مؤرشفة كمرجع تاريخي للقراءة فقط.'
                : '📤 هذه الخطة مرفوعة للاعتماد الوزاري ومقفلة عن التعديل.'}
            </span>
          </div>
          {newerVersion && (
            <button
              type="button"
              onClick={() => {
                switchPlan(newerVersion.planType, newerVersion.planId);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <GitBranch size={14} />
              الانتقال للنسخة الأحدث (v{newerVersion.versionNumber})
            </button>
          )}
        </div>
      )}

      {/* 0. Top Plan Type Tabs & Selector */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '2px solid #E2E8F0',
          paddingBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {planTypeTabs.map((tab) => {
            const active = selectedPlanType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchPlan(tab.id, null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: active ? '2px solid #059669' : '1px solid #E2E8F0',
                  backgroundColor: active ? '#ECFDF5' : '#FFFFFF',
                  color: active ? '#065F46' : '#475569',
                  fontWeight: active ? 800 : 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '2px',
                  transition: 'all 0.15s',
                }}
              >
                <span>{tab.label}</span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: active ? '#047857' : '#94A3B8' }}>
                  {tab.desc}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowExplanations(!showExplanations)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '8px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #CBD5E1',
            color: '#334155',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <BookOpen size={14} style={{ color: '#059669' }} />
          <span>دليل مسارات الخطط المعتمدة</span>
          {showExplanations ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Institutional Explanations Card */}
      <PlanExplanationsCard visible={showExplanations} />

      {/* Master Plans Table (Prototype Parity) */}
      <MasterPlansSection
        plansList={plansList}
        tabPlansList={tabPlansList}
        planData={planData}
        summary={summary}
        isMasterTableExpanded={isMasterTableExpanded}
        onToggleExpand={setIsMasterTableExpanded}
        onRefreshPlansList={refreshPlansList}
        onSwitchPlan={switchPlan}
      />

      {/* 1. Header & Actions for Current Plan */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Target size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {planData?.title || 'خطة التحسين والتطوير المدرسي'}
              </h2>
              {planData?.versionNumber && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: '#ECFDF5',
                    color: '#065F46',
                    fontSize: '11px',
                    fontWeight: 800,
                    border: '1px solid #A7F3D0',
                  }}
                >
                  v{planData.versionNumber}
                </span>
              )}
              {planData?.versionTag && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#EFF6FF',
                    color: '#1D4ED8',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {planData.versionTag}
                </span>
              )}
            </div>
            <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span>الفترة: {planData?.startDate || '2026-10-01'} إلى {planData?.endDate || '2027-03-31'}</span>
              <span>•</span>
              <span style={{ color: planData?.status === 'Active' ? '#059669' : '#2563EB', fontWeight: 700 }}>
                الحالة: {planData?.status === 'Active' ? 'نشطة ومعتمدة للمتابعة' : planData?.status === 'Submitted' ? 'مرفوعة للمراجعة الوزارية' : planData?.status === 'Archived' ? 'نسخة سابقة مؤرشفة (للقراءة فقط)' : 'مسودة'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={async () => {
              await refreshPlan();
              await refreshPlansList();
              addToast('success', 'تم تحديث خطة وإجراءات التحسين بنجاح.');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="تحديث بيانات الخطة والإجراءات"
          >
            <RefreshCw size={15} />
            تحديث
          </button>

          <button
            onClick={handleExportUnifiedWorkbook}
            disabled={isExportingWorkbook}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              backgroundColor: '#EEF2FF',
              color: '#4338CA',
              border: '1px solid #C7D2FE',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isExportingWorkbook ? 'not-allowed' : 'pointer',
              opacity: isExportingWorkbook ? 0.7 : 1,
            }}
            title="تصدير مصنف إكسل رسمي موحد يتضمن 3 أوراق (الخطط، مصفوفة الإجراءات، مقترحات الفجوات)"
          >
            <FileSpreadsheet size={15} color="#4338CA" />
            <span>{isExportingWorkbook ? 'جاري التصدير...' : '📗 تصدير إكسل شامل (المصنف الموحد)'}</span>
          </button>

          {!isPlanReadOnly && (
            <>
              <button
                type="button"
                onClick={() => setIsAddPlanModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#EFF6FF',
                  color: '#1D4ED8',
                  border: '1px solid #BFDBFE',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <FolderPlus size={16} />
                إنشاء خطة جديدة
              </button>

              <button
                onClick={() => {
                  setPreselectedAreaId(null);
                  setIsAddModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                }}
              >
                <Plus size={16} />
                إضافة إجراء تنفيذي
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Summary Cards dynamically recalculating */}
      <PlanSummaryCards
        summary={summary}
        filterStatus={filterStatus}
        onSelectFilterStatus={setFilterStatus}
      />

      {/* 2.5 Unscheduled Adopted Areas Alert Banner (شريط تنبيهي: مجالات متبناة بانتظار صياغة إجراءاتها التنفيذية - الخيار ب) */}
      {areasWithoutActions.length > 0 && (
        <div
          data-testid="unscheduled-areas-banner"
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FCD34D',
            borderRadius: '14px',
            padding: '18px 22px',
            marginBottom: '20px',
            boxShadow: '0 2px 6px rgba(217, 119, 6, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                <AlertTriangle size={20} color="#D97706" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#92400E' }}>
                  يوجد ({areasWithoutActions.length}) مجالات تحسين متبناة بانتظار صياغة إجراءاتها التنفيذية
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#B45309', lineHeight: 1.5 }}>
                  تم اعتماد هذه المجالات من نتائج ومقترحات التقييم الذاتي ولكن لم تُحدد لها بعد مهام أو مسؤولين لتنفيذها ميدانياً. يمكنك صياغة إجراء تنفيذي مباشر لكل مجال لتفعيله ضمن مصفوفة العمل أدناه.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            {areasWithoutActions.map((area) => (
              <div
                key={area.areaId}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #FDE68A',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 340px' }}>
                  {area.indicatorCode && (
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#F1F5F9',
                        color: '#334155',
                        fontSize: '11px',
                        fontWeight: 800,
                        border: '1px solid #E2E8F0',
                        fontFamily: 'monospace',
                        flexShrink: 0,
                      }}
                    >
                      {area.indicatorCode}
                    </span>
                  )}
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                      {area.name}
                    </div>
                    {area.description && (
                      <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                        {area.description}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* شارة الحالة الصريحة للمجال */}
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      backgroundColor:
                        area.status === 'completed'
                          ? '#ECFDF5'
                          : area.status === 'in_progress'
                          ? '#EFF6FF'
                          : '#FEF3C7',
                      color:
                        area.status === 'completed'
                          ? '#059669'
                          : area.status === 'in_progress'
                          ? '#2563EB'
                          : '#D97706',
                      border:
                        area.status === 'completed'
                          ? '1px solid #A7F3D0'
                          : area.status === 'in_progress'
                          ? '1px solid #BFDBFE'
                          : '1px solid #FDE68A',
                    }}
                  >
                    {area.status === 'completed'
                      ? '✓ مكتمل التنفيذ'
                      : area.status === 'in_progress'
                      ? '🔄 قيد التنفيذ'
                      : '⏳ بانتظار صياغة إجراء'}
                  </span>

                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor:
                        area.priority === 'High' ? '#FEF2F2' : area.priority === 'Medium' ? '#EFF6FF' : '#F8FAFC',
                      color:
                        area.priority === 'High' ? '#DC2626' : area.priority === 'Medium' ? '#2563EB' : '#64748B',
                      border:
                        area.priority === 'High' ? '1px solid #FECACA' : area.priority === 'Medium' ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                    }}
                  >
                    أولوية {area.priority === 'High' ? 'عالية' : area.priority === 'Medium' ? 'متوسطة' : 'منخفضة'}
                  </span>

                  {!isPlanReadOnly ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPreselectedAreaId(area.areaId);
                        setIsAddModalOpen(true);
                      }}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#059669',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 2px rgba(5, 150, 105, 0.2)',
                      }}
                    >
                      <Plus size={14} />
                      <span>صياغة إجراء تنفيذي لهذا المجال</span>
                    </button>
                  ) : (
                    <span
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                        border: '1px solid #FDE68A',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="وضع الملاحظة والإقرار: صياغة الإجراءات محصورة بالمقيم المعتمد"
                    >
                      <Lock size={12} />
                      <span>للاطلاع الإداري (بانتظار جدولة المقيم)</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Actions Management Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            مصفوفة الإجراءات والمسؤوليات الميدانية ({filteredActions.length} إجراء)
          </h3>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            التغيير في حالة الإجراء يُعيد حساب مؤشرات الخطة فورياً
          </span>
        </div>

        {/* شريط أدوات البحث وتصفية الإجراءات وشارات التصفية */}
        <PlanActionFilterBar
          actions={actions}
          sortedCount={sortedActions.length}
          availableAreasForFilter={availableAreasForFilter}
          planAreas={planData?.areas}
          searchActionTerm={searchActionTerm}
          onSearchActionTermChange={setSearchActionTerm}
          filterAreaId={filterAreaId}
          onFilterAreaIdChange={setFilterAreaId}
          filterPriority={filterPriority}
          onFilterPriorityChange={setFilterPriority}
          filterGap={filterGap}
          onFilterGapChange={setFilterGap}
          filterTimeRemaining={filterTimeRemaining}
          onFilterTimeRemainingChange={setFilterTimeRemaining}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          onResetAll={() => {
            setSearchActionTerm('');
            setFilterAreaId('ALL');
            setFilterPriority('ALL');
            setFilterGap('ALL');
            setFilterTimeRemaining('ALL');
            setFilterStatus('ALL');
            setSortBy('default');
          }}
        />

        <PlanActionsTable
          actions={actions}
          sortedActions={sortedActions}
          areasWithoutActions={areasWithoutActions}
          planData={planData}
          isPlanReadOnly={isPlanReadOnly}
          formatArabicDateWithDay={formatArabicDateWithDay}
          getRemainingDaysInfo={getRemainingDaysInfo}
          isActionOverdue={isActionOverdue}
          onSortColumn={handleActionHeaderSort}
          renderSortIcon={renderActionSortIcon}
          onSelectFirstAreaForAction={(areaId) => {
            setPreselectedAreaId(areaId);
            setIsAddModalOpen(true);
          }}
          onEditAction={setEditingAction}
          onNavigate={onNavigate}
        />
      </div>

      {/* 4. Plan Internal Review Notes */}
      <PlanReviewNotesSection
        planData={planData}
        readOnly={readOnly}
        isPrincipal={isPrincipal}
        newReviewNoteText={newReviewNoteText}
        isSubmittingReviewNote={isSubmittingReviewNote}
        onReviewNoteTextChange={setNewReviewNoteText}
        onSubmitReviewNote={handleAddReviewNoteSubmit}
      />

      {/* Add Plan Modal */}
      <AddPlanModal
        isOpen={isAddPlanModalOpen}
        onClose={() => setIsAddPlanModalOpen(false)}
        availableAreas={planData?.availableAreas || []}
        defaultPlanType={selectedPlanType}
        existingActivePlanTypes={plansList.filter((p) => p.status === 'Active').map((p) => p.planType)}
        onCreatePlan={async (payload) => {
          await createPlan(payload);
          await refreshPlansList();
          addToast('success', 'تم إنشاء خطة التحسين وربط مجالاتها بنجاح.');
        }}
        isSubmitting={isSubmitting}
      />

      {/* Add Action Modal - Pass all available areas for school/evaluation */}
      <AddActionModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setPreselectedAreaId(null);
        }}
        initialAreaId={preselectedAreaId}
        areas={planData?.availableAreas && planData.availableAreas.length > 0 ? planData.availableAreas : planData?.areas || []}
        onAddAction={async (payload) => {
          await addAction(payload);
          await refreshPlansList();
          addToast('success', 'تمت إضافة الإجراء التنفيذي وربطه بمجال التحسين بنجاح.');
        }}
        isSubmitting={isSubmitting}
      />

      {/* Action Edit / Progress Modal */}
      <ActionProgressModal
        isOpen={!!editingAction}
        onClose={() => setEditingAction(null)}
        action={editingAction}
        onUpdateAction={async (actionId, payload) => {
          await updateAction(actionId, payload);
          addToast('success', 'تم حفظ وتحديث بيانات الإجراء التنفيذي بنجاح.');
        }}
        isSubmitting={isSubmitting}
        readOnly={isPlanReadOnly}
      />

      {/* Toasts */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
