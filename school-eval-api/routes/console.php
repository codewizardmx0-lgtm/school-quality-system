<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Console & Maintenance Schedules (BE-GAP-05 / FR-GEN-02)
|--------------------------------------------------------------------------
| 1. تنظيف رموز الوصول الشخصية المنتهية (Sanctum Tokens Pruning) يومياً.
| 2. تنظيف سجلات الجلسات الخاملة والمنتهية التي تجاوزت مدة الاحتفاظ (30 يوماً).
*/
Schedule::command('sanctum:prune-expired --hours=24')
    ->dailyAt('02:00')
    ->description('Prune expired Laravel Sanctum personal access tokens');

Schedule::call(function () {
    $threshold = now()->subDays(30);
    DB::table('sessions')
        ->where('active', false)
        ->where('ended_at', '<', $threshold)
        ->delete();
})->dailyAt('02:30')->description('Prune inactive user sessions older than 30 days');
