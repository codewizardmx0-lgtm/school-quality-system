/**
 * Standards & Reference Authority Feature Suite
 * بوابة أمانة المعايير ومجلس الاعتماد الأكاديمي
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 */

export * from './api/standardsTypes';
export * from './api/standardsApi';
export * from './hooks/useStandardsVersions';
export * from './hooks/useStandardsTree';
export * from './hooks/useWeightsRubrics';
export * from './hooks/useVersionAuditLock';
export * from './utils/treeCalculators';
export * from './utils/standardsExportUtils';

// Components
export { StandardsLayout } from './components/layout/StandardsLayout';
export { StandardsSidebar } from './components/layout/StandardsSidebar';
export { StandardsTopBar } from './components/layout/StandardsTopBar';
export type { StandardsScreenKey } from './components/layout/StandardsSidebar';

export { StandardsVersionsPage } from './components/versions/StandardsVersionsPage';
export { CreateDraftModal } from './components/versions/CreateDraftModal';
export { VersionRuleCallout } from './components/versions/VersionRuleCallout';

export { StandardsTreeBuilderPage } from './components/tree-builder/StandardsTreeBuilderPage';
export { StandardsTreeView } from './components/tree-builder/StandardsTreeView';
export { IndicatorEditorPanel } from './components/tree-builder/IndicatorEditorPanel';
export { AddSubStandardModal } from './components/tree-builder/AddSubStandardModal';
export { AddIndicatorModal } from './components/tree-builder/AddIndicatorModal';

export { StandardsWeightsRubricsPage } from './components/weights-rubrics/StandardsWeightsRubricsPage';
export { WeightsBalanceBanner } from './components/weights-rubrics/WeightsBalanceBanner';
export { WeightsDistributionTable } from './components/weights-rubrics/WeightsDistributionTable';
export { RubricLevelsGuide } from './components/weights-rubrics/RubricLevelsGuide';

export { VersionAuditLockPage } from './components/audit-lock/VersionAuditLockPage';
export { DiffTimelineView } from './components/audit-lock/DiffTimelineView';
export { GovernanceChecksList } from './components/audit-lock/GovernanceChecksList';
export { OfficialLockSealModal } from './components/audit-lock/OfficialLockSealModal';

export { BalanceIndicatorPill } from './components/common/BalanceIndicatorPill';
export { EmptyStandardsState } from './components/common/EmptyStandardsState';
