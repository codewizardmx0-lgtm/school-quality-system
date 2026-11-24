<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\CompletionRequest;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationSubmission;
use App\Models\Report;
use App\Models\Role;
use App\Models\School;
use App\Models\StandardVersion;
use App\Models\SupervisorNote;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات التحقق من حوكمة سجل المتابعة الميدانية والعزل الجغرافي (Screen 6 Tracking Log).
 *
 * تغطي:
 * 1. العزل الجغرافي الصارم (403 Forbidden) لمسارات:
 *    - GET /api/v1/schools/{id}/tracking-log
 *    - POST /api/v1/schools/{id}/supervisor-notes
 *    - GET /api/v1/schools/{id}/tracking-log/pdf
 *    - GET /api/v1/schools/{id}/tracking-log/excel
 * 2. إضافة مذكرة إشرافية موثقة بسياق كامل (المدرسة، الدورة، المخرج، طلب الاستكمال) مع المذكرة التصحيحية (FR-SUP-16).
 * 3. استرجاع السجل الزمني متضمناً مؤشرات KPIs وانتقال الحالات (State Transitions).
 * 4. الامتثال لقاعدة الحظر وعدم الحذف/التعديل (NFR-INT-02).
 */
class SupervisionTrackingLogFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $supervisorAmana;
    protected User $supervisorTaiz;
    protected School $schoolAmana;
    protected School $schoolTaiz;
    protected EvaluationCycle $cycle;

    protected function setUp(): void
    {
        parent::setUp();

        $this->schoolAmana = School::where('governorate', 'أمانة العاصمة')->first()
            ?? School::firstOrCreate(
                ['identification_data' => 'SCH-TEST-AMN-01'],
                [
                    'school_name' => 'مدرسة الأمانة التجريبية للمتابعة',
                    'name' => 'مدرسة الأمانة التجريبية للمتابعة',
                    'educational_stage' => 'أساسي',
                    'school_type' => 'government',
                    'governorate' => 'أمانة العاصمة',
                    'educational_district' => 'السبعين',
                    'status' => 'Active',
                ]
            );

        $this->schoolTaiz = School::where('governorate', 'LIKE', '%تعز%')->first()
            ?? School::firstOrCreate(
                ['identification_data' => 'SCH-TEST-TAZ-01'],
                [
                    'school_name' => 'مدرسة تعز التجريبية للمتابعة',
                    'name' => 'مدرسة تعز التجريبية للمتابعة',
                    'educational_stage' => 'أساسي',
                    'school_type' => 'government',
                    'governorate' => 'محافظة تعز',
                    'educational_district' => 'المظفر',
                    'status' => 'Active',
                ]
            );

        $role = Role::where('role_name', 'ministry_supervisor')->first();

        $this->supervisorAmana = User::firstOrCreate(
            ['username' => 'sup_amana_tracking_test'],
            [
                'full_name' => 'مشرف أمانة العاصمة للمتابعة',
                'name' => 'مشرف أمانة العاصمة للمتابعة',
                'email' => 'sup_amn_track@erteqa.test',
                'password_hash' => bcrypt('password123'),
                'user_type' => 'ministry',
                'governorate' => 'أمانة العاصمة',
                'status' => 'Active',
            ]
        );
        if ($role) {
            $this->supervisorAmana->roles()->syncWithoutDetaching([$role->role_id => ['assigned_at' => now(), 'active' => 1]]);
        }

        $this->supervisorTaiz = User::firstOrCreate(
            ['username' => 'sup_taiz_tracking_test'],
            [
                'full_name' => 'مشرف تعز للمتابعة',
                'name' => 'مشرف تعز للمتابعة',
                'email' => 'sup_taz_track@erteqa.test',
                'password_hash' => bcrypt('password123'),
                'user_type' => 'ministry',
                'governorate' => 'محافظة تعز',
                'status' => 'Active',
            ]
        );
        if ($role) {
            $this->supervisorTaiz->roles()->syncWithoutDetaching([$role->role_id => ['assigned_at' => now(), 'active' => 1]]);
        }

        $version = StandardVersion::first() ?? StandardVersion::create([
            'version_no' => '2026.1',
            'source_organization' => 'وزارة التربية والتعليم',
            'status' => 'Active',
        ]);

        $this->cycle = EvaluationCycle::first() ?? EvaluationCycle::create([
            'name' => 'دورة التقييم الذاتي 2026/2027',
            'academic_year' => '2026/2027',
            'version_id' => $version->version_id,
            'start_date' => Carbon::now()->subDays(10)->toDateString(),
            'end_date' => Carbon::now()->addDays(50)->toDateString(),
            'status' => 'Active',
            'max_completion_days' => 14,
        ]);
    }

    /**
     * 1. منع المشرف الإقليمي من استعراض سجل متابعة مدرسة تقع خارج محافظته (403)
     */
    public function test_regional_supervisor_forbidden_to_view_tracking_log_of_other_governorate(): void
    {
        Sanctum::actingAs($this->supervisorAmana, ['*']);

        $response = $this->getJson("/api/v1/schools/{$this->schoolTaiz->school_id}/tracking-log");

        $response->assertStatus(403);
    }

    /**
     * 2. منع المشرف الإقليمي من إضافة مذكرة إشرافية لمدرسة تقع خارج محافظته (403)
     */
    public function test_regional_supervisor_forbidden_to_add_memo_for_school_of_other_governorate(): void
    {
        Sanctum::actingAs($this->supervisorAmana, ['*']);

        $payload = [
            'memoType' => 'مذكرة إشرافية',
            'subject' => 'مذكرة خارج النطاق الجغرافي',
            'details' => 'تفاصيل المذكرة التي يجب أن تُرفض.',
        ];

        $response = $this->postJson("/api/v1/schools/{$this->schoolTaiz->school_id}/supervisor-notes", $payload);

        $response->assertStatus(403);
    }

    /**
     * 3. منع المشرف الإقليمي من تصدير PDF لسجل مدرسة خارج محافظته (403)
     */
    public function test_regional_supervisor_forbidden_to_export_pdf_for_school_of_other_governorate(): void
    {
        Sanctum::actingAs($this->supervisorAmana, ['*']);

        $response = $this->getJson("/api/v1/schools/{$this->schoolTaiz->school_id}/tracking-log/pdf");

        $response->assertStatus(403);
    }

    /**
     * 4. منع المشرف الإقليمي من تصدير Excel لسجل مدرسة خارج محافظته (403)
     */
    public function test_regional_supervisor_forbidden_to_export_excel_for_school_of_other_governorate(): void
    {
        Sanctum::actingAs($this->supervisorAmana, ['*']);

        $response = $this->getJson("/api/v1/schools/{$this->schoolTaiz->school_id}/tracking-log/excel");

        $response->assertStatus(403);
    }

    /**
     * 5. نجاح إضافة مذكرة إشرافية ومذكرة تصحيحية ضمن النطاق الجغرافي وتوثيقها في audit_logs (FR-SUP-16 & NFR-INT-02)
     */
    public function test_supervisor_can_add_memo_with_full_context_and_corrective_memo_type(): void
    {
        Sanctum::actingAs($this->supervisorAmana, ['*']);

        // جلب أو إنشاء تقرير ومحاولة تسليم لربط المذكرة بها
        $eval = Evaluation::firstOrCreate(
            [
                'school_id' => $this->schoolAmana->school_id,
                'cycle_id' => $this->cycle->cycle_id,
            ],
            [
                'status' => 'Submitted',
                'created_by_user_id' => $this->supervisorAmana->user_id,
            ]
        );
        $report = Report::firstOrCreate(
            ['evaluation_id' => $eval->evaluation_id],
            ['report_type' => 'evaluation', 'status' => 'Draft', 'generated_at' => now()]
        );
        $submission = EvaluationSubmission::firstOrCreate(
            ['report_id' => $report->report_id, 'attempt_no' => 1],
            [
                'submitted_by_user_id' => $this->supervisorAmana->user_id,
                'status' => 'Submitted',
                'submitted_at' => Carbon::now(),
            ]
        );
        $completionRequest = CompletionRequest::firstOrCreate(
            ['submission_id' => $submission->submission_id],
            [
                'issued_by_user_id' => $this->supervisorAmana->user_id,
                'completion_deadline' => Carbon::now()->addDays(14),
                'status' => 'Open',
            ]
        );

        $payload = [
            'memoType' => 'مذكرة تصحيحية / تعقيبية',
            'subject' => 'تصحيح إجرائي لملاحظة زيارة سابقة',
            'details' => 'إلحاقاً بالزيارة الميدانية المؤرخة، نوضح أنه تم استيفاء محضر مجلس الآباء.',
            'cycle_id' => $this->cycle->cycle_id,
            'submission_id' => $submission->submission_id,
            'completion_request_id' => $completionRequest->request_id,
            'isVisibleToSchool' => true,
        ];

        $response = $this->postJson("/api/v1/schools/{$this->schoolAmana->school_id}/supervisor-notes", $payload);

        $response->assertStatus(200)
            ->assertJsonPath('data.memoType', 'مذكرة تصحيحية / تعقيبية')
            ->assertJsonPath('data.subject', 'تصحيح إجرائي لملاحظة زيارة سابقة')
            ->assertJsonPath('data.isVisibleToSchool', true);

        // التأكد من الحفظ في قاعدة البيانات
        $this->assertDatabaseHas('supervisor_notes', [
            'school_id' => $this->schoolAmana->school_id,
            'cycle_id' => $this->cycle->cycle_id,
            'submission_id' => $submission->submission_id,
            'completion_request_id' => $completionRequest->request_id,
            'memo_type' => 'مذكرة تصحيحية / تعقيبية',
            'subject' => 'تصحيح إجرائي لملاحظة زيارة سابقة',
        ]);

        // التأكد من تدوين العملية في سجل التدقيق الأمني (NFR-INT-02)
        $this->assertDatabaseHas('audit_logs', [
            'school_id' => $this->schoolAmana->school_id,
            'action' => 'supervisor_note.created',
            'target_type' => SupervisorNote::class,
        ]);
    }

    /**
     * 6. التحقق من احتواء استجابة سجل المتابعة على KPIs وانتقال الحالات (State Transitions)
     */
    public function test_tracking_log_returns_kpis_and_state_transitions(): void
    {
        Sanctum::actingAs($this->supervisorAmana, ['*']);

        $response = $this->getJson("/api/v1/schools/{$this->schoolAmana->school_id}/tracking-log");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'school',
                    'kpis' => [
                        'totalMilestones',
                        'submissionAttempts',
                        'completionRequests',
                        'memosAndVisits',
                        'currentDecision',
                    ],
                    'milestones',
                    'memos',
                    'availableSubmissions',
                    'availableCompletionRequests',
                    'availableCycles',
                ],
            ]);
    }

    /**
     * 7. التحقق من تحصين السجل وعدم وجود مسارات لحذف المذكرات (NFR-INT-02)
     */
    public function test_immutability_and_no_delete_routes_exist_for_notes(): void
    {
        Sanctum::actingAs($this->supervisorAmana, ['*']);

        // محاولة تنفيذ DELETE على مسار غير موجود
        $response = $this->deleteJson("/api/v1/schools/{$this->schoolAmana->school_id}/supervisor-notes/1");
        $this->assertTrue(in_array($response->status(), [404, 405]));
    }
}
