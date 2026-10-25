<?php

namespace Database\Seeders;

use App\Models\School;
use Illuminate\Database\Seeder;

/**
 * Seeder: SchoolSeeder
 * 
 * الوظيفة: تهيئة المدارس التجريبية في النظام لتطبيق دورات التقييم والاعتماد المدرسي.
 * الجداول المغذاة: schools
 * التحديث:
 *  - تم الإبقاء على المدرسة الأولى (مدرسة بلقيس الثانوية للبنات - صنعاء).
 *  - تمت إضافة مدرسة ثانية (مدرسة الفاروق الأساسية للبنين - تعز) بمرحلة ومديرية ومحافظة ورقم تعريفي مختلف،
 *    بهدف اختبار التقييمات المتعددة ودعم سيناريوهات التقييم المدرسي لمراحل مختلفة.
 * ترتيب التنفيذ في DatabaseSeeder: الترتيب الرابع عشر (14).
 */
class SchoolSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $schools = [
            // 1. المدرسة الأولى المعتمدة: مرحلة ثانوية - أمانة العاصمة
            [
                'identification_data' => 'SCH-SANAA-2026-001',
                'school_name'          => 'مدرسة بلقيس الثانوية للبنات',
                'educational_stage'    => 'ثانوي',
                'educational_district' => 'منطقة التحرير التعليمية',
                'governorate'          => 'أمانة العاصمة - صنعاء',
                'status'               => 'Active',
            ],
            // 2. المدرسة الثانية المضافة: مرحلة أساسية - محافظة تعز
            // تم اختيار اسم وبيانات مختلفة كلياً لاختبار التقييم في بيئات ومراحل تعليمية متنوعة
            [
                'identification_data' => 'SCH-TAIZ-2026-002',
                'school_name'          => 'مدرسة الفاروق الأساسية للبنين',
                'educational_stage'    => 'أساسي',
                'educational_district' => 'مديرية المظفر',
                'governorate'          => 'محافظة تعز',
                'status'               => 'Active',
            ],
        ];

        foreach ($schools as $schoolData) {
            School::updateOrCreate(
                ['identification_data' => $schoolData['identification_data']],
                [
                    'school_name'          => $schoolData['school_name'],
                    'educational_stage'    => $schoolData['educational_stage'],
                    'educational_district' => $schoolData['educational_district'],
                    'governorate'          => $schoolData['governorate'],
                    'status'               => $schoolData['status'],
                ]
            );
        }
    }
}
