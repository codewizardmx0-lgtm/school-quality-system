<?php

namespace Database\Seeders;

use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\StandardVersion;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeder: IndicatorEvidenceRequirementSeeder
 * 
 * الوظيفة: تهيئة متطلبات الشواهد والأدلة الرسمية لكل مؤشر من مؤشرات الاعتماد الـ 109.
 * الجداول المغذاة: indicator_evidence_requirements
 * مصدر البيانات: عمود «الأدلة والشواهد» في استمارة وسلم التقديرات المستخرجة بدقة.
 * معالجة العطل السابق: تخزين كل شاهد كعنصر مستقل في مصفوفة بيانات معايير الاعتماد دون تقطيع بايتات غير آمن.
 * ترتيب التنفيذ في DatabaseSeeder: الترتيب الثامن (8).
 */
class IndicatorEvidenceRequirementSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $version = StandardVersion::where('version_no', '2026.1')->firstOrFail();
        $standardsData = require __DIR__ . '/data/standards_data.php';

        // خريطة كود المؤشر إلى المعرف indicator_id
        $indicatorMap = Indicator::pluck('indicator_id', 'code');

        $rowsToInsert = [];

        foreach ($standardsData as $std) {
            foreach ($std['sub_standards'] as $sub) {
                foreach ($sub['indicators'] as $indData) {
                    $indicatorId = $indicatorMap[$indData['code']] ?? null;
                    if (!$indicatorId) {
                        continue;
                    }

                    $evidenceItems = is_array($indData['evidence'])
                        ? $indData['evidence']
                        : preg_split('/[،,\n\r•\-]+/u', $indData['evidence']);

                    $order = 1;
                    foreach ($evidenceItems as $item) {
                        $item = trim($item);
                        if ($item === '') {
                            continue;
                        }

                        // التحقق البرمجي الصارم من صحة الترميز وطول النص
                        if (!mb_check_encoding($item, 'UTF-8') || mb_strlen($item) < 3) {
                            throw new \RuntimeException("عنوان الشاهد غير صالح أو مبتور للمؤشر {$indData['code']}: {$item}");
                        }

                        $rowsToInsert[] = [
                            'indicator_id'        => $indicatorId,
                            'standard_version_id' => $version->version_id,
                            'title'               => mb_substr($item, 0, 200),
                            'description'         => "شاهد إثبات رسمي مطلوب للتحقق من أداء المؤشر ({$indData['code']})",
                            'required'            => 1,
                            'display_order'       => $order++,
                        ];
                    }
                }
            }
        }

        // حذف السجلات السابقة التالفة لهذا الإصدار لضمان النظافة التامة وتجنب أي بقايا
        IndicatorEvidenceRequirement::where('standard_version_id', $version->version_id)->delete();

        // إدخال دفعات (Batch insert) لتحقيق سرعة فائقة وضمان قابلية التكرار
        foreach (array_chunk($rowsToInsert, 100) as $chunk) {
            DB::table('indicator_evidence_requirements')->insert($chunk);
        }
    }
}
