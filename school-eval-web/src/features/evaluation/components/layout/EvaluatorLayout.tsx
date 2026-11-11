import React, { useState, useEffect } from 'react';
import { EvaluatorSidebar } from './EvaluatorSidebar';
import { EvaluatorTopBar } from './EvaluatorTopBar';
import { EvaluatorDashboard } from '../dashboard/EvaluatorDashboard';
import { UnifiedStandardsAssessmentPage } from '../self-evaluation/UnifiedStandardsAssessmentPage';
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
import type { EvaluatorScreen, EvaluatorSchoolInfo, EvaluationCycleArchiveItem } from '../../api/evaluationTypes';
import { evaluatorApi } from '../../api/evaluatorApi';
import { ShieldAlert, AlertTriangle, ArrowLeft, History } from 'lucide-react';

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
  const [hasOpenCompletionRequest, setHasOpenCompletionRequest] = useState<boolean>(false);
  const [schoolInfo, setSchoolInfo] = useState<EvaluatorSchoolInfo | null>(null);
  const [archiveEvaluations, setArchiveEvaluations] = useState<EvaluationCycleArchiveItem[]>([]);
  const [selectedArchiveEvalId, setSelectedArchiveEvalId] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('active_archive_evaluation_id');
      return saved ? Number(saved) : null;
    }
    return null;
  });
  const [notifRefreshKey, setNotifRefreshKey] = useState<number>(0);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const { toasts, addToast, dismissToast } = useToast();

  const isPrincipal = Boolean(
    user?.roles?.some((r) => r.roleName === 'school_principal') ||
    (!hasPermission('evaluations.edit') && user?.userType === 'school')
  );

  const isArchiveMode = selectedArchiveEvalId !== null;
  const effectiveReadOnly = isLocked || isPrincipal || isArchiveMode;

  const handleSelectArchiveEvaluation = (evalId: number | null) => {
    const latestId = archiveEvaluations[0]?.evaluationId;
    if (evalId === null || (latestId && evalId === latestId)) {
      sessionStorage.removeItem('active_archive_evaluation_id');
      setSelectedArchiveEvalId(null);
      addToast('info', 'تمت العودة إلى الدورة التقييمية الحالية النشطة.');
    } else {
      sessionStorage.setItem('active_archive_evaluation_id', String(evalId));
      setSelectedArchiveEvalId(evalId);
      addToast('info', 'تم التبديل إلى استعراض دورة سابقة (وضع القراءة فقط).');
    }
  };

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

  // جلب قائمة الدورات للأرشيف ومزامنة حالة طلب الاستكمال وقفل التقييم من قاعدة البيانات الفعلية
  useEffect(() => {
    let mounted = true;
    evaluatorApi.getSchoolEvaluations()
      .then((list) => {
        if (mounted) setArchiveEvaluations(list);
      })
      .catch(() => {});

    evaluatorApi.getDashboardStats()
      .then((data) => {
        if (!mounted || !data) return;
        setHasOpenCompletionRequest(Boolean(data.completionAlert));
        if (data.schoolInfo) {
          setSchoolInfo(data.schoolInfo);
          setIsLocked(data.schoolInfo.status === 'Submitted' || data.schoolInfo.status === 'Completed');
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [user?.userId, selectedArchiveEvalId]);

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
          <UnifiedStandardsAssessmentPage
            initialTab="tree"
            selectedIndicatorId={selectedIndicatorId}
            onSelectIndicator={(id) => {
              setSelectedIndicatorId(id);
            }}
            onNavigate={handleNavigate}
            isLocked={effectiveReadOnly}
          />
        );
      case 'rubric-assessment':
        return (
          <UnifiedStandardsAssessmentPage
            initialTab="rubric"
            selectedIndicatorId={selectedIndicatorId}
            onSelectIndicator={(id) => {
              setSelectedIndicatorId(id);
            }}
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
            onNotificationsChanged={() => setNotifRefreshKey((k) => k + 1)}
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
        height: '100vh',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
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
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          marginRight: contentMarginRight,
          transition: 'margin-right 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
        }}
      >
        <EvaluatorTopBar
          addToast={addToast}
          activeScreen={activeScreen}
          schoolInfo={schoolInfo}
          hasOpenCompletionRequest={hasOpenCompletionRequest}
          onOpenCompletionRequest={() => setActiveScreen('completion-request')}
          onNavigate={handleNavigate}
          isLocked={effectiveReadOnly}
          isMobile={isMobile}
          onOpenMobile={() => setIsMobileOpen(true)}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onLogout={() => {
            sessionStorage.removeItem('active_archive_evaluation_id');
            onLogout?.();
          }}
          notifRefreshKey={notifRefreshKey}
          archiveEvaluations={archiveEvaluations}
          selectedArchiveEvalId={selectedArchiveEvalId}
          onSelectArchiveEvaluation={handleSelectArchiveEvaluation}
        />

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
          {/* Archive Read-Only Banner (IMP-06) */}
          {isArchiveMode && (
            <div
              style={{
                backgroundColor: '#EFF6FF',
                borderBottom: '1px solid #BFDBFE',
                padding: '10px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                color: '#1E40AF',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} color="#2563EB" />
                <span>
                  وضع استعراض الأرشيف التاريخي: أنت تعرض دورة تقييم سابقة في وضع القراءة فقط (يُحظر التعديل أو الحذف).
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSelectArchiveEvaluation(null)}
                style={{
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                العودة للدورة الحالية النشطة
              </button>
            </div>
          )}

          {/* Distinct Banner for Ministerial Supervisor Completion Request */}
          {hasOpenCompletionRequest && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                borderBottom: '1px solid #FCA5A5',
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                color: '#991B1B',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={19} color="#DC2626" style={{ flexShrink: 0 }} />
                <span>
                  يوجد طلب استكمال شواهد وملاحظات وارد من المشرف الوزاري بحاجة إلى معالجتك واستيفاء الشواهد المطلوبة.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveScreen('completion-request')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>معالجة طلب الاستكمال</span>
                <ArrowLeft size={14} />
              </button>
            </div>
          )}

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

          <div key={selectedArchiveEvalId ?? 'current'}>
            {renderScreenContent()}
          </div>
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
