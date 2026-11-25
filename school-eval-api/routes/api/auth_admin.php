<?php

use App\Http\Controllers\Api\V1\AdminBackupController;
use App\Http\Controllers\Api\V1\AdminController;
use App\Http\Controllers\Api\V1\AdminDirectorateController;
use App\Http\Controllers\Api\V1\AdminSecurityController;
use App\Http\Controllers\Api\V1\AdminSystemSettingsController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\GovernorateController;
use App\Http\Controllers\Api\V1\SchoolController;
use App\Http\Controllers\Api\V1\SchoolManagementController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

// مصادقة المستخدم والجلسة (Auth & Session Management)
Route::prefix('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('api.v1.auth.logout');
    Route::get('/me', [AuthController::class, 'me'])->name('api.v1.auth.me');
    Route::put('/profile', [AuthController::class, 'updateProfile'])->name('api.v1.auth.profile.update');
    Route::post('/password/change', [AuthController::class, 'changePassword'])
        ->middleware('throttle:auth.password.change')
        ->name('api.v1.auth.password.change');
    Route::post('/change-password', [AuthController::class, 'changePassword'])
        ->middleware('throttle:auth.password.change')
        ->name('api.v1.auth.change-password');
});

// سجل التدقيق للعمليات الحساسة (Audit Logs)
Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('api.v1.audit-logs.index');

// المدارس مع العزل المؤسسي والتحقق من الصلاحيات (Schools)
Route::prefix('schools')->group(function () {
    Route::get('/', [SchoolController::class, 'index'])->name('api.v1.schools.index');
    Route::post('/', [SchoolController::class, 'store'])->name('api.v1.schools.store');
    Route::get('/suggest-code', [SchoolController::class, 'suggestCode'])->name('api.v1.schools.suggest-code');
    Route::get('/{id}', [SchoolController::class, 'show'])->name('api.v1.schools.show');
    Route::put('/{id}', [SchoolController::class, 'update'])->name('api.v1.schools.update');
    Route::delete('/{id}', [SchoolController::class, 'destroy'])->name('api.v1.schools.destroy');
    Route::patch('/{id}/toggle-status', [SchoolController::class, 'toggleStatus'])->name('api.v1.schools.toggle-status');
    Route::post('/{id}/assign-evaluator', [AdminController::class, 'assignEvaluator'])->name('api.v1.schools.assign-evaluator');
    Route::post('/{id}/unassign-evaluator', [AdminController::class, 'unassignEvaluator'])->name('api.v1.schools.unassign-evaluator');
    Route::post('/{id}/assign-principal', [AdminController::class, 'assignPrincipal'])->name('api.v1.schools.assign-principal');
    Route::post('/{id}/unassign-principal', [AdminController::class, 'unassignPrincipal'])->name('api.v1.schools.unassign-principal');

    // الملف التعريفي وإحصاءات ومرافق المدرسة (الشريحة 6)
    Route::get('/{id}/profile', [SchoolManagementController::class, 'getProfile'])->name('api.v1.schools.profile.get');
    Route::put('/{id}/profile', [SchoolManagementController::class, 'updateProfile'])->name('api.v1.schools.profile.update');
    Route::get('/{id}/staff-metrics', [SchoolManagementController::class, 'getStaffMetrics'])->name('api.v1.schools.staff-metrics.get');
    Route::put('/{id}/staff-metrics', [SchoolManagementController::class, 'saveStaffMetrics'])->name('api.v1.schools.staff-metrics.save');
    Route::get('/{id}/enrollment-metrics', [SchoolManagementController::class, 'getEnrollmentMetrics'])->name('api.v1.schools.enrollment-metrics.get');
    Route::post('/{id}/enrollment-metrics', [SchoolManagementController::class, 'saveEnrollmentMetrics'])->name('api.v1.schools.enrollment-metrics.save');
    Route::get('/{id}/facilities', [SchoolManagementController::class, 'getFacilities'])->name('api.v1.schools.facilities.index');
    Route::post('/{id}/facilities', [SchoolManagementController::class, 'storeFacility'])->name('api.v1.schools.facilities.store');
    Route::put('/{id}/facilities/{facilityId}', [SchoolManagementController::class, 'updateFacility'])->name('api.v1.schools.facilities.update');
    Route::delete('/{id}/facilities/{facilityId}', [SchoolManagementController::class, 'deleteFacility'])->name('api.v1.schools.facilities.delete');
});

