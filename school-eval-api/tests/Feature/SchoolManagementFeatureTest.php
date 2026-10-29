<?php

namespace Tests\Feature;

use App\Models\Attachment;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\Evidence;
use App\Models\EvidenceVersion;
use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\IndicatorScoreDescriptor;
use App\Models\School;
use App\Models\SchoolEnrollmentMetric;
use App\Models\SchoolFacility;
use App\Models\SchoolStaffMetric;
use App\Models\StandardVersion;
use App\Models\User;
use Database\Seeders\SchoolMetricsAndFacilitiesSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات ميزة إدارة المدرسة وإحصاءاتها ومرافقها وسياق المؤشرات (الشريحة 6).
 */
class SchoolManagementFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $evaluatorBelqees;
    protected User $principalBelqees;
    protected User $evaluatorFarouq;
    protected User $admin;
    protected User $standardsManager;
    protected ?User $supervisor;
    protected School $schoolBelqees;
    protected School $schoolFarouq;
    protected Evaluation $evaluationBelqees;
    protected EvaluationCycle $cycle;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(SchoolMetricsAndFacilitiesSeeder::class);

        $this->schoolBelqees = School::where('identification_data', 'SCH-SANAA-2026-001')->firstOrFail();
        $this->schoolFarouq  = School::where('identification_data', 'SCH-TAIZ-2026-002')->firstOrFail();

        $this->evaluatorBelqees = User::where('username', 'quality_belqees')->firstOrFail();
        $this->principalBelqees = User::where('username', 'principal_belqees')->firstOrFail();
        $this->evaluatorFarouq  = User::where('username', 'quality_farouq')->firstOrFail();
        $this->admin            = User::where('username', 'admin')->firstOrFail();
        $this->standardsManager = User::where('username', 'standards_manager_ministry')->firstOrFail();
        $this->supervisor       = User::where('username', 'supervisor_ministry')->first();

        $this->cycle = EvaluationCycle::where('status', 'Active')->firstOrFail();

        $this->evaluationBelqees = Evaluation::firstOrCreate(
            [
                'school_id' => $this->schoolBelqees->school_id,
                'cycle_id'  => $this->cycle->cycle_id,
            ],
            [
                'created_by_user_id' => $this->evaluatorBelqees->user_id,
                'status'             => 'InProgress',
            ]
        );
        $this->evaluationBelqees->update(['status' => 'InProgress', 'school_context_snapshot' => null]);
    }

    /**
     * 1. استعراض الملف التعريفي وسياق المدرسة بنجاح لمستخدم مصرح به.
     */
    public function test_authorized_user_can_view_school_profile_with_context(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->getJson("/api/v1/schools/{$this->schoolBelqees->school_id}/profile?academic_year=2025/2026");

        $response->assertStatus(200)
            ->assertJsonPath('data.school.schoolId', $this->schoolBelqees->school_id)
            ->assertJsonPath('data.school.buildingType', 'حكومي')
            ->assertJsonPath('data.school.shiftType', 'صباحي')
            ->assertJsonPath('data.context.academic_year', '2025/2026')
            ->assertJsonPath('data.context.staff.total_teachers', 30)
            ->assertJsonPath('data.context.facilities.science_labs_count', 2);
    }

    /**
     * 2. العزل المؤسسي الصارم (القرار 9): 404 عند محاولة مستخدم مدرسة طلب ملف مدرسة أخرى.
     */
    public function test_institutional_isolation_404_when_viewing_other_school_profile(): void
    {
        Sanctum::actingAs($this->evaluatorFarouq);

        $response = $this->getJson("/api/v1/schools/{$this->schoolBelqees->school_id}/profile");

        $response->assertStatus(404);
    }

    /**
     * 3. تحديث الملف التعريفي الموسع للمدرسة بنجاح من قبل مقيم أو مدير المدرسة.
     */
    public function test_authorized_user_can_update_school_profile(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $payload = [
            'address'          => 'صنعاء - التحرير - شارع الزبيري الفرعي',
            'phone'            => '01234567',
            'email'            => 'info@belqees.edu.ye',
            'educationalAdmin' => 'منطقة التحرير التعليمية',
            'buildingType'     => 'حكومي',
            'shiftType'        => 'فترتان',
            'totalArea'        => 5200.50,
            'builtUpArea'      => 3100.00,
        ];

        $response = $this->putJson("/api/v1/schools/{$this->schoolBelqees->school_id}/profile", $payload);

        $response->assertStatus(200)
            ->assertJsonPath('data.address', 'صنعاء - التحرير - شارع الزبيري الفرعي')
            ->assertJsonPath('data.phone', '01234567')
            ->assertJsonPath('data.shiftType', 'فترتان')
            ->assertJsonPath('data.totalArea', 5200.5);

        $this->assertDatabaseHas('schools', [
            'school_id'  => $this->schoolBelqees->school_id,
            'shift_type' => 'فترتان',
            'phone'      => '01234567',
        ]);
    }

    /**
     * 4. العزل المؤسسي الصارم (القرار 9): 404 عند محاولة تعديل بيانات مدرسة أخرى.
     */
    public function test_institutional_isolation_404_when_updating_other_school_profile(): void
    {
        Sanctum::actingAs($this->evaluatorFarouq);

        $response = $this->putJson("/api/v1/schools/{$this->schoolBelqees->school_id}/profile", [
            'phone' => '09999999',
        ]);

        $response->assertStatus(404);
    }

    /**
     * 5. رفض التعديل برمز 403 لمستخدم لا يمتلك صلاحية تعديل بيانات المدرسة.
     */
    public function test_unauthorized_user_cannot_update_school_profile_403(): void
    {
        Sanctum::actingAs($this->standardsManager);

        $response = $this->putJson("/api/v1/schools/{$this->schoolBelqees->school_id}/profile", [
            'phone' => '01234567',
        ]);

        $response->assertStatus(403);
    }

    /**
     * 6. حفظ واستعراض إحصاءات الكادر التعليمي والإداري بنجاح (Upsert).
     */
    public function test_can_upsert_and_view_staff_metrics(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $payload = [
            'academicYear'                 => '2026/2027',
            'totalTeachers'                => 35,
            'qualifiedTeachersCount'       => 28,
            'permanentTeachersCount'       => 25,
            'matchedSpecializationCount'   => 30,
            'totalAdminStaff'              => 7,
            'totalServiceStaff'            => 5,
        ];

        $response = $this->putJson("/api/v1/schools/{$this->schoolBelqees->school_id}/staff-metrics", $payload);

        $response->assertStatus(200)
            ->assertJsonPath('data.academicYear', '2026/2027')
            ->assertJsonPath('data.totalTeachers', 35)
            ->assertJsonPath('data.qualifiedTeachersCount', 28);

        // استعراض السجل المحفوظ
        $getRes = $this->getJson("/api/v1/schools/{$this->schoolBelqees->school_id}/staff-metrics?academic_year=2026/2027");
        $getRes->assertStatus(200)
            ->assertJsonPath('data.totalTeachers', 35)
            ->assertJsonPath('data.matchedSpecializationCount', 30);
    }

    /**
     * 7. التحقق من قواعد صحة إحصاءات الكادر (منع تجاوز الأجزاء للكل والأعداد السالبة).
     */
    public function test_staff_metrics_validation_rules_prevent_invalid_counts(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // 1. تجاوز عدد المؤهلين لإجمالي المعلمين
        $res1 = $this->putJson("/api/v1/schools/{$this->schoolBelqees->school_id}/staff-metrics", [
            'academicYear'                 => '2025/2026',
            'totalTeachers'                => 20,
            'qualifiedTeachersCount'       => 25, // خطأ: 25 > 20
            'permanentTeachersCount'       => 15,
            'matchedSpecializationCount'   => 15,
            'totalAdminStaff'              => 2,
            'totalServiceStaff'            => 1,
        ]);
        $res1->assertStatus(422)
            ->assertJsonValidationErrors(['qualifiedTeachersCount']);

        // 2. عدد سالب
        $res2 = $this->putJson("/api/v1/schools/{$this->schoolBelqees->school_id}/staff-metrics", [
            'academicYear'                 => '2025/2026',
            'totalTeachers'                => 20,
            'qualifiedTeachersCount'       => 15,
            'permanentTeachersCount'       => 15,
            'matchedSpecializationCount'   => 15,
            'totalAdminStaff'              => -3, // خطأ
            'totalServiceStaff'            => 1,
        ]);
        $res2->assertStatus(422)
            ->assertJsonValidationErrors(['totalAdminStaff']);
    }

    /**
     * 8. حفظ واستعراض إحصاءات الطلاب وتوزيع الفصول بنجاح (Bulk Upsert).
     */
    public function test_can_bulk_upsert_and_view_enrollment_metrics(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $payload = [
            'academicYear' => '2026/2027',
            'items' => [
                [
                    'educationLevel'      => 'ثانوي',
                    'gradeLevel'          => 'الصف الأول ثانوي',
                    'classesCount'        => 5,
                    'maleStudentsCount'   => 0,
                    'femaleStudentsCount' => 150,
                    'specialNeedsCount'   => 3,
                    'talentedCount'       => 8,
                ],
                [
                    'educationLevel'      => 'ثانوي',
                    'gradeLevel'          => 'الصف الثاني ثانوي',
                    'classesCount'        => 4,
                    'maleStudentsCount'   => 0,
                    'femaleStudentsCount' => 120,
                    'specialNeedsCount'   => 1,
                    'talentedCount'       => 5,
                ],
            ],
        ];

        $response = $this->postJson("/api/v1/schools/{$this->schoolBelqees->school_id}/enrollment-metrics", $payload);

        $response->assertStatus(200)
            ->assertJsonPath('data.totalStudents', 270)
            ->assertJsonPath('data.totalClasses', 9)
            ->assertJsonPath('data.specialNeedsTotal', 4)
            ->assertJsonPath('data.talentedTotal', 13);
    }

    /**
     * 9. التحقق من اشتراط classes_count >= 1 في إحصاءات الفصول.
     */
    public function test_enrollment_metrics_validation_requires_positive_classes_count(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->postJson("/api/v1/schools/{$this->schoolBelqees->school_id}/enrollment-metrics", [
            'academicYear' => '2025/2026',
            'items' => [
                [
                    'educationLevel'      => 'ثانوي',
                    'gradeLevel'          => 'الصف الأول',
                    'classesCount'        => 0, // خطأ: يجب أن يكون 1 على الأقل
                    'maleStudentsCount'   => 0,
                    'femaleStudentsCount' => 50,
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.classesCount']);
    }

    /**
     * 10. عمليات CRUD كاملة على مرافق المدرسة مع التحقق من العزل 404.
     */
    public function test_crud_operations_on_school_facilities(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // 1. إضافة مرفق جديد
        $createRes = $this->postJson("/api/v1/schools/{$this->schoolBelqees->school_id}/facilities", [
            'facilityType' => 'science_lab',
            'name'         => 'معمل الروبوت والذكاء الاصطناعي التجريبي',
            'count'        => 1,
            'isUsable'     => true,
            'details'      => ['kits_count' => 10],
        ]);

        $createRes->assertStatus(201)
            ->assertJsonPath('data.name', 'معمل الروبوت والذكاء الاصطناعي التجريبي');

        $facilityId = $createRes->json('data.facilityId');

        // 2. تعديل المرفق
        $updateRes = $this->putJson("/api/v1/schools/{$this->schoolBelqees->school_id}/facilities/{$facilityId}", [
            'facilityType' => 'science_lab',
            'name'         => 'معمل الابتكار والروبوت المطور',
            'count'        => 1,
            'isUsable'     => true,
            'details'      => ['kits_count' => 15],
        ]);
        $updateRes->assertStatus(200)
            ->assertJsonPath('data.name', 'معمل الابتكار والروبوت المطور');

        // 3. العزل 404 عند محاولة مدرسة أخرى تعديله
        Sanctum::actingAs($this->evaluatorFarouq);
        $isoRes = $this->putJson("/api/v1/schools/{$this->schoolBelqees->school_id}/facilities/{$facilityId}", [
            'facilityType' => 'science_lab',
            'name'         => 'محاولة اختراق العزل',
            'count'        => 1,
            'isUsable'     => true,
        ]);
        $isoRes->assertStatus(404);

        // 4. حذف المرفق اللطيف التزاماً بقاعدة "تعطيل لا حذف" (Soft Delete)
        Sanctum::actingAs($this->evaluatorBelqees);
        $delRes = $this->deleteJson("/api/v1/schools/{$this->schoolBelqees->school_id}/facilities/{$facilityId}");
        $delRes->assertStatus(200);

        // التأكد من الحذف اللطيف وبقاء السجل في قاعدة البيانات للتدقيق التاريخي
        $this->assertSoftDeleted('school_facilities', [
            'facility_id' => $facilityId,
        ]);

        // التأكد من استبعاده من قائمة المرافق النشطة
        $listRes = $this->getJson("/api/v1/schools/{$this->schoolBelqees->school_id}/facilities");
        $listRes->assertStatus(200);
        $ids = collect($listRes->json('data.facilities'))->pluck('facilityId');
        $this->assertNotContains($facilityId, $ids);
    }

    /**
     * 11. مسار indicators-context يحسب النسب وشارات المستويات الاسترشادية بدقة للمؤشرات.
     */
    public function test_indicators_context_endpoint_calculates_ratios_and_badges_correctly(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators-context");

        $response->assertStatus(200)
            ->assertJsonPath('data.is_snapshot', false)
            ->assertJsonPath('data.academic_year', '2025/2026')
            // المؤشر 1-1-2: 24 مؤهلين من 30 = 80% (المستوى 3)
            ->assertJsonPath('data.indicators.1-1-2.calculated_ratio', 80)
            ->assertJsonPath('data.indicators.1-1-2.suggested_level', 3)
            ->assertJsonPath('data.indicators.1-1-2.badge', 'المستوى 3 (79% إلى 100%)')
            // المؤشر 2-1-2: 26 مطابقين من 30 = 86.7% (المستوى 3)
            ->assertJsonPath('data.indicators.2-1-2.calculated_ratio', 86.7)
            ->assertJsonPath('data.indicators.2-1-2.suggested_level', 3)
            // المؤشر 4-1-5: 420 طالب على 14 فصل = 30 (المستوى 3)
            ->assertJsonPath('data.indicators.4-1-5.calculated_value', 30)
            ->assertJsonPath('data.indicators.4-1-5.suggested_level', 3)
            // المؤشر 13-1-5: 420 طالب على 12 دورة مياه = 35 (المستوى 3)
            ->assertJsonPath('data.indicators.13-1-5.calculated_value', 35)
            ->assertJsonPath('data.indicators.13-1-5.suggested_level', 3)
            // المؤشر 7-1-5: حاسوب صالح
            ->assertJsonPath('data.indicators.7-1-5.suggested_level', 3)
            // الموهوبين وذوي الاحتياجات
            ->assertJsonPath('data.indicators.7-3.calculated_value', 26)
            ->assertJsonPath('data.indicators.16-1-5.calculated_value', 4);
    }

    /**
     * 12. الحماية الحتمية من القسمة على صفر (Zero-Division Protection) في مسار indicators-context.
     */
    public function test_indicators_context_zero_division_protection(): void
    {
        // إنشاء مدرسة جديدة تماماً بدون أي إحصاءات أو مرافق
        $emptySchool = School::create([
            'school_name'          => 'مدرسة المستقبل التجريبية الفارغة',
            'educational_stage'    => 'ثانوي',
            'identification_data'  => 'SCH-EMPTY-999',
            'educational_district' => 'المديرية',
            'governorate'          => 'صنعاء',
            'status'               => 'Active',
        ]);

        $eval = Evaluation::create([
            'school_id'          => $emptySchool->school_id,
            'cycle_id'           => $this->cycle->cycle_id,
            'created_by_user_id' => $this->admin->user_id,
            'status'             => 'InProgress',
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->getJson("/api/v1/evaluations/{$eval->evaluation_id}/indicators-context");

        // يجب ألا يحدث خطأ 500 نهائياً
        $response->assertStatus(200)
            ->assertJsonPath('data.indicators.1-1-2.calculated_ratio', null)
            ->assertJsonPath('data.indicators.1-1-2.suggested_level', null)
            ->assertJsonPath('data.indicators.1-1-2.badge', 'بيانات غير مكتملة')
            ->assertJsonPath('data.indicators.4-1-5.calculated_value', null)
            ->assertJsonPath('data.indicators.13-1-5.calculated_value', null);
    }

    /**
     * 13. اختبار الـ Snapshot المحوري: تجميد البيانات عند submit وحماية التقييم المقفل من التغير بأثر رجعي.
     */
    public function test_snapshot_is_saved_on_submit_and_preserves_ratios_after_subsequent_metric_changes(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // تجهيز التقييم بالدرجات والشواهد الكاملة لتمكينه من الإغلاق
        $this->fillEvaluationRequirements($this->evaluationBelqees);

        // 1. استدعاء مسار إغلاق وتقديم التقييم
        $submitRes = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/submit");
        $submitRes->assertStatus(200)
            ->assertJsonPath('data.status', 'Completed')
            ->assertJsonPath('data.isLocked', true);

        // التأكد من حفظ الـ Snapshot في قاعدة البيانات
        $freshEval = $this->evaluationBelqees->fresh();
        $this->assertEquals('Completed', $freshEval->status);
        $this->assertNotNull($freshEval->school_context_snapshot);
        $this->assertEquals(80, $freshEval->school_context_snapshot['indicators']['1-1-2']['calculated_ratio']);

        // 2. محاكاة تعديل جذري في إحصاءات المدرسة لنفس العام الدراسي بعد قفل التقييم!
        // نغير إجمالي المعلمين إلى 100 والمؤهلين إلى 10 فقط (النسبة الحية تهبط إلى 10% - المستوى 1)
        SchoolStaffMetric::where('school_id', $this->schoolBelqees->school_id)
            ->where('academic_year', '2025/2026')
            ->update([
                'total_teachers'           => 100,
                'qualified_teachers_count' => 10,
            ]);

        // 3. استدعاء مسار indicators-context للتقييم المقفل
        $contextRes = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators-context");

        $contextRes->assertStatus(200)
            // التحقق الجوهري: القراءة تمت من الـ Snapshot المجمد!
            ->assertJsonPath('data.is_snapshot', true)
            // النسبة ما زالت 80% (محمية ومجمدة)، وليست 10%!
            ->assertJsonPath('data.indicators.1-1-2.calculated_ratio', 80)
            ->assertJsonPath('data.indicators.1-1-2.suggested_level', 3);
    }

    /**
     * 14. التوافق الرجعي: تقييم قديم مكتمل ومقفل سابقاً بلا Snapshot لا ينهار ويعيد تنبيهاً صريحاً.
     */
    public function test_legacy_completed_evaluation_without_snapshot_returns_notice_and_does_not_crash(): void
    {
        // محاكاة تقييم قديم أُغلق قبل إضافة ميزة الـ Snapshot
        $this->evaluationBelqees->update([
            'status'                  => 'Completed',
            'school_context_snapshot' => null, // لم يكن الحقل موجوداً وقتها
            'submitted_at'            => now()->subMonths(3),
        ]);

        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators-context");

        $response->assertStatus(200)
            ->assertJsonPath('data.is_snapshot', false)
            ->assertJsonPath('data.is_legacy_completed_without_snapshot', true)
            ->assertJsonPath('data.school_id', $this->schoolBelqees->school_id)
            ->assertJsonFragment([
                'is_legacy_completed_without_snapshot' => true,
            ]);

        $this->assertStringContainsString('لقطة السياق', $response->json('data.notice'));
    }

    /**
     * 15. التقييم المفتوح غير المقدم يعيد تنبيهاً بأن البيانات حية وقابلة للتغيير.
     */
    public function test_unsubmitted_evaluation_indicators_context_marks_data_as_live_notice(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $this->evaluationBelqees->update(['status' => 'InProgress', 'school_context_snapshot' => null]);

        $response = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators-context");

        $response->assertStatus(200)
            ->assertJsonPath('data.is_snapshot', false)
            ->assertJsonPath('data.is_legacy_completed_without_snapshot', false);

        $this->assertStringContainsString('سياق المدرسة حي ومباشر وقابل للتغيير', $response->json('data.notice'));
    }

    /**
     * 16. توحيد وتطبيع صيغة العام الدراسي: تحويل الشرطة إلى سلاش تلقائياً، ورفض الصيغ غير المطابقة بـ 422.
     */
    public function test_academic_year_hyphen_normalization_and_regex_validation(): void
    {
        Sanctum::actingAs($this->principalBelqees);

        // 1. إرسال بصيغة الشرطة 2026-2027 يتم تطبيعها تلقائياً إلى 2026/2027
        $normRes = $this->putJson("/api/v1/schools/{$this->schoolBelqees->school_id}/staff-metrics", [
            'academicYear'               => '2026-2027',
            'totalTeachers'              => 25,
            'qualifiedTeachersCount'     => 20,
            'permanentTeachersCount'     => 22,
            'matchedSpecializationCount' => 19,
            'totalAdminStaff'            => 4,
            'totalServiceStaff'          => 2,
        ]);

        $normRes->assertStatus(200)
            ->assertJsonPath('data.academicYear', '2026/2027');

        $this->assertDatabaseHas('school_staff_metrics', [
            'school_id'     => $this->schoolBelqees->school_id,
            'academic_year' => '2026/2027',
            'total_teachers' => 25,
        ]);

        // 2. إرسال صيغة غير صالحة إطلاقاً (مثل 2026 فقط أو نص عشوائي) يفشل بـ 422
        $invalidRes = $this->putJson("/api/v1/schools/{$this->schoolBelqees->school_id}/staff-metrics", [
            'academicYear'               => '2026', // صيغة غير صالحة
            'totalTeachers'              => 25,
            'qualifiedTeachersCount'     => 20,
            'permanentTeachersCount'     => 22,
            'matchedSpecializationCount' => 19,
            'totalAdminStaff'            => 4,
            'totalServiceStaff'          => 2,
        ]);

        $invalidRes->assertStatus(422)
            ->assertJsonValidationErrors(['academicYear']);
    }

    /**
     * 17. التحقق من صلاحيات مدير المدرسة الكاملة في إدارة ملف المدرسة وإحصاءاتها ومرافقها.
     */
    public function test_principal_has_full_permissions_to_manage_school_and_facilities(): void
    {
        Sanctum::actingAs($this->principalBelqees);

        // 1. تعديل ملف المدرسة
        $profRes = $this->putJson("/api/v1/schools/{$this->schoolBelqees->school_id}/profile", [
            'phone'   => '01444555',
            'address' => 'صنعاء - التحرير المحدث',
        ]);
        $profRes->assertStatus(200)
            ->assertJsonPath('data.phone', '01444555');

        // 2. إضافة مرفق مدرسي جديد
        $facRes = $this->postJson("/api/v1/schools/{$this->schoolBelqees->school_id}/facilities", [
            'facilityType' => 'library',
            'name'         => 'مكتبة المدرسة النموذجية بواسطة المدير',
            'count'        => 1,
            'isUsable'     => true,
            'details'      => ['books_count' => 1500],
        ]);
        $facRes->assertStatus(201);
        $facId = $facRes->json('data.facilityId');

        // 3. حذف المرفق اللطيف
        $delRes = $this->deleteJson("/api/v1/schools/{$this->schoolBelqees->school_id}/facilities/{$facId}");
        $delRes->assertStatus(200);

        $this->assertSoftDeleted('school_facilities', [
            'facility_id' => $facId,
        ]);
    }

    /**
     * 18. رفض الوصول للمشرف الوزاري أو المستخدم غير المصرح برمز 403 عند محاولة تعديل بيانات المدرسة أو مرافقها.
     */
    public function test_supervisor_and_unauthorized_roles_receive_403_on_school_management(): void
    {
        // 1. المشرف الوزاري يحاول تعديل ملف المدرسة
        Sanctum::actingAs($this->supervisor);

        $supProfRes = $this->putJson("/api/v1/schools/{$this->schoolBelqees->school_id}/profile", [
            'phone' => '09999999',
        ]);
        $supProfRes->assertStatus(403);

        // 2. المشرف الوزاري يحاول إضافة مرفق
        $supFacRes = $this->postJson("/api/v1/schools/{$this->schoolBelqees->school_id}/facilities", [
            'facilityType' => 'playground',
            'name'         => 'ملعب غير مصرح للمشرف',
            'count'        => 1,
            'isUsable'     => true,
        ]);
        $supFacRes->assertStatus(403);
    }

    /**
     * دالة مساعدة لتجهيز التقييم بالدرجات والشواهد المطلوبة للإغلاق.
     */
    protected function fillEvaluationRequirements(Evaluation $evaluation): void
    {
        $version = StandardVersion::where('status', 'Active')->firstOrFail();
        $indicators = Indicator::whereHas('subStandard.standard', fn ($q) => $q->where('version_id', $version->version_id))->get();

        foreach ($indicators as $indicator) {
            $descriptor = IndicatorScoreDescriptor::where('indicator_id', $indicator->indicator_id)
                ->where('score_level_id', 3)
                ->first()
                ?? IndicatorScoreDescriptor::where('indicator_id', $indicator->indicator_id)->first();

            EvaluationResult::updateOrCreate(
                [
                    'evaluation_id' => $evaluation->evaluation_id,
                    'indicator_id'  => $indicator->indicator_id,
                ],
                [
                    'score_descriptor_id' => $descriptor ? $descriptor->descriptor_id : 1,
                    'standard_version_id' => $version->version_id,
                    'evaluator_user_id'   => $this->evaluatorBelqees->user_id,
                    'score'               => 2,
                    'completion_status'   => 'Completed',
                ]
            );
        }

        // إرفاق الشواهد المكتملة لكافة المتطلبات الإلزامية
        $requirements = IndicatorEvidenceRequirement::where('required', true)
            ->get()
            ->groupBy('indicator_id');

        foreach ($requirements as $indicatorId => $reqList) {
            $result = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
                ->where('indicator_id', $indicatorId)
                ->first();

            if ($result) {
                // حذف الشواهد السابقة إن وجدت
                $oldEvidences = Evidence::where('result_id', $result->result_id)->get();
                foreach ($oldEvidences as $oldEv) {
                    EvidenceVersion::where('evidence_id', $oldEv->evidence_id)->delete();
                    $oldEv->delete();
                }

                foreach ($reqList as $req) {
                    $evidence = Evidence::create([
                        'result_id'     => $result->result_id,
                        'indicator_id'  => $indicatorId,
                        'title'         => 'شاهد معتمد للمتطلب ' . $req->requirement_id,
                        'description'   => 'وصف الشاهد المكتمل',
                        'justification' => 'مبررات ودلالات الشاهد',
                        'evidence_type' => 'record',
                        'status'        => 'Completed',
                    ]);

                    EvidenceVersion::create([
                        'evidence_id' => $evidence->evidence_id,
                        'version_no'  => 1,
                        'current'     => true,
                    ]);
                }
            }
        }
    }
}
