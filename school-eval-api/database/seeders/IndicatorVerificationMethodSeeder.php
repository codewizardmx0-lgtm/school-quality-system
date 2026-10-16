<?php

namespace Database\Seeders;

use App\Models\Indicator;
use App\Models\IndicatorVerificationMethod;
use App\Models\VerificationTool;
use Illuminate\Database\Seeder;

/**
 * Seeder: IndicatorVerificationMethodSeeder
 * 
 * الوظيفة: ربط المؤشرات الـ 109 بأدوات التحقق وأساليب التقييم المعتمدة الخاصة بكل مؤشر.
 * الجداول المغذاة: indicator_verification_methods
 * مصدر البيانات: عمود «أسلوب التقييم / أداة التحقق من الأدلة» في استمارة وسلم التقديرات.
 * ترتيب التنفيذ في DatabaseSeeder: الترتيب التاسع (9).
 */
class IndicatorVerificationMethodSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $standardsData = require __DIR__ . '/data/standards_data.php';
        $tools = VerificationTool::all()->keyBy('name');

        foreach ($standardsData as $std) {
            foreach ($std['sub_standards'] as $sub) {
                foreach ($sub['indicators'] as $indData) {
                    $indicator = Indicator::where('code', $indData['code'])->firstOrFail();

                    foreach ($indData['tools'] as $toolName) {
                        $toolNameClean = trim($toolName);
                        // مطابقة اسم الأداة مع جدول الأدوات
                        $matchedTool = null;
                        foreach ($tools as $name => $tool) {
                            if (mb_strpos($name, $toolNameClean) !== false || mb_strpos($toolNameClean, $name) !== false) {
                                $matchedTool = $tool;
                                break;
                            }
                        }

                        if (!$matchedTool) {
                            continue;
                        }

                        IndicatorVerificationMethod::firstOrCreate(
                            [
                                'indicator_id' => $indicator->indicator_id,
                                'tool_id'      => $matchedTool->tool_id,
                            ],
                            [
                                'required'       => true,
                                'usage_guidance' => "أداة تقييم معتمدة للتحقق من مؤشر ({$indData['code']})",
                                'created_at'     => now(),
                            ]
                        );
                    }
                }
            }
        }
    }
}
