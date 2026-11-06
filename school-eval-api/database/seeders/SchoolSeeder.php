<?php

namespace Database\Seeders;

use App\Models\School;
use Illuminate\Database\Seeder;

/**
 * Seeder: SchoolSeeder
 * 
 * الوظيفة: تهيئة المدارس التجريبية في النظام لتطبيق دورات التقييم والاعتماد المدرسي (10 مدارس موزعة على المديريات والمحافظات المعتمدة).
 */
class SchoolSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $schools = [
            // 1. مدرسة بلقيس الثانوية للبنات (التحرير - حكومية - أمانة العاصمة)
            [
                'identification_data' => 'SCH-SANAA-2026-001',
                'school_name'          => 'مدرسة بلقيس الثانوية للبنات',
                'educational_stage'    => 'ثانوي (10-12)',
                'governorate_id'       => 1,
                'directorate_id'       => 1,
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
                'governorate_id'       => 3,
                'directorate_id'       => 11,
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
                'governorate_id'       => 1,
                'directorate_id'       => 2,
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
                'governorate_id'       => 1,
                'directorate_id'       => 3,
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
                'governorate_id'       => 1,
                'directorate_id'       => 4,
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
                'governorate_id'       => 1,
                'directorate_id'       => 5,
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
                'governorate_id'       => 1,
                'directorate_id'       => 6,
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
                'governorate_id'       => 1,
                'directorate_id'       => 7,
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
                'governorate_id'       => 1,
                'directorate_id'       => 8,
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
                'governorate_id'       => 1,
                'directorate_id'       => 1,
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
                    'governorate_id'       => $schoolData['governorate_id'],
                    'directorate_id'       => $schoolData['directorate_id'],
                    'educational_district' => $schoolData['educational_district'],
                    'governorate'          => $schoolData['governorate'],
                    'school_type'          => $schoolData['school_type'],
                    'status'               => $schoolData['status'],
                ]
            );
        }
    }
}
