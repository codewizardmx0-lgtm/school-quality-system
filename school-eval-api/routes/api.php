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

            // الملف التعريفي وإحصاءات ومرافق المدرسة (الشريحة 6)
            Route::get('/{id}/profile', [\App\Http\Controllers\Api\V1\SchoolManagementController::class, 'getProfile'])->name('api.v1.schools.profile.get');
            Route::put('/{id}/profile', [\App\Http\Controllers\Api\V1\SchoolManagementController::class, 'updateProfile'])->name('api.v1.schools.profile.update');
            Route::get('/{id}/staff-metrics', [\App\Http\Controllers\Api\V1\SchoolManagementController::class, 'getStaffMetrics'])->name('api.v1.schools.staff-metrics.get');
            Route::put('/{id}/staff-metrics', [\App\Http\Controllers\Api\V1\SchoolManagementController::class, 'saveStaffMetrics'])->name('api.v1.schools.staff-metrics.save');
            Route::get('/{id}/enrollment-metrics', [\App\Http\Controllers\Api\V1\SchoolManagementController::class, 'getEnrollmentMetrics'])->name('api.v1.schools.enrollment-metrics.get');
            Route::post('/{id}/enrollment-metrics', [\App\Http\Controllers\Api\V1\SchoolManagementController::class, 'saveEnrollmentMetrics'])->name('api.v1.schools.enrollment-metrics.save');
            Route::get('/{id}/facilities', [\App\Http\Controllers\Api\V1\SchoolManagementController::class, 'getFacilities'])->name('api.v1.schools.facilities.index');
            Route::post('/{id}/facilities', [\App\Http\Controllers\Api\V1\SchoolManagementController::class, 'storeFacility'])->name('api.v1.schools.facilities.store');
            Route::put('/{id}/facilities/{facilityId}', [\App\Http\Controllers\Api\V1\SchoolManagementController::class, 'updateFacility'])->name('api.v1.schools.facilities.update');
            Route::delete('/{id}/facilities/{facilityId}', [\App\Http\Controllers\Api\V1\SchoolManagementController::class, 'deleteFacility'])->name('api.v1.schools.facilities.delete');
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

        // الإصدارات المعيارية وإدارة معايير الاعتماد المدرسي (Standard Versions Management - الشريحة 7)
        Route::prefix('standard-versions')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'index'])->name('api.v1.standard-versions.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'store'])->name('api.v1.standard-versions.store');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\StandardVersionController::class, 'show'])->name('api.v1.standard-versions.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'update'])->name('api.v1.standard-versions.update');
            Route::post('/{id}/clone', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'clone'])->name('api.v1.standard-versions.clone');
            Route::put('/{id}/weights', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'updateWeights'])->name('api.v1.standard-versions.weights.update');
            Route::post('/{id}/approve', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'approve'])->name('api.v1.standard-versions.approve');
            Route::post('/{id}/archive', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'archive'])->name('api.v1.standard-versions.archive');
            Route::post('/{id}/standards', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'storeStandard'])->name('api.v1.standard-versions.standards.store');
        });

        // إدارة نصوص وأوزان المعايير والمجالات والمؤشرات ومتطلبات الشواهد في المسودة (الشريحة 7)
        Route::prefix('standards')->group(function () {
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'updateStandard'])->name('api.v1.standards.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'deleteStandard'])->name('api.v1.standards.delete');
            Route::post('/{id}/sub-standards', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'storeSubStandard'])->name('api.v1.standards.sub-standards.store');
        });

        Route::prefix('sub-standards')->group(function () {
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'updateSubStandard'])->name('api.v1.sub-standards.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'deleteSubStandard'])->name('api.v1.sub-standards.delete');
            Route::post('/{id}/indicators', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'storeIndicator'])->name('api.v1.sub-standards.indicators.store');
        });

        Route::prefix('indicators')->group(function () {
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'updateIndicator'])->name('api.v1.indicators.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'deleteIndicator'])->name('api.v1.indicators.delete');
            Route::put('/{id}/descriptors', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'updateIndicatorDescriptors'])->name('api.v1.indicators.descriptors.update');
            Route::post('/{id}/requirements', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'storeRequirement'])->name('api.v1.indicators.requirements.store');
            Route::put('/{indicatorId}/requirements/{requirementId}', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'updateRequirement'])->name('api.v1.indicators.requirements.update');
            Route::delete('/{indicatorId}/requirements/{requirementId}', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'deleteRequirement'])->name('api.v1.indicators.requirements.delete');
        });

        // عمليات التقييم المدرسي مع العزل المؤسسي ورصد الدرجات (Evaluations)
        Route::prefix('evaluations')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'index'])->name('api.v1.evaluations.index');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'show'])->name('api.v1.evaluations.show');
            Route::get('/{id}/standards-tree', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'standardsTree'])->name('api.v1.evaluations.standards-tree');
            Route::get('/{id}/improvement-suggestions', [\App\Http\Controllers\Api\V1\ImprovementSuggestionController::class, 'index'])->name('api.v1.evaluations.improvement-suggestions');
            Route::put('/{evaluationId}/indicators/{indicatorId}/score', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'scoreIndicator'])->name('api.v1.evaluations.indicators.score');
            Route::post('/{id}/submit', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'submit'])->name('api.v1.evaluations.submit');
            Route::post('/{id}/dev-reset', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'devReset'])->name('api.v1.evaluations.dev-reset');
            Route::get('/{id}/indicators-context', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'indicatorsContext'])->name('api.v1.evaluations.indicators-context');
            Route::get('/{id}/evidence-inventory', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'inventory'])->name('api.v1.evaluations.evidence-inventory');
            Route::get('/{id}/indicators/{indicatorId}/evidences', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'indexByIndicator'])->name('api.v1.evaluations.indicators.evidences.index');
            Route::post('/{id}/indicators/{indicatorId}/evidences', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'storeByIndicator'])->name('api.v1.evaluations.indicators.evidences.store');
        });

        // نتائج التقييم: الملاحظات وإدارة الشواهد (Evaluation Results)
        Route::prefix('evaluation-results')->group(function () {
            Route::post('/{id}/notes', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'addNote'])->name('api.v1.evaluation-results.notes.store');
            Route::get('/{id}/evidences', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'indexByResult'])->name('api.v1.evaluation-results.evidences.index');
            Route::post('/{id}/evidences', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'store'])->name('api.v1.evaluation-results.evidences.store');
        });

        // الشواهد: التنظيم والتصنيف والربط والنسخ التاريخية والمرفقات (Evidence Organization & Versions)
        Route::prefix('evidences')->group(function () {
            Route::patch('/{id}/classify', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'classify'])->name('api.v1.evidences.classify');
            Route::match(['post', 'patch'], '/{id}/link-indicator', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'linkIndicator'])->name('api.v1.evidences.link-indicator');
            Route::patch('/{id}/status', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'updateStatus'])->name('api.v1.evidences.status.update');
            Route::match(['post', 'patch'], '/{id}/review-notes', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'addReviewNote'])->name('api.v1.evidences.review-notes.store');
            Route::post('/{id}/versions', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'addVersion'])->name('api.v1.evidences.versions.store');
            Route::get('/{id}/versions/{versionId}/download', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'downloadVersion'])->name('api.v1.evidences.versions.download');
        });

        // مجالات التحسين المستخلصة من نتائج التقييم (Improvement Areas)
        Route::prefix('improvement-areas')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\ImprovementAreaController::class, 'index'])->name('api.v1.improvement-areas.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\ImprovementAreaController::class, 'store'])->name('api.v1.improvement-areas.store');
            Route::patch('/{id}', [\App\Http\Controllers\Api\V1\ImprovementAreaController::class, 'update'])->name('api.v1.improvement-areas.update');
        });

        // خطط التحسين المدرسي والتطوير المهني وإجراءاتها وملاحظات المراجعة (الشريحة 3 والشريحة 8)
        Route::prefix('improvement-plans')->group(function () {
            Route::get('/action-catalog', [\App\Http\Controllers\Api\V1\ImprovementPlanController::class, 'actionCatalog'])->name('api.v1.improvement-plans.action-catalog');
            Route::get('/', [\App\Http\Controllers\Api\V1\ImprovementPlanController::class, 'index'])->name('api.v1.improvement-plans.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\ImprovementPlanController::class, 'store'])->name('api.v1.improvement-plans.store');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\ImprovementPlanController::class, 'show'])->name('api.v1.improvement-plans.show');
            Route::patch('/{id}', [\App\Http\Controllers\Api\V1\ImprovementPlanController::class, 'update'])->name('api.v1.improvement-plans.update');
            Route::post('/{id}/actions', [\App\Http\Controllers\Api\V1\ImprovementPlanController::class, 'storeAction'])->name('api.v1.improvement-plans.actions.store');
            Route::patch('/{id}/actions/{actionId}', [\App\Http\Controllers\Api\V1\ImprovementPlanController::class, 'updateAction'])->name('api.v1.improvement-plans.actions.update');
            Route::delete('/{id}/actions/{actionId}', [\App\Http\Controllers\Api\V1\ImprovementPlanController::class, 'deleteAction'])->name('api.v1.improvement-plans.actions.delete');
            Route::post('/{id}/actions/{actionId}/evidences', [\App\Http\Controllers\Api\V1\ImprovementPlanController::class, 'attachActionEvidence'])->name('api.v1.improvement-plans.actions.evidences.store');
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
            Route::get('/assessments/{assessment}/evidence-inventory', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'inventory'])
                ->name('api.v1.schools.assessments.evidence-inventory');
            Route::get('/assessments/{assessment}/indicators/{indicatorId}/evidences', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'indexByIndicator'])
                ->name('api.v1.schools.assessments.indicators.evidences.index');
            Route::post('/assessments/{assessment}/indicators/{indicatorId}/evidences', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'storeByIndicator'])
                ->name('api.v1.schools.assessments.indicators.evidences.store');
            Route::get('/assessments/{assessment}/indicators-context', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'indicatorsContextBySchool'])
                ->name('api.v1.schools.assessments.indicators-context');
            Route::get('/assessments/{assessment}/export', [\App\Http\Controllers\Api\V1\ReportsAnalyticsController::class, 'exportAssessment'])
                ->name('api.v1.schools.assessments.export');
            Route::post('/assessments/{assessment}/submit', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'submitBySchool'])
                ->name('api.v1.schools.assessments.submit');
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
        Route::get('/assessments/{assessment}/evidence-inventory', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'inventory'])->name('api.schools.assessments.evidence-inventory');
        Route::get('/assessments/{assessment}/indicators/{indicatorId}/evidences', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'indexByIndicator'])->name('api.schools.assessments.indicators.evidences.index');
        Route::post('/assessments/{assessment}/indicators/{indicatorId}/evidences', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'storeByIndicator'])->name('api.schools.assessments.indicators.evidences.store');
        Route::get('/assessments/{assessment}/indicators-context', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'indicatorsContextBySchool'])->name('api.schools.assessments.indicators-context');
        Route::get('/assessments/{assessment}/export', [\App\Http\Controllers\Api\V1\ReportsAnalyticsController::class, 'exportAssessment'])->name('api.schools.assessments.export');
        Route::post('/assessments/{assessment}/submit', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'submitBySchool'])->name('api.schools.assessments.submit');
    });
});

