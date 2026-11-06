/**
 * index.ts
 * Unified feature export module for School Evaluator Suite (ERTEQA Platform)
 */

export * from './api/evaluationTypes';
export * from './api/evaluatorApi';

export * from './hooks/useEvaluatorDashboard';
export * from './hooks/useSelfEvaluation';
export * from './hooks/useEvidences';
export * from './hooks/useAiAnalysis';
export * from './hooks/useImprovementPlan';
export * from './hooks/useFinalSubmission';
export * from './hooks/useCompletionRequest';

export * from './components/layout/EvaluatorLayout';
export * from './components/layout/EvaluatorSidebar';
export * from './components/layout/EvaluatorTopBar';

export * from './components/dashboard/EvaluatorDashboard';
export * from './components/dashboard/CycleProgressTracker';
export * from './components/dashboard/StandardsProgressBar';
export * from './components/dashboard/PendingIndicatorsTable';

export * from './components/self-evaluation/StandardsTreePage';
export * from './components/self-evaluation/RubricAssessmentPage';
export * from './components/self-evaluation/EvidenceUploader';
export * from './components/self-evaluation/EvaluatorJustification';

export * from './components/evidences/EvidencesRepository';
export * from './components/evidences/EvidenceCard';
export * from './components/evidences/UploadEvidenceModal';

export * from './components/ai-assistant/GapAnalysisPage';
export * from './components/ai-assistant/AiRecommendationCard';
export * from './components/ai-assistant/TransferToActionModal';

export * from './components/improvement-plan/ImprovementPlanPage';
export * from './components/improvement-plan/AddActionModal';
export * from './components/improvement-plan/ActionProgressModal';

export * from './components/final-review/InternalReviewPage';
export * from './components/final-review/DraftReportPreview';
export * from './components/final-review/FinalSubmissionLockModal';

export * from './components/completion-request/HandleCompletionPage';
export * from './components/notifications/NotificationsCenter';
