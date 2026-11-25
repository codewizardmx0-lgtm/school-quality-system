<?php

use App\Http\Controllers\Api\V1\CompletionRequestController;
use App\Http\Controllers\Api\V1\EvaluationController;
use App\Http\Controllers\Api\V1\EvaluationCycleController;
use App\Http\Controllers\Api\V1\EvidenceController;
use App\Http\Controllers\Api\V1\ImprovementAreaController;
use App\Http\Controllers\Api\V1\ImprovementPlanController;
use App\Http\Controllers\Api\V1\ImprovementSuggestionController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\ReportsAnalyticsController;
use App\Http\Controllers\Api\V1\SupervisionReviewController;
use Illuminate\Support\Facades\Route;

// إدارة دورات التقييم المركزية وتسجيل مشاركة المدارس (Evaluation Cycles - الشريحة 10)
Route::prefix('evaluation-cycles')->group(function () {
    Route::get('/', [EvaluationCycleController::class, 'index'])->name('api.v1.evaluation-cycles.index');
    Route::post('/', [EvaluationCycleController::class, 'store'])->name('api.v1.evaluation-cycles.store');
    Route::get('/{id}', [EvaluationCycleController::class, 'show'])->name('api.v1.evaluation-cycles.show');
    Route::patch('/{id}', [EvaluationCycleController::class, 'update'])->name('api.v1.evaluation-cycles.update');
    Route::delete('/{id}', [EvaluationCycleController::class, 'destroy'])->name('api.v1.evaluation-cycles.destroy');
    Route::post('/{id}/participations', [EvaluationCycleController::class, 'enrollSchools'])->name('api.v1.evaluation-cycles.participations.store');
    Route::get('/{id}/available-schools', [EvaluationCycleController::class, 'availableSchools'])->name('api.v1.evaluation-cycles.available-schools');
});

// عمليات التقييم المدرسي مع العزل المؤسسي ورصد الدرجات (Evaluations)
Route::prefix('evaluations')->group(function () {
    Route::get('/', [EvaluationController::class, 'index'])->name('api.v1.evaluations.index');
    Route::post('/', [EvaluationController::class, 'store'])->name('api.v1.evaluations.store');
    Route::get('/{id}', [EvaluationController::class, 'show'])->name('api.v1.evaluations.show');
    Route::get('/{id}/standards-tree', [EvaluationController::class, 'standardsTree'])->name('api.v1.evaluations.standards-tree');
    Route::get('/{id}/improvement-suggestions', [ImprovementSuggestionController::class, 'index'])->name('api.v1.evaluations.improvement-suggestions');
    Route::put('/{evaluationId}/indicators/{indicatorId}/score', [EvaluationController::class, 'scoreIndicator'])->name('api.v1.evaluations.indicators.score');
    Route::post('/{id}/submit', [EvaluationController::class, 'submit'])->name('api.v1.evaluations.submit');
    Route::post('/{id}/close', [EvaluationController::class, 'directClose'])->name('api.v1.evaluations.close');
    Route::get('/{id}/completion-requests', [CompletionRequestController::class, 'index'])->name('api.v1.evaluations.completion-requests.index');
    Route::post('/{id}/completion-requests', [CompletionRequestController::class, 'store'])->name('api.v1.evaluations.completion-requests.store');
    Route::post('/{id}/dev-reset', [EvaluationController::class, 'devReset'])->name('api.v1.evaluations.dev-reset');
    Route::get('/{id}/indicators-context', [EvaluationController::class, 'indicatorsContext'])->name('api.v1.evaluations.indicators-context');
    Route::get('/{id}/evidence-inventory', [EvidenceController::class, 'inventory'])->name('api.v1.evaluations.evidence-inventory');
    Route::get('/{id}/export-pdf', [EvaluationController::class, 'exportPdf'])->name('api.v1.evaluations.export-pdf');
    Route::get('/{id}/export-excel', [EvaluationController::class, 'exportExcel'])->name('api.v1.evaluations.export-excel');
    Route::get('/{id}/trend', [EvaluationController::class, 'trend'])->name('api.v1.evaluations.trend');
    Route::get('/{id}/action-recommendations', [EvaluationController::class, 'actionRecommendations'])->name('api.v1.evaluations.action-recommendations');
    Route::post('/{id}/deficiency-notes', [SupervisionReviewController::class, 'saveDeficiencyNote'])->name('api.v1.evaluations.deficiency-notes.store');
    Route::delete('/{id}/deficiency-notes/{indicatorId}', [SupervisionReviewController::class, 'deleteDeficiencyNote'])->name('api.v1.evaluations.deficiency-notes.delete');
});

// نتائج التقييم: الملاحظات (Evaluation Results)
Route::prefix('evaluation-results')->group(function () {
    Route::post('/{id}/notes', [EvaluationController::class, 'addNote'])->name('api.v1.evaluation-results.notes.store');
});

// إدارة طلبات الاستكمال والمهل وسجل محاولات التسليم (U-03, U-11, U-29)
Route::prefix('completion-requests')->group(function () {
    Route::get('/{id}', [CompletionRequestController::class, 'show'])->name('api.v1.completion-requests.show');
    Route::patch('/{id}/deadline', [CompletionRequestController::class, 'extendDeadline'])->name('api.v1.completion-requests.deadline');
    Route::post('/{id}/resubmit', [CompletionRequestController::class, 'resubmit'])->name('api.v1.completion-requests.resubmit');
    Route::post('/{id}/close', [CompletionRequestController::class, 'close'])->name('api.v1.completion-requests.close');
});

