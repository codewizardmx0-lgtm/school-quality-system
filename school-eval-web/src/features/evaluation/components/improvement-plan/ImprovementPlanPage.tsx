import { exportToExcel, formatExportFilename } from '../../../admin/utils/exportUtils';
import React, { useState, useEffect } from 'react';
import { evaluatorApi } from '../../api/evaluatorApi';
import { useImprovementPlan } from '../../hooks/useImprovementPlan';
import { AddActionModal } from './AddActionModal';
import { AddPlanModal } from './AddPlanModal';
import { ActionProgressModal } from './ActionProgressModal';
import { AttachActionEvidenceModal } from './AttachActionEvidenceModal';
import { useToast } from '../../../admin/components/common/useToast';
import { ToastNotification } from '../../../admin/components/common/ToastNotification';
import { useAuth } from '../../../auth/AuthContext';
import type {
  ImprovementPlanAction,
  ActionStatus,
  EvaluatorScreen,
  PlanType,
  CompletionRequestData,
} from '../../api/evaluationTypes';
import {
  Target,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  FileSpreadsheet,
  Calendar,
  User,
  Edit2,
  Paperclip,
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
} from 'lucide-react';

interface ImprovementPlanPageProps {
  onNavigate?: (screen: EvaluatorScreen) => void;
  readOnly?: boolean;
}