// إدارة المستخدمين والحسابات لمسؤول النظام (Users Management)
Route::prefix('users')->group(function () {
    Route::get('/meta', [UserController::class, 'meta'])->name('api.v1.users.meta');
    Route::get('/', [UserController::class, 'index'])->name('api.v1.users.index');
    Route::post('/', [UserController::class, 'store'])->name('api.v1.users.store');
    Route::get('/{id}', [UserController::class, 'show'])->name('api.v1.users.show');
    Route::put('/{id}', [UserController::class, 'update'])->name('api.v1.users.update');
    Route::patch('/{id}/toggle-status', [UserController::class, 'toggleStatus'])->name('api.v1.users.toggle-status');
    Route::patch('/{id}/status', [UserController::class, 'toggleStatus'])->name('api.v1.users.status');
    Route::post('/{id}/reset-password', [AdminController::class, 'resetPassword'])->name('api.v1.users.reset-password');
});

// الأدوار والمديريات وسجلات الأمان والنسخ الاحتياطي وإعدادات النظام لمسؤول النظام (React Admin)
Route::get('/roles', [AdminController::class, 'roles'])->name('api.v1.roles.index');

// المحافظات والمديريات
Route::get('/governorates', [GovernorateController::class, 'index'])->name('api.v1.governorates.index');
Route::get('/governorates/{id}', [GovernorateController::class, 'show'])->name('api.v1.governorates.show');

Route::prefix('directorates')->group(function () {
    Route::get('/', [AdminDirectorateController::class, 'directorates'])->name('api.v1.directorates.index');
    Route::post('/', [AdminDirectorateController::class, 'storeDirectorate'])->name('api.v1.directorates.store');
    Route::put('/{id}', [AdminDirectorateController::class, 'updateDirectorate'])->name('api.v1.directorates.update');
    Route::delete('/{id}', [AdminDirectorateController::class, 'destroyDirectorate'])->name('api.v1.directorates.destroy');
});

Route::get('/admin/audit-logs', [AdminSecurityController::class, 'auditLogs'])->name('api.v1.admin.audit-logs.index');

Route::prefix('security')->group(function () {
    Route::get('/blocked-ips', [AdminSecurityController::class, 'blockedIps'])->name('api.v1.security.blocked-ips');
    Route::post('/unblock-ip', [AdminSecurityController::class, 'unblockIp'])->name('api.v1.security.unblock-ip');
});

Route::prefix('backups')->group(function () {
    Route::get('/', [AdminBackupController::class, 'backups'])->name('api.v1.backups.index');
    Route::post('/', [AdminBackupController::class, 'triggerBackup'])->name('api.v1.backups.trigger');
    Route::post('/{id}/verify', [AdminBackupController::class, 'verifyBackup'])->name('api.v1.backups.verify');
    Route::get('/{id}/download', [AdminBackupController::class, 'downloadBackup'])->name('api.v1.backups.download');
});

Route::prefix('system-settings')->group(function () {
    Route::get('/', [AdminSystemSettingsController::class, 'systemSettings'])->name('api.v1.system-settings.index');
    Route::put('/', [AdminSystemSettingsController::class, 'updateSystemSettings'])->name('api.v1.system-settings.update');
    Route::post('/maintenance', [AdminSystemSettingsController::class, 'toggleMaintenance'])->name('api.v1.system-settings.maintenance');
    Route::post('/test-email', [AdminSystemSettingsController::class, 'sendTestEmail'])->name('api.v1.system-settings.test-email');
});

Route::prefix('admin')->group(function () {
    Route::get('/dashboard-stats', [AdminController::class, 'dashboardStats'])->name('api.v1.admin.dashboard-stats');
    Route::get('/export-report-pdf', [AdminController::class, 'exportReportPdf'])->name('api.v1.admin.export-report-pdf');
});
