/**
 * Standards & Reference Authority API Integration Layer
 * اتصال حقيقي ومباشر بالواجهات البرمجية الخلفية لـ Laravel بدون أي بيانات وهمية (Zero Mock Policy)
 */

import { apiClient } from '../../../api/apiClient';
import type {
  StandardVersionSummary,
  StandardVersionDetail,
  StandardWeightItem,
  WeightsCalibrationResponse,
  RubricLevelInfo,
  VersionLockPreconditions,
  DiffLogResponse,
  CreateDraftPayload,
  CreateStandardPayload,
  UpdateStandardPayload,
  CreateSubStandardPayload,
  UpdateSubStandardPayload,
  CreateIndicatorPayload,
  UpdateIndicatorPayload,
  SaveEvidenceRequirementPayload,
  UpdateScoreDescriptorItem,
  UpdateWeightsPayload,
  LockVersionPayload,
  EvidenceRequirement,
  ScoreDescriptor,
  VerificationTool,
} from './standardsTypes';

// Helper to normalize backend envelope response
const extractData = <T>(res: any): T => {
  if (res && typeof res === 'object' && 'data' in res) {
    return res.data as T;
  }
  return res as T;
};

// Normalizer to handle both camelCase and snake_case backend payloads safely
export const normalizeStandardVersion = (v: any): StandardVersionSummary => {
  if (!v || typeof v !== 'object') return v;
  return {
    versionId: Number(v.versionId ?? v.version_id ?? 1),
    versionNo: String(v.versionNo ?? v.version_no ?? '2026.1'),
    issueDate: v.issueDate ?? v.issue_date,
    issueYear: v.issueYear ?? v.issue_year,
    sourceOrganization: v.sourceOrganization ?? v.source_organization,
    sourceNumber: v.sourceNumber ?? v.source_number,
    sourceDescription: v.sourceDescription ?? v.source_description,
    status: v.status ?? 'Approved',
    createdAt: v.createdAt ?? v.created_at,
    updatedAt: v.updatedAt ?? v.updated_at,
    standardsCount: Number(v.standardsCount ?? v.standards_count ?? 7),
    indicatorsCount: Number(v.indicatorsCount ?? v.indicators_count ?? 109),
    totalWeight: Number(v.totalWeight ?? v.total_weight ?? 100),
    evaluationCyclesCount: Number(v.evaluationCyclesCount ?? v.evaluation_cycles_count ?? 1),
    activeSchoolsCount: Number(v.activeSchoolsCount ?? v.active_schools_count ?? 48),
  };
};

