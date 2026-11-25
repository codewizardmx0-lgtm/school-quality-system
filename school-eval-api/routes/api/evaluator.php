<?php

use App\Http\Controllers\Api\V1\EvaluatorApiController;
use App\Http\Controllers\Api\V1\EvaluatorEvidenceController;
use App\Http\Controllers\Api\V1\EvaluatorImprovementController;
use App\Http\Controllers\Api\V1\EvaluatorSubmissionController;
use Illuminate\Support\Facades\Route;

// --------------------------------------------------------------------------
// بوابة مستخدم التقييم بالمدرسة (School Evaluator Suite - ERTEQA)
// --------------------------------------------------------------------------
Route::prefix('evaluator')->group(function () {
    Route::get('/dashboard-stats', [EvaluatorApiController::class, 'dashboardStats'])->name('api.v1.evaluator.dashboard-stats');
    Route::get('/export-report-pdf', [EvaluatorSubmissionController::class, 'exportReportPdf'])->name('api.v1.evaluator.export-report-pdf');
    Route::get('/export-detailed-pdf', [EvaluatorSubmissionController::class, 'exportDetailedReportPdf'])->name('api.v1.evaluator.export-detailed-pdf');
    Route::get('/export-detailed-excel', [EvaluatorSubmissionController::class, 'exportDetailedReportExcel'])->name('api.v1.evaluator.export-detailed-excel');
    Route::get('/export-improvement-workbook', [EvaluatorSubmissionController::class, 'exportImprovementWorkbook'])->name('api.v1.evaluator.export-improvement-workbook');
    Route::get('/export-seal-certificate-pdf', [EvaluatorSubmissionController::class, 'exportSealCertificatePdf'])->name('api.v1.evaluator.export-seal-certificate-pdf');
    Route::get('/export-evidences-zip', [EvaluatorSubmissionController::class, 'exportEvidenceZip'])->name('api.v1.evaluator.export-evidences-zip');
    Route::get('/export-evidence-inventory-excel', [EvaluatorSubmissionController::class, 'exportEvidenceInventoryExcel'])->name('api.v1.evaluator.export-evidence-inventory-excel');
    Route::get('/trend', [EvaluatorSubmissionController::class, 'getHistoricalTrend'])->name('api.v1.evaluator.trend');
    Route::get('/internal-review-note', [EvaluatorSubmissionController::class, 'getInternalReviewNote'])->name('api.v1.evaluator.internal-review-note.show');
    Route::post('/internal-review-note', [EvaluatorSubmissionController::class, 'saveInternalReviewNote'])->name('api.v1.evaluator.internal-review-note.store');
    Route::get('/evidence-inventory', [EvaluatorEvidenceController::class, 'getEvidenceInventory'])->name('api.v1.evaluator.evidence-inventory');
    Route::get('/improvement-suggestions', [EvaluatorImprovementController::class, 'getImprovementSuggestions'])->name('api.v1.evaluator.improvement-suggestions');
    Route::post('/evidence-links/multi', [EvaluatorEvidenceController::class, 'multiLinkEvidence'])->name('api.v1.evaluator.evidence-links.multi');
    Route::post('/indicators/{indicatorId}/reset', [EvaluatorApiController::class, 'resetIndicator'])->name('api.v1.evaluator.indicators.reset');
    Route::post('/standards/{standardId}/reset', [EvaluatorApiController::class, 'resetStandard'])->name('api.v1.evaluator.standards.reset');
    Route::get('/discrepancies/audit', [EvaluatorApiController::class, 'auditDiscrepancies'])->name('api.v1.evaluator.discrepancies.audit');
    Route::get('/audit-hub', [EvaluatorApiController::class, 'getAuditHub'])->name('api.v1.evaluator.audit-hub');
    Route::post('/audit-hub/indicators/{indicatorId}/review-note', [EvaluatorApiController::class, 'storeIndicatorReviewNote'])->name('api.v1.evaluator.audit-hub.indicator-review-note');
});

Route::get('/standard-versions/active/tree', [EvaluatorApiController::class, 'activeStandardsTree'])->name('api.v1.standard-versions.active.tree');
Route::get('/evaluation-results/{indicatorId}', [EvaluatorApiController::class, 'getEvaluationResult'])->name('api.v1.evaluation-results.indicator.show');
Route::post('/evaluation-results', [EvaluatorApiController::class, 'saveEvaluationResult'])->name('api.v1.evaluation-results.store');

