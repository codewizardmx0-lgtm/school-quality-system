<?php

namespace App\Services;

use App\Models\Evaluation;
use App\Models\School;

/**
 * خدمة حساب السياق الاسترشادي وإحصاءات المدرسة للمؤشرات (الشريحة 6).
 *
 * المسؤوليات:
 * 1. استخراج وتجميع إحصاءات الكادر، الطلاب، والمرافق للمدرسة عن العام الدراسي.
 * 2. حساب المؤشرات الكمية (الكفاية، تطابق التخصص، الكثافة الصفية، ونسب المعامل والمرافق).
 * 3. حماية حتمية من القسمة على صفر (Zero-Division Protection) بإرجاع null ورسالة واضحة.
 * 4. اقتراح مستوى التقدير الاسترشادي (0-3) كشارة (Badge) بجانب المؤشر دون تعديل الدرجة آلياً.
 * 5. دعم وضع اللقطة المجمدة (Snapshot) بعد تقديم التقييم (Completed) لحمايته من أي أثر رجعي (BR-SCH-03).
 */
class SchoolMetricsService
{
    /**
     * استخراج ملخص بيانات وسياق المدرسة لعام دراسي محدد.
     *
     * @param School $school
     * @param string $academicYear
     * @return array
     */
    public function getSchoolContext(School $school, string $academicYear): array
    {
        $staff = $school->staffMetrics()->where('academic_year', $academicYear)->first();
        $enrollmentRows = $school->enrollmentMetrics()->where('academic_year', $academicYear)->get();
        $facilities = $school->facilities()->get();

        // تجميع الطلاب والفصول
        $totalMale = (int) $enrollmentRows->sum('male_students_count');
        $totalFemale = (int) $enrollmentRows->sum('female_students_count');
        $totalStudents = $totalMale + $totalFemale;
        $totalClasses = (int) $enrollmentRows->sum('classes_count');
        $totalSpecialNeeds = (int) $enrollmentRows->sum('special_needs_count');
        $totalTalented = (int) $enrollmentRows->sum('talented_count');

        // تجميع المرافق التشغيلية الصالحة
        $classroomsCount = (int) $facilities->where('facility_type', 'classroom')->where('is_usable', true)->sum('count');
        // إذا لم تسجل فصول كـ facilities صريحة، نعتمد عدد الشعب كحد أدنى للفصول
        $effectiveClassrooms = $classroomsCount > 0 ? $classroomsCount : $totalClasses;

        $scienceLabsCount = (int) $facilities->where('facility_type', 'science_lab')->where('is_usable', true)->sum('count');
        $computerLabs = $facilities->where('facility_type', 'computer_lab')->where('is_usable', true);
        $computerLabsCount = (int) $computerLabs->sum('count');

        // حساب أجهزة الحاسوب الصالحة من حقل التفاصيل details أو الافتراضي
        $computersCount = 0;
        foreach ($computerLabs as $lab) {
            $details = $lab->details;
            if (is_array($details) && isset($details['computers_count'])) {
                $computersCount += (int) $details['computers_count'];
            } elseif (is_array($details) && isset($details['working_devices'])) {
                $computersCount += (int) $details['working_devices'];
            } else {
                $computersCount += (int) ($lab->count * 15); // تقدير افتراضي 15 جهاز للمعمل إن لم يحدد
            }
        }

        $restroomsCount = (int) $facilities->where('facility_type', 'restroom')->where('is_usable', true)->sum('count');
        $hasLibrary = $facilities->where('facility_type', 'library')->where('is_usable', true)->isNotEmpty();
        $hasLearningResources = $facilities->where('facility_type', 'learning_resources')->where('is_usable', true)->isNotEmpty();
        $hasSafetyEquipment = $facilities->where('facility_type', 'safety_equipment')->where('is_usable', true)->isNotEmpty();

        return [
            'school_id' => $school->school_id,
            'school_name' => $school->school_name,
            'educational_stage' => $school->educational_stage,
            'governorate' => $school->governorate,
            'educational_district' => $school->educational_district,
            'educational_admin' => $school->educational_admin,
            'address' => $school->address,
            'phone' => $school->phone,
            'email' => $school->email,
            'building_type' => $school->building_type,
            'shift_type' => $school->shift_type,
            'total_area' => $school->total_area ? (float) $school->total_area : null,
            'built_up_area' => $school->built_up_area ? (float) $school->built_up_area : null,
            'academic_year' => $academicYear,
            'staff' => [
                'total_teachers' => $staff ? (int) $staff->total_teachers : 0,
                'qualified_teachers_count' => $staff ? (int) $staff->qualified_teachers_count : 0,
                'permanent_teachers_count' => $staff ? (int) $staff->permanent_teachers_count : 0,
                'matched_specialization_count' => $staff ? (int) $staff->matched_specialization_count : 0,
                'total_admin_staff' => $staff ? (int) $staff->total_admin_staff : 0,
                'total_service_staff' => $staff ? (int) $staff->total_service_staff : 0,
            ],
            'enrollment' => [
                'total_students' => $totalStudents,
                'male_students_count' => $totalMale,
                'female_students_count' => $totalFemale,
                'total_classes' => $totalClasses,
                'special_needs_count' => $totalSpecialNeeds,
                'talented_count' => $totalTalented,
            ],
            'facilities' => [
                'classrooms_count' => $effectiveClassrooms,
                'science_labs_count' => $scienceLabsCount,
                'computer_labs_count' => $computerLabsCount,
                'working_computers_count' => $computersCount,
                'restrooms_count' => $restroomsCount,
                'has_library' => $hasLibrary,
                'has_learning_resources' => $hasLearningResources,
                'has_safety_equipment' => $hasSafetyEquipment,
            ],
        ];
    }

