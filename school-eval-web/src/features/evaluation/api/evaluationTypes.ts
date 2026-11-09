/**
 * evaluationTypes.ts
 * Strict TypeScript domain models & interfaces according to conventions.md (§3, §5, §10, §11)
 */

export type SubmissionStatus = 'Draft' | 'Submitted' | 'UnderReview' | 'NeedsCompletion' | 'Completed';
export type CompletionStatus = 'Pending' | 'Completed';
export type PriorityLevel = 'Low' | 'Medium' | 'High';
export type PlanStatus = 'Draft' | 'Active' | 'Completed' | 'Cancelled';
export type ActionStatus = 'Pending' | 'InProgress' | 'Done' | 'Cancelled';
export type RequestStatus = 'Open' | 'Resolved';
export type ItemStatus = 'Pending' | 'Resolved';
export type AiAnalysisStatus = 'Pending' | 'Completed' | 'Failed';
export type AiRecommendationStatus = 'PendingReview' | 'Accepted' | 'Modified' | 'Ignored';
export type AiRecommendationType = 'strength' | 'improvement' | 'recommendation' | 'draft';
export type VerificationTagStatus = 'Compliant' | 'NeedsReplacement' | 'UnderReview';

export interface EvaluatorSchoolInfo {
  schoolId: number;
  schoolName: string;
  status: SubmissionStatus;
  statusArabic: string;
  currentEvaluator: string;
  academicYear: string;
  cycleName: string;
}

export interface EvaluatorKpis {
  completionPercentage: number;
  totalIndicators: number;
  scoredIndicators: number;
  documentedEvidences: number;
  targetEvidences: number;
  strengthsCount: number;
  gapsCount: number;
  scoreDistribution?: {
    level3: number;
    level2: number;
    level1: number;
    level0: number;
    unscored: number;
  };
  firstUnscoredIndicatorId?: number | null;
}

export interface CycleStep {
  id: number;
  label: string;
  status: 'completed' | 'current' | 'pending';
  date: string;
  description?: string;
}

export interface StandardProgressItem {
  standardId: number;
  code: string;
  title: string;
  totalIndicators: number;
  scoredIndicators: number;
  percentage: number;
  averageScore?: number;
  scoreDistribution?: {
    level3: number;
    level2: number;
    level1: number;
    level0: number;
    unscored: number;
  };
}

export interface PendingIndicatorItem {
  indicatorId: number;
  code: string;
  name: string;
  standardName: string;
  status: string;
  scoreStatus?: 'scored' | 'unscored';
  scoreStatusArabic?: string;
  evidenceStatus?: 'sufficient' | 'missing';
  evidenceStatusArabic?: string;
  evidenceCount?: number;
  score?: number | null;
}

export interface CompletionAlert {
  requestId: number;
  message: string;
  deadline: string;
  itemsCount: number;
}

export interface EvaluatorDashboardData {
  schoolInfo: EvaluatorSchoolInfo;
  kpis: EvaluatorKpis;
  cycleSteps: CycleStep[];
  standardsProgress: StandardProgressItem[];
  pendingIndicators: PendingIndicatorItem[];
  completionAlert: CompletionAlert | null;
}

export interface ScoreDescriptor {
  descriptorId: number;
  level: number; // 0, 1, 2, 3
  title: string;
  description: string;
}

export interface VerificationMethod {
  id: number;
  name: string;
  description?: string;
}

export interface EvidenceRequirementItem {
  id: number;
  title: string;
  description?: string;
  required: boolean;
}

export interface IndicatorNode {
  indicatorId: number;
  code: string;
  title: string;
  description: string;
  weight: number;
  score?: number | null;
  evidenceCount?: number;
  descriptors: ScoreDescriptor[];
  verificationMethods: VerificationMethod[];
  evidenceRequirements?: EvidenceRequirementItem[];
}

export interface SubStandardNode {
  subStandardId: number;
  code: string;
  title: string;
  indicators: IndicatorNode[];
}

