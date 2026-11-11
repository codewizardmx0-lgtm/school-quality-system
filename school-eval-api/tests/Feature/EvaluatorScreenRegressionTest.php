<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\StandardVersion;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبار انحدار (Regression Test) لشاشة مقيّم المدرسة وشجرة المعايير:
 * يتحقق من أن مقيّم المدرسة يرى ملف تقييمه النشط وشجرة المعايير كاملة دون انقطاع،
 * مع التحقق من دعم حالتي الإصدار المعياري (Approved و Active) والعزل المؤسسي (404).
 */
class EvaluatorScreenRegressionTest extends TestCase
{
    use DatabaseTransactions;

    protected User $evaluatorBelqees;
    protected User $evaluatorFarouq;
    protected EvaluationCycle $cycle;
    protected Evaluation $evalBelqees;
    protected Evaluation $evalFarouq;
    protected StandardVersion $version;

    protected function setUp(): void
    {
        parent::setUp();

        $this->evaluatorBelqees = User::where('username', 'quality_belqees')->firstOrFail();
        $this->evaluatorFarouq  = User::where('username', 'quality_farouq')->firstOrFail();

        $this->cycle = EvaluationCycle::firstOrFail();
        $this->version = StandardVersion::find($this->cycle->version_id);

        $this->evalBelqees = Evaluation::firstOrCreate(
            [
                'cycle_id'  => $this->cycle->cycle_id,
                'school_id' => $this->evaluatorBelqees->school_id,
            ],
            [
                'created_by_user_id' => $this->evaluatorBelqees->user_id,
                'status'             => 'InProgress',
            ]
        );

        $this->evalFarouq = Evaluation::firstOrCreate(
            [
                'cycle_id'  => $this->cycle->cycle_id,
                'school_id' => $this->evaluatorFarouq->school_id,
            ],
            [
                'created_by_user_id' => $this->evaluatorFarouq->user_id,
                'status'             => 'InProgress',
            ]
        );
    }

