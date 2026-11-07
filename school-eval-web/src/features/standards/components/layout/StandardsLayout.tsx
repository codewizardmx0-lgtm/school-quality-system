/**
 * Component: StandardsLayout
 * الهيكل العام والشامل لبوابة مسؤول إدارة المرجعية والمعايير
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 * - الشريط الجانبي ثابت تماماً (Fixed Sidebar #0B0F19 بعرض 260px)
 * - الشريط العلوي ثابت تماماً (Fixed TopBar 68px)
 * - التمرير حصري لمنطقة المحتوى الداخلية
 */

import React, { useState } from 'react';
import '../../styles/standards.css';
import { StandardsSidebar, type StandardsScreenKey } from './StandardsSidebar';
import { StandardsTopBar } from './StandardsTopBar';
import { StandardsVersionsPage } from '../versions/StandardsVersionsPage';
import { StandardsTreeBuilderPage } from '../tree-builder/StandardsTreeBuilderPage';
import { StandardsWeightsRubricsPage } from '../weights-rubrics/StandardsWeightsRubricsPage';
import { VersionAuditLockPage } from '../audit-lock/VersionAuditLockPage';
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

  const {
    versions,
    activeVersion,
    isLoading,
    error,
    refetch,
    createDraft,
    duplicateVersion,
  } = useStandardsVersions();

  const currentVersionId = selectedVersionId || activeVersion?.versionId || 1;

  const navigateToScreen = (screen: StandardsScreenKey, versionId?: number | string) => {
    if (versionId) {
      setSelectedVersionId(Number(versionId));
    }
    setActiveScreen(screen);
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
            onNavigateToTree={(id) => navigateToScreen('tree', id)}
            onNavigateToWeights={(id) => navigateToScreen('weights', id)}
            onNavigateToLock={(id) => navigateToScreen('audit-lock', id)}
          />
        );

      case 'tree':
        return (
          <StandardsTreeBuilderPage
            versionId={currentVersionId}
            onNavigateToVersions={() => navigateToScreen('versions')}
            onNavigateToWeights={(id) => navigateToScreen('weights', id)}
          />
        );

      case 'weights':
        return (
          <StandardsWeightsRubricsPage
            versionId={currentVersionId}
            onNavigateToTree={(id) => navigateToScreen('tree', id)}
            onNavigateToLock={(id) => navigateToScreen('audit-lock', id)}
          />
        );

      case 'audit-lock':
        return (
          <VersionAuditLockPage
            versionId={currentVersionId}
            onNavigateToWeights={(id) => navigateToScreen('weights', id)}
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
      }}
    >
      {/* 1. Dark Slate Fixed Sidebar (#0B0F19) */}
      <StandardsSidebar
        activeScreen={activeScreen}
        onSelectScreen={setActiveScreen}
        onLogout={onLogout}
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
          onNavigateHome={() => setActiveScreen('versions')}
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
