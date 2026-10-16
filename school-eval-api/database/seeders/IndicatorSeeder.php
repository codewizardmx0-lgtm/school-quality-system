<?php

namespace Database\Seeders;

use App\Models\Indicator;
use App\Models\Standard;
use App\Models\StandardVersion;
use App\Models\SubStandard;
use Illuminate\Database\Seeder;

/**
 * Seeder: IndicatorSeeder
 * 
 * الوظيفة: تهيئة مؤشرات الأداء الـ 109 كاملة، بأكوادها وأسمائها ونصوصها وأوزانها النسبية الدقيقة.
 * الجداول المغذاة: indicators
 * مصدر البيانات: وثيقة معايير الاعتماد المدرسي وسلم التقديرات والاستمارة الرسمية.
 * 
 * خوارزمية توزيع الأوزان النسبية:
 *  - تطبيق طريقة «أكبر البواقي / السنتات» (Largest Remainder / Cents Method):
 *    1. تحويل وزن المعيار الفرعي (أو المعيار الرئيسي في حالتي المعيار 3 و6 اللذين لا يملكان تفريعاً في الوثائق الرسمية) إلى سنتات صحيحة (Cents = Weight * 100).
 *    2. حساب الوزن الأساسي بالسنتات لكل مؤشر: Base = intdiv(Cents, Count).
 *    3. حساب باقي السنتات: Remainder = Cents % Count.
 *    4. يحصل أول (Remainder) مؤشرات على (Base + 1) سنت، وباقي المؤشرات على (Base) سنت.
 *    5. إعادة التحويل إلى قيمة عشرية مقسومة على 100 بدقة منزلتين (decimal 5,2).
 *    
 *  - الأثر الحسابي:
 *    - مجموع أوزان مؤشرات كل معيار فرعي = وزن المعيار الفرعي تماماً وبلا أي كسر فائض أو ناقص.
 *    - مجموع أوزان مؤشرات كل معيار رئيسي = وزن المعيار الرئيسي تماماً.
 *    - المجموع الكلي لأوزان المؤشرات الـ 109 = 100.00% تماماً.
 * 
 * ترتيب التنفيذ في DatabaseSeeder: الترتيب السادس (6).
 */
class IndicatorSeeder extends Seeder
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
                $subStandard = SubStandard::where('standard_id', $parentStandard->standard_id)
                    ->where('code', $sub['code'])
                    ->firstOrFail();

                $indicators = $sub['indicators'];
                $indCount = count($indicators);

                if ($indCount === 0) {
                    continue;
                }

                // تطبيق طريقة السنتات لضمان الجمع الدقيق بدون أخطاء تقريب
                $targetWeight = (float) $sub['weight'];
                $totalCents = (int) round($targetWeight * 100);
                $baseCents = intdiv($totalCents, $indCount);
                $remainder = $totalCents % $indCount;

                foreach ($indicators as $index => $ind) {
                    $indicatorCents = $baseCents + ($index < $remainder ? 1 : 0);
                    $calculatedWeight = round($indicatorCents / 100, 2);

                    Indicator::updateOrCreate(
                        [
                            'sub_standard_id' => $subStandard->sub_standard_id,
                            'code'            => $ind['code'],
                        ],
                        [
                            'name'        => $ind['name'],
                            'description' => $ind['text'],
                            'weight'      => $calculatedWeight,
                            'status'      => 'Active',
                        ]
                    );
                }
            }
        }
    }
}
