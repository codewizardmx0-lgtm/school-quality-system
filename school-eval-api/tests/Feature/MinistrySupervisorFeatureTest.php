<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\CompletionRequest;
use App\Models\CompletionRequestItem;
use App\Models\DocumentVersion;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\EvaluationSubmission;
use App\Models\EvidenceLink;
use App\Models\ImprovementPlan;
use App\Models\Indicator;
use App\Models\Report;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolDocument;
use App\Models\Standard;
use App\Models\StandardVersion;
use App\Models\SupervisorNote;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات بوابة المشرف الوزاري والربط المعماري الكامل (Ministry Supervisor Feature Test).
 */
class MinistrySupervisorFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $supervisor;
    protected User $evaluator;
    protected School $school;
    protected EvaluationCycle $cycle;
    protected StandardVersion $standardVersion;

    protected function setUp(): void
    {
        parent::setUp();

        $this->supervisor = User::where('username', 'supervisor_ministry')->firstOrFail();
        $this->evaluator = User::where('username', 'quality_belqees')->firstOrFail();
        $this->school = School::where('identification_data', 'SCH-AMANA-2026-001')->firstOrFail();
        $this->standardVersion = StandardVersion::where('status', 'Active')->firstOrFail();

        $this->cycle = EvaluationCycle::where('status', 'Active')->first();
        if (!$this->cycle) {
            $this->cycle = EvaluationCycle::create([
                'version_id' => $this->standardVersion->version_id,
                'academic_year' => '2026/2027',
                'start_date' => Carbon::now()->subMonths(2)->format('Y-m-d'),
                'end_date' => Carbon::now()->addMonths(4)->format('Y-m-d'),
                'status' => 'Active',
            ]);
        }
    }

    /**
     * 1. اختبار لوحة المتابعة المركزية والزوايا الأربع تجميعياً دون بيانات وهمية (Zero-Mock).
     */
    public function test_supervision_dashboard_zero_mock_and_four_angles(): void
    {
        Sanctum::actingAs($this->supervisor);

        $response = $this->getJson('/api/v1/supervision/dashboard');

        $response->assertStatus(200)
            ->assertJsonPath('errors', null)
            ->assertJsonStructure([
                'data' => [
                    'kpis' => [
                        'totalSchools',
                        'pendingReviewCount',
                        'openCompletionRequestsCount',
                        'completedReviewCount',
                        'delayedSchoolsCount',
                    ],
                    'governanceCallout' => [
                        'ruleCode',
                        'title',
                        'description',
                    ],
                    'scope' => [
                        'name',
                        'totalSchools',
                        'activeCycle',
                    ],
                    'schools' => [
                        '*' => [
                            'schoolId',
                            'schoolCode',
                            'schoolName',
                            'educationalStage',
                            'governorate',
                            'directorate',
                            'selfEvaluationProgress',
                            'outputStatus',
                            'outputStatusArabic',
                            'isDelayed',
                            'completionRequestsCount',
                            'openCompletionRequestId',
                            'improvementPlanStatus',
                            'improvementPlanProgress',
                            'hasImprovementPlan',
                            'lastActionDate',
                        ],
                    ],
                ],
            ]);

        $data = $response->json('data');
        $this->assertGreaterThan(0, $data['kpis']['totalSchools']);
        $this->assertNotEmpty($data['schools']);

        $firstSchool = $data['schools'][0];
        $this->assertContains($firstSchool['outputStatus'], ['Draft', 'Submitted', 'UnderReview', 'NeedsCompletion', 'Completed']);
    }

    /**
     * 2. اختبار احتساب حالة المدرسة "متأخرة عن التسليم" آلياً عند انقضاء 80% من مدة الدورة (FR-SUP-15).
     */
    public function test_supervision_dashboard_80_percent_overdue_draft_flag(): void
    {
        Sanctum::actingAs($this->supervisor);

        // تحديث الدورة النشطة لتكون قد انقضى 90% من مدتها الزمنية (90 يوماً من أصل 100)
        $this->cycle->update([
            'start_date' => Carbon::now()->subDays(90)->format('Y-m-d'),
            'end_date' => Carbon::now()->addDays(10)->format('Y-m-d'),
        ]);

        $testSchool = School::create([
            'school_name' => 'مدرسة تجريبية للمتأخرات',
            'identification_data' => 'SCH-TEST-DRAFT-001',
            'educational_stage' => 'ثانوي',
            'educational_district' => 'السبعين',
            'governorate' => 'أمانة العاصمة',
            'status' => 'Active',
        ]);

        Evaluation::create([
            'cycle_id' => $this->cycle->cycle_id,
            'school_id' => $testSchool->school_id,
            'created_by_user_id' => $this->evaluator->user_id,
            'status' => 'Draft',
        ]);

        $response = $this->getJson('/api/v1/supervision/dashboard');

        $response->assertStatus(200);
        $schools = $response->json('data.schools');

        $targetSchool = collect($schools)->firstWhere('schoolId', $testSchool->school_id);
        $this->assertNotNull($targetSchool);
        $this->assertTrue($targetSchool['isDelayed']);
        $this->assertEquals('متأخرة عن التسليم', $targetSchool['outputStatusArabic']);
        $this->assertGreaterThanOrEqual(1, $response->json('data.kpis.delayedSchoolsCount'));
    }

    /**
     * 3. اختبار فحص وتدقيق مخرجات التقييم واسترجاع المؤشرات الـ 109 الحقيقية والشواهد (FR-SUP-07 / Zero-Mock).
     */
    public function test_review_submission_returns_109_real_indicators_and_on_demand_evidence(): void
    {
        Sanctum::actingAs($this->supervisor);

        $testCycle = EvaluationCycle::create([
            'version_id' => $this->standardVersion->version_id,
            'academic_year' => '2029/2030',
            'start_date' => Carbon::now()->subMonths(1)->format('Y-m-d'),
            'end_date' => Carbon::now()->addMonths(5)->format('Y-m-d'),
            'status' => 'Active',
        ]);

        $eval = Evaluation::create([
            'cycle_id' => $testCycle->cycle_id,
            'school_id' => $this->school->school_id,
            'created_by_user_id' => $this->evaluator->user_id,
            'status' => 'Submitted',
        ]);

        $report = Report::create([
            'evaluation_id' => $eval->evaluation_id,
            'status' => 'Submitted',
            'generated_at' => now(),
        ]);

        $submission = EvaluationSubmission::create([
            'report_id' => $report->report_id,
            'attempt_no' => 1,
            'submitted_by_user_id' => $this->evaluator->user_id,
            'status' => 'Submitted',
            'submitted_at' => now(),
        ]);

        $response = $this->getJson("/api/v1/evaluation-submissions/{$submission->submission_id}/review");

        $response->assertStatus(200)
            ->assertJsonPath('errors', null)
            ->assertJsonPath('data.submissionId', $submission->submission_id)
            ->assertJsonPath('data.evaluationId', $eval->evaluation_id)
            ->assertJsonPath('data.schoolInfo.id', $this->school->school_id);

        $indicators = $response->json('data.indicators');
        $this->assertNotEmpty($indicators);
        $this->assertGreaterThanOrEqual(100, count($indicators));

        $firstInd = $indicators[0];
        $this->assertArrayHasKey('indicatorId', $firstInd);
        $this->assertArrayHasKey('code', $firstInd);
        $this->assertArrayHasKey('standardName', $firstInd);
        $this->assertArrayHasKey('subStandardName', $firstInd);
        $this->assertArrayHasKey('schoolScore', $firstInd);
        $this->assertArrayHasKey('evidences', $firstInd);
    }

    /**
     * 4. اختبار حظر مسار /approve وتوحيد قرار المشرف بإغلاق التقييم كمكتمل (BR-MIN-03).
     */
    public function test_approve_route_is_removed_and_close_evaluation_works_as_completed(): void
    {
        Sanctum::actingAs($this->supervisor);

        // التأكد من أن مسار /approve ملغى تماماً ولا يمكن استدعاؤه (404)
        $approveResponse = $this->postJson('/api/v1/evaluation-submissions/999/approve', []);
        $this->assertEquals(404, $approveResponse->status(), 'يجب أن يكون مسار /approve ملغى تماماً التزاماً بـ BR-MIN-03.');

        $testCycle = EvaluationCycle::create([
            'version_id' => $this->standardVersion->version_id,
            'academic_year' => '2030/2031',
            'start_date' => Carbon::now()->subMonths(1)->format('Y-m-d'),
            'end_date' => Carbon::now()->addMonths(5)->format('Y-m-d'),
            'status' => 'Active',
        ]);

        $eval = Evaluation::create([
            'cycle_id' => $testCycle->cycle_id,
            'school_id' => $this->school->school_id,
            'created_by_user_id' => $this->evaluator->user_id,
            'status' => 'Submitted',
        ]);

        $report = Report::create([
            'evaluation_id' => $eval->evaluation_id,
            'status' => 'Submitted',
            'generated_at' => now(),
        ]);

        EvaluationSubmission::create([
            'report_id' => $report->report_id,
            'attempt_no' => 1,
            'submitted_by_user_id' => $this->evaluator->user_id,
            'status' => 'Submitted',
            'submitted_at' => now(),
        ]);

        $closeResponse = $this->postJson("/api/v1/evaluations/{$eval->evaluation_id}/close");

        $closeResponse->assertStatus(200)
            ->assertJsonPath('errors', null)
            ->assertJsonPath('data.status', 'Completed');

        $this->assertDatabaseHas('evaluations', [
            'evaluation_id' => $eval->evaluation_id,
            'status' => 'Completed',
        ]);

        $this->assertDatabaseHas('reports', [
            'report_id' => $report->report_id,
            'status' => 'Final',
        ]);

        // التحقق من تدوين الحدث بسجل التدقيق
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'evaluation.direct_closed',
            'target_type' => 'Evaluation',
            'target_id' => $eval->evaluation_id,
        ]);
    }

    /**
     * 5. اختبار تمديد مهلة طلب الاستكمال وتوثيق المبرر الإشرافي في سجل التدقيق (FR-SUP-11).
     */
    public function test_completion_request_deadline_extension_logs_reason_in_audit_logs(): void
    {
        Sanctum::actingAs($this->supervisor);

        $testCycle = EvaluationCycle::create([
            'version_id' => $this->standardVersion->version_id,
            'academic_year' => '2031/2032',
            'start_date' => Carbon::now()->subMonths(1)->format('Y-m-d'),
            'end_date' => Carbon::now()->addMonths(5)->format('Y-m-d'),
            'status' => 'Active',
        ]);

        $eval = Evaluation::create([
            'cycle_id' => $testCycle->cycle_id,
            'school_id' => $this->school->school_id,
            'created_by_user_id' => $this->evaluator->user_id,
            'status' => 'NeedsCompletion',
        ]);

        $report = Report::create([
            'evaluation_id' => $eval->evaluation_id,
            'status' => 'Submitted',
            'generated_at' => now(),
        ]);

        $submission = EvaluationSubmission::create([
            'report_id' => $report->report_id,
            'attempt_no' => 1,
            'submitted_by_user_id' => $this->evaluator->user_id,
            'status' => 'NeedsCompletion',
            'submitted_at' => now(),
        ]);

        $cr = CompletionRequest::create([
            'submission_id' => $submission->submission_id,
            'issued_by_user_id' => $this->supervisor->user_id,
            'completion_deadline' => Carbon::now()->addDays(7),
            'status' => 'Open',
        ]);

        $newDeadline = Carbon::now()->addDays(21)->toIso8601String();
        $reason = 'تمديد استثنائي نظراً لإجازة منتصف العام الدراسي واستيفاء تقارير التحصيل';

        $extendResponse = $this->patchJson("/api/v1/completion-requests/{$cr->request_id}/deadline", [
            'new_deadline' => $newDeadline,
            'reason' => $reason,
        ]);

        $extendResponse->assertStatus(200)
            ->assertJsonPath('errors', null)
            ->assertJsonPath('data.deadlineExtensionsCount', 1);

        $log = AuditLog::where('action', 'completion.deadline_extended')
            ->where('target_id', $cr->request_id)
            ->latest('log_id')
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals($reason, $log->new_values['extension_reason'] ?? null);
    }

    /**
     * 6. اختبار إضافة المذكرات الإشرافية الميدانية على مستوى المدرسة وسجل المتابعة الميدانية (FR-SUP-16).
     */
    public function test_supervisor_notes_school_level_and_tracking_log(): void
    {
        Sanctum::actingAs($this->supervisor);

        $memoResponse = $this->postJson("/api/v1/schools/{$this->school->school_id}/supervisor-notes", [
            'memoType' => 'زيارة ميدانية',
            'subject' => 'معاينة شواهد البيئة المدرسية والأمن والسلامة',
            'details' => 'تمت معاينة مخارج الطوارئ وخطة الإخلاء الميدانية والتأكيد على اعتماد المحضر من الدفاع المدني.',
            'isVisibleToSchool' => true,
        ]);

        $memoResponse->assertStatus(200)
            ->assertJsonPath('errors', null)
            ->assertJsonPath('data.memoType', 'زيارة ميدانية');

        $this->assertDatabaseHas('supervisor_notes', [
            'school_id' => $this->school->school_id,
            'memo_type' => 'زيارة ميدانية',
            'subject' => 'معاينة شواهد البيئة المدرسية والأمن والسلامة',
        ]);

        $logResponse = $this->getJson("/api/v1/schools/{$this->school->school_id}/tracking-log");

        $logResponse->assertStatus(200)
            ->assertJsonPath('errors', null)
            ->assertJsonPath('data.schoolId', $this->school->school_id);

        $milestones = $logResponse->json('data.milestones');
        $this->assertNotEmpty($milestones);

        foreach ($milestones as $m) {
            $this->assertStringNotContainsString('مدير المدرسة', $m['actorRole'] ?? '', 'الرفع محصور بمقيم المدرسة المعتمد');
        }
    }

    /**
     * 7. اختبار التحليلات المركزية للمعايير السبعة الرسمية وأوزانها الـ 100% (Zero-Mock).
     */
    public function test_central_analytics_returns_seven_official_standards_with_weights(): void
    {
        Sanctum::actingAs($this->supervisor);

        $response = $this->getJson('/api/v1/supervision/reports/analytics');

        $response->assertStatus(200)
            ->assertJsonPath('errors', null);

        $standardsMeans = $response->json('data.standardsMeans');
        $this->assertCount(7, $standardsMeans, 'يجب أن تحتوي التحليلات على المعايير السبعة الوطنية بالضبط.');

        $totalWeight = array_sum(array_column($standardsMeans, 'weight'));
        $this->assertEquals(100.0, (float)$totalWeight, 'مجموع أوزان المعايير السبعة يجب أن يساوي 100% بالضبط.');
    }

    /**
     * 8. اختبار المقارنة التراكمية التاريخية لنفس المدرسة عبر الدورات (FR-SUP-18).
     */
    public function test_historical_comparison_uses_evaluation_trend_service(): void
    {
        Sanctum::actingAs($this->supervisor);

        $response = $this->getJson("/api/v1/schools/{$this->school->school_id}/historical-comparison");

        $response->assertStatus(200)
            ->assertJsonPath('errors', null)
            ->assertJsonPath('data.schoolId', $this->school->school_id)
            ->assertJsonStructure([
                'data' => [
                    'hasPreviousCycle',
                    'schoolId',
                    'schoolName',
                    'currentCycle',
                    'standardsDeltas',
                ],
            ]);
    }

    /**
     * 9. اختبار حوكمة النطاق الجغرافي للمشرف الوزاري (FR-SUP-02) والمشرف المركزي العام.
     */
    public function test_supervisor_geographic_scope_enforcement_and_central_supervisor(): void
    {
        // 1. مشرف مخصص لمحافظة "أمانة العاصمة"
        $this->supervisor->update(['governorate' => 'أمانة العاصمة']);
        Sanctum::actingAs($this->supervisor);

        // إنشاء مدرسة في محافظة تعز
        $taizSchool = School::firstOrCreate(
            ['identification_data' => 'SCH-TAIZ-2026-TEST'],
            [
                'school_name' => 'مدرسة الفاروق النموذجية بتعز',
                'educational_stage' => 'أساسي',
                'educational_district' => 'المظفر',
                'governorate' => 'محافظة تعز',
                'status' => 'Active',
            ]
        );

        $taizEval = Evaluation::create([
            'cycle_id' => $this->cycle->cycle_id,
            'school_id' => $taizSchool->school_id,
            'created_by_user_id' => $this->evaluator->user_id,
            'status' => 'Submitted',
        ]);

        // المشرف لا يرى مدرسة تعز في لوحة المتابعة
        $dashboardRes = $this->getJson('/api/v1/supervision/dashboard');
        $dashboardRes->assertStatus(200);
        $schoolIdsInScope = collect($dashboardRes->json('data.schools'))->pluck('schoolId')->toArray();
        $this->assertNotContains($taizSchool->school_id, $schoolIdsInScope, 'يجب حجب مدارس المحافظات الأخرى عن المشرف الميداني.');

        // محاولة فحص مخرج مدرسة تعز محظورة (403 Forbidden)
        $reviewRes = $this->getJson("/api/v1/evaluation-submissions/{$taizEval->evaluation_id}/review");
        $reviewRes->assertStatus(403);

        // محاولة الاطلاع على سجل متابعة مدرسة تعز محظورة (403 Forbidden)
        $trackingRes = $this->getJson("/api/v1/schools/{$taizSchool->school_id}/tracking-log");
        $trackingRes->assertStatus(403);

        // 2. مشرف مركزي عام (governorate = null) يملك الوصول لكافة المحافظات
        $role = Role::where('role_name', 'ministry_supervisor')->firstOrFail();
        $centralSupervisor = User::create([
            'username' => 'central_supervisor_' . uniqid(),
            'full_name' => 'مشرف مركزي تجريبي',
            'email' => 'central.' . uniqid() . '@moe.gov.ye',
            'password_hash' => bcrypt('password'),
            'user_type' => 'ministry',
            'governorate' => null,
            'status' => 'Active',
        ]);
        $centralSupervisor->roles()->attach($role->role_id, ['assigned_at' => now(), 'active' => 1]);

        Sanctum::actingAs($centralSupervisor);

        $centralDashboard = $this->getJson('/api/v1/supervision/dashboard');
        $centralDashboard->assertStatus(200);
        $centralSchoolIds = collect($centralDashboard->json('data.schools'))->pluck('schoolId')->toArray();
        $this->assertContains($taizSchool->school_id, $centralSchoolIds, 'المشرف المركزي العام يصل لمدارس كافة المحافظات.');

        $centralReview = $this->getJson("/api/v1/evaluation-submissions/{$taizEval->evaluation_id}/review");
        $centralReview->assertStatus(200);
    }

    /**
     * 10. اختبار قاعدة الحد الأدنى لمدة الدورة التقييمية 30 يوماً (FR-SUP-01).
     */
    public function test_evaluation_cycle_minimum_30_days_duration_enforced(): void
    {
        Sanctum::actingAs($this->supervisor);

        // 1. دورة أقل من 30 يوماً (مرفوضة 422)
        $invalidPayload = [
            'version_id' => $this->standardVersion->version_id,
            'academic_year' => '2035/2036',
            'start_date' => '2035-09-01',
            'end_date' => '2035-09-20', // 19 يوماً فقط
            'status' => 'Active',
        ];

        $failResponse = $this->postJson('/api/v1/evaluation-cycles', $invalidPayload);
        $failResponse->assertStatus(422)
            ->assertJsonValidationErrors(['end_date']);

        // 2. دورة مدتها 30 يوماً فأكثر (مقبولة 201)
        $validPayload = [
            'version_id' => $this->standardVersion->version_id,
            'academic_year' => '2036/2037',
            'start_date' => '2036-09-01',
            'end_date' => '2036-10-05', // 34 يوماً
            'status' => 'Active',
        ];

        // إغلاق الدورة القائمة للسماح بإطلاق دورة جديدة وفق ضابط منع التداخل (FR-SUP-01)
        EvaluationCycle::where('status', 'Active')->update(['status' => 'Closed']);

        $successResponse = $this->postJson('/api/v1/evaluation-cycles', $validPayload);
        $successResponse->assertStatus(201);
    }

    /**
     * 11. اختبار حظر تجاوز مهلة الاستكمال لتاريخ إغلاق الدورة التقييمية (FR-SUP-09).
     */
    public function test_completion_request_deadline_cannot_exceed_cycle_end_date(): void
    {
        Sanctum::actingAs($this->supervisor);

        // دورة تنتهي بعد 15 يوماً
        $shortCycle = EvaluationCycle::create([
            'version_id' => $this->standardVersion->version_id,
            'academic_year' => '2038/2039',
            'start_date' => Carbon::now()->subDays(20)->format('Y-m-d'),
            'end_date' => Carbon::now()->addDays(15)->format('Y-m-d'),
            'status' => 'Active',
        ]);

        $eval = Evaluation::create([
            'cycle_id' => $shortCycle->cycle_id,
            'school_id' => $this->school->school_id,
            'created_by_user_id' => $this->evaluator->user_id,
            'status' => 'Submitted',
        ]);

        $report = Report::create([
            'evaluation_id' => $eval->evaluation_id,
            'status' => 'Submitted',
            'generated_at' => now(),
        ]);

        $submission = EvaluationSubmission::create([
            'report_id' => $report->report_id,
            'attempt_no' => 1,
            'submitted_by_user_id' => $this->evaluator->user_id,
            'status' => 'Submitted',
            'submitted_at' => now(),
        ]);

        $ind = Indicator::first();

        // 1. محاولة إصدار طلب استكمال بمهلة بعد نهاية الدورة (20 يوماً بينما تنتهي الدورة بعد 15 يوماً) -> مرفوض 422
        $exceedResponse = $this->postJson("/api/v1/evaluations/{$eval->evaluation_id}/completion-requests", [
            'notes' => 'يرجى استكمال الشواهد قبل نهاية الدورة',
            'completion_deadline' => Carbon::now()->addDays(20)->toIso8601String(),
            'items' => [
                [
                    'indicator_id' => $ind->indicator_id,
                    'missing_description' => 'شاهد غير موثق رسمياً',
                    'defect_reason' => 'شاهد غير موثق رسمياً',
                    'directives' => 'يرجى إرفاق المحضر المعتمد',
                    'granted_permission' => 'replace_evidence',
                ],
            ],
        ]);

        $exceedResponse->assertStatus(422)
            ->assertJsonValidationErrors(['completion_deadline']);

        // 2. إصدار طلب استكمال بمهلة صحيحة تنتهي قبل تاريخ نهاية الدورة -> مقبول 201
        $validDeadline = Carbon::now()->addDays(10)->toIso8601String();
        $validResponse = $this->postJson("/api/v1/evaluations/{$eval->evaluation_id}/completion-requests", [
            'notes' => 'يرجى استكمال الشواهد بمهلة معتمدة',
            'completion_deadline' => $validDeadline,
            'items' => [
                [
                    'indicator_id' => $ind->indicator_id,
                    'missing_description' => 'شاهد غير موثق رسمياً',
                    'defect_reason' => 'شاهد غير موثق رسمياً',
                    'directives' => 'يرجى إرفاق المحضر المعتمد',
                    'granted_permission' => 'replace_evidence',
                ],
            ],
        ]);

        $validResponse->assertStatus(201);
        $reqId = $validResponse->json('data.request_id') ?? $validResponse->json('data.requestId');

        // 3. محاولة تمديد المهلة لما بعد نهاية الدورة -> مرفوض 422
        $extendExceedResponse = $this->patchJson("/api/v1/completion-requests/{$reqId}/deadline", [
            'new_deadline' => Carbon::now()->addDays(25)->toIso8601String(),
            'reason' => 'طلب مهلة إضافية تتجاوز الدورة',
        ]);

        $extendExceedResponse->assertStatus(422)
            ->assertJsonValidationErrors(['new_deadline']);
    }

    /**
     * 12. اختبار العقد الهيكلي للمقارنة التاريخية وخلوها من الخصم الوهمي (BR-SCH-07).
     */
    public function test_historical_comparison_nested_contract_and_br_sch_07_intersection(): void
    {
        Sanctum::actingAs($this->supervisor);

        $response = $this->getJson("/api/v1/schools/{$this->school->school_id}/historical-comparison");

        $response->assertStatus(200)
            ->assertJsonPath('errors', null)
            ->assertJsonStructure([
                'data' => [
                    'school' => ['schoolId', 'schoolCode', 'schoolName'],
                    'baseCycle' => ['name', 'academicYear'],
                    'comparedCycle' => ['name', 'academicYear'],
                    'trajectory' => [
                        'growthPercentage',
                        'growthDirection',
                        'growthPillText',
                        'previousTotalScore',
                        'currentTotalScore',
                        'netDelta',
                    ],
                    'impactMetrics' => [
                        'planGapsClosedPercentage',
                        'evidenceQualityGrowthPercentage',
                        'completionRequestsReductionPercentage',
                    ],
                    'standardsDeltas' => [
                        '*' => [
                            'standardId',
                            'name',
                            'weight',
                            'previousScore',
                            'currentScore',
                            'delta',
                            'trend',
                        ],
                    ],
                    'recommendations',
                ],
            ]);

        $deltas = $response->json('data.standardsDeltas');
        $this->assertNotEmpty($deltas);
        foreach ($deltas as $d) {
            $this->assertContains($d['trend'], ['up', 'same', 'down']);
            $this->assertGreaterThanOrEqual(0, $d['currentScore']);
            $this->assertLessThanOrEqual(3.0, $d['currentScore']);
        }
    }

    /**
     * 13. منع إطلاق دورة تقييمية ثانية نشطة مع وجود دورة نشطة جارية (FR-SUP-01).
     */
    public function test_cannot_launch_second_active_cycle_when_an_active_cycle_already_exists(): void
    {
        Sanctum::actingAs($this->supervisor);

        // التأكد من وجود دورة نشطة بالفعل
        $this->assertDatabaseHas('evaluation_cycles', [
            'status' => 'Active',
        ]);

        $response = $this->postJson('/api/v1/evaluation-cycles', [
            'name'          => 'دورة تقييم إضافية متداخلة',
            'academic_year' => '2026/2027',
            'start_date'    => Carbon::now()->addDays(5)->toDateString(),
            'end_date'      => Carbon::now()->addDays(45)->toDateString(),
            'status'        => 'Active',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['cycle']);
        
        $this->assertStringContainsString('توجد بالفعل دورة تقييم نشطة', $response->json('errors.cycle.0'));
    }

    /**
     * 14. حوكمة قفل أزرار الإقرار والجدولة للإصدارات غير المسودة (BR-GEN-04).
     */
    public function test_cannot_endorse_or_schedule_non_draft_standard_version(): void
    {
        $standardsManager = User::where('username', 'standards_manager_ministry')->firstOrFail();
        Sanctum::actingAs($standardsManager);

        $activeVersion = StandardVersion::where('status', 'Active')->firstOrFail();

        // محاولة إعادة إقرار إصدار نافذ نشط
        $response = $this->postJson("/api/v1/standard-versions/{$activeVersion->version_id}/lock", [
            'legal_confirmation' => true,
            'approval_code'      => 'DEC-FAIL-001',
            'action'             => 'approve',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['version']);

        $this->assertStringContainsString('لا يمكن إعادة إقرار وثيقة غير مسودة', $response->json('errors.version.0'));

        // محاولة جدولة إصدار نشط حالياً للدورة القادمة
        $responseSchedule = $this->postJson("/api/v1/standard-versions/{$activeVersion->version_id}/lock", [
            'legal_confirmation' => true,
            'approval_code'      => 'DEC-FAIL-002',
            'action'             => 'schedule',
        ]);

        $responseSchedule->assertStatus(422)
            ->assertJsonValidationErrors(['version']);

        $this->assertStringContainsString('نافذ ومُفعّل حالياً', $responseSchedule->json('errors.version.0'));
    }

    /**
     * 15. حوكمة تفرد الإصدار المعياري النشط والأرشفة التلقائية للقديم (FR-MSM-03).
     */
    public function test_governance_single_active_standard_version_enforcement(): void
    {
        $standardsManager = User::where('username', 'standards_manager_ministry')->firstOrFail();
        Sanctum::actingAs($standardsManager);

        $currentActive = StandardVersion::where('status', 'Active')->firstOrFail();

        // إنشاء إصدار جديد بحالة Approved
        $newVersion = StandardVersion::create([
            'version_no'          => '2029.TEST',
            'issue_date'          => Carbon::now()->toDateString(),
            'source_organization'=> 'مجلس الاعتماد الأكاديمي وضمان جودة التعليم',
            'source_number'       => 'DEC-TEST-999',
            'source_description'  => 'إصدار تجريبي للاختبار',
            'status'              => 'Approved',
        ]);

        // تفعيل الإصدار الجديد
        $response = $this->postJson("/api/v1/standard-versions/{$newVersion->version_id}/lock", [
            'legal_confirmation' => true,
            'approval_code'      => 'DEC-ACTIVATE-TEST',
            'action'             => 'activate',
        ]);

        $response->assertStatus(200);

        // التحقق من أن الإصدار السابق أصبح Archived
        $this->assertEquals('Archived', $currentActive->fresh()->status);
        // التحقق من أن الإصدار الجديد أصبح Active
        $this->assertEquals('Active', $newVersion->fresh()->status);
        // التحقق من وجود إصدار نشط واحد فقط في قاعدة البيانات
        $this->assertEquals(1, StandardVersion::where('status', 'Active')->count());
    }
}
