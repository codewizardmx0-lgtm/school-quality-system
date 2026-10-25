<?php

namespace Database\Seeders;

use App\Models\Indicator;
use App\Models\IndicatorScoreDescriptor;
use App\Models\ScoreLevel;
use App\Models\StandardVersion;
use Illuminate\Database\Seeder;

/**
 * Seeder: IndicatorScoreDescriptorSeeder
 * 
 * الوظيفة: تهيئة واصفات الأداء التفصيلية الـ 436 لسلم التقدير الرباعي (4 مستويات × 109 مؤشرات).
 * الجداول المغذاة: indicator_score_descriptors
 * مصدر البيانات: وثيقة سلم التقديرات وأداة التقييم المدرسي الأصلية (جداول مستويات التقدير 0، 1، 2، 3).
 * ترتيب التنفيذ في DatabaseSeeder: الترتيب السابع (7).
 */
class IndicatorScoreDescriptorSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $version = StandardVersion::where('version_no', '2026.1')->firstOrFail();
        $standardsData = require __DIR__ . '/data/standards_data.php';

        // تحميل مستويات التقدير مفهرسة بقيمة الدرجة (0, 1, 2, 3)
        $scoreLevels = ScoreLevel::where('standard_version_id', $version->version_id)
            ->get()
            ->keyBy('score_value');

        foreach ($standardsData as $std) {
            foreach ($std['sub_standards'] as $sub) {
                foreach ($sub['indicators'] as $indData) {
                    $indicator = Indicator::where('code', $indData['code'])->firstOrFail();

                    foreach ($indData['descriptors'] as $scoreVal => $descriptorText) {
                        $level = $scoreLevels[$scoreVal] ?? null;
                        if (!$level) {
                            continue;
                        }

                        IndicatorScoreDescriptor::updateOrCreate(
                            [
                                'indicator_id'        => $indicator->indicator_id,
                                'score_level_id'      => $level->score_level_id,
                                'standard_version_id' => $version->version_id,
                            ],
                            [
                                'label'         => $level->label,
                                'description'   => $descriptorText,
                                'display_order' => $scoreVal + 1,
                                'is_active'     => true,
                            ]
                        );
                    }
                }
            }
        }
    }
}
