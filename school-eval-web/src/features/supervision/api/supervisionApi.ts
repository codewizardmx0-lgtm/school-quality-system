/**
 * supervisionApi.ts
 * طبقة الربط البرمجي الحقيقي للمشرف الوزاري مع خادم لارافيل
 * Zero Mock Data Policy (§16): لا توجد بيانات تجريبية وهمية هنا نهائياً
 * أي خطأ في الاتصال يُمرر مباشرة للمكونات لعرض رسائل الخطأ النظامية أو EmptyState
 */

import { get, post } from '../../../api/apiClient';
import type {
  SupervisionDashboardData,
  ActiveStandardVersion,
  CycleLaunchPayload,
  SubmissionReviewData,
  CreateCompletionRequestPayload,
  CompletionRequestResponse,
  SchoolTrackingLogData,
  SupervisorMemo,
  CentralReportsData,
  HistoricalComparisonData,
} from './supervisionTypes';

export const supervisionApi = {
  /**
   * 1. استرجاع لوحة المتابعة الإشرافية المركزية ومصفوفة حالة المدارس
   * GET /api/v1/supervision/dashboard
   */
  async getDashboard(): Promise<SupervisionDashboardData> {
    const response = await get<SupervisionDashboardData>('/supervision/dashboard');
    if (!response?.data) {
      throw new Error(response?.message || 'تعذر استرجاع بيانات لوحة المتابعة الإشرافية.');
    }
    return response.data;
  },

  /**
   * 2. استرجاع بيانات وثيقة المعايير الوطنية النشطة والمقرة
   * GET /api/v1/standard-versions/active
   */
  async getActiveStandardVersion(): Promise<ActiveStandardVersion> {
    const response = await get<ActiveStandardVersion>('/standard-versions/active');
    if (!response?.data) {
      throw new Error(response?.message || 'تعذر استرجاع الإصدار المعياري النشط.');
    }
    return response.data;
  },

  /**
   * 3. إطلاق دورة تقييمية جديدة وربطها بنطاق المدارس
   * POST /api/v1/evaluation-cycles
   */
  async launchCycle(payload: CycleLaunchPayload): Promise<any> {
    const response = await post<any>('/evaluation-cycles', {
      academic_year: payload.academicYear,
      name: payload.name,
      start_date: payload.startDate,
      end_date: payload.endDate,
      school_ids: payload.schoolIds,
      enroll_all_schools: payload.enrollAllSchools ?? true,
      public_directives: payload.publicDirectives,
      completion_deadline_days: payload.completionDeadlineDays ?? 14,
    });
    if (!response?.data && response?.errors) {
      const firstError = Object.values(response.errors)[0]?.[0];
      throw new Error(firstError || response.message || 'فشل إطلاق دورة التقييم.');
    }
    return response?.data ?? response;
  },

  /**
   * 4. فحص مخرج التقييم ومطابقة الشواهد والمؤشرات
   * GET /api/v1/evaluation-submissions/{id}/review
   */
  async getSubmissionReview(submissionId: number): Promise<SubmissionReviewData> {
    const response = await get<SubmissionReviewData>(`/evaluation-submissions/${submissionId}/review`);
    if (!response?.data) {
      throw new Error(response?.message || 'تعذر استرجاع ملف مراجعة المخرج.');
    }
    return response.data;
  },

  /**
   * 5. اعتماد اكتمال المراجعة الإدارية للمخرج
   * POST /api/v1/evaluation-submissions/{id}/approve
   */
  async approveSubmission(submissionId: number, notes?: string): Promise<{ submissionId: number; status: string }> {
    const response = await post<{ submissionId: number; status: string }>(
      `/evaluation-submissions/${submissionId}/approve`,
      { notes }
    );
    if (!response?.data) {
      throw new Error(response?.message || 'تعذر اعتماد المخرج.');
    }
    return response.data;
  },

  /**
   * 6. إصدار طلب استكمال رسمي موجه لمدرسة
   * POST /api/v1/evaluation-submissions/{id}/completion-requests
   */
  async createCompletionRequest(
    submissionId: number,
    payload: CreateCompletionRequestPayload
  ): Promise<CompletionRequestResponse> {
    const formattedPayload = {
      notes: payload.notes,
      completion_deadline: payload.completionDeadline,
      items: payload.items.map((item) => ({
        indicator_id: item.indicatorId,
        missing_description: item.missingDescription,
        evidence_link_id: item.evidenceLinkId ?? null,
        defect_reason: item.defectReason,
        directives: item.directives,
      })),
    };

    const response = await post<CompletionRequestResponse>(
      `/evaluation-submissions/${submissionId}/completion-requests`,
      formattedPayload
    );
    if (!response?.data) {
      throw new Error(response?.message || 'تعذر إصدار طلب الاستكمال.');
    }
    return response.data;
  },

  /**
   * 7. استرجاع تفاصيل طلب استكمال برقم المعرف
   * GET /api/v1/completion-requests/{id}
   */
  async getCompletionRequest(requestId: number): Promise<any> {
    const response = await get<any>(`/completion-requests/${requestId}`);
    if (!response?.data) {
      throw new Error(response?.message || 'تعذر استرجاع تفاصيل طلب الاستكمال.');
    }
    return response.data;
  },

  /**
   * 8. استرجاع سجل متابعة المدرسة والخط الزمني والمذكرات
   * GET /api/v1/schools/{id}/tracking-log
   */
  async getSchoolTrackingLog(schoolId: number): Promise<SchoolTrackingLogData> {
    const response = await get<SchoolTrackingLogData>(`/schools/${schoolId}/tracking-log`);
    if (!response?.data) {
      throw new Error(response?.message || 'تعذر استرجاع سجل المتابعة للمدرسة.');
    }
    return response.data;
  },

  /**
   * 9. إضافة مذكرة إشرافية أو تقرير زيارة ميدانية لسجل المدرسة
   * POST /api/v1/schools/{id}/supervisor-notes
   */
  async addSupervisorMemo(
    schoolId: number,
    data: { memoType: string; subject: string; details: string; isVisibleToSchool: boolean }
  ): Promise<SupervisorMemo> {
    const response = await post<SupervisorMemo>(`/schools/${schoolId}/supervisor-notes`, data);
    if (!response?.data) {
      throw new Error(response?.message || 'تعذر حفظ المذكرة الإشرافية.');
    }
    return response.data;
  },

  /**
   * 10. التقارير والتحليلات المركزية ومؤشرات الجودة الوطنية
   * GET /api/v1/supervision/reports/analytics
   */
  async getCentralAnalytics(): Promise<CentralReportsData> {
    const response = await get<CentralReportsData>('/supervision/reports/analytics');
    if (!response?.data) {
      throw new Error(response?.message || 'تعذر استرجاع التحليلات المركزية.');
    }
    return response.data;
  },

  /**
   * 11. المقارنة التاريخية التراكمية لمدرسة عبر الدورات
   * GET /api/v1/schools/{id}/historical-comparison
   */
  async getHistoricalComparison(
    schoolId: number,
    baseCycle?: string,
    compareCycle?: string
  ): Promise<HistoricalComparisonData> {
    const params = new URLSearchParams();
    if (baseCycle) params.append('base_cycle', baseCycle);
    if (compareCycle) params.append('compare_cycle', compareCycle);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await get<HistoricalComparisonData>(`/schools/${schoolId}/historical-comparison${qs}`);
    if (!response?.data) {
      throw new Error(response?.message || 'تعذر استرجاع بيانات المقارنة التاريخية.');
    }
    return response.data;
  },

  /**
   * 12. طلب توليد وتصدير ملفات PDF الرسمية
   */
  async exportAnalyticsPdf(): Promise<any> {
    const response = await get<any>('/supervision/reports/analytics/pdf');
    return response?.data ?? response;
  },

  async exportTrackingLogPdf(schoolId: number): Promise<any> {
    const response = await get<any>(`/schools/${schoolId}/tracking-log/pdf`);
    return response?.data ?? response;
  },

  async exportHistoricalComparisonPdf(schoolId: number): Promise<any> {
    const response = await get<any>(`/schools/${schoolId}/historical-comparison/pdf`);
    return response?.data ?? response;
  },
};