Route::post('/evidences/upload', [EvaluatorEvidenceController::class, 'uploadEvidence'])->name('api.v1.evidences.upload');
Route::get('/evidences', [EvaluatorEvidenceController::class, 'getEvidences'])->name('api.v1.evidences.index');
Route::get('/evidences/versions-archive', [EvaluatorEvidenceController::class, 'getVersionsArchive'])->name('api.v1.evidences.versions.archive');
Route::delete('/evidences/versions/{versionId}/file', [EvaluatorEvidenceController::class, 'pruneVersionPhysicalFile'])->name('api.v1.evidences.versions.prune-file');
Route::get('/evidences/documents/{documentId}/versions', [EvaluatorEvidenceController::class, 'getDocumentVersions'])->name('api.v1.evidences.documents.versions');
Route::patch('/evidences/documents/{documentId}', [EvaluatorEvidenceController::class, 'updateDocumentMetadata'])->name('api.v1.evidences.documents.update');
Route::delete('/evidences/documents/{documentId}', [EvaluatorEvidenceController::class, 'deleteUnlinkedDocument'])->name('api.v1.evidences.documents.delete');
Route::patch('/evidence-links/{id}/covered-requirements', [EvaluatorEvidenceController::class, 'updateLinkCoveredRequirements'])->name('api.v1.evidence-links.covered-requirements');

Route::prefix('ai')->group(function () {
    Route::post('/analyses', [EvaluatorImprovementController::class, 'triggerAiAnalysis'])->name('api.v1.ai.analyses.store');
    Route::get('/analyses/{id}/recommendations', [EvaluatorImprovementController::class, 'getAiRecommendations'])->name('api.v1.ai.analyses.recommendations');
    Route::patch('/recommendations/{id}', [EvaluatorImprovementController::class, 'updateAiRecommendation'])->name('api.v1.ai.recommendations.update');
});

Route::get('/improvement-plans/current', [EvaluatorImprovementController::class, 'getCurrentImprovementPlan'])->name('api.v1.improvement-plans.current');
Route::get('/evaluator/improvement-plans', [EvaluatorImprovementController::class, 'getSchoolImprovementPlans'])->name('api.v1.evaluator.improvement-plans.index');
Route::post('/evaluator/improvement-plans/{id}/clone-version', [EvaluatorImprovementController::class, 'clonePlanVersion'])->name('api.v1.evaluator.improvement-plans.clone-version');
Route::post('/evaluator/suggestions/{resultId}/exclude', [EvaluatorImprovementController::class, 'excludeSuggestion'])->name('api.v1.evaluator.suggestions.exclude');
Route::post('/evaluator/suggestions/{resultId}/restore', [EvaluatorImprovementController::class, 'restoreSuggestion'])->name('api.v1.evaluator.suggestions.restore');
Route::post('/evaluator/improvement-plans', [EvaluatorImprovementController::class, 'createImprovementPlan'])->name('api.v1.evaluator.improvement-plans.store');
Route::post('/evaluator/improvement-plans/{id}/review-notes', [EvaluatorImprovementController::class, 'storePlanReviewNote'])->name('api.v1.evaluator.improvement-plans.review-notes.store');
Route::post('/improvement-actions', [EvaluatorImprovementController::class, 'createImprovementAction'])->name('api.v1.improvement-actions.store');
Route::put('/improvement-actions/{id}', [EvaluatorImprovementController::class, 'updateImprovementAction'])->name('api.v1.improvement-actions.update');
Route::post('/improvement-actions/{id}/evidences', [EvaluatorImprovementController::class, 'attachActionEvidence'])->name('api.v1.improvement-actions.evidences.store');

Route::get('/evaluations/current/preflight-check', [EvaluatorSubmissionController::class, 'preflightCheck'])->name('api.v1.evaluations.current.preflight-check');
Route::post('/evaluation-submissions/submit', [EvaluatorSubmissionController::class, 'submitEvaluation'])->name('api.v1.evaluation-submissions.submit');

Route::get('/completion-requests/current', [EvaluatorSubmissionController::class, 'getCurrentCompletionRequest'])->name('api.v1.completion-requests.current');
Route::post('/completion-request-items/{id}/resolve', [EvaluatorSubmissionController::class, 'resolveCompletionRequestItem'])->name('api.v1.completion-request-items.resolve');
Route::post('/completion-requests/{id}/resubmit', [EvaluatorSubmissionController::class, 'resubmitCompletionRequest'])->name('api.v1.completion-requests.resubmit.evaluator');
