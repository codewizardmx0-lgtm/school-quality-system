import React, { useState, useEffect } from 'react';
import { StandardsTreePage } from './StandardsTreePage';
import { RubricAssessmentPage } from './RubricAssessmentPage';
import { PendingIndicatorsTable } from '../dashboard/PendingIndicatorsTable';
import { useEvaluatorDashboard } from '../../hooks/useEvaluatorDashboard';
import type { EvaluatorScreen } from '../../api/evaluationTypes';
import {
  ClipboardList,
  SlidersHorizontal,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface UnifiedStandardsAssessmentPageProps {
  initialTab?: 'tree' | 'rubric' | 'pending';
  selectedIndicatorId?: number | null;
  onSelectIndicator: (indicatorId: number) => void;
  onNavigate: (screen: EvaluatorScreen, param?: number) => void;
  isLocked?: boolean;
  isPrincipal?: boolean;
}

export const UnifiedStandardsAssessmentPage: React.FC<UnifiedStandardsAssessmentPageProps> = ({
  initialTab = 'tree',
  selectedIndicatorId,
  onSelectIndicator,
  onNavigate,
  isLocked = false,
  isPrincipal = false,
}) => {
  const [activeTab, setActiveTab] = useState<'tree' | 'rubric' | 'pending'>(initialTab);
  const [currentIndicatorId, setCurrentIndicatorId] = useState<number | null>(selectedIndicatorId ?? null);

  const targetPlanIndicatorId = typeof window !== 'undefined'
    ? sessionStorage.getItem('navigated_from_improvement_plan_indicator_id')
    : null;
  const isFromImprovementPlan = Boolean(
    targetPlanIndicatorId && currentIndicatorId && Number(targetPlanIndicatorId) === currentIndicatorId
  );

  const handleReturnToImprovementPlan = () => {
    sessionStorage.removeItem('navigated_from_improvement_plan');
    sessionStorage.removeItem('navigated_from_improvement_plan_indicator_id');
    onNavigate('improvement-plan');
  };

  const { dashboardData, refreshDashboard } = useEvaluatorDashboard();

  useEffect(() => {
    if (selectedIndicatorId !== undefined && selectedIndicatorId !== null) {
      setCurrentIndicatorId(selectedIndicatorId);
    }
  }, [selectedIndicatorId]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleIndicatorSelect = (id: number) => {
    setCurrentIndicatorId(id);
    onSelectIndicator(id);
    if (targetPlanIndicatorId && Number(targetPlanIndicatorId) !== id) {
      sessionStorage.removeItem('navigated_from_improvement_plan');
      sessionStorage.removeItem('navigated_from_improvement_plan_indicator_id');
    }
    setActiveTab('rubric');
  };

  const pendingCount = dashboardData?.pendingIndicators?.length ?? 0;

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation Tabs Header */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* Tab 1: شجرة المعايير الوطنية */}
          <button
            type="button"
            onClick={() => setActiveTab('tree')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 18px',
              fontSize: '13.5px',
              fontWeight: 800,
              color: activeTab === 'tree' ? '#065F46' : '#64748B',
              border: 'none',
              borderBottom: activeTab === 'tree' ? '3px solid #059669' : '3px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <ClipboardList size={18} color={activeTab === 'tree' ? '#059669' : '#64748B'} />
            <span>شجرة المعايير الوطنية</span>
          </button>

          {/* Tab 2: استمارة الرصد والتقييم */}
          <button
            type="button"
            onClick={() => setActiveTab('rubric')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 18px',
              fontSize: '13.5px',
              fontWeight: 800,
              color: activeTab === 'rubric' ? '#065F46' : '#64748B',
              border: 'none',
              borderBottom: activeTab === 'rubric' ? '3px solid #059669' : '3px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <SlidersHorizontal size={18} color={activeTab === 'rubric' ? '#059669' : '#64748B'} />
            <span>استمارة الرصد والتقييم</span>
          </button>

          {/* Tab 3: عناصر بحاجة لاستيفاء التوثيق */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('pending');
              refreshDashboard();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 18px',
              fontSize: '13.5px',
              fontWeight: 800,
              color: activeTab === 'pending' ? '#065F46' : '#64748B',
              border: 'none',
              borderBottom: activeTab === 'pending' ? '3px solid #059669' : '3px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <AlertCircle size={18} color={activeTab === 'pending' ? '#059669' : '#64748B'} />
            <span>عناصر بحاجة لاستيفاء التوثيق</span>
            {pendingCount > 0 && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '12px',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  border: '1px solid #FECACA',
                }}
              >
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* زر العودة إلى خطة التحسين إذا تم الدخول عبر زر الاختصار في الخطة */}
        {isFromImprovementPlan && (
          <button
            type="button"
            onClick={handleReturnToImprovementPlan}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              backgroundColor: '#ECFDF5',
              color: '#065F46',
              border: '1.5px solid #10B981',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px rgba(5,150,105,0.15)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#D1FAE5';
              e.currentTarget.style.borderColor = '#059669';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ECFDF5';
              e.currentTarget.style.borderColor = '#10B981';
            }}
          >
            <ArrowRight size={14} />
            <span>العودة إلى خطة التحسين</span>
          </button>
        )}
      </div>

      {/* 3. Main Content Rendering */}
      <div style={{ flex: 1 }}>
        {activeTab === 'tree' && (
          <StandardsTreePage
            onSelectIndicator={handleIndicatorSelect}
            onNavigate={onNavigate}
            isLocked={isLocked}
            isPrincipal={isPrincipal}
            onResetSuccess={refreshDashboard}
          />
        )}

        {activeTab === 'rubric' && (
          <RubricAssessmentPage
            selectedIndicatorId={currentIndicatorId}
            onSelectIndicator={(newId) => {
              setCurrentIndicatorId(newId);
              onSelectIndicator(newId);
              if (targetPlanIndicatorId && Number(targetPlanIndicatorId) !== newId) {
                sessionStorage.removeItem('navigated_from_improvement_plan');
                sessionStorage.removeItem('navigated_from_improvement_plan_indicator_id');
              }
            }}
            onNavigate={onNavigate}
            isLocked={isLocked}
            isPrincipal={isPrincipal}
            onResetSuccess={refreshDashboard}
          />
        )}

        {activeTab === 'pending' && (
          <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
            <PendingIndicatorsTable
              indicators={dashboardData?.pendingIndicators || []}
              onOpenIndicator={handleIndicatorSelect}
            />
          </div>
        )}
      </div>
    </div>
  );
};
