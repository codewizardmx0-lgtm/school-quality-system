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
} from 'lucide-react';

interface UnifiedStandardsAssessmentPageProps {
  initialTab?: 'tree' | 'rubric' | 'pending';
  selectedIndicatorId?: number | null;
  onSelectIndicator: (indicatorId: number) => void;
  onNavigate: (screen: EvaluatorScreen, param?: number) => void;
  isLocked?: boolean;
}

export const UnifiedStandardsAssessmentPage: React.FC<UnifiedStandardsAssessmentPageProps> = ({
  initialTab = 'tree',
  selectedIndicatorId,
  onSelectIndicator,
  onNavigate,
  isLocked = false,
}) => {
  const [activeTab, setActiveTab] = useState<'tree' | 'rubric' | 'pending'>(initialTab);
  const [currentIndicatorId, setCurrentIndicatorId] = useState<number | null>(selectedIndicatorId ?? null);

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
      </div>

      {/* 3. Main Content Rendering */}
      <div style={{ flex: 1 }}>
        {activeTab === 'tree' && (
          <StandardsTreePage
            onSelectIndicator={handleIndicatorSelect}
            onNavigate={onNavigate}
            isLocked={isLocked}
            onResetSuccess={refreshDashboard}
          />
        )}

        {activeTab === 'rubric' && (
          <RubricAssessmentPage
            selectedIndicatorId={currentIndicatorId}
            onNavigate={onNavigate}
            isLocked={isLocked}
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