    /**
     * حساب وتحضير بطاقات السياق الاسترشادي لمؤشرات التقييم.
     *
     * @param Evaluation $evaluation
     * @return array
     */
    public function calculateIndicatorsContext(Evaluation $evaluation): array
    {
        // 1. إذا كان التقييم مكتملاً ويحتوي على لقطة مجمدة، نرجع اللقطة فوراً (BR-SCH-03)
        if ($evaluation->status === 'Completed' && !empty($evaluation->school_context_snapshot)) {
            $snapshot = $evaluation->school_context_snapshot;
            $snapshot['is_snapshot'] = true;
            return $snapshot;
        }

        $school = $evaluation->school;
        $academicYear = $evaluation->cycle?->academic_year ?? '2025/2026';
        $context = $this->getSchoolContext($school, $academicYear);

        $staff = $context['staff'];
        $enrollment = $context['enrollment'];
        $facilities = $context['facilities'];

        $indicatorsContext = [];

        // --------------------------------------------------------------------------------------
        // المؤشر 1-1-2: توافر الكادر التعليمي الثابت والمؤهل
        // --------------------------------------------------------------------------------------
        $totalTeachers = $staff['total_teachers'];
        $qualifiedTeachers = $staff['qualified_teachers_count'];
        $permanentTeachers = $staff['permanent_teachers_count'];

        if ($totalTeachers <= 0) {
            $indicatorsContext['1-1-2'] = [
                'indicator_code' => '1-1-2',
                'name' => 'توافر الكادر التعليمي الثابت والمؤهل',
                'calculated_value' => null,
                'calculated_ratio' => null,
                'suggested_level' => null,
                'badge' => 'بيانات غير مكتملة',
                'message' => 'بيانات المدرسة الإحصائية غير مكتملة (إجمالي المعلمين = 0).',
                'raw_data' => ['total_teachers' => 0, 'qualified_teachers' => 0, 'permanent_teachers' => 0],
            ];
        } else {
            // المعيار يقيس المؤهلين والثابتين
            $ratio = round(($qualifiedTeachers / $totalTeachers) * 100, 1);
            $suggestedLevel = $ratio < 55.0 ? 1 : ($ratio <= 78.0 ? 2 : 3);
            $badge = match ($suggestedLevel) {
                1 => 'المستوى 1 (أقل من 55%)',
                2 => 'المستوى 2 (56% إلى 78%)',
                3 => 'المستوى 3 (79% إلى 100%)',
            };

            $indicatorsContext['1-1-2'] = [
                'indicator_code' => '1-1-2',
                'name' => 'توافر الكادر التعليمي الثابت والمؤهل',
                'calculated_value' => $qualifiedTeachers,
                'calculated_ratio' => $ratio,
                'suggested_level' => $suggestedLevel,
                'badge' => $badge,
                'message' => "نسبة المعلمين المؤهلين تربوياً: {$ratio}% ({$qualifiedTeachers} من أصل {$totalTeachers})، والمعينين رسمياً: {$permanentTeachers}.",
                'raw_data' => [
                    'total_teachers' => $totalTeachers,
                    'qualified_teachers' => $qualifiedTeachers,
                    'permanent_teachers' => $permanentTeachers,
                ],
            ];
        }

        // --------------------------------------------------------------------------------------
        // المؤشر 2-1-2: تناسب مؤهلات المعلمين وتخصصاتهم مع المواد المسندة إليهم
        // --------------------------------------------------------------------------------------
        $matchedSpecialization = $staff['matched_specialization_count'];

        if ($totalTeachers <= 0) {
            $indicatorsContext['2-1-2'] = [
                'indicator_code' => '2-1-2',
                'name' => 'تناسب مؤهلات المعلمين وتخصصاتهم مع المواد المسندة إليهم',
                'calculated_value' => null,
                'calculated_ratio' => null,
                'suggested_level' => null,
                'badge' => 'بيانات غير مكتملة',
                'message' => 'بيانات المدرسة الإحصائية غير مكتملة (إجمالي المعلمين = 0).',
                'raw_data' => ['total_teachers' => 0, 'matched_specialization' => 0],
            ];
        } else {
            $ratio = round(($matchedSpecialization / $totalTeachers) * 100, 1);
            $suggestedLevel = $ratio < 55.0 ? 1 : ($ratio <= 78.0 ? 2 : 3);
            $badge = match ($suggestedLevel) {
                1 => 'المستوى 1 (أقل من 55%)',
                2 => 'المستوى 2 (56% إلى 78%)',
                3 => 'المستوى 3 (79% إلى 100%)',
            };

            $indicatorsContext['2-1-2'] = [
                'indicator_code' => '2-1-2',
                'name' => 'تناسب مؤهلات المعلمين وتخصصاتهم مع المواد المسندة إليهم',
                'calculated_value' => $matchedSpecialization,
                'calculated_ratio' => $ratio,
                'suggested_level' => $suggestedLevel,
                'badge' => $badge,
                'message' => "نسبة مطابقة التخصص للمادة المسندة: {$ratio}% ({$matchedSpecialization} معلماً متخصصاً من أصل {$totalTeachers}).",
                'raw_data' => [
                    'total_teachers' => $totalTeachers,
                    'matched_specialization' => $matchedSpecialization,
                ],
            ];
        }

        // --------------------------------------------------------------------------------------
        // المؤشر 4-1-5: تناسب الفصول الدراسية مع أعداد المتعلمين (الكثافة الصفية)
        // --------------------------------------------------------------------------------------
        $totalStudents = $enrollment['total_students'];
        $classroomsCount = $facilities['classrooms_count'];

        if ($classroomsCount <= 0 || $totalStudents <= 0) {
            $indicatorsContext['4-1-5'] = [
                'indicator_code' => '4-1-5',
                'name' => 'تناسب الفصول الدراسية مع أعداد المتعلمين واشتراطات البيئة الصفية',
                'calculated_value' => null,
                'calculated_ratio' => null,
                'suggested_level' => null,
                'badge' => 'بيانات غير مكتملة',
                'message' => 'بيانات المدرسة الإحصائية غير مكتملة (عدد الطلاب أو الفصول = 0).',
                'raw_data' => ['total_students' => $totalStudents, 'classrooms_count' => $classroomsCount],
            ];
        } else {
            $density = round($totalStudents / $classroomsCount, 1);
            // معيار الكثافة: حتى 30 طالب كثافة مثالية، 31-40 متوسطة، أكثر من 40 عالية
            $suggestedLevel = $density <= 30.0 ? 3 : ($density <= 40.0 ? 2 : 1);
            $badge = match ($suggestedLevel) {
                3 => "المستوى 3 (كثافة مثالية: {$density} طالباً/فصل)",
                2 => "المستوى 2 (كثافة مقبولة: {$density} طالباً/فصل)",
                1 => "المستوى 1 (كثافة مرتفعة: {$density} طالباً/فصل)",
            };

            $indicatorsContext['4-1-5'] = [
                'indicator_code' => '4-1-5',
                'name' => 'تناسب الفصول الدراسية مع أعداد المتعلمين واشتراطات البيئة الصفية',
                'calculated_value' => $density,
                'calculated_ratio' => null,
                'suggested_level' => $suggestedLevel,
                'badge' => $badge,
                'message' => "متوسط الكثافة الصفية: {$density} طالباً في الفصل ({$totalStudents} طالباً على {$classroomsCount} فصلاً).",
                'raw_data' => [
                    'total_students' => $totalStudents,
                    'classrooms_count' => $classroomsCount,
                    'average_density' => $density,
                ],
            ];
        }

        // --------------------------------------------------------------------------------------
        // المؤشر 13-1-5: مرافق صحية كافية ونظيفة ومعقمة مع توفر المياه
        // --------------------------------------------------------------------------------------
        $restroomsCount = $facilities['restrooms_count'];

        if ($restroomsCount <= 0 || $totalStudents <= 0) {
            $indicatorsContext['13-1-5'] = [
                'indicator_code' => '13-1-5',
                'name' => 'مرافق صحية كافية ونظيفة ومعقمة مع توفر المياه',
                'calculated_value' => null,
                'calculated_ratio' => null,
                'suggested_level' => null,
                'badge' => 'بيانات غير مكتملة',
                'message' => 'بيانات المرافق الصحية أو أعداد الطلاب غير مكتملة.',
                'raw_data' => ['total_students' => $totalStudents, 'restrooms_count' => $restroomsCount],
            ];
        } else {
            $studentsPerRestroom = round($totalStudents / $restroomsCount, 1);
            // المعيار الوطني النموذجي: دورة مياه لكل 35 طالباً أو أقل ممتاز، حتى 55 مقبول، أكثر من 55 غير كافٍ
            $suggestedLevel = $studentsPerRestroom <= 35.0 ? 3 : ($studentsPerRestroom <= 55.0 ? 2 : 1);
            $badge = match ($suggestedLevel) {
                3 => "المستوى 3 (دورة مياه لكل {$studentsPerRestroom} طالباً)",
                2 => "المستوى 2 (دورة مياه لكل {$studentsPerRestroom} طالباً)",
                1 => "المستوى 1 (عجز في الدورات: {$studentsPerRestroom} طالباً/دورة)",
            };

            $indicatorsContext['13-1-5'] = [
                'indicator_code' => '13-1-5',
                'name' => 'مرافق صحية كافية ونظيفة ومعقمة مع توفر المياه',
                'calculated_value' => $studentsPerRestroom,
                'calculated_ratio' => null,
                'suggested_level' => $suggestedLevel,
                'badge' => $badge,
                'message' => "معدل الاستخدام: دورة مياه صالحة واحدة لكل {$studentsPerRestroom} طالباً ({$restroomsCount} دورات لـ {$totalStudents} طالباً).",
                'raw_data' => [
                    'total_students' => $totalStudents,
                    'restrooms_count' => $restroomsCount,
                    'students_per_restroom' => $studentsPerRestroom,
                ],
            ];
        }

        // --------------------------------------------------------------------------------------
        // المؤشر 7-1-5: تناسب تجهيزات المعامل الدراسية مع أعداد المتعلمين (أجهزة الحاسوب)
        // --------------------------------------------------------------------------------------
        $workingComputers = $facilities['working_computers_count'];
        $avgClassSize = $facilities['classrooms_count'] > 0 ? ($totalStudents / $facilities['classrooms_count']) : 0;

        if ($workingComputers <= 0 || $avgClassSize <= 0) {
            $indicatorsContext['7-1-5'] = [
                'indicator_code' => '7-1-5',
                'name' => 'تناسب تجهيزات المعامل الدراسية مع أعداد المتعلمين',
                'calculated_value' => null,
                'calculated_ratio' => null,
                'suggested_level' => null,
                'badge' => 'بيانات غير مكتملة',
                'message' => 'بيانات أجهزة معامل الحاسوب أو أعداد الفصول غير مكتملة.',
                'raw_data' => ['working_computers' => $workingComputers, 'average_class_size' => $avgClassSize],
            ];
        } else {
            $studentsPerComputer = round($avgClassSize / $workingComputers, 2);
            // نص الواصفة الوطنية: المستوى 3 (يتناسب)، المستوى 2 (اثنان يتشاركان)، المستوى 1 (ثلاثة فأكثر)
            $suggestedLevel = $studentsPerComputer <= 1.2 ? 3 : ($studentsPerComputer <= 2.2 ? 2 : 1);
            $badge = match ($suggestedLevel) {
                3 => 'المستوى 3 (جهاز لكل طالب في الحصة)',
                2 => 'المستوى 2 (طالبان يشتركان في جهاز)',
                1 => 'المستوى 1 (ثلاثة طلاب فأكثر لكل جهاز)',
            };

            $indicatorsContext['7-1-5'] = [
                'indicator_code' => '7-1-5',
                'name' => 'تناسب تجهيزات المعامل الدراسية مع أعداد المتعلمين',
                'calculated_value' => $studentsPerComputer,
                'calculated_ratio' => null,
                'suggested_level' => $suggestedLevel,
                'badge' => $badge,
                'message' => "معدل المشاركة في حصة الحاسوب: جهاز واحد لكل {$studentsPerComputer} طالباً (متوسط الشعبة {$avgClassSize} طالباً مقابل {$workingComputers} جهازاً صالحاً).",
                'raw_data' => [
                    'working_computers' => $workingComputers,
                    'average_class_size' => round($avgClassSize, 1),
                    'students_per_computer' => $studentsPerComputer,
                ],
            ];
        }

        // --------------------------------------------------------------------------------------
        // المؤشرات المساندة: 7-3 (رعاية الموهوبين) و 16-1-5 (تسهيلات ذوي الاحتياجات)
        // --------------------------------------------------------------------------------------
        $indicatorsContext['7-3'] = [
            'indicator_code' => '7-3',
            'name' => 'دعم المبدعين والمبتكرين وتشجيع التفكير الإبداعي والناقد',
            'calculated_value' => $enrollment['talented_count'],
            'calculated_ratio' => null,
            'suggested_level' => $enrollment['talented_count'] > 0 ? 2 : 1,
            'badge' => $enrollment['talented_count'] > 0 ? "يوجد {$enrollment['talented_count']} طالباً موهوباً مسجلاً" : 'لا يوجد موهوبون مسجلون',
            'message' => "عدد الطلبة الموهوبين المسجلين في إحصاءات المدرسة: {$enrollment['talented_count']} طالباً.",
            'raw_data' => ['talented_count' => $enrollment['talented_count']],
        ];

        $indicatorsContext['16-1-5'] = [
            'indicator_code' => '16-1-5',
            'name' => 'تسهيلات ملائمة لذوي الاحتياجات الخاصة (ممرات ومرافق صحية وأثاث)',
            'calculated_value' => $enrollment['special_needs_count'],
            'calculated_ratio' => null,
            'suggested_level' => $enrollment['special_needs_count'] > 0 && $facilities['has_learning_resources'] ? 3 : null,
            'badge' => $enrollment['special_needs_count'] > 0 ? "يوجد {$enrollment['special_needs_count']} من ذوي الاحتياجات" : 'لا يوجد طلاب ذوو احتياجات مسجلون',
            'message' => "عدد الطلبة من ذوي الاحتياجات الخاصة: {$enrollment['special_needs_count']} طالباً (غرفة مصادر التعلم: " . ($facilities['has_learning_resources'] ? 'متوفرة' : 'غير متوفرة') . ').',
            'raw_data' => [
                'special_needs_count' => $enrollment['special_needs_count'],
                'has_learning_resources' => $facilities['has_learning_resources'],
            ],
        ];

        return [
            'school_id' => $school->school_id,
            'school_name' => $school->school_name,
            'evaluation_id' => $evaluation->evaluation_id,
            'academic_year' => $academicYear,
            'is_snapshot' => false,
            'summary' => [
                'staff' => $staff,
                'enrollment' => $enrollment,
                'facilities' => $facilities,
            ],
            'indicators' => $indicatorsContext,
        ];
    }
}
