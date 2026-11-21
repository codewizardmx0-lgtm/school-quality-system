/**
 * Types & Interfaces for Ministry Supervisor Suite
 * بوابة المشرف الوزاري - الإدارة العامة لضمان الجودة والاعتماد المدرسي
 * منصة ارتقاء للتقييم الذاتي والتحسين المدرسي
 */

export type SupervisionScreenKey =
  | 'dashboard'
  | 'cycles-list'
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
  delayedSchoolsCount?: number;
}

export interface GovernanceCallout {
  ruleCode: string;
  title: string;
  description: string;
}

export interface SchoolScope {
  name: string;
  governorate?: string;
  totalSchools: number;
  activeCycle: string;
  activeCycleId?: number;
  activeCycleName?: string;
  cycleStatus?: string;
  startDate?: string | null;
  endDate?: string | null;
  daysRemaining?: number;
  hasActiveCycle?: boolean;
  isOverdueThresholdReached?: boolean;
  overdueThresholdDate?: string | null;
  standardVersion?: {
    versionId: number;
    versionNo: string;
    versionTitle: string;
  };
}

export interface SchoolStatusMatrixRow {
  schoolId: number;
  schoolCode: string;
  schoolName: string;
  educationalStage: string;
  governorate: string;
  directorate?: string;
  principalName?: string;
  evaluatorName?: string;
  selfEvaluationProgress: number; // 0 to 100
  scoredIndicatorsCount?: number;
  totalIndicatorsCount?: number;
  coveredRequirementsCount?: number;
  totalRequirementsCount?: number;
  evidenceCount?: number;
  documentsCount?: number;
  outputStatus: OutputStatusType;
  outputStatusArabic: string;
  isDelayed?: boolean;
  completionRequestsCount: number;
  openCompletionRequestId: number | null;
  improvementPlanStatus: string;
  improvementPlanProgress?: number;
  hasImprovementPlan?: boolean;
  lastActionDate: string;
  latestSubmissionId: number;
  evaluationId?: number;
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
  evidenceLinkId?: number;
  versionId?: number;
  documentVersionId?: number;
  documentId?: number;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  mimeType: string;
  uploadedAt: string;
}

export const DEFICIENCY_CATEGORIES = [
  'نقص الشواهد الإلزامية المطلوبة في أداة التحقق',
  'عدم تطابق الشاهد المرفق مع نص المؤشر أو المعيار الفرعي',
  'تضخيم أو عدم دقة الدرجة الممنوحة للمؤشر',
  'غموض أو عدم كفاية المبرر الميداني للمقيم',
  'شواهد ناقصة التوثيق الرسمي (أختام / تواريخ / توقيعات)',
  'عدم إدراج المؤشر المنخفض في خطة التحسين المدرسية',
  'أسباب إشرافية أخرى (موضحة في التوجيهات)',
] as const;

export type DeficiencyCategory = (typeof DEFICIENCY_CATEGORIES)[number];

export interface IndicatorDescriptorItem {
  score: number;
  description: string;
}

export interface SupervisionDescriptorItem {
  descriptorId: number;
  score: number;
  level: number;
  label: string;
  title: string;
  description: string;
  isSelected: boolean;
}

export interface SupervisionEvidenceReqItem {
  id: number;
  requirementId: number;
  title: string;
  description: string;
  required: boolean;
  isMandatory: boolean;
  isCovered: boolean;
  coveringDocuments?: string[];
  coveringDocumentsSummary?: string;
}

export interface SupervisionVerificationToolItem {
  id: number;
  name: string;
  toolType: string;
  description: string;
}

export interface SupervisionIndicatorItem {
  indicatorId: number;
  code: string;
  indicatorNumber: number;
  title: string;
  name: string;
  description: string;
  weight: number;
  standardId: number;
  standardName: string;
  subStandardId: number;
  subStandardName: string;
  schoolScore: number | null;
  scoreLevelName: string;
  scoreDescription?: string;
  evaluatorJustification?: string;
  internalReviewNotes?: Array<{
    noteId: number;
    authorName: string;
    authorRole: string;
    text: string;
    createdAt: string;
  }> | string | null;
  evidenceCount: number;
  mandatoryRequirementsCount: number;
  coveredRequirementsCount: number;
  descriptors: SupervisionDescriptorItem[];
  verificationTools: SupervisionVerificationToolItem[];
  evidenceRequirements: SupervisionEvidenceReqItem[];
  evidences: EvidenceItem[];
  hasDefect: boolean;
  defectCategory?: string | null;
  defectCategories?: string[];
  defectReason?: string | null;
  directives?: string | null;
  allowedActions?: string[];
  supervisorFeedback?: string;
}

