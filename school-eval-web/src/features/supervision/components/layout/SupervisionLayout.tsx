/**
 * Component: SupervisionLayout
 * الهيكل العام والشامل لبوابة المشرف الوزاري - الإدارة العامة لتقويم الجودة المدرسية
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 * 
 * - الشريط الجانبي ثابت تماماً (Fixed Sidebar #0B0F19 بعرض 260px)
 * - الشريط العلوي ثابت تماماً (Fixed TopBar 68px)
 * - شريط سياق المدرسة الموحد الثابت (Fixed School Context Bar) للشاشات (4، 5، 6، 8)
 * - التمرير حصري لمنطقة المحتوى الداخلية
 * - ثيم الأزرق الملكي (#2563EB / #1D4ED8)
 */

import React, { Suspense, lazy, useState, useEffect } from 'react';
import { SupervisionSidebar } from './SupervisionSidebar';
import { SupervisionTopBar } from './SupervisionTopBar';
import { SchoolContextBar } from './SchoolContextBar';
import { SupervisionErrorBoundary } from '../common/SupervisionErrorBoundary';
import { PortalLoader } from '../../../../components/ui/PortalLoader';
import { useAuth } from '../../../../features/auth/AuthContext';
import { supervisionApi } from '../../api/supervisionApi';

const SupervisionDashboardPage = lazy(() => import('../dashboard/SupervisionDashboardPage').then((m) => ({ default: m.SupervisionDashboardPage })));
const CyclesListPage = lazy(() => import('../cycles/CyclesListPage').then((m) => ({ default: m.CyclesListPage })));
const ReviewSubmissionPage = lazy(() => import('../review/ReviewSubmissionPage').then((m) => ({ default: m.ReviewSubmissionPage })));
const CreateCompletionRequestPage = lazy(() => import('../completion/CreateCompletionRequestPage').then((m) => ({ default: m.CreateCompletionRequestPage })));
const SchoolTrackingLogPage = lazy(() => import('../tracking/SchoolTrackingLogPage').then((m) => ({ default: m.SchoolTrackingLogPage })));
const CentralReportsPage = lazy(() => import('../reports/CentralReportsPage').then((m) => ({ default: m.CentralReportsPage })));
const HistoricalComparisonPage = lazy(() => import('../reports/HistoricalComparisonPage').then((m) => ({ default: m.HistoricalComparisonPage })));
import type {
  SupervisionScreenKey,
  PreloadedCompletionItem,
  ReviewableSubmissionItem,
} from '../../api/supervisionTypes';

interface SupervisionLayoutProps {
  initialScreen?: SupervisionScreenKey;
  onLogout?: () => void;
}

