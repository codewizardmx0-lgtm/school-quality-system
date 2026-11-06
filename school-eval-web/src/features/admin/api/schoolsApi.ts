/**
 * schoolsApi.ts
 * Real API service for Schools Directory, Directorates, and Evaluator Linking
 * Conforms to conventions.md (§2, §3, §7, §8) - Strictly Real Backend with Zero Mock Fallbacks
 */

import { get, post, put, patch, del } from '../../../api/apiClient';
import type { ApiResponse } from '../../../api/apiTypes';
import type {
  School,
  Directorate,
  Governorate,
  RegisterSchoolDto,
  AddDirectorateDto,
} from '../types/admin.types';

export interface SchoolsQueryParams {
  directorateId?: number;
  type?: string;
  status?: string;
  q?: string;
  page?: number;
  perPage?: number;
}

export const schoolsApi = {
  /**
   * Fetch schools list with filters
   */
  async getSchools(params?: SchoolsQueryParams): Promise<ApiResponse<School[]>> {
    const response = await get<School[]>('/schools', { params });
    if (response && response.data) {
      // Normalize fields from backend SchoolResource
      const normalized = (response.data as unknown[]).map((s: any) => ({
        schoolId: s.schoolId ?? s.school_id,
        schoolCode: s.schoolCode ?? s.identificationData ?? `SCH-${s.schoolId ?? s.school_id}`,
        schoolName: s.schoolName ?? s.school_name ?? '',
        schoolType: s.schoolType ?? (s.school_type === 'private' ? 'private' : 'government'),
        educationalStage: s.educationalStage ?? s.educational_stage ?? '',
        governorateId: s.governorateId ?? s.governorate_id ?? 1,
        directorateId: s.directorateId ?? s.directorate_id ?? null,
        directorate: s.directorate ?? s.educationalDistrict ?? s.educational_district ?? '',
        educationalDistrict: s.educationalDistrict ?? s.educational_district ?? s.directorate ?? '',
        governorate: s.governorate ?? 'أمانة العاصمة',
        status: s.status ?? 'Active',
        // Principal & Evaluator details from SchoolResource
        principal: s.principal ?? null,
        evaluators: s.evaluators ?? [],
        evaluatorUserId: s.evaluatorUserId ?? s.evaluators?.[0]?.userId ?? null,
        evaluatorName: s.evaluatorName ?? s.evaluators?.[0]?.fullName ?? null,
        evaluatorEmail: s.evaluatorEmail ?? s.evaluators?.[0]?.email ?? null,
        isLinked: Boolean(s.isLinked || s.evaluatorUserId || s.principal || (s.evaluators && s.evaluators.length > 0)),
        createdAt: s.createdAt ?? new Date().toISOString(),
        updatedAt: s.updatedAt ?? new Date().toISOString(),
      } as School));
      return {
        ...response,
        data: normalized,
      };
    }
    return { data: [], message: null, errors: null, meta: null };
  },

  /**
   * Register a new school with code (SCH-XXX) and stage
   */
  async registerSchool(dto: RegisterSchoolDto): Promise<ApiResponse<School>> {
    const payload = {
      schoolName: dto.schoolName,
      educationalStage: dto.educationalStage,
      identificationData: dto.schoolCode,
      educationalDistrict: dto.directorateName || dto.educationalDistrict || 'مديرية التحرير',
      governorate: dto.governorate,
      governorateId: dto.governorateId,
      schoolType: dto.schoolType,
      directorateId: dto.directorateId,
      status: 'Active',
    };
    return await post<School>('/schools', payload);
  },

  /**
   * Update school information (strictly connected to PUT /api/v1/schools/{id} with zero mock fallback)
   */
  async updateSchool(schoolId: number, dto: Partial<School>): Promise<ApiResponse<School>> {
    const payload = {
      schoolName: dto.schoolName,
      schoolCode: dto.schoolCode,
      identificationData: dto.schoolCode,
      schoolType: dto.schoolType,
      educationalStage: dto.educationalStage,
      governorate: dto.governorate,
      governorateId: dto.governorateId,
      directorate: dto.directorate,
      directorateId: dto.directorateId,
      status: dto.status,
    };
    return await put<School>(`/schools/${schoolId}`, payload);
  },

  /**
   * Assign active evaluator (userId) to the school
   */
  async assignEvaluator(schoolId: number, userId: number): Promise<ApiResponse<School>> {
    return await post<School>(`/schools/${schoolId}/assign-evaluator`, { userId });
  },

  /**
   * Unassign an evaluator from a school
   */
  async unassignEvaluator(schoolId: number, userId: number): Promise<ApiResponse<School>> {
    return await post<School>(`/schools/${schoolId}/unassign-evaluator`, { userId });
  },

  /**
   * Assign school principal (exactly one principal per school)
   */
  async assignPrincipal(schoolId: number, userId: number): Promise<ApiResponse<School>> {
    return await post<School>(`/schools/${schoolId}/assign-principal`, { userId });
  },

  /**
   * Unassign school principal
   */
  async unassignPrincipal(schoolId: number): Promise<ApiResponse<School>> {
    return await post<School>(`/schools/${schoolId}/unassign-principal`, {});
  },

  /**
   * Toggle school active/inactive status
   */
  async toggleSchoolStatus(schoolId: number): Promise<ApiResponse<School>> {
    return await patch<School>(`/schools/${schoolId}/toggle-status`);
  },

  /**
   * Delete an unlinked school created by mistake
   */
  async deleteSchool(schoolId: number): Promise<ApiResponse<{ schoolId: number }>> {
    return await del<{ schoolId: number }>(`/schools/${schoolId}`);
  },

  /**
   * Fetch list of all 22 Yemeni governorates
   */
  async getGovernorates(): Promise<ApiResponse<Governorate[]>> {
    const res = await get<Governorate[]>('/governorates');
    if (res && Array.isArray(res.data)) {
      return res;
    }
    return { data: [], message: null, errors: null, meta: null };
  },

  /**
   * Fetch list of educational directorates with school counters, optionally filtered by governorate
   */
  async getDirectorates(governorateId?: number): Promise<ApiResponse<Directorate[]>> {
    const url = governorateId ? `/directorates?governorateId=${governorateId}` : '/directorates';
    const res = await get<Directorate[]>(url);
    if (res && Array.isArray(res.data)) {
      return res;
    }
    return { data: [], message: null, errors: null, meta: null };
  },

  /**
   * Suggest automatic school code formatted as SCH-{GOV_CODE}-2026-{serial}
   */
  async suggestSchoolCode(governorateId: number): Promise<ApiResponse<{ code: string; govCode: string; nextSerial: number }>> {
    return await get<{ code: string; govCode: string; nextSerial: number }>(`/schools/suggest-code?governorateId=${governorateId}`);
  },

  /**
   * Add a new directorate / geographical scope
   */
  async addDirectorate(dto: AddDirectorateDto): Promise<ApiResponse<Directorate>> {
    return await post<Directorate>('/directorates', dto);
  },

  /**
   * Update an existing educational directorate
   */
  async updateDirectorate(id: number, dto: AddDirectorateDto): Promise<ApiResponse<Directorate>> {
    return await put<Directorate>(`/directorates/${id}`, dto);
  },

  /**
   * Delete an educational directorate (prevented if linked to schools)
   */
  async deleteDirectorate(id: number): Promise<ApiResponse<null>> {
    return await del<null>(`/directorates/${id}`);
  },

  /**
   * Download the official Executive Operations PDF report directly from backend mPDF engine
   */
  async downloadExecutivePdf(): Promise<void> {
    const token =
      localStorage.getItem('auth_token') ||
      sessionStorage.getItem('school_eval_auth_token') ||
      localStorage.getItem('school_eval_auth_token');

    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseURL}/admin/export-report-pdf`, {
      method: 'GET',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        Accept: 'application/pdf',
      },
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      throw new Error(errorJson?.message || 'فشل تحميل تقرير PDF التنفيذي من الخادم.');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // استخراج اسم الملف من ترويسة Content-Disposition أو توليده بالوقت والتاريخ بدقة 24 ساعة
    let downloadFilename = '';
    const disposition = response.headers.get('content-disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        downloadFilename = match[1];
      }
    }

    if (!downloadFilename) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      downloadFilename = `erteqa_executive_report_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.pdf`;
    }

    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
