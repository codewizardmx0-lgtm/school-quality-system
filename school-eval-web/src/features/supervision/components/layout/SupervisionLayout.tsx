/**
 * Component: SupervisionLayout
 * الهيكل العام والشامل لبوابة المشرف الوزاري - الإدارة العامة لضمان الجودة والاعتماد المدرسي
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 * 
 * - الشريط الجانبي ثابت تماماً (Fixed Sidebar #0B0F19 بعرض 260px)
 * - الشريط العلوي ثابت تماماً (Fixed TopBar 68px)
 * - التمرير حصري لمنطقة المحتوى الداخلية
 * - ثيم الأزرق الملكي (#2563EB / #1D4ED8)
 */

import React, { useState } from 'react';
import { SupervisionSidebar } from './SupervisionSidebar';
import { SupervisionTopBar } from './SupervisionTopBar';
import { SupervisionDashboardPage } from '../dashboard/SupervisionDashboardPage';
import { LaunchCyclePage } from '../cycles/LaunchCyclePage';
import { ReviewSubmissionPage } from '../review/ReviewSubmissionPage';
import { CreateCompletionRequestPage } from '../completion/CreateCompletionRequestPage';
import { SchoolTrackingLogPage } from '../tracking/SchoolTrackingLogPage';
import { CentralReportsPage } from '../reports/CentralReportsPage';
import { HistoricalComparisonPage } from '../reports/HistoricalComparisonPage';
import type { SupervisionScreenKey, PreloadedCompletionItem } from '../../api/supervisionTypes';

interface SupervisionLayoutProps {
  initialScreen?: SupervisionScreenKey;
  onLogout?: () => void;
}

export const SupervisionLayout: React.FC<SupervisionLayoutProps> = ({
  initialScreen = 'dashboard',
  onLogout,
}) => {
  const [activeScreen, setActiveScreen] = useState<SupervisionScreenKey>(initialScreen);

  // سياق الانتقال بين الشاشات
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number>(101);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(104);
  const [preloadedItems, setPreloadedItems] = useState<PreloadedCompletionItem[] | undefined>(
    undefined
  );

  const navigateToScreen = (
    screen: SupervisionScreenKey,
    params?: {
      submissionId?: number;
      schoolId?: number;
      preloadedItems?: PreloadedCompletionItem[];
    }
  ) => {
    if (params?.submissionId) {
      setSelectedSubmissionId(params.submissionId);
    }
    if (params?.schoolId) {
      setSelectedSchoolId(params.schoolId);
    }
    if (params?.preloadedItems) {
      setPreloadedItems(params.preloadedItems);
    }

    setActiveScreen(screen);

    // التمرير السلس لأعلى منطقة المحتوى
    const scrollContainer = document.getElementById('supervision-scroll-area');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderCurrentScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return (
          <SupervisionDashboardPage
            onNavigate={(screen, params) => navigateToScreen(screen, params)}
          />
        );

      case 'cycles-new':
        return <LaunchCyclePage onNavigate={(screen) => navigateToScreen(screen)} />;

      case 'submissions':
        return (
          <ReviewSubmissionPage
            submissionId={selectedSubmissionId}
            schoolId={selectedSchoolId}
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
      />

      {/* 2. منطقة العمل الرئيسية: الشريط العلوي + المحتوى الداخلي القابل للتمرير */}
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
          scopeText="أمانة العاصمة (48 مدرسة)"
          userName="أ. عبدالرحمن الشامي"
          userRole="المشرف الوزاري"
        />

        {/* منطقة المحتوى القابلة للتمرير حصرياً */}
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
          {renderCurrentScreen()}
        </main>
      </div>
    </div>
  );
};
