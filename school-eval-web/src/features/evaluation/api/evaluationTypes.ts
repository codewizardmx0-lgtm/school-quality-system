/**
 * evaluationTypes.ts
 * Strict TypeScript domain models & interfaces according to conventions.md (§3, §5, §10, §11)
 */

export type SubmissionStatus = 'Draft' | 'Submitted' | 'UnderReview' | 'NeedsCompletion' | 'Completed';
export type CompletionStatus = 'Pending' | 'Completed';
export type PriorityLevel = 'Low' | 'Medium' | 'High';
export type PlanStatus = 'Draft' | 'Active' | 'Submitted' | 'Archived' | 'Completed' | 'Cancelled';
export type ActionStatus = 'Pending' | 'InProgress' | 'Done' | 'Cancelled';
export type RequestStatus = 'Open' | 'Resolved';
export type ItemStatus = 'Pending' | 'Resolved';
export type AiAnalysisStatus = 'Pending' | 'Completed' | 'Failed';
export type AiRecommendationStatus = 'PendingReview' | 'Accepted' | 'Modified' | 'Ignored';
export type AiRecommendationType = 'strength' | 'improvement' | 'recommendation' | 'draft';
export type VerificationTagStatus = 'Compliant' | 'NeedsReplacement' | 'UnderReview';

export interface StandardVersionSummary {
  versionId: number;
  versionNumber: string;
  title?: string;
  status: string;
  issueDate?: string;
}

export interface EvaluationCycleSummary {
  cycleId: number;
  name: string;
  academicYear: string;
  status: string;
  startDate?: string;
  endDate?: string;
}

export interface EvaluatorSchoolInfo {
  schoolId: number;
  schoolName: string;
  schoolCode?: string;
  status: SubmissionStatus;
  statusArabic: string;
  currentEvaluator: string;
  academicYear: string;
  cycleName: string;
  standardVersion?: StandardVersionSummary;
  evaluationCycle?: EvaluationCycleSummary;
  trackingCode?: string;
  digitalHash?: string;
  submittedAt?: string;
  attemptNo?: number;
}

export interface EvaluatorKpis {
  completionPercentage: number;
  totalIndicators: number;
  scoredIndicators: number;
  documentedEvidences: number;
  targetEvidences: number;
  uniqueDocumentsCount?: number;
  coveredIndicatorsCount?: number;
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
  totalMandatoryRequirements?: number;
  coveredRequirements?: number;
  evidencesCount?: number;
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
  coveredRequirementsCount?: number;
  mandatoryRequirementsCount?: number;
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
  toolType?: string;
  description?: string;
  required?: boolean;
  guidance?: string;
}

export interface EvidenceRequirementItem {
  id: number;
  title: string;
  description?: string;
  required: boolean;
  isCovered?: boolean;
}

export interface IndicatorNode {
  indicatorId: number;
  code: string;
  title: string;
  description: string;
  weight: number;
  standardName?: string;
  standardDescription?: string;
  subStandardName?: string;
  subStandardDescription?: string;
  subStandardWeight?: number;
  score?: number | null;
  evidenceCount?: number;
  mandatoryRequirementsCount?: number;
  coveredRequirementsCount?: number;
  descriptors: ScoreDescriptor[];
  verificationMethods: VerificationMethod[];
  evidenceRequirements?: EvidenceRequirementItem[];
}

export interface SubStandardNode {
  subStandardId: number;
  code: string;
  title: string;
  description?: string;
  weight?: number;
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
  totalMandatoryRequirements?: number;
  coveredRequirements?: number;
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
  evaluationId?: number;
  versionId: number;
  versionCode: string;
  versionNumber?: string;
  versionStatus?: string;
  approvalCode?: string;
  approvedAt?: string;
  effectiveFrom?: string;
  integrityHash?: string;
  title: string;
  academicYear?: string;
  cycleName?: string;
  standards: StandardNode[];
}

export interface LinkedEvidenceBrief {
  linkId: number;
  versionId?: number;
  documentId?: number;
  indicatorId?: number;
  title: string;
  fileName: string;
  fileSize: number;
  versionNumber: number;
  status?: string;
  documentType?: string;
  description?: string;
  justification?: string;
  uploadedAt?: string;
  coveredRequirements?: number[];
}

export interface ReviewerNoteItem {
  noteId: number;
  authorName: string;
  authorRole?: string;
  text: string;
  createdAt?: string;
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
  reviewerNotes?: ReviewerNoteItem[];
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
  coveredIndicatorsCount?: number;
  totalIndicatorsCount?: number;
}

