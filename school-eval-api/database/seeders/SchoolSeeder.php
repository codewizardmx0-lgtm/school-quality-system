<?php

namespace Database\Seeders;

use App\Models\School;
use Illuminate\Database\Seeder;

/**
 * Seeder: SchoolSeeder
 * 
 * الوظيفة: تهيئة المدارس التجريبية في النظام لتطبيق دورات التقييم والاعتماد المدرسي (10 مدارس موزعة على المديريات المعتمدة).
 * الجداول المغذاة: schools
 * التوزيع:
 *  1. بلقيس: التحرير، حكومية، أمانة العاصمة (ثانوي).
 *  2. الفاروق: المظفر، حكومية، محافظة تعز (أساسي).
 *  3. أروى: الصافية، حكومية، أمانة العاصمة (أساسي وثانوي).
 *  4. بغداد: الوحدة، حكومية، أمانة العاصمة (أساسي وثانوي).
 *  5. الرشيد: معين، أهلية، أمانة العاصمة (أساسي وثانوي).
 *  6. الأقصى: السبعين، أهلية، أمانة العاصمة (أساسي وثانوي).
 *  7. الشهيد الكبسي: الثورة، حكومية، أمانة العاصمة (ثانوي).
 *  8. نشوان الحميري: شعوب، حكومية، أمانة العاصمة (أساسي).
 *  9. آزال: آزال، حكومية، أمانة العاصمة (أساسي وثانوي).
 *  10. رواد اليمن: التحرير، أهلية، أمانة العاصمة (أساسي وثانوي).
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
            // 1. مدرسة بلقيس الثانوية للبنات (التحرير - حكومية)
            [
                'identification_data' => 'SCH-SANAA-2026-001',
                'school_name'          => 'مدرسة بلقيس الثانوية للبنات',
                'educational_stage'    => 'ثانوي (10-12)',
                'educational_district' => 'مديرية التحرير',
                'governorate'          => 'أمانة العاصمة',
                'school_type'          => 'government',
                'status'               => 'Active',
            ],
            // 2. مدرسة الفاروق الأساسية للبنين (المظفر - حكومية - تعز)
            [
                'identification_data' => 'SCH-TAIZ-2026-002',
                'school_name'          => 'مدرسة الفاروق الأساسية للبنين',
                'educational_stage'    => 'أساسي (1-9)',
                'educational_district' => 'مديرية المظفر',
                'governorate'          => 'محافظة تعز',
                'school_type'          => 'government',
                'status'               => 'Active',
            ],
            // 3. مدرسة أروى النموذجية للبنات (الصافية - حكومية)
            [
                'identification_data' => 'SCH-SANAA-2026-003',
                'school_name'          => 'مدرسة أروى النموذجية للبنات',
                'educational_stage'    => 'أساسي وثانوي (1-12)',
                'educational_district' => 'مديرية الصافية',
                'governorate'          => 'أمانة العاصمة',
                'school_type'          => 'government',
                'status'               => 'Active',
            ],
            // 4. مدرسة بغداد الأساسية الثانوية (الوحدة - حكومية)
            [
                'identification_data' => 'SCH-SANAA-2026-004',
                'school_name'          => 'مدرسة بغداد الأساسية الثانوية',
                'educational_stage'    => 'أساسي وثانوي (1-12)',
                'educational_district' => 'مديرية الوحدة',
                'governorate'          => 'أمانة العاصمة',
                'school_type'          => 'government',
                'status'               => 'Active',
            ],
            // 5. مدارس الرشيد الحديثة الأهلية (معين - أهلية)
            [
                'identification_data' => 'SCH-SANAA-2026-005',
                'school_name'          => 'مدارس الرشيد الحديثة الأهلية',
                'educational_stage'    => 'أساسي وثانوي (1-12)',
                'educational_district' => 'مديرية معين',
                'governorate'          => 'أمانة العاصمة',
                'school_type'          => 'private',
                'status'               => 'Active',
            ],
            // 6. مدارس الأقصى الأهلية النموذجية (السبعين - أهلية)
            [
                'identification_data' => 'SCH-SANAA-2026-006',
                'school_name'          => 'مدارس الأقصى الأهلية النموذجية',
                'educational_stage'    => 'أساسي وثانوي (1-12)',
                'educational_district' => 'مديرية السبعين',
                'governorate'          => 'أمانة العاصمة',
                'school_type'          => 'private',
                'status'               => 'Active',
            ],
            // 7. مدرسة الشهيد الكبسي الثانوية (الثورة - حكومية)
            [
                'identification_data' => 'SCH-SANAA-2026-007',
                'school_name'          => 'مدرسة الشهيد الكبسي الثانوية',
                'educational_stage'    => 'ثانوي (10-12)',
                'educational_district' => 'مديرية الثورة',
                'governorate'          => 'أمانة العاصمة',
                'school_type'          => 'government',
                'status'               => 'Active',
            ],
            // 8. مدرسة نشوان الحميري الأساسية (شعوب - حكومية)
            [
                'identification_data' => 'SCH-SANAA-2026-008',
                'school_name'          => 'مدرسة نشوان الحميري الأساسية',
                'educational_stage'    => 'أساسي (1-9)',
                'educational_district' => 'مديرية شعوب',
                'governorate'          => 'أمانة العاصمة',
                'school_type'          => 'government',
                'status'               => 'Active',
            ],
            // 9. مدرسة آزال النموذجية (آزال - حكومية)
            [
                'identification_data' => 'SCH-SANAA-2026-009',
                'school_name'          => 'مدرسة آزال النموذجية',
                'educational_stage'    => 'أساسي وثانوي (1-12)',
                'educational_district' => 'مديرية آزال',
                'governorate'          => 'أمانة العاصمة',
                'school_type'          => 'government',
                'status'               => 'Active',
            ],
            // 10. مدارس رواد اليمن الأهلية (التحرير - أهلية)
            [
                'identification_data' => 'SCH-SANAA-2026-010',
                'school_name'          => 'مدارس رواد اليمن الأهلية',
                'educational_stage'    => 'أساسي وثانوي (1-12)',
                'educational_district' => 'مديرية التحرير',
                'governorate'          => 'أمانة العاصمة',
                'school_type'          => 'private',
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
                    'school_type'          => $schoolData['school_type'],
                    'status'               => $schoolData['status'],
                ]
            );
        }
    }
}
