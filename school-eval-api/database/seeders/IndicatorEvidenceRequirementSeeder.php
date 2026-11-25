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

        // جلب المتطلبات الحالية لتحديثها دون تغيير requirement_id والحفاظ على روابط covered_requirements
        $existingByKey = DB::table('indicator_evidence_requirements')
            ->where('standard_version_id', $version->version_id)
            ->orderBy('requirement_id')
            ->get()
            ->groupBy(fn ($row) => $row->indicator_id . ':' . $row->display_order);

        $rowsToInsert = [];
        $maxOrderByIndicator = [];

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

                        $title = mb_substr($item, 0, 200);
                        $description = "شاهد إثبات رسمي مطلوب للتحقق من أداء المؤشر ({$indData['code']})";
                        $key = $indicatorId . ':' . $order;
                        $matches = $existingByKey->get($key);

                        if ($matches && $matches->isNotEmpty()) {
                            $primary = $matches->first();
                            if (
                                $primary->title !== $title ||
                                $primary->description !== $description ||
                                (int) $primary->required !== 1
                            ) {
                                DB::table('indicator_evidence_requirements')
                                    ->where('requirement_id', $primary->requirement_id)
                                    ->update([
                                        'title'       => $title,
                                        'description' => $description,
                                        'required'    => 1,
                                    ]);
                            }
                            if ($matches->count() > 1) {
                                $duplicateIds = $matches->slice(1)->pluck('requirement_id')->all();
                                DB::table('indicator_evidence_requirements')
                                    ->whereIn('requirement_id', $duplicateIds)
                                    ->delete();
                            }
                        } else {
                            $rowsToInsert[] = [
                                'indicator_id'        => $indicatorId,
                                'standard_version_id' => $version->version_id,
                                'title'               => $title,
                                'description'         => $description,
                                'required'            => 1,
                                'display_order'       => $order,
                            ];
                        }

                        $order++;
                    }

                    $maxOrderByIndicator[$indicatorId] = $order - 1;
                }
            }
        }

        // إزالة أي متطلبات زائدة فقط إن تم تقليص عدد متطلبات المؤشر في المواصفة
        foreach ($maxOrderByIndicator as $indicatorId => $maxOrder) {
            DB::table('indicator_evidence_requirements')
                ->where('standard_version_id', $version->version_id)
                ->where('indicator_id', $indicatorId)
                ->where('display_order', '>', $maxOrder)
                ->delete();
        }

        // إدخال السجلات الجديدة فقط عند غيابها مع الحفاظ الكامل على معرفات السجلات القائمة
        foreach (array_chunk($rowsToInsert, 100) as $chunk) {
            DB::table('indicator_evidence_requirements')->insert($chunk);
        }
    }
}