    /**
     * اختبار: مقيّم المدرسة يستعرض ملف تقييم مدرسته فقط ولا يرى مدارس أخرى.
     */
    public function test_evaluator_sees_own_school_evaluation_list(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->getJson('/api/v1/evaluations');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'evaluationId',
                        'schoolId',
                        'cycleId',
                        'status',
                    ],
                ],
            ]);

        $evaluations = $response->json('data');
        $this->assertNotEmpty($evaluations, 'يجب أن يعود ملف تقييم واحد على الأقل لمدرسة بلقيس.');

        foreach ($evaluations as $ev) {
            $this->assertEquals(
                $this->evaluatorBelqees->school_id,
                $ev['schoolId'],
                'يجب أن تكون جميع التقييمات المعادة تابعة لمدرسة المستخدم فقط (العزل المؤسسي).'
            );
        }
    }

    /**
     * اختبار: مقيّم المدرسة يفتح شاشة التقييم ويسترجع شجرة المعايير والمؤشرات كاملة.
     */
    public function test_evaluator_can_load_full_standards_tree_for_active_evaluation(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->getJson("/api/v1/evaluations/{$this->evalBelqees->evaluation_id}/standards-tree");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'evaluationId',
                    'schoolId',
                    'cycleId',
                    'versionId',
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
                                            'weight',
                                            'scoreDescriptors',
                                            'verificationTools',
                                            'evidenceRequirements',
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

        $standards = $response->json('data.standards');
        $this->assertCount(7, $standards, 'يجب أن تحتوي شجرة المعايير على المعايير السبعة الرئيسية.');
        $this->assertGreaterThan(0, $response->json('meta.totalActiveIndicators'));
    }

    /**
     * اختبار: شجرة المعايير تعمل بسلاسة سواء كانت حالة الإصدار Approved أو Active (توافق G-23).
     */
    public function test_standards_tree_works_under_both_approved_and_active_version_statuses(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // 1. فحص بحالة Approved
        $this->version->update(['status' => StandardVersion::STATUS_APPROVED]);
        $resApproved = $this->getJson("/api/v1/evaluations/{$this->evalBelqees->evaluation_id}/standards-tree");
        $resApproved->assertStatus(200);
        $this->assertCount(7, $resApproved->json('data.standards'));

        // 2. فحص بحالة Active القديمة
        $this->version->update(['status' => StandardVersion::STATUS_ACTIVE]);
        $resActive = $this->getJson("/api/v1/evaluations/{$this->evalBelqees->evaluation_id}/standards-tree");
        $resActive->assertStatus(200);
        $this->assertCount(7, $resActive->json('data.standards'));
    }

    /**
     * اختبار: محاولة المقيّم استعراض شجرة تقييم مدرسة أخرى يُرجع 404 (القرار المعماري 9).
     */
    public function test_evaluator_cannot_access_other_school_standards_tree(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->getJson("/api/v1/evaluations/{$this->evalFarouq->evaluation_id}/standards-tree");

        $response->assertStatus(404);
    }

    /**
     * اختبار P0 (ملاحظات 12, 13, 22, 25): رصد درجة دون تمرير scoreDescriptorId لا يسبب خطأ SQL 500
     * بل يُحل الوصف تلقائياً عبر score_level_id المقابل لقيمة الدرجة (0-3).
     */
    public function test_save_rubric_assessment_without_descriptor_id_auto_resolves_without_sql_error(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $indicator = \App\Models\Indicator::firstOrFail();

        $response = $this->postJson('/api/v1/evaluation-results', [
            'indicatorId' => $indicator->indicator_id,
            'score' => 2,
            'justification' => 'تبرير رصد تجريبي بدون تمرير descriptorId',
            'completionStatus' => 'Completed',
        ]);

        $response->assertStatus(200);
        $this->assertEquals(2, $response->json('data.score'));
        $this->assertNotNull($response->json('data.scoreDescriptorId'));

        // التأكد من الحفظ بقاعدة البيانات
        $this->assertDatabaseHas('evaluation_results', [
            'evaluation_id' => $this->evalBelqees->evaluation_id,
            'indicator_id' => $indicator->indicator_id,
            'score' => 2,
        ]);
    }

    /**
     * اختبار P0 (ملاحظة 37): فحص الجاهزية الرقمية يحسب على 109 مؤشرات ويرجع رمز التتبع الديناميكي.
     */
    public function test_preflight_check_returns_109_indicators_and_dynamic_seal_code(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->getJson('/api/v1/evaluations/current/preflight-check');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'canSubmit',
                'readinessPercentage',
                'checklist',
                'digitalSealInfo' => ['systemCode', 'hashAlgorithm', 'submissionNotice'],
            ],
        ]);

        $checklist = $response->json('data.checklist');
        $scoresCriterion = collect($checklist)->firstWhere('id', 'scores_completed');
        $this->assertNotNull($scoresCriterion);
        $this->assertStringContainsString('109', $scoresCriterion['title']);

        $sealCode = $response->json('data.digitalSealInfo.systemCode');
        $this->assertStringStartsWith('ARQ-', $sealCode);
        $this->assertStringEndsWith('-FIN', $sealCode);
    }

    /**
     * اختبار P0 (ملاحظة 8 والقرار 1): رفع الشواهد يقبل حتى 25 ميجابايت ويرفض ما يتجاوزها.
     */
    public function test_evidence_upload_validates_25mb_limit(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // محاولة رفع ملف أكبر من 25MB (26MB = 26624 KB)
        $oversizedFile = \Illuminate\Http\UploadedFile::fake()->create('large_evidence.pdf', 26624, 'application/pdf');

        $response = $this->postJson('/api/v1/evidences/upload', [
            'file' => $oversizedFile,
            'title' => 'شاهد متضخم الحجم',
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('25 ميجابايت', $response->json('errors.file.0') ?? $response->json('message'));
    }

    /**
     * اختبار P1 (ملاحظة 9 والقرار 2): أدوات التحقق تُرجع أدوات مرجعية حقيقية من verificationTools بأسمائها وأنواعها
     */
    public function test_active_standards_tree_returns_real_verification_tools(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->getJson('/api/v1/standard-versions/active/tree');

        $response->assertStatus(200);
        $firstStandard = $response->json('data.standards.0');
        $firstIndicator = $firstStandard['subStandards'][0]['indicators'][0];

        $this->assertArrayHasKey('verificationMethods', $firstIndicator);
        $this->assertNotEmpty($firstIndicator['verificationMethods']);
        $firstTool = $firstIndicator['verificationMethods'][0];
        $this->assertArrayHasKey('toolType', $firstTool);
        $this->assertNotEmpty($firstTool['toolType']);
    }

    /**
     * اختبار P1 (ملاحظات 14، 15، 19): مستودع الشواهد يدعم فلتر المعيار ويرجع مصفوفة المؤشرات المرتبطة linkedIndicators
     */
    public function test_evidences_repository_supports_standard_filter_and_multi_links(): void
    {
        Sanctum::actingAs($this->evaluatorFarouq);

        // 1. استعلام مع فلتر المعيار 1
        $response = $this->getJson('/api/v1/evidences?standardId=1');
        $response->assertStatus(200);
        $evidences = $response->json('data.evidences');
        $this->assertIsArray($evidences);
        if (!empty($evidences)) {
            $first = $evidences[0];
            $this->assertArrayHasKey('linkedIndicators', $first);
            $this->assertArrayHasKey('documentType', $first);
            $this->assertArrayHasKey('documentTypeArabic', $first);
        }
    }

    /**
     * اختبار P1 (ملاحظات 4، 5، 16): تحديث بيانات الشاهد والنوع والوصف والمبرر
     */
    public function test_update_document_metadata_endpoint(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $doc = \App\Models\SchoolDocument::where('school_id', $this->evaluatorBelqees->school_id)->firstOrFail();

        $response = $this->patchJson("/api/v1/evidences/documents/{$doc->id}", [
            'title' => 'محضر مراجعة معايير الجودة المحدث',
            'documentType' => 'minutes',
            'description' => 'وصف تفصيلي للشاهد المعدل',
            'justification' => 'مبرر توثيقي لاستيفاء معايير المؤشر',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('محضر مراجعة معايير الجودة المحدث', $response->json('data.title'));
        $this->assertEquals('minutes', $response->json('data.documentType'));

        $this->assertDatabaseHas('school_documents', [
            'id' => $doc->id,
            'title' => 'محضر مراجعة معايير الجودة المحدث',
            'document_type' => 'minutes',
        ]);
    }
}
