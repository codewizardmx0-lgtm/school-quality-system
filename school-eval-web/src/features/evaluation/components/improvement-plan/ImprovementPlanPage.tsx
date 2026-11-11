import { exportToExcel, formatExportFilename } from '../../../admin/utils/exportUtils';
import React, { useState } from 'react';
import { useImprovementPlan } from '../../hooks/useImprovementPlan';
import { AddActionModal } from './AddActionModal';
import { AddPlanModal } from './AddPlanModal';
import { ActionProgressModal } from './ActionProgressModal';
import { AttachActionEvidenceModal } from './AttachActionEvidenceModal';
import { useToast } from '../../../admin/components/common/useToast';
import { ToastNotification } from '../../../admin/components/common/ToastNotification';
import { useAuth } from '../../../auth/AuthContext';
import type { ImprovementPlanAction, ActionStatus, EvaluatorScreen, PlanType } from '../../api/evaluationTypes';
import {
  Target,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Calendar,
  User,
  Edit2,
  Paperclip,
  FolderPlus,
  MessageSquare,
  Send,
  RefreshCw,
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

  const planTypeTabs: { id: PlanType; label: string; desc: string }[] = [
    { id: 'QualityImprovement', label: 'خطة تحسين الجودة المدرسية', desc: 'معالجة الفجوات المعيارية' },
    { id: 'StaffProfessionalDevelopment', label: 'خطة التطوير المهني والتربوي', desc: 'تأهيل وتدريب الكوادر' },
    { id: 'AnnualOperational', label: 'الخطة التشغيلية السنوية', desc: 'البرامج والأنشطة التنفيذية' },
  ];

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedActionForEvidence, setSelectedActionForEvidence] = useState<ImprovementPlanAction | null>(null);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [newReviewNoteText, setNewReviewNoteText] = useState('');
  const [isSubmittingReviewNote, setIsSubmittingReviewNote] = useState(false);
  const { toasts, addToast, dismissToast } = useToast();


  if (isLoading && !planData) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
        جاري تحميل خطة التحسين المدرسي...
      </div>
    );
  }

  const actions = planData?.actions || [];
  const filteredActions = actions.filter((act) => {
    if (filterStatus === 'ALL') return true;
    return act.status === filterStatus;
  });

  const { user } = useAuth();

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
    const schoolName = user?.school?.schoolName || 'مدرسة الفاروق النموذجية';
    const schoolCode = String(user?.school?.schoolId || 'SCH-104');
    exportToExcel(filename, 'خطة التحسين', headers, rows, {
      schoolName,
      schoolCode,
      reportTitle: 'وثيقة خطة التحسين والتطوير المدرسي',
    });
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

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 0. Plan Type Tabs (IMP-04: QualityImprovement, StaffProfessionalDevelopment, AnnualOperational) */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          borderBottom: '2px solid #E2E8F0',
          paddingBottom: '12px',
        }}
      >
        {planTypeTabs.map((tab) => {
          const active = selectedPlanType === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedPlanType(tab.id)}
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

      {/* 1. Header & Actions */}
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
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {planData?.title || 'خطة التحسين والتطوير المدرسي الشاملة 2026/2027'}
            </h2>
            <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '3px', display: 'flex', gap: '12px' }}>
              <span>الفترة: {planData?.startDate || '2026-10-01'} إلى {planData?.endDate || '2027-03-31'}</span>
              <span>•</span>
              <span style={{ color: '#059669', fontWeight: 700 }}>الحالة: نشطة ومعتمدة للمتابعة</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={async () => {
              await refreshPlan();
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

          {!readOnly && (
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

      {/* 2. Three / Four Summary Cards dynamically recalculating */}
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
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            مصفوفة الإجراءات والمسؤوليات الميدانية ({filteredActions.length} إجراء)
          </h3>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            التغيير في حالة الإجراء يُعيد حساب مؤشرات الخطة فورياً
          </span>
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
                      لا توجد إجراءات مطابقة لحالة التصفية الحالية
                    </div>
                    <div style={{ fontSize: '12.5px' }}>
                      يمكنك تغيير تصفية الحالة أو النقر على «إضافة إجراء تنفيذي جديد».
                    </div>
                  </td>
                </tr>
              ) : (
                filteredActions.map((action) => (
              
                <tr
                  key={action.actionId}
                  style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '14px 16px', maxWidth: '320px' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                      {action.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
                      {action.progressDescription}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} color="#64748B" />
                      <span>{action.leader}</span>
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} />
                      <span>{action.startDate} إلى {action.dueDate}</span>
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
                      disabled={readOnly}
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
                        cursor: readOnly ? 'default' : 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="InProgress">قيد التنفيذ</option>
                      <option value="Done">مكتمل</option>
                      <option value="Pending">معلق</option>
                    </select>
                  </td>

                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    {!readOnly && (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Plan Internal Review Notes (GAP-EV-13: plan_review_notes) */}
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
          addToast('success', 'تم إنشاء خطة التحسين وربط مجالاتها بنجاح.');
        }}
        isSubmitting={isSubmitting}
      />

      {/* Add Action Modal */}
      <AddActionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        areas={planData?.areas || planData?.availableAreas || []}
        onAddAction={async (payload) => {
          await addAction(payload);
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
        readOnly={readOnly}
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
