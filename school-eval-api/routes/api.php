<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\EvaluationController;
use App\Http\Controllers\Api\V1\EvidenceController;
use App\Http\Controllers\Api\V1\PasswordResetController;
use App\Http\Controllers\Api\V1\ReportsAnalyticsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| مسارات واجهة برمجة التطبيقات الإصدار الأول (API v1 Routes)
|--------------------------------------------------------------------------
|
| وفق كتالوج المسارات المعتمد في الفصل الرابع واتفاقيات conventions.md:
| - المسارات بالبادئة: /api/v1
| - أسماء الموارد: جمع وبأسلوب kebab-case
| - استجابات موحدة بصيغة JSON المغلف (data, message, errors, meta)
|
*/

Route::prefix('v1')->group(function () {

    // --------------------------------------------------------------------------
    // مسارات المصادقة العامة (Public Auth Routes)
    // --------------------------------------------------------------------------
    Route::prefix('auth')->group(function () {
        Route::post('/login', [AuthController::class, 'login'])
            ->middleware('throttle:auth.login')
            ->name('api.v1.auth.login');
        Route::post('/password/forgot', [PasswordResetController::class, 'forgotPassword'])
            ->middleware('throttle:auth.password.forgot')
            ->name('api.v1.auth.password.forgot');
        Route::post('/password/reset', [PasswordResetController::class, 'resetPassword'])
            ->name('api.v1.auth.password.reset');
    });

    // --------------------------------------------------------------------------
    // مسارات محمية بمصادقة Sanctum Bearer Token وفرض الخمول (30 دقيقة)
    // --------------------------------------------------------------------------
    Route::middleware(['auth:sanctum', 'session.timeout', 'check.maintenance'])->group(function () {
        require __DIR__ . '/api/auth_admin.php';
        require __DIR__ . '/api/evaluator.php';
        require __DIR__ . '/api/supervision.php';
        require __DIR__ . '/api/standards.php';
        require __DIR__ . '/api/evaluations_reports.php';
    });
});

// مسارات متوافقة كبدائل بدون بادئة v1 (/api/schools/...)
Route::middleware(['auth:sanctum', 'session.timeout'])->group(function () {
    Route::prefix('schools/{school}')->group(function () {
        Route::get('/dashboard', [ReportsAnalyticsController::class, 'dashboard'])->name('api.schools.dashboard');
        Route::get('/improvement-plans/summary', [ReportsAnalyticsController::class, 'improvementPlansSummary'])->name('api.schools.improvement-plans.summary');
        Route::get('/assessments/{assessment}/results', [ReportsAnalyticsController::class, 'assessmentResults'])->name('api.schools.assessments.results');
        Route::get('/assessments/{assessment}/standards/{standard}/results', [ReportsAnalyticsController::class, 'standardResults'])->name('api.schools.assessments.standards.results');
        Route::get('/assessments/{assessment}/evidence-summary', [ReportsAnalyticsController::class, 'evidenceSummary'])->name('api.schools.assessments.evidence-summary');
        Route::get('/assessments/{assessment}/evidence-inventory', [EvidenceController::class, 'inventory'])->name('api.schools.assessments.evidence-inventory');
        Route::get('/assessments/{assessment}/indicators-context', [EvaluationController::class, 'indicatorsContextBySchool'])->name('api.schools.assessments.indicators-context');
        Route::get('/assessments/{assessment}/export', [ReportsAnalyticsController::class, 'exportAssessment'])->name('api.schools.assessments.export');
        Route::post('/assessments/{assessment}/submit', [EvaluationController::class, 'submitBySchool'])->name('api.schools.assessments.submit');
    });
});