export interface LinkedIndicatorBrief {
  linkId: number;
  indicatorId: number;
  indicatorCode: string;
  indicatorTitle: string;
  standardId?: number;
  standardCode?: string;
  standardName?: string;
  justification?: string;
  coveredRequirements?: number[];
}

export interface EvidenceItem {
  id: number;
  documentId: number;
  linkId?: number;
  isUnlinked?: boolean;
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
  documentType?: string;
  documentTypeArabic?: string;
  description?: string;
  justification?: string;
  linkedIndicators?: LinkedIndicatorBrief[];
  uploadedAt: string;
  uploadedBy: string;
  verificationStatus: VerificationTagStatus;
  verificationStatusArabic: string;
}

export interface EvidencesRepositoryResponse {
  vaultStats: EvidenceVaultStats;
  evidences: EvidenceItem[];
}

export interface ArchivedVersionItem {
  versionId: number;
  versionNo: number;
  fileName: string;
  fileSize: number;
  formattedSize: string;
  notes: string;
  createdAt: string;
  isFilePruned?: boolean;
  downloadUrl?: string | null;
}

export interface ArchivedDocumentItem {
  documentId: number;
  title: string;
  documentType: string;
  documentTypeArabic: string;
  description: string;
  totalVersionsCount: number;
  activeLinksCount: number;
  linkedIndicators: {
    indicatorId: number;
    indicatorCode: string;
    indicatorTitle: string;
  }[];
  currentVersion: ArchivedVersionItem | null;
  historicalVersions: ArchivedVersionItem[];
}

export interface VersionsArchiveData {
  archiveStats: {
    totalDocuments: number;
    totalVersions: number;
    historicalVersionsCount: number;
    prunedVersionsCount: number;
  };
  documents: ArchivedDocumentItem[];
}

