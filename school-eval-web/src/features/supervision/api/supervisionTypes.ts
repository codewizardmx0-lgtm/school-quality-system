/**
 * Types & Interfaces for Ministry Supervisor Suite
 * بوابة المشرف الوزاري - الإدارة العامة لضمان الجودة والاعتماد المدرسي
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 */

export type SupervisionScreenKey =
  | 'dashboard'
  | 'cycles-new'
  | 'submissions'
  | 'completion-requests'
  | 'tracking-log'
  | 'reports'
  | 'historical';

export type OutputStatusType =
  | 'Draft'
  | 'Submitted'
  | 'UnderReview'
  | 'NeedsCompletion'
  | 'Completed';

export interface SupervisionKpis {
  totalSchools: number;
  pendingReviewCount: number;
  openCompletionRequestsCount: number;
  completedReviewCount: number;
}

export interface GovernanceCallout {
  ruleCode: string;
  title: string;
  description: string;
}

export interface SchoolScope {
  name: string;
  totalSchools: number;
  activeCycle: string;
}

export interface SchoolStatusMatrixRow {
  schoolId: number;
  schoolCode: string;
  schoolName: string;
  educationalStage: string;
  governorate: string;
  directorate?: string;
  selfEvaluationProgress: number; // 0 to 100
  outputStatus: OutputStatusType;
  outputStatusArabic: string;
  completionRequestsCount: number;
  openCompletionRequestId: number | null;
  improvementPlanStatus: string;
  lastActionDate: string;
  latestSubmissionId: number;
}

export interface SupervisionDashboardData {
  kpis: SupervisionKpis;
  governanceCallout: GovernanceCallout;
  scope: SchoolScope;
  schools: SchoolStatusMatrixRow[];
}

export interface ActiveStandardVersion {
  versionId: number;
  versionNumber: string;
  title: string;
  status: 'Active' | 'Approved' | 'Draft' | 'Archived';
  standardsCount: number;
  indicatorsCount: number;
  totalWeight: number;
  isLocked: boolean;
  lockedAt: string;
  checksum?: string;
  governanceNote?: string;
}

export interface CycleLaunchPayload {
  academicYear: string;
  name?: string;
  targetTerm?: string;
  startDate: string;
  endDate: string;
  completionDeadlineDays?: number;
  publicDirectives?: string;
  targetGovernorate?: string;
  educationalStages?: string[];
  schoolIds?: number[];
  enrollAllSchools?: boolean;
}

export interface EvidenceItem {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  mimeType: string;
  uploadedAt: string;
}

export interface IndicatorAuditItem {
  indicatorId: number;
  code: string;
  standardName: string;
  subStandardName: string;
  title: string;
  schoolScore: number; // 0-3
  scoreLevelName: string;
  scoreDescription?: string;
  evidences: EvidenceItem[];
  hasDefect: boolean;
  defectReason?: string | null;
  directives?: string | null;
  supervisorFeedback?: string;
}

export interface SubmissionReviewData {
  submissionId: number;
  reportId: number;
  evaluationId: number;
  attemptNo: number;
  status: OutputStatusType;
  statusArabic: string;
  submittedAt: string;
  school: {
    schoolId: number;
    schoolCode: string;
    schoolName: string;
    educationalStage: string;
    governorate: string;
    directorate: string;
    principalName: string;
    evaluatorName?: string;
  };
  summary: {
    totalElements: number;
    completedElements: number;
    attachedEvidencesCount: number;
    improvementActionsCount: number;
    overallScore: number;
    scoreScaleMax: number;
    compliancePercentage: number;
  };
  automatedChecks: {
    rubricCompleteness: boolean;
    allEvidencesAttached: boolean;
    minEvidenceMet: boolean;
    flagsCount: number;
    notes?: string;
  };
  improvementPlan: {
    planId: number;
    status: string;
    title: string;
    actionsCount: number;
    priorities: string[];
  };
  indicators: IndicatorAuditItem[];
  packageDownloadUrl?: string;
}

