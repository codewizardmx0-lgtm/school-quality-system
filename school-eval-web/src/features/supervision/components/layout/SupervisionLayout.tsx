/**
 * Component: SupervisionLayout
 * الهيكل العام والشامل لبوابة المشرف الوزاري - الإدارة العامة لضمان الجودة والاعتماد المدرسي
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 * 
 * - الشريط الجانبي ثابت تماماً (Fixed Sidebar #0B0F19 بعرض 260px)
 * - الشريط العلوي ثابت تماماً (Fixed TopBar 68px)
 * - شريط سياق المدرسة الموحد الثابت (Fixed School Context Bar) للشاشات (4، 5، 6، 8)
 * - التمرير حصري لمنطقة المحتوى الداخلية
 * - ثيم الأزرق الملكي (#2563EB / #1D4ED8)
 */

import React, { useState, useEffect } from 'react';
import { SupervisionSidebar } from './SupervisionSidebar';
import { SupervisionTopBar } from './SupervisionTopBar';
import { SchoolContextBar } from './SchoolContextBar';
import { SupervisionDashboardPage } from '../dashboard/SupervisionDashboardPage';
import { CyclesListPage } from '../cycles/CyclesListPage';
import { ReviewSubmissionPage } from '../review/ReviewSubmissionPage';
import { CreateCompletionRequestPage } from '../completion/CreateCompletionRequestPage';
import { SchoolTrackingLogPage } from '../tracking/SchoolTrackingLogPage';
import { CentralReportsPage } from '../reports/CentralReportsPage';
import { HistoricalComparisonPage } from '../reports/HistoricalComparisonPage';
import { SupervisionErrorBoundary } from '../common/SupervisionErrorBoundary';
import { useAuth } from '../../../../features/auth/AuthContext';
import { supervisionApi } from '../../api/supervisionApi';
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
      }}
    >
      {/* 1. الشريط الجانبي الثابت (#0B0F19) */}
      <SupervisionSidebar
        activeScreen={activeScreen}
        onSelectScreen={(screen) => navigateToScreen(screen)}
        onLogout={onLogout}
        selectedSchoolName={selectedSchoolName}
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
          onNavigate={(screen) => navigateToScreen(screen)}
          scopeText={user?.governorate ? user.governorate : 'كافة المحافظات (إشراف مركزي عام)'}
          userName={user?.fullName || user?.username || 'المشرف الوزاري'}
          userRole="المشرف الوزاري"
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
            {renderCurrentScreen()}
          </SupervisionErrorBoundary>
        </main>
      </div>
    </div>
  );
};