export interface UploadEvidencePayload {
  file: File;
  title?: string;
  indicatorId?: number;
  actionId?: number;
  notes?: string;
  documentId?: number; // for replacing an existing evidence with a new version
  coveredRequirements?: number[];
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

export type PlanType = 'QualityImprovement' | 'StaffProfessionalDevelopment' | 'AnnualOperational';

export type ImprovementAreaStatus = 'pending_action' | 'in_progress' | 'completed';

export interface ImprovementAreaBrief {
  areaId: number;
  name: string;
  description?: string;
  status?: ImprovementAreaStatus;
  priority: PriorityLevel;
  score?: number | null;
  targetScore?: number;
  indicatorId?: number;
  indicatorCode?: string;
  indicatorName?: string;
  standardCode?: string;
  standardName?: string;
  alreadyAdoptedPlanTitle?: string | null;
  alreadyAdoptedPlanType?: string | null;
  alreadyAdoptedPerson?: string | null;
  existingLinks?: {
    planId: number;
    planTitle: string;
    planType?: string;
    person: string;
  }[];
  hasAction?: boolean;
}

export interface ImprovementPlanListItem {
  planId: number;
  planType: PlanType;
  planTypeLabel: string;
  title: string;
  versionNumber: number;
  parentPlanId: number | null;
  versionTag: string | null;
  academicYear: string;
  startDate: string | null;
  endDate: string | null;
  status: PlanStatus;
  statusArabic: string;
  overallProgressPercentage: number;
  areasCount: number;
  totalActions: number;
  doneActions: number;
  inProgressActions: number;
  pendingActions: number;
  delayedActions: number;
  createdAt: string;
}

export interface EvaluationCycleArchiveItem {
  evaluationId: number;
  cycleId: number;
  academicYear: string;
  cycleStatus: string;
  evaluationStatus: string;
  isLocked: boolean;
  createdAt?: string;
}

export interface ImprovementPlanAction {
  actionId: number;
  planId: number;
  areaId?: number;
  areaName?: string;
  title: string;
  standardCode?: string;
  standardName: string;
  subStandardCode?: string;
  subStandardName?: string;
  indicatorId?: number;
  indicatorCode?: string;
  indicatorName?: string;
  score?: number | null;
  targetScore?: number;
  gap?: number | null;
  baselineScore?: number | null;
  baselineTargetScore?: number | null;
  baselineGap?: number | null;
  priority?: PriorityLevel;
  priorityArabic?: string;
  leader: string;
  startDate: string;
  dueDate: string;
  status: ActionStatus;
  statusArabic: string;
  completionPercentage: number;
  progressDescription: string;
  isNewInVersion?: boolean;
  evidences?: { evidenceId: number; title: string; fileName: string }[];
}

export interface ImprovementPlanSummary {
  totalActions: number;
  inProgressActions: number;
  doneActions: number;
  pendingActions: number;
}

export interface PlanReviewNoteItem {
  noteId: number;
  authorName: string;
  authorUsername: string;
  reviewerRole: string;
  roleArabic: string;
  text: string;
  createdAt?: string;
}

export interface CreateImprovementPlanPayload {
  cycleId?: number;
  planType: PlanType;
  title: string;
  startDate?: string;
  endDate?: string;
  areaIds?: number[];
}

export interface ImprovementPlanData {
  planId: number;
  planType?: PlanType;
  versionNumber?: number;
  parentPlanId?: number | null;
  versionTag?: string | null;
  title: string;
  status: PlanStatus;
  startDate: string;
  endDate: string;
  areas?: ImprovementAreaBrief[];
  availableAreas?: ImprovementAreaBrief[];
  summary: ImprovementPlanSummary;
  actions: ImprovementPlanAction[];
  reviewNotes?: PlanReviewNoteItem[];
}

export interface CreateImprovementActionPayload {
  planId?: number;
  planType?: PlanType;
  areaId?: number;
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
  priority?: PriorityLevel;
  targetScore?: number;
  progressDescription?: string;
  completionPercentage?: number;
}

export interface PendingIndicatorItem {
  indicatorId: number;
  code: string;
  name: string;
}

export interface PreflightCheckCriterion {
  id: string;
  title: string;
  description: string;
  passed: boolean;
  weight: number;
  pendingItems?: PendingIndicatorItem[];
}

export interface PreflightCheckData {
  canSubmit: boolean;
  readinessPercentage: number;
  passedCriteriaCount: number;
  totalCriteriaCount: number;
  checklist: PreflightCheckCriterion[];
  digitalSealInfo: {
    systemCode: string;
    trackingCode?: string;
    digitalHash?: string;
    hashAlgorithm: string;
    submissionNotice: string;
    isSubmitted?: boolean;
    submissionStatus?: string;
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

export interface ResubmitCompletionResponse {
  requestId: number;
  status: string;
  submissionAttempt?: number;
  trackingCode?: string;
  digitalHash?: string;
  resubmittedAt?: string;
  message?: string;
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
  | 'audit-hub'
  | 'final-review'
  | 'completion-request'
  | 'notifications'
  | 'reports'
  | 'historical';


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
  standardCode?: string;
  standardName?: string;
  score: number;
  targetScore: number;
  gap: number;
  suggestedPriority: PriorityLevel;
  priorityLabel: string;
  suggestedName: string;
  isAdopted: boolean;
  isPreviouslyAdopted?: boolean;
  adoptedAreaId?: number | null;
  adoptedPlan?: {
    planId: number;
    planTitle: string;
    planType?: string;
    versionNumber?: number;
    versionTag?: string | null;
    status?: string;
    isCurrentPlan?: boolean;
  } | null;
  isExcluded?: boolean;
  excludedAt?: string | null;
}

export interface EvidenceInventoryIndicator {
  indicatorId: number;
  indicatorCode: string;
  indicatorName: string;
  domainName?: string;
  adoptedPlanTitle?: string | null;
  adoptedPlanType?: string | null;
  mandatoryRequiredCount: number;
  totalRequiredCount: number;
  uploadedEvidenceCount: number;
  validEvidenceCount: number;
  draftEvidenceCount: number;
  effectiveCoveredCount?: number;
  missingCount?: number;
  completionRate: number;
  isSufficient: boolean;
  status: string;
  evidences: {
    evidenceId: number;
    title: string;
    evidenceType: string;
    evidenceTypeArabic?: string;
    justification?: string;
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
  effectiveCoveredCount?: number;
  missingCount?: number;
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

export interface IndicatorMetricsContextItem {
  indicator_code: string;
  name: string;
  calculated_value: number | string | null;
  calculated_ratio: number | null;
  suggested_level: number | null;
  badge: string;
  message: string;
  raw_data?: Record<string, any>;
}

export interface IndicatorsContextResponse {
  evaluationId?: number;
  is_snapshot?: boolean;
  is_legacy_completed_without_snapshot?: boolean;
  notice?: string;
  indicators: Record<string, IndicatorMetricsContextItem>;
}

export interface ActionCatalogRecommendationItem {
  catalog_id: number;
  sub_standard_code: string;
  plan_type: PlanType | string;
  title: string;
  suggested_responsible_description?: string;
  suggested_duration_days?: number;
}

export interface ActionRecommendationsResponse {
  is_weak: boolean;
  indicator_code: string;
  indicator_name?: string | null;
  sub_standard_code?: string | null;
  score: number | null;
  recommendations_count?: number;
  message?: string;
  recommendations: ActionCatalogRecommendationItem[];
}

export interface DiscrepancyItem {
  indicatorId?: number;
  standardId?: number;
  code?: string;
  name?: string;
  standardName?: string;
  score?: number;
  evidenceCount?: number;
  mandatoryCount?: number;
  coveredCount?: number;
  textLength?: number;
  toolName?: string;
  documentVersionId?: number;
  documentTitle?: string;
  linkedIndicatorsCount?: number;
  sampleIndicatorCodes?: string;
  issue: string;
  recommendation: string;
}

export interface DiscrepancyCase {
  caseId: 'case_1' | 'case_2' | 'case_3' | 'case_4' | 'case_5';
  title: string;
  severity: 'critical' | 'medium' | 'warning';
  severityLabel: string;
  description: string;
  count: number;
  items: DiscrepancyItem[];
}

export interface DiscrepancySummary {
  totalDiscrepancies: number;
  criticalCount: number;
  mediumCount: number;
  warningCount: number;
  evaluatedIndicatorsCount: number;
  auditPassed: boolean;
}

export interface DiscrepancyAuditResponse {
  summary: DiscrepancySummary;
  cases: DiscrepancyCase[];
}

export interface IndicatorTrendItem {
  indicator_code: string;
  indicator_name?: string;
  previous_score?: number;
  current_score: number;
  delta?: number;
  text_changed?: boolean;
  previous_name?: string;
  current_name?: string;
  notice?: string;
}

export interface HistoricalTrendSummary {
  current_final_score: number;
  previous_final_score: number;
  score_delta: number;
  trend_direction: 'improving' | 'declining' | 'stable';
  improved_count: number;
  regressed_count: number;
  maintained_count: number;
  newly_evaluated_count: number;
  deprecated_count: number;
  improved_indicators: IndicatorTrendItem[];
  regressed_indicators: IndicatorTrendItem[];
  maintained_indicators: IndicatorTrendItem[];
  newly_evaluated_indicators: IndicatorTrendItem[];
  deprecated_indicators: IndicatorTrendItem[];
}

export interface HistoricalTrendData {
  has_previous_cycle: boolean;
  school_id: number;
  school_name?: string;
  current_evaluation_id: number;
  current_cycle: string;
  previous_evaluation_id?: number | null;
  previous_cycle?: string | null;
  notice: string;
  trend: HistoricalTrendSummary | null;
}

export interface AuditHubIndicatorNote {
  noteId: number;
  authorName: string;
  authorRole: string;
  isPrincipal: boolean;
  text: string;
  createdAt?: string;
}

export interface AuditHubIndicator {
  indicatorId: number;
  indicatorCode: string;
  indicatorName: string;
  standardId: number;
  standardCode: string;
  standardName: string;
  subStandardCode: string;
  subStandardName: string;
  resultId: number | null;
  score: number | null;
  scoreLabel: string;
  evidenceCount: number;
  mandatoryRequirementsCount: number;
  totalRequirementsCount: number;
  coveredRequirementsCount: number;
  isRequirementFullyCovered: boolean;
  hasPrincipalReview: boolean;
  principalNotesCount: number;
  latestPrincipalNote: {
    noteId: number;
    authorName: string;
    text: string;
    createdAt?: string;
  } | null;
  allNotes: AuditHubIndicatorNote[];
}

export interface AuditHubPlan {
  planId: number;
  title: string;
  planType: string;
  versionNumber: number;
  versionTag?: string;
  status: string;
  progressDescription?: string;
  actionsCount: number;
  hasPrincipalReview: boolean;
  reviewNotesCount: number;
  principalNotesCount: number;
  latestNote: {
    authorName: string;
    role: string;
    text: string;
    createdAt?: string;
  } | null;
}

export interface AuditHubCompletionRequest {
  requestId: number;
  status: string;
  supervisorName: string;
  notes: string;
  totalItems: number;
  pendingItems: number;
  completedItems: number;
}

export interface AuditHubFinalReview {
  reportId: number | null;
  isGenerated: boolean;
  isLocked: boolean;
  hasPrincipalAcknowledgment: boolean;
  acknowledgedAt?: string | null;
  acknowledgmentText?: string | null;
}

export interface AuditHubSummary {
  totalIndicators: number;
  reviewedIndicatorsCount: number;
  pendingIndicatorsCount: number;
  reviewCoveragePercentage: number;
  plansCount: number;
  reviewedPlansCount: number;
  hasOpenCompletionRequest: boolean;
  finalReviewAcknowledged: boolean;
}

export interface AuditHubData {
  schoolId: number;
  schoolName: string;
  summary: AuditHubSummary;
  indicators: AuditHubIndicator[];
  plans: AuditHubPlan[];
  completionRequest: AuditHubCompletionRequest | null;
  finalReview: AuditHubFinalReview;
}
