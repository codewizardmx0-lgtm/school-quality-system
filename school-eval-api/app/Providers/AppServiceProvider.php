<?php

namespace App\Providers;

use App\Http\Responses\ApiResponse;
use App\Models\ImprovementPlan;
use App\Policies\ImprovementPlanPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(ImprovementPlan::class, ImprovementPlanPolicy::class);

        // --------------------------------------------------------------------------
        // محددات معدل الطلبات لمسارات المصادقة الحساسة (Rate Limiters - الشريحة 11)
        // --------------------------------------------------------------------------

        // 1. تسجيل الدخول: 5 محاولات لكل دقيقة لكل IP
        RateLimiter::for('auth.login', function (Request $request) {
            return Limit::perMinute(5)
                ->by($request->ip())
                ->response(function (Request $request, array $headers) {
                    $retryAfter = (int) ($headers['Retry-After'] ?? 60);
                    return ApiResponse::tooManyRequests(
                        message: 'تم تجاوز الحد المسموح به من محاولات تسجيل الدخول. يرجى الانتظار والمحاولة لاحقًا.',
                        retryAfter: $retryAfter
                    );
                });
        });

        // 2. استعادة كلمة المرور: 3 محاولات كل 15 دقيقة لكل IP
        RateLimiter::for('auth.password.forgot', function (Request $request) {
            return Limit::perMinutes(15, 3)
                ->by($request->ip())
                ->response(function (Request $request, array $headers) {
                    $retryAfter = (int) ($headers['Retry-After'] ?? 900);
                    return ApiResponse::tooManyRequests(
                        message: 'تم تجاوز الحد المسموح به لطلبات استعادة كلمة المرور. يرجى الانتظار والمحاولة لاحقًا.',
                        retryAfter: $retryAfter
                    );
                });
        });

        // 3. تغيير كلمة المرور للمستخدم المسجل: 5 محاولات كل 10 دقائق لكل مستخدم مسجل
        RateLimiter::for('auth.password.change', function (Request $request) {
            $userKey = $request->user()?->user_id ?? $request->user()?->id ?? $request->ip();
            return Limit::perMinutes(10, 5)
                ->by('user:'.$userKey)
                ->response(function (Request $request, array $headers) {
                    $retryAfter = (int) ($headers['Retry-After'] ?? 600);
                    return ApiResponse::tooManyRequests(
                        message: 'تم تجاوز الحد المسموح به لمحاولات تغيير كلمة المرور. يرجى الانتظار والمحاولة لاحقًا.',
                        retryAfter: $retryAfter
                    );
                });
        });
    }
}