export interface PreloadedCompletionItem {
  indicatorId: number;
  code: string;
  title: string;
  defectReason: string;
  grantedPermission: string;
  directives: string;
  evidenceLinkId?: number | null;
}

export interface CompletionItemPayload {
  indicatorId: number;
  missingDescription: string;
  evidenceLinkId?: number | null;
  defectReason?: string;
  directives?: string;
  grantedPermission?: string;
}

export interface CreateCompletionRequestPayload {
  notes?: string;
  completionDeadline?: string;
  items: CompletionItemPayload[];
}

export interface CompletionRequestResponse {
  requestId: number;
  submissionId: number;
  schoolId: number;
  status: string;
  statusArabic: string;
  completionDeadline: string;
  complianceCountdownDays: number;
  itemsCount: number;
  governanceNotice?: string;
}

export interface MilestoneEvent {
  id: number;
  eventType:
    | 'submission'
    | 'automated_check'
    | 'completion_request'
    | 'completion_resolved'
    | 'field_visit'
    | 'supervisor_memo'
    | 'phone_call';
  title: string;
  description: string;
  actorName: string;
  actorRole: string;
  timestamp: string;
  statusBadge: string;
  badgeColor?: 'blue' | 'emerald' | 'amber' | 'purple' | 'indigo' | 'crimson';
}

export interface SupervisorMemo {
  id: number;
  memoType: 'مذكرة إشرافية' | 'زيارة ميدانية' | 'اتصال هاتفي';
  subject: string;
  details: string;
  isVisibleToSchool: boolean;
  authorName: string;
  createdAt: string;
}

export interface SchoolTrackingLogData {
  school: {
    schoolId: number;
    schoolCode: string;
    schoolName: string;
    outputStatus: OutputStatusType;
    outputStatusArabic: string;
    governorate: string;
    totalMilestones: number;
  };
  milestones: MilestoneEvent[];
  memos: SupervisorMemo[];
}

export interface StandardMeanItem {
  standardId: number;
  code: string;
  name: string;
  meanScore: number; // 0-3 scale
  maxScore: number;
  percentageAttainment: number;
  benchmarkLevel: 'متميز' | 'متوسط' | 'بحاجة لدعم';
  status: 'advanced' | 'proficient' | 'needs_support';
  indicatorsCount: number;
}

export interface CentralReportsData {
  scopeSummary: {
    governorate: string;
    totalSchools: number;
    evaluatedSchools: number;
    averageScore: number;
    maxScore: number;
    overallPercentage: number;
    highestStandard: string;
    lowestStandard: string;
    policySynthesisNote: string;
  };
  distribution: {
    advancedPercentage: number;
    proficientPercentage: number;
    needsSupportPercentage: number;
  };
  standardsMeans: StandardMeanItem[];
  stageBreakdown: Array<{
    stage: string;
    averageScore: number;
    schoolsCount: number;
  }>;
}

export interface HistoricalStandardDelta {
  standardId: number;
  name: string;
  previousScore: number;
  currentScore: number;
  delta: number;
  trend: 'up' | 'same' | 'down';
}

export interface HistoricalComparisonData {
  school: {
    schoolId: number;
    schoolCode: string;
    schoolName: string;
  };
  baseCycle: {
    name: string;
    academicYear: string;
  };
  comparedCycle: {
    name: string;
    academicYear: string;
  };
  trajectory: {
    growthPercentage: number;
    growthDirection: 'positive' | 'neutral' | 'negative';
    growthPillText: string;
    previousTotalScore: number;
    currentTotalScore: number;
    netDelta: number;
  };
  impactMetrics: {
    planGapsClosedPercentage: number;
    evidenceQualityGrowthPercentage: number;
    completionRequestsReductionPercentage: number;
  };
  standardsDeltas: HistoricalStandardDelta[];
  recommendations: string[];
}
