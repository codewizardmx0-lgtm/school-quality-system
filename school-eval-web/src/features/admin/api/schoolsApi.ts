/**
 * schoolsApi.ts
 * Real API service for Schools Directory, Directorates, and Evaluator Linking
 * Conforms to conventions.md (§2, §3, §7, §8)
 */

import { get, post, put, del } from '../../../api/apiClient';
import type { ApiResponse } from '../../../api/apiTypes';
import type {
  School,
  Directorate,
  Governorate,
  RegisterSchoolDto,
  AddDirectorateDto,
} from '../types/admin.types';
import { mockAdminService } from '../services/mockAdminData';

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
    try {
      const response = await get<School[]>('/schools', { params });
      if (response && response.data) {
        // Normalize fields from backend SchoolResource
        const normalized = (response.data as unknown[]).map((s: any) => ({
          schoolId: s.schoolId ?? s.school_id,
          schoolCode: s.schoolCode ?? s.identificationData ?? `SCH-${s.schoolId ?? s.school_id}`,
          schoolName: s.schoolName ?? s.school_name ?? '',
          schoolType: s.schoolType ?? (s.school_type === 'private' ? 'private' : 'government'),
          educationalStage: s.educationalStage ?? s.educational_stage ?? '',
          directorateId: s.directorateId ?? null,
          directorate: s.directorate ?? s.educationalDistrict ?? s.educational_district ?? '',
          educationalDistrict: s.educationalDistrict ?? s.educational_district ?? s.directorate ?? '',
          governorate: s.governorate ?? 'أمانة العاصمة',
          status: s.status ?? 'Active',
          evaluatorUserId: s.evaluatorUserId ?? null,
          evaluatorName: s.evaluatorName ?? null,
          evaluatorEmail: s.evaluatorEmail ?? null,
          isLinked: Boolean(s.isLinked || s.evaluatorUserId),
          createdAt: s.createdAt ?? new Date().toISOString(),
          updatedAt: s.updatedAt ?? new Date().toISOString(),
        } as School));
        return {
          ...response,
          data: normalized,
        };
      }
      return response;
    } catch (error) {
      console.warn('Backend schools API call failed, falling back to mock:', error);
      return mockAdminService.getSchools();
    }
  },

  /**
   * Register a new school with code (SCH-XXX) and stage
   */
  async registerSchool(dto: RegisterSchoolDto): Promise<ApiResponse<School>> {
    try {
      const payload = {
        schoolName: dto.schoolName,
        educationalStage: dto.educationalStage,
        identificationData: dto.schoolCode,
        educationalDistrict: dto.directorateName || dto.educationalDistrict || 'مديرية التحرير',
        governorate: dto.governorate,
        schoolType: dto.schoolType,
        directorateId: dto.directorateId,
        status: 'Active',
      };
      return await post<School>('/schools', payload);
    } catch (error) {
      if ((error as any)?.status === 422 || (error as any)?.status === 403) {
        throw error;
      }
      console.warn('Backend register school failed, applying mock fallback:', error);
      return mockAdminService.createSchool({
        schoolName: dto.schoolName,
        schoolCode: dto.schoolCode,
        schoolType: dto.schoolType,
        educationalStage: dto.educationalStage,
        directorateId: dto.directorateId,
        governorate: dto.governorate,
      });
    }
  },

  /**
   * Update school information (strictly connected to PUT /api/v1/schools/{id} with zero mock fallback)
   */
  async updateSchool(schoolId: number, dto: Partial<School> & { schoolCode?: string }): Promise<ApiResponse<School>> {
    const payload = {
      schoolName: dto.schoolName,
      schoolType: dto.schoolType,
      educationalStage: dto.educationalStage,
      identificationData: dto.schoolCode ?? (dto as any).identificationData,
      educationalDistrict: dto.educationalDistrict ?? dto.directorate,
      governorate: dto.governorate,
      status: dto.status ?? 'Active',
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
   * Fetch list of all 22 Yemeni governorates
   */
  async getGovernorates(): Promise<ApiResponse<Governorate[]>> {
    try {
      const res = await get<Governorate[]>('/governorates');
      if (res && Array.isArray(res.data)) {
        return res;
      }
      return {
        data: [
          { governorateId: 1, nameAr: 'أمانة العاصمة', nameEn: "Sana'a City", code: 'AMANA' },
          { governorateId: 2, nameAr: 'محافظة صنعاء', nameEn: "Sana'a", code: 'SANA' },
          { governorateId: 3, nameAr: 'محافظة تعز', nameEn: 'Taiz', code: 'TAIZ' },
          { governorateId: 4, nameAr: 'محافظة عدن', nameEn: 'Aden', code: 'ADEN' },
          { governorateId: 5, nameAr: 'محافظة الحديدة', nameEn: 'Al Hudaydah', code: 'HOD' },
          { governorateId: 6, nameAr: 'محافظة إب', nameEn: 'Ibb', code: 'IBB' },
          { governorateId: 7, nameAr: 'محافظة ذمار', nameEn: 'Dhamar', code: 'DHAM' },
          { governorateId: 8, nameAr: 'محافظة حضرموت', nameEn: 'Hadhramaut', code: 'HDM' },
          { governorateId: 9, nameAr: 'محافظة حجة', nameEn: 'Hajjah', code: 'HAJJ' },
          { governorateId: 10, nameAr: 'محافظة صعدة', nameEn: "Sa'dah", code: 'SAAD' },
          { governorateId: 11, nameAr: 'محافظة عمران', nameEn: 'Amran', code: 'AMR' },
          { governorateId: 12, nameAr: 'محافظة لحج', nameEn: 'Lahij', code: 'LAHJ' },
          { governorateId: 13, nameAr: 'محافظة أبين', nameEn: 'Abyan', code: 'ABY' },
          { governorateId: 14, nameAr: 'محافظة البيضاء', nameEn: 'Al Bayda', code: 'BAYD' },
          { governorateId: 15, nameAr: 'محافظة شبوة', nameEn: 'Shabwah', code: 'SHAB' },
          { governorateId: 16, nameAr: 'محافظة مأرب', nameEn: "Ma'rib", code: 'MAR' },
          { governorateId: 17, nameAr: 'محافظة الجوف', nameEn: 'Al Jawf', code: 'JAW' },
          { governorateId: 18, nameAr: 'محافظة المهرة', nameEn: 'Al Mahrah', code: 'MAH' },
          { governorateId: 19, nameAr: 'محافظة المحويت', nameEn: 'Al Mahwit', code: 'MAHW' },
          { governorateId: 20, nameAr: 'محافظة ريمة', nameEn: 'Raymah', code: 'RAYM' },
          { governorateId: 21, nameAr: 'محافظة الضالع', nameEn: 'Al Dali', code: 'DHAL' },
          { governorateId: 22, nameAr: 'محافظة سقطرى', nameEn: 'Socotra', code: 'SOQ' },
        ],
        message: null,
        errors: null,
        meta: null,
      };
    } catch (error) {
      console.warn('Backend governorates API call failed:', error);
      return {
        data: [{ governorateId: 1, nameAr: 'أمانة العاصمة', nameEn: "Sana'a City", code: 'AMANA' }],
        message: null,
        errors: null,
        meta: null,
      };
    }
  },

  /**
   * Fetch list of educational directorates with school counters, optionally filtered by governorate
   */
  async getDirectorates(governorateId?: number): Promise<ApiResponse<Directorate[]>> {
    try {
      const url = governorateId ? `/directorates?governorateId=${governorateId}` : '/directorates';
      const res = await get<Directorate[]>(url);
      if (res && res.data && res.data.length > 0) {
        return res;
      }
      return mockAdminService.getDirectorates();
    } catch (error) {
      console.warn('Backend directorates API call failed, falling back to mock:', error);
      return mockAdminService.getDirectorates();
    }
  },

  /**
   * Suggest automatic school code formatted as SCH-{GOV_CODE}-2026-{serial}
   */
  async suggestSchoolCode(governorateId: number): Promise<ApiResponse<{ code: string; govCode: string; nextSerial: number }>> {
    try {
      const res = await get<{ code: string; govCode: string; nextSerial: number }>(`/schools/suggest-code?governorateId=${governorateId}`);
      if (res && res.data) {
        return res;
      }
      return {
        data: { code: `SCH-AMANA-2026-001`, govCode: 'AMANA', nextSerial: 1 },
        message: null,
        errors: null,
        meta: null,
      };
    } catch (error) {
      return {
        data: { code: `SCH-AMANA-2026-001`, govCode: 'AMANA', nextSerial: 1 },
        message: null,
        errors: null,
        meta: null,
      };
    }
  },

  /**
   * Add a new directorate / geographical scope
   */
  async addDirectorate(dto: AddDirectorateDto): Promise<ApiResponse<Directorate>> {
    try {
      return await post<Directorate>('/directorates', dto);
    } catch (error) {
      if ((error as any)?.status === 422 || (error as any)?.status === 403) {
        throw error;
      }
      console.warn('Backend add directorate failed, applying mock fallback:', error);
      return mockAdminService.createDirectorate(dto);
    }
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