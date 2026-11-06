import React, { useState } from 'react';
import { EvaluatorSidebar } from './EvaluatorSidebar';
import { EvaluatorTopBar } from './EvaluatorTopBar';
import { EvaluatorDashboard } from '../dashboard/EvaluatorDashboard';
import { StandardsTreePage } from '../self-evaluation/StandardsTreePage';
import { RubricAssessmentPage } from '../self-evaluation/RubricAssessmentPage';
import { EvidencesRepository } from '../evidences/EvidencesRepository';
import { GapAnalysisPage } from '../ai-assistant/GapAnalysisPage';
import { ImprovementPlanPage } from '../improvement-plan/ImprovementPlanPage';
import { InternalReviewPage } from '../final-review/InternalReviewPage';
import { HandleCompletionPage } from '../completion-request/HandleCompletionPage';
import { NotificationsCenter } from '../notifications/NotificationsCenter';
import type { EvaluatorScreen } from '../../api/evaluationTypes';

interface EvaluatorLayoutProps {
  initialScreen?: EvaluatorScreen;
  onLogout?: () => void;
}

export const EvaluatorLayout: React.FC<EvaluatorLayoutProps> = ({
  initialScreen = 'dashboard',
  onLogout,
}) => {
  const [activeScreen, setActiveScreen] = useState<EvaluatorScreen>(initialScreen);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [hasOpenCompletionRequest, setHasOpenCompletionRequest] = useState<boolean>(true);

  const handleNavigate = (screen: EvaluatorScreen, param?: number) => {
    if (param !== undefined) {
      setSelectedIndicatorId(param);
    }
    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalLockSuccess = () => {
    setIsLocked(true);
    setHasOpenCompletionRequest(false);
  };

  const renderScreenContent = () => {
    switch (activeScreen) {
      case 'dashboard':
        return (
          <EvaluatorDashboard
            onNavigate={handleNavigate}
            isLocked={isLocked}
          />
        );
      case 'standards-tree':
        return (
          <StandardsTreePage
            onSelectIndicator={(id) => {
              setSelectedIndicatorId(id);
              setActiveScreen('rubric-assessment');
            }}
            onNavigate={handleNavigate}
          />
        );
      case 'rubric-assessment':
        return (
          <RubricAssessmentPage
            selectedIndicatorId={selectedIndicatorId}
            onNavigate={handleNavigate}
            isLocked={isLocked}
          />
        );
      case 'evidences':
        return (
          <EvidencesRepository
            onNavigate={handleNavigate}
            readOnly={isLocked}
          />
        );
      case 'ai-assistant':
        return (
          <GapAnalysisPage
            onNavigate={handleNavigate}
            readOnly={isLocked}
          />
        );
      case 'improvement-plan':
        return (
          <ImprovementPlanPage
            onNavigate={handleNavigate}
            readOnly={isLocked}
          />
        );
      case 'final-review':
        return (
          <InternalReviewPage
            onNavigate={handleNavigate}
            onFinalLockSuccess={handleFinalLockSuccess}
            isLocked={isLocked}
          />
        );
      case 'completion-request':
        return (
          <HandleCompletionPage
            onNavigate={handleNavigate}
          />
        );
      case 'notifications':
        return (
          <NotificationsCenter
            onNavigate={handleNavigate}
          />
        );
      default:
        return (
          <EvaluatorDashboard
            onNavigate={handleNavigate}
            isLocked={isLocked}
          />
        );
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        direction: 'rtl',
        fontFamily: "'Cairo', 'Tajawal', system-ui, -apple-system, sans-serif",
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
      }}
    >
      {/* 1. Evaluator Dark Sidebar */}
      <EvaluatorSidebar
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        hasOpenCompletionRequest={hasOpenCompletionRequest}
        isLocked={isLocked}
        onLogout={onLogout}
      />

      {/* 2. Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        <EvaluatorTopBar
          activeScreen={activeScreen}
          hasOpenCompletionRequest={hasOpenCompletionRequest}
          onOpenCompletionRequest={() => setActiveScreen('completion-request')}
          onNavigate={handleNavigate}
          isLocked={isLocked}
        />

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
          {renderScreenContent()}
        </main>
      </div>
    </div>
  );
};