export const ImprovementPlanPage: React.FC<ImprovementPlanPageProps> = ({
  readOnly = false,
}) => {
  const {
    selectedPlanType,
    setSelectedPlanType,
    selectPlan,
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

  const { user } = useAuth();
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
  const [searchActionTerm, setSearchActionTerm] = useState<string>('');
  const [isMasterTableExpanded, setIsMasterTableExpanded] = useState<boolean>(true);
  const [selectedActionForEvidence, setSelectedActionForEvidence] = useState<ImprovementPlanAction | null>(null);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [newReviewNoteText, setNewReviewNoteText] = useState('');
  const [isSubmittingReviewNote, setIsSubmittingReviewNote] = useState(false);
  const [isExportingWorkbook, setIsExportingWorkbook] = useState(false);
  const [isCloningVersion, setIsCloningVersion] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);
  const [completionRequest, setCompletionRequest] = useState<CompletionRequestData | null>(null);

  // التنقل المباشر وتحديد الخطة تلقائياً إذا تم التوجيه من شاشة المقترحات
  useEffect(() => {
    const savedPlanId = sessionStorage.getItem('selectedImprovementPlanId');
    if (savedPlanId) {
      const pId = Number(savedPlanId);
      if (!isNaN(pId)) {
        selectPlan(pId);
        const matching = plansList.find((p) => p.planId === pId);
        if (matching) {
          setSelectedPlanType(matching.planType);
        }
      }
      sessionStorage.removeItem('selectedImprovementPlanId');
    }
  }, [selectPlan, plansList, setSelectedPlanType]);

  // مزامنة نوع الخطة مع نوع الخطة المحملة
  useEffect(() => {
    if (planData?.planType && planData.planType !== selectedPlanType) {
      setSelectedPlanType(planData.planType);
    }
  }, [planData?.planType, selectedPlanType, setSelectedPlanType]);

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
    const map = new Map<number, string>();
    actions.forEach((a) => {
      if (a.areaId && a.areaName) {
        map.set(a.areaId, a.areaName);
      }
    });
    return Array.from(map.entries()).map(([areaId, name]) => ({
      areaId,
      name,
      priority: 'High' as const,
    }));
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

    // 3. فلتر البحث النصي
    if (searchActionTerm.trim()) {
      const term = searchActionTerm.trim().toLowerCase();
      const matchTitle = (act.title || '').toLowerCase().includes(term);
      const matchLeader = (act.leader || '').toLowerCase().includes(term);
      const matchStandard = (act.standardName || '').toLowerCase().includes(term);
      const matchProgress = (act.progressDescription || '').toLowerCase().includes(term);
      const matchArea = (act.areaName || '').toLowerCase().includes(term);
      if (!matchTitle && !matchLeader && !matchStandard && !matchProgress && !matchArea) {
        return false;
      }
    }

    return true;
  });

  if (isLoading && !planData) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
        جاري تحميل خطة التحسين المدرسي...
      </div>
    );
  }

  const handleExportPlan = () => {
    const headers = ['رقم الإجراء', 'عنوان الإجراء', 'المعيار', 'المسؤول', 'البداية', 'الاستحقاق', 'الحالة', 'نسبة الإنجاز', 'وصف التقدم'];
    const rows = actions.map((a) => [
      a.actionId,
      a.title,
      a.standardName,
      a.leader,
      a.startDate,
      a.dueDate,
      a.statusArabic,
      `${a.completionPercentage}%`,
      a.progressDescription,
    ]);
    const filename = formatExportFilename('خطة_التحسين_المدرسي', 'xlsx');
    const schoolName = user?.school?.schoolName || 'مدرسة الفاروق الأساسية للبنين';
    const schoolCode = user?.school?.schoolCode || (user?.school?.schoolId ? `SCH-${user.school.schoolId}` : 'SCH-TAIZ-2026-001');
    exportToExcel(filename, 'خطة التحسين', headers, rows, {
      schoolName,
      schoolCode,
      reportTitle: 'وثيقة خطة التحسين والتطوير المدرسي',
    });
  };

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

  const handleDirectStatusChange = (actionId: number, newStatus: ActionStatus) => {
    if (readOnly) return;
    updateAction(actionId, {
      status: newStatus,
      completionPercentage: newStatus === 'Done' ? 100 : newStatus === 'Pending' ? 0 : undefined,
    });
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
      
      {/* Supervisor Completion Request Warning Banner */}
      {completionRequest && (
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
                الخطة الحالية مقفلة بعد التسليم السابق. يمكنك الضغط على «إنشاء نسخة جديدة (v2)» لاستنساخ الخطة ومتابعة التعديلات المطلوبة.
              </p>
            </div>
          </div>
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
                onClick={() => {
                  selectPlan(null);
                  setSelectedPlanType(tab.id);
                }}
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
                  <span>عرض السجل الماستر ({plansList.length})</span>
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
                  <th style={{ padding: '11px 14px', width: '70px', textAlign: 'center' }}>المجالات</th>
                  <th style={{ padding: '11px 14px', width: '80px', textAlign: 'center' }}>الإجراءات</th>
                  <th style={{ padding: '11px 14px', width: '70px', textAlign: 'center' }}>المتأخرة</th>
                  <th style={{ padding: '11px 14px', width: '110px', textAlign: 'center' }}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {plansList.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                      لا توجد خطط مدرجة حالياً. يمكنك إنشاء خطة جديدة بالضغط على «إنشاء خطة جديدة».
                    </td>
                  </tr>
                ) : (
                  plansList.map((p) => {
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
                            onClick={() => {
                              selectPlan(p.planId);
                              setSelectedPlanType(p.planType);
                            }}
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
            onClick={handleExportPlan}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              color: '#334155',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={15} />
            تصدير الخطة
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
            title="تصدير مصنف إكسل رسمي موحد يتضمن 3 أوراق"
          >
            <FileSpreadsheet size={15} color="#4338CA" />
            {isExportingWorkbook ? 'جاري التصدير...' : 'المصنف الموحد (3 أوراق)'}
          </button>

          {!readOnly && planData?.status !== 'Archived' && planData?.status !== 'Submitted' && (
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
                onClick={() => setIsAddModalOpen(true)}
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
                }}
              >
                <option value="ALL">كافة المجالات المعيارية</option>
                {availableAreasForFilter.map((area) => (
                  <option key={area.areaId} value={String(area.areaId)}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            {/* فلتر الحالة */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '7px 12px',
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
          </div>

          <div style={{ fontSize: '12px', color: '#64748B' }}>
            عرض <strong>{filteredActions.length}</strong> من إجمالي <strong>{actions.length}</strong> إجراء
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '920px', width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #F1F5F9' }}>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>عنوان الإجراء التنفيذي</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>المسؤول عن التنفيذ</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>الجدول الزمني</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>نسبة الإنجاز</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>الحالة (تغيير فوري)</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredActions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                      لا توجد إجراءات مطابقة لشروط البحث أو التصفية الحالية
                    </div>
                    <div style={{ fontSize: '12.5px' }}>
                      يمكنك إعادة تعيين الفلاتر أو النقر على «إضافة إجراء تنفيذي جديد».
                    </div>
                  </td>
                </tr>
              ) : (
                filteredActions.map((action) => {
                  const overdue = isActionOverdue(action);
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
                      <td style={{ padding: '14px 16px', maxWidth: '340px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
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
                        {action.standardName && (
                          <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '3px' }}>
                            المعيار: {action.standardName}
                          </div>
                        )}
                        {action.areaName && (
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                            المجال: {action.areaName}
                          </div>
                        )}
                        {action.progressDescription && (
                          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
                            {action.progressDescription}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} color="#64748B" />
                          <span>{action.leader}</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: overdue ? '#DC2626' : '#64748B' }}>
                            <Calendar size={14} />
                            <span>{action.startDate} إلى {action.dueDate}</span>
                          </div>
                          {overdue && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#FEF2F2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                fontSize: '10.5px',
                                fontWeight: 800,
                                width: 'fit-content',
                              }}
                            >
                              <Clock size={11} />
                              متأخر عن الموعد
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, minWidth: '70px', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${action.completionPercentage}%`,
                                backgroundColor: action.status === 'Done' ? '#059669' : '#2563EB',
                                borderRadius: '4px',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                            {action.completionPercentage}%
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <select
                          value={action.status}
                          disabled={readOnly || planData?.status === 'Archived' || planData?.status === 'Submitted'}
                          onChange={(e) => handleDirectStatusChange(action.actionId, e.target.value as ActionStatus)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
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
                            border: '1px solid #CBD5E1',
                            cursor: readOnly || planData?.status === 'Archived' || planData?.status === 'Submitted' ? 'default' : 'pointer',
                            outline: 'none',
                          }}
                        >
                          <option value="InProgress">قيد التنفيذ</option>
                          <option value="Done">مكتمل</option>
                          <option value="Pending">معلق</option>
                        </select>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {!readOnly && planData?.status !== 'Archived' && planData?.status !== 'Submitted' && (
                          <button
                            onClick={() => {
                              setSelectedActionForEvidence(action);
                              setIsAttachModalOpen(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              backgroundColor: '#EFF6FF',
                              color: '#1D4ED8',
                              border: '1px solid #BFDBFE',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              marginLeft: '6px',
                            }}
                            title="إرفاق شاهد أو وثيقة إثبات لتنفيذ الإجراء"
                          >
                            <Paperclip size={13} />
                            <span>إرفاق شاهد</span>
                            {action.evidences && action.evidences.length > 0 && (
                              <span
                                style={{
                                  backgroundColor: '#DBEAFE',
                                  color: '#1E40AF',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '10px',
                                  marginRight: '3px',
                                }}
                              >
                                {action.evidences.length}
                              </span>
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => setEditingAction(action)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            backgroundColor: '#F1F5F9',
                            color: '#334155',
                            border: '1px solid #E2E8F0',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title={readOnly ? 'استعراض تفاصيل الإجراء' : 'تعديل التفاصيل ووصف الإنجاز الميداني'}
                        >
                          <Edit2 size={13} />
                          {readOnly ? 'تفاصيل' : 'تحديث'}
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
                        backgroundColor: '#DBEAFE',
                        color: '#1E40AF',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {note.roleArabic}
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

        {/* Add Note Input if not ReadOnly */}
        {!readOnly && planData && planData.planId > 0 && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
            <input
              type="text"
              value={newReviewNoteText}
              onChange={(e) => setNewReviewNoteText(e.target.value)}
              placeholder="اكتب ملاحظة أو توجيهاً داخلياً على الخطة..."
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
                backgroundColor: '#2563EB',
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
              <span>{isSubmittingReviewNote ? 'جاري الإرسال...' : 'إضافة ملاحظة'}</span>
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
        onClose={() => setIsAddModalOpen(false)}
        areas={planData?.availableAreas && planData.availableAreas.length > 0 ? planData.availableAreas : planData?.areas || []}
        onAddAction={async (payload) => {
          await addAction(payload);
          await refreshPlansList();
          addToast('success', 'تمت إضافة الإجراء التنفيذي وربطه بمجال التحسين بنجاح.');
        }}
        isSubmitting={isSubmitting}
      />

      {/* Action Progress Modal */}
      <ActionProgressModal
        isOpen={!!editingAction}
        onClose={() => setEditingAction(null)}
        action={editingAction}
        onUpdateAction={updateAction}
        isSubmitting={isSubmitting}
        readOnly={readOnly || planData?.status === 'Archived' || planData?.status === 'Submitted'}
      />

      {/* Attach Evidence Modal */}
      <AttachActionEvidenceModal
        isOpen={isAttachModalOpen}
        onClose={() => {
          setIsAttachModalOpen(false);
          setSelectedActionForEvidence(null);
        }}
        action={selectedActionForEvidence}
        onSuccess={(msg) => addToast('success', msg)}
        onError={(err) => addToast('error', err)}
      />

      {/* Toasts */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
