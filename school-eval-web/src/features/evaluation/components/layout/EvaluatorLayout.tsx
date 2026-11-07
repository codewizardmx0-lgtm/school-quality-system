import React, { useState, useEffect } from 'react';
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
import { ChangePasswordModal } from '../../../auth/ChangePasswordModal';
import { ProfileModal } from '../../../auth/ProfileModal';
import { useAuth } from '../../../auth/AuthContext';
import { ToastNotification } from '../../../admin/components/common/ToastNotification';
import { useToast } from '../../../admin/components/common/useToast';
import type { EvaluatorScreen } from '../../api/evaluationTypes';
import { ShieldAlert } from 'lucide-react';

interface EvaluatorLayoutProps {
  initialScreen?: EvaluatorScreen;
  onLogout?: () => void;
}

export const EvaluatorLayout: React.FC<EvaluatorLayoutProps> = ({
  initialScreen = 'dashboard',
  onLogout,
}) => {
  const { user, hasPermission } = useAuth();
  const [activeScreen, setActiveScreen] = useState<EvaluatorScreen>(initialScreen);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [hasOpenCompletionRequest, setHasOpenCompletionRequest] = useState<boolean>(true);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const { toasts, addToast, dismissToast } = useToast();

  const isPrincipal = Boolean(
    user?.roles?.some((r) => r.roleName === 'school_principal') ||
    (!hasPermission('evaluations.edit') && user?.userType === 'school')
  );

  const effectiveReadOnly = isLocked || isPrincipal;

  // Responsive & Sidebar Collapse state (UI_STANDARDS.md §2)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavigate = (screen: EvaluatorScreen, param?: number) => {
    if (param !== undefined) {
      setSelectedIndicatorId(param);
    }
    setActiveScreen(screen);
    if (isMobile) {
      setIsMobileOpen(false);
    }
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
            isLocked={effectiveReadOnly}
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
            isLocked={effectiveReadOnly}
          />
        );
      case 'evidences':
        return (
          <EvidencesRepository
            onNavigate={handleNavigate}
            readOnly={effectiveReadOnly}
          />
        );
      case 'ai-assistant':
        return (
          <GapAnalysisPage
            onNavigate={handleNavigate}
            readOnly={effectiveReadOnly}
          />
        );
      case 'improvement-plan':
        return (
          <ImprovementPlanPage
            onNavigate={handleNavigate}
            readOnly={effectiveReadOnly}
          />
        );
      case 'final-review':
        return (
          <InternalReviewPage
            onNavigate={handleNavigate}
            onFinalLockSuccess={handleFinalLockSuccess}
            isLocked={isLocked}
            isPrincipal={isPrincipal}
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
            isLocked={effectiveReadOnly}
          />
        );
    }
  };

  const contentMarginRight = isMobile ? '0' : isCollapsed ? '76px' : '260px';

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
      {/* 1. Evaluator Dark Sidebar (Responsive Drawer on mobile, Collapsible on desktop) */}
      <EvaluatorSidebar
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        hasOpenCompletionRequest={hasOpenCompletionRequest}
        isLocked={isLocked}
        onLogout={onLogout}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isMobile={isMobile}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* 2. Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          marginRight: contentMarginRight,
          transition: 'margin-right 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowX: 'hidden',
        }}
      >
        <EvaluatorTopBar
          addToast={addToast}
          activeScreen={activeScreen}
          hasOpenCompletionRequest={hasOpenCompletionRequest}
          onOpenCompletionRequest={() => setActiveScreen('completion-request')}
          onNavigate={handleNavigate}
          isLocked={isLocked}
          isMobile={isMobile}
          onOpenMobile={() => setIsMobileOpen(true)}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onLogout={onLogout}
        />

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
          {/* Prominent Banner for School Principal View & Internal Review Mode */}
          {isPrincipal && (
            <div
              style={{
                backgroundColor: '#FEF3C7',
                borderBottom: '1px solid #FCD34D',
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#92400E',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              <ShieldAlert size={19} color="#D97706" style={{ flexShrink: 0 }} />
              <span>
                أنت في وضع استعراض التقييم والمراجعة الداخلية — صلاحيات الرصد محصورة بمقيم المدرسة.
              </span>
            </div>
          )}

          {renderScreenContent()}
        </main>
      </div>

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          addToast={addToast}
        />
      )}

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          addToast={addToast}
        />
      )}

      {/* Global Toast Notification Container */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
