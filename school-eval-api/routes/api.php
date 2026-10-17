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
    });
});
