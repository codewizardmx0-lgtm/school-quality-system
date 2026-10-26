<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\SchoolController;
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
        Route::post('/login', [AuthController::class, 'login'])->name('api.v1.auth.login');
    });

    // --------------------------------------------------------------------------
    // مسارات محمية بمصادقة Sanctum Bearer Token وفرض الخمول (30 دقيقة)
    // --------------------------------------------------------------------------
    Route::middleware(['auth:sanctum', 'session.timeout'])->group(function () {

        // مصادقة المستخدم والجلسة (Auth & Session Management)
        Route::prefix('auth')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout'])->name('api.v1.auth.logout');
            Route::get('/me', [AuthController::class, 'me'])->name('api.v1.auth.me');
        });

        // المدارس مع العزل المؤسسي والتحقق من الصلاحيات (Schools)
        Route::prefix('schools')->group(function () {
            Route::get('/', [SchoolController::class, 'index'])->name('api.v1.schools.index');
            Route::post('/', [SchoolController::class, 'store'])->name('api.v1.schools.store');
            Route::get('/{id}', [SchoolController::class, 'show'])->name('api.v1.schools.show');
            Route::put('/{id}', [SchoolController::class, 'update'])->name('api.v1.schools.update');
            Route::patch('/{id}/toggle-status', [SchoolController::class, 'toggleStatus'])->name('api.v1.schools.toggle-status');
        });

        // إدارة المستخدمين والحسابات لمسؤول النظام (Users Management)
        Route::prefix('users')->group(function () {
            Route::get('/meta', [\App\Http\Controllers\Api\V1\UserController::class, 'meta'])->name('api.v1.users.meta');
            Route::get('/', [\App\Http\Controllers\Api\V1\UserController::class, 'index'])->name('api.v1.users.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\UserController::class, 'store'])->name('api.v1.users.store');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\UserController::class, 'show'])->name('api.v1.users.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\UserController::class, 'update'])->name('api.v1.users.update');
            Route::patch('/{id}/toggle-status', [\App\Http\Controllers\Api\V1\UserController::class, 'toggleStatus'])->name('api.v1.users.toggle-status');
        });

        // الإصدارات المعيارية وشجرة المعايير والمؤشرات (Standard Versions)
        Route::prefix('standard-versions')->group(function () {
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\StandardVersionController::class, 'show'])->name('api.v1.standard-versions.show');
        });

        // عمليات التقييم المدرسي مع العزل المؤسسي ورصد الدرجات (Evaluations)
        Route::prefix('evaluations')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'index'])->name('api.v1.evaluations.index');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'show'])->name('api.v1.evaluations.show');
            Route::get('/{id}/standards-tree', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'standardsTree'])->name('api.v1.evaluations.standards-tree');
            Route::get('/{id}/improvement-suggestions', [\App\Http\Controllers\Api\V1\ImprovementSuggestionController::class, 'index'])->name('api.v1.evaluations.improvement-suggestions');
            Route::put('/{evaluationId}/indicators/{indicatorId}/score', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'scoreIndicator'])->name('api.v1.evaluations.indicators.score');
        });

        // نتائج التقييم: الملاحظات وإدارة الشواهد (Evaluation Results)
        Route::prefix('evaluation-results')->group(function () {
            Route::post('/{id}/notes', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'addNote'])->name('api.v1.evaluation-results.notes.store');
            Route::get('/{id}/evidences', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'indexByResult'])->name('api.v1.evaluation-results.evidences.index');
            Route::post('/{id}/evidences', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'store'])->name('api.v1.evaluation-results.evidences.store');
        });

        // النسخ التاريخية للشواهد وتنزيل المرفقات الرقمية (Evidence Versions & Download)
        Route::prefix('evidences')->group(function () {
            Route::post('/{id}/versions', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'addVersion'])->name('api.v1.evidences.versions.store');
            Route::get('/{id}/versions/{versionId}/download', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'downloadVersion'])->name('api.v1.evidences.versions.download');
        });

        // مجالات التحسين المستخلصة من نتائج التقييم (Improvement Areas)
        Route::prefix('improvement-areas')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\ImprovementAreaController::class, 'index'])->name('api.v1.improvement-areas.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\ImprovementAreaController::class, 'store'])->name('api.v1.improvement-areas.store');
            Route::patch('/{id}', [\App\Http\Controllers\Api\V1\ImprovementAreaController::class, 'update'])->name('api.v1.improvement-areas.update');
        });

        // خطط التحسين المدرسي وإجراءاتها وملاحظات المراجعة (Improvement Plans, Actions, Review Notes)
        Route::prefix('improvement-plans')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\ImprovementPlanController::class, 'index'])->name('api.v1.improvement-plans.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\ImprovementPlanController::class, 'store'])->name('api.v1.improvement-plans.store');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\ImprovementPlanController::class, 'show'])->name('api.v1.improvement-plans.show');
            Route::patch('/{id}', [\App\Http\Controllers\Api\V1\ImprovementPlanController::class, 'update'])->name('api.v1.improvement-plans.update');
            Route::post('/{id}/actions', [\App\Http\Controllers\Api\V1\ImprovementPlanController::class, 'storeAction'])->name('api.v1.improvement-plans.actions.store');
            Route::patch('/{id}/actions/{actionId}', [\App\Http\Controllers\Api\V1\ImprovementPlanController::class, 'updateAction'])->name('api.v1.improvement-plans.actions.update');
            Route::post('/{id}/review-notes', [\App\Http\Controllers\Api\V1\ImprovementPlanController::class, 'storeReviewNote'])->name('api.v1.improvement-plans.review-notes.store');
        });

        // --------------------------------------------------------------------------
        // التقارير والتحليلات وحساب النتائج (الشريحة 4 - Reports & Analytics)
        // --------------------------------------------------------------------------
        Route::prefix('schools/{school}')->group(function () {
            Route::get('/dashboard', [\App\Http\Controllers\Api\V1\ReportsAnalyticsController::class, 'dashboard'])
                ->name('api.v1.schools.dashboard');
            Route::get('/improvement-plans/summary', [\App\Http\Controllers\Api\V1\ReportsAnalyticsController::class, 'improvementPlansSummary'])
                ->name('api.v1.schools.improvement-plans.summary');
            Route::get('/assessments/{assessment}/results', [\App\Http\Controllers\Api\V1\ReportsAnalyticsController::class, 'assessmentResults'])
                ->name('api.v1.schools.assessments.results');
            Route::get('/assessments/{assessment}/standards/{standard}/results', [\App\Http\Controllers\Api\V1\ReportsAnalyticsController::class, 'standardResults'])
                ->name('api.v1.schools.assessments.standards.results');
            Route::get('/assessments/{assessment}/evidence-summary', [\App\Http\Controllers\Api\V1\ReportsAnalyticsController::class, 'evidenceSummary'])
                ->name('api.v1.schools.assessments.evidence-summary');
            Route::get('/assessments/{assessment}/export', [\App\Http\Controllers\Api\V1\ReportsAnalyticsController::class, 'exportAssessment'])
                ->name('api.v1.schools.assessments.export');
        });
    });
});

