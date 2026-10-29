<?php

namespace Database\Seeders;

use App\Models\School;
use App\Models\SchoolEnrollmentMetric;
use App\Models\SchoolFacility;
use App\Models\SchoolStaffMetric;
use Illuminate\Database\Seeder;

/**
 * Seeder: SchoolMetricsAndFacilitiesSeeder (الشريحة 6)
 *
 * الوظيفة: تهيئة إحصاءات الكادر والطلاب والمرافق النموذجية لمدارس الاختبار (بلقيس والفاروق)
 * لتغذية مسار indicators-context وبطاقات الدعم الاسترشادي.
 * استخدام updateOrCreate لضمان تكرار آمن (Idempotent).
 */
class SchoolMetricsAndFacilitiesSeeder extends Seeder
{
    /**
     * تشغيل البذور.
     */
    public function run(): void
    {
        $belqees = School::where('identification_data', 'SCH-SANAA-2026-001')->first();
        if ($belqees) {
            $this->seedBelqeesSchool($belqees);
        }

        $farouq = School::where('identification_data', 'SCH-TAIZ-2026-002')->first();
        if ($farouq) {
            $this->seedFarouqSchool($farouq);
        }
    }

    /**
     * تهيئة مدرسة بلقيس الثانوية للبنات.
     */
    protected function seedBelqeesSchool(School $school): void
    {
        // 1. تحديث الملف التعريفي الموسع
        $school->update([
            'address'           => 'شارع علي عبدالمغني، جوار حديقة التحرير',
            'phone'             => '01274500',
            'email'             => 'belqees.secondary@edu.ye',
            'educational_admin' => 'منطقة التحرير التعليمية - أمانة العاصمة',
            'building_type'     => 'حكومي',
            'shift_type'        => 'صباحي',
            'total_area'        => 4500.00,
            'built_up_area'     => 2800.00,
        ]);

        $year = '2025/2026';

        // 2. إحصاءات الكادر
        SchoolStaffMetric::updateOrCreate(
            ['school_id' => $school->school_id, 'academic_year' => $year],
            [
                'total_teachers'               => 30,
                'qualified_teachers_count'     => 24, // 80% (Level 3)
                'permanent_teachers_count'     => 22,
                'matched_specialization_count' => 26, // 86.7% (Level 3)
                'total_admin_staff'            => 6,
                'total_service_staff'          => 4,
            ]
        );

        // 3. إحصاءات الطلاب والفصول
        $grades = [
            ['education_level' => 'ثانوي', 'grade_level' => 'الأول ثانوي', 'classes_count' => 4, 'male' => 0, 'female' => 120, 'special' => 2, 'talented' => 6],
            ['education_level' => 'ثانوي', 'grade_level' => 'الثاني ثانوي علمي', 'classes_count' => 3, 'male' => 0, 'female' => 90, 'special' => 1, 'talented' => 7],
            ['education_level' => 'ثانوي', 'grade_level' => 'الثاني ثانوي أدبي', 'classes_count' => 2, 'male' => 0, 'female' => 60, 'special' => 0, 'talented' => 3],
            ['education_level' => 'ثانوي', 'grade_level' => 'الثالث ثانوي علمي', 'classes_count' => 3, 'male' => 0, 'female' => 90, 'special' => 1, 'talented' => 8],
            ['education_level' => 'ثانوي', 'grade_level' => 'الثالث ثانوي أدبي', 'classes_count' => 2, 'male' => 0, 'female' => 60, 'special' => 0, 'talented' => 2],
        ];

        foreach ($grades as $g) {
            SchoolEnrollmentMetric::updateOrCreate(
                [
                    'school_id'       => $school->school_id,
                    'academic_year'   => $year,
                    'education_level' => $g['education_level'],
                    'grade_level'     => $g['grade_level'],
                ],
                [
                    'classes_count'         => $g['classes_count'],
                    'male_students_count'    => $g['male'],
                    'female_students_count'  => $g['female'],
                    'special_needs_count'    => $g['special'],
                    'talented_count'         => $g['talented'],
                ]
            );
        }

        // 4. المرافق والتجهيزات
        $facilities = [
            ['facility_type' => 'classroom', 'name' => 'فصول دراسية مهيأة ومضاءة', 'count' => 14, 'usable' => true, 'details' => null],
            ['facility_type' => 'science_lab', 'name' => 'معامل علوم (فيزياء وكيمياء وأحياء)', 'count' => 2, 'usable' => true, 'details' => ['safety_goggles' => true, 'ventilation' => true]],
            ['facility_type' => 'computer_lab', 'name' => 'معمل حاسوب مركزي', 'count' => 1, 'usable' => true, 'details' => ['computers_count' => 30, 'internet' => true]],
            ['facility_type' => 'library', 'name' => 'المكتبة المدرسية ونظام الفهرسة', 'count' => 1, 'usable' => true, 'details' => ['books_count' => 1500]],
            ['facility_type' => 'learning_resources', 'name' => 'غرفة مصادر التعلم لذوي الاحتياجات', 'count' => 1, 'usable' => true, 'details' => ['audio_tools' => true]],
            ['facility_type' => 'restroom', 'name' => 'مرافق صحية ونظيفة للطالبات', 'count' => 12, 'usable' => true, 'details' => ['running_water' => true, 'soap' => true]],
            ['facility_type' => 'clinic', 'name' => 'العيادة الصحية والإسعافات الأولية', 'count' => 1, 'usable' => true, 'details' => ['first_aid_kit' => true]],
            ['facility_type' => 'playground', 'name' => 'الساحة المدرسية والصالة الرياضية', 'count' => 1, 'usable' => true, 'details' => null],
            ['facility_type' => 'canteen', 'name' => 'المقصف المدرسي الخاضع للاشتراطات', 'count' => 1, 'usable' => true, 'details' => null],
            ['facility_type' => 'safety_equipment', 'name' => 'منظومة طفايات الحريق والإخلاء', 'count' => 8, 'usable' => true, 'details' => ['extinguishers' => 8, 'exit_signs' => 4]],
        ];

        foreach ($facilities as $f) {
            SchoolFacility::updateOrCreate(
                [
                    'school_id'     => $school->school_id,
                    'facility_type' => $f['facility_type'],
                    'name'          => $f['name'],
                ],
                [
                    'count'     => $f['count'],
                    'is_usable' => $f['usable'],
                    'details'   => $f['details'],
                ]
            );
        }
    }

