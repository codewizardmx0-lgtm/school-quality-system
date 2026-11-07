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
        Route::post('/login', [AuthController::class, 'login'])
            ->middleware('throttle:auth.login')
            ->name('api.v1.auth.login');
        Route::post('/password/forgot', [\App\Http\Controllers\Api\V1\PasswordResetController::class, 'forgotPassword'])
            ->middleware('throttle:auth.password.forgot')
            ->name('api.v1.auth.password.forgot');
        Route::post('/password/reset', [\App\Http\Controllers\Api\V1\PasswordResetController::class, 'resetPassword'])
            ->name('api.v1.auth.password.reset');
    });

    // --------------------------------------------------------------------------
    // مسارات محمية بمصادقة Sanctum Bearer Token وفرض الخمول (30 دقيقة)
    // --------------------------------------------------------------------------
    Route::middleware(['auth:sanctum', 'session.timeout', 'check.maintenance'])->group(function () {

        // مصادقة المستخدم والجلسة (Auth & Session Management)
        Route::prefix('auth')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout'])->name('api.v1.auth.logout');
            Route::get('/me', [AuthController::class, 'me'])->name('api.v1.auth.me');
            Route::post('/password/change', [AuthController::class, 'changePassword'])
                ->middleware('throttle:auth.password.change')
                ->name('api.v1.auth.password.change');
            Route::post('/change-password', [AuthController::class, 'changePassword'])
                ->middleware('throttle:auth.password.change')
                ->name('api.v1.auth.change-password');
        });

        // سجل التدقيق للعمليات الحساسة (Audit Logs)
        Route::get('/audit-logs', [\App\Http\Controllers\Api\V1\AuditLogController::class, 'index'])->name('api.v1.audit-logs.index');

        // المدارس مع العزل المؤسسي والتحقق من الصلاحيات (Schools)
        Route::prefix('schools')->group(function () {
            Route::get('/', [SchoolController::class, 'index'])->name('api.v1.schools.index');
            Route::post('/', [SchoolController::class, 'store'])->name('api.v1.schools.store');
            Route::get('/suggest-code', [SchoolController::class, 'suggestCode'])->name('api.v1.schools.suggest-code');
            Route::get('/{id}', [SchoolController::class, 'show'])->name('api.v1.schools.show');
            Route::put('/{id}', [SchoolController::class, 'update'])->name('api.v1.schools.update');
            Route::delete('/{id}', [SchoolController::class, 'destroy'])->name('api.v1.schools.destroy');
            Route::patch('/{id}/toggle-status', [SchoolController::class, 'toggleStatus'])->name('api.v1.schools.toggle-status');
            Route::post('/{id}/assign-evaluator', [\App\Http\Controllers\Api\V1\AdminController::class, 'assignEvaluator'])->name('api.v1.schools.assign-evaluator');
            Route::post('/{id}/unassign-evaluator', [\App\Http\Controllers\Api\V1\AdminController::class, 'unassignEvaluator'])->name('api.v1.schools.unassign-evaluator');
            Route::post('/{id}/assign-principal', [\App\Http\Controllers\Api\V1\AdminController::class, 'assignPrincipal'])->name('api.v1.schools.assign-principal');
            Route::post('/{id}/unassign-principal', [\App\Http\Controllers\Api\V1\AdminController::class, 'unassignPrincipal'])->name('api.v1.schools.unassign-principal');

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
            Route::patch('/{id}/status', [\App\Http\Controllers\Api\V1\UserController::class, 'toggleStatus'])->name('api.v1.users.status');
            Route::post('/{id}/reset-password', [\App\Http\Controllers\Api\V1\AdminController::class, 'resetPassword'])->name('api.v1.users.reset-password');
        });

        // الأدوار والمديريات وسجلات الأمان والنسخ الاحتياطي وإعدادات النظام لمسؤول النظام (React Admin)
        Route::get('/roles', [\App\Http\Controllers\Api\V1\AdminController::class, 'roles'])->name('api.v1.roles.index');

        // المحافظات والمديريات
        Route::get('/governorates', [\App\Http\Controllers\Api\V1\GovernorateController::class, 'index'])->name('api.v1.governorates.index');
        Route::get('/governorates/{id}', [\App\Http\Controllers\Api\V1\GovernorateController::class, 'show'])->name('api.v1.governorates.show');

        Route::prefix('directorates')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\AdminController::class, 'directorates'])->name('api.v1.directorates.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\AdminController::class, 'storeDirectorate'])->name('api.v1.directorates.store');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\AdminController::class, 'updateDirectorate'])->name('api.v1.directorates.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\AdminController::class, 'destroyDirectorate'])->name('api.v1.directorates.destroy');
        });

        Route::get('/admin/audit-logs', [\App\Http\Controllers\Api\V1\AdminController::class, 'auditLogs'])->name('api.v1.admin.audit-logs.index');

        Route::prefix('security')->group(function () {
            Route::get('/blocked-ips', [\App\Http\Controllers\Api\V1\AdminController::class, 'blockedIps'])->name('api.v1.security.blocked-ips');
            Route::post('/unblock-ip', [\App\Http\Controllers\Api\V1\AdminController::class, 'unblockIp'])->name('api.v1.security.unblock-ip');
        });

        Route::prefix('backups')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\AdminController::class, 'backups'])->name('api.v1.backups.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\AdminController::class, 'triggerBackup'])->name('api.v1.backups.trigger');
            Route::post('/{id}/verify', [\App\Http\Controllers\Api\V1\AdminController::class, 'verifyBackup'])->name('api.v1.backups.verify');
        });

        Route::prefix('system-settings')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\AdminController::class, 'systemSettings'])->name('api.v1.system-settings.index');
            Route::put('/', [\App\Http\Controllers\Api\V1\AdminController::class, 'updateSystemSettings'])->name('api.v1.system-settings.update');
            Route::post('/maintenance', [\App\Http\Controllers\Api\V1\AdminController::class, 'toggleMaintenance'])->name('api.v1.system-settings.maintenance');
            Route::post('/test-email', [\App\Http\Controllers\Api\V1\AdminController::class, 'sendTestEmail'])->name('api.v1.system-settings.test-email');
        });

        Route::prefix('admin')->group(function () {
            Route::get('/dashboard-stats', [\App\Http\Controllers\Api\V1\AdminController::class, 'dashboardStats'])->name('api.v1.admin.dashboard-stats');
            Route::get('/export-report-pdf', [\App\Http\Controllers\Api\V1\AdminController::class, 'exportReportPdf'])->name('api.v1.admin.export-report-pdf');
        });

        // --------------------------------------------------------------------------
        // بوابة مستخدم التقييم بالمدرسة (School Evaluator Suite - ERTEQA)
        // --------------------------------------------------------------------------
        Route::prefix('evaluator')->group(function () {
            Route::get('/dashboard-stats', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'dashboardStats'])->name('api.v1.evaluator.dashboard-stats');
            Route::get('/export-report-pdf', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'exportReportPdf'])->name('api.v1.evaluator.export-report-pdf');
            Route::get('/evidence-inventory', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'getEvidenceInventory'])->name('api.v1.evaluator.evidence-inventory');
            Route::get('/improvement-suggestions', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'getImprovementSuggestions'])->name('api.v1.evaluator.improvement-suggestions');
            Route::post('/evidence-links/multi', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'multiLinkEvidence'])->name('api.v1.evaluator.evidence-links.multi');
        });

        Route::get('/standard-versions/active/tree', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'activeStandardsTree'])->name('api.v1.standard-versions.active.tree');
        Route::get('/evaluation-results/{indicatorId}', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'getEvaluationResult'])->name('api.v1.evaluation-results.indicator.show');
        Route::post('/evaluation-results', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'saveEvaluationResult'])->name('api.v1.evaluation-results.store');

        Route::post('/evidences/upload', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'uploadEvidence'])->name('api.v1.evidences.upload');
        Route::get('/evidences', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'getEvidences'])->name('api.v1.evidences.index');

        Route::prefix('ai')->group(function () {
            Route::post('/analyses', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'triggerAiAnalysis'])->name('api.v1.ai.analyses.store');
            Route::get('/analyses/{id}/recommendations', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'getAiRecommendations'])->name('api.v1.ai.analyses.recommendations');
            Route::patch('/recommendations/{id}', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'updateAiRecommendation'])->name('api.v1.ai.recommendations.update');
        });

        Route::get('/improvement-plans/current', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'getCurrentImprovementPlan'])->name('api.v1.improvement-plans.current');
        Route::post('/improvement-actions', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'createImprovementAction'])->name('api.v1.improvement-actions.store');
        Route::put('/improvement-actions/{id}', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'updateImprovementAction'])->name('api.v1.improvement-actions.update');
        Route::post('/improvement-actions/{id}/evidences', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'attachActionEvidence'])->name('api.v1.improvement-actions.evidences.store');

        Route::get('/evaluations/current/preflight-check', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'preflightCheck'])->name('api.v1.evaluations.current.preflight-check');
        Route::post('/evaluation-submissions/submit', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'submitEvaluation'])->name('api.v1.evaluation-submissions.submit');

        Route::get('/completion-requests/current', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'getCurrentCompletionRequest'])->name('api.v1.completion-requests.current');
        Route::post('/completion-request-items/{id}/resolve', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'resolveCompletionRequestItem'])->name('api.v1.completion-request-items.resolve');
        Route::post('/completion-requests/{id}/resubmit', [\App\Http\Controllers\Api\V1\EvaluatorApiController::class, 'resubmitCompletionRequest'])->name('api.v1.completion-requests.resubmit.evaluator');
        // الإصدارات المعيارية وإدارة معايير الاعتماد المدرسي (Standard Versions Management - الشريحة 7)
        Route::prefix('standard-versions')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'index'])->name('api.v1.standard-versions.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'store'])->name('api.v1.standard-versions.store');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\StandardVersionController::class, 'show'])->name('api.v1.standard-versions.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'update'])->name('api.v1.standard-versions.update');
            Route::post('/{id}/clone', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'clone'])->name('api.v1.standard-versions.clone');
            Route::put('/{id}/weights', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'updateWeights'])->name('api.v1.standard-versions.weights.update');
            Route::post('/{id}/approve', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'approve'])->name('api.v1.standard-versions.approve');
            Route::post('/{id}/activate', [\App\Http\Controllers\Api\V1\StandardManagementController::class, 'activate'])->name('api.v1.standard-versions.activate');
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

        // إدارة دورات التقييم المركزية وتسجيل مشاركة المدارس (Evaluation Cycles - الشريحة 10)
        Route::prefix('evaluation-cycles')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\EvaluationCycleController::class, 'index'])->name('api.v1.evaluation-cycles.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\EvaluationCycleController::class, 'store'])->name('api.v1.evaluation-cycles.store');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\EvaluationCycleController::class, 'show'])->name('api.v1.evaluation-cycles.show');
            Route::patch('/{id}', [\App\Http\Controllers\Api\V1\EvaluationCycleController::class, 'update'])->name('api.v1.evaluation-cycles.update');
            Route::post('/{id}/participations', [\App\Http\Controllers\Api\V1\EvaluationCycleController::class, 'enrollSchools'])->name('api.v1.evaluation-cycles.participations.store');
        });

        // عمليات التقييم المدرسي مع العزل المؤسسي ورصد الدرجات (Evaluations)
        Route::prefix('evaluations')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'index'])->name('api.v1.evaluations.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'store'])->name('api.v1.evaluations.store');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'show'])->name('api.v1.evaluations.show');
            Route::get('/{id}/standards-tree', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'standardsTree'])->name('api.v1.evaluations.standards-tree');
            Route::get('/{id}/improvement-suggestions', [\App\Http\Controllers\Api\V1\ImprovementSuggestionController::class, 'index'])->name('api.v1.evaluations.improvement-suggestions');
            Route::put('/{evaluationId}/indicators/{indicatorId}/score', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'scoreIndicator'])->name('api.v1.evaluations.indicators.score');
            Route::post('/{id}/submit', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'submit'])->name('api.v1.evaluations.submit');
            Route::post('/{id}/close', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'directClose'])->name('api.v1.evaluations.close');
            Route::get('/{id}/completion-requests', [\App\Http\Controllers\Api\V1\CompletionRequestController::class, 'index'])->name('api.v1.evaluations.completion-requests.index');
            Route::post('/{id}/completion-requests', [\App\Http\Controllers\Api\V1\CompletionRequestController::class, 'store'])->name('api.v1.evaluations.completion-requests.store');
            Route::post('/{id}/dev-reset', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'devReset'])->name('api.v1.evaluations.dev-reset');
            Route::get('/{id}/indicators-context', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'indicatorsContext'])->name('api.v1.evaluations.indicators-context');
            Route::get('/{id}/evidence-inventory', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'inventory'])->name('api.v1.evaluations.evidence-inventory');
            Route::get('/{id}/export-pdf', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'exportPdf'])->name('api.v1.evaluations.export-pdf');
            Route::get('/{id}/export-excel', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'exportExcel'])->name('api.v1.evaluations.export-excel');
            Route::get('/{id}/trend', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'trend'])->name('api.v1.evaluations.trend');
            Route::get('/{id}/action-recommendations', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'actionRecommendations'])->name('api.v1.evaluations.action-recommendations');
        });

        // نتائج التقييم: الملاحظات (Evaluation Results)
        Route::prefix('evaluation-results')->group(function () {
            Route::post('/{id}/notes', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'addNote'])->name('api.v1.evaluation-results.notes.store');
        });

        // إدارة طلبات الاستكمال والمهل وسجل محاولات التسليم (U-03, U-11, U-29)
        Route::prefix('completion-requests')->group(function () {
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\CompletionRequestController::class, 'show'])->name('api.v1.completion-requests.show');
            Route::patch('/{id}/deadline', [\App\Http\Controllers\Api\V1\CompletionRequestController::class, 'extendDeadline'])->name('api.v1.completion-requests.deadline');
            Route::post('/{id}/resubmit', [\App\Http\Controllers\Api\V1\CompletionRequestController::class, 'resubmit'])->name('api.v1.completion-requests.resubmit');
            Route::post('/{id}/close', [\App\Http\Controllers\Api\V1\CompletionRequestController::class, 'close'])->name('api.v1.completion-requests.close');
        });

        // معمارية الشواهد النظيفة ثلاثية المستويات (U-24 Step 2: Clean Evidence Architecture)
        Route::get('/schools/{schoolId}/documents', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'schoolDocuments'])->name('api.v1.schools.documents.index');

        Route::prefix('evaluations/{id}/indicators/{indicatorId}/evidence-links')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'indexEvidenceLinks'])->name('api.v1.evaluations.indicators.evidence-links.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'linkExistingDocument'])->name('api.v1.evaluations.indicators.evidence-links.store');
            Route::post('/upload', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'uploadAndLinkDocument'])->name('api.v1.evaluations.indicators.evidence-links.upload');
        });

        Route::delete('/evidence-links/{linkId}', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'unlinkEvidence'])->name('api.v1.evidence-links.destroy');
        Route::get('/document-versions/{versionId}/download', [\App\Http\Controllers\Api\V1\EvidenceController::class, 'downloadDocumentVersion'])->name('api.v1.document-versions.download');

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
            Route::delete('/{id}/actions/{actionId}/evidences/{evidenceLinkId}', [\App\Http\Controllers\Api\V1\ImprovementPlanController::class, 'detachActionEvidence'])->name('api.v1.improvement-plans.actions.evidences.delete');
            Route::post('/{id}/review-notes', [\App\Http\Controllers\Api\V1\ImprovementPlanController::class, 'storeReviewNote'])->name('api.v1.improvement-plans.review-notes.store');
        });

        // سجل الإشعارات الدائم والتنبيهات النظامية (Notifications - الشريحة 10)
        Route::prefix('notifications')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\NotificationController::class, 'index'])->name('api.v1.notifications.index');
            Route::get('/unread-count', [\App\Http\Controllers\Api\V1\NotificationController::class, 'unreadCount'])->name('api.v1.notifications.unread-count');
            Route::patch('/{id}/read', [\App\Http\Controllers\Api\V1\NotificationController::class, 'markAsRead'])->name('api.v1.notifications.mark-as-read');
            Route::post('/mark-all-read', [\App\Http\Controllers\Api\V1\NotificationController::class, 'markAllAsRead'])->name('api.v1.notifications.mark-all-read');
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
        Route::get('/assessments/{assessment}/indicators-context', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'indicatorsContextBySchool'])->name('api.schools.assessments.indicators-context');
        Route::get('/assessments/{assessment}/export', [\App\Http\Controllers\Api\V1\ReportsAnalyticsController::class, 'exportAssessment'])->name('api.schools.assessments.export');
        Route::post('/assessments/{assessment}/submit', [\App\Http\Controllers\Api\V1\EvaluationController::class, 'submitBySchool'])->name('api.schools.assessments.submit');
    });
});