// مسارات متوافقة كبدائل بدون بادئة v1 (/api/schools/...)
Route::middleware(['auth:sanctum', 'session.timeout'])->group(function () {
    Route::prefix('schools/{school}')->group(function () {
        Route::get('/dashboard', [\App\Http\Controllers\Api\V1\ReportsAnalyticsController::class, 'dashboard'])->name('api.schools.dashboard');
        Route::get('/improvement-plans/summary', [\App\Http\Controllers\Api\V1\ReportsAnalyticsController::class, 'improvementPlansSummary'])->name('api.schools.improvement-plans.summary');
        Route::get('/assessments/{assessment}/results', [\App\Http\Controllers\Api\V1\ReportsAnalyticsController::class, 'assessmentResults'])->name('api.schools.assessments.results');
        Route::get('/assessments/{assessment}/standards/{standard}/results', [\App\Http\Controllers\Api\V1\ReportsAnalyticsController::class, 'standardResults'])->name('api.schools.assessments.standards.results');
        Route::get('/assessments/{assessment}/evidence-summary', [\App\Http\Controllers\Api\V1\ReportsAnalyticsController::class, 'evidenceSummary'])->name('api.schools.assessments.evidence-summary');
        Route::get('/assessments/{assessment}/export', [\App\Http\Controllers\Api\V1\ReportsAnalyticsController::class, 'exportAssessment'])->name('api.schools.assessments.export');
    });
});

