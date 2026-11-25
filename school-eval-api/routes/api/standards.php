<?php

use App\Http\Controllers\Api\V1\StandardGovernanceController;
use App\Http\Controllers\Api\V1\StandardManagementController;
use App\Http\Controllers\Api\V1\StandardVersionController;
use Illuminate\Support\Facades\Route;

// الإصدارات المعيارية وإدارة المعايير الوطنية (Standard Versions Management - الشريحة 7)
Route::prefix('standard-versions')->group(function () {
    Route::get('/', [StandardManagementController::class, 'index'])->name('api.v1.standard-versions.index');
    Route::post('/', [StandardManagementController::class, 'store'])->name('api.v1.standard-versions.store');
    Route::get('/{id}', [StandardVersionController::class, 'show'])->name('api.v1.standard-versions.show');
    Route::get('/{id}/tree', [StandardManagementController::class, 'tree'])->name('api.v1.standard-versions.tree');
    Route::put('/{id}', [StandardManagementController::class, 'update'])->name('api.v1.standard-versions.update');
    Route::delete('/{id}', [StandardManagementController::class, 'destroy'])->name('api.v1.standard-versions.destroy');
    Route::post('/{id}/clone', [StandardManagementController::class, 'clone'])->name('api.v1.standard-versions.clone');
    Route::get('/{id}/weights', [StandardManagementController::class, 'getWeights'])->name('api.v1.standard-versions.weights.show');
    Route::put('/{id}/weights', [StandardManagementController::class, 'updateWeights'])->name('api.v1.standard-versions.weights.update');
    Route::get('/{id}/diff-log', [StandardGovernanceController::class, 'diffLog'])->name('api.v1.standard-versions.diff-log');
    Route::get('/{id}/lock-preconditions', [StandardGovernanceController::class, 'lockPreconditions'])->name('api.v1.standard-versions.lock-preconditions');
    Route::post('/{id}/lock', [StandardGovernanceController::class, 'lock'])->name('api.v1.standard-versions.lock');
    Route::get('/{id}/export-pdf', [StandardGovernanceController::class, 'exportPdf'])->name('api.v1.standard-versions.export-pdf');
    Route::post('/{id}/approve', [StandardGovernanceController::class, 'approve'])->name('api.v1.standard-versions.approve');
    Route::post('/{id}/activate', [StandardGovernanceController::class, 'activate'])->name('api.v1.standard-versions.activate');
    Route::post('/{id}/archive', [StandardGovernanceController::class, 'archive'])->name('api.v1.standard-versions.archive');
    Route::put('/{id}/score-levels', [StandardManagementController::class, 'updateScoreLevels'])->name('api.v1.standard-versions.score-levels.update');
    Route::post('/{id}/standards', [StandardManagementController::class, 'storeStandard'])->name('api.v1.standard-versions.standards.store');
    Route::post('/{id}/standards/{stdId}/sub-standards', [StandardManagementController::class, 'storeSubStandardNested'])->name('api.v1.standard-versions.standards.sub-standards.store');
});

// سلالم التقدير اللفظي الرسمية
Route::get('/score-levels', [StandardManagementController::class, 'scoreLevels'])->name('api.v1.score-levels.index');

// إدارة نصوص وأوزان المعايير والمجالات والمؤشرات ومتطلبات الشواهد في المسودة (الشريحة 7)
Route::prefix('standards')->group(function () {
    Route::put('/{id}', [StandardManagementController::class, 'updateStandard'])->name('api.v1.standards.update');
    Route::delete('/{id}', [StandardManagementController::class, 'deleteStandard'])->name('api.v1.standards.delete');
    Route::post('/{id}/sub-standards', [StandardManagementController::class, 'storeSubStandard'])->name('api.v1.standards.sub-standards.store');
});

Route::prefix('sub-standards')->group(function () {
    Route::put('/{id}', [StandardManagementController::class, 'updateSubStandard'])->name('api.v1.sub-standards.update');
    Route::delete('/{id}', [StandardManagementController::class, 'deleteSubStandard'])->name('api.v1.sub-standards.delete');
    Route::post('/{id}/indicators', [StandardManagementController::class, 'storeIndicator'])->name('api.v1.sub-standards.indicators.store');
});

Route::prefix('indicators')->group(function () {
    Route::put('/{id}', [StandardManagementController::class, 'updateIndicator'])->name('api.v1.indicators.update');
    Route::delete('/{id}', [StandardManagementController::class, 'deleteIndicator'])->name('api.v1.indicators.delete');
    Route::put('/{id}/descriptors', [StandardManagementController::class, 'updateIndicatorDescriptors'])->name('api.v1.indicators.descriptors.update');
    Route::post('/{id}/requirements', [StandardManagementController::class, 'storeRequirement'])->name('api.v1.indicators.requirements.store');
    Route::put('/{indicatorId}/requirements/{requirementId}', [StandardManagementController::class, 'updateRequirement'])->name('api.v1.indicators.requirements.update');
    Route::delete('/{indicatorId}/requirements/{requirementId}', [StandardManagementController::class, 'deleteRequirement'])->name('api.v1.indicators.requirements.delete');
});

// إدارة أدوات ووسائل التحقق الرسمية
Route::prefix('verification-tools')->group(function () {
    Route::get('/', [StandardManagementController::class, 'getVerificationTools'])->name('api.v1.verification-tools.index');
    Route::post('/', [StandardManagementController::class, 'storeVerificationTool'])->name('api.v1.verification-tools.store');
    Route::delete('/{id}', [StandardManagementController::class, 'deleteVerificationTool'])->name('api.v1.verification-tools.destroy');
});
