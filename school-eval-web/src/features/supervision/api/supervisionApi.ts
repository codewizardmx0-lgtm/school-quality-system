/**
 * supervisionApi.ts
 * طبقة الربط البرمجي الحقيقي للمشرف الوزاري مع خادم لارافيل
 * Zero Mock Data Policy (§16): لا توجد بيانات تجريبية وهمية هنا نهائياً
 * أي خطأ في الاتصال يُمرر مباشرة للمكونات لعرض رسائل الخطأ النظامية أو EmptyState
 */

import { get, post, patch, del, apiClient } from '../../../api/apiClient';
import type {
  SupervisionDashboardData,
  ActiveStandardVersion,
  CycleLaunchPayload,
  SubmissionReviewData,
  ReviewableSubmissionItem,
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
  async getDashboard(cycleId?: number): Promise<SupervisionDashboardData> {
    const url = cycleId ? `/supervision/dashboard?cycle_id=${cycleId}` : '/supervision/dashboard';
    const response = await get<SupervisionDashboardData>(url);
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
   * 2.1. استرجاع قائمة الدورات التقييمية المسجلة في النظام
   * GET /api/v1/evaluation-cycles
   */
  async getEvaluationCycles(): Promise<any[]> {
    const response = await get<any>('/evaluation-cycles');
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    if (Array.isArray((response?.data as any)?.data)) {
      return (response.data as any).data;
    }
    return [];
  },

  /**
   * 2.2. استرجاع المدارس المتاحة للتسجيل في الدورة والغير مسجلة بعد
   * GET /api/v1/evaluation-cycles/{id}/available-schools
   */
  async getAvailableSchoolsForCycle(cycleId: number): Promise<any[]> {
    const response = await get<any[]>(`/evaluation-cycles/${cycleId}/available-schools`);
    return Array.isArray(response?.data) ? response.data : [];
  },

  /**
   * 2.3. إلحاق وتسجيل مدارس إضافية بالدورة التقييمية
   * POST /api/v1/evaluation-cycles/{id}/participations
   */
  async enrollSchoolsInCycle(cycleId: number, schoolIds: number[]): Promise<any> {
    const response = await post<any>(`/evaluation-cycles/${cycleId}/participations`, {
      school_ids: schoolIds,
    });
    return response?.data ?? response;
  },

  /**
   * 2.4. استرجاع قائمة المدارس الفعّالة (مع فلترة اختيارية بحسب المحافظة)
   * GET /api/v1/schools?status=Active
   */
  async getActiveSchools(governorate?: string | null): Promise<any[]> {
    const params = new URLSearchParams();
    params.set('status', 'Active');
    if (governorate && governorate !== 'كافة المحافظات') {
      params.set('governorate', governorate);
    }
    const response = await get<any>(`/schools?${params.toString()}`);
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray((response?.data as any)?.data)) return (response.data as any).data;
    return [];
  },

  /**
   * 3. إطلاق دورة تقييمية جديدة وربطها بنطاق المدارس
   * POST /api/v1/evaluation-cycles
   */
  async launchCycle(payload: CycleLaunchPayload): Promise<any> {
    const scopeGov =
      payload.targetGovernorate && payload.targetGovernorate !== 'كافة المحافظات'
        ? payload.targetGovernorate
        : null;

    const response = await post<any>('/evaluation-cycles', {
      academic_year: payload.academicYear,
      name: payload.name,
      scope_governorate: scopeGov,
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
   * 3.1. تحديث بيانات دورة تقييمية (المشرف الوزاري المركزي العام حصرًا)
   * PATCH /api/v1/evaluation-cycles/{id}
   */
  async updateCycle(
    cycleId: number,
    payload: {
      name?: string;
      startDate?: string;
      endDate?: string;
      scopeGovernorate?: string | null;
      status?: 'Active' | 'Closed';
    }
  ): Promise<any> {
    const body: Record<string, any> = {};
    if (payload.name !== undefined) body.name = payload.name;
    if (payload.startDate !== undefined) body.start_date = payload.startDate;
    if (payload.endDate !== undefined) body.end_date = payload.endDate;
    if (payload.scopeGovernorate !== undefined) {
      body.scope_governorate =
        payload.scopeGovernorate && payload.scopeGovernorate !== 'كافة المحافظات'
          ? payload.scopeGovernorate
          : null;
    }
    if (payload.status !== undefined) body.status = payload.status;

    const response = await patch<any>(`/evaluation-cycles/${cycleId}`, body);
    if (!response?.data && response?.errors) {
      const firstError = Object.values(response.errors)[0]?.[0];
      throw new Error(firstError || response.message || 'فشل تحديث بيانات دورة التقييم.');
    }
    return response?.data ?? response;
  },

  /**
   * 3.2. إغلاق وأرشفة الدورة التقييمية النشطة
   * PATCH /api/v1/evaluation-cycles/{id} (status: 'Closed')
   */
  async closeCycle(cycleId: number): Promise<any> {
    return this.updateCycle(cycleId, { status: 'Closed' });
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
   * 4.1. قائمة المخرجات المتاحة للمراجعة الإشرافية في النطاق الجغرافي
   * GET /api/v1/evaluation-submissions/available-for-review
   */
  async getReviewableSubmissions(): Promise<ReviewableSubmissionItem[]> {
    const response = await get<ReviewableSubmissionItem[]>('/evaluation-submissions/available-for-review');
    return response?.data ?? [];
  },

  /**
   * 4.2. حفظ أو تحديث رصد نقص لمؤشر تقييم محدد في قاعدة البيانات (FR-SUP-04)
   * POST /api/v1/evaluation-submissions/{id}/deficiency-notes
   */
  async saveDeficiencyNote(
    id: number,
    payload: {
      indicatorId: number;
      deficiencyCategory?: string;
      deficiencyCategories?: string[];
      supervisorNote?: string;
      directives?: string;
    }
  ): Promise<any> {
    const cats = payload.deficiencyCategories || (payload.deficiencyCategory ? [payload.deficiencyCategory] : []);
    const response = await post<any>(`/evaluation-submissions/${id}/deficiency-notes`, {
      indicator_id: payload.indicatorId,
      deficiency_category: payload.deficiencyCategory || cats.join('، ') || 'نقص الشواهد الإلزامية المطلوبة في أداة التحقق',
      deficiency_categories: cats,
      supervisor_note: payload.supervisorNote,
      directives: payload.directives,
    });
    if (!response?.data && response?.errors) {
      const firstError = Object.values(response.errors)[0]?.[0];
      throw new Error(firstError || response.message || 'تعذر حفظ رصد النقص.');
    }
    return response?.data ?? response;
  },

  /**
   * 4.3. إلغاء رصد النقص عن مؤشر محدد
   * DELETE /api/v1/evaluation-submissions/{id}/deficiency-notes/{indicatorId}
   */
  async deleteDeficiencyNote(id: number, indicatorId: number): Promise<any> {
    const response = await del<any>(`/evaluation-submissions/${id}/deficiency-notes/${indicatorId}`);
    return response?.data ?? response;
  },

  /**
   * 5. إغلاق المراجعة الإشرافية بنجاح ونقل التقييم إلى مكتمل (BR-MIN-03)
   * POST /api/v1/evaluations/{id}/close
   */
  async closeSubmissionReview(evaluationId: number, notes?: string): Promise<{ evaluationId: number; status: string }> {
    const response = await post<{ evaluationId: number; status: string }>(
      `/evaluations/${evaluationId}/close`,
      { notes }
    );
    if (!response?.data) {
      throw new Error(response?.message || 'تعذر إغلاق المراجعة الإشرافية.');
    }
    return response.data;
  },

  /**
   * اسم رسمي معتمد مطابق لقواعد الحوكمة (BR-MIN-03)
   */
  async closeReview(evaluationId: number, notes?: string): Promise<{ evaluationId: number; status: string }> {
    return this.closeSubmissionReview(evaluationId, notes);
  },

  async closeEvaluation(evaluationId: number, notes?: string): Promise<{ evaluationId: number; status: string }> {
    return this.closeSubmissionReview(evaluationId, notes);
  },

  /**
   * اسم بديل متوافق مع المكونات السابقة (Deprecated alias complying with BR-MIN-03)
   */
  async approveSubmission(submissionId: number, notes?: string): Promise<{ submissionId: number; status: string }> {
    const result = await this.closeSubmissionReview(submissionId, notes);
    return { submissionId: result.evaluationId, status: result.status };
  },

  /**
   * تمديد مهلة طلب الاستكمال وتوثيق المبرر (FR-SUP-11)
   * PATCH /api/v1/completion-requests/{id}/deadline
   */
  async extendCompletionDeadline(requestId: number, newDeadline: string, reason?: string): Promise<any> {
    const response = await patch<any>(
      `/completion-requests/${requestId}/deadline`,
      { new_deadline: newDeadline, reason }
    );
    if (!response?.data) {
      throw new Error(response?.message || 'تعذر تمديد مهلة طلب الاستكمال.');
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

  /**
   * 13. تصدير بطاقة تقويم المدرسة الرسمية (PDF) بطلب مصادق عبر Token
   */
  async exportEvaluationPdf(evaluationId: number, schoolName?: string): Promise<void> {
    const response = await apiClient.get(`/evaluations/${evaluationId}/export-pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([response as unknown as BlobPart], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanSchoolName = schoolName ? schoolName.replace(/\s+/g, '_') : `مدرسة_${evaluationId}`;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `تقرير_تقويم_${cleanSchoolName}_${dateStr}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * 14. تصدير سجل التقويم والخطط الشامل (Excel) بطلب مصادق عبر Token
   */
  async exportEvaluationExcel(evaluationId: number, schoolName?: string): Promise<void> {
    const response = await apiClient.get(`/evaluations/${evaluationId}/export-excel`, {
      responseType: 'blob',
    });
    const blob = new Blob([response as unknown as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanSchoolName = schoolName ? schoolName.replace(/\s+/g, '_') : `مدرسة_${evaluationId}`;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `سجل_تقويم_${cleanSchoolName}_${dateStr}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * 15. تحميل ملف نسخة المستند أو الشاهد عبر Token مصادق
   */
  async downloadDocumentVersion(versionIdOrUrl: number | string, fileName?: string): Promise<void> {
    let endpoint = typeof versionIdOrUrl === 'number'
      ? `/document-versions/${versionIdOrUrl}/download`
      : versionIdOrUrl;
    if (typeof versionIdOrUrl === 'string' && versionIdOrUrl.includes('/document-versions/')) {
      const match = versionIdOrUrl.match(/\/document-versions\/(\d+)\/download/);
      if (match) {
        endpoint = `/document-versions/${match[1]}/download`;
      }
    }
    const response: any = await apiClient.get(endpoint, {
      responseType: 'blob',
    });
    const rawData = response?.data instanceof Blob ? response.data : response;
    const blob = rawData instanceof Blob ? rawData : new Blob([rawData]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'شاهد_توثيقي.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * 16. معاينة ملف نسخة المستند أو الشاهد في نافذة متصفح جديدة عبر Token مصادق
   */
  async previewDocumentVersion(versionIdOrUrl: number | string): Promise<void> {
    let endpoint = typeof versionIdOrUrl === 'number'
      ? `/document-versions/${versionIdOrUrl}/download`
      : versionIdOrUrl;
    if (typeof versionIdOrUrl === 'string' && versionIdOrUrl.includes('/document-versions/')) {
      const match = versionIdOrUrl.match(/\/document-versions\/(\d+)\/download/);
      if (match) {
        endpoint = `/document-versions/${match[1]}/download`;
      }
    }
    const response: any = await apiClient.get(endpoint, {
      responseType: 'blob',
    });
    const rawData = response?.data instanceof Blob ? response.data : response;
    const blob = rawData instanceof Blob
      ? new Blob([rawData], { type: rawData.type || 'application/pdf' })
      : new Blob([rawData], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  },
};
