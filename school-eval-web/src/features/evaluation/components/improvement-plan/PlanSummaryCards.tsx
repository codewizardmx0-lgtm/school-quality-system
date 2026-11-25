import React from 'react';
import { AlertCircle, CheckCircle2, Clock, Target } from 'lucide-react';
import type { ImprovementPlanSummary } from '../../api/evaluationTypes';

interface PlanSummaryCardsProps {
  summary: ImprovementPlanSummary;
  filterStatus: string;
  onSelectFilterStatus: (status: string) => void;
}

/**
 * بطاقات المؤشرات السريعة لإجمالي الإجراءات وتوزيعها حسب الحالة.
 */
export const PlanSummaryCards: React.FC<PlanSummaryCardsProps> = ({
  summary,
  filterStatus,
  onSelectFilterStatus,
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
      }}
    >
      {/* Total Actions */}
      <div
        onClick={() => onSelectFilterStatus('ALL')}
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
        onClick={() => onSelectFilterStatus('InProgress')}
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
        onClick={() => onSelectFilterStatus('Done')}
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
        onClick={() => onSelectFilterStatus('Pending')}
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
  );
};
