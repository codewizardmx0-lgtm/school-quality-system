<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Database\QueryException;
use App\Models\Role;
use App\Models\User;
use App\Models\StandardVersion;
use App\Models\Standard;
use App\Models\SubStandard;
use App\Models\Indicator;
use App\Models\ImprovementArea;
use App\Models\EvaluationCycle;
use App\Models\School;
use App\Models\Evaluation;
use App\Models\Report;
use App\Models\EvaluationSubmission;
use App\Models\CompletionRequest;
use App\Models\CompletionRequestItem;

class DatabaseConstraintsTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * 1. اختبار فشل إدخال مفتاح أجنبي غير موجود (Foreign Key Constraint Violation)
     */
    public function test_inserting_non_existing_foreign_key_fails(): void
    {
        $this->expectException(QueryException::class);

        // إدخال مستخدم بمعرّف مدرسة غير موجود (999999)
        User::create([
            'username' => 'invalid_fk_user_' . substr(uniqid(), -8),
            'password_hash' => bcrypt('password'),
            'full_name' => 'مستخدم مفتاح غير موجود',
            'email' => 'invalid_' . substr(uniqid(), -8) . '@example.com',
            'user_type' => 'school',
            'school_id' => 999999, // غير موجود
            'status' => 'Active',
        ]);
    }

    /**
     * 2. اختبار فشل إدخال قيمة مكررة لقيد فريد (Unique Constraint Violation)
     */
    public function test_inserting_duplicate_unique_value_fails(): void
    {
        $uniqueRoleName = 'unique_role_' . substr(uniqid(), -8);

        // إدخال الدور الأول بنجاح
        Role::create([
            'role_name' => $uniqueRoleName,
            'description' => 'دور أصلي',
        ]);

        $this->expectException(QueryException::class);

        // محاولة إدخال دور ثانٍ بنفس الاسم المكرر
        Role::create([
            'role_name' => $uniqueRoleName,
            'description' => 'دور مكرر',
        ]);
    }

    /**
     * 3. اختبار قيد الفحص CHECK في جدول improvement_areas (يجب توفر مصدر واحد على الأقل)
     */
    public function test_check_constraint_on_improvement_areas_source(): void
    {
        $this->expectException(QueryException::class);

        // إدخال مجال تحسين كلاهما NULL (result_id و indicator_id)
        ImprovementArea::create([
            'name' => 'مجال تحسين بلا مصدر',
            'priority' => 'Medium',
            'result_id' => null,
            'indicator_id' => null,
        ]);
    }

    /**
     * 4. اختبار قيد الفحص CHECK في جدول completion_request_items (يجب توفر هدف واحد على الأقل)
     */
    public function test_check_constraint_on_completion_request_items_target(): void
    {
        // 1. تجهيز دورة ومدرسة ومستخدم وتقرير ومحاولة إرسال وطلب استكمال
        $version = StandardVersion::create([
            'version_no' => 'V_CHK_' . substr(uniqid(), -10),
            'issue_date' => '2026-01-01',
            'source_organization' => 'وزارة التربية',
            'status' => 'Active',
        ]);

        $cycle = EvaluationCycle::create([
            'version_id' => $version->version_id,
            'academic_year' => '2026/2027',
            'start_date' => '2026-09-01',
            'end_date' => '2027-06-30',
            'status' => 'Active',
        ]);

        $school = School::create([
            'school_name' => 'مدرسة الفحص ' . substr(uniqid(), -6),
            'educational_stage' => 'Secondary',
            'educational_district' => 'الشمال',
            'governorate' => 'صنعاء',
            'status' => 'Active',
        ]);

        $user = User::create([
            'username' => 'chk_u_' . substr(uniqid(), -8),
            'password_hash' => bcrypt('password'),
            'full_name' => 'مدير تقييم',
            'email' => 'chk_' . substr(uniqid(), -8) . '@example.com',
            'user_type' => 'school',
            'school_id' => $school->school_id,
            'status' => 'Active',
        ]);

        $evaluation = Evaluation::create([
            'cycle_id' => $cycle->cycle_id,
            'school_id' => $school->school_id,
            'created_by_user_id' => $user->user_id,
            'status' => 'InProgress',
        ]);

        $report = Report::create([
            'evaluation_id' => $evaluation->evaluation_id,
            'generated_at' => now()->format('Y-m-d H:i:s'),
            'status' => 'Final',
        ]);

        $submission = EvaluationSubmission::create([
            'report_id' => $report->report_id,
            'submitted_by_user_id' => $user->user_id,
            'attempt_no' => 1,
            'submitted_at' => now()->format('Y-m-d H:i:s'),
            'status' => 'NeedsCompletion',
        ]);

        $request = CompletionRequest::create([
            'submission_id' => $submission->submission_id,
            'issued_by_user_id' => $user->user_id,
            'status' => 'Open',
        ]);

        $this->expectException(QueryException::class);

        // محاولة إنشاء بند استكمال كلاهما NULL (لا مؤشر ولا شاهد)
        CompletionRequestItem::create([
            'request_id' => $request->request_id,
            'indicator_id' => null,
            'evidence_id' => null,
            'missing_description' => 'وصف النقص بدون تحديد مستهدف',
            'status' => 'Pending',
        ]);
    }

    /**
     * 5. اختبار قيد الفحص CHECK في evaluation_submissions لحالة مسودة ومطابقة submitted_at
     */
    public function test_check_constraint_on_submission_draft_status(): void
    {
        $version = StandardVersion::create([
            'version_no' => 'V_SUB_' . substr(uniqid(), -10),
            'issue_date' => '2026-01-01',
            'source_organization' => 'وزارة التربية',
            'status' => 'Active',
        ]);

        $cycle = EvaluationCycle::create([
            'version_id' => $version->version_id,
            'academic_year' => '2026/2027',
            'start_date' => '2026-09-01',
            'end_date' => '2027-06-30',
            'status' => 'Active',
        ]);

        $school = School::create([
            'school_name' => 'مدرسة التقرير ' . substr(uniqid(), -6),
            'educational_stage' => 'Secondary',
            'educational_district' => 'الجنوب',
            'governorate' => 'تعز',
            'status' => 'Active',
        ]);

        $user = User::create([
            'username' => 'sub_user_' . substr(uniqid(), -8),
            'password_hash' => bcrypt('password'),
            'full_name' => 'مدير مدرسة',
            'email' => 'sub_' . substr(uniqid(), -8) . '@example.com',
            'user_type' => 'school',
            'school_id' => $school->school_id,
            'status' => 'Active',
        ]);

        $evaluation = Evaluation::create([
            'cycle_id' => $cycle->cycle_id,
            'school_id' => $school->school_id,
            'created_by_user_id' => $user->user_id,
            'status' => 'InProgress',
        ]);

        $report = Report::create([
            'evaluation_id' => $evaluation->evaluation_id,
            'generated_at' => now()->format('Y-m-d H:i:s'),
            'status' => 'Draft',
        ]);

        $this->expectException(QueryException::class);

        // محاولة إدخال محاولة بحالة 'Draft' لكن مع تاريخ submitted_at غير فارغ (يخالف القيد المعتمد)
        EvaluationSubmission::create([
            'report_id' => $report->report_id,
            'submitted_by_user_id' => $user->user_id,
            'attempt_no' => 1,
            'submitted_at' => now()->format('Y-m-d H:i:s'), // يخالف Draft
            'status' => 'Draft',
        ]);
    }
}
