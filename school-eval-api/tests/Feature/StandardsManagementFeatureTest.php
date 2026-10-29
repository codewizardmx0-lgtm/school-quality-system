<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\IndicatorScoreDescriptor;
use App\Models\Role;
use App\Models\School;
use App\Models\Standard;
use App\Models\StandardVersion;
use App\Models\SubStandard;
use App\Models\User;
use App\Services\ReportsAnalyticsService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * اختبارات الميزة الشاملة لإدارة المعايير وإصداراتها ودورة حياتها الرسمية (الشريحة 7).
 */
class StandardsManagementFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $standardsManager;
    protected User $schoolEvaluator;
    protected User $schoolPrincipal;
    protected User $supervisor;
    protected StandardVersion $seededVersion;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seededVersion = StandardVersion::where('version_no', '2026.1')->firstOrFail();

        // مستخدم مدير المعايير الوزاري
        $this->standardsManager = User::where('email', 'standards.manager@moe.gov.ye')->firstOrFail();

        // مستخدم مقيّم المدرسة
        $this->schoolEvaluator = User::where('email', 'quality@belqees.edu.ye')->firstOrFail();

        // مستخدم مدير المدرسة
        $this->schoolPrincipal = User::where('email', 'principal@belqees.edu.ye')->firstOrFail();

        // مستخدم المشرف الوزاري
        $this->supervisor = User::where('email', 'supervisor@moe.gov.ye')->firstOrFail();
    }

    /**
     * اختبار استرجاع قائمة الإصدارات المعيارية بنجاح.
     */
    public function test_can_list_standard_versions(): void
    {
        $response = $this->actingAs($this->standardsManager, 'sanctum')
            ->getJson('/api/v1/standard-versions');

        $response->assertOk()
            ->assertJsonPath('errors', null)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'version_id',
                        'version_no',
                        'status',
                        'standards_count',
                        'indicators_count',
                        'total_weight',
                    ]
                ]
            ]);
    }

    /**
     * اختبار إنشاء مسودة إصدار جديدة فارغة.
     */
    public function test_can_create_new_draft_version(): void
    {
        $payload = [
            'version_no'          => '2027.1-DRAFT',
            'issue_date'          => '2027-01-01',
            'source_organization' => 'وزارة التربية والتعليم والبحث العلمي',
            'source_number'       => 'قرار وزاري 50 لسنة 2027',
            'source_description'  => 'مسودة أولية لتطوير المعايير',
        ];

        $response = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson('/api/v1/standard-versions', $payload);

        $response->assertCreated()
            ->assertJsonPath('errors', null)
            ->assertJsonPath('data.status', 'Draft')
            ->assertJsonPath('data.version_no', '2027.1-DRAFT');

        $this->assertDatabaseHas('standard_versions', [
            'version_no' => '2027.1-DRAFT',
            'status'     => 'Draft',
        ]);
    }

    /**
     * اختبار الاستنساخ الكامل لإصدار مُقرّ إلى مسودة جديدة مطابقة بجميع الكيانات.
     */
    public function test_can_clone_approved_version_into_draft(): void
    {
        $payload = [
            'version_no' => '2026.2-CLONED',
        ];

        $response = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$this->seededVersion->version_id}/clone", $payload);

        $response->assertCreated()
            ->assertJsonPath('errors', null)
            ->assertJsonPath('data.status', 'Draft')
            ->assertJsonPath('data.version_no', '2026.2-CLONED');

        $clonedVersion = StandardVersion::where('version_no', '2026.2-CLONED')->firstOrFail();

        // التحقق من استنساخ المعايير الـ 7 كاملة
        $this->assertEquals(7, $clonedVersion->standards()->count());
        $this->assertEquals(100.0, (float) $clonedVersion->standards()->sum('weight'));

        // التحقق من استنساخ المعايير الفرعية الـ 14 والمؤشرات الـ 109
        $indicatorsCount = Indicator::whereHas('subStandard.standard', function ($q) use ($clonedVersion) {
            $q->where('version_id', $clonedVersion->version_id);
        })->count();
        $this->assertEquals(109, $indicatorsCount);

        // التحقق من استنساخ الواصفات ومتطلبات الشواهد
        $descriptorsCount = IndicatorScoreDescriptor::where('standard_version_id', $clonedVersion->version_id)->count();
        $this->assertEquals(436, $descriptorsCount);

        $requirementsCount = IndicatorEvidenceRequirement::where('standard_version_id', $clonedVersion->version_id)->count();
        $this->assertEquals(278, $requirementsCount);
    }

    /**
     * اختبار رفض استنساخ إصدار مسودة (الاستنساخ متاح للإصدارات المُقرّة فقط).
     */
    public function test_cannot_clone_draft_version(): void
    {
        $draft = StandardVersion::create([
            'version_no' => 'TEMP-DRAFT',
            'issue_date' => now(),
            'source_organization' => 'Ministry',
            'status' => 'Draft',
        ]);

        $response = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$draft->version_id}/clone", [
                'version_no' => 'DRAFT-FROM-DRAFT',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['source_version']);
    }

    /**
     * اختبار تعديل نصوص المعايير والمؤشرات داخل المسودة.
     */
    public function test_can_modify_standards_and_indicators_inside_draft(): void
    {
        // استنساخ مسودة للتعديل عليها
        $clonedResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$this->seededVersion->version_id}/clone", [
                'version_no' => '2026.MOD-TEST',
            ]);

        $clonedId = $clonedResponse->json('data.version_id');
        $firstStandard = Standard::where('version_id', $clonedId)->firstOrFail();
        $firstSub = SubStandard::where('standard_id', $firstStandard->standard_id)->firstOrFail();
        $firstIndicator = Indicator::where('sub_standard_id', $firstSub->sub_standard_id)->firstOrFail();

        // 1. تعديل المعيار
        $stdResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/standards/{$firstStandard->standard_id}", [
                'name' => 'القيادة والإدارة المدرسية المطورة',
            ]);
        $stdResponse->assertOk()
            ->assertJsonPath('data.name', 'القيادة والإدارة المدرسية المطورة');

        // 2. تعديل المعيار الفرعي / المجال
        $subResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/sub-standards/{$firstSub->sub_standard_id}", [
                'name' => 'التخطيط الاستراتيجي الحديث',
            ]);
        $subResponse->assertOk()
            ->assertJsonPath('data.name', 'التخطيط الاستراتيجي الحديث');

        // 3. تعديل المؤشر
        $indResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/indicators/{$firstIndicator->indicator_id}", [
                'name' => 'تمتلك المدرسة خطة تشغيلية حديثة وموثقة',
            ]);
        $indResponse->assertOk()
            ->assertJsonPath('data.name', 'تمتلك المدرسة خطة تشغيلية حديثة وموثقة');
    }

    /**
     * اختبار تعديل أوزان المعايير مع قيد الحتمية (المجموع = 100.00%).
     */
    public function test_enforces_weights_sum_equals_100_percent(): void
    {
        $clonedResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$this->seededVersion->version_id}/clone", [
                'version_no' => '2026.WEIGHT-TEST',
            ]);

        $clonedId = $clonedResponse->json('data.version_id');
        $standards = Standard::where('version_id', $clonedId)->get();

        // محاولة إرسال أوزان غير متزنة (مجموعها = 95%)
        $invalidWeights = [];
        foreach ($standards as $index => $std) {
            $invalidWeights[] = [
                'standard_id' => $std->standard_id,
                'weight'      => ($index === 0) ? 10.0 : $std->weight, // نقص 5%
            ];
        }

        $failResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/standard-versions/{$clonedId}/weights", [
                'standards_weights' => $invalidWeights,
            ]);

        $failResponse->assertStatus(422)
            ->assertJsonValidationErrors(['weights']);

        // إرسال أوزان متزنة بدقة (مجموعها 100.00%)
        // تغيير المعيار الأول إلى 20% والمعيار الثاني إلى 15% (مع بقاء المجموع 100%)
        $validWeights = [];
        foreach ($standards as $index => $std) {
            $w = (float) $std->weight;
            if ($index === 0) $w = 20.0;
            if ($index === 1) $w = 15.0;
            $validWeights[] = [
                'standard_id' => $std->standard_id,
                'weight'      => $w,
            ];
        }

        $successResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/standard-versions/{$clonedId}/weights", [
                'standards_weights' => $validWeights,
            ]);

        $successResponse->assertOk()
            ->assertJsonPath('errors', null);
    }

    /**
     * اختبار إدارة متطلبات الشواهد (إضافة، تعديل، حذف) داخل المسودة.
     */
    public function test_can_manage_evidence_requirements_in_draft(): void
    {
        $clonedResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$this->seededVersion->version_id}/clone", [
                'version_no' => '2026.REQ-TEST',
            ]);

        $clonedId = $clonedResponse->json('data.version_id');
        $indicator = Indicator::whereHas('subStandard.standard', function ($q) use ($clonedId) {
            $q->where('version_id', $clonedId);
        })->firstOrFail();

        // 1. إضافة متطلب شاهد جديد
        $addResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/indicators/{$indicator->indicator_id}/requirements", [
                'title'       => 'سجل اجتماعات مجلس إدارة المدرسة السنوي',
                'description' => 'محاضر رسمية موقعة ومختومة',
                'required'    => true,
            ]);

        $addResponse->assertCreated()
            ->assertJsonPath('data.title', 'سجل اجتماعات مجلس إدارة المدرسة السنوي');

        $reqId = $addResponse->json('data.requirement_id');

        // 2. تعديل متطلب الشاهد
        $updateResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/indicators/{$indicator->indicator_id}/requirements/{$reqId}", [
                'title'    => 'سجل اجتماعات مجلس الإدارة المعدل',
                'required' => false,
            ]);

        $updateResponse->assertOk()
            ->assertJsonPath('data.title', 'سجل اجتماعات مجلس الإدارة المعدل')
            ->assertJsonPath('data.required', false);

        // 3. حذف متطلب الشاهد
        $deleteResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->deleteJson("/api/v1/indicators/{$indicator->indicator_id}/requirements/{$reqId}");

        $deleteResponse->assertOk();
        $this->assertDatabaseMissing('indicator_evidence_requirements', [
            'requirement_id' => $reqId,
        ]);
    }

    /**
     * اختبار إقرار المسودة والأرشفة التلقائية للإصدار المُقرّ السابق.
     */
    public function test_can_approve_draft_and_auto_archive_previous_version(): void
    {
        $clonedResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$this->seededVersion->version_id}/clone", [
                'version_no' => '2027.OFFICIAL',
            ]);

        $clonedId = $clonedResponse->json('data.version_id');

        $approveResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$clonedId}/approve");

        $approveResponse->assertOk()
            ->assertJsonPath('data.status', 'Approved');

        // التحقق من أرشفة الإصدار السابق تلقائيًا
        $this->seededVersion->refresh();
        $this->assertEquals('Archived', $this->seededVersion->status);

        // التحقق من أن الإصدار الجديد أصبح Approved
        $newOfficial = StandardVersion::find($clonedId);
        $this->assertEquals('Approved', $newOfficial->status);
    }

    /**
     * اختبار حظر تعديل أي عنصر (معيار، مؤشر، متطلب) في إصدار مُقرّ أو مؤرشف (قاعدة 422).
     */
    public function test_cannot_modify_items_in_approved_or_archived_version(): void
    {
        // الإصدار المعتمد 2026.1 مُقرّ (Active/Approved)
        $standard = Standard::where('version_id', $this->seededVersion->version_id)->firstOrFail();
        $subStandard = SubStandard::where('standard_id', $standard->standard_id)->firstOrFail();
        $indicator = Indicator::where('sub_standard_id', $subStandard->sub_standard_id)->firstOrFail();
        $req = IndicatorEvidenceRequirement::where('indicator_id', $indicator->indicator_id)->firstOrFail();

        // 1. محاولة تعديل معيار في إصدار مُقرّ
        $resStd = $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/standards/{$standard->standard_id}", [
                'name' => 'تعديل ممنوع',
            ]);
        $resStd->assertStatus(422)
            ->assertJsonValidationErrors(['version']);

        // 2. محاولة تعديل مؤشر في إصدار مُقرّ
        $resInd = $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/indicators/{$indicator->indicator_id}", [
                'name' => 'تعديل ممنوع للمؤشر',
            ]);
        $resInd->assertStatus(422)
            ->assertJsonValidationErrors(['version']);

        // 3. محاولة تعديل متطلب شاهد في إصدار مُقرّ
        $resReq = $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/indicators/{$indicator->indicator_id}/requirements/{$req->requirement_id}", [
                'title' => 'عنوان معدل ممنوع',
            ]);
        $resReq->assertStatus(422)
            ->assertJsonValidationErrors(['version']);
    }

    /**
     * اختبار منع ربط دورة تقييم جديدة بإصدار ليس Approved (مسودة).
     */
    public function test_cannot_link_evaluation_cycle_to_draft_version(): void
    {
        $draft = StandardVersion::create([
            'version_no' => 'DRAFT-CYCLE-TEST',
            'issue_date' => now(),
            'source_organization' => 'Ministry',
            'status' => 'Draft',
        ]);

        $this->expectException(\Illuminate\Validation\ValidationException::class);

        EvaluationCycle::create([
            'version_id'    => $draft->version_id,
            'academic_year' => '2027/2028',
            'start_date'    => '2027-09-01',
            'end_date'      => '2028-06-30',
            'status'        => 'Active',
        ]);
    }

    /**
     * اختبار الصلاحيات (RBAC): الأدوار الأخرى تُحظر من التعديل برمز 403.
     */
    public function test_unauthorized_roles_receive_forbidden_on_modifications(): void
    {
        // محاولة مقيّم المدرسة إنشاء مسودة
        $evaluatorResponse = $this->actingAs($this->schoolEvaluator, 'sanctum')
            ->postJson('/api/v1/standard-versions', [
                'version_no' => 'ILLEGAL-BY-EVALUATOR',
            ]);
        $evaluatorResponse->assertForbidden();

        // محاولة مدير المدرسة تعديل معيار
        $firstStandard = Standard::where('version_id', $this->seededVersion->version_id)->firstOrFail();
        $principalResponse = $this->actingAs($this->schoolPrincipal, 'sanctum')
            ->putJson("/api/v1/standards/{$firstStandard->standard_id}", [
                'name' => 'محاولة غير مصرحة',
            ]);
        $principalResponse->assertForbidden();

        // محاولة المشرف الوزاري إقرار إصدار
        $supervisorResponse = $this->actingAs($this->supervisor, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$this->seededVersion->version_id}/approve");
        $supervisorResponse->assertForbidden();
    }

    /**
     * اختبار الأمان المعماري: تقييم قديم مرتبط بإصدار سابق لا تتأثر نتائجه إطلاقًا بعد إنشاء وإقرار إصدار جديد بأوزان مختلفة.
     */
    public function test_existing_evaluation_results_unaffected_by_new_version_and_weights(): void
    {
        $service = app(ReportsAnalyticsService::class);

        // إنشاء دورة تقييم وتقييم مرتبط بالإصدار الأول إن لم يكن موجوداً
        $cycle = EvaluationCycle::where('version_id', $this->seededVersion->version_id)->first();
        if (!$cycle) {
            $cycle = EvaluationCycle::create([
                'version_id'    => $this->seededVersion->version_id,
                'academic_year' => '2026/2027',
                'start_date'    => '2026-09-01',
                'end_date'      => '2027-06-30',
                'status'        => 'Active',
            ]);
        }

        $school = School::firstOrFail();
        $evaluation = Evaluation::create([
            'school_id'          => $school->school_id,
            'cycle_id'           => $cycle->cycle_id,
            'created_by_user_id' => $this->standardsManager->user_id,
            'status'             => 'InProgress',
        ]);

        // رصد بعض الدرجات للتقييم
        $firstIndicator = Indicator::whereHas('subStandard.standard', function ($q) {
            $q->where('version_id', $this->seededVersion->version_id);
        })->firstOrFail();

        $descriptor = IndicatorScoreDescriptor::where('indicator_id', $firstIndicator->indicator_id)->first();

        EvaluationResult::create([
            'evaluation_id'       => $evaluation->evaluation_id,
            'indicator_id'        => $firstIndicator->indicator_id,
            'standard_version_id' => $this->seededVersion->version_id,
            'score_descriptor_id' => $descriptor?->descriptor_id,
            'evaluator_user_id'   => $this->schoolEvaluator->user_id,
            'score'               => 3,
            'completion_status'   => 'Completed',
        ]);

        $originalResults = $service->calculateAssessmentResults($evaluation);
        $originalTotalScore = $originalResults['final_score'];

        // 1. استنساخ مسودة جديدة
        $clonedResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$this->seededVersion->version_id}/clone", [
                'version_no' => '2028.IMMUNITY-TEST',
            ]);

        $clonedId = $clonedResponse->json('data.version_id');
        $clonedStandards = Standard::where('version_id', $clonedId)->get();

        // 2. تغيير أوزان الإصدار الجديد جذريًا (مع بقاء المجموع = 100%)
        // المعيار 1: 50%، المعيار 2: 50%، وبقية المعايير 0%
        $alteredWeights = [];
        foreach ($clonedStandards as $index => $std) {
            $w = 0.0;
            if ($index === 0) $w = 50.0;
            if ($index === 1) $w = 50.0;
            $alteredWeights[] = [
                'standard_id' => $std->standard_id,
                'weight'      => $w,
            ];
        }

        $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/standard-versions/{$clonedId}/weights", [
                'standards_weights' => $alteredWeights,
            ])->assertOk();

        // 3. إقرار الإصدار الجديد
        $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$clonedId}/approve")
            ->assertOk();

        // 4. إعادة حساب نتيجة التقييم القديم والتأكد من تطابقها التام دون أي انحراف
        $evaluation->refresh();
        $aftermathResults = $service->calculateAssessmentResults($evaluation);

        $this->assertEquals($originalTotalScore, $aftermathResults['final_score']);
        $this->assertEquals($originalResults['standards_total_weight'], $aftermathResults['standards_total_weight']);
    }
}
