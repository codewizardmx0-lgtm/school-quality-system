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

export interface VerificationToolItem {
  id: string;
  label: string;
  checked: boolean;
  type: 'document' | 'observation' | 'interview' | 'survey';
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
  activeSchoolsCount?: number;
}

export interface StandardVersionDetail extends StandardVersionSummary {
  versionName?: string;
  standards: StandardNode[];
}

export interface SubStandardWeightItem {
  subStandardId: number;
  code: string;
  name: string;
  weight: number;
  indicatorsCount?: number;
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
  totalWeight: number;
  isBalanced: boolean;
  standards: StandardWeightItem[];
}

export interface RubricLevelInfo {
  scoreValue: number;
  label: string;
  badgeColor: 'emerald' | 'blue' | 'amber' | 'rose';
  range: string;
  description: string;
}

export interface GovernanceCheckRule {
  id: number;
  title: string;
  passed: boolean;
  details: string;
}

export interface VersionLockPreconditions {
  versionId: number;
  versionNo: string;
  passesAll: boolean;
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
  timestamp: string;
  author: string;
}

export interface DiffRealStats {
  standardsCount: number;
  baselineStandardsCount: number;
  subStandardsCount: number;
  baselineSubsCount: number;
  indicatorsCount: number;
  baselineIndicatorsCount: number;
  totalWeight: number;
  baselineTotalWeight: number;
  standardsDiff: number;
  subStandardsDiff: number;
  indicatorsDiff: number;
  isWeightBalanced: boolean;
}

export interface DiffLogResponse {
  versionId: number;
  versionNo: string;
  baselineVersionNo: string;
  integrityHash: string;
  releaseNotes?: string;
  realStats?: DiffRealStats;
  diffs: DiffTimelineItem[];
  stats: {
    addedCount: number;
    modifiedCount: number;
    reweightedCount: number;
    toolsUpdatedCount: number;
  };
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
  verification_method?: string;
  verification_tools?: string[];
  rubric_notes?: string;
}

export interface LockVersionPayload {
  approval_code?: string;
  approvalCode?: string;
  legal_confirmation?: boolean;
  legalConfirmation?: boolean;
  council_notes?: string;
  release_notes?: string;
}