export interface StandardStats {
  totalIndicators: number;
  scoredIndicators: number;
  unenteredIndicators: number;
  level3Count: number;
  level2Count: number;
  level1Count: number;
  level0Count: number;
  totalEvidences: number;
}

export interface StandardNode {
  standardId: number;
  code: string;
  title: string;
  description: string;
  weight: number;
  stats?: StandardStats;
  subStandards: SubStandardNode[];
}

export interface StandardsTreeData {
  versionId: number;
  versionCode: string;
  title: string;
  standards: StandardNode[];
}

export interface LinkedEvidenceBrief {
  linkId: number;
  documentId?: number;
  title: string;
  fileName: string;
  fileSize: number;
  versionNumber: number;
  status?: string;
}

export interface EvaluationResultData {
  resultId: number | null;
  evaluationId: number;
  indicatorId: number;
  score: number | null;
  scoreDescriptorId: number | null;
  completionStatus: CompletionStatus;
  justification: string;
  verificationMethods: number[];
  evidenceLinks: LinkedEvidenceBrief[];
  evidenceRequirements?: EvidenceRequirementItem[];
  updatedAt?: string;
}

export interface SaveEvaluationResultPayload {
  indicatorId: number;
  score: number;
  scoreDescriptorId?: number | null;
  justification?: string;
  verificationMethods?: number[];
  completionStatus?: CompletionStatus;
}

export interface EvidenceVaultStats {
  totalEvidences: number;
  compliantEvidences: number;
  needsReplacement: number;
  storageUsedMb: number;
  storageLimitMb: number;
  storagePercentage: number;
}

export interface EvidenceItem {
  id: number;
  documentId: number;
  linkId?: number;
  indicatorId?: number;
  title: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  formattedSize: string;
  versionNumber: number;
  standardCode: string;
  standardName: string;
  indicatorCode: string;
  indicatorTitle: string;
  uploadedAt: string;
  uploadedBy: string;
  verificationStatus: VerificationTagStatus;
  verificationStatusArabic: string;
}

export interface EvidencesRepositoryResponse {
  vaultStats: EvidenceVaultStats;
  evidences: EvidenceItem[];
}

export interface UploadEvidencePayload {
  file: File;
  title?: string;
  indicatorId?: number;
  actionId?: number;
  notes?: string;
  documentId?: number; // for replacing an existing evidence with a new version
}

export interface AiStrengthWeakness {
  id: number;
  title: string;
  description: string;
  priority: PriorityLevel;
}

export interface AiInitiative {
  id: number;
  title: string;
  description: string;
  priority: PriorityLevel;
  status: AiRecommendationStatus;
  humanModifications?: string | null;
}

export interface AiAnalysisData {
  analysisId: number;
  summary: string;
  averageScore: number;
  evaluatedEvidences: number;
  totalEvidences: number;
  suggestedInitiativesCount: number;
  createdAt: string;
}

export interface AiRecommendationsResponse {
  analysisId: number;
  summary?: string;
  strengths: AiStrengthWeakness[];
  improvements: AiStrengthWeakness[];
  initiatives: AiInitiative[];
}

export interface ImprovementPlanAction {
  actionId: number;
  planId: number;
  title: string;
  standardName: string;
  leader: string;
  startDate: string;
  dueDate: string;
  status: ActionStatus;
  statusArabic: string;
  completionPercentage: number;
  progressDescription: string;
  evidences?: { evidenceId: number; title: string; fileName: string }[];
}

export interface ImprovementPlanSummary {
  totalActions: number;
  inProgressActions: number;
  doneActions: number;
  pendingActions: number;
}

export interface ImprovementPlanData {
  planId: number;
  title: string;
  status: PlanStatus;
  startDate: string;
  endDate: string;
  summary: ImprovementPlanSummary;
  actions: ImprovementPlanAction[];
}

export interface CreateImprovementActionPayload {
  title: string;
  leader?: string;
  startDate?: string;
  dueDate?: string;
  status?: ActionStatus;
  progressDescription?: string;
  completionPercentage?: number;
  recommendationId?: number;
}