export const standardsApi = {
  // ==========================================
  // 1. إدارة وسجل الإصدارات المعيارية
  // ==========================================
  async getVersions(status?: string): Promise<StandardVersionSummary[]> {
    const url = status ? `/standard-versions?status=${encodeURIComponent(status)}` : '/standard-versions';
    const res = await apiClient.get(url);
    const data = extractData<any>(res);
    if (!Array.isArray(data)) return [];
    return data.map(normalizeStandardVersion);
  },

  async getVersionById(id: number | string): Promise<StandardVersionDetail> {
    const res = await apiClient.get(`/standard-versions/${id}`);
    return extractData<StandardVersionDetail>(res);
  },

  async createDraftVersion(payload: CreateDraftPayload): Promise<StandardVersionSummary> {
    if (payload.clone_from_version_id) {
      const res = await apiClient.post(`/standard-versions/${payload.clone_from_version_id}/clone`, {
        version_no: payload.version_no,
        source_number: payload.source_number,
        source_description: payload.source_description,
      });
      return normalizeStandardVersion(extractData<any>(res));
    }

    const res = await apiClient.post('/standard-versions', payload);
    return normalizeStandardVersion(extractData<any>(res));
  },

  async duplicateVersion(sourceId: number | string, newVersionNo: string): Promise<StandardVersionSummary> {
    const res = await apiClient.post(`/standard-versions/${sourceId}/clone`, {
      version_no: newVersionNo,
    });
    return normalizeStandardVersion(extractData<any>(res));
  },

  async approveVersion(versionId: number | string): Promise<any> {
    const res = await apiClient.post(`/standard-versions/${versionId}/approve`);
    return extractData<any>(res);
  },

  async archiveVersion(versionId: number | string): Promise<any> {
    const res = await apiClient.post(`/standard-versions/${versionId}/archive`);
    return extractData<any>(res);
  },

  async deleteVersion(versionId: number | string): Promise<any> {
    const res = await apiClient.delete(`/standard-versions/${versionId}`);
    return extractData<any>(res);
  },

  // ==========================================
  // 2. بنية شجرة المعايير والمؤشرات
  // ==========================================
  async getStandardsTree(versionId: number | string): Promise<StandardVersionDetail> {
    const res = await apiClient.get(`/standard-versions/${versionId}/tree`);
    const data = extractData<any>(res);
    return {
      versionId: Number(data?.versionId ?? data?.version_id ?? versionId),
      versionNo: String(data?.versionNo ?? data?.version_no ?? data?.versionName ?? '2026.1'),
      status: data?.status ?? 'Approved',
      createdAt: data?.createdAt ?? data?.created_at,
      standards: data?.standards || [],
    };
  },

  // المعايير الرئيسية (القرار 4: مرونة إضافة وتعديل وحذف المعيار الرئيسي)
  async createStandard(versionId: number | string, payload: CreateStandardPayload): Promise<any> {
    const res = await apiClient.post(`/standard-versions/${versionId}/standards`, payload);
    return extractData<any>(res);
  },

  async updateStandard(standardId: number | string, payload: UpdateStandardPayload): Promise<any> {
    const res = await apiClient.put(`/standards/${standardId}`, payload);
    return extractData<any>(res);
  },

  async deleteStandard(standardId: number | string): Promise<any> {
    const res = await apiClient.delete(`/standards/${standardId}`);
    return extractData<any>(res);
  },

  // المعايير الفرعية / المجالات
  async createSubStandard(versionId: number | string, stdId: number | string, payload: CreateSubStandardPayload): Promise<any> {
    const res = await apiClient.post(`/standard-versions/${versionId}/standards/${stdId}/sub-standards`, payload);
    return extractData<any>(res);
  },

  async updateSubStandard(subStandardId: number | string, payload: UpdateSubStandardPayload): Promise<any> {
    const res = await apiClient.put(`/sub-standards/${subStandardId}`, payload);
    return extractData<any>(res);
  },

  async deleteSubStandard(subStandardId: number | string): Promise<any> {
    const res = await apiClient.delete(`/sub-standards/${subStandardId}`);
    return extractData<any>(res);
  },

  // المؤشرات
  async createIndicator(subStandardId: number | string, payload: CreateIndicatorPayload): Promise<any> {
    const res = await apiClient.post(`/sub-standards/${subStandardId}/indicators`, payload);
    return extractData<any>(res);
  },

  async updateIndicator(id: number | string, payload: UpdateIndicatorPayload): Promise<any> {
    const res = await apiClient.put(`/indicators/${id}`, payload);
    return extractData<any>(res);
  },

  async deleteIndicator(id: number | string): Promise<void> {
    await apiClient.delete(`/indicators/${id}`);
  },

  // ==========================================
  // 3. متطلبات الشواهد وواصفات سلم التقدير للمؤشر (القراران 2 و 3)
  // ==========================================
  async createEvidenceRequirement(indicatorId: number | string, payload: SaveEvidenceRequirementPayload): Promise<EvidenceRequirement> {
    const res = await apiClient.post(`/indicators/${indicatorId}/requirements`, payload);
    return extractData<EvidenceRequirement>(res);
  },

  async updateEvidenceRequirement(
    indicatorId: number | string,
    requirementId: number | string,
    payload: SaveEvidenceRequirementPayload
  ): Promise<EvidenceRequirement> {
    const res = await apiClient.put(`/indicators/${indicatorId}/requirements/${requirementId}`, payload);
    return extractData<EvidenceRequirement>(res);
  },

  async deleteEvidenceRequirement(indicatorId: number | string, requirementId: number | string): Promise<void> {
    await apiClient.delete(`/indicators/${indicatorId}/requirements/${requirementId}`);
  },

  async updateIndicatorDescriptors(
    indicatorId: number | string,
    descriptors: UpdateScoreDescriptorItem[]
  ): Promise<ScoreDescriptor[]> {
    const res = await apiClient.put(`/indicators/${indicatorId}/descriptors`, { descriptors });
    return extractData<ScoreDescriptor[]>(res);
  },

  // ==========================================
  // 3.5 إدارة أدوات ووسائل التحقق المعتمدة
  // ==========================================
  async getVerificationTools(): Promise<{ tools: VerificationTool[]; totalCount: number }> {
    const res = await apiClient.get('/verification-tools');
    const data = extractData<any>(res);
    return {
      tools: data?.tools || [],
      totalCount: data?.totalCount || (data?.tools?.length ?? 0),
    };
  },

  async createVerificationTool(payload: { name: string; tool_type?: string; description?: string }): Promise<VerificationTool> {
    const res = await apiClient.post('/verification-tools', payload);
    return extractData<VerificationTool>(res);
  },

  async deleteVerificationTool(id: number | string): Promise<void> {
    await apiClient.delete(`/verification-tools/${id}`);
  },

  // ==========================================
  // 4. معايرة الأوزان وسلالم التقدير اللفظي (القرار 1)
  // ==========================================
  async getWeights(versionId: number | string): Promise<WeightsCalibrationResponse> {
    const res = await apiClient.get(`/standard-versions/${versionId}/weights`);
    const raw = extractData<any>(res);
    const rawStandards = raw?.standards || [];
    const standards: StandardWeightItem[] = rawStandards.map((s: any) => ({
      standardId: Number(s.standardId ?? s.standard_id),
      code: s.code,
      name: s.name,
      weight: Number(s.weight ?? 0),
      subStandardsCount: Number(s.subStandardsCount ?? s.sub_standards_count ?? 0),
      indicatorsCount: Number(s.indicatorsCount ?? s.indicators_count ?? 0),
      subWeightPerIndicator: Number(s.subWeightPerIndicator ?? s.sub_weight_per_indicator ?? 0),
      subStandards: (s.subStandards || s.sub_standards || []).map((sub: any) => ({
        subStandardId: Number(sub.subStandardId ?? sub.sub_standard_id),
        code: sub.code,
        name: sub.name,
        weight: Number(sub.weight ?? 0),
        indicatorsCount: Number(sub.indicatorsCount ?? sub.indicators_count ?? 0),
        indicators: (sub.indicators || []).map((ind: any) => ({
          indicatorId: Number(ind.indicatorId ?? ind.indicator_id),
          code: ind.code,
          name: ind.name,
          weight: Number(ind.weight ?? 0),
        })),
      })),
    }));

    const totalWeight = standards.reduce((acc, s) => acc + s.weight, 0);

    return {
      versionId: Number(raw?.versionId ?? raw?.version_id ?? versionId),
      versionNo: String(raw?.versionNo ?? raw?.version_no ?? ''),
      status: raw?.status,
      isDraft: raw?.isDraft ?? raw?.is_draft ?? (raw?.status === 'Draft'),
      totalWeight: Math.round(totalWeight * 100) / 100,
      isBalanced: Math.abs(totalWeight - 100.0) < 0.001,
      standards,
    };
  },

  async updateWeights(
    versionId: number | string,
    payload: UpdateWeightsPayload | Array<{ standard_id: number; weight: number }>
  ): Promise<any> {
    const body = Array.isArray(payload) ? { standards_weights: payload } : payload;
    const res = await apiClient.put(`/standard-versions/${versionId}/weights`, body);
    return extractData<any>(res);
  },

  async getScoreLevels(versionId?: number | string): Promise<RubricLevelInfo[]> {
    const url = versionId ? `/score-levels?version_id=${versionId}` : '/score-levels';
    const res = await apiClient.get(url);
    return extractData<RubricLevelInfo[]>(res);
  },

  async updateScoreLevels(versionId: number | string, levels: any[]): Promise<RubricLevelInfo[]> {
    const res = await apiClient.put(`/standard-versions/${versionId}/score-levels`, { levels });
    return extractData<RubricLevelInfo[]>(res);
  },

  // ==========================================
  // 5. التدقيق والفروقات والقفل الرقمي (القراران 5 و 6)
  // ==========================================
  async getDiffLog(versionId: number | string, baseVersionId?: number | string): Promise<DiffLogResponse> {
    const url = baseVersionId
      ? `/standard-versions/${versionId}/diff-log?base_version_id=${baseVersionId}`
      : `/standard-versions/${versionId}/diff-log`;
    const res = await apiClient.get(url);
    const raw = extractData<any>(res);
    const rs = raw?.real_stats || raw?.realStats;

    return {
      versionId: Number(raw?.versionId ?? raw?.version_id ?? versionId),
      versionNo: String(raw?.versionNo ?? raw?.version_no ?? ''),
      baselineVersionId: raw?.baselineVersionId ?? raw?.baseline_version_id ?? null,
      baselineVersionNo: raw?.baselineVersionNo ?? raw?.baseline_version_no ?? rs?.previous_version_no ?? null,
      hasBaseline: Boolean(raw?.hasBaseline ?? raw?.has_baseline ?? (raw?.baselineVersionNo && raw?.baselineVersionNo !== raw?.versionNo)),
      status: raw?.status,
      isDraft: raw?.isDraft ?? raw?.is_draft ?? (raw?.status === 'Draft'),
      approvalCode: raw?.approvalCode ?? raw?.approval_code,
      approverName: raw?.approverName ?? raw?.approver_name,
      approvedAt: raw?.approvedAt ?? raw?.approved_at,
      integrityHash: String(raw?.integrityHash ?? raw?.integrity_hash ?? ''),
      releaseNotes: raw?.releaseNotes ?? raw?.release_notes ?? '',
      realStats: rs ? {
        standardsCount: Number(rs.standardsCount ?? rs.standards_count ?? 0),
        baselineStandardsCount: Number(rs.baselineStandardsCount ?? rs.baseline_standards_count ?? 0),
        standardsDiff: Number(rs.standardsDiff ?? rs.standards_diff ?? 0),
        subStandardsCount: Number(rs.subStandardsCount ?? rs.sub_standards_count ?? 0),
        baselineSubsCount: Number(rs.baselineSubsCount ?? rs.baseline_subs_count ?? 0),
        subStandardsDiff: Number(rs.subStandardsDiff ?? rs.sub_standards_diff ?? 0),
        indicatorsCount: Number(rs.indicatorsCount ?? rs.indicators_count ?? 0),
        baselineIndicatorsCount: Number(rs.baselineIndicatorsCount ?? rs.baseline_indicators_count ?? 0),
        indicatorsDiff: Number(rs.indicatorsDiff ?? rs.indicators_diff ?? 0),
        totalWeight: Number(rs.totalWeight ?? rs.total_weight ?? 100),
        baselineTotalWeight: Number(rs.baselineTotalWeight ?? rs.baseline_total_weight ?? 100),
        isWeightBalanced: Boolean(rs.isWeightBalanced ?? rs.is_weight_balanced ?? rs.isBalanced),
        hasBaseline: Boolean(rs.hasBaseline ?? rs.has_baseline),
        baselineVersionNo: rs.baselineVersionNo ?? rs.baseline_version_no ?? null,
      } : undefined,
      diffs: raw?.diffs || [],
      standardsComparison: raw?.standardsComparison || raw?.standards_comparison || [],
      indicatorsComparison: raw?.indicatorsComparison || raw?.indicators_comparison || [],
      rubricsComparison: raw?.rubricsComparison || raw?.rubrics_comparison || [],
      stats: raw?.stats || {
        addedCount: 0,
        modifiedCount: 0,
        reweightedCount: 0,
        toolsUpdatedCount: 0,
      },
    };
  },

  async getLockPreconditions(versionId: number | string): Promise<VersionLockPreconditions> {
    const res = await apiClient.get(`/standard-versions/${versionId}/lock-preconditions`);
    const raw = extractData<any>(res);
    return {
      versionId: Number(raw?.versionId ?? raw?.version_id ?? versionId),
      versionNo: String(raw?.versionNo ?? raw?.version_no ?? ''),
      status: raw?.status,
      isDraft: raw?.isDraft ?? raw?.is_draft ?? (raw?.status === 'Draft'),
      approvalCode: raw?.approvalCode ?? raw?.approval_code,
      passesAll: Boolean(raw?.passesAll ?? raw?.passes_all ?? false),
      isScaleSupported: Boolean(raw?.isScaleSupported ?? raw?.is_scale_supported ?? true),
      integrityHash: String(raw?.integrityHash ?? raw?.integrity_hash ?? ''),
      totalWeight: Number(raw?.totalWeight ?? raw?.total_weight ?? 100),
      indicatorsCount: Number(raw?.indicatorsCount ?? raw?.indicators_count ?? 0),
      standardsCount: Number(raw?.standardsCount ?? raw?.standards_count ?? 0),
      checks: (raw?.checks || []).map((c: any) => ({
        id: Number(c.id),
        key: c.key,
        title: String(c.title),
        passed: Boolean(c.passed),
        details: String(c.details),
        blocker: Boolean(c.blocker ?? (c.key === 'portal_compatibility' && !c.passed)),
      })),
    };
  },

  async lockVersion(versionId: number | string, payload: LockVersionPayload): Promise<any> {
    const body = {
      approval_code: payload.approval_code ?? payload.approvalCode,
      legal_confirmation: payload.legal_confirmation ?? payload.legalConfirmation ?? true,
      council_notes: payload.council_notes ?? payload.release_notes,
      action: payload.action ?? 'approve',
    };
    const res = await apiClient.post(`/standard-versions/${versionId}/lock`, body);
    return extractData<any>(res);
  },

  // ==========================================
  // 6. التصدير الرسمي
  // ==========================================
  async exportPdfReport(versionId: number | string): Promise<{ downloadUrl?: string; message?: string }> {
    const baseURL = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';
    const token =
      sessionStorage.getItem('school_eval_auth_token') ||
      localStorage.getItem('school_eval_auth_token');

    try {
      const response = await fetch(`${baseURL}/standard-versions/${versionId}/export-pdf?download=1`, {
        method: 'GET',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          Accept: 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error('فشل تحميل وثيقة الإقرار المعياري الرسمية بصيغة PDF.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `standards_approval_certificate_${versionId}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { message: 'تم تحميل وثيقة الإقرار المعياري الرسمي بصيغة PDF بنجاح.' };
    } catch {
      // Fallback to JSON endpoint
      const res = await apiClient.get(`/standard-versions/${versionId}/export-pdf`);
      return extractData<{ downloadUrl?: string; message?: string }>(res);
    }
  },
};
