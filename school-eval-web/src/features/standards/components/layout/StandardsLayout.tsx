/**
 * Component: StandardsLayout
 * الهيكل العام والشامل لبوابة مسؤول إدارة المرجعية والمعايير
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 * - الشريط الجانبي ثابت تماماً (Fixed Sidebar #0B0F19 بعرض 260px)
 * - الشريط العلوي ثابت تماماً (Fixed TopBar 68px)
 * - التمرير حصري لمنطقة المحتوى الداخلية
 */

import React, { useState, useEffect } from 'react';
import '../../styles/standards.css';
import { StandardsSidebar, type StandardsScreenKey } from './StandardsSidebar';
import { StandardsTopBar } from './StandardsTopBar';
import { StandardsVersionsPage } from '../versions/StandardsVersionsPage';
import { StandardVersionWorkspacePage, type WorkspaceTabKey } from '../workspace/StandardVersionWorkspacePage';
import { StandardsDiffLogPage } from '../diff-log/StandardsDiffLogPage';
import { useStandardsVersions } from '../../hooks/useStandardsVersions';

interface StandardsLayoutProps {
  initialScreen?: StandardsScreenKey;
  onLogout?: () => void;
}

export const StandardsLayout: React.FC<StandardsLayoutProps> = ({
  initialScreen = 'versions',
  onLogout,
}) => {
  const [activeScreen, setActiveScreen] = useState<StandardsScreenKey>(initialScreen);
  const [selectedVersionId, setSelectedVersionId] = useState<number | undefined>(undefined);

  // Responsive & Sidebar Collapse state (UI_STANDARDS.md §2 & §7)
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

  const {
    versions,
    activeVersion,
    isLoading,
    error,
    refetch,
    createDraft,
    duplicateVersion,
    deleteVersion,
  } = useStandardsVersions();

  const currentVersionId = selectedVersionId || activeVersion?.versionId || 1;

  const navigateToScreen = (screen: StandardsScreenKey, versionId?: number | string) => {
    if (versionId) {
      setSelectedVersionId(Number(versionId));
    }
    setActiveScreen(screen);
    if (isMobile) {
      setIsMobileOpen(false);
    }
    // التمرير إلى أعلى منطقة المحتوى القابلة للتمرير
    const contentEl = document.getElementById('standards-scroll-area');
    if (contentEl) {
      contentEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'versions':
        return (
          <StandardsVersionsPage
            versions={versions}
            activeVersion={activeVersion}
            isLoading={isLoading}
            error={error}
            onRefresh={refetch}
            onCreateDraft={createDraft}
            onDuplicateVersion={duplicateVersion}
            onDeleteVersion={deleteVersion}
            onNavigateToTree={(id) => navigateToScreen('tree', id)}
            onNavigateToWeights={(id) => navigateToScreen('weights', id)}
            onNavigateToLock={(id) => navigateToScreen('audit-lock', id)}
          />
        );

      case 'workspace':
      case 'tree':
      case 'weights':
        return (
          <StandardVersionWorkspacePage
            key={`workspace-${currentVersionId}`}
            initialVersionId={currentVersionId}
            initialTab={(activeScreen === 'weights' ? 'weights' : 'tree') as WorkspaceTabKey}
            onNavigateToVersions={() => navigateToScreen('versions')}
          />
        );

      case 'diff-log':
        return (
          <StandardsDiffLogPage
            initialTargetVersionId={currentVersionId}
            onNavigateToWorkspace={(id) => navigateToScreen('workspace', id)}
          />
        );

      case 'audit-lock':
        return (
          <StandardVersionWorkspacePage
            key={`workspace-${currentVersionId}`}
            initialVersionId={currentVersionId}
            initialTab="audit-lock"
            onNavigateToVersions={() => navigateToScreen('versions')}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      dir="rtl"
      className="std-root-layout"
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100vw',
        maxWidth: '100vw',
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        backgroundColor: '#F8FAFC',
        direction: 'rtl',
        fontFamily: "'Cairo', 'Tajawal', system-ui, -apple-system, sans-serif",
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

      {/* 1. Dark Slate Fixed Sidebar (#0B0F19) */}
      <StandardsSidebar
        activeScreen={activeScreen}
        onSelectScreen={(screen) => navigateToScreen(screen)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isMobile={isMobile}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* 2. Main Workspace Container */}
      <div
        className="std-main-workspace"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: '100vh',
          maxHeight: '100vh',
          overflow: 'hidden',
          backgroundColor: '#F8FAFC',
          position: 'relative',
        }}
      >
        {/* 3. Fixed TopBar (68px) */}
        <StandardsTopBar
          activeScreen={activeScreen}
          activeVersionNo={activeVersion?.versionNo}
          onNavigateHome={() => navigateToScreen('versions')}
          isMobile={isMobile}
          onToggleMobileMenu={() => setIsMobileOpen(!isMobileOpen)}
          onLogout={onLogout}
        />

        {/* 4. Independent Scrollable Content View */}
        <main
          id="standards-scroll-area"
          className="std-scrollable-content"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '28px 36px 64px',
          }}
        >
          {renderScreen()}
        </main>
      </div>
    </div>
  );
};