export interface UpdateImprovementActionPayload {
  title?: string;
  leader?: string;
  startDate?: string;
  dueDate?: string;
  status?: ActionStatus;
  progressDescription?: string;
  completionPercentage?: number;
}

export interface PreflightCheckCriterion {
  id: string;
  title: string;
  description: string;
  passed: boolean;
  weight: number;
}

export interface PreflightCheckData {
  canSubmit: boolean;
  readinessPercentage: number;
  passedCriteriaCount: number;
  totalCriteriaCount: number;
  checklist: PreflightCheckCriterion[];
  digitalSealInfo: {
    systemCode: string;
    hashAlgorithm: string;
    submissionNotice: string;
  };
}

export interface FinalSubmissionResponse {
  submissionId: number;
  reportId: number;
  status: SubmissionStatus;
  trackingCode: string;
  digitalHash: string;
  submittedAt: string;
  evaluatorName: string;
  isReadOnlyLocked: boolean;
}

export interface FlaggedCompletionItem {
  itemId: number;
  indicatorId: number;
  indicatorCode: string;
  indicatorTitle: string;
  standardTitle: string;
  missingDescription: string;
  status: ItemStatus;
  resolutionNotes: string;
}

export interface CompletionRequestData {
  requestId: number;
  status: RequestStatus;
  supervisorName: string;
  issuedAt: string;
  completionDeadline: string;
  remainingDays: number;
  supervisorGeneralNotes: string;
  flaggedItems: FlaggedCompletionItem[];
}

export type EvaluatorScreen =
  | 'dashboard'
  | 'standards-tree'
  | 'rubric-assessment'
  | 'evidences'
  | 'ai-assistant'
  | 'improvement-plan'
  | 'final-review'
  | 'completion-request'
  | 'notifications';


export interface ActionCatalogItem {
  catalog_id: number;
  sub_standard_code: string;
  plan_type: string;
  action_title?: string;
  title?: string;
  description: string;
  target_score?: number | string;
  target_description?: string;
  timeframe?: string;
  duration_days?: number;
  responsible_role?: string;
  responsible_party?: string;
}

export interface ImprovementSuggestion {
  resultId: number;
  indicatorId: number;
  indicatorCode: string;
  indicatorName: string;
  score: number;
  targetScore: number;
  gap: number;
  suggestedPriority: PriorityLevel;
  priorityLabel: string;
  suggestedName: string;
  isAdopted: boolean;
  adoptedAreaId?: number | null;
}

export interface EvidenceInventoryIndicator {
  indicatorId: number;
  indicatorCode: string;
  indicatorName: string;
  domainName?: string;
  mandatoryRequiredCount: number;
  totalRequiredCount: number;
  uploadedEvidenceCount: number;
  validEvidenceCount: number;
  draftEvidenceCount: number;
  completionRate: number;
  isSufficient: boolean;
  status: string;
  evidences: {
    evidenceId: number;
    title: string;
    evidenceType: string;
    status: string;
    createdAt?: string;
    versionsCount?: number;
  }[];
}

export interface EvidenceInventoryStandard {
  standardId: number;
  standardCode: string;
  standardName: string;
  mandatoryRequiredCount: number;
  uploadedEvidenceCount: number;
  validEvidenceCount: number;
  draftEvidenceCount: number;
  completionRate: number;
  indicators: EvidenceInventoryIndicator[];
}

export interface EvidenceInventoryData {
  evaluationId: number;
  schoolId: number;
  schoolName?: string;
  inventoryStatus: string;
  overallEvidenceCompletionRate: number;
  summary: {
    totalIndicators: number;
    indicatorsWithSufficientEvidence: number;
    indicatorsMissingEvidence: number;
    totalEvidencesUploaded: number;
    totalValidEvidences: number;
    totalDraftEvidences: number;
  };
  standards: EvidenceInventoryStandard[];
}

export interface EvaluatorNotificationItem {
  notificationId: number;
  recipientUserId: number;
  title: string;
  message: string;
  type: 'cycle_launched' | 'completion_requested' | 'action_due_soon' | 'version_activated' | string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}
