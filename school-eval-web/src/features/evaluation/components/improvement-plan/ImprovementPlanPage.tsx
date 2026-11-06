import React, { useState } from 'react';
import { useImprovementPlan } from '../../hooks/useImprovementPlan';
import { AddActionModal } from './AddActionModal';
import { ActionProgressModal } from './ActionProgressModal';
import type { ActionStatus, EvaluatorScreen } from '../../api/evaluationTypes';
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
} from 'lucide-react';

interface ImprovementPlanPageProps {
  onNavigate?: (screen: EvaluatorScreen) => void;
  readOnly?: boolean;
}

export const ImprovementPlanPage: React.FC<ImprovementPlanPageProps> = ({
  readOnly = false,
}) => {
  const {
    planData,
    summary,
    isLoading,
    isSubmitting,
    editingAction,
    setEditingAction,
    addAction,
    updateAction,
  } = useImprovementPlan();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

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

  const handleExportPlan = () => {
    const header = '\uFEFFرقم الإجراء,عنوان الإجراء,المعيار,المسؤول,البداية,الاستحقاق,الحالة,نسبة الإنجاز,وصف التقدم\n';
    const rows = actions
      .map(
        (a) =>
          `"${a.actionId}","${a.title}","${a.standardName}","${a.leader}","${a.startDate}","${a.dueDate}","${a.statusArabic}","${a.completionPercentage}%","${a.progressDescription}"`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `خطة_التحسين_المدرسي_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDirectStatusChange = (actionId: number, newStatus: ActionStatus) => {
    if (readOnly) return;
    updateAction(actionId, {
      status: newStatus,
      completionPercentage: newStatus === 'Done' ? 100 : newStatus === 'Pending' ? 0 : undefined,
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
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
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
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
              {filteredActions.map((action) => (
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
                      title="تعديل التفاصيل ووصف الإنجاز الميداني"
                    >
                      <Edit2 size={13} />
                      تحديث
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Action Modal */}
      <AddActionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddAction={addAction}
        isSubmitting={isSubmitting}
      />

      {/* Action Progress Modal */}
      <ActionProgressModal
        isOpen={!!editingAction}
        onClose={() => setEditingAction(null)}
        action={editingAction}
        onUpdateAction={updateAction}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
