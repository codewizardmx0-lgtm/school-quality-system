<?php

namespace Tests\Feature;

use App\Models\CompletionRequest;
use App\Models\CompletionRequestItem;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\EvaluationSubmission;
use App\Models\Indicator;
use App\Models\Report;
use App\Models\Role;
use App\Models\School;
use App\Models\Standard;
use App\Models\StandardVersion;
use App\Models\SubStandard;
use App\Models\SupervisionDeficiencyNote;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * فحص وتدقيق مركز استلام ومراجعة المخرجات وحوكمة القرارات الإشرافية (الشاشة 4).
 * يغطي:
 * 1. منع المشرف الجغرافي من إغلاق تقييم مدرسة خارج محافظته (403 Forbidden).
 * 2. حفظ واسترجاع تصنيفات وملاحظات النواقص من قاعدة البيانات (FR-SUP-04).
 * 3. حوكمة حالة الاستكمال (NeedsCompletion) وإعادة فتح وضع المراجعة بعد إعادة الرفع.
 * 4. استرجاع قائمة المخرجات المتاحة للمراجعة بحسب النطاق الجغرافي.
 */
class SubmissionReviewWorkflowFeatureTest extends TestCase
{
    use DatabaseTransactions;

    private User $centralSupervisor;
    private User $taizSupervisor;
    private School $sanaSchool;
    private School $taizSchool;
    private EvaluationCycle $cycle;
    private StandardVersion $version;
    private Indicator $indicator;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::where('role_name', 'ministry_supervisor')->firstOrFail();

        $this->centralSupervisor = User::create([
            'username' => 'central_sup_' . uniqid(),
            'full_name' => 'مشرف مركزي عام',
            'email' => 'central_' . uniqid() . '@moe.gov.ye',
            'password_hash' => bcrypt('password'),
            'user_type' => 'ministry',
            'governorate' => null,
            'status' => 'Active',
        ]);
        $this->centralSupervisor->roles()->attach($role->role_id, ['assigned_at' => now(), 'active' => 1]);

        $this->taizSupervisor = User::create([
            'username' => 'taiz_sup_' . uniqid(),
            'full_name' => 'مشرف محافظة تعز',
            'email' => 'taiz_' . uniqid() . '@moe.gov.ye',
            'password_hash' => bcrypt('password'),
            'user_type' => 'ministry',
            'governorate' => 'محافظة تعز',
            'status' => 'Active',
        ]);
        $this->taizSupervisor->roles()->attach($role->role_id, ['assigned_at' => now(), 'active' => 1]);

        $this->sanaSchool = School::firstOrCreate(
            ['identification_data' => 'SCH-SANA-' . uniqid()],
            [
                'school_name' => 'مدرسة العاصمة النموذجية',
                'educational_stage' => 'أساسي',
                'educational_district' => 'السبعين',
                'governorate' => 'أمانة العاصمة',
                'status' => 'Active',
            ]
        );

        $this->taizSchool = School::firstOrCreate(
            ['identification_data' => 'SCH-TAIZ-' . uniqid()],
            [
                'school_name' => 'مدرسة تعز النموذجية',
                'educational_stage' => 'أساسي',
                'educational_district' => 'المظفر',
                'governorate' => 'محافظة تعز',
                'status' => 'Active',
            ]
        );

        $this->version = StandardVersion::where('status', 'Active')->first()
            ?? StandardVersion::firstOrCreate(['version_number' => '2026.1'], [
                'title' => 'المعايير الوطنية المحدثة 2026',
                'status' => 'Active',
                'created_by' => $this->centralSupervisor->user_id,
            ]);

        $standard = Standard::where('version_id', $this->version->version_id)->first();
        if (!$standard) {
            $standard = Standard::create([
                'version_id' => $this->version->version_id,
                'code' => 'STD-REV-1',
                'name' => 'معيار القيادة المدرسية',
                'weight' => 20,
            ]);
        }

        $subStandard = SubStandard::where('standard_id', $standard->standard_id)->first();
        if (!$subStandard) {
            $subStandard = SubStandard::create([
                'standard_id' => $standard->standard_id,
                'code' => 'SUB-REV-1',
                'name' => 'التخطيط الاستراتيجي',
            ]);
        }

        $this->indicator = Indicator::where('sub_standard_id', $subStandard->sub_standard_id)->first();
        if (!$this->indicator) {
            $this->indicator = Indicator::create([
                'sub_standard_id' => $subStandard->sub_standard_id,
                'code' => 'IND-REV-01',
                'title' => 'تمتلك المدرسة خطة تشغيلية واضحة وموثقة',
            ]);
        }