// معمارية الشواهد النظيفة ثلاثية المستويات (U-24 Step 2: Clean Evidence Architecture)
Route::get('/schools/{schoolId}/documents', [EvidenceController::class, 'schoolDocuments'])->name('api.v1.schools.documents.index');

Route::prefix('evaluations/{id}/indicators/{indicatorId}/evidence-links')->group(function () {
    Route::get('/', [EvidenceController::class, 'indexEvidenceLinks'])->name('api.v1.evaluations.indicators.evidence-links.index');
    Route::post('/', [EvidenceController::class, 'linkExistingDocument'])->name('api.v1.evaluations.indicators.evidence-links.store');
    Route::post('/upload', [EvidenceController::class, 'uploadAndLinkDocument'])->name('api.v1.evaluations.indicators.evidence-links.upload');
});

Route::delete('/evidence-links/{linkId}', [EvidenceController::class, 'unlinkEvidence'])->name('api.v1.evidence-links.destroy');
Route::get('/document-versions/{versionId}/download', [EvidenceController::class, 'downloadDocumentVersion'])->name('api.v1.document-versions.download');

// مجالات التحسين المستخلصة من نتائج التقييم (Improvement Areas)
Route::prefix('improvement-areas')->group(function () {
    Route::get('/', [ImprovementAreaController::class, 'index'])->name('api.v1.improvement-areas.index');
    Route::post('/', [ImprovementAreaController::class, 'store'])->name('api.v1.improvement-areas.store');
    Route::patch('/{id}', [ImprovementAreaController::class, 'update'])->name('api.v1.improvement-areas.update');
    Route::delete('/{id}', [ImprovementAreaController::class, 'destroy'])->name('api.v1.improvement-areas.destroy');
});

// خطط التحسين المدرسي والتطوير المهني وإجراءاتها وملاحظات المراجعة (الشريحة 3 والشريحة 8)
Route::prefix('improvement-plans')->group(function () {
    Route::get('/action-catalog', [ImprovementPlanController::class, 'actionCatalog'])->name('api.v1.improvement-plans.action-catalog');
    Route::get('/', [ImprovementPlanController::class, 'index'])->name('api.v1.improvement-plans.index');
    Route::post('/', [ImprovementPlanController::class, 'store'])->name('api.v1.improvement-plans.store');
    Route::get('/{id}', [ImprovementPlanController::class, 'show'])->name('api.v1.improvement-plans.show');
    Route::patch('/{id}', [ImprovementPlanController::class, 'update'])->name('api.v1.improvement-plans.update');
    Route::post('/{id}/actions', [ImprovementPlanController::class, 'storeAction'])->name('api.v1.improvement-plans.actions.store');
    Route::patch('/{id}/actions/{actionId}', [ImprovementPlanController::class, 'updateAction'])->name('api.v1.improvement-plans.actions.update');
    Route::delete('/{id}/actions/{actionId}', [ImprovementPlanController::class, 'deleteAction'])->name('api.v1.improvement-plans.actions.delete');
    Route::post('/{id}/actions/{actionId}/evidences', [ImprovementPlanController::class, 'attachActionEvidence'])->name('api.v1.improvement-plans.actions.evidences.store');
    Route::delete('/{id}/actions/{actionId}/evidences/{evidenceLinkId}', [ImprovementPlanController::class, 'detachActionEvidence'])->name('api.v1.improvement-plans.actions.evidences.delete');
    Route::post('/{id}/review-notes', [ImprovementPlanController::class, 'storeReviewNote'])->name('api.v1.improvement-plans.review-notes.store');
});

// سجل الإشعارات الدائم والتنبيهات النظامية (Notifications - الشريحة 10)
Route::prefix('notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index'])->name('api.v1.notifications.index');
    Route::get('/unread-count', [NotificationController::class, 'unreadCount'])->name('api.v1.notifications.unread-count');
    Route::patch('/{id}/read', [NotificationController::class, 'markAsRead'])->name('api.v1.notifications.mark-as-read');
    Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('api.v1.notifications.mark-all-read');
});

// --------------------------------------------------------------------------
// التقارير والتحليلات وحساب النتائج (الشريحة 4 - Reports & Analytics)
// --------------------------------------------------------------------------
Route::prefix('schools/{school}')->group(function () {
    Route::get('/dashboard', [ReportsAnalyticsController::class, 'dashboard'])
        ->name('api.v1.schools.dashboard');
    Route::get('/improvement-plans/summary', [ReportsAnalyticsController::class, 'improvementPlansSummary'])
        ->name('api.v1.schools.improvement-plans.summary');
    Route::get('/assessments/{assessment}/results', [ReportsAnalyticsController::class, 'assessmentResults'])
        ->name('api.v1.schools.assessments.results');
    Route::get('/assessments/{assessment}/standards/{standard}/results', [ReportsAnalyticsController::class, 'standardResults'])
        ->name('api.v1.schools.assessments.standards.results');
    Route::get('/assessments/{assessment}/evidence-summary', [ReportsAnalyticsController::class, 'evidenceSummary'])
        ->name('api.v1.schools.assessments.evidence-summary');
    Route::get('/assessments/{assessment}/evidence-inventory', [EvidenceController::class, 'inventory'])
        ->name('api.v1.schools.assessments.evidence-inventory');
    Route::get('/assessments/{assessment}/indicators-context', [EvaluationController::class, 'indicatorsContextBySchool'])
        ->name('api.v1.schools.assessments.indicators-context');
    Route::get('/assessments/{assessment}/export', [ReportsAnalyticsController::class, 'exportAssessment'])
        ->name('api.v1.schools.assessments.export');
    Route::post('/assessments/{assessment}/submit', [EvaluationController::class, 'submitBySchool'])
        ->name('api.v1.schools.assessments.submit');
});
