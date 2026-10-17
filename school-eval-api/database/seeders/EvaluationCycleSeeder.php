<?php

namespace Database\Seeders;

use App\Models\EvaluationCycle;
use App\Models\StandardVersion;
use Illuminate\Database\Seeder;

/**
 * Seeder: EvaluationCycleSeeder
 * 
 * الوظيفة: تهيئة دورة تقييمية تجريبية نشطة للعام الدراسي 2025/2026م مرتبطة بالإصدار النشط.
 * الجداول المغذاة: evaluation_cycles
 * مصدر البيانات: متطلبات إدارة دورات التقييم (ERD-03).
 * ترتيب التنفيذ في DatabaseSeeder: الترتيب السابع عشر (17).
 */
class EvaluationCycleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $version = StandardVersion::where('version_no', '2026.1')->firstOrFail();

        EvaluationCycle::updateOrCreate(
            [
                'academic_year' => '2025/2026',
                'version_id'    => $version->version_id,
            ],
            [
                'start_date' => '2026-01-01',
                'end_date'   => '2026-06-30',
                'status'     => 'Active',
            ]
        );
    }
}
