<?php

namespace Database\Seeders;

use App\Models\Ministry;
use Illuminate\Database\Seeder;

/**
 * Seeder: MinistrySeeder
 * 
 * الوظيفة: تهيئة بيانات الوزارة المركزية المشرفة على الاعتماد المدرسي.
 * الجداول المغذاة: ministries
 * مصدر البيانات: الهيكل التنظيمي لوزارة التربية والتعليم والبحث العلمي.
 * ترتيب التنفيذ في DatabaseSeeder: الترتيب الثالث عشر (13).
 */
class MinistrySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Ministry::updateOrCreate(
            ['ministry_name' => 'وزارة التربية والتعليم والبحث العلمي'],
            [
                'description' => 'الجهة الحكومية العليا المسؤولة عن التعليم العام وضمان الجودة والاعتماد المدرسي - الجمهورية اليمنية',
            ]
        );
    }
}