export interface SupervisionSubStandardItem {
  subStandardId: number;
  code: string;
  title: string;
  description: string;
  weight: number;
  guidance?: string;
  indicators: SupervisionIndicatorItem[];
}

export interface SupervisionStandardItem {
  standardId: number;
  code: string;
  title: string;
  name: string;
  description: string;
  weight: number;
  stats: {
    totalIndicators: number;
    scoredIndicators: number;
    unenteredIndicators: number;
    level3Count: number;
    level2Count: number;
    level1Count: number;
    level0Count: number;
    totalEvidences: number;
    totalMandatoryRequirements: number;
    coveredRequirements: number;
    coveragePercentage: number;
  };
  subStandards: SupervisionSubStandardItem[];
}

export interface SupervisionVaultDocument {
  id: number;
  documentId?: number;
  versionId?: number;
  documentVersionId?: number;
  title: string;
  documentType: string;
  documentTypeArabic?: string;
  description: string;
  versionNumber?: number;
  createdAt: string;
  linksCount: number;
  linkedIndicators: Array<{
    indicatorId: number;
    code: string;
    title: string;
  }>;
  fileName: string;
  fileSize: number;
  fileSizeFormatted: string;
  mimeType: string;
  downloadUrl: string | null;
  previewUrl: string | null;
}

export interface SupervisionVaultStats {
  totalDocuments: number;
  totalLinks: number;
  totalSizeBytes: number;
  documentTypesCount: number;
}

export interface ExecutionEvidenceItem {
  id: number;
  evidenceLinkId?: number;
  versionId?: number;
  documentVersionId?: number;
  documentTitle: string;
  fileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  mimeType: string;
  downloadUrl: string | null;
  previewUrl: string | null;
  uploadedAt?: string;
}

export interface SupervisionPlanAreaItem {
  areaId: number;
  indicatorId: number;
  indicatorCode: string;
  indicatorTitle: string;
  name: string;
  description: string;
  priority: string;
  priorityLabel: string;
  currentScore: number;
  targetScore: number;
  gap: number;
  status: string;
  actionsCount: number;
  averageProgress?: number;
}

export interface SupervisionPlanActionItem {
  actionId: number;
  areaId: number;
  areaTitle: string;
  title: string;
  responsible: string;
  startDate?: string | null;
  dueDate?: string | null;
  completionPercentage: number;
  progressDescription?: string | null;
  status: string;
  statusArabic: string;
  baselineScore?: number | null;
  targetScore: number;
  gap: number;
  evidenceCount?: number;
  evidenceLinks?: ExecutionEvidenceItem[];
}

export interface LowIndicatorMatrixItem {
  indicatorId: number;
  code: string;
  title: string;
  standardName: string;
  subStandardName: string;
  schoolScore: number;
  scoreLevelName: string;
  isCovered: boolean;
  isAddressed: boolean;
  coveringPlans: Array<{
    planId: number;
    planType: string;
    planTitle: string;
    areaId: number;
    areaTitle: string;
    actionsCount: number;
    averageProgress: number;
  }>;
  unaddressedReason?: string | null;
}

export interface SupervisionPlanDetails {
  planId: number;
  title: string;
  status: string;
  statusArabic: string;
  planType: string;
  planTypeLabel: string;
  versionNumber: number;
  academicYear: string;
  startDate?: string | null;
  endDate?: string | null;
  areas: SupervisionPlanAreaItem[];
  actions: SupervisionPlanActionItem[];
  stats: {
    totalAreas: number;
    totalActions: number;
    completedActions: number;
    inProgressActions: number;
    averageProgress: number;
  };
}

export interface SupervisionDeficiencyItem {
  id: number;
  indicatorId: number;
  indicatorCode: string;
  indicatorTitle: string;
  standardName: string;
  category: string;
  categories?: string[];
  note: string;
  directives?: string | null;
  allowedActions?: string[];
  createdAt: string;
}

export interface IndicatorAuditItem {
  indicatorId: number;
  code: string;
  standardId?: number;
  standardName: string;
  subStandardName: string;
  title: string;
  schoolScore: number; // 0-3
  scoreLevelName: string;
  scoreDescription?: string;
  descriptors?: IndicatorDescriptorItem[];
  verificationTools?: string[];
  evidences: EvidenceItem[];
  hasDefect: boolean;
  defectCategory?: string | null;
  defectReason?: string | null;
  directives?: string | null;
  allowedActions?: string[];
  supervisorFeedback?: string;
}

