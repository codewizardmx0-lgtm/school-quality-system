<?php

namespace Tests\Feature;

use App\Models\CompletionRequest;
use App\Models\CompletionRequestItem;
use App\Models\DocumentVersion;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\EvaluationSubmission;
use App\Models\EvidenceLink;
use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\IndicatorScoreDescriptor;
use App\Models\Report;
use App\Models\School;
use App\Models\SchoolDocument;
use App\Models\StandardVersion;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات مسار الاستكمال وسجل المحاولات ودورة حالات التقييم (U-03, U-11, U-29).
 *
 * التحقق من:
 * 1. مسار الإغلاق النهائي المباشر POST /api/v1/evaluations/{id}/close للمشرف الوزاري.
 * 2. إنشاء طلب الاستكمال وتحديد المهلة الزمنية completion_deadline وبنوده.
 * 3. تمديد المهلة من المشرف الوزاري حصراً واحتساب عدد مرات التمديد.
 * 4. رفض إعادة التسليم resubmit عند بقاء بنود pending أو انتهاء المهلة.
 * 5. التحول الآلي لحالة البنود عند استيفاء الشواهد المطلوبة.
 * 6. نجاح إعادة التسليم resubmit وزيادة رقم المحاولة attempt_no ونقل الحالة إلى UnderReview.
 * 7. الإغلاق النهائي بعد الاستكمال POST /api/v1/completion-requests/{id}/close ونقل التقييم إلى Completed.
 * 8. العزل المؤسسي الصارم للمدارس (404) على مسارات الاستكمال.
 */
class CompletionWorkflowFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $evaluatorBelqees;
    protected User $principalBelqees;
    protected User $evaluatorFarouq;
    protected User $supervisor;
    protected School $schoolBelqees;
    protected School $schoolFarouq;
    protected Evaluation $evaluation;
    protected StandardVersion $standardVersion;
    protected EvaluationCycle $cycle;

    protected function setUp(): void
    {
        parent::setUp();

        $this->schoolBelqees = School::where('identification_data', 'SCH-AMANA-2026-001')->firstOrFail();
        $this->schoolFarouq  = School::where('identification_data', 'SCH-TAIZ-2026-001')->firstOrFail();

        $this->evaluatorBelqees = User::where('username', 'quality_belqees')->firstOrFail();
        $this->principalBelqees = User::where('username', 'principal_belqees')->firstOrFail();
        $this->evaluatorFarouq  = User::where('username', 'quality_farouq')->firstOrFail();
        $this->supervisor       = User::where('username', 'supervisor_ministry')->firstOrFail();

        $this->standardVersion = StandardVersion::where('status', 'Active')->firstOrFail();

        $this->cycle = EvaluationCycle::where('status', 'Active')->first();
        if (!$this->cycle) {
            $this->cycle = EvaluationCycle::create([
                'version_id'    => $this->standardVersion->version_id,
                'academic_year' => '2025/2026',
                'start_date'    => '2025-09-01',
                'end_date'      => '2026-06-30',
                'status'        => 'Active',
            ]);
        }

        $this->evaluation = Evaluation::firstOrCreate(
            [
                'school_id' => $this->schoolBelqees->school_id,
                'cycle_id'  => $this->cycle->cycle_id,
            ],
            [
                'created_by_user_id' => $this->evaluatorBelqees->user_id,
                'status'             => 'InProgress',
            ]
        );
        $this->evaluation->update(['status' => 'InProgress']);
    }

    /**
     * دالة مساعدة لرصد جميع المؤشرات الفعالة واستيفاء شواهدها لتمكين الـ submit.
     */
    protected function prepareCompletedEvaluation(): void
    {
        $indicators = Indicator::where('status', 'Active')->get();
        foreach ($indicators as $ind) {
            $descriptor = IndicatorScoreDescriptor::where('indicator_id', $ind->indicator_id)->first();
            EvaluationResult::updateOrCreate(
                [
                    'evaluation_id' => $this->evaluation->evaluation_id,
                    'indicator_id'  => $ind->indicator_id,
                ],
                [
                    'standard_version_id' => $this->standardVersion->version_id,
                    'evaluator_user_id'   => $this->evaluatorBelqees->user_id,
                    'score_descriptor_id' => $descriptor ? $descriptor->descriptor_id : 1,
                    'score'               => 3,
                    'completion_status'   => 'Completed',
                ]
            );
        }

        $requirements = IndicatorEvidenceRequirement::where('required', true)->get()->groupBy('indicator_id');
        EvidenceLink::where('evaluation_id', $this->evaluation->evaluation_id)->delete();

        foreach ($requirements as $indicatorId => $reqList) {
            $result = EvaluationResult::where('evaluation_id', $this->evaluation->evaluation_id)
                ->where('indicator_id', $indicatorId)
                ->first();

            if ($result) {
                foreach ($reqList as $req) {
                    $doc = SchoolDocument::create([
                        'school_id'          => $this->schoolBelqees->school_id,
                        'title'              => 'شاهد المتطلب ' . $req->requirement_id,
                        'document_type'      => 'other',
                        'created_by_user_id' => $this->evaluatorBelqees->user_id,
                    ]);

                    $version = DocumentVersion::create([
                        'school_id'          => $this->schoolBelqees->school_id,
                        'school_document_id' => $doc->id,
                        'version_no'         => 1,
                        'is_current'         => true,
                        'file_name'          => 'doc_' . $req->requirement_id . '.pdf',
                        'storage_uri'        => 'school_documents/' . $this->schoolBelqees->school_id . '/doc_' . $req->requirement_id . '.pdf',
                        'file_size'          => 1024,
                        'mime_type'          => 'application/pdf',
                    ]);

                    EvidenceLink::create([
                        'school_id'            => $this->schoolBelqees->school_id,
                        'evaluation_id'        => $this->evaluation->evaluation_id,
                        'evaluation_result_id' => $result->result_id,
                        'indicator_id'         => $indicatorId,
                        'document_version_id'  => $version->id,
                        'justification'        => 'دلالة الشاهد',
                        'status'               => 'completed',
                    ]);
                }
            }
        }
    }

    /**
     * 1. مسار الإغلاق المباشر POST /api/v1/evaluations/{id}/close
     */
    public function test_direct_close_succeeds_for_ministry_supervisor(): void
    {
        $this->prepareCompletedEvaluation();

        // تسليم التقييم أولاً بواسطة المدرسة
        Sanctum::actingAs($this->evaluatorBelqees);
        $submitResp = $this->postJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/submit");
        $submitResp->assertStatus(200);
        $this->assertEquals('Submitted', $this->evaluation->fresh()->status);

        // محاولة إغلاق التقييم من مستخدم المدرسة -> 403
        $schoolCloseResp = $this->postJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/close");
        $schoolCloseResp->assertStatus(403);

        // إغلاق التقييم بواسطة المشرف الوزاري -> 200
        Sanctum::actingAs($this->supervisor);
        $supervisorCloseResp = $this->postJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/close");
        $supervisorCloseResp->assertStatus(200)
            ->assertJsonPath('data.status', 'Completed')
            ->assertJsonPath('data.isLocked', true);

        // التحقق من قاعدة البيانات
        $this->assertEquals('Completed', $this->evaluation->fresh()->status);

        $report = Report::where('evaluation_id', $this->evaluation->evaluation_id)->first();
        $this->assertNotNull($report);
        $this->assertEquals('Final', $report->status);

        $latestSub = EvaluationSubmission::where('report_id', $report->report_id)->orderByDesc('attempt_no')->first();
        $this->assertNotNull($latestSub);
        $this->assertEquals('Completed', $latestSub->status);
    }

    /**
     * 2. إنشاء طلب استكمال مع مهلة مستقبلية وبنود نواقص.
     */
    public function test_supervisor_creates_completion_request_with_future_deadline(): void
    {
        $this->prepareCompletedEvaluation();

        Sanctum::actingAs($this->evaluatorBelqees);
        $this->postJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/submit")->assertStatus(200);

        Sanctum::actingAs($this->supervisor);

        $indicator = Indicator::where('status', 'Active')->firstOrFail();
        $deadline = Carbon::now()->addDays(5)->toIso8601String();

        $response = $this->postJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/completion-requests", [
            'completion_deadline' => $deadline,
            'notes' => 'يرجى استيفاء شواهد إضافية للمؤشر.',
            'items' => [
                [
                    'indicator_id' => $indicator->indicator_id,
                    'missing_description' => 'تقرير النشاط بحاجة لتحديث التوقيعات.',
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'Open')
            ->assertJsonPath('data.deadline_extensions_count', 0)
            ->assertJsonCount(1, 'data.items');

        // التحقق من تحول حالة التقييم والمحاولة إلى NeedsCompletion
        $this->assertEquals('NeedsCompletion', $this->evaluation->fresh()->status);

        $report = Report::where('evaluation_id', $this->evaluation->evaluation_id)->first();
        $latestSub = EvaluationSubmission::where('report_id', $report->report_id)->orderByDesc('attempt_no')->first();
        $this->assertEquals('NeedsCompletion', $latestSub->status);
    }

    /**
     * 3. رفض إنشاء طلب استكمال بمهلة زمنية سابقة أو منتهية.
     */
    public function test_completion_request_fails_with_past_deadline(): void
    {
        $this->prepareCompletedEvaluation();

        Sanctum::actingAs($this->evaluatorBelqees);
        $this->postJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/submit")->assertStatus(200);

        Sanctum::actingAs($this->supervisor);

        $indicator = Indicator::where('status', 'Active')->firstOrFail();
        $pastDeadline = Carbon::now()->subDay()->toIso8601String();

        $response = $this->postJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/completion-requests", [
            'completion_deadline' => $pastDeadline,
            'items' => [
                [
                    'indicator_id' => $indicator->indicator_id,
                    'missing_description' => 'وصف النقص',
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['completion_deadline']);
    }

    /**
     * 4. تمديد المهلة من المشرف الوزاري حصراً واحتساب عدد مرات التمديد.
     */
    public function test_supervisor_can_extend_deadline(): void
    {
        $this->prepareCompletedEvaluation();

        Sanctum::actingAs($this->evaluatorBelqees);
        $this->postJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/submit")->assertStatus(200);

        Sanctum::actingAs($this->supervisor);
        $indicator = Indicator::where('status', 'Active')->firstOrFail();
        $initialDeadline = Carbon::now()->addDays(3);

        $createResp = $this->postJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/completion-requests", [
            'completion_deadline' => $initialDeadline->toIso8601String(),
            'items' => [
                [
                    'indicator_id' => $indicator->indicator_id,
                    'missing_description' => 'نقص الشاهد',
                ],
            ],
        ]);
        $createResp->assertStatus(201);
        $requestId = $createResp->json('data.request_id');

        // المدرسة لا يمكنها تمديد المهلة -> 403
        Sanctum::actingAs($this->evaluatorBelqees);
        $schoolExtendResp = $this->patchJson("/api/v1/completion-requests/{$requestId}/deadline", [
            'new_deadline' => Carbon::now()->addDays(7)->toIso8601String(),
        ]);
        $schoolExtendResp->assertStatus(403);

        // المشرف يمدد المهلة بتاريخ أبعد -> 200
        Sanctum::actingAs($this->supervisor);
        $extendedDeadline = Carbon::now()->addDays(10);
        $supervisorExtendResp = $this->patchJson("/api/v1/completion-requests/{$requestId}/deadline", [
            'new_deadline' => $extendedDeadline->toIso8601String(),
        ]);

        $supervisorExtendResp->assertStatus(200)
            ->assertJsonPath('data.deadlineExtensionsCount', 1);

        $this->assertDatabaseHas('completion_requests', [
            'request_id' => $requestId,
            'deadline_extensions_count' => 1,
        ]);
    }

    /**
     * 5. حظر إعادة التسليم (resubmit) عند بقاء أي بند pending وإرجاع تفاصيل البنود غير المعالجة (422).
     */
    public function test_school_cannot_resubmit_when_items_pending(): void
    {
        $this->prepareCompletedEvaluation();

        Sanctum::actingAs($this->evaluatorBelqees);
        $this->postJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/submit")->assertStatus(200);

        Sanctum::actingAs($this->supervisor);
        $indicator = Indicator::where('status', 'Active')->firstOrFail();

        $createResp = $this->postJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/completion-requests", [
            'completion_deadline' => Carbon::now()->addDays(5)->toIso8601String(),
            'items' => [
                [
                    'indicator_id' => $indicator->indicator_id,
                    'missing_description' => 'تقرير النشاط بحاجة لتحديث التوقيعات.',
                ],
            ],
        ]);
        $requestId = $createResp->json('data.request_id');

        // محاولة إعادة التسليم من المدرسة بينما البند لا يزال pending
        Sanctum::actingAs($this->evaluatorBelqees);

        // حذف الشاهد عن هذا المؤشر لضمان عدم الكفاية وبقاء البند pending
        EvidenceLink::where('evaluation_id', $this->evaluation->evaluation_id)
            ->where('indicator_id', $indicator->indicator_id)
            ->delete();

        $resubmitResp = $this->postJson("/api/v1/completion-requests/{$requestId}/resubmit");
        $resubmitResp->assertStatus(422)
            ->assertJsonPath('message', 'لا يمكن إعادة تقديم التقييم لوجود بنود استكمال لم يتم معالجتها واستيفاؤها بالكامل.')
            ->assertJsonStructure([
                'errors' => [
                    'unresolved_items' => [
                        '*' => ['request_item_id', 'indicator_id', 'status', 'missing_description'],
                    ],
                ],
            ]);
    }

    /**
     * 6. حظر إعادة التسليم (resubmit) عند انتهاء المهلة المحددة (422).
     */
    public function test_school_cannot_resubmit_when_deadline_expired(): void
    {
        $this->prepareCompletedEvaluation();

        Sanctum::actingAs($this->evaluatorBelqees);
        $this->postJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/submit")->assertStatus(200);

        Sanctum::actingAs($this->supervisor);
        $indicator = Indicator::where('status', 'Active')->firstOrFail();

        $createResp = $this->postJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/completion-requests", [
            'completion_deadline' => Carbon::now()->addMinutes(1)->toIso8601String(),
            'items' => [
                [
                    'indicator_id' => $indicator->indicator_id,
                    'missing_description' => 'شاهد مطلوب',
                ],
            ],
        ]);
        $requestId = $createResp->json('data.request_id');

        // محاكاة انتهاء المهلة عبر تحديث السجل في قاعدة البيانات مباشرة
        CompletionRequest::where('request_id', $requestId)->update([
            'completion_deadline' => Carbon::now()->subMinutes(10),
        ]);

        Sanctum::actingAs($this->evaluatorBelqees);
        $resubmitResp = $this->postJson("/api/v1/completion-requests/{$requestId}/resubmit");

        $resubmitResp->assertStatus(422)
            ->assertJsonPath('message', 'انتهت مهلة استكمال الملاحظات المحددة من المشرف الوزاري دون تمديد، ولا يمكن إعادة تقديم التقييم (422).');
    }

    /**
     * 7. نجاح إعادة التسليم (resubmit) بعد استيفاء البنود، وزيادة رقم المحاولة إلى 2، ونقل الحالة إلى UnderReview.
     */
    public function test_school_can_resubmit_when_items_resolved_within_deadline(): void
    {
        $this->prepareCompletedEvaluation();

        Sanctum::actingAs($this->evaluatorBelqees);
        $this->postJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/submit")->assertStatus(200);

        Sanctum::actingAs($this->supervisor);
        $indicator = Indicator::where('status', 'Active')->firstOrFail();

        $createResp = $this->postJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/completion-requests", [
            'completion_deadline' => Carbon::now()->addDays(5)->toIso8601String(),
            'items' => [
                [
                    'indicator_id' => $indicator->indicator_id,
                    'missing_description' => 'يرجى التأكد من استيفاء شواهد المؤشر.',
                ],
            ],
        ]);
        $requestId = $createResp->json('data.request_id');

        // الشواهد مستوفاة في دالة prepareCompletedEvaluation، وبالتالي البند يتحول آلياً إلى resolved
        Sanctum::actingAs($this->evaluatorBelqees);
        $resubmitResp = $this->postJson("/api/v1/completion-requests/{$requestId}/resubmit");

        $resubmitResp->assertStatus(200)
            ->assertJsonPath('data.requestStatus', 'UnderReview')
            ->assertJsonPath('data.evaluationStatus', 'Submitted')
            ->assertJsonPath('data.newAttemptNo', 2);

        // التحقق من قاعدة البيانات
        $this->assertDatabaseHas('completion_requests', [
            'request_id' => $requestId,
            'status' => 'UnderReview',
        ]);

        $this->assertDatabaseHas('evaluation_submissions', [
            'attempt_no' => 2,
            'status' => 'Submitted',
        ]);

        $this->assertEquals('Submitted', $this->evaluation->fresh()->status);
    }

    /**
     * 8. الإغلاق النهائي لطلب الاستكمال من المشرف الوزاري POST /api/v1/completion-requests/{id}/close
     */
    public function test_supervisor_closes_completion_request_successfully(): void
    {
        $this->prepareCompletedEvaluation();

        Sanctum::actingAs($this->evaluatorBelqees);
        $this->postJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/submit")->assertStatus(200);

        Sanctum::actingAs($this->supervisor);
        $indicator = Indicator::where('status', 'Active')->firstOrFail();

        $createResp = $this->postJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/completion-requests", [
            'completion_deadline' => Carbon::now()->addDays(5)->toIso8601String(),
            'items' => [
                [
                    'indicator_id' => $indicator->indicator_id,
                    'missing_description' => 'شاهد مطلوب',
                ],
            ],
        ]);
        $requestId = $createResp->json('data.request_id');

        // إغلاق الطلب نهائياً بواسطة المشرف الوزاري
        $closeResp = $this->postJson("/api/v1/completion-requests/{$requestId}/close");
        $closeResp->assertStatus(200)
            ->assertJsonPath('data.status', 'Resolved')
            ->assertJsonPath('data.evaluationStatus', 'Completed');

        $this->assertDatabaseHas('completion_requests', [
            'request_id' => $requestId,
            'status' => 'Resolved',
        ]);

        $this->assertEquals('Completed', $this->evaluation->fresh()->status);
    }

    /**
     * 9. العزل المؤسسي الصارم للمدارس على مسارات الاستكمال (القرار المعماري 9: 404).
     */
    public function test_school_tenant_isolation_on_completion_requests_returns_404(): void
    {
        $this->prepareCompletedEvaluation();

        Sanctum::actingAs($this->evaluatorBelqees);
        $this->postJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/submit")->assertStatus(200);

        Sanctum::actingAs($this->supervisor);
        $indicator = Indicator::where('status', 'Active')->firstOrFail();

        $createResp = $this->postJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/completion-requests", [
            'completion_deadline' => Carbon::now()->addDays(5)->toIso8601String(),
            'items' => [
                [
                    'indicator_id' => $indicator->indicator_id,
                    'missing_description' => 'شاهد مطلوب',
                ],
            ],
        ]);
        $requestId = $createResp->json('data.request_id');

        // مقيم مدرسة الفاروق يحاول الوصول إلى استكمال مدرسة بلقيس -> 404
        Sanctum::actingAs($this->evaluatorFarouq);

        $getResp = $this->getJson("/api/v1/completion-requests/{$requestId}");
        $getResp->assertStatus(404);

        $listResp = $this->getJson("/api/v1/evaluations/{$this->evaluation->evaluation_id}/completion-requests");
        $listResp->assertStatus(404);

        $resubmitResp = $this->postJson("/api/v1/completion-requests/{$requestId}/resubmit");
        $resubmitResp->assertStatus(404);
    }
}
