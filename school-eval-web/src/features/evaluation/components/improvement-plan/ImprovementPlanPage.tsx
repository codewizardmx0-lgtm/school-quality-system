import React, { useState, useEffect } from 'react';
import { evaluatorApi } from '../../api/evaluatorApi';
import { useImprovementPlan } from '../../hooks/useImprovementPlan';
import { AddActionModal } from './AddActionModal';
import { AddPlanModal } from './AddPlanModal';
import { ActionProgressModal } from './ActionProgressModal';
import { useToast } from '../../../admin/components/common/useToast';
import { ToastNotification } from '../../../admin/components/common/ToastNotification';
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
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Calendar,
  User,
  Edit2,
  FolderPlus,
  MessageSquare,
  Send,
  RefreshCw,
  GitBranch,
  Layers,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Search,
  Filter,
  X,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
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
  }, [planData?.areas, planData?.actions]);

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

  const actions = planData?.actions || [];

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
    } catch (err: any) {
      addToast('error', 'تعذر تصدير المصنف الموحد: ' + (err?.message || 'خطأ في الخادم'));
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
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'تعذر تسجيل ملاحظة المراجعة.');
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
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'تعذر استنساخ إصدار الخطة.');
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
      {showExplanations && (
        <div
          style={{
            padding: '18px 20px',
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            fontSize: '12.5px',
            lineHeight: 1.6,
          }}
        >
          <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#1D4ED8', fontSize: '13.5px', fontWeight: 800 }}>
              📘 خطة تحسين الجودة المدرسية الشاملة
            </h4>
            <p style={{ margin: 0, color: '#475569' }}>
              تُعنى بمعالجة فجوات نتائج التقييم الذاتي في مجالات التعليم والتعلم، نواتج التحصيل الدراسي، القيادة المدرسية، والشراكة المجتمعية المؤسسية.
            </p>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#7C3AED', fontSize: '13.5px', fontWeight: 800 }}>
              🧑‍🏫 خطة التطوير المهني والتربوي للكوادر
            </h4>
            <p style={{ margin: 0, color: '#475569' }}>
              مخصصة لمؤشرات المعيار الثاني، وتشمل برامج التدريب التخصصي للمعلمين والإداريين، مجتمعات الممارسة المهنية، وتطوير أساليب التدريس والتقويم.
            </p>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#059669', fontSize: '13.5px', fontWeight: 800 }}>
              📋 الخطة التشغيلية السنوية
            </h4>
            <p style={{ margin: 0, color: '#475569' }}>
              تحدد البرامج والمشاريع الميدانية والميزانيات التقديرية والجداول الزمنية السنوية لإدارة المرافق والتجهيزات والعمليات المدرسية الدورية.
            </p>
          </div>
        </div>
      )}

      {/* Master Plans Table (Prototype Parity) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} style={{ color: '#059669' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              سجل الخطط المدرسية المعتمدة والجارية ({plansList.length} خطة مسجلة)
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              خطة نشطة واحدة لكل نوع في الدورة وفق المعايير الوزارية
            </span>
            <button
              type="button"
              onClick={refreshPlansList}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={12} />
              تحديث السجل
            </button>
            <button
              type="button"
              onClick={() => setIsMasterTableExpanded(!isMasterTableExpanded)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '6px',
                backgroundColor: isMasterTableExpanded ? '#FFFFFF' : '#ECFDF5',
                border: isMasterTableExpanded ? '1px solid #CBD5E1' : '1px solid #A7F3D0',
                fontSize: '11.5px',
                fontWeight: 700,
                color: isMasterTableExpanded ? '#334155' : '#065F46',
                cursor: 'pointer',
              }}
            >
              {isMasterTableExpanded ? (
                <>
                  <ChevronUp size={13} />
                  <span>طي السجل الماستر</span>
                </>
              ) : (
                <>
                  <ChevronDown size={13} />
                  <span>عرض السجل الماستر ({tabPlansList.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {isMasterTableExpanded ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                  <th style={{ padding: '11px 14px', width: '60px' }}>معرف</th>
                  <th style={{ padding: '11px 14px' }}>عنوان الخطة</th>
                  <th style={{ padding: '11px 14px', width: '150px' }}>نوع الخطة</th>
                  <th style={{ padding: '11px 14px', width: '80px' }}>الإصدار</th>
                  <th style={{ padding: '11px 14px', width: '100px' }}>العام الدراسي</th>
                  <th style={{ padding: '11px 14px', width: '150px' }}>الفترة الزمنية</th>
                  <th style={{ padding: '11px 14px', width: '90px', textAlign: 'center' }}>الحالة</th>
                  <th style={{ padding: '11px 14px', width: '110px', textAlign: 'center' }}>نسبة الإنجاز</th>
                  <th style={{ padding: '11px 14px', width: '90px', textAlign: 'center' }} title="عدد مجالات ومؤشرات التحسين المستهدفة التي تشتمل على إجراءات معتمدة في الخطة">المجالات المستهدفة</th>
                  <th style={{ padding: '11px 14px', width: '80px', textAlign: 'center' }} title="إجمالي عدد الإجراءات التنفيذية المعتمدة في الخطة">الإجراءات</th>
                  <th style={{ padding: '11px 14px', width: '70px', textAlign: 'center' }}>المتأخرة</th>
                  <th style={{ padding: '11px 14px', width: '110px', textAlign: 'center' }}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {tabPlansList.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                      لا توجد خطط مدرجة لهذا النوع حالياً. يمكنك إنشاء خطة جديدة بالضغط على «إنشاء خطة جديدة».
                    </td>
                  </tr>
                ) : (
                  tabPlansList.map((p) => {
                    const isCurrent = planData?.planId === p.planId;
                    return (
                      <tr
                        key={p.planId}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          backgroundColor: isCurrent ? '#F0FDF4' : '#FFFFFF',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#64748B' }}>
                          #{p.planId}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 800, color: '#0F172A' }}>
                            {p.title}
                          </div>
                          {p.versionTag && (
                            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                              {p.versionTag}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor:
                                p.planType === 'QualityImprovement'
                                  ? '#EFF6FF'
                                  : p.planType === 'StaffProfessionalDevelopment'
                                  ? '#F5F3FF'
                                  : '#F0FDF4',
                              color:
                                p.planType === 'QualityImprovement'
                                  ? '#1D4ED8'
                                  : p.planType === 'StaffProfessionalDevelopment'
                                  ? '#6D28D9'
                                  : '#15803D',
                            }}
                          >
                            {p.planTypeLabel}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: '#F1F5F9',
                              color: '#334155',
                              fontWeight: 700,
                              fontSize: '11px',
                            }}
                          >
                            v{p.versionNumber}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                          {p.academicYear}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748B', fontSize: '11.5px' }}>
                          {p.startDate || '—'} إلى {p.endDate || '—'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor:
                                p.status === 'Active'
                                  ? '#ECFDF5'
                                  : p.status === 'Submitted'
                                  ? '#EFF6FF'
                                  : p.status === 'Archived'
                                  ? '#F1F5F9'
                                  : '#FFFBEB',
                              color:
                                p.status === 'Active'
                                  ? '#059669'
                                  : p.status === 'Submitted'
                                  ? '#2563EB'
                                  : p.status === 'Archived'
                                  ? '#64748B'
                                  : '#D97706',
                            }}
                          >
                            {p.statusArabic}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <div style={{ width: '45px', height: '6px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${p.overallProgressPercentage}%`,
                                  height: '100%',
                                  backgroundColor: p.overallProgressPercentage === 100 ? '#059669' : '#2563EB',
                                }}
                              />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '11.5px' }}>{p.overallProgressPercentage}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600 }}>
                          {p.areasCount}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>
                          {p.doneActions}/{p.totalActions}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          {p.delayedActions > 0 ? (
                            <span style={{ color: '#DC2626', fontWeight: 800 }}>{p.delayedActions}</span>
                          ) : (
                            <span style={{ color: '#64748B' }}>0</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => switchPlan(p.planType, p.planId)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: isCurrent ? '1px solid #059669' : '1px solid #CBD5E1',
                              backgroundColor: isCurrent ? '#059669' : '#FFFFFF',
                              color: isCurrent ? '#FFFFFF' : '#334155',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {isCurrent ? 'الخطة المعروضة' : 'عرض التفاصيل'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              padding: '14px 20px',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              fontSize: '12.5px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ color: '#64748B', fontWeight: 600 }}>الخطة المعروضة حالياً:</span>
              <strong style={{ color: '#0F172A', fontWeight: 800, fontSize: '13.5px' }}>
                {planData?.title || 'خطة التحسين والتطوير المدرسي'}
              </strong>
              {planData?.versionNumber && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: '#ECFDF5',
                    color: '#065F46',
                    fontWeight: 800,
                    fontSize: '11px',
                    border: '1px solid #A7F3D0',
                  }}
                >
                  v{planData.versionNumber}
                </span>
              )}
              {planData?.versionTag && (
                <span
                  style={{
                    padding: '2px 7px',
                    borderRadius: '5px',
                    backgroundColor: '#EFF6FF',
                    color: '#1D4ED8',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {planData.versionTag}
                </span>
              )}
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor:
                    planData?.status === 'Active'
                      ? '#ECFDF5'
                      : planData?.status === 'Submitted'
                      ? '#EFF6FF'
                      : planData?.status === 'Archived'
                      ? '#F1F5F9'
                      : '#FFFBEB',
                  color:
                    planData?.status === 'Active'
                      ? '#059669'
                      : planData?.status === 'Submitted'
                      ? '#2563EB'
                      : planData?.status === 'Archived'
                      ? '#64748B'
                      : '#D97706',
                }}
              >
                {planData?.status === 'Active' ? 'نشطة' : planData?.status === 'Submitted' ? 'مرفوعة' : planData?.status === 'Archived' ? 'مؤرشفة' : 'مسودة'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#64748B', fontSize: '12px' }}>نسبة إنجاز الخطة:</span>
                <div style={{ width: '80px', height: '6px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${summary.totalActions > 0 ? Math.round((summary.doneActions / summary.totalActions) * 100) : 0}%`,
                      height: '100%',
                      backgroundColor: '#059669',
                    }}
                  />
                </div>
                <strong style={{ color: '#059669', fontWeight: 800 }}>
                  {summary.totalActions > 0 ? Math.round((summary.doneActions / summary.totalActions) * 100) : 0}%
                </strong>
                <span style={{ color: '#64748B', fontSize: '11.5px' }}>
                  ({summary.doneActions}/{summary.totalActions} مكتمل)
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsMasterTableExpanded(true)}
                style={{
                  color: '#2563EB',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                توسيع السجل الماستر لمقارنة كافة الخطط
              </button>
            </div>
          </div>
        )}
      </div>

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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Total Actions */}
        <div
          onClick={() => setFilterStatus('ALL')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '18px',
            border: filterStatus === 'ALL' ? '2px solid #059669' : '1px solid #E2E8F0',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
              إجمالي الإجراءات المعتمدة
            </span>
            <Target size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', marginTop: '6px' }}>
            {summary.totalActions}{' '}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>إجراء</span>
          </div>
        </div>

        {/* In Progress */}
        <div
          onClick={() => setFilterStatus('InProgress')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '18px',
            border: filterStatus === 'InProgress' ? '2px solid #2563EB' : '1px solid #E2E8F0',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
              قيد التنفيذ والمتابعة
            </span>
            <Clock size={18} color="#2563EB" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#2563EB', marginTop: '6px' }}>
            {summary.inProgressActions}{' '}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>إجراءات</span>
          </div>
        </div>

        {/* Done */}
        <div
          onClick={() => setFilterStatus('Done')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '18px',
            border: filterStatus === 'Done' ? '2px solid #059669' : '1px solid #E2E8F0',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
              إجراءات مكتملة بنجاح
            </span>
            <CheckCircle2 size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#059669', marginTop: '6px' }}>
            {summary.doneActions}{' '}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>منجزة بالكامل</span>
          </div>
        </div>

        {/* Pending */}
        <div
          onClick={() => setFilterStatus('Pending')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '18px',
            border: filterStatus === 'Pending' ? '2px solid #F59E0B' : '1px solid #E2E8F0',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
              إجراءات معلقة بانتظار البدء
            </span>
            <AlertCircle size={18} color="#F59E0B" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#D97706', marginTop: '6px' }}>
            {summary.pendingActions}{' '}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>إجراءات</span>
          </div>
        </div>
      </div>

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

        {/* شريط أدوات البحث وتصفية الإجراءات */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
            {/* حقل البحث النصي */}
            <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 240px' }}>
              <Search
                size={14}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
              />
              <input
                type="text"
                placeholder="بحث في الإجراءات، المسؤولين، المعايير..."
                value={searchActionTerm}
                onChange={(e) => setSearchActionTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 32px 7px 28px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                }}
              />
              {searchActionTerm && (
                <button
                  type="button"
                  onClick={() => setSearchActionTerm('')}
                  style={{
                    position: 'absolute',
                    left: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                  title="مسح البحث"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* فلتر المجال */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={13} style={{ color: '#64748B' }} />
              <select
                value={filterAreaId}
                onChange={(e) => setFilterAreaId(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  cursor: 'pointer',
                  outline: 'none',
                  fontWeight: filterAreaId !== 'ALL' ? 700 : 500,
                  maxWidth: '240px',
                }}
              >
                <option value="ALL">كافة المؤشرات والمجالات ({actions.length})</option>
                {availableAreasForFilter.map((area) => (
                  <option key={area.areaId} value={String(area.areaId)}>
                    {area.indicatorCode ? `[${area.indicatorCode}] ` : ''}
                    {area.name}
                    {area.standardCode ? ` — (${area.standardCode})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* فلتر الأولوية */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
                fontWeight: filterPriority !== 'ALL' ? 700 : 500,
              }}
            >
              <option value="ALL">كافة الأولويات</option>
              <option value="High">أولوية عالية</option>
              <option value="Medium">أولوية متوسطة</option>
              <option value="Low">أولوية منخفضة</option>
            </select>

            {/* فلتر الفجوة */}
            <select
              value={filterGap}
              onChange={(e) => setFilterGap(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
                fontWeight: filterGap !== 'ALL' ? 700 : 500,
              }}
            >
              <option value="ALL">كافة الفجوات</option>
              <option value="has_gap">توجد فجوة (&gt;0)</option>
              <option value="gap_1">فجوة بمقدار 1</option>
              <option value="gap_2">فجوة بمقدار 2</option>
              <option value="gap_3">فجوة بمقدار 3★</option>
            </select>

            {/* فلتر المهلة المتبقية */}
            <select
              value={filterTimeRemaining}
              onChange={(e) => setFilterTimeRemaining(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
                fontWeight: filterTimeRemaining !== 'ALL' ? 700 : 500,
              }}
            >
              <option value="ALL">كافة المهل والآجال</option>
              <option value="overdue">متأخر عن الموعد</option>
              <option value="today">يستحق اليوم</option>
              <option value="this_week">خلال أسبوع (≤ 7 أيام)</option>
              <option value="this_month">خلال شهر (≤ 30 يوم)</option>
              <option value="more">أكثر من شهر (&gt; 30 يوم)</option>
            </select>

            {/* فلتر الحالة */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
                fontWeight: filterStatus !== 'ALL' ? 700 : 500,
              }}
            >
              <option value="ALL">كافة الحالات ({actions.length})</option>
              <option value="InProgress">قيد التنفيذ ({actions.filter((a) => a.status === 'InProgress').length})</option>
              <option value="Done">مكتمل ({actions.filter((a) => a.status === 'Done').length})</option>
              <option value="Pending">معلق ({actions.filter((a) => a.status === 'Pending').length})</option>
            </select>

            {/* الفرز */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowUpDown size={13} style={{ color: '#64748B' }} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  cursor: 'pointer',
                  outline: 'none',
                  fontWeight: sortBy !== 'default' ? 700 : 500,
                }}
              >
                <option value="default">الترتيب الافتراضي</option>
                <option value="priority_desc">الأولوية (الأعلى أولاً)</option>
                <option value="priority_asc">الأولوية (الأقل أولاً)</option>
                <option value="gap_desc">الفجوة (الأكبر أولاً)</option>
                <option value="gap_asc">الفجوة (الأصغر أولاً)</option>
                <option value="start_date_asc">تاريخ البدء (الأقدم أولاً)</option>
                <option value="start_date_desc">تاريخ البدء (الأحدث أولاً)</option>
                <option value="time_remaining_asc">المهلة المتبقية (الأقرب استحقاقاً)</option>
                <option value="time_remaining_desc">المهلة المتبقية (الأبعد)</option>
              </select>
            </div>

            {/* زر تفريغ الفلاتر إن كانت نشطة */}
            {(searchActionTerm || filterAreaId !== 'ALL' || filterPriority !== 'ALL' || filterGap !== 'ALL' || filterTimeRemaining !== 'ALL' || filterStatus !== 'ALL' || sortBy !== 'default') && (
              <button
                type="button"
                onClick={() => {
                  setSearchActionTerm('');
                  setFilterAreaId('ALL');
                  setFilterPriority('ALL');
                  setFilterGap('ALL');
                  setFilterTimeRemaining('ALL');
                  setFilterStatus('ALL');
                  setSortBy('default');
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RotateCcw size={12} />
                <span>إعادة ضبط الفلاتر</span>
              </button>
            )}
          </div>

          <div style={{ fontSize: '12px', color: '#64748B' }}>
            عرض <strong>{sortedActions.length}</strong> من إجمالي <strong>{actions.length}</strong> إجراء
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {(searchActionTerm || filterAreaId !== 'ALL' || filterPriority !== 'ALL' || filterGap !== 'ALL' || filterTimeRemaining !== 'ALL' || filterStatus !== 'ALL') && (
          <div
            style={{
              padding: '10px 16px',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={12} />
              الفلاتر النشطة:
            </span>

            {searchActionTerm.trim() && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1E40AF',
                  fontSize: '11.5px',
                  fontWeight: 600,
                }}
              >
                <span>البحث: &quot;{searchActionTerm}&quot;</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSearchActionTerm('')} />
              </span>
            )}

            {filterAreaId !== 'ALL' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#065F46',
                  fontSize: '11.5px',
                  fontWeight: 600,
                }}
              >
                <span>
                  المجال:{' '}
                  {(() => {
                    const found = planData?.areas?.find((a) => a.areaId === Number(filterAreaId));
                    return found ? `${found.indicatorCode || ''} ${found.name}` : filterAreaId;
                  })()}
                </span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setFilterAreaId('ALL')} />
              </span>
            )}

            {filterPriority !== 'ALL' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  color: '#92400E',
                  fontSize: '11.5px',
                  fontWeight: 600,
                }}
              >
                <span>
                  الأولوية: {filterPriority === 'High' ? 'عالية' : filterPriority === 'Medium' ? 'متوسطة' : 'منخفضة'}
                </span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setFilterPriority('ALL')} />
              </span>
            )}

            {filterGap !== 'ALL' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  fontSize: '11.5px',
                  fontWeight: 600,
                }}
              >
                <span>
                  الفجوة: {filterGap === 'critical' ? 'حرجة (3)' : filterGap === 'large' ? 'كبيرة (2)' : 'طفيفة (1)'}
                </span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setFilterGap('ALL')} />
              </span>
            )}

            {filterTimeRemaining !== 'ALL' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  color: '#334155',
                  fontSize: '11.5px',
                  fontWeight: 600,
                }}
              >
                <span>
                  المهلة:{' '}
                  {filterTimeRemaining === 'overdue'
                    ? 'متأخر'
                    : filterTimeRemaining === 'today'
                    ? 'اليوم'
                    : filterTimeRemaining === 'this_week'
                    ? 'خلال أسبوع'
                    : filterTimeRemaining === 'this_month'
                    ? 'خلال شهر'
                    : 'أكثر من شهر'}
                </span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setFilterTimeRemaining('ALL')} />
              </span>
            )}

            {filterStatus !== 'ALL' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1E40AF',
                  fontSize: '11.5px',
                  fontWeight: 600,
                }}
              >
                <span>
                  الحالة: {filterStatus === 'InProgress' ? 'قيد التنفيذ' : filterStatus === 'Done' ? 'مكتمل' : 'معلق'}
                </span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setFilterStatus('ALL')} />
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setSearchActionTerm('');
                setFilterAreaId('ALL');
                setFilterPriority('ALL');
                setFilterGap('ALL');
                setFilterTimeRemaining('ALL');
                setFilterStatus('ALL');
                setSortBy('default');
              }}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginRight: 'auto',
              }}
            >
              <RotateCcw size={11} />
              <span>مسح كافة الفلاتر</span>
            </button>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '1150px', width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #F1F5F9' }}>
                <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '45px', textAlign: 'center' }}>#</th>
                <th
                  onClick={() => handleActionHeaderSort('indicator')}
                  style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '250px', cursor: 'pointer', userSelect: 'none' }}
                  title="انقر للفرز حسب المؤشر والمعيار"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span>المؤشر والمعيار المستهدف</span>
                    {renderActionSortIcon('indicator')}
                  </div>
                </th>
                <th
                  onClick={() => handleActionHeaderSort('title')}
                  style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569', minWidth: '200px', cursor: 'pointer', userSelect: 'none' }}
                  title="انقر للفرز حسب عنوان الإجراء"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span>عنوان الإجراء التنفيذي</span>
                    {renderActionSortIcon('title')}
                  </div>
                </th>
                <th
                  onClick={() => handleActionHeaderSort('priority')}
                  style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '90px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                  title="انقر للفرز حسب الأولوية"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span>الأولوية</span>
                    {renderActionSortIcon('priority')}
                  </div>
                </th>
                <th
                  onClick={() => handleActionHeaderSort('gap')}
                  style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '135px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                  title="انقر للفرز حسب حجم الفجوة"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span>الدرجة ومسار الفجوة</span>
                    {renderActionSortIcon('gap')}
                  </div>
                </th>
                <th
                  onClick={() => handleActionHeaderSort('owner')}
                  style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '120px', cursor: 'pointer', userSelect: 'none' }}
                  title="انقر للفرز حسب المسؤول"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span>المسؤول</span>
                    {renderActionSortIcon('owner')}
                  </div>
                </th>
                <th
                  onClick={() => handleActionHeaderSort('start_date')}
                  style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '135px', cursor: 'pointer', userSelect: 'none' }}
                  title="انقر للفرز حسب تاريخ البدء"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                    <span>تاريخ البدء</span>
                    {renderActionSortIcon('start_date')}
                  </div>
                </th>
                <th
                  onClick={() => handleActionHeaderSort('time_remaining')}
                  style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '155px', cursor: 'pointer', userSelect: 'none' }}
                  title="انقر للفرز حسب تاريخ الاستحقاق والمهلة"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                    <span>تاريخ الاستحقاق والمهلة</span>
                    {renderActionSortIcon('time_remaining')}
                  </div>
                </th>
                <th
                  onClick={() => handleActionHeaderSort('progress')}
                  style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '90px', cursor: 'pointer', userSelect: 'none' }}
                  title="انقر للفرز حسب نسبة الإنجاز"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span>الإنجاز</span>
                    {renderActionSortIcon('progress')}
                  </div>
                </th>
                <th
                  onClick={() => handleActionHeaderSort('status')}
                  style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 700, color: '#475569', width: '95px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                  title="انقر للفرز حسب الحالة"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span>الحالة</span>
                    {renderActionSortIcon('status')}
                  </div>
                </th>
                <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#475569', textAlign: 'center', width: '90px' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {sortedActions.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: '48px 20px', textAlign: 'center', color: '#64748B' }}>
                    {actions.length === 0 && areasWithoutActions.length > 0 ? (
                      <div data-testid="empty-actions-unscheduled-hint">
                        <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                          الخطة لا تتضمن أي إجراءات تنفيذية مجدولة بعد
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748B', maxWidth: '520px', margin: '0 auto 16px', lineHeight: 1.6 }}>
                          يوجد ({areasWithoutActions.length}) مجالات تحسين متبناة في هذه الخطة بانتظار صياغة مهامها ومسؤوليها في الشريط التنبيهي أعلاه.
                        </div>
                        {!isPlanReadOnly && (
                          <button
                            type="button"
                            onClick={() => {
                              setPreselectedAreaId(areasWithoutActions[0]?.areaId || null);
                              setIsAddModalOpen(true);
                            }}
                            style={{
                              padding: '8px 18px',
                              borderRadius: '8px',
                              backgroundColor: '#059669',
                              color: '#FFFFFF',
                              border: 'none',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <Plus size={14} />
                            <span>صياغة أول إجراء تنفيذي الآن</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                          لا توجد إجراءات مطابقة لشروط البحث أو التصفية الحالية
                        </div>
                        <div style={{ fontSize: '12.5px' }}>
                          يمكنك إعادة تعيين الفلاتر أو النقر على «إضافة إجراء تنفيذي جديد».
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                sortedActions.map((action, idx) => {
                  const overdue = isActionOverdue(action);
                  const remInfo = getRemainingDaysInfo(action.dueDate, action.status);
                  const gapVal = action.gap !== undefined && action.gap !== null
                    ? action.gap
                    : (action.targetScore !== undefined && action.score !== undefined && action.score !== null
                        ? Math.max(0, action.targetScore - action.score)
                        : null);
                  const isGapZero = gapVal !== null && gapVal === 0;
                  const p = action.priority || 'Medium';
                  const isHigh = p === 'High';
                  const isMedium = p === 'Medium';
                  return (
                    <tr
                      key={action.actionId}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        backgroundColor: overdue ? '#FFFBFB' : 'transparent',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = overdue ? '#FEF2F2' : '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = overdue ? '#FFFBFB' : 'transparent')}
                    >
                      {/* 1. الرقم التسلسلي */}
                      <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>
                        {idx + 1}
                      </td>

                      {/* 2. المؤشر والمعيار المستهدف (مع زر الانتقال إلى استمارة الرصد والتقييم) */}
                      <td style={{ padding: '14px 14px', maxWidth: '260px' }}>
                        {action.indicatorCode ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              {action.indicatorId && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    sessionStorage.setItem('navigated_from_improvement_plan', 'true');
                                    sessionStorage.setItem('navigated_from_improvement_plan_indicator_id', String(action.indicatorId));
                                    onNavigate?.('rubric-assessment', action.indicatorId);
                                  }}
                                  title="الانتقال إلى تقييم هذا المؤشر في استمارة الرصد والتقييم"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 7px',
                                    borderRadius: '5px',
                                    border: '1px solid #BFDBFE',
                                    backgroundColor: '#EFF6FF',
                                    color: '#1D4ED8',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#DBEAFE';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#EFF6FF';
                                  }}
                                >
                                  <ExternalLink size={11} />
                                  <span>استمارة الرصد</span>
                                </button>
                              )}
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontWeight: 800,
                                  fontSize: '11px',
                                  backgroundColor: '#EFF6FF',
                                  color: '#1D4ED8',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #BFDBFE',
                                }}
                              >
                                {action.indicatorCode}
                              </span>
                              {action.standardCode && (
                                <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>
                                  ({action.standardCode})
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', lineHeight: 1.4 }}>
                              {action.indicatorName || action.areaName}
                            </div>
                            {action.standardName && (
                              <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                                {action.standardName}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: '12.5px', color: '#64748B' }}>
                            {action.areaName || 'مجال عام'}
                          </div>
                        )}
                      </td>

                      {/* 3. عنوان الإجراء والوصف */}
                      <td style={{ padding: '14px 14px', maxWidth: '280px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                            {action.title}
                          </span>
                          {action.isNewInVersion && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 7px',
                                borderRadius: '6px',
                                backgroundColor: '#FEF3C7',
                                color: '#92400E',
                                border: '1px solid #FDE68A',
                                fontSize: '10.5px',
                                fontWeight: 800,
                              }}
                              title="إجراء تمت إضافته على الخطة بعد استنساخ الإصدار استجابة لطلب الاستكمال"
                            >
                              ✨ مضاف بعد الاستكمال (v{planData?.versionNumber || 2})
                            </span>
                          )}
                        </div>
                        {action.progressDescription && (
                          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px', lineHeight: 1.4 }}>
                            {action.progressDescription}
                          </div>
                        )}
                      </td>

                      {/* 4. الأولوية */}
                      <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            backgroundColor: isHigh ? '#FEE2E2' : isMedium ? '#FEF3C7' : '#F1F5F9',
                            color: isHigh ? '#991B1B' : isMedium ? '#92400E' : '#475569',
                            border: `1px solid ${isHigh ? '#FECACA' : isMedium ? '#FDE68A' : '#E2E8F0'}`,
                          }}
                        >
                          {action.priorityArabic || (isHigh ? 'عالية' : isMedium ? 'متوسطة' : 'منخفضة')}
                        </span>
                      </td>

                      {/* 5. الدرجات وتتبع مسار الفجوة (الأساس vs الحالي) */}
                      <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                          {/* الدرجة الحالية والمستهدفة */}
                          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                            <span style={{ color: '#64748B' }} title="الدرجة الحالية">
                              {action.score !== undefined && action.score !== null ? `${action.score}★` : '-'}
                            </span>
                            <span style={{ margin: '0 3px', color: '#94A3B8' }}>←</span>
                            <span style={{ color: '#059669', fontWeight: 800 }} title="الدرجة المستهدفة">
                              {action.targetScore ? `${action.targetScore}★` : '3★'}
                            </span>
                          </div>

                          {/* مسار التحسن من خط الأساس عند التبني إن وُجد */}
                          {action.baselineScore !== undefined && action.baselineScore !== null && action.score !== undefined && action.score !== null && (
                            <div style={{ fontSize: '10px', color: '#64748B' }}>
                              <span>الأساس: </span>
                              <strong style={{ color: '#475569' }}>{action.baselineScore}★</strong>
                              {action.score > action.baselineScore && (
                                <span style={{ color: '#059669', fontWeight: 800, marginRight: '3px' }}>
                                  (+{action.score - action.baselineScore}★)
                                </span>
                              )}
                            </div>
                          )}

                          {/* شارة الفجوة الحالية */}
                          {action.gap !== undefined && action.gap !== null && (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: isGapZero ? '#ECFDF5' : '#FFFBEB',
                                color: isGapZero ? '#059669' : '#D97706',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                border: isGapZero ? '1px solid #A7F3D0' : '1px solid #FDE68A',
                              }}
                            >
                              {isGapZero ? 'فجوة: 0 (تم سد الفجوة)' : `فجوة: ${action.gap}`}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. المسؤول */}
                      <td style={{ padding: '14px 14px', fontSize: '12.5px', color: '#334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} color="#64748B" />
                          <span>{action.leader}</span>
                        </div>
                      </td>

                      {/* 7. تاريخ البدء (مع اسم اليوم) */}
                      <td style={{ padding: '14px 12px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#334155' }}>
                          <Calendar size={13} style={{ color: '#0284C7', flexShrink: 0 }} />
                          <span style={{ fontWeight: 600 }}>{formatArabicDateWithDay(action.startDate)}</span>
                        </div>
                      </td>

                      {/* 8. تاريخ الاستحقاق والمهلة المتبقية (مع اسم اليوم) */}
                      <td style={{ padding: '14px 12px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {/* علامة خضراء فوق التاريخ إذا أصبحت الفجوة 0 للعلم فقط دون تغيير حالة التنفيذ */}
                          {isGapZero && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 7px',
                                borderRadius: '5px',
                                backgroundColor: '#ECFDF5',
                                color: '#047857',
                                border: '1px solid #A7F3D0',
                                fontSize: '10.5px',
                                fontWeight: 800,
                                width: 'fit-content',
                              }}
                              title="الدرجة المستهدفة للمؤشر محققة بالكامل في التقييم الذاتي (الفجوة = 0) — إشعار إنجاز للمعلومة دون تغيير حالة التنفيذ الميداني للإجراء"
                            >
                              <CheckCircle2 size={11} style={{ color: '#059669' }} />
                              <span>مكتمل (الفجوة 0)</span>
                            </span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: overdue ? '#DC2626' : '#334155' }}>
                            <Calendar size={13} style={{ color: overdue ? '#DC2626' : '#D97706', flexShrink: 0 }} />
                            <span style={{ fontWeight: 600 }}>{formatArabicDateWithDay(action.dueDate)}</span>
                          </div>
                          {remInfo && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: remInfo.isOverdue ? '#FEF2F2' : remInfo.isToday ? '#FFFBEB' : '#F0FDF4',
                                color: remInfo.isOverdue ? '#DC2626' : remInfo.isToday ? '#B45309' : '#15803D',
                                border: `1px solid ${remInfo.isOverdue ? '#FECACA' : remInfo.isToday ? '#FDE68A' : '#BBF7D0'}`,
                                fontSize: '10.5px',
                                fontWeight: 700,
                                width: 'fit-content',
                              }}
                            >
                              <Clock size={11} />
                              {remInfo.text}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 9. نسبة الإنجاز */}
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ flex: 1, minWidth: '55px', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${action.completionPercentage}%`,
                                backgroundColor: action.status === 'Done' ? '#059669' : '#2563EB',
                                borderRadius: '4px',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                            {action.completionPercentage}%
                          </span>
                        </div>
                      </td>

                      {/* 10. الحالة المعتمدة */}
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor:
                              action.status === 'Done'
                                ? '#ECFDF5'
                                : action.status === 'InProgress'
                                ? '#EFF6FF'
                                : '#FFFBEB',
                            color:
                              action.status === 'Done'
                                ? '#059669'
                                : action.status === 'InProgress'
                                ? '#2563EB'
                                : '#D97706',
                            border:
                              action.status === 'Done'
                                ? '1px solid #A7F3D0'
                                : action.status === 'InProgress'
                                ? '1px solid #BFDBFE'
                                : '1px solid #FDE68A',
                          }}
                        >
                          {action.status === 'Done' ? (
                            <>
                              <CheckCircle2 size={12} />
                              <span>مكتمل</span>
                            </>
                          ) : action.status === 'InProgress' ? (
                            <>
                              <Clock size={12} />
                              <span>قيد التنفيذ</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle size={12} />
                              <span>معلق</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* 11. الإجراءات (تعديل فقط — تم نقل شواهد المؤشر إلى عمود المؤشر) */}
                      <td style={{ padding: '14px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => setEditingAction(action)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 12px',
                            borderRadius: '6px',
                            backgroundColor: '#F1F5F9',
                            color: '#334155',
                            border: '1px solid #CBD5E1',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          title={isPlanReadOnly ? 'استعراض تفاصيل الإجراء (للقراءة فقط)' : 'تعديل كافة بيانات الإجراء والمتابعة الميدانية'}
                        >
                          <Edit2 size={12} />
                          {isPlanReadOnly ? 'استعراض' : 'تعديل'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Plan Internal Review Notes */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '22px 24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageSquare size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                ملاحظات المراجعة الداخلية والتوجيهات الإشرافية
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                ملاحظات مدير المدرسة والمشرف التربوي على مسار تنفيذ الخطة المدرسية
              </p>
            </div>
          </div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '99px',
              backgroundColor: '#F1F5F9',
              color: '#475569',
            }}
          >
            {planData?.reviewNotes?.length || 0} ملاحظة
          </span>
        </div>

        {/* Existing Notes List */}
        {!planData?.reviewNotes || planData.reviewNotes.length === 0 ? (
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px dashed #CBD5E1',
              color: '#64748B',
              fontSize: '12.5px',
              textAlign: 'center',
            }}
          >
            لا توجد ملاحظات مراجعة مسجلة على هذه الخطة حتى الآن.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {planData.reviewNotes.map((note) => (
              <div
                key={note.noteId}
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRight: '3px solid #2563EB',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, color: '#1E293B' }}>{note.authorName}</span>
                    <span
                      style={{
                        padding: '1px 8px',
                        borderRadius: '4px',
                        backgroundColor: note.reviewerRole === 'school_principal' ? '#FEF3C7' : '#DBEAFE',
                        color: note.reviewerRole === 'school_principal' ? '#92400E' : '#1E40AF',
                        border: `1px solid ${note.reviewerRole === 'school_principal' ? '#FCD34D' : '#BFDBFE'}`,
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {note.roleArabic || (note.reviewerRole === 'school_principal' ? 'مدير مدرسة' : 'مقيم')}
                    </span>
                  </div>
                  {note.createdAt && (
                    <span style={{ color: '#94A3B8', fontSize: '11px' }}>
                      {new Date(note.createdAt).toLocaleDateString('ar-EG', { dateStyle: 'medium' })}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                  {note.text}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Add Note Input if not ReadOnly OR if isPrincipal */}
        {(!readOnly || isPrincipal) && planData && planData.planId > 0 && planData.status !== 'Archived' && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
            <input
              type="text"
              value={newReviewNoteText}
              onChange={(e) => setNewReviewNoteText(e.target.value)}
              placeholder={isPrincipal ? 'اكتب ملاحظة أو توجيهاً إدارياً من مدير المدرسة على الخطة...' : 'اكتب ملاحظة أو توجيهاً داخلياً على الخطة...'}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddReviewNoteSubmit();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddReviewNoteSubmit}
              disabled={isSubmittingReviewNote || !newReviewNoteText.trim()}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                backgroundColor: isPrincipal ? '#D97706' : '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isSubmittingReviewNote || !newReviewNoteText.trim() ? 'not-allowed' : 'pointer',
                opacity: isSubmittingReviewNote || !newReviewNoteText.trim() ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <Send size={14} />
              <span>{isSubmittingReviewNote ? 'جاري الإرسال...' : isPrincipal ? 'إضافة ملاحظة المدير' : 'إضافة ملاحظة'}</span>
            </button>
          </div>
        )}
      </div>

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
