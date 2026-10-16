<?php

namespace Database\Seeders;

use App\Models\Standard;
use App\Models\StandardVersion;
use App\Models\SubStandard;
use Illuminate\Database\Seeder;

/**
 * Seeder: SubStandardSeeder
 * 
 * الوظيفة: تهيئة المعايير الفرعية الـ 14 وتنسيبها إلى المعايير الرئيسية السبعة.
 * الجداول المغذاة: sub_standards
 * مصدر البيانات: وثائق معايير الاعتماد المدرسي وسلم التقديرات.
 * ترتيب التنفيذ في DatabaseSeeder: الترتيب الخامس (5).
 */
class SubStandardSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $version = StandardVersion::where('version_no', '2026.1')->firstOrFail();
        $standardsData = require __DIR__ . '/data/standards_data.php';

        foreach ($standardsData as $std) {
            $parentStandard = Standard::where('version_id', $version->version_id)
                ->where('code', $std['code'])
                ->firstOrFail();

            foreach ($std['sub_standards'] as $sub) {
                SubStandard::updateOrCreate(
                    [
                        'standard_id' => $parentStandard->standard_id,
                        'code'        => $sub['code'],
                    ],
                    [
                        'name'        => $sub['name'],
                        'description' => $sub['description'],
                    ]
                );
            }
        }
    }
}