        $this->cycle = EvaluationCycle::where('status', 'Active')->first();
        if (!$this->cycle) {
            $this->cycle = EvaluationCycle::create([
                'version_id' => $this->version->version_id,
                'academic_year' => '2026/2027',
                'name' => 'الدورة المركزية الشاملة 2026',
                'start_date' => Carbon::now()->subDays(10)->toDateString(),
                'end_date' => Carbon::now()->addDays(50)->toDateString(),
                'status' => 'Active',
                'created_by_user_id' => $this->centralSupervisor->user_id,
            ]);
        }
    }

    private function createEvaluationWithSubmission(School $school, string $status = 'Submitted', int $attemptNo = 1): array
    {
        $evaluation = Evaluation::create([
            'school_id' => $school->school_id,
            'cycle_id' => $this->cycle->cycle_id,
            'status' => $status,
            'created_by' => $this->centralSupervisor->user_id,
            'created_by_user_id' => $this->centralSupervisor->user_id,
        ]);

        $report = Report::create([
            'evaluation_id' => $evaluation->evaluation_id,
            'status' => ($status === 'Completed') ? 'Final' : 'Draft',
            'generated_at' => now(),
            'created_by_user_id' => $this->centralSupervisor->user_id,
        ]);

        $submission = EvaluationSubmission::create([
            'report_id' => $report->report_id,
            'submitted_by_user_id' => $this->centralSupervisor->user_id,
            'attempt_no' => $attemptNo,
            'status' => $status,
            'submitted_at' => now(),
        ]);

        EvaluationResult::firstOrCreate([
            'evaluation_id' => $evaluation->evaluation_id,
            'indicator_id' => $this->indicator->indicator_id,
        ], [
            'score_descriptor_id' => 1,
            'standard_version_id' => $this->version->version_id,
            'evaluator_user_id' => $this->centralSupervisor->user_id,
            'score' => 2,
            'completion_status' => 'Completed',
            'justification' => 'تم استيفاء متطلبات التخطيط جزئياً.',
        ]);

        return [$evaluation, $report, $submission];
    }

    /**
     * 1. منع المشرف الجغرافي من إغلاق تقييم مدرسة خارج محافظته (403 Forbidden).
     */
    public function test_geographic_supervisor_forbidden_from_closing_evaluation_outside_governorate(): void
    {
        [$sanaEval] = $this->createEvaluationWithSubmission($this->sanaSchool, 'Submitted');

        // مشرف تعز يحاول إغلاق تقييم مدرسة في أمانة العاصمة
        Sanctum::actingAs($this->taizSupervisor);
        $response = $this->postJson("/api/v1/evaluations/{$sanaEval->evaluation_id}/close", [
            'notes' => 'محاولة إغلاق غير مصرح بها',
        ]);

        $response->assertStatus(403);
        $this->assertStringContainsString('غير مصرح', $response->json('message'));
        $this->assertEquals('Submitted', $sanaEval->fresh()->status);

        // المشرف المركزي العام يمكنه إغلاق التقييم بنجاح
        Sanctum::actingAs($this->centralSupervisor);
        $closeResponse = $this->postJson("/api/v1/evaluations/{$sanaEval->evaluation_id}/close", [
            'notes' => 'إغلاق المراجعة الإشرافية بنجاح واكتمال الملف',
        ]);

        $closeResponse->assertStatus(200);
        $this->assertEquals('Completed', $sanaEval->fresh()->status);
    }

    /**
     * 2. حفظ واسترجاع تصنيفات وملاحظات النقص في قاعدة البيانات (FR-SUP-04).
     */
    public function test_save_and_retrieve_deficiency_notes_database_persistence(): void
    {
        [$eval, , $submission] = $this->createEvaluationWithSubmission($this->sanaSchool, 'UnderReview');

        Sanctum::actingAs($this->centralSupervisor);

        // حفظ رصد نقص لمؤشر
        $saveResponse = $this->postJson("/api/v1/evaluation-submissions/{$submission->submission_id}/deficiency-notes", [
            'indicator_id' => $this->indicator->indicator_id,
            'deficiency_category' => 'نقص الشواهد الإلزامية المطلوبة في أداة التحقق',
            'supervisor_note' => 'الخطة التشغيلية ينقصها محضر اعتماد مجلس الإدارة وتواقيع الفريق.',
            'directives' => 'يرجى إرفاق المحضر الرسمي ومصفوفة المؤشرات قبل المهلة.',
        ]);

        $saveResponse->assertStatus(200);
        $this->assertDatabaseHas('supervision_deficiency_notes', [
            'evaluation_id' => $eval->evaluation_id,
            'indicator_id' => $this->indicator->indicator_id,
            'deficiency_category' => 'نقص الشواهد الإلزامية المطلوبة في أداة التحقق',
        ]);

        // استرجاع المراجعة والتأكد من إرفاق النقص بالمؤشر
        $reviewResponse = $this->getJson("/api/v1/evaluation-submissions/{$submission->submission_id}/review");

        $reviewResponse->assertStatus(200);
        $indData = collect($reviewResponse->json('data.indicators'))->firstWhere('indicatorId', $this->indicator->indicator_id);
        $this->assertNotNull($indData);
        $this->assertTrue($indData['hasDefect']);
        $this->assertEquals('نقص الشواهد الإلزامية المطلوبة في أداة التحقق', $indData['defectCategory']);
        $this->assertEquals('الخطة التشغيلية ينقصها محضر اعتماد مجلس الإدارة وتواقيع الفريق.', $indData['defectReason']);

        // حذف رصد النقص
        $deleteResponse = $this->deleteJson("/api/v1/evaluation-submissions/{$submission->submission_id}/deficiency-notes/{$this->indicator->indicator_id}");

        $deleteResponse->assertStatus(200);
        $this->assertDatabaseMissing('supervision_deficiency_notes', [
            'evaluation_id' => $eval->evaluation_id,
            'indicator_id' => $this->indicator->indicator_id,
        ]);
    }

    /**
     * 3. حوكمة حالة الاستكمال (NeedsCompletion) وإعادة فتح وضع المراجعة بعد إعادة الرفع.
     */
    public function test_completion_request_state_governance_and_resubmission_rereview(): void
    {
        [$eval, $report, $submission] = $this->createEvaluationWithSubmission($this->sanaSchool, 'UnderReview', 1);

        // إصدار طلب استكمال
        $completion = CompletionRequest::create([
            'submission_id' => $submission->submission_id,
            'issued_by_user_id' => $this->centralSupervisor->user_id,
            'notes' => 'يوجد نقص في شواهد الخطة ومحاضر الاجتماعات',
            'completion_deadline' => Carbon::now()->addDays(14)->toDateString(),
            'status' => 'Open',
        ]);

        CompletionRequestItem::create([
            'request_id' => $completion->request_id,
            'indicator_id' => $this->indicator->indicator_id,
            'missing_description' => 'إرفاق محضر مجلس الآباء المعتمد',
            'status' => 'Open',
        ]);

        $eval->update(['status' => 'NeedsCompletion']);
        $submission->update(['status' => 'NeedsCompletion']);

        Sanctum::actingAs($this->centralSupervisor);

        // فحص مراجعة المخرج بحالة الاستكمال المفتوح
        $reviewNeedsCompletion = $this->getJson("/api/v1/evaluation-submissions/{$submission->submission_id}/review");

        $reviewNeedsCompletion->assertStatus(200);
        $this->assertEquals('NeedsCompletion', $reviewNeedsCompletion->json('data.status'));
        $this->assertNotNull($reviewNeedsCompletion->json('data.openCompletionRequest'));
        $this->assertGreaterThanOrEqual(13, $reviewNeedsCompletion->json('data.openCompletionRequest.daysRemaining'));

        // محاولة الإغلاق المباشر يجب أن تُرفض لوجود حالة NeedsCompletion
        $closeAttempt = $this->postJson("/api/v1/evaluations/{$eval->evaluation_id}/close", ['notes' => 'محاولة إغلاق غير مصرح']);

        $closeAttempt->assertStatus(422);

        // المدرسة تستكمل المتطلبات وترفع محاولة جديدة (attempt_no = 2) بحالة Submitted
        $eval->update(['status' => 'Submitted']);
        $submission2 = EvaluationSubmission::create([
            'report_id' => $report->report_id,
            'submitted_by_user_id' => $this->centralSupervisor->user_id,
            'attempt_no' => 2,
            'status' => 'Submitted',
            'submitted_at' => now(),
        ]);

        // فحص مراجعة المخرج بعد إعادة الرفع: تعود الشاشة لوضع المراجعة الفعّال مع وسم إعادة المراجعة
        $reviewReSubmitted = $this->getJson("/api/v1/evaluation-submissions/{$submission2->submission_id}/review");

        $reviewReSubmitted->assertStatus(200);
        $this->assertEquals('Submitted', $reviewReSubmitted->json('data.status'));
        $this->assertTrue($reviewReSubmitted->json('data.isReReview'));
        $this->assertEquals(2, $reviewReSubmitted->json('data.attemptNo'));

        // الآن يمكن للمشرف إغلاق المراجعة الإشرافية بنجاح
        $finalClose = $this->postJson("/api/v1/evaluations/{$eval->evaluation_id}/close", ['notes' => 'استوفت المدرسة الشواهد بنجاح']);

        $finalClose->assertStatus(200);
        $this->assertEquals('Completed', $eval->fresh()->status);
    }

    /**
     * 4. استرجاع قائمة المخرجات المتاحة للمراجعة بحسب النطاق الجغرافي.
     */
    public function test_available_for_review_submissions_endpoint(): void
    {
        $this->createEvaluationWithSubmission($this->sanaSchool, 'Submitted');
        $this->createEvaluationWithSubmission($this->taizSchool, 'UnderReview');

        // المشرف المركزي يرى المدرستين
        Sanctum::actingAs($this->centralSupervisor);
        $centralResponse = $this->getJson('/api/v1/evaluation-submissions/available-for-review');

        $centralResponse->assertStatus(200);
        $this->assertGreaterThanOrEqual(2, count($centralResponse->json('data')));

        // مشرف تعز يرى فقط مدرسة تعز
        Sanctum::actingAs($this->taizSupervisor);
        $taizResponse = $this->getJson('/api/v1/evaluation-submissions/available-for-review');

        $taizResponse->assertStatus(200);
        $taizData = $taizResponse->json('data');
        $this->assertTrue(collect($taizData)->every(fn($item) => $item['governorate'] === 'محافظة تعز'));
    }
}
