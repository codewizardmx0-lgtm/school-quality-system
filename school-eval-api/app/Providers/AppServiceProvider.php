<?php

namespace App\Providers;

use App\Models\Evidence;
use App\Models\ImprovementPlan;
use App\Policies\EvidencePolicy;
use App\Policies\ImprovementPlanPolicy;
use Illuminate\Support\Facades\Gate;
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
        Gate::policy(Evidence::class, EvidencePolicy::class);
        Gate::policy(ImprovementPlan::class, ImprovementPlanPolicy::class);
    }
}
