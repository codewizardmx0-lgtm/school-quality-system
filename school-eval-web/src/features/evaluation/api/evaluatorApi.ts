/**
 * evaluatorApi.ts
 * API Integration Layer for the School Evaluator Suite (ERTEQA Platform)
 * Direct connection to Laravel backend endpoints with Zero Mock Fallbacks (UI_STANDARDS §16)
 */

import { get, post, put, patch, del, apiClient } from '../../../api/apiClient';
import type {
  EvaluatorDashboardData,
  StandardsTreeData,
  EvaluationResultData,
  SaveEvaluationResultPayload,
  EvidencesRepositoryResponse,
  UploadEvidencePayload,
  AiAnalysisData,
  AiRecommendationsResponse,
  AiRecommendationStatus,
  ImprovementPlanData,
  ImprovementPlanAction,
  PlanType,
  EvaluationCycleArchiveItem,
  CreateImprovementActionPayload,
  UpdateImprovementActionPayload,
  PreflightCheckData,
  FinalSubmissionResponse,
  CompletionRequestData,
  EvidenceInventoryData,
  ActionCatalogItem,
  ImprovementSuggestion,
  PriorityLevel,
  EvaluatorNotificationItem,
  IndicatorsContextResponse,
  ActionRecommendationsResponse,
} from './evaluationTypes';