    /**
     * تهيئة مدرسة الفاروق الأساسية للبنين.
     */
    protected function seedFarouqSchool(School $school): void
    {
        $school->update([
            'address'           => 'شارع جمال، مديرية المظفر',
            'phone'             => '04221144',
            'email'             => 'farouq.school@edu.ye',
            'educational_admin' => 'مديرية المظفر التعليمية - تعز',
            'building_type'     => 'حكومي',
            'shift_type'        => 'صباحي',
            'total_area'        => 3800.00,
            'built_up_area'     => 2200.00,
        ]);

        $year = '2025/2026';

        SchoolStaffMetric::updateOrCreate(
            ['school_id' => $school->school_id, 'academic_year' => $year],
            [
                'total_teachers'               => 20,
                'qualified_teachers_count'     => 14, // 70% (Level 2)
                'permanent_teachers_count'     => 15,
                'matched_specialization_count' => 15, // 75% (Level 2)
                'total_admin_staff'            => 4,
                'total_service_staff'          => 2,
            ]
        );

        $grades = [
            ['education_level' => 'أساسي', 'grade_level' => 'الصف السابع', 'classes_count' => 3, 'male' => 105, 'female' => 0, 'special' => 1, 'talented' => 4],
            ['education_level' => 'أساسي', 'grade_level' => 'الصف الثامن', 'classes_count' => 3, 'male' => 105, 'female' => 0, 'special' => 2, 'talented' => 3],
            ['education_level' => 'أساسي', 'grade_level' => 'الصف التاسع', 'classes_count' => 3, 'male' => 105, 'female' => 0, 'special' => 1, 'talented' => 5],
        ];

        foreach ($grades as $g) {
            SchoolEnrollmentMetric::updateOrCreate(
                [
                    'school_id'       => $school->school_id,
                    'academic_year'   => $year,
                    'education_level' => $g['education_level'],
                    'grade_level'     => $g['grade_level'],
                ],
                [
                    'classes_count'         => $g['classes_count'],
                    'male_students_count'    => $g['male'],
                    'female_students_count'  => $g['female'],
                    'special_needs_count'    => $g['special'],
                    'talented_count'         => $g['talented'],
                ]
            );
        }

        $facilities = [
            ['facility_type' => 'classroom', 'name' => 'فصول التعليم الأساسي', 'count' => 9, 'usable' => true, 'details' => null],
            ['facility_type' => 'science_lab', 'name' => 'معمل العلوم العام', 'count' => 1, 'usable' => true, 'details' => null],
            ['facility_type' => 'computer_lab', 'name' => 'معمل الحاسوب', 'count' => 1, 'usable' => true, 'details' => ['computers_count' => 18]],
            ['facility_type' => 'library', 'name' => 'مكتبة المدرسة', 'count' => 1, 'usable' => true, 'details' => null],
            ['facility_type' => 'restroom', 'name' => 'دورات مياه الطلاب', 'count' => 6, 'usable' => true, 'details' => ['running_water' => true]],
            ['facility_type' => 'safety_equipment', 'name' => 'طفايات حريق', 'count' => 4, 'usable' => true, 'details' => null],
        ];

        foreach ($facilities as $f) {
            SchoolFacility::updateOrCreate(
                [
                    'school_id'     => $school->school_id,
                    'facility_type' => $f['facility_type'],
                    'name'          => $f['name'],
                ],
                [
                    'count'     => $f['count'],
                    'is_usable' => $f['usable'],
                    'details'   => $f['details'],
                ]
            );
        }
    }
}
