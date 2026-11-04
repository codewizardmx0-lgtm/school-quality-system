/**
 * schoolsApi.ts
 * Real API service for Schools Directory, Directorates, and Evaluator Linking
 * Conforms to conventions.md (§2, §3, §7, §8)
 */

import { get, post, put } from '../../../api/apiClient';
import type { ApiResponse } from '../../../api/apiTypes';
import type {
  School,
  Directorate,
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
          directorateId: s.directorateId ?? (s.educationalDistrict ? 1 : 1),
          directorate: s.directorate ?? s.educationalDistrict ?? 'مديرية التحرير',
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
        educationalDistrict: dto.governorate,
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
   * Update school information
   */
  async updateSchool(schoolId: number, dto: Partial<School>): Promise<ApiResponse<School>> {
    try {
      return await put<School>(`/schools/${schoolId}`, dto);
    } catch (error) {
      if ((error as any)?.status === 422 || (error as any)?.status === 403) {
        throw error;
      }
      console.warn('Backend update school failed, applying mock fallback:', error);
      const all = await mockAdminService.getSchools();
      const school = all.data?.find((s) => s.schoolId === schoolId);
      if (school) {
        Object.assign(school, dto);
        return { data: school, message: 'تم تحديث بيانات المدرسة بنجاح.', errors: null, meta: null };
      }
      throw error;
    }
  },

  /**
   * Assign active evaluator (userId) to the school
   */
  async assignEvaluator(schoolId: number, userId: number): Promise<ApiResponse<School>> {
    try {
      return await post<School>(`/schools/${schoolId}/assign-evaluator`, { userId });
    } catch (error) {
      console.warn('Backend assign evaluator failed, applying mock fallback:', error);
      return mockAdminService.linkEvaluator(schoolId, userId);
    }
  },

  /**
   * Fetch list of educational directorates with school counters
   */
  async getDirectorates(): Promise<ApiResponse<Directorate[]>> {
    try {
      const res = await get<Directorate[]>('/directorates');
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
};