export interface OpenCompletionRequestData {
  requestId: number;
  notes?: string;
  issuedAt: string;
  deadline?: string | null;
  daysRemaining: number;
  itemsCount: number;
  items: Array<{
    indicatorId: number;
    code: string;
    title: string;
    missingDescription?: string;
  }>;
}

export interface ReviewableSubmissionItem {
  evaluationId: number;
  submissionId: number;
  schoolId: number;
  schoolName: string;
  schoolCode: string;
  governorate: string;
  directorate?: string;
  educationalStage?: string;
  status: OutputStatusType;
  statusArabic: string;
  submittedAt: string;
  attemptNo: number;
}

export interface SubmissionReviewData {
  submissionId: number;
  reportId: number;
  evaluationId: number;
  attemptNo: number;
  isReReview?: boolean;
  status: OutputStatusType;
  statusArabic: string;
  submittedAt: string;
  closedAt?: string | null;
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
    scoredIndicators?: number;
    totalIndicators?: number;
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
  standards?: SupervisionStandardItem[];
  vault?: {
    documents: SupervisionVaultDocument[];
    stats: SupervisionVaultStats;
  };
  evidenceInventory?: any;
  planDetails?: SupervisionPlanDetails | null;
  plans?: SupervisionPlanDetails[];
  allPlans?: SupervisionPlanDetails[];
  lowIndicatorsMatrix?: LowIndicatorMatrixItem[];
  deficienciesList?: SupervisionDeficiencyItem[];
  openCompletionRequest?: OpenCompletionRequestData | null;
  deficienciesCount?: number;
  exportPdfUrl?: string;
  exportExcelUrl?: string;
  packageDownloadUrl?: string;
}

export interface PreloadedCompletionItem {
  indicatorId: number;
  code: string;
  title: string;
  defectReason: string;
  categories?: string[];
  grantedPermission?: string;
  allowedActions?: string[];
  directives: string;
  evidenceLinkId?: number | null;
}

export interface CompletionItemPayload {
  indicatorId: number;
  missingDescription: string;
  evidenceLinkId?: number | null;
  defectReason?: string;
  categories?: string[];
  directives?: string;
  grantedPermission?: string;
  allowedActions?: string[];
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

export interface CompletionTrackerIndicatorItem {
  id: number;
  indicatorId: number;
  code: string;
  title: string;
  standardName: string;
  missingDescription: string;
  directives?: string;
  allowedActions?: string[];
  status: string;
}

export interface CompletionTrackerItem {
  requestId: number;
  evaluationId?: number;
  submissionId: number;
  schoolId: number;
  schoolName: string;
  schoolCode: string;
  governorate: string;
  directorate: string;
  attemptNo: number;
  status: string;
  submissionStatus: string;
  statusDisplay: string;
  isOverdue: boolean;
  isResubmitted: boolean;
  issuedAt: string;
  deadline?: string | null;
  deadlineFormatted?: string;
  deadlineExtendedAt?: string | null;
  extensionsCount: number;
  daysRemaining: number;
  itemsCount: number;
  items: CompletionTrackerIndicatorItem[];
  notes?: string;
  cycleEndDate?: string | null;
  cycleMaxCompletionDays?: number;
  cycleName?: string;
  issuedByName?: string;
}

export interface CompletionTrackerSummary {
  totalRequests: number;
  openRequests: number;
  resubmittedRequests: number;
  overdueRequests: number;
}

export interface CompletionTrackerResponse {
  summary: CompletionTrackerSummary;
  requests: CompletionTrackerItem[];
}

export interface NationalStandardTreeIndicator {
  indicatorId: number;
  code: string;
  title: string;
  weight: number;
}

export interface NationalStandardTreeSubStandard {
  subStandardId: number;
  name: string;
  code: string;
  indicators: NationalStandardTreeIndicator[];
}

export interface NationalStandardTreeStandard {
  standardId: number;
  name: string;
  code: string;
  weight: number;
  subStandards: NationalStandardTreeSubStandard[];
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

export interface ParticipatingSchoolItem {
  schoolId: number;
  schoolName: string;
  schoolCode: string;
  stage?: string;
  governorate?: string;
  district?: string;
  enrolledAt?: string;
}

export interface EvaluationCycleItem {
  cycleId: number;
  name: string;
  academicYear: string;
  scopeGovernorate?: string | null;
  startDate?: string;
  endDate?: string;
  status: 'Active' | 'Closed';
  maxCompletionDays?: number;
  participationsCount?: number;
  evaluationsCount?: number;
  version?: {
    versionId: number;
    versionName: string;
    versionNumber: string;
  };
  participatingSchools?: ParticipatingSchoolItem[];
}

