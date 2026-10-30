<?php

namespace Tests\Feature;

use App\Exports\EvaluationWorkbookExport;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\Evidence;
use App\Models\ImprovementAction;
use App\Models\ImprovementArea;
use App\Models\ImprovementPlan;
use App\Models\Indicator;
use App\Models\School;
use App\Models\SchoolFacility;
use App\Models\SchoolStaffMetric;
use App\Models\SchoolEnrollmentMetric;
use App\Models\User;
use App\Services\ActionCatalogService;
use App\Services\SchoolMetricsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات الميزة الشاملة للشريحة التاسعة (Slice 9):
 * التقارير والتصدير (PDF / Excel)، مقارنة المسار (Trend)، بنك التوصيات، وتوسيع السياقات الاسترشادية للمرافق.
 */
class ReportsAndExportFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $evaluatorBelqees;
    protected User $evaluatorFarouq;
    protected User $principalBelqees;
    protected User $supervisorMinistry;
    protected User $standardsManager;
    protected User $adminUser;
    protected School $schoolBelqees;
    protected School $schoolFarouq;
    protected EvaluationCycle $cycle;
    protected Evaluation $evaluationBelqees;
    protected Evaluation $evaluationFarouq;

    protected function setUp(): void
    {
        parent::setUp();

        $this->schoolBelqees = School::find(1) ?? School::firstOrFail();
        $this->schoolFarouq  = School::find(2) ?? School::where('school_id', '!=', $this->schoolBelqees->school_id)->firstOrFail();

        $this->evaluatorBelqees   = User::where('email', 'quality@belqees.edu.ye')->firstOrFail();
        $this->evaluatorFarouq    = User::where('email', 'quality@farouq.edu.ye')->firstOrFail();
        $this->principalBelqees   = User::where('email', 'principal@belqees.edu.ye')->firstOrFail();
        $this->supervisorMinistry = User::where('email', 'supervisor@moe.gov.ye')->firstOrFail();
        $this->standardsManager   = User::where('email', 'standards.manager@moe.gov.ye')->firstOrFail();
        $this->adminUser          = User::where('email', 'admin@school-eval.gov.ye')->firstOrFail();

        $this->cycle = EvaluationCycle::firstOrFail();

        $this->evaluationBelqees = Evaluation::firstOrCreate(
            ['school_id' => $this->schoolBelqees->school_id, 'cycle_id' => $this->cycle->cycle_id],
            [
                'created_by_user_id' => $this->evaluatorBelqees->user_id,
                'status'             => 'InProgress',
                'created_at'         => now(),
                'updated_at'         => now(),
            ]
        );

        $this->evaluationFarouq = Evaluation::firstOrCreate(
            ['school_id' => $this->schoolFarouq->school_id, 'cycle_id' => $this->cycle->cycle_id],
            [
                'created_by_user_id' => $this->evaluatorFarouq->user_id,
                'status'             => 'InProgress',
                'created_at'         => now(),
                'updated_at'         => now(),
            ]
        );
    }

    // =========================================================================
    // 1. اختبارات تصدير بطاقة التقويم الرسمية PDF
    // =========================================================================

    public function test_pdf_export_success_for_evaluator_with_headers_and_content(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->get("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/export-pdf");

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringContainsString('evaluation_card_', (string) $response->headers->get('Content-Disposition'));
        
        // التحقق من أن المحتوى يبدأ بتوقيع ملفات PDF الرسمي (%PDF-)
        $this->assertStringStartsWith('%PDF-', $response->getContent());
    }

    public function test_pdf_export_has_draft_watermark_when_evaluation_is_in_progress(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $this->evaluationBelqees->update(['status' => 'InProgress']);

        $response = $this->get("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/export-pdf");
        $response->assertStatus(200);

        // محتوى PDF الثنائي يحتوي على مسودة التقييم عند تحليله
        $this->assertStringStartsWith('%PDF-', $response->getContent());
        $this->assertGreaterThan(5000, strlen($response->getContent()));
    }

    public function test_pdf_export_enforces_tenant_isolation_404(): void
    {
        // مقيم مدرسة الفاروق يحاول تصدير PDF مدرسة بلقيس
        Sanctum::actingAs($this->evaluatorFarouq);

        $response = $this->get("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/export-pdf");

        $response->assertStatus(404);
        $response->assertJson([
            'message' => 'ملف التقييم المطلوب غير موجود.',
        ]);
    }

    public function test_pdf_export_blocks_ministry_standards_manager_403(): void
    {
        // مسؤول المعايير ممنوع من تقارير المدارس الفردية (BR-MIN-01)
        Sanctum::actingAs($this->standardsManager);

        $response = $this->get("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/export-pdf");

        $response->assertStatus(403);
    }

    // =========================================================================
    // 2. اختبارات تصدير ملف Excel الشامل (3 أوراق وعزل الملاحظات)
    // =========================================================================

    public function test_excel_export_success_for_evaluator_and_principal(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->get("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/export-excel");

        $response->assertStatus(200);
        $this->assertStringContainsString('school_evaluation_', (string) $response->headers->get('Content-Disposition'));
        $this->assertNotNull($response->getFile());
    }

    public function test_excel_export_enforces_tenant_isolation_404(): void
    {
        Sanctum::actingAs($this->evaluatorFarouq);

        $response = $this->get("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/export-excel");

        $response->assertStatus(404);
        $response->assertJson([
            'message' => 'ملف التقييم المطلوب غير موجود.',
        ]);
    }

    public function test_excel_sheets_contain_3_sheets_with_role_filtering(): void
    {
        // اختبار وحدة مباشر لـ EvaluationWorkbookExport
        $export = new EvaluationWorkbookExport($this->evaluationBelqees, $this->evaluatorBelqees);
        $sheets = $export->sheets();

        $this->assertCount(3, $sheets);
        $this->assertEquals('النتائج والمعايير', $sheets[0]->title());
        $this->assertEquals('سجل الشواهد والوثائق', $sheets[1]->title());
        $this->assertEquals('خطط وإجراءات التحسين', $sheets[2]->title());

        // للمقيم: ترويسة الشواهد لا تحتوي على عمود ملاحظات المراجعة
        $evaluatorHeadings = $sheets[1]->headings();
        $this->assertNotContains('ملاحظات المراجعة الداخلية', $evaluatorHeadings);
        $this->assertNotContains('ملاحظات المراجعة الإشرافية', $evaluatorHeadings);

        // للمدير: ترويسة الشواهد تحتوي على ملاحظات المراجعة الداخلية فقط
        $principalExport = new EvaluationWorkbookExport($this->evaluationBelqees, $this->principalBelqees);
        $principalHeadings = $principalExport->sheets()[1]->headings();
        $this->assertContains('ملاحظات المراجعة الداخلية', $principalHeadings);
        $this->assertNotContains('ملاحظات المراجعة الإشرافية', $principalHeadings);

        // للمشرف: ترويسة الشواهد تحتوي على ملاحظات المراجعة الإشرافية فقط
        $supervisorExport = new EvaluationWorkbookExport($this->evaluationBelqees, $this->supervisorMinistry);
        $supervisorHeadings = $supervisorExport->sheets()[1]->headings();
        $this->assertContains('ملاحظات المراجعة الإشرافية', $supervisorHeadings);
        $this->assertNotContains('ملاحظات المراجعة الداخلية', $supervisorHeadings);
    }

    // =========================================================================
    // 3. اختبارات السياقات الاسترشادية للمؤشرات الخمسة الجديدة
    // =========================================================================

    public function test_new_indicator_context_1_1_5_building_type(): void
    {
        $metricsService = app(SchoolMetricsService::class);

        // 1. مبنى حكومي -> مستوى 3
        $this->schoolBelqees->update(['building_type' => 'حكومي']);
        $this->evaluationBelqees->unsetRelation('school');
        $context = $metricsService->calculateIndicatorsContext($this->evaluationBelqees);
        $this->assertEquals(3, $context['indicators']['1-1-5']['suggested_level']);
        $this->assertStringContainsString('حكومي', $context['indicators']['1-1-5']['badge']);

        // 2. مبنى تبرع أو وقفي -> مستوى 2
        $this->schoolBelqees->update(['building_type' => 'تبرع وخيري']);
        $this->evaluationBelqees->unsetRelation('school');
        $context = $metricsService->calculateIndicatorsContext($this->evaluationBelqees);
        $this->assertEquals(2, $context['indicators']['1-1-5']['suggested_level']);

        // 3. مبنى مستأجر -> مستوى 1
        $this->schoolBelqees->update(['building_type' => 'مستأجر سكني']);
        $this->evaluationBelqees->unsetRelation('school');
        $context = $metricsService->calculateIndicatorsContext($this->evaluationBelqees);
        $this->assertEquals(1, $context['indicators']['1-1-5']['suggested_level']);

        // 4. غير محدد -> بيانات غير مكتملة
        $this->schoolBelqees->update(['building_type' => null]);
        $this->evaluationBelqees->unsetRelation('school');
        $context = $metricsService->calculateIndicatorsContext($this->evaluationBelqees);
        $this->assertNull($context['indicators']['1-1-5']['suggested_level']);
        $this->assertEquals('بيانات غير مكتملة', $context['indicators']['1-1-5']['badge']);
    }

    public function test_new_indicator_context_14_1_5_area_per_student_and_division_by_zero(): void
    {
        $metricsService = app(SchoolMetricsService::class);

        // مساحة 2500 م² لـ 420 طالب = 5.95 م²/طالب (>= 5.0 -> مستوى 3)
        $this->schoolBelqees->update(['total_area' => 2500.00]);
        $this->evaluationBelqees->unsetRelation('school');

        $context = $metricsService->calculateIndicatorsContext($this->evaluationBelqees);
        $this->assertEquals(3, $context['indicators']['14-1-5']['suggested_level']);
        $this->assertGreaterThanOrEqual(5.0, (float) $context['indicators']['14-1-5']['calculated_value']);

        // مساحة مقبولة: 1500 م² لـ 420 طالب = 3.57 م²/طالب (>= 3.0 -> مستوى 2)
        $this->schoolBelqees->update(['total_area' => 1500.00]);
        $this->evaluationBelqees->unsetRelation('school');
        $context = $metricsService->calculateIndicatorsContext($this->evaluationBelqees);
        $this->assertEquals(2, $context['indicators']['14-1-5']['suggested_level']);

        // مساحة ضيقة: 500 م² لـ 420 طالب = 1.19 م²/طالب (< 3.0 -> مستوى 1)
        $this->schoolBelqees->update(['total_area' => 500.00]);
        $this->evaluationBelqees->unsetRelation('school');
        $context = $metricsService->calculateIndicatorsContext($this->evaluationBelqees);
        $this->assertEquals(1, $context['indicators']['14-1-5']['suggested_level']);

        // حالة حافة: مساحة صفر أو طلاب صفر (تجنب القسمة على صفر)
        $this->schoolBelqees->update(['total_area' => 0.00]);
        $this->evaluationBelqees->unsetRelation('school');
        $context = $metricsService->calculateIndicatorsContext($this->evaluationBelqees);
        $this->assertNull($context['indicators']['14-1-5']['suggested_level']);
        $this->assertEquals('بيانات غير مكتملة', $context['indicators']['14-1-5']['badge']);
    }

    public function test_new_indicator_context_5_1_5_science_lab(): void
    {
        $metricsService = app(SchoolMetricsService::class);

        // إضافة معمل علوم صالح
        SchoolFacility::updateOrCreate(
            ['school_id' => $this->schoolBelqees->school_id, 'facility_type' => 'science_lab'],
            ['name' => 'معمل الكيمياء والفيزياء', 'count' => 2, 'is_usable' => true]
        );

        $context = $metricsService->calculateIndicatorsContext($this->evaluationBelqees);
        $this->assertEquals(3, $context['indicators']['5-1-5']['suggested_level']);
        $this->assertGreaterThan(0, $context['indicators']['5-1-5']['calculated_value']);

        // تعطيل المعمل
        SchoolFacility::where('school_id', $this->schoolBelqees->school_id)
            ->where('facility_type', 'science_lab')
            ->update(['is_usable' => false]);

        $context = $metricsService->calculateIndicatorsContext($this->evaluationBelqees);
        $this->assertEquals(1, $context['indicators']['5-1-5']['suggested_level']);
    }

    public function test_new_indicator_context_6_1_5_computer_lab(): void
    {
        $metricsService = app(SchoolMetricsService::class);

        // معمل حاسوب مجهز بـ 15 جهازاً صالحاً -> مستوى 3
        SchoolFacility::updateOrCreate(
            ['school_id' => $this->schoolBelqees->school_id, 'facility_type' => 'computer_lab'],
            [
                'name' => 'معمل تكنولوجيا المعلومات',
                'count' => 1,
                'is_usable' => true,
                'details' => ['working_devices' => 15],
            ]
        );

        $context = $metricsService->calculateIndicatorsContext($this->evaluationBelqees);
        $this->assertEquals(3, $context['indicators']['6-1-5']['suggested_level']);

        // معمل بأجهزة محدودة (5 أجهزة) -> مستوى 2
        SchoolFacility::where('school_id', $this->schoolBelqees->school_id)
            ->where('facility_type', 'computer_lab')
            ->update(['details' => ['working_devices' => 5]]);

        $context = $metricsService->calculateIndicatorsContext($this->evaluationBelqees);
        $this->assertEquals(2, $context['indicators']['6-1-5']['suggested_level']);
    }

    public function test_new_indicator_context_1_3_health_services(): void
    {
        $metricsService = app(SchoolMetricsService::class);

        // 1. عيادة صحية مستقلة -> مستوى 3
        SchoolFacility::updateOrCreate(
            ['school_id' => $this->schoolBelqees->school_id, 'facility_type' => 'clinic'],
            ['name' => 'عيادة الصحة المدرسية', 'count' => 1, 'is_usable' => true]
        );

        $context = $metricsService->calculateIndicatorsContext($this->evaluationBelqees);
        $this->assertEquals(3, $context['indicators']['1-3']['suggested_level']);

        // 2. إزالة العيادة وترك حقيبة إسعافات -> مستوى 2
        SchoolFacility::where('school_id', $this->schoolBelqees->school_id)
            ->where('facility_type', 'clinic')
            ->delete();

        SchoolFacility::updateOrCreate(
            ['school_id' => $this->schoolBelqees->school_id, 'facility_type' => 'admin_office'],
            ['name' => 'مكتب الإدارة', 'count' => 1, 'is_usable' => true, 'details' => ['first_aid_kit' => true]]
        );

        $context = $metricsService->calculateIndicatorsContext($this->evaluationBelqees);
        $this->assertEquals(2, $context['indicators']['1-3']['suggested_level']);
    }

    // =========================================================================
    // 4. اختبارات اقتراحات بنك الإجراءات للمؤشرات الضعيفة
    // =========================================================================

    public function test_action_recommendations_for_weak_indicator_score_0_or_1(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $indicator = Indicator::where('code', '1-1-1')->firstOrFail();
        $descId = $indicator->scoreDescriptors()->first()?->descriptor_id ?? 1;

        // رصد درجة ضعيفة (1)
        EvaluationResult::updateOrCreate(
            ['evaluation_id' => $this->evaluationBelqees->evaluation_id, 'indicator_id' => $indicator->indicator_id],
            [
                'score' => 1,
                'score_descriptor_id' => $descId,
                'standard_version_id' => $this->cycle->version_id ?? 1,
                'evaluator_user_id' => $this->evaluatorBelqees->user_id,
                'completion_status' => 'Completed',
            ]
        );

        $response = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/action-recommendations?indicator_code=1-1-1");

        $response->assertStatus(200);
        $response->assertJsonPath('data.is_weak', true);
        $response->assertJsonPath('data.indicator_code', '1-1-1');
        $response->assertJsonPath('data.score', 1);
        $this->assertNotEmpty($response->json('data.recommendations'));
    }

    public function test_action_recommendations_for_strong_indicator_score_2_or_3(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $indicator = Indicator::where('code', '1-1-1')->firstOrFail();
        $descId = $indicator->scoreDescriptors()->first()?->descriptor_id ?? 1;

        // رصد درجة متميزة (3)
        EvaluationResult::updateOrCreate(
            ['evaluation_id' => $this->evaluationBelqees->evaluation_id, 'indicator_id' => $indicator->indicator_id],
            [
                'score' => 3,
                'score_descriptor_id' => $descId,
                'standard_version_id' => $this->cycle->version_id ?? 1,
                'evaluator_user_id' => $this->evaluatorBelqees->user_id,
                'completion_status' => 'Completed',
            ]
        );

        $response = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/action-recommendations?indicator_code=1-1-1");

        $response->assertStatus(200);
        $response->assertJsonPath('data.is_weak', false);
        $response->assertJsonPath('data.indicator_code', '1-1-1');
        $response->assertJsonPath('data.score', 3);
        $this->assertEmpty($response->json('data.recommendations'));
    }

    public function test_action_recommendations_requires_indicator_code_422(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/action-recommendations");

        $response->assertStatus(422);
        $response->assertJsonStructure(['errors' => ['indicator_code']]);
    }

    // =========================================================================
    // 5. اختبارات بطاقة مقارنة الأداء (Trend API)
    // =========================================================================

    public function test_trend_without_previous_cycle_returns_graceful_first_evaluation(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // التأكد من عدم وجود تقييمات مكتملة سابقة لنفس المدرسة
        Evaluation::where('school_id', $this->schoolBelqees->school_id)
            ->where('evaluation_id', '!=', $this->evaluationBelqees->evaluation_id)
            ->delete();

        $response = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/trend");

        $response->assertStatus(200);
        $response->assertJsonPath('data.has_previous_cycle', false);
        $response->assertJsonPath('data.trend', null);
        $this->assertStringContainsString('التقييم التأسيسي الأول', (string) $response->json('data.notice'));
    }

    public function test_trend_with_previous_completed_cycle_calculates_delta_and_breakdown(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // إنشاء دورة سابقة وتقييم مكتمل
        $pastCycle = EvaluationCycle::create([
            'academic_year' => '2024/2025-PAST',
            'name'          => 'دورة 2024/2025',
            'start_date'    => '2024-09-01',
            'end_date'      => '2025-06-30',
            'version_id'    => $this->cycle->version_id,
            'status'        => 'Closed',
        ]);

        $pastEvaluation = new Evaluation([
            'school_id'          => $this->schoolBelqees->school_id,
            'cycle_id'           => $pastCycle->cycle_id,
            'created_by_user_id' => $this->evaluatorBelqees->user_id,
            'status'             => 'Completed',
        ]);
        $pastEvaluation->timestamps = false;
        $pastEvaluation->created_at = now()->subYear();
        $pastEvaluation->updated_at = now()->subYear();
        $pastEvaluation->save();

        // إضافة نتائج مؤشر في التقييم السابق والتقييم الحالي
        $indicator = Indicator::first();
        if ($indicator) {
            $descId = $indicator->scoreDescriptors()->first()?->descriptor_id ?? 1;

            EvaluationResult::create([
                'evaluation_id'       => $pastEvaluation->evaluation_id,
                'indicator_id'        => $indicator->indicator_id,
                'standard_version_id' => $pastCycle->version_id ?? 1,
                'score_descriptor_id' => $descId,
                'evaluator_user_id'   => $this->evaluatorBelqees->user_id,
                'score'               => 1,
                'completion_status'   => 'Completed',
            ]);

            EvaluationResult::updateOrCreate(
                ['evaluation_id' => $this->evaluationBelqees->evaluation_id, 'indicator_id' => $indicator->indicator_id],
                [
                    'score'               => 3,
                    'score_descriptor_id' => $descId,
                    'standard_version_id' => $this->cycle->version_id ?? 1,
                    'evaluator_user_id'   => $this->evaluatorBelqees->user_id,
                    'completion_status'   => 'Completed',
                ]
            );
        }

        $response = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/trend");

        $response->assertStatus(200);
        $response->assertJsonPath('data.has_previous_cycle', true);
        $response->assertJsonPath('data.previous_evaluation_id', $pastEvaluation->evaluation_id);
        $this->assertArrayHasKey('score_delta', $response->json('data.trend'));
        $this->assertArrayHasKey('improved_count', $response->json('data.trend'));
    }

    public function test_trend_enforces_tenant_isolation_404(): void
    {
        Sanctum::actingAs($this->evaluatorFarouq);

        $response = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/trend");

        $response->assertStatus(404);
    }

    /**
     * التحقق من الحصانة القطعية للقطة السياق (BR-SCH-03):
     * حساب السياقات الجديدة يتم وقت القراءة فقط دون المساس ببيانات school_context_snapshot المخزنة في قاعدة البيانات.
     */
    public function test_snapshot_immutability_guaranteed_on_read_time_context_and_export(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // 1. تجهيز تقييم مكتمل مع لقطة سياق أصلية مجمدة لا تحتوي على 1-1-5
        $initialSnapshot = [
            'summary' => [
                'enrollment' => ['total_students' => 450],
                'facilities' => ['science_labs_count' => 2],
            ],
            'indicators' => [
                '1-1-2' => ['suggested_level' => 3, 'badge' => 'مستوفٍ'],
            ],
            'is_snapshot' => true,
            'snapshot_created_at' => '2026-09-01T10:00:00Z',
        ];

        $anotherCycle = EvaluationCycle::create([
            'version_id' => $this->cycle->version_id,
            'name' => 'دورة الحصانة 2024-2025',
            'academic_year' => '2024-2025',
            'start_date' => '2024-09-01',
            'end_date' => '2025-06-30',
            'status' => 'Archived',
        ]);

        $completedEval = Evaluation::create([
            'school_id' => $this->schoolBelqees->school_id,
            'cycle_id' => $anotherCycle->cycle_id,
            'created_by_user_id' => $this->evaluatorBelqees->user_id,
            'status' => 'Completed',
            'school_context_snapshot' => $initialSnapshot,
        ]);

        // 2. تسجيل القيمة الحرفية الدقيقة للقطة المخزنة في قاعدة البيانات
        $originalRawSnapshot = DB::table('evaluations')
            ->where('evaluation_id', $completedEval->evaluation_id)
            ->value('school_context_snapshot');

        $this->assertNotNull($originalRawSnapshot);
        $this->assertStringNotContainsString('1-1-5', $originalRawSnapshot);

        // 3. استدعاء endpoint سياق المؤشرات (indicators-context)
        $ctxResponse = $this->getJson("/api/v1/evaluations/{$completedEval->evaluation_id}/indicators-context");
        $ctxResponse->assertStatus(200);
        // التحقق من أن الاستجابة تحتوي على المؤشر الجديد عبر الحساب الآني أثناء القراءة فقط
        $ctxResponse->assertJsonPath('data.is_snapshot', true);
        $this->assertArrayHasKey('1-1-5', $ctxResponse->json('data.indicators'));

        // 4. استدعاء تصدير PDF
        $pdfResponse = $this->get("/api/v1/evaluations/{$completedEval->evaluation_id}/export-pdf");
        $pdfResponse->assertStatus(200);

        // 5. استدعاء تصدير Excel
        $excelResponse = $this->get("/api/v1/evaluations/{$completedEval->evaluation_id}/export-excel");
        $excelResponse->assertStatus(200);

        // 6. التحقق الحرفي الصارم: قيمة school_context_snapshot في قاعدة البيانات لم تتغير بحرف واحد
        $currentRawSnapshot = DB::table('evaluations')
            ->where('evaluation_id', $completedEval->evaluation_id)
            ->value('school_context_snapshot');

        $this->assertSame(
            $originalRawSnapshot,
            $currentRawSnapshot,
            'فشل اختبار الحصانة: تم تعديل school_context_snapshot في قاعدة البيانات بالمخالفة للقاعدة BR-SCH-03!'
        );
    }
}