export const evaluatorApi = {
  /**
   * 1. GET /api/v1/evaluator/dashboard-stats
   * Fetch aggregated KPIs and progress tracker
   */
  async getDashboardStats(): Promise<EvaluatorDashboardData> {
    const response = await get<EvaluatorDashboardData>('/evaluator/dashboard-stats');
    return response.data!;
  },

  /**
   * 2. GET /api/v1/standard-versions/active/tree
   * Load active standards tree with sub-standards and indicators
   */
  async getActiveStandardsTree(): Promise<StandardsTreeData> {
    const response = await get<StandardsTreeData>('/standard-versions/active/tree');
    return response.data!;
  },

  /**
   * 3. GET /api/v1/evaluation-results/{indicatorId}
   * Retrieve current score, notes, and evidences for a specific indicator
   */
  async getEvaluationResult(indicatorId: number): Promise<EvaluationResultData> {
    const response = await get<EvaluationResultData>(`/evaluation-results/${indicatorId}`);
    return response.data!;
  },

  /**
   * 4. POST /api/v1/evaluation-results
   * Persist rubric assessment and justifications
   */
  async saveEvaluationResult(payload: SaveEvaluationResultPayload): Promise<EvaluationResultData> {
    const response = await post<EvaluationResultData>('/evaluation-results', payload);
    return response.data!;
  },

  /**
   * 5. POST /api/v1/evidences/upload
   * Upload evidence file with optional indicator or action linking
   */
  async uploadEvidence(
    payload: UploadEvidencePayload,
    onProgress?: (percent: number) => void
  ): Promise<{
    documentId: number;
    versionId: number;
    versionNumber: number;
    fileName: string;
    title: string;
    linkId?: number;
  }> {
    const formData = new FormData();
    formData.append('file', payload.file);

    if (payload.indicatorId) {
      formData.append('indicatorId', String(payload.indicatorId));
    }
    if (payload.actionId) {
      formData.append('actionId', String(payload.actionId));
    }
    if (payload.title) {
      formData.append('title', payload.title);
    }
    if (payload.documentId) {
      formData.append('documentId', String(payload.documentId));
    }
    if (payload.notes) {
      formData.append('notes', payload.notes);
    }
    if (payload.coveredRequirements && payload.coveredRequirements.length > 0) {
      formData.append('coveredRequirements', JSON.stringify(payload.coveredRequirements));
    }

    const response = await post<{
      documentId: number;
      versionId: number;
      versionNumber: number;
      fileName: string;
      title: string;
      linkId?: number;
      coveredRequirements?: number[];
    }>('/evidences/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    return response.data!;
  },

  /**
   * 6. GET /api/v1/evidences
   * Fetch school evidences vault with filters
   */
  async getEvidences(standardId?: number, format?: string): Promise<EvidencesRepositoryResponse> {
    const params: Record<string, string | number> = {};
    if (standardId) params.standardId = standardId;
    if (format) params.format = format;

    const response = await get<EvidencesRepositoryResponse>('/evidences', { params });
    return response.data!;
  },

  /**
   * 6b. PATCH /api/v1/evidences/documents/{documentId}
   * Update evidence document metadata and justification
   */
  async updateDocumentMetadata(
    documentId: number,
    payload: { title?: string; documentType?: string; description?: string; justification?: string; linkId?: number }
  ): Promise<{ documentId: number; title: string; documentType?: string; description?: string }> {
    const response = await patch<{ documentId: number; title: string; documentType?: string; description?: string }>(
      `/evidences/documents/${documentId}`,
      payload
    );
    return response.data!;
  },

  /**
   * 7. POST /api/v1/ai/analyses
   * Trigger automated gap analysis on scores
   */
  async triggerAiAnalysis(evaluationId?: number): Promise<AiAnalysisData> {
    const response = await post<AiAnalysisData>('/ai/analyses', {
      evaluation_id: evaluationId,
    });
    return response.data!;
  },

  /**
   * 8. GET /api/v1/ai/analyses/{id}/recommendations
   * Retrieve identified strengths, gaps, and initiatives
   */
  async getAiRecommendations(analysisId: number): Promise<AiRecommendationsResponse> {
    const response = await get<AiRecommendationsResponse>(`/ai/analyses/${analysisId}/recommendations`);
    return response.data!;
  },

  /**
   * 9. PATCH /api/v1/ai/recommendations/{id}
   * Update recommendation status (Accepted, Modified, Ignored)
   */
  async updateAiRecommendationStatus(
    recommendationId: number,
    status: AiRecommendationStatus,
    humanModifications?: string
  ): Promise<void> {
    await patch(`/ai/recommendations/${recommendationId}`, {
      status,
      human_modifications: humanModifications,
    });
  },

  /**
   * 10. GET /api/v1/improvement-plans/current
   * Fetch active improvement plan with summary and actions (supports plan_type tabs)
   */
  async getCurrentImprovementPlan(planType?: PlanType): Promise<ImprovementPlanData> {
    const params: Record<string, string> = {};
    if (planType) params.plan_type = planType;
    const response = await get<ImprovementPlanData>('/improvement-plans/current', { params });
    return response.data!;
  },

  /**
   * 11. POST /api/v1/improvement-actions
   * Add a new action to current improvement plan (supports composite key areaId)
   */
  async createImprovementAction(payload: CreateImprovementActionPayload): Promise<ImprovementPlanAction> {
    const response = await post<ImprovementPlanAction>('/improvement-actions', payload);
    return response.data!;
  },

  /**
   * 11.b POST /api/v1/evaluator/improvement-plans
   * Create a new improvement plan scoped to school's active evaluation
   */
  async createImprovementPlan(payload: {
    title: string;
    planType?: PlanType;
    startDate?: string;
    endDate?: string;
    areaIds?: number[];
  }): Promise<ImprovementPlanData> {
    const response = await post<ImprovementPlanData>('/evaluator/improvement-plans', payload);
    return response.data!;
  },

  /**
   * 11.c POST /api/v1/evaluator/improvement-plans/{id}/review-notes
   * Add an internal review note to the plan
   */
  async createPlanReviewNote(planId: number, text: string): Promise<any> {
    const response = await post<any>(`/evaluator/improvement-plans/${planId}/review-notes`, { text });
    return response.data!;
  },

  /**
   * 12. PUT /api/v1/improvement-actions/{id}
   * Update progress, leader, or status of an action
   */
  async updateImprovementAction(actionId: number, payload: UpdateImprovementActionPayload): Promise<void> {
    await put(`/improvement-actions/${actionId}`, payload);
  },

  /**
   * 13. GET /api/v1/evaluations/current/preflight-check
   * Run pre-flight checklist validation before final lock
   */
  async getPreflightCheck(): Promise<PreflightCheckData> {
    const response = await get<PreflightCheckData>('/evaluations/current/preflight-check');
    return response.data!;
  },

  /**
   * 14. POST /api/v1/evaluation-submissions/submit
   * Confirm digital seal lock and submit evaluation
   */
  async submitFinalEvaluation(password: string, notes?: string): Promise<FinalSubmissionResponse> {
    const response = await post<FinalSubmissionResponse>('/evaluation-submissions/submit', {
      password,
      notes,
    });
    return response.data!;
  },

  /**
   * 15. GET /api/v1/completion-requests/current
   * Fetch supervisor feedback on flagged items
   */
  async getCurrentCompletionRequest(): Promise<CompletionRequestData | null> {
    const response = await get<CompletionRequestData | null>('/completion-requests/current');
    return response.data!;
  },

  /**
   * 16. POST /api/v1/completion-request-items/{id}/resolve
   * Mark a single completion item as resolved
   */
  async resolveCompletionItem(
    itemId: number,
    resolutionNotes: string,
    evidenceVersionId?: number
  ): Promise<void> {
    await post(`/completion-request-items/${itemId}/resolve`, {
      resolution_notes: resolutionNotes,
      evidence_version_id: evidenceVersionId,
    });
  },

  /**
   * 17. POST /api/v1/completion-requests/{id}/resubmit
   * Resubmit completed items back to ministry supervisor
   */
  async resubmitCompletionRequest(requestId: number, schoolNotes?: string): Promise<void> {
    await post(`/completion-requests/${requestId}/resubmit`, {
      school_notes: schoolNotes,
    });
  },

  /**
   * 18. Export Official Report PDF via dedicated evaluator route
   */
  async exportReportPdf(): Promise<void> {
    const response = await apiClient.get('/evaluator/export-report-pdf', {
      responseType: 'blob',
    });

    const blob = new Blob([response as unknown as BlobPart], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    link.download = `تقرير_التقييم_الذاتي_المعتمد_${dateStr}_${timeStr}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * 18.b Export Detailed Dossier Report PDF (Batch 5 - FE-GAP-08 / BE-GAP-07 / U-44)
   */
  async exportDetailedReportPdf(): Promise<void> {
    const response = await apiClient.get('/evaluator/export-detailed-pdf', {
      responseType: 'blob',
    });

    const blob = new Blob([response as unknown as BlobPart], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    link.download = `استمارة_التقرير_المفصلة_للتقييم_${dateStr}_${timeStr}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * 18.c Export Detailed Matrix Excel Workbook (Batch 5 - FE-GAP-08 / BE-GAP-07 / U-44)
   */
  async exportDetailedReportExcel(): Promise<void> {
    const response = await apiClient.get('/evaluator/export-detailed-excel', {
      responseType: 'blob',
    });

    const blob = new Blob([response as unknown as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    link.download = `مصفوفة_التقييم_الشاملة_${dateStr}_${timeStr}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * 19. GET /api/v1/evaluator/evidence-inventory
   * Fetch 109 indicators evidence inventory and sufficiency stats
   */
  async getEvidenceInventory(): Promise<EvidenceInventoryData> {
    const response = await get<EvidenceInventoryData>('/evaluator/evidence-inventory');
    return response.data!;
  },

  /**
   * 20. POST /api/v1/evaluator/evidence-links/multi
   * Multi-link a document version to multiple indicators
   */
  async multiLinkEvidence(payload: {
    documentId: number;
    versionId?: number;
    indicatorIds: number[];
    justification?: string;
  }): Promise<void> {
    await post('/evaluator/evidence-links/multi', {
      documentId: payload.documentId,
      versionId: payload.versionId,
      indicatorIds: payload.indicatorIds,
      justification: payload.justification,
    });
  },

  /**
   * 21. DELETE /api/v1/evidence-links/{linkId}
   * Unlink an evidence link safely without deleting the underlying file
   */
  async unlinkEvidence(linkId: number): Promise<void> {
    await del(`/evidence-links/${linkId}`);
  },

  /**
   * 21.a2 PATCH /api/v1/evidence-links/{id}/covered-requirements
   * Update covered mandatory requirements for an existing evidence link
   */
  async updateLinkCoveredRequirements(
    linkId: number,
    coveredRequirements: number[]
  ): Promise<{ linkId: number; coveredRequirements: number[] }> {
    const response = await patch<{ linkId: number; coveredRequirements: number[] }>(
      `/evidence-links/${linkId}/covered-requirements`,
      { coveredRequirements }
    );
    return response.data!;
  },

  /**
   * 21.b POST /api/v1/evaluator/indicators/{indicatorId}/reset
   * Safely reset a single indicator score/evaluation result (and optionally unlink evidences)
   */
  async resetIndicator(
    indicatorId: number,
    unlinkEvidences: boolean = false
  ): Promise<{ indicatorId: number; resetResultsCount: number; unlinkedEvidencesCount: number }> {
    const response = await post<{ indicatorId: number; resetResultsCount: number; unlinkedEvidencesCount: number }>(
      `/evaluator/indicators/${indicatorId}/reset`,
      { unlinkEvidences }
    );
    return response.data!;
  },

  /**
   * 21.c POST /api/v1/evaluator/standards/{standardId}/reset
   * Safely reset all indicators in a standard (and optionally unlink evidences)
   */
  async resetStandard(
    standardId: number,
    unlinkEvidences: boolean = false
  ): Promise<{ standardId: number; affectedIndicatorsCount: number; resetResultsCount: number; unlinkedEvidencesCount: number }> {
    const response = await post<{
      standardId: number;
      affectedIndicatorsCount: number;
      resetResultsCount: number;
      unlinkedEvidencesCount: number;
    }>(`/evaluator/standards/${standardId}/reset`, { unlinkEvidences });
    return response.data!;
  },

  /**
   * 22. GET /api/v1/improvement-plans/action-catalog
   * Retrieve standard action templates for improvement plans
   */
  async getActionCatalog(standardCode?: string, planType?: string): Promise<ActionCatalogItem[]> {
    const params: Record<string, string> = {};
    if (standardCode) params.sub_standard_code = standardCode;
    if (planType) params.plan_type = planType;

    const response = await get<any>('/improvement-plans/action-catalog', { params });
    const raw = response.data;
    const items = Array.isArray(raw) ? raw : (raw?.data || []);

    return items.map((item: any) => ({
      catalog_id: item.catalog_id || item.catalogId || item.id,
      sub_standard_code: item.sub_standard_code || item.standardCode || '',
      plan_type: item.plan_type || item.planType || 'QualityImprovement',
      title: item.title || item.action_title || '',
      description: item.description || item.suggested_responsible_description || '',
      target_score: item.target_score || item.defaultTarget || 3,
      timeframe: item.suggested_duration_days ? `${item.suggested_duration_days} يوم` : (item.timeframe || item.defaultTimeframe || 'فصل دراسي'),
      responsible_role: item.suggested_responsible_description || item.responsible_role || 'فريق التحسين المدرسي',
    }));
  },

  /**
   * 23. GET /api/v1/evaluator/improvement-suggestions
   * Formula-based auto suggestions (FR-SCH-16)
   */
  async getImprovementSuggestions(targetScore?: number): Promise<ImprovementSuggestion[]> {
    const params: Record<string, number> = {};
    if (targetScore) params.target_score = targetScore;

    const res = await get<any>('/evaluator/improvement-suggestions', { params });
    const raw = res?.data;
    const suggestions = Array.isArray(raw) ? raw : (raw?.suggestions || []);

    return suggestions.map((s: any) => {
      const score = s.currentScore !== undefined ? s.currentScore : (s.score ?? 1);
      const target = s.targetScore ?? raw?.targetScore ?? 3;
      const gap = s.gap ?? (target - score);
      const priority = (s.priority || s.suggestedPriority || (score <= 1 ? 'High' : 'Medium')) as PriorityLevel;

      return {
        resultId: s.resultId || s.result_id || s.indicatorId,
        indicatorId: s.indicatorId || s.indicator_id || s.resultId,
        indicatorCode: s.indicatorCode || s.indicator_code || 'IND-GAP',
        indicatorName: s.indicatorName || s.indicator_name || s.indicatorTitle || `مؤشر فجوة #${s.indicatorId || s.resultId}`,
        score,
        targetScore: target,
        gap,
        suggestedPriority: priority,
        priorityLabel: priority === 'High' ? 'أولوية قصوى (فجوة حرجة)' : 'أولوية متوسطة',
        suggestedName: s.suggestedName || s.name || `تحسين أداء: ${s.indicatorName || s.indicatorTitle || 'المؤشر'}`,
        isAdopted: Boolean(s.isAdopted || s.isAlreadyAdopted),
        adoptedAreaId: s.adoptedAreaId || s.area_id || null,
      };
    });
  },

  /**
   * 24. POST /api/v1/improvement-areas
   * Adopt a suggestion and create an approved improvement area
   */
  async adoptSuggestion(payload: {
    resultId: number;
    name?: string;
    description?: string;
    priority?: PriorityLevel;
    targetScore?: number;
  }): Promise<void> {
    await post('/improvement-areas', {
      resultId: payload.resultId,
      name: payload.name || 'مجال تحسين معتمد لمؤشر الفجوة',
      description: payload.description,
      priority: payload.priority || 'High',
      targetScore: payload.targetScore,
    });
  },

  /**
   * 25. POST /api/v1/improvement-actions/{id}/evidences
   * Attach an evidence to a plan action
   */
  async attachActionEvidence(actionId: number, payload: number | {
    evidenceId?: number;
    file?: File;
    title?: string;
  }): Promise<void> {
    if (typeof payload === 'number') {
      await post(`/improvement-actions/${actionId}/evidences`, {
        evidenceId: payload,
      });
      return;
    }
    if (payload.file) {
      const formData = new FormData();
      formData.append('file', payload.file);
      if (payload.title) formData.append('title', payload.title);
      formData.append('actionId', String(actionId));
      await post(`/improvement-actions/${actionId}/evidences`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } else {
      await post(`/improvement-actions/${actionId}/evidences`, {
        evidenceId: payload.evidenceId,
      });
    }
  },

  /**
   * 26. GET /api/v1/notifications
   * Fetch authenticated user notifications
   */
  async getNotifications(isRead?: boolean): Promise<EvaluatorNotificationItem[]> {
    const params: Record<string, boolean> = {};
    if (isRead !== undefined) params.is_read = isRead;
    const response = await get<EvaluatorNotificationItem[]>('/notifications', { params });
    const raw = response.data;
    return Array.isArray(raw) ? raw : (raw as any)?.data || [];
  },

  /**
   * 27. GET /api/v1/notifications/unread-count
   * Fetch count of unread notifications
   */
  async getUnreadNotificationsCount(): Promise<number> {
    const response = await get<{ unreadCount: number }>('/notifications/unread-count');
    return response.data?.unreadCount ?? 0;
  },

  /**
   * 28. PATCH /api/v1/notifications/{id}/read
   * Mark a single notification as read
   */
  async markNotificationAsRead(id: number): Promise<void> {
    await patch(`/notifications/${id}/read`);
  },

  /**
   * 29. POST /api/v1/notifications/mark-all-read
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<void> {
    await post('/notifications/mark-all-read');
  },

  /**
   * 30. Download evidence physical file via backend storage stream
   */
  async downloadEvidence(versionId: number, fileName: string): Promise<void> {
    const response = await apiClient.get(`/document-versions/${versionId}/download`, {
      responseType: 'blob',
    });

    const blob = new Blob([response as unknown as BlobPart]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * 31. GET /api/v1/evaluations
   * List all evaluation cycles/dossiers of the school for archive viewing (IMP-06)
   */
  async getSchoolEvaluations(): Promise<EvaluationCycleArchiveItem[]> {
    const response = await get<any>('/evaluations');
    const items = Array.isArray(response.data) ? response.data : [];
    return items.map((ev: any) => {
      const cycleStatus = ev.cycle?.status || 'Active';
      const evaluationStatus = ev.status || 'InProgress';
      const isLocked =
        ['Submitted', 'UnderReview', 'Completed'].includes(evaluationStatus) ||
        cycleStatus === 'Closed';
      return {
        evaluationId: ev.evaluationId || ev.evaluation_id,
        cycleId: ev.cycleId || ev.cycle_id || ev.cycle?.cycleId || ev.cycle?.cycle_id || 1,
        academicYear: ev.cycle?.academicYear || ev.cycle?.academic_year || ev.academicYear || '2026/2027',
        cycleStatus,
        evaluationStatus,
        isLocked,
        createdAt: ev.createdAt || ev.created_at,
      };
    });
  },

  /**
   * 32. GET /api/v1/evaluations/{id}/indicators-context
   * Fetch school quantitative metrics context for indicators (IMP-07 / GAP-EV-08)
   */
  async getIndicatorsContext(evaluationId: number): Promise<IndicatorsContextResponse> {
    const response = await get<any>(`/evaluations/${evaluationId}/indicators-context`);
    const raw = response.data || {};
    return {
      evaluationId,
      is_snapshot: Boolean(raw.is_snapshot),
      is_legacy_completed_without_snapshot: Boolean(raw.is_legacy_completed_without_snapshot),
      notice: raw.notice || '',
      indicators: raw.indicators || {},
    };
  },

  /**
   * 33. GET /api/v1/evaluations/{id}/action-recommendations
   * Fetch action catalog recommendations for weak indicators 0/1 (IMP-08 / GAP-EV-09)
   */
  async getActionRecommendations(evaluationId: number, indicatorCode: string): Promise<ActionRecommendationsResponse> {
    const response = await get<any>(`/evaluations/${evaluationId}/action-recommendations`, {
      params: { indicator_code: indicatorCode },
    });
    const raw = response.data || {};
    return {
      is_weak: Boolean(raw.is_weak),
      indicator_code: raw.indicator_code || indicatorCode,
      indicator_name: raw.indicator_name || null,
      sub_standard_code: raw.sub_standard_code || null,
      score: raw.score ?? null,
      recommendations_count: raw.recommendations_count ?? (raw.recommendations?.length || 0),
      message: raw.message || '',
      recommendations: Array.isArray(raw.recommendations) ? raw.recommendations : [],
    };
  },
};
