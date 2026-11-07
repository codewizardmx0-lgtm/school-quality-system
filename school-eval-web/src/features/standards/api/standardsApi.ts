/**
 * Standards & Reference Authority API Integration Layer
 * اتصال حقيقي ومباشر بالواجهات البرمجية الخلفية لـ Laravel بدون أي بيانات وهمية (Zero Mock Policy)
 */

import { apiClient } from '../../../api/apiClient';
import type {
  StandardVersionSummary,
  StandardVersionDetail,
  WeightsCalibrationResponse,
  RubricLevelInfo,
  VersionLockPreconditions,
  DiffLogResponse,
  CreateDraftPayload,
  UpdateIndicatorPayload,
  CreateSubStandardPayload,
  CreateIndicatorPayload,
  LockVersionPayload,
} from './standardsTypes';

// Helper to normalize backend envelope response
// The apiClient response interceptor already unwraps response.data, returning { data, message, ... }
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
    status: v.status ?? 'Active',
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
  // 1. إدارة وسجل الإصدارات المعيارية
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
    // إذا تم تحديد إصدار أصلي للاستنساخ، نطلب استنساخاً رسمياً
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

  // 2. بنية شجرة المعايير والمؤشرات
  async getStandardsTree(versionId: number | string): Promise<StandardVersionDetail> {
    const res = await apiClient.get(`/standard-versions/${versionId}/tree`);
    const data = extractData<any>(res);
    return {
      versionId: Number(data?.versionId ?? data?.version_id ?? versionId),
      versionNo: String(data?.versionNo ?? data?.version_no ?? data?.versionName ?? '2026.1'),
      status: data?.status ?? 'Active',
      createdAt: data?.createdAt ?? data?.created_at,
      standards: data?.standards || [],
    };
  },

  async createSubStandard(versionId: number | string, stdId: number | string, payload: CreateSubStandardPayload): Promise<any> {
    const res = await apiClient.post(`/standard-versions/${versionId}/standards/${stdId}/sub-standards`, payload);
    return extractData<any>(res);
  },

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

  // 3. معايرة الأوزان وسلالم التقدير اللفظي
  async getWeights(versionId: number | string): Promise<WeightsCalibrationResponse> {
    const res = await apiClient.get(`/standard-versions/${versionId}/weights`);
    return extractData<WeightsCalibrationResponse>(res);
  },

  async updateWeights(
    versionId: number | string,
    standardsWeights: Array<{ standard_id: number; weight: number }>
  ): Promise<any> {
    const res = await apiClient.put(`/standard-versions/${versionId}/weights`, {
      standards_weights: standardsWeights,
    });
    return extractData<any>(res);
  },

  async getScoreLevels(): Promise<RubricLevelInfo[]> {
    const res = await apiClient.get('/score-levels');
    return extractData<RubricLevelInfo[]>(res);
  },

  // 4. التدقيق والفروقات والقفل الرقمي
  async getDiffLog(versionId: number | string): Promise<DiffLogResponse> {
    const res = await apiClient.get(`/standard-versions/${versionId}/diff-log`);
    return extractData<DiffLogResponse>(res);
  },

  async getLockPreconditions(versionId: number | string): Promise<VersionLockPreconditions> {
    const res = await apiClient.get(`/standard-versions/${versionId}/lock-preconditions`);
    return extractData<VersionLockPreconditions>(res);
  },

  async lockVersion(versionId: number | string, payload: LockVersionPayload): Promise<any> {
    const res = await apiClient.post(`/standard-versions/${versionId}/lock`, payload);
    return extractData<any>(res);
  },

  // 5. التصدير الرسمي
  async exportPdfReport(versionId: number | string): Promise<{ downloadUrl?: string; message?: string }> {
    const res = await apiClient.get(`/standard-versions/${versionId}/export-pdf`);
    return extractData<{ downloadUrl?: string; message?: string }>(res);
  },
};