export const SupervisionLayout: React.FC<SupervisionLayoutProps> = ({
  initialScreen = 'dashboard',
  onLogout,
}) => {
  const { user } = useAuth();
  const [activeScreen, setActiveScreen] = useState<SupervisionScreenKey>(initialScreen);

  // سياق الانتقال بين الشاشات
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | undefined>(undefined);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | undefined>(undefined);
  const [selectedSchoolName, setSelectedSchoolName] = useState<string | undefined>(undefined);
  const [selectedCycleId, setSelectedCycleId] = useState<number | undefined>(undefined);
  const [prefillCycleLaunch, setPrefillCycleLaunch] = useState<any | undefined>(undefined);
  const [selectedTargetTab, setSelectedTargetTab] = useState<string | undefined>(undefined);
  const [preloadedItems, setPreloadedItems] = useState<PreloadedCompletionItem[] | undefined>(
    undefined
  );

  // قائمة المدارس والمخرجات المتاحة في النطاق الجغرافي للمشرف
  const [availableSubmissions, setAvailableSubmissions] = useState<ReviewableSubmissionItem[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState<boolean>(false);

  // Responsive & Sidebar Collapse state (UI_STANDARDS.md §2 & §7)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });
  const [activeStandardVersion, setActiveStandardVersion] = useState<string>('2026.1');

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

  // جلب رقم إصدار المعايير النشط رسمياً للربط الحي مع تذييل القائمة الجانبية
  useEffect(() => {
    let isMounted = true;
    supervisionApi.getActiveStandardVersion()
      .then((ver) => {
        const num = ver?.versionNumber || (ver as any)?.versionNo;
        if (isMounted && num) {
          setActiveStandardVersion(num);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoadingAvailable(true);
      try {
        const list = await supervisionApi.getReviewableSubmissions();
        if (isMounted) {
          setAvailableSubmissions(list || []);
          if (list && list.length > 0 && !selectedSchoolId) {
            const firstEligible =
              list.find((s) => s.status === 'Submitted' || s.status === 'UnderReview') || list[0];
            setSelectedSchoolId(firstEligible.schoolId);
            setSelectedSubmissionId(firstEligible.submissionId);
            setSelectedSchoolName(firstEligible.schoolName);
          }
        }
      } catch (err) {
        console.error('Failed to load available submissions for context bar:', err);
      } finally {
        if (isMounted) setIsLoadingAvailable(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const navigateToScreen = (
    screen: SupervisionScreenKey,
    params?: {
      cycleId?: number;
      submissionId?: number;
      schoolId?: number;
      schoolName?: string;
      preloadedItems?: PreloadedCompletionItem[];
      prefillCycleLaunch?: any;
      targetTab?: string;
    }
  ) => {
    if (params?.cycleId !== undefined) {
      setSelectedCycleId(params.cycleId);
    }
    if (params?.prefillCycleLaunch !== undefined) {
      setPrefillCycleLaunch(params.prefillCycleLaunch);
    }
    if (params?.submissionId) {
      setSelectedSubmissionId(params.submissionId);
    }
    if (params?.schoolId) {
      setSelectedSchoolId(params.schoolId);
    }
    if (params?.schoolName) {
      setSelectedSchoolName(params.schoolName);
    }
    if (params?.preloadedItems) {
      setPreloadedItems(params.preloadedItems);
    }
    if (params?.targetTab !== undefined) {
      setSelectedTargetTab(params.targetTab);
    }

    setActiveScreen(screen);
    if (isMobile) {
      setIsMobileOpen(false);
    }

    // التمرير السلس لأعلى منطقة المحتوى
    const scrollContainer = document.getElementById('supervision-scroll-area');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isSchoolTrackingScreen = [
    'submissions',
    'completion-requests',
    'tracking-log',
    'historical',
  ].includes(activeScreen);

  const renderCurrentScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return (
          <SupervisionDashboardPage
            cycleId={selectedCycleId}
            onNavigate={(screen, params) => navigateToScreen(screen, params)}
          />
        );

      case 'cycles-list':
        return (
          <CyclesListPage
            initialTab="list"
            prefillData={prefillCycleLaunch}
            onNavigate={(screen, params) => navigateToScreen(screen, params)}
          />
        );

      case 'cycles-new':
        return (
          <CyclesListPage
            initialTab="form"
            prefillData={prefillCycleLaunch}
            onNavigate={(screen, params) => navigateToScreen(screen, params)}
          />
        );

      case 'submissions':
        return (
          <ReviewSubmissionPage
            submissionId={selectedSubmissionId}
            schoolId={selectedSchoolId}
            initialTab={selectedTargetTab === 'standards-tree' ? 'standards' : (selectedTargetTab as any)}
            onSelectSchool={(schoolId, schoolName) => {
              setSelectedSchoolId(schoolId);
              setSelectedSchoolName(schoolName);
            }}
            onNavigate={(screen, params) => navigateToScreen(screen, params)}
          />
        );

      case 'completion-requests':
        return (
          <CreateCompletionRequestPage
            submissionId={selectedSubmissionId}
            schoolId={selectedSchoolId}
            preloadedItems={preloadedItems}
            onNavigate={(screen, params) => navigateToScreen(screen, params)}
          />
        );

      case 'tracking-log':
        return (
          <SchoolTrackingLogPage
            schoolId={selectedSchoolId}
            onNavigate={(screen, params) => navigateToScreen(screen, params)}
          />
        );

      case 'reports':
        return (
          <CentralReportsPage
            cycleId={selectedCycleId}
            onNavigate={(screen, params) => navigateToScreen(screen, params)}
          />
        );

      case 'historical':
        return (
          <HistoricalComparisonPage
            schoolId={selectedSchoolId}
            onNavigate={(screen, params) => navigateToScreen(screen, params)}
          />
        );

      default:
        return (
          <SupervisionDashboardPage
            onNavigate={(screen, params) => navigateToScreen(screen, params)}
          />
        );
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        minHeight: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        backgroundColor: '#F8FAFC',
        direction: 'rtl',
        fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif",
        position: 'relative',
      }}
    >
      {/* Backdrop for Mobile Drawer */}
      {isMobile && isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            zIndex: 9998,
            transition: 'opacity 0.25s ease',
          }}
        />
      )}

      {/* 1. الشريط الجانبي الثابت (#0B0F19) */}
      <SupervisionSidebar
        activeScreen={activeScreen}
        onSelectScreen={(screen) => navigateToScreen(screen)}
        selectedSchoolName={selectedSchoolName}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isMobile={isMobile}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        standardVersionNo={activeStandardVersion}
      />

      {/* 2. منطقة العمل الرئيسية: الشريط العلوي + شريط سياق المدرسة + المحتوى الداخلي */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: '100vh',
          maxHeight: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* الشريط العلوي الثابت بارتفاع 68px */}
        <SupervisionTopBar
          activeScreen={activeScreen}
          onNavigate={(screen, params) => navigateToScreen(screen, params)}
          scopeText={user?.governorate ? user.governorate : 'كافة المحافظات (إشراف مركزي عام)'}
          userName={user?.fullName || user?.username || 'المشرف الوزاري'}
          userRole="المشرف الوزاري"
          isMobile={isMobile}
          onToggleMobileMenu={() => setIsMobileOpen(!isMobileOpen)}
          onLogout={onLogout}
        />

        {/* شريط سياق المدرسة الموحد الثابت للواجهات الأربع (4، 5، 6، 8) */}
        {isSchoolTrackingScreen && (
          <SchoolContextBar
            schools={availableSubmissions}
            selectedSchoolId={selectedSchoolId}
            selectedSubmissionId={selectedSubmissionId}
            isLoading={isLoadingAvailable}
            onSelectSchool={(school) => {
              setSelectedSchoolId(school.schoolId);
              setSelectedSubmissionId(school.submissionId);
              setSelectedSchoolName(school.schoolName);
            }}
          />
        )}

        {/* منطقة المحتوى القابلة للتمرير حصرياً مع جدار حماية من الأخطاء */}
        <main
          id="supervision-scroll-area"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            backgroundColor: '#F8FAFC',
            paddingBottom: '40px',
          }}
        >
          <SupervisionErrorBoundary onNavigateHome={() => navigateToScreen('dashboard')}>
            <Suspense fallback={<PortalLoader inline />}>
              {renderCurrentScreen()}
            </Suspense>
          </SupervisionErrorBoundary>
        </main>
      </div>
    </div>
  );
};
