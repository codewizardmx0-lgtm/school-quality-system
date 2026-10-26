<?php

namespace Tests\Feature;

use App\Models\Attachment;
use App\Models\CompletionRequest;
use App\Models\CompletionRequestItem;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\EvaluationSubmission;
use App\Models\Evidence;
use App\Models\EvidenceVersion;
use App\Models\Indicator;
use App\Models\IndicatorScoreDescriptor;
use App\Models\Report;
use App\Models\School;
use App\Models\StandardVersion;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات الميزة للشريحة الثانية: استعراض شجرة المعايير، رصد الدرجات،
 * إدارة الشواهد والنسخ التاريخية، والعزل المؤسسي وقفل التقييم (BR-SCH-03).
 */
class EvaluationAndEvidenceFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $evaluatorBelqees;
    protected User $evaluatorFarouq;
    protected User $supervisorMinistry;
    protected User $adminUser;
    protected School $schoolBelqees;
    protected School $schoolFarouq;
    protected Evaluation $evaluationBelqees;
    protected Evaluation $evaluationFarouq;
    protected StandardVersion $standardVersion;
    protected Indicator $firstIndicator;
    protected Indicator $secondIndicator;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->schoolBelqees = School::where('identification_data', 'SCH-SANAA-2026-001')->firstOrFail();
        $this->schoolFarouq  = School::where('identification_data', 'SCH-TAIZ-2026-002')->firstOrFail();

        $this->evaluatorBelqees   = User::where('username', 'quality_belqees')->firstOrFail();
        $this->evaluatorFarouq    = User::where('username', 'quality_farouq')->firstOrFail();
        $this->supervisorMinistry = User::where('username', 'supervisor_ministry')->firstOrFail();
        $this->adminUser          = User::where('username', 'admin')->firstOrFail();

        $this->standardVersion = StandardVersion::where('status', 'Active')->firstOrFail();

        $cycle = EvaluationCycle::where('status', 'Active')->first();
        if (!$cycle) {
            $cycle = EvaluationCycle::create([
                'version_id'    => $this->standardVersion->version_id,
                'academic_year' => '2025/2026',
                'start_date'    => '2025-09-01',
                'end_date'      => '2026-06-30',
                'status'        => 'Active',
            ]);
        }

        // التقييمات الأساسية للمدرستين
        $this->evaluationBelqees = Evaluation::firstOrCreate(
            [
                'school_id' => $this->schoolBelqees->school_id,
                'cycle_id'  => $cycle->cycle_id,
            ],
            [
                'created_by_user_id' => $this->evaluatorBelqees->user_id,
                'status'             => 'InProgress',
            ]
        );

        $this->evaluationFarouq = Evaluation::firstOrCreate(
            [
                'school_id' => $this->schoolFarouq->school_id,
                'cycle_id'  => $cycle->cycle_id,
            ],
            [
                'created_by_user_id' => $this->evaluatorFarouq->user_id,
                'status'             => 'InProgress',
            ]
        );

        // مؤشرات نشطة تابعة للإصدار المعياري للدورة
        $indicators = Indicator::where('status', 'Active')
            ->whereHas('subStandard.standard', fn($q) => $q->where('version_id', $this->standardVersion->version_id))
            ->orderBy('indicator_id', 'asc')
            ->take(2)
            ->get();

        $this->firstIndicator = $indicators[0];
        $this->secondIndicator = $indicators[1];
    }

    /**
     * 1. استعراض شجرة الإصدار المعياري الخام (standards.view).
     */
    public function test_evaluator_can_view_raw_standard_version_tree(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->getJson("/api/v1/standard-versions/{$this->standardVersion->version_id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'versionId',
                    'versionName',
                    'standards' => [
                        '*' => [
                            'standardId',
                            'code',
                            'name',
                            'weight',
                            'subStandards' => [
                                '*' => [
                                    'subStandardId',
                                    'code',
                                    'name',
                                    'indicators' => [
                                        '*' => [
                                            'indicatorId',
                                            'code',
                                            'name',
                                            'scoreDescriptors' => [
                                                '*' => [
                                                    'descriptorId',
                                                    'scoreValue',
                                                    'label',
                                                ],
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
                'message',
            ]);
    }

    /**
     * 2. استعراض شجرة التقييم المخصصة للمدرسة مع النتائج ونسبة الإنجاز.
     */
    public function test_evaluator_can_view_evaluation_standards_tree_with_meta_and_results(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/standards-tree");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'evaluationId',
                    'cycleId',
                    'versionId',
                    'standards' => [
                        '*' => [
                            'subStandards' => [
                                '*' => [
                                    'indicators' => [
                                        '*' => [
                                            'indicatorId',
                                            'resultId',
                                            'score',
                                            'completionStatus',
                                            'evidenceCount',
                                            'scoreDescriptors',
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
                'meta' => [
                    'totalActiveIndicators',
                    'completedResults',
                    'completionPercentage',
                ],
            ]);

        $this->assertEquals(109, $response->json('meta.totalActiveIndicators'));
    }

    /**
     * 3. العزل المؤسسي: محاولة استعراض شجرة تقييم مدرسة أخرى ترجع 404 (القرار 9).
     */
    public function test_standards_tree_returns_404_on_cross_school_access(): void
    {
        Sanctum::actingAs($this->evaluatorFarouq);

        // مقيم الفاروق يطلب شجرة تقييم بلقيس
        $response = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/standards-tree");

        $response->assertStatus(404);
    }

    /**
     * 4. رصد نتيجة المؤشر مع اشتقاق الواصفة تلقائياً (Upsert Score).
     */
    public function test_evaluator_can_score_indicator_with_auto_derived_descriptor(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $payload = [
            'score'         => 3,
            'textualResult' => 'المدرسة تطبق هذا المؤشر بكفاءة عالية وفق متطلبات الجودة.',
        ];

        $response = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            $payload
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.score', 3)
            ->assertJsonPath('data.completionStatus', 'Completed')
            ->assertJsonPath('data.indicatorId', $this->firstIndicator->indicator_id)
            ->assertJsonStructure([
                'data' => [
                    'resultId',
                    'evaluationId',
                    'indicatorId',
                    'score',
                    'scoreDescriptorId',
                    'scoreDescriptorLabel',
                    'textualResult',
                    'completionStatus',
                    'evaluatorUserId',
                    'updatedAt',
                ],
                'meta' => [
                    'totalActiveIndicators',
                    'completedResults',
                    'completionPercentage',
                ],
            ]);

        $this->assertDatabaseHas('evaluation_results', [
            'evaluation_id'     => $this->evaluationBelqees->evaluation_id,
            'indicator_id'      => $this->firstIndicator->indicator_id,
            'score'             => 3,
            'completion_status' => 'Completed',
            'evaluator_user_id' => $this->evaluatorBelqees->user_id,
        ]);
    }

    /**
     * 5. رصد نتيجة المؤشر بقيمة خارج النطاق المسموح (0-3) أو بواصفة غير مطابقة يرجع 422.
     */
    public function test_scoring_fails_when_score_out_of_bounds_or_invalid_descriptor(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // 1. درجة غير صحيحة (4)
        $invalidScoreRes = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            ['score' => 4]
        );
        $invalidScoreRes->assertStatus(422)
            ->assertJsonValidationErrors(['score']);

        // 2. واصفة لا تطابق الدرجة المختارة
        $descriptorForLevel0 = IndicatorScoreDescriptor::where('indicator_id', $this->firstIndicator->indicator_id)
            ->whereHas('scoreLevel', fn($q) => $q->where('score_value', 0))
            ->firstOrFail();

        $mismatchDescriptorRes = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            [
                'score'               => 3,
                'scoreDescriptorId'   => $descriptorForLevel0->descriptor_id,
            ]
        );
        $mismatchDescriptorRes->assertStatus(422)
            ->assertJsonValidationErrors(['scoreDescriptorId']);
    }

    /**
     * 6. تدوين ملاحظة نصية على نتيجة مؤشر مرصود (POST /api/v1/evaluation-results/{id}/notes).
     */
    public function test_evaluator_can_add_note_to_evaluation_result(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // أولاً: رصد المؤشر
        $scoreRes = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            ['score' => 2]
        )->assertStatus(200);

        $resultId = $scoreRes->json('data.resultId');

        // ثانياً: تدوين الملاحظة عبر مسار النتيجة المعتمد (كتالوج 4.4.4)
        $noteRes = $this->postJson(
            "/api/v1/evaluation-results/{$resultId}/notes",
            ['text' => 'تم رصد النتيجة استناداً إلى زيارة المعمل المدرسي وسجلات الأنشطة.']
        );

        $noteRes->assertStatus(201)
            ->assertJsonPath('data.resultId', $resultId)
            ->assertJsonPath('data.text', 'تم رصد النتيجة استناداً إلى زيارة المعمل المدرسي وسجلات الأنشطة.')
            ->assertJsonPath('data.authorUserId', $this->evaluatorBelqees->user_id);

        $this->assertDatabaseHas('notes', [
            'result_id'      => $resultId,
            'author_user_id' => $this->evaluatorBelqees->user_id,
            'text'           => 'تم رصد النتيجة استناداً إلى زيارة المعمل المدرسي وسجلات الأنشطة.',
        ]);
    }

    /**
     * 7. فشل تدوين ملاحظة لنتيجة غير موجودة (404).
     */
    public function test_adding_note_to_non_existent_result_fails_404(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $res = $this->postJson(
            "/api/v1/evaluation-results/999999/notes",
            ['text' => 'ملاحظة لنتيجة غير موجودة']
        );

        $res->assertStatus(404);
    }

    /**
     * 7.ب. العزل المؤسسي للملاحظات: منع مقيم مدرسة أخرى من تدوين ملاحظة (404) والمنع لمن لا يملك الصلاحية (403).
     */
    public function test_note_authorization_and_cross_school_isolation(): void
    {
        // 1. مدرسة بلقيس ترصد مؤشراً
        Sanctum::actingAs($this->evaluatorBelqees);
        $scoreRes = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            ['score' => 2]
        );
        $resultId = $scoreRes->json('data.resultId');

        // 2. مقيم الفاروق يحاول كتابة ملاحظة على نتيجة بلقيس -> 404 (القرار 9)
        Sanctum::actingAs($this->evaluatorFarouq);
        $this->postJson("/api/v1/evaluation-results/{$resultId}/notes", [
            'text' => 'محاولة اختراق ملاحظة',
        ])->assertStatus(404);

        // 3. مستخدم بلا صلاحية evaluations.edit (مسؤول النظام) -> 403
        Sanctum::actingAs($this->adminUser);
        $this->postJson("/api/v1/evaluation-results/{$resultId}/notes", [
            'text' => 'مسؤول نظام لا يملك صلاحية تقييم',
        ])->assertStatus(403);
    }

    /**
     * 8. قفل التقييم (BR-SCH-03): رفض التعديل وتدوين الملاحظات عند قفل التقييم بعد إرساله النهائي (422).
     */
    public function test_scoring_rejected_when_evaluation_is_locked_br_sch_03(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // رصد نتيجة أولاً قبل القفل
        $scoreRes = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            ['score' => 1]
        )->assertStatus(200);
        $resultId = $scoreRes->json('data.resultId');

        // إنشاء تقرير وتسليم بحالة Submitted لمحاكاة إرسال نهائي
        $report = Report::create([
            'evaluation_id' => $this->evaluationBelqees->evaluation_id,
            'generated_at'  => now(),
            'status'        => 'Final',
        ]);

        EvaluationSubmission::create([
            'report_id'            => $report->report_id,
            'submitted_by_user_id' => $this->evaluatorBelqees->user_id,
            'attempt_no'           => 1,
            'submitted_at'         => now(),
            'status'               => 'Submitted',
        ]);

        // محاولة تعديل الدرجة -> 422
        $response = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            ['score' => 2]
        );
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['evaluation']);

        // محاولة تدوين ملاحظة على تقييم مقفل -> 422
        $noteRes = $this->postJson(
            "/api/v1/evaluation-results/{$resultId}/notes",
            ['text' => 'ملاحظة على تقييم مقفل']
        );
        $noteRes->assertStatus(422)
            ->assertJsonValidationErrors(['evaluation']);
    }

    /**
     * 9. طلب الاستكمال (NeedsCompletion): يسمح بالتعديل فقط للبنود المفتوحة في طلب الاستكمال (BR-SCH-03).
     */
    public function test_needs_completion_allows_modifying_only_requested_items(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $report = Report::create([
            'evaluation_id' => $this->evaluationBelqees->evaluation_id,
            'generated_at'  => now(),
            'status'        => 'Final',
        ]);

        $submission = EvaluationSubmission::create([
            'report_id'            => $report->report_id,
            'submitted_by_user_id' => $this->evaluatorBelqees->user_id,
            'attempt_no'           => 1,
            'submitted_at'         => now(),
            'status'               => 'NeedsCompletion',
        ]);

        $request = CompletionRequest::create([
            'submission_id'     => $submission->submission_id,
            'issued_by_user_id' => $this->supervisorMinistry->user_id,
            'status'            => 'Open',
        ]);

        // بند استكمال مخصص فقط للمؤشر الأول
        CompletionRequestItem::create([
            'request_id'          => $request->request_id,
            'indicator_id'        => $this->firstIndicator->indicator_id,
            'missing_description' => 'يرجى مراجعة تقدير المؤشر وإرفاق شاهد إضافي.',
            'status'              => 'Pending',
        ]);

        // 1. تعديل المؤشر المطلوب في الاستكمال: ينجح (200)
        $allowedRes = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            ['score' => 2]
        );
        $allowedRes->assertStatus(200);

        // 2. محاولة تعديل مؤشر آخر غير وارد في الاستكمال: يُرفض (422)
        $blockedRes = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->secondIndicator->indicator_id}/score",
            ['score' => 2]
        );
        $blockedRes->assertStatus(422)
            ->assertJsonValidationErrors(['evaluation']);
    }

    /**
     * 10. إنشاء شاهد ورفع ملفه لأول مرة بنسخة current=true ومرفق UUID (conventions §9).
     */
    public function test_evaluator_can_upload_evidence_for_scored_indicator(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // رصد المؤشر أولاً للحصول على resultId
        $scoreRes = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            ['score' => 3]
        );
        $resultId = $scoreRes->json('data.resultId');

        $fakePdf = UploadedFile::fake()->create('school_policy.pdf', 1024, 'application/pdf');

        $response = $this->postJson("/api/v1/evaluation-results/{$resultId}/evidences", [
            'title'         => 'وثيقة اللائحة الداخلية لجودة التعليم',
            'description'   => 'نسخة معتمدة من اللائحة التنظيمية المطبقة للعام الدراسي الحالي.',
            'justification' => 'تثبت الالتزام بالمعايير الإدارية.',
            'file'          => $fakePdf,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'وثيقة اللائحة الداخلية لجودة التعليم')
            ->assertJsonPath('data.currentVersion.versionNo', 1)
            ->assertJsonPath('data.currentVersion.current', true)
            ->assertJsonPath('data.currentVersion.attachment.fileName', 'school_policy.pdf')
            ->assertJsonPath('data.currentVersion.attachment.fileType', 'application/pdf');

        $evidenceId = $response->json('data.evidenceId');
        $this->assertDatabaseHas('evidences', [
            'evidence_id' => $evidenceId,
            'result_id'   => $resultId,
            'title'       => 'وثيقة اللائحة الداخلية لجودة التعليم',
        ]);

        $this->assertDatabaseHas('evidence_versions', [
            'evidence_id' => $evidenceId,
            'version_no'  => 1,
            'current'     => true,
        ]);

        $this->assertDatabaseHas('attachments', [
            'target_type' => 'evidence_version',
            'file_name'   => 'school_policy.pdf',
        ]);
    }

    /**
     * 11. رفع نسخة جديدة لشاهد قائم مع ضمان وجود نسخة current=true واحدة فقط.
     */
    public function test_evaluator_can_add_new_version_with_only_single_current_true(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // رصد النتيجة
        $scoreRes = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            ['score' => 2]
        );
        $resultId = $scoreRes->json('data.resultId');

        // رفع النسخة الأولى v1
        $pdfV1 = UploadedFile::fake()->create('plan_v1.pdf', 500, 'application/pdf');
        $evRes = $this->postJson("/api/v1/evaluation-results/{$resultId}/evidences", [
            'title' => 'خطة التحسين',
            'file'  => $pdfV1,
        ]);
        $evidenceId = $evRes->json('data.evidenceId');

        // رفع النسخة الثانية v2
        $pdfV2 = UploadedFile::fake()->create('plan_v2_updated.pdf', 700, 'application/pdf');
        $v2Res = $this->postJson("/api/v1/evidences/{$evidenceId}/versions", [
            'file' => $pdfV2,
        ]);

        $v2Res->assertStatus(201)
            ->assertJsonPath('data.evidenceId', $evidenceId)
            ->assertJsonPath('data.versionNo', 2)
            ->assertJsonPath('data.current', true)
            ->assertJsonPath('data.attachment.fileName', 'plan_v2_updated.pdf');

        // التحقق من أن النسخة 1 أصبحت false والنسخة 2 أصبحت true
        $this->assertDatabaseHas('evidence_versions', [
            'evidence_id' => $evidenceId,
            'version_no'  => 1,
            'current'     => false,
        ]);

        $this->assertDatabaseHas('evidence_versions', [
            'evidence_id' => $evidenceId,
            'version_no'  => 2,
            'current'     => true,
        ]);

        // التأكد من وجود نسخة واحدة فقط current = true للشاهد
        $currentCount = EvidenceVersion::where('evidence_id', $evidenceId)
            ->where('current', true)
            ->count();
        $this->assertEquals(1, $currentCount);
    }

    /**
     * 12. العزل المؤسسي للشواهد والنتائج: إرجاع 404 عند محاولة الوصول لمورد مدرسة أخرى (القرار 9).
     */
    public function test_evidence_cross_school_isolation_returns_404(): void
    {
        // 1. مدرسة بلقيس تنشئ نتيجة وشاهد
        Sanctum::actingAs($this->evaluatorBelqees);
        $scoreRes = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            ['score' => 2]
        );
        $resultId = $scoreRes->json('data.resultId');

        $pdf = UploadedFile::fake()->create('doc.pdf', 300, 'application/pdf');
        $evRes = $this->postJson("/api/v1/evaluation-results/{$resultId}/evidences", [
            'title' => 'مستند بلقيس',
            'file'  => $pdf,
        ]);
        $evidenceId = $evRes->json('data.evidenceId');

        // 2. مقيم مدرسة الفاروق يحاول إضافة شاهد لنفس نتيجة مدرسة بلقيس -> 404
        Sanctum::actingAs($this->evaluatorFarouq);
        $pdfFarouq = UploadedFile::fake()->create('doc_farouq.pdf', 300, 'application/pdf');
        $crossStoreRes = $this->postJson("/api/v1/evaluation-results/{$resultId}/evidences", [
            'title' => 'اختراق شاهد',
            'file'  => $pdfFarouq,
        ]);
        $crossStoreRes->assertStatus(404);

        // 3. مقيم مدرسة الفاروق يحاول رفع نسخة جديدة لشاهد مدرسة بلقيس -> 404
        $crossVersionRes = $this->postJson("/api/v1/evidences/{$evidenceId}/versions", [
            'file' => $pdfFarouq,
        ]);
        $crossVersionRes->assertStatus(404);
    }

    /**
     * 13. رفض الملفات ذات الصيغ غير المسموحة أو التي تتجاوز 10 ميغابايت (conventions §9).
     */
    public function test_evidence_rejects_disallowed_file_types_and_oversized_files(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $scoreRes = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            ['score' => 1]
        );
        $resultId = $scoreRes->json('data.resultId');

        // 1. صيغة غير مسموحة (txt أو sh)
        $disallowedFile = UploadedFile::fake()->create('script.sh', 100, 'application/x-sh');
        $disallowedRes = $this->postJson("/api/v1/evaluation-results/{$resultId}/evidences", [
            'title' => 'ملف غير مصرح',
            'file'  => $disallowedFile,
        ]);
        $disallowedRes->assertStatus(422)
            ->assertJsonValidationErrors(['file']);

        // 2. ملف يتجاوز 10 ميغابايت (مثلاً 11 ميغابايت = 11264 كيلوبايت)
        $oversizedFile = UploadedFile::fake()->create('large.pdf', 12000, 'application/pdf');
        $oversizedRes = $this->postJson("/api/v1/evaluation-results/{$resultId}/evidences", [
            'title' => 'ملف ضخم',
            'file'  => $oversizedFile,
        ]);
        $oversizedRes->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    /**
     * 14. استعراض قائمة شواهد نتيجة المؤشر مع نسخها ومرفقاتها (evaluations.view أو evidence.manage).
     */
    public function test_evaluator_can_list_evidences_for_evaluation_result(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $scoreRes = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            ['score' => 2]
        );
        $resultId = $scoreRes->json('data.resultId');

        $file = UploadedFile::fake()->create('evidence_doc.pdf', 500, 'application/pdf');
        $this->postJson("/api/v1/evaluation-results/{$resultId}/evidences", [
            'title'       => 'تقرير المعمل المدرسي',
            'description' => 'شاهد ميداني على جاهزية المعمل',
            'file'        => $file,
        ])->assertStatus(201);

        // استعراض الشواهد
        $listRes = $this->getJson("/api/v1/evaluation-results/{$resultId}/evidences");
        $listRes->assertStatus(200)
            ->assertJsonPath('data.0.title', 'تقرير المعمل المدرسي')
            ->assertJsonPath('data.0.resultId', $resultId)
            ->assertJsonPath('data.0.versions.0.versionNo', 1)
            ->assertJsonPath('data.0.versions.0.current', true)
            ->assertJsonPath('data.0.versions.0.attachments.0.fileName', 'evidence_doc.pdf')
            ->assertJsonMissing(['storageUri']); // التأكد من عدم تسريب مسار التخزين
    }

    /**
     * 15. العزل المؤسسي والصلاحيات عند استعراض الشواهد (404 لمدرسة أخرى، 403 لمستخدم بلا صلاحية).
     */
    public function test_listing_evidences_cross_school_and_authorization(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);
        $scoreRes = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            ['score' => 2]
        );
        $resultId = $scoreRes->json('data.resultId');

        // مقيم مدرسة الفاروق -> 404 (القرار 9)
        Sanctum::actingAs($this->evaluatorFarouq);
        $this->getJson("/api/v1/evaluation-results/{$resultId}/evidences")->assertStatus(404);

        // مستخدم بلا صلاحية evaluations.view / evidence.manage -> 403
        Sanctum::actingAs($this->adminUser);
        $this->getJson("/api/v1/evaluation-results/{$resultId}/evidences")->assertStatus(403);
    }

    /**
     * 16. تنزيل المرفق الرقمي لنسخة شاهد محددة بالاسم الأصلي دون كشف مسار التخزين.
     */
    public function test_evaluator_can_download_evidence_version_attachment(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $scoreRes = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            ['score' => 2]
        );
        $resultId = $scoreRes->json('data.resultId');

        $file = UploadedFile::fake()->create('accreditation_guide.pdf', 400, 'application/pdf');
        $evRes = $this->postJson("/api/v1/evaluation-results/{$resultId}/evidences", [
            'title' => 'دليل الاعتماد',
            'file'  => $file,
        ]);
        $evidenceId = $evRes->json('data.evidenceId');
        $versionId  = $evRes->json('data.currentVersion.evidenceVersionId');

        // تنزيل المرفق
        $downloadRes = $this->get("/api/v1/evidences/{$evidenceId}/versions/{$versionId}/download");
        $downloadRes->assertStatus(200);
        $downloadRes->assertHeader('content-disposition');
        $this->assertStringContainsString('accreditation_guide.pdf', (string) $downloadRes->headers->get('content-disposition'));
    }

    /**
     * 17. العزل والصلاحيات والتحقق عند تنزيل مرفق الشاهد (404 لمدرسة أخرى أو نسخة وهمية، 403 لمستخدم بلا صلاحية).
     */
    public function test_download_attachment_cross_school_and_authorization(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $scoreRes = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            ['score' => 2]
        );
        $resultId = $scoreRes->json('data.resultId');

        $file = UploadedFile::fake()->create('private_school_plan.pdf', 300, 'application/pdf');
        $evRes = $this->postJson("/api/v1/evaluation-results/{$resultId}/evidences", [
            'title' => 'خطة المدرسة',
            'file'  => $file,
        ]);
        $evidenceId = $evRes->json('data.evidenceId');
        $versionId  = $evRes->json('data.currentVersion.evidenceVersionId');

        // مقيم مدرسة الفاروق يحاول التنزيل -> 404
        Sanctum::actingAs($this->evaluatorFarouq);
        $this->get("/api/v1/evidences/{$evidenceId}/versions/{$versionId}/download")->assertStatus(404);

        // طلب نسخة غير موجودة -> 404
        Sanctum::actingAs($this->evaluatorBelqees);
        $this->get("/api/v1/evidences/{$evidenceId}/versions/999999/download")->assertStatus(404);

        // مستخدم بلا صلاحية -> 403
        Sanctum::actingAs($this->adminUser);
        $this->get("/api/v1/evidences/{$evidenceId}/versions/{$versionId}/download")->assertStatus(403);
    }

    /**
     * 18. أدوات التحقق (FR-SCH-13): رصد النتيجة مع أدوات تحقق معتمدة ومزامنتها وانعكاسها في الشجرة.
     */
    public function test_scoring_with_valid_verification_tool_ids_syncs_and_reflects_in_tree(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // جلب أدوات التحقق المعتمدة لهذا المؤشر
        $validToolIds = DB::table('indicator_verification_methods')
            ->where('indicator_id', $this->firstIndicator->indicator_id)
            ->pluck('tool_id')
            ->map(fn($id) => (int) $id)
            ->values()
            ->all();

        if (empty($validToolIds)) {
            $tool = DB::table('verification_tools')->first();
            DB::table('indicator_verification_methods')->insert([
                'indicator_id' => $this->firstIndicator->indicator_id,
                'tool_id'      => $tool->tool_id,
            ]);
            $validToolIds = [(int) $tool->tool_id];
        }

        $scoreRes = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            [
                'score'               => 3,
                'verificationToolIds' => $validToolIds,
            ]
        );

        $scoreRes->assertStatus(200)
            ->assertJsonPath('data.score', 3)
            ->assertJsonPath('data.verificationToolIds', $validToolIds);

        $resultId = $scoreRes->json('data.resultId');

        // التحقق من الحفظ في جدول الربط evaluation_result_verification_methods
        foreach ($validToolIds as $tId) {
            $this->assertDatabaseHas('evaluation_result_verification_methods', [
                'evaluation_result_id' => $resultId,
                'tool_id'              => $tId,
            ]);
        }

        // التحقق من استرجاعها في شجرة المعايير
        $treeRes = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/standards-tree");
        $treeRes->assertStatus(200);

        // فحص وجود verificationToolIds و verificationTools في أول مؤشر
        $indicatorData = null;
        foreach ($treeRes->json('data.standards') as $std) {
            foreach ($std['subStandards'] as $sub) {
                foreach ($sub['indicators'] as $ind) {
                    if ($ind['indicatorId'] === $this->firstIndicator->indicator_id) {
                        $indicatorData = $ind;
                        break 3;
                    }
                }
            }
        }

        $this->assertNotNull($indicatorData);
        $this->assertEquals($validToolIds, $indicatorData['verificationToolIds']);
        $this->assertNotEmpty($indicatorData['verificationTools']);
    }

    /**
     * 19. أدوات التحقق (FR-SCH-13): رفض رصد النتيجة عند إرسال أداة تحقق غير معتمدة للمؤشر (422).
     */
    public function test_scoring_with_invalid_verification_tool_id_fails_422(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // المؤشر الأول لا يعتمد الأداة 9999
        $scoreRes = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            [
                'score'               => 2,
                'verificationToolIds' => [9999],
            ]
        );

        $scoreRes->assertStatus(422)
            ->assertJsonValidationErrors(['verificationToolIds']);
    }

    /**
     * 20. إغلاق الدورة (FR-SCH-01): منع رصد الدرجات إذا كانت دورة التقييم Closed بـ 422 وحقل errors.cycle.
     */
    public function test_closed_cycle_prevents_scoring_with_422_cycle_error(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // تعديل حالة الدورة إلى Closed
        $cycle = $this->evaluationBelqees->cycle;
        $cycle->status = 'Closed';
        $cycle->save();

        $response = $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            ['score' => 3]
        );

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['cycle']);
    }

    /**
     * 21. إغلاق الدورة (FR-SCH-01): منع إضافة الملاحظات إذا كانت الدورة Closed بـ 422 وحقل errors.cycle.
     */
    public function test_closed_cycle_prevents_adding_notes_with_422_cycle_error(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // أولاً: رصد نتيجة أولية قبل الإغلاق
        $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            ['score' => 2]
        )->assertStatus(200);

        $result = EvaluationResult::where('evaluation_id', $this->evaluationBelqees->evaluation_id)
            ->where('indicator_id', $this->firstIndicator->indicator_id)
            ->firstOrFail();

        // إغلاق الدورة
        $cycle = $this->evaluationBelqees->cycle;
        $cycle->status = 'Closed';
        $cycle->save();

        $response = $this->postJson(
            "/api/v1/evaluation-results/{$result->result_id}/notes",
            ['notes' => 'ملاحظة أثناء إغلاق الدورة']
        );

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['cycle']);
    }

    /**
     * 22. إغلاق الدورة (FR-SCH-01): منع رفع الشواهد ونسخها إذا كانت الدورة Closed بـ 422 وحقل errors.cycle.
     */
    public function test_closed_cycle_prevents_adding_evidence_and_version_with_422_cycle_error(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // رصد نتيجة أولية
        $this->putJson(
            "/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/score",
            ['score' => 2]
        )->assertStatus(200);

        $result = EvaluationResult::where('evaluation_id', $this->evaluationBelqees->evaluation_id)
            ->where('indicator_id', $this->firstIndicator->indicator_id)
            ->firstOrFail();

        // إغلاق الدورة
        $cycle = $this->evaluationBelqees->cycle;
        $cycle->status = 'Closed';
        $cycle->save();

        // محاولة رفع شاهد جديد
        $file = UploadedFile::fake()->create('closed_test.pdf', 100, 'application/pdf');
        $evidenceRes = $this->postJson(
            "/api/v1/evaluation-results/{$result->result_id}/evidences",
            [
                'title' => 'شاهد دورة مغلقة',
                'file'  => $file,
            ]
        );

        $evidenceRes->assertStatus(422)
            ->assertJsonValidationErrors(['cycle']);
    }

    /**
     * 23. إغلاق الدورة (FR-SCH-01): استعراض الشجرة ونتائج التقييم يظل متاحاً (قراءة فقط 200) حتى عند إغلاق الدورة.
     */
    public function test_closed_cycle_allows_reading_standards_tree(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // إغلاق الدورة
        $cycle = $this->evaluationBelqees->cycle;
        $cycle->status = 'Closed';
        $cycle->save();

        $response = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/standards-tree");
        $response->assertStatus(200)
            ->assertJsonPath('data.evaluationId', $this->evaluationBelqees->evaluation_id);
    }
}
