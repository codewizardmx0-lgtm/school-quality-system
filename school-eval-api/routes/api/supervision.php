<?php

use App\Http\Controllers\Api\V1\SupervisionAnalyticsController;
use App\Http\Controllers\Api\V1\SupervisionController;
use App\Http\Controllers\Api\V1\SupervisionReviewController;
use Illuminate\Support\Facades\Route;

// --------------------------------------------------------------------------
// بوابة المشرف الوزاري والربط البرمجي الكامل (Ministry Supervisor Suite)
// --------------------------------------------------------------------------
Route::prefix('supervision')->group(function () {
    Route::get('/dashboard', [SupervisionController::class, 'dashboard'])->name('api.v1.supervision.dashboard');
    Route::get('/completion-requests', [SupervisionController::class, 'completionRequestsTracker'])->name('api.v1.supervision.completion-requests.index');
    Route::get('/standards-tree', [SupervisionController::class, 'nationalStandardsTree'])->name('api.v1.supervision.standards-tree');
    Route::get('/reports/analytics', [SupervisionAnalyticsController::class, 'centralAnalytics'])->name('api.v1.supervision.reports.analytics');
    Route::get('/reports/analytics/pdf', [SupervisionAnalyticsController::class, 'exportAnalyticsPdf'])->name('api.v1.supervision.reports.analytics.pdf');
});

Route::get('/standard-versions/active', [SupervisionController::class, 'activeStandardVersion'])->name('api.v1.standard-versions.active');

Route::prefix('evaluation-submissions')->group(function () {
    Route::get('/available-for-review', [SupervisionReviewController::class, 'reviewableSubmissions'])->name('api.v1.evaluation-submissions.available-for-review');
    Route::get('/{id}/review', [SupervisionReviewController::class, 'reviewSubmission'])->name('api.v1.evaluation-submissions.review');
    Route::post('/{id}/completion-requests', [SupervisionController::class, 'createCompletionRequest'])->name('api.v1.evaluation-submissions.completion-requests');
    Route::post('/{id}/deficiency-notes', [SupervisionReviewController::class, 'saveDeficiencyNote'])->name('api.v1.evaluation-submissions.deficiency-notes.store');
    Route::delete('/{id}/deficiency-notes/{indicatorId}', [SupervisionReviewController::class, 'deleteDeficiencyNote'])->name('api.v1.evaluation-submissions.deficiency-notes.delete');
});

Route::prefix('schools/{id}')->group(function () {
    Route::get('/tracking-log', [SupervisionReviewController::class, 'schoolTrackingLog'])->name('api.v1.schools.tracking-log');
    Route::post('/supervisor-notes', [SupervisionReviewController::class, 'addSupervisorMemo'])->name('api.v1.schools.supervisor-notes');
    Route::get('/historical-comparison', [SupervisionAnalyticsController::class, 'historicalComparison'])->name('api.v1.schools.historical-comparison');
    Route::get('/tracking-log/pdf', [SupervisionAnalyticsController::class, 'exportTrackingLogPdf'])->name('api.v1.schools.tracking-log.pdf');
    Route::get('/tracking-log/excel', [SupervisionAnalyticsController::class, 'exportTrackingLogExcel'])->name('api.v1.schools.tracking-log.excel');
    Route::get('/historical-comparison/pdf', [SupervisionAnalyticsController::class, 'exportHistoricalComparisonPdf'])->name('api.v1.schools.historical-comparison.pdf');
});
