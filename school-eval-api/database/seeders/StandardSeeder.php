<?php

namespace Database\Seeders;

use App\Models\Standard;
use App\Models\StandardVersion;
use Illuminate\Database\Seeder;

/**
 * Seeder: StandardSeeder
 * 
 * الوظيفة: تهيئة المعايير السبعة الرئيسية للاعتماد المدرسي وضمان الجودة وأوزانها النسبية الرسمية.
 * الجداول المغذاة: standards
 * مصدر البيانات: وثيقة معايير الاعتماد المدرسي وسلم التقديرات (جدول الخلاصة صفحة 23).
 * ترتيب التنفيذ في DatabaseSeeder: الترتيب الرابع (4).
 */
class StandardSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $version = StandardVersion::where('version_no', '2026.1')->firstOrFail();
        $standardsData = require __DIR__ . '/data/standards_data.php';

        foreach ($standardsData as $std) {
            Standard::updateOrCreate(
                [
                    'version_id' => $version->version_id,
                    'code'       => $std['code'],
                ],
                [
                    'name'        => $std['name'],
                    'description' => $std['description'],
                    'weight'      => $std['weight'],
                ]
            );
        }
    }
}
