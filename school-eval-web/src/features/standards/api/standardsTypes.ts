/**
 * Standards & Reference Authority Suite - TypeScript Types
 * متوافقة تماماً مع معايير المنصة ومخطط قاعدة بيانات منصة ارتقاء والقرارات الست المعتمدة
 */

export type VersionStatus = 
  | 'Approved' 
  | 'Draft' 
  | 'Archived' 
  | 'Active' 
  | 'approved' 
  | 'draft' 
  | 'archived' 
  | 'active';

export interface ScoreDescriptor {
  descriptorId: number;
  scoreLevelId: number;
  scoreValue?: number;
  label?: string;
  description: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateScoreDescriptorItem {
  score_level_id?: number;
  score_value: number; // 0, 1, 2, 3
  label?: string;
  description: string;
}

export interface UpdateScoreDescriptorsPayload {
  descriptors: UpdateScoreDescriptorItem[];
}

export interface EvidenceRequirement {
  requirementId: number;
  indicatorId?: number;
  title: string;
  description?: string;
  required: boolean;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveEvidenceRequirementPayload {
  title: string;
  description?: string;
  required: boolean;
  display_order?: number;
}

export interface VerificationTool {
  toolId: number;
  name: string;
  toolType?: string;
  description?: string;
  approved?: boolean;
  indicatorsCount?: number;
  createdAt?: string;
}

export interface VerificationToolItem {
  id: string;
  label: string;
  checked: boolean;
  type: 'document' | 'observation' | 'interview' | 'survey' | string;
}

export interface IndicatorNode {
  indicatorId: number;
  code: string;
  name: string;
  description?: string;
  weight: number;
  status?: string;
  verificationMethod?: string;
  verificationTools?: string[];
  verificationToolIds?: number[];
  verificationToolDetails?: VerificationTool[];
  rubricNotes?: string;
  scoreDescriptors?: ScoreDescriptor[];
  evidenceRequirements?: EvidenceRequirement[];
}

export interface SubStandardNode {
  subStandardId: number;
  code: string;
  name: string;
  description?: string;
  weight?: number;
  indicatorsCount?: number;
  indicators: IndicatorNode[];
}

export interface StandardNode {
  standardId: number;
  code: string;
  name: string;
  description?: string;
  weight: number;
  subStandardsCount?: number;
  indicatorsCount?: number;
  subStandards: SubStandardNode[];
}

export interface StandardVersionSummary {
  versionId: number;
  versionNo: string;
  issueDate?: string;
  issueYear?: string | number;
  sourceOrganization?: string;
  sourceNumber?: string;
  sourceDescription?: string;
  status: VersionStatus;
  createdAt?: string;
  updatedAt?: string;
  standardsCount?: number;
  indicatorsCount?: number;
  totalWeight?: number;
  evaluationCyclesCount?: number;
  activeCyclesCount?: number;
  activeSchoolsCount?: number;
  uniqueSchoolsCount?: number;
}

export interface StandardVersionDetail extends StandardVersionSummary {
  versionName?: string;
  standards: StandardNode[];
}

export interface IndicatorWeightItem {
  indicatorId: number;
  code: string;
  name: string;
  weight: number;
}

export interface SubStandardWeightItem {
  subStandardId: number;
  code: string;
  name: string;
  weight: number;
  indicatorsCount?: number;
  indicators?: IndicatorWeightItem[];
}

export interface StandardWeightItem {
  standardId: number;
  code: string;
  name: string;
  weight: number;
  subStandardsCount?: number;
  indicatorsCount?: number;
  subWeightPerIndicator?: number;
  subStandards?: SubStandardWeightItem[];
}

export interface UpdateWeightsPayload {
  standards_weights: Array<{ standard_id: number; weight: number }>;
  sub_standards_weights?: Array<{ sub_standard_id: number; weight: number }>;
  indicators_weights?: Array<{ indicator_id: number; weight: number }>;
}

export interface WeightsCalibrationResponse {
  versionId: number;
  versionNo: string;
  status?: string;
  isDraft?: boolean;
  totalWeight: number;
  isBalanced: boolean;
  standards: StandardWeightItem[];
}

export interface RubricLevelInfo {
  scoreLevelId?: number;
  standardVersionId?: number;
  scoreValue: number;
  label: string;
  badgeColor?: string;
  range?: string;
  description?: string;
  displayOrder?: number;
}

export interface GovernanceCheckRule {
  id: number;
  key?: string;
  title: string;
  passed: boolean;
  details: string;
  blocker?: boolean;
}

export interface VersionLockPreconditions {
  versionId: number;
  versionNo: string;
  status?: string;
  isDraft?: boolean;
  isApproved?: boolean;
  isScheduled?: boolean;
  approvalCode?: string;
  passesAll: boolean;
  isScaleSupported?: boolean;
  integrityHash: string;
  totalWeight: number;
  indicatorsCount: number;
  standardsCount: number;
  checks: GovernanceCheckRule[];
}

export interface DiffTimelineItem {
  id: string;
  category: string;
  type: 'added' | 'modified' | 'reweighted' | 'tool';
  target: string;
  code: string;
  description: string;
  timestamp?: string;
  author?: string;
}

export interface DiffRealStats {
  standardsCount?: number;
  currentStandardsCount?: number;
  baselineStandardsCount?: number;
  previousStandardsCount?: number;
  subStandardsCount?: number;
  currentSubStandardsCount?: number;
  baselineSubsCount?: number;
  previousSubStandardsCount?: number;
  indicatorsCount?: number;
  currentIndicatorsCount?: number;
  baselineIndicatorsCount?: number;
  previousIndicatorsCount?: number;
  totalWeight?: number;
  baselineTotalWeight?: number;
  standardsDiff: number;
  subStandardsDiff: number;
  indicatorsDiff: number;
  isWeightBalanced?: boolean;
  isBalanced?: boolean;
  hasBaseline?: boolean;
  baselineVersionNo?: string | null;
  previousVersionNo?: string | null;
}

export interface StandardDiffComparisonItem {
  code: string;
  name: string;
  baselineName: string;
  weight: number;
  baselineWeight: number;
  weightDiff: number;
  indicatorsCount: number;
  status: 'same' | 'added' | 'removed' | 'modified' | 'reweighted';
}

export interface IndicatorDiffComparisonItem {
  code: string;
  name: string;
  baselineName: string;
  description?: string;
  baselineDescription?: string;
  standardCode: string;
  weight: number;
  baselineWeight: number;
  weightDiff: number;
  status: 'same' | 'added' | 'removed' | 'modified' | 'reweighted';
  tools?: string[];
  baselineTools?: string[];
  evidence?: Array<{ title: string; required: boolean }>;
  baselineEvidence?: Array<{ title: string; required: boolean }>;
  descriptors?: Record<number, string>;
  baselineDescriptors?: Record<number, string>;
}

export interface RubricDiffComparisonItem {
  scoreValue: number;
  label: string;
  baselineLabel: string;
  description?: string;
  baselineDescription?: string;
  status: 'same' | 'added' | 'removed' | 'modified';
}

export interface DiffLogResponse {
  versionId: number;
  versionNo: string;
  baselineVersionId?: number | null;
  baselineVersionNo?: string | null;
  hasBaseline?: boolean;
  status?: string;
  isDraft?: boolean;
  isApproved?: boolean;
  isScheduled?: boolean;
  approvalCode?: string;
  approverName?: string;
  approvedAt?: string;
  integrityHash: string;
  releaseNotes?: string;
  realStats?: DiffRealStats;
  diffs: DiffTimelineItem[];
  standardsComparison?: StandardDiffComparisonItem[];
  indicatorsComparison?: IndicatorDiffComparisonItem[];
  rubricsComparison?: RubricDiffComparisonItem[];
  stats?: {
    addedCount: number;
    modifiedCount: number;
    reweightedCount: number;
    toolsUpdatedCount: number;
  };
}

export interface UpdateScoreLevelsPayload {
  levels: {
    score_value: number;
    label: string;
    general_description?: string;
    display_order?: number;
  }[];
}

export interface CreateDraftPayload {
  version_no: string;
  source_number?: string;
  source_organization?: string;
  source_description?: string;
  issue_date?: string;
  clone_from_version_id?: number;
}

export interface CreateStandardPayload {
  code: string;
  name: string;
  description?: string;
  weight?: number;
}

export interface UpdateStandardPayload {
  code?: string;
  name?: string;
  description?: string;
  weight?: number;
}

export interface CreateSubStandardPayload {
  standard_id?: number;
  code: string;
  name: string;
  description?: string;
  weight?: number;
}

export interface UpdateSubStandardPayload {
  code?: string;
  name?: string;
  description?: string;
  weight?: number;
}

export interface CreateIndicatorPayload {
  sub_standard_id?: number;
  code: string;
  name: string;
  description?: string;
  weight?: number;
  verification_method?: string;
}

export interface UpdateIndicatorPayload {
  code?: string;
  name?: string;
  description?: string;
  weight?: number;
  status?: string;
  verification_method?: string;
  verificationMethod?: string;
  verification_tools?: string[];
  verificationTools?: string[];
  verification_tool_ids?: number[];
  verificationToolIds?: number[];
  rubric_notes?: string;
  rubricNotes?: string;
}

export interface LockVersionPayload {
  approval_code?: string;
  approvalCode?: string;
  legal_confirmation?: boolean;
  legalConfirmation?: boolean;
  council_notes?: string;
  release_notes?: string;
  action?: 'approve' | 'activate' | 'schedule';
}
