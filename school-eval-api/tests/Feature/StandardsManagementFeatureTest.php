<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\IndicatorScoreDescriptor;
use App\Models\IndicatorVerificationMethod;
use App\Models\Role;
use App\Models\School;
use App\Models\ScoreLevel;
use App\Models\Standard;
use App\Models\StandardVersion;
use App\Models\SubStandard;
use App\Models\User;
use App\Services\AuditLoggerService;
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

        // التحقق من استنساخ أساليب وأدوات التحقق المقررة للمؤشرات (REV-T027 / U-28)
        $sourceMethodsCount = IndicatorVerificationMethod::whereHas('indicator.subStandard.standard', function ($q) {
            $q->where('version_id', $this->seededVersion->version_id);
        })->count();

        $clonedMethodsCount = IndicatorVerificationMethod::whereHas('indicator.subStandard.standard', function ($q) use ($clonedVersion) {
            $q->where('version_id', $clonedVersion->version_id);
        })->count();

        $this->assertGreaterThan(0, $sourceMethodsCount, 'يجب أن يحتوي الإصدار المصدر على أساليب تحقق مقررة.');
        $this->assertEquals($sourceMethodsCount, $clonedMethodsCount, 'يجب أن يتطابق عدد أساليب التحقق المستنسخة مع الإصدار المصدر.');

        // التحقق من بقاء الإصدار المصدر دون تغيير
        $this->assertEquals(109, Indicator::whereHas('subStandard.standard', fn($q) => $q->where('version_id', $this->seededVersion->version_id))->count());
        $this->assertEquals($sourceMethodsCount, IndicatorVerificationMethod::whereHas('indicator.subStandard.standard', fn($q) => $q->where('version_id', $this->seededVersion->version_id))->count());
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
     * اختبار إقرار المسودة دون التأثير على الإصدار النشط الحالي.
     */
    public function test_can_approve_draft_without_affecting_current_active_version(): void
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

        // التحقق من أن الإصدار النشط الحالي لم يتأثر وظل نشطاً دون أرشفة
        $this->seededVersion->refresh();
        $this->assertEquals(StandardVersion::STATUS_ACTIVE, $this->seededVersion->status);

        // التحقق من أن الإصدار الجديد أصبح Approved
        $newOfficial = StandardVersion::find($clonedId);
        $this->assertEquals(StandardVersion::STATUS_APPROVED, $newOfficial->status);
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

        // إنشاء دورة تقييم معزولة لهذا الاختبار لضمان عدم التعارض مع بيانات البذور
        $cycle = EvaluationCycle::create([
            'version_id'    => $this->seededVersion->version_id,
            'academic_year' => '2028/2029-IMMUNITY',
            'start_date'    => '2028-09-01',
            'end_date'      => '2029-06-30',
            'status'        => 'Active',
        ]);

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

    /**
     * اختبار إضافة معيار ثامن (أو أكثر) ومجال فرعي ومؤشر داخل مسودة.
     */
    public function test_can_create_8th_standard_and_substandard_and_indicator_in_draft(): void
    {
        // 1. استنساخ مسودة
        $cloned = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$this->seededVersion->version_id}/clone", [
                'version_no' => '2029.DRAFT-8TH',
            ])->assertCreated();

        $versionId = $cloned->json('data.version_id');

        // 2. إضافة معيار ثامن جديد (ST-08)
        $stdResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$versionId}/standards", [
                'code'        => 'ST-08',
                'name'        => 'المعيار الثامن: الابتكار والتحول الرقمي',
                'description' => 'معيار تقييم كفاءة التقنيات والتحول الرقمي المدرسي',
                'weight'      => 10.00,
            ]);

        $stdResponse->assertCreated()
            ->assertJsonPath('data.code', 'ST-08');

        $standardId = $stdResponse->json('data.standard_id');

        // 3. إضافة مجال فرعي تابع للمعيار الثامن
        $subResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standards/{$standardId}/sub-standards", [
                'code'        => 'SUB-08-01',
                'name'        => 'البنية التحتية والمنصات الذكية',
                'description' => 'جاهزية المنصات والتجهيزات الرقمية',
            ]);

        $subResponse->assertCreated()
            ->assertJsonPath('data.code', 'SUB-08-01');

        $subStandardId = $subResponse->json('data.sub_standard_id');

        // 4. إضافة مؤشر تابع للمجال الفرعي
        $indResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/sub-standards/{$subStandardId}/indicators", [
                'code'        => 'IND-08-01-01',
                'name'        => 'توفر المدرسة منصة رقمية لإدارة التعلم ومتابعة الطلاب',
                'description' => 'تستخدم المدرسة نظاماً إلكترونياً تفاعلياً',
                'weight'      => 1.00,
            ]);

        $indResponse->assertCreated()
            ->assertJsonPath('data.code', 'IND-08-01-01');

        $indicatorId = $indResponse->json('data.indicator_id');

        // التحقق من توليد 4 واصفات درجات أداء تلقائياً للمؤشر الجديد
        $descriptorsCount = IndicatorScoreDescriptor::where('indicator_id', $indicatorId)
            ->where('standard_version_id', $versionId)
            ->count();

        $this->assertEquals(4, $descriptorsCount);

        // 5. إضافة متطلب شاهد (الطبقة الذرية للمؤشر)
        $reqResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/indicators/{$indicatorId}/requirements", [
                'title'       => 'تقرير تفعيل بوابة التعلم الرقمية',
                'description' => 'إحصائيات دخول المعلمين والطلاب وسجلات الدروس الافتراضية',
                'required'    => true,
            ]);

        $reqResponse->assertCreated()
            ->assertJsonPath('data.title', 'تقرير تفعيل بوابة التعلم الرقمية');

        // 6. التحقق من ظهور المعيار الثامن ومجاله ومؤشره ومتطلباته في استعراض الشجرة show
        $treeResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->getJson("/api/v1/standard-versions/{$versionId}");

        $treeResponse->assertOk();
        $standards = collect($treeResponse->json('data.standards'));
        $eighthStandard = $standards->firstWhere('code', 'ST-08');
        $this->assertNotNull($eighthStandard);
        $this->assertCount(1, $eighthStandard['subStandards']);
        $this->assertCount(1, $eighthStandard['subStandards'][0]['indicators']);
        $this->assertCount(1, $eighthStandard['subStandards'][0]['indicators'][0]['evidenceRequirements']);
    }

    /**
     * اختبار منع إنشاء أو حذف معايير في إصدار مُقرّ (Approved Immutability).
     */
    public function test_cannot_create_or_delete_standard_in_approved_version(): void
    {
        // محاولة إضافة معيار في الإصدار المُقرّ الأصلي
        $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$this->seededVersion->version_id}/standards", [
                'code' => 'ST-ILLEGAL',
                'name' => 'معيار غير قانوني',
            ])->assertUnprocessable();

        // محاولة حذف أول معيار في الإصدار المُقرّ
        $firstStandard = $this->seededVersion->standards()->firstOrFail();
        $this->actingAs($this->standardsManager, 'sanctum')
            ->deleteJson("/api/v1/standards/{$firstStandard->standard_id}")
            ->assertUnprocessable();
    }

    /**
     * اختبار حذف معيار ومجال ومؤشر داخل مسودة.
     */
    public function test_can_delete_standard_hierarchy_in_draft(): void
    {
        // إنشاء مسودة
        $cloned = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$this->seededVersion->version_id}/clone", [
                'version_no' => '2030.DRAFT-DEL',
            ])->assertCreated();

        $versionId = $cloned->json('data.version_id');

        // أخذ آخر معيار تم استنساخه
        $lastStandard = Standard::where('version_id', $versionId)->orderBy('standard_id', 'desc')->firstOrFail();
        $stdId = $lastStandard->standard_id;

        // حذف المعيار
        $this->actingAs($this->standardsManager, 'sanctum')
            ->deleteJson("/api/v1/standards/{$stdId}")
            ->assertOk();

        // التأكد من حذفه من قاعدة البيانات
        $this->assertDatabaseMissing('standards', ['standard_id' => $stdId]);
    }

    // =========================================================================
    // اختبارات ضابط اتساق الإصدارات المعيارية والأرشفة الذرية (G-23 - الشريحة 11)
    // =========================================================================

    /**
     * اختبار إقرار مسودة جديدة لا يؤثر على الإصدار النشط الحالي (G-23).
     * الإقرار (Approve) يعتمد المسودة ويجمدها فقط، دون أن يؤرشف الإصدار الساري.
     */
    public function test_approving_new_version_does_not_affect_existing_active_version_g23(): void
    {
        $clonedResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$this->seededVersion->version_id}/clone", [
                'version_no' => '2027.APPROVE-OK',
            ]);
        $clonedResponse->assertCreated();
        $newVersionId = $clonedResponse->json('data.version_id');

        // إقرار المسودة
        $approveResponse = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$newVersionId}/approve");
        $approveResponse->assertOk()
            ->assertJsonPath('data.status', 'Approved');

        // التحقق من أن الإصدار النشط الحالي لم يتأثر وظل نشطاً دون أي أرشفة
        $this->seededVersion->refresh();
        $this->assertEquals(StandardVersion::STATUS_ACTIVE, $this->seededVersion->status, 'الإصدار النشط الحالي يجب ألا يؤرشف عند الإقرار.');

        // التحقق من أن الإصدار الجديد أصبح Approved
        $newVersion = StandardVersion::find($newVersionId);
        $this->assertEquals(StandardVersion::STATUS_APPROVED, $newVersion->status);
    }

    /**
     * اختبار مسار التنشيط الصريح /activate عبر API:
     * ينشط الإصدار المطلوب إلى Active ويؤرشف الإصدار النشط السابق تلقائيًا داخل DB::transaction مع تسجيل التدقيق (G-23).
     */
    public function test_explicit_activate_endpoint_works_and_archives_previous_active_g23(): void
    {
        // إنشاء إصدار جديد
        $draft = StandardVersion::create([
            'version_no'          => '2028.ACTIVATE-API',
            'issue_date'          => now()->toDateString(),
            'source_organization' => 'وزارة التربية والتعليم والبحث العلمي',
            'status'              => StandardVersion::STATUS_DRAFT,
        ]);

        $response = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$draft->version_id}/activate");
        $response->assertOk();

        // الإصدار النشط السابق تم أرشفته
        $this->seededVersion->refresh();
        $this->assertEquals(StandardVersion::STATUS_ARCHIVED, $this->seededVersion->status, 'يجب أرشفة الإصدار النشط السابق تلقائياً عند التنشيط.');

        // الإصدار الجديد أصبح Active
        $draft->refresh();
        $this->assertEquals(StandardVersion::STATUS_ACTIVE, $draft->status);

        // التحقق من وجود إصدار واحد فقط بحالة Active في النظام
        $activeCount = StandardVersion::where('status', StandardVersion::STATUS_ACTIVE)->count();
        $this->assertEquals(1, $activeCount, 'يجب أن يكون هناك إصدار نشط واحد فقط.');

        // التحقق من تسجيل عمليتي التدقيق
        $autoArchivedLog = AuditLog::where('action', AuditLoggerService::ACTION_STANDARD_VERSION_AUTO_ARCHIVED)
            ->where('target_id', $this->seededVersion->version_id)
            ->latest('log_id')
            ->first();

        $this->assertNotNull($autoArchivedLog, 'يجب تسجيل تدقيق للأرشفة التلقائية.');
        $this->assertEquals($this->standardsManager->user_id, $autoArchivedLog->user_id);
        $this->assertEquals(StandardVersion::STATUS_ARCHIVED, $autoArchivedLog->new_values['status']);

        $activatedLog = AuditLog::where('action', AuditLoggerService::ACTION_STANDARD_VERSION_ACTIVATED)
            ->where('target_id', $draft->version_id)
            ->latest('log_id')
            ->first();

        $this->assertNotNull($activatedLog, 'يجب تسجيل تدقيق لتنشيط الإصدار الجديد.');
        $this->assertEquals($this->standardsManager->user_id, $activatedLog->user_id);
    }

    /**
     * اختبار الضمانة على مستوى النموذج (Model Level Safeguard):
     * تحديث مباشر لنموذج ليصبح Active يؤرشف أي إصدار نشط آخر تلقائياً دون التأثير على Approved أو Draft (G-23).
     */
    public function test_model_safeguard_prevents_multiple_active_versions_simultaneously_g23(): void
    {
        $v1 = StandardVersion::create([
            'version_no'          => '2099.V1',
            'issue_date'          => now()->toDateString(),
            'source_organization' => 'وزارة التربية والتعليم والبحث العلمي',
            'status'              => StandardVersion::STATUS_DRAFT,
        ]);

        $v2 = StandardVersion::create([
            'version_no'          => '2099.V2',
            'issue_date'          => now()->toDateString(),
            'source_organization' => 'وزارة التربية والتعليم والبحث العلمي',
            'status'              => StandardVersion::STATUS_DRAFT,
        ]);

        $vApproved = StandardVersion::create([
            'version_no'          => '2099.V-APPROVED',
            'issue_date'          => now()->toDateString(),
            'source_organization' => 'وزارة التربية والتعليم والبحث العلمي',
            'status'              => StandardVersion::STATUS_APPROVED,
        ]);

        // تنشيط الأول
        $v1->update(['status' => StandardVersion::STATUS_ACTIVE]);
        $this->assertEquals(StandardVersion::STATUS_ACTIVE, $v1->fresh()->status);

        // التأكد من أن الإصدار المُقر (Approved) لم يتأثر
        $this->assertEquals(StandardVersion::STATUS_APPROVED, $vApproved->fresh()->status);

        // تنشيط الثاني مباشرة عبر النموذج
        $v2->update(['status' => StandardVersion::STATUS_ACTIVE]);
        $this->assertEquals(StandardVersion::STATUS_ACTIVE, $v2->fresh()->status);

        // يجب أن يكون الأول (Active) قد أُرشِف تلقائياً بواسطة Booted Model Safeguard
        $this->assertEquals(StandardVersion::STATUS_ARCHIVED, $v1->fresh()->status);

        // والإصدار Approved لا يزال Approved دون أي تغيير
        $this->assertEquals(StandardVersion::STATUS_APPROVED, $vApproved->fresh()->status);

        // عدد الإصدارات بحالة Active الآن في النظام هو 1 فقط
        $activeCount = StandardVersion::where('status', StandardVersion::STATUS_ACTIVE)->count();
        $this->assertEquals(1, $activeCount);
    }

    /**
     * اختبار إضافة وتحديث وزن المعيار الفرعي (SubStandard Weight Persistence) - القرار 1.
     */
    public function test_sub_standard_weight_can_be_stored_and_updated_in_draft(): void
    {
        $draft = StandardVersion::create([
            'version_no'          => '2099.WEIGHT-TEST',
            'issue_date'          => now()->toDateString(),
            'source_organization' => 'وزارة التربية والتعليم',
            'status'              => StandardVersion::STATUS_DRAFT,
        ]);

        $std = Standard::create([
            'version_id'  => $draft->version_id,
            'code'        => 'STD-W1',
            'name'        => 'معيار تجربة الوزن',
            'weight'      => 20.0,
        ]);

        // إضافة معيار فرعي مع وزنه
        $resStore = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standards/{$std->standard_id}/sub-standards", [
                'code'        => 'SUB-W1-1',
                'name'        => 'مجال فرعي أول',
                'description' => 'وصف تجريبي',
                'weight'      => 10.0,
            ]);

        $resStore->assertCreated();
        $subId = $resStore->json('data.sub_standard_id');
        $this->assertDatabaseHas('sub_standards', [
            'sub_standard_id' => $subId,
            'weight'          => 10.0,
        ]);

        // تحديث وزن المعيار الفرعي
        $resUpdate = $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/sub-standards/{$subId}", [
                'name'   => 'مجال فرعي أول معدل',
                'weight' => 12.5,
            ]);

        $resUpdate->assertOk();
        $this->assertDatabaseHas('sub_standards', [
            'sub_standard_id' => $subId,
            'weight'          => 12.5,
        ]);
    }

    /**
     * اختبار التحقق الحتمي من توازن أوزان المعايير الفرعية (المجموع = وزن المعيار الرئيسي) - القرار 1.
     */
    public function test_three_level_weights_validation_enforces_sub_standards_sum_matches_parent_standard(): void
    {
        $draft = StandardVersion::create([
            'version_no'          => '2099.THREE-LEVEL',
            'issue_date'          => now()->toDateString(),
            'source_organization' => 'وزارة التربية والتعليم',
            'status'              => StandardVersion::STATUS_DRAFT,
        ]);

        $std1 = Standard::create([
            'version_id' => $draft->version_id,
            'code'       => 'STD-A',
            'name'       => 'المعيار الأول',
            'weight'     => 60.0,
        ]);

        $std2 = Standard::create([
            'version_id' => $draft->version_id,
            'code'       => 'STD-B',
            'name'       => 'المعيار الثاني',
            'weight'     => 40.0,
        ]);

        $subA1 = SubStandard::create([
            'standard_id' => $std1->standard_id,
            'code'        => 'SUB-A1',
            'name'        => 'مجال أ-1',
            'weight'      => 30.0,
        ]);

        $subA2 = SubStandard::create([
            'standard_id' => $std1->standard_id,
            'code'        => 'SUB-A2',
            'name'        => 'مجال أ-2',
            'weight'      => 30.0,
        ]);

        // 1. محاولة إرسال أوزان غير متزنة للمعيار الفرعي (30 + 20 = 50 != 60)
        $resInvalid = $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/standard-versions/{$draft->version_id}/weights", [
                'standards_weights' => [
                    ['standard_id' => $std1->standard_id, 'weight' => 60.0],
                    ['standard_id' => $std2->standard_id, 'weight' => 40.0],
                ],
                'sub_standards_weights' => [
                    ['sub_standard_id' => $subA1->sub_standard_id, 'weight' => 30.0],
                    ['sub_standard_id' => $subA2->sub_standard_id, 'weight' => 20.0], // نقص 10%
                ],
            ]);

        $resInvalid->assertStatus(422);
        $resInvalid->assertJsonValidationErrors(['sub_standards_weights']);

        // 2. إرسال أوزان متزنة تماماً (30 + 30 = 60)
        $resValid = $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/standard-versions/{$draft->version_id}/weights", [
                'standards_weights' => [
                    ['standard_id' => $std1->standard_id, 'weight' => 60.0],
                    ['standard_id' => $std2->standard_id, 'weight' => 40.0],
                ],
                'sub_standards_weights' => [
                    ['sub_standard_id' => $subA1->sub_standard_id, 'weight' => 35.0],
                    ['sub_standard_id' => $subA2->sub_standard_id, 'weight' => 25.0], // مجموعها 60
                ],
            ]);

        $resValid->assertOk();
        $this->assertEquals(35.0, (float) $subA1->fresh()->weight);
        $this->assertEquals(25.0, (float) $subA2->fresh()->weight);
    }

    /**
     * اختبار التوزيع التلقائي المتساوي لوزن المعيار الفرعي على مؤشراته عند عدم تحديد أوزان المؤشرات - القرار 1.
     */
    public function test_sub_standards_weight_auto_distributes_equally_to_indicators_when_omitted(): void
    {
        $draft = StandardVersion::create([
            'version_no'          => '2099.AUTO-DISTRIB',
            'issue_date'          => now()->toDateString(),
            'source_organization' => 'وزارة التربية والتعليم',
            'status'              => StandardVersion::STATUS_DRAFT,
        ]);

        $std = Standard::create([
            'version_id' => $draft->version_id,
            'code'       => 'STD-AUTO',
            'name'       => 'معيار التوزيع',
            'weight'     => 100.0,
        ]);

        $sub = SubStandard::create([
            'standard_id' => $std->standard_id,
            'code'        => 'SUB-AUTO',
            'name'        => 'مجال التوزيع',
            'weight'      => 100.0,
        ]);

        $ind1 = Indicator::create([
            'sub_standard_id' => $sub->sub_standard_id,
            'code'            => 'IND-AUTO-1',
            'name'            => 'مؤشر 1',
            'status'          => 'Active',
        ]);

        $ind2 = Indicator::create([
            'sub_standard_id' => $sub->sub_standard_id,
            'code'            => 'IND-AUTO-2',
            'name'            => 'مؤشر 2',
            'status'          => 'Active',
        ]);

        // تحديث أوزان المعيار والمجال (100%) دون إرسال indicators_weights
        $res = $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/standard-versions/{$draft->version_id}/weights", [
                'standards_weights' => [
                    ['standard_id' => $std->standard_id, 'weight' => 100.0],
                ],
                'sub_standards_weights' => [
                    ['sub_standard_id' => $sub->sub_standard_id, 'weight' => 100.0],
                ],
            ]);

        $res->assertOk();

        // يجب أن يوزع الـ 100% بالتساوي (50% لكل مؤشر من الاثنين)
        $this->assertEquals(50.0, (float) $ind1->fresh()->weight);
        $this->assertEquals(50.0, (float) $ind2->fresh()->weight);
    }

    /**
     * اختبار نسخ وزن المعيار الفرعي في الاستنساخ العميق (Deep Cloning) - القرار 1.
     */
    public function test_deep_clone_preserves_sub_standards_weights(): void
    {
        $approvedVersion = StandardVersion::create([
            'version_no'          => '2099.CLONE-SOURCE',
            'issue_date'          => now()->toDateString(),
            'source_organization' => 'وزارة التربية والتعليم',
            'status'              => StandardVersion::STATUS_APPROVED,
        ]);

        $std = Standard::create([
            'version_id' => $approvedVersion->version_id,
            'code'       => 'STD-CLONE',
            'name'       => 'معيار الاستنساخ',
            'weight'     => 100.0,
        ]);

        $sub = SubStandard::create([
            'standard_id' => $std->standard_id,
            'code'        => 'SUB-CLONE',
            'name'        => 'مجال فرعي',
            'weight'      => 100.0,
        ]);

        $res = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$approvedVersion->version_id}/clone", [
                'version_no' => '2099.CLONE-DEST',
            ]);

        $res->assertCreated();
        $newVersionId = $res->json('data.version_id');

        $clonedSub = SubStandard::whereHas('standard', fn($q) => $q->where('version_id', $newVersionId))->first();
        $this->assertNotNull($clonedSub);
        $this->assertEquals(100.0, (float) $clonedSub->weight);
    }

    /**
     * اختبار أن diff-log يعيد إحصاءات مقارنة حقيقية ومذكرات الإصدار - القرار 5.
     */
    public function test_diff_log_returns_real_stats_and_release_notes(): void
    {
        $res = $this->actingAs($this->standardsManager, 'sanctum')
            ->getJson("/api/v1/standard-versions/{$this->seededVersion->version_id}/diff-log");

        $res->assertOk();
        $res->assertJsonStructure([
            'data' => [
                'versionId',
                'versionNo',
                'baselineVersionNo',
                'integrityHash',
                'releaseNotes',
                'realStats' => [
                    'standardsCount',
                    'subStandardsCount',
                    'indicatorsCount',
                    'totalWeight',
                    'isWeightBalanced',
                ],
                'diffs',
            ],
        ]);
    }

    /**
     * اختبار خلو سجل الفروقات من البيانات الوهمية المسبقة الصنع (DIFF-01..04).
     */
    public function test_diff_log_does_not_contain_mock_diff_items(): void
    {
        $res = $this->actingAs($this->standardsManager, 'sanctum')
            ->getJson("/api/v1/standard-versions/{$this->seededVersion->version_id}/diff-log");

        $res->assertOk();
        $diffs = $res->json('data.diffs');

        // التأكد من عدم وجود أي من المعرفات الوهمية السابقة
        $diffIds = collect($diffs)->pluck('id')->all();
        $this->assertNotContains('DIFF-01', $diffIds);
        $this->assertNotContains('DIFF-02', $diffIds);
        $this->assertNotContains('DIFF-03', $diffIds);
        $this->assertNotContains('DIFF-04', $diffIds);
    }

    /**
     * اختبار جلب وتحديث مستويات سلم التقدير اللفظي ديناميكياً على مستوى الإصدار.
     */
    public function test_score_levels_can_be_retrieved_and_updated_per_version(): void
    {
        // 1. جلب مستويات الإصدار الأول (الافتراضي 0-3)
        $res = $this->actingAs($this->standardsManager, 'sanctum')
            ->getJson("/api/v1/score-levels?version_id={$this->seededVersion->version_id}");

        $res->assertOk();
        $this->assertNotEmpty($res->json('data'));

        // 2. إنشاء مسودة وتحديث سلم التقدير لها
        $draftRes = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson('/api/v1/standard-versions', [
                'version_no' => '2030.CUSTOM-SCALE',
            ]);
        $draftId = $draftRes->json('data.version_id');

        $updateScaleRes = $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/standard-versions/{$draftId}/score-levels", [
                'levels' => [
                    ['score_value' => 1, 'label' => 'مبتدئ', 'general_description' => 'مستوى أولي', 'display_order' => 1],
                    ['score_value' => 2, 'label' => 'متمكن', 'general_description' => 'مستوى متوسط', 'display_order' => 2],
                    ['score_value' => 3, 'label' => 'خبير', 'general_description' => 'مستوى متقدم', 'display_order' => 3],
                ],
            ]);

        $updateScaleRes->assertOk();
        $this->assertCount(3, $updateScaleRes->json('data'));
    }

    /**
     * اختبار فصل فحص أدوات التحقق عن متطلبات الشواهد ومانع تفعيل السلم غير المدعوم.
     */
    public function test_lock_preconditions_separates_tools_from_evidence_and_blocks_unsupported_scale(): void
    {
        // 1. استدعاء الشروط الحاكمة للإصدار التأسيسي
        $res = $this->actingAs($this->standardsManager, 'sanctum')
            ->getJson("/api/v1/standard-versions/{$this->seededVersion->version_id}/lock-preconditions");

        $res->assertOk();
        $checks = collect($res->json('data.checks'))->keyBy('key');

        // التحقق من وجود فحص مستقل لأدوات التحقق
        $this->assertTrue($checks->has('verification_tools'));
        // التحقق من وجود فحص مستقل لمتطلبات الشواهد
        $this->assertTrue($checks->has('evidence_requirements'));
        // التحقق من وجود فحص التوافق التشغيلي للسلم
        $this->assertTrue($checks->has('portal_compatibility'));

        // 2. اختبار مانع التفعيل التشغيلي: محاولة تنشيط مسودة بسلم تقديري مخصص (3 مستويات: 1, 2, 3 بدلاً من 0-3)
        $draft = StandardVersion::create([
            'version_no'          => 'BLOCKED-SCALE-VER',
            'issue_date'          => now()->toDateString(),
            'source_organization' => 'وزارة التربية والتعليم',
            'status'              => StandardVersion::STATUS_APPROVED,
        ]);

        ScoreLevel::create(['standard_version_id' => $draft->version_id, 'score_value' => 1, 'label' => 'L1', 'display_order' => 1]);
        ScoreLevel::create(['standard_version_id' => $draft->version_id, 'score_value' => 2, 'label' => 'L2', 'display_order' => 2]);

        $activateRes = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$draft->version_id}/activate");

        $activateRes->assertStatus(422)
            ->assertJsonValidationErrors(['scale_compatibility']);
    }

    /**
     * اختبار نموذج الحالات الرباعي وخيار الإقرار والجدولة مقابل التفعيل الفوري (القرار 6).
     */
    public function test_lock_action_supports_approve_and_schedule_versus_activate_immediately(): void
    {
        // 1. إنشاء مسودة متزنة بنسبة 100%
        $draft = StandardVersion::create([
            'version_no'          => 'LOCK-CYCLE-2027',
            'issue_date'          => now()->toDateString(),
            'source_organization' => 'وزارة التربية والتعليم',
            'status'              => StandardVersion::STATUS_DRAFT,
        ]);

        // إضافة معيار واحد بوزن 100%
        Standard::create([
            'version_id'  => $draft->version_id,
            'code'        => 'STD-FULL',
            'name'        => 'المعيار الشامل',
            'description' => 'وصف المعيار',
            'weight'      => 100.00,
        ]);

        // إضافة مستويات السلم القياسي (0-3)
        foreach ([0, 1, 2, 3] as $val) {
            ScoreLevel::create([
                'standard_version_id' => $draft->version_id,
                'score_value'         => $val,
                'label'               => "Level {$val}",
                'display_order'       => $val,
            ]);
        }

        // حفظ الإصدار النشط الأصلي
        $originalActiveId = $this->seededVersion->version_id;

        // 2. إقرار وجدولة للدورة القادمة (action = approve)
        $approveRes = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$draft->version_id}/lock", [
                'action'             => 'approve',
                'approval_code'      => 'DEC-COUNCIL-2027',
                'legal_confirmation' => true,
            ]);

        $approveRes->assertOk();
        $this->assertEquals(StandardVersion::STATUS_APPROVED, $draft->fresh()->status);
        $this->assertEquals('DEC-COUNCIL-2027', $draft->fresh()->source_number);

        // التحقق من أن الإصدار النشط السابق لم يتأثر (حماية للدورات الجارية)
        $this->assertEquals(StandardVersion::STATUS_ACTIVE, StandardVersion::find($originalActiveId)->status);

        // 3. تفعيل فوري للدورة الحالية (action = activate)
        $activateRes = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$draft->version_id}/lock", [
                'action'             => 'activate',
                'approval_code'      => 'DEC-COUNCIL-2027-ACT',
                'legal_confirmation' => true,
            ]);

        $activateRes->assertOk();
        $this->assertEquals(StandardVersion::STATUS_ACTIVE, $draft->fresh()->status);

        // التحقق من أرشفة الإصدار النشط السابق تلقائياً
        $this->assertEquals(StandardVersion::STATUS_ARCHIVED, StandardVersion::find($originalActiveId)->status);
    }

    /**
     * اختبار حذف مسودة إصدار معياري وحذف كافة بياناته التابعة (Cascade).
     */
    public function test_can_delete_draft_standard_version_and_cascade_all_data(): void
    {
        $draft = StandardVersion::create([
            'version_no'          => '2099.DELETE-ME',
            'issue_date'          => now()->toDateString(),
            'source_organization' => 'وزارة التربية والتعليم',
            'status'              => StandardVersion::STATUS_DRAFT,
        ]);

        $std = Standard::create([
            'version_id' => $draft->version_id,
            'code'       => 'STD-DEL',
            'name'       => 'معيار للحذف',
            'weight'     => 100.0,
        ]);

        $sub = SubStandard::create([
            'standard_id' => $std->standard_id,
            'code'        => 'SUB-DEL',
            'name'        => 'مجال للحذف',
            'weight'      => 100.0,
        ]);

        $ind = Indicator::create([
            'sub_standard_id' => $sub->sub_standard_id,
            'code'            => 'IND-DEL-1',
            'name'            => 'مؤشر للحذف',
            'status'          => 'Active',
        ]);

        $level = ScoreLevel::create([
            'standard_version_id' => $draft->version_id,
            'score_value'         => 0,
            'label'               => 'غير متوفر',
            'display_order'       => 1,
        ]);

        $descriptor = IndicatorScoreDescriptor::create([
            'indicator_id'        => $ind->indicator_id,
            'score_level_id'      => $level->score_level_id,
            'standard_version_id' => $draft->version_id,
            'label'               => 'غير متوفر',
            'description'         => 'وصف المستوى للحذف',
            'display_order'       => 1,
            'is_active'           => true,
        ]);

        // تنفيذ الحذف
        $res = $this->actingAs($this->standardsManager, 'sanctum')
            ->deleteJson("/api/v1/standard-versions/{$draft->version_id}");

        $res->assertOk();
        $this->assertDatabaseMissing('standard_versions', ['version_id' => $draft->version_id]);
        $this->assertDatabaseMissing('standards', ['standard_id' => $std->standard_id]);
        $this->assertDatabaseMissing('sub_standards', ['sub_standard_id' => $sub->sub_standard_id]);
        $this->assertDatabaseMissing('indicators', ['indicator_id' => $ind->indicator_id]);
        $this->assertDatabaseMissing('score_levels', ['score_level_id' => $level->score_level_id]);
        $this->assertDatabaseMissing('indicator_score_descriptors', ['descriptor_id' => $descriptor->descriptor_id]);
    }

    /**
     * اختبار منع حذف إصدار نشط أو مُقرّ.
     */
    public function test_cannot_delete_active_or_approved_standard_version(): void
    {
        $res = $this->actingAs($this->standardsManager, 'sanctum')
            ->deleteJson("/api/v1/standard-versions/{$this->seededVersion->version_id}");

        $res->assertStatus(422);
        $this->assertDatabaseHas('standard_versions', ['version_id' => $this->seededVersion->version_id]);
    }

    /**
     * اختبار منع المستخدم غير المصرح له من حذف مسودة إصدار معياري.
     */
    public function test_unauthorized_user_cannot_delete_standard_version(): void
    {
        $draft = StandardVersion::create([
            'version_no'          => '2099.UNAUTH-DEL',
            'issue_date'          => now()->toDateString(),
            'source_organization' => 'وزارة التربية والتعليم',
            'status'              => StandardVersion::STATUS_DRAFT,
        ]);

        $res = $this->actingAs($this->schoolEvaluator, 'sanctum')
            ->deleteJson("/api/v1/standard-versions/{$draft->version_id}");

        $res->assertStatus(403);
        $this->assertDatabaseHas('standard_versions', ['version_id' => $draft->version_id]);

        // تنظيف المسودة
        $draft->delete();
    }

    /**
     * اختبار استرجاع قائمة أدوات التحقق المعتمدة مع إحصاء عدد المؤشرات المرتبطة.
     */
    public function test_can_list_verification_tools_with_indicators_count(): void
    {
        $res = $this->actingAs($this->standardsManager, 'sanctum')
            ->getJson('/api/v1/verification-tools');

        $res->assertOk();
        $res->assertJsonStructure([
            'data' => [
                'tools' => [
                    '*' => ['toolId', 'name', 'toolType', 'description', 'approved', 'indicatorsCount']
                ],
                'totalCount'
            ]
        ]);
        $this->assertGreaterThanOrEqual(1, count($res->json('data.tools')));
    }

    /**
     * اختبار إضافة أداة تحقق جديدة وحذفها إذا لم تكن مرتبطة بمؤشرات.
     */
    public function test_can_create_and_delete_custom_verification_tool(): void
    {
        $toolName = 'اختبار أداة رقمية تجريبية ' . uniqid();

        // 1. إضافة أداة جديدة
        $createRes = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson('/api/v1/verification-tools', [
                'name'        => $toolName,
                'tool_type'   => 'رقمي ذكي',
                'description' => 'أداة رقمية للتحقق الذاتي واختبار الجودة',
            ]);

        $createRes->assertStatus(201);
        $toolId = $createRes->json('data.toolId');
        $this->assertNotNull($toolId);
        $this->assertDatabaseHas('verification_tools', ['tool_id' => $toolId, 'name' => $toolName]);

        // 2. حذف الأداة غير المرتبطة
        $delRes = $this->actingAs($this->standardsManager, 'sanctum')
            ->deleteJson("/api/v1/verification-tools/{$toolId}");

        $delRes->assertOk();
        $this->assertDatabaseMissing('verification_tools', ['tool_id' => $toolId]);
    }

    /**
     * اختبار منع حذف أداة تحقق مرتبطة بمؤشرات معيارية.
     */
    public function test_cannot_delete_verification_tool_linked_to_indicators(): void
    {
        // أداة 1 مرتبطة بمؤشرات في البيانات الافتراضية
        $tool = \App\Models\VerificationTool::first();
        $this->assertNotNull($tool);

        // التأكد من وجود ارتباط
        \Illuminate\Support\Facades\DB::table('indicator_verification_methods')->updateOrInsert(
            ['indicator_id' => 1, 'tool_id' => $tool->tool_id],
            ['required' => true, 'usage_guidance' => 'فحص وثائقي', 'created_at' => now()]
        );

        $delRes = $this->actingAs($this->standardsManager, 'sanctum')
            ->deleteJson("/api/v1/verification-tools/{$tool->tool_id}");

        $delRes->assertStatus(422);
        $this->assertDatabaseHas('verification_tools', ['tool_id' => $tool->tool_id]);
    }

    /**
     * اختبار مزامنة وتحديث أدوات التحقق المرتبطة بمؤشر داخل مسودة.
     */
    public function test_can_sync_indicator_verification_tools_in_draft(): void
    {
        $draft = StandardVersion::create([
            'version_no'          => '2099.TOOLS-SYNC',
            'issue_date'          => now()->toDateString(),
            'source_organization' => 'وزارة التربية والتعليم',
            'status'              => StandardVersion::STATUS_DRAFT,
        ]);

        $std = Standard::create([
            'version_id' => $draft->version_id,
            'code'       => 'STD-SYNC',
            'name'       => 'معيار المزامنة',
            'weight'     => 100,
        ]);

        $sub = SubStandard::create([
            'standard_id' => $std->standard_id,
            'code'        => 'SUB-SYNC',
            'name'        => 'فرعي المزامنة',
            'weight'      => 100,
        ]);

        $indicator = Indicator::create([
            'sub_standard_id' => $sub->sub_standard_id,
            'code'            => 'IND-SYNC',
            'name'            => 'مؤشر المزامنة',
            'weight'          => 100,
            'status'          => 'Active',
        ]);

        $tools = \App\Models\VerificationTool::take(2)->get();
        $toolIds = $tools->pluck('tool_id')->all();

        $res = $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/indicators/{$indicator->indicator_id}", [
                'name'                  => $indicator->name . ' - محدث الأدوات',
                'verification_tool_ids' => $toolIds,
            ]);

        $res->assertOk();

        // التحقق من جدول الربط
        $linkedCount = \Illuminate\Support\Facades\DB::table('indicator_verification_methods')
            ->where('indicator_id', $indicator->indicator_id)
            ->whereIn('tool_id', $toolIds)
            ->count();

        $this->assertEquals(count($toolIds), $linkedCount);

        // التحقق من استجابة شجرة المعايير
        $treeRes = $this->actingAs($this->standardsManager, 'sanctum')
            ->getJson("/api/v1/standard-versions/{$draft->version_id}/tree");

        $treeRes->assertOk();
        $firstInd = $treeRes->json('data.standards.0.subStandards.0.indicators.0');
        $this->assertNotEmpty($firstInd['verificationTools']);
        $this->assertNotEmpty($firstInd['verificationToolIds']);

        // تنظيف باستخدام الخدمة لضمان الحذف التتابعي
        app(\App\Services\StandardManagementService::class)->deleteVersion($draft);
    }

    /**
     * اختبار نموذج الإقرار على مرحلتين: المرحلة الأولى إقرار وقفل رقمي (Approved)، والمرحلة الثانية جدولة للدورة القادمة.
     */
    public function test_two_stage_approval_and_scheduling(): void
    {
        $draft = StandardVersion::create([
            'version_no'          => '2099.TWO-STAGE',
            'issue_date'          => now()->toDateString(),
            'source_organization' => 'وزارة التربية والتعليم',
            'status'              => StandardVersion::STATUS_DRAFT,
        ]);

        $std = Standard::create([
            'version_id' => $draft->version_id,
            'code'       => 'STD-2STG',
            'name'       => 'معيار المرحلتين',
            'weight'     => 100,
        ]);

        $sub = SubStandard::create([
            'standard_id' => $std->standard_id,
            'code'        => 'SUB-2STG',
            'name'        => 'فرعي المرحلتين',
            'weight'      => 100,
        ]);

        $ind = Indicator::create([
            'sub_standard_id' => $sub->sub_standard_id,
            'code'            => 'IND-2STG',
            'name'            => 'مؤشر المرحلتين',
            'weight'          => 100,
            'status'          => 'Active',
        ]);

        // المرحلة الأولى: إقرار وقفل الإصدار المعياري (approve)
        $lockRes = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$draft->version_id}/lock", [
                'approval_code'      => 'DEC-STAGE1-2099',
                'legal_confirmation' => true,
                'action'             => 'approve',
            ]);

        $lockRes->assertOk();
        $this->assertEquals(StandardVersion::STATUS_APPROVED, $draft->fresh()->status);
        $this->assertStringContainsString('DEC-STAGE1-2099', $draft->fresh()->source_number);

        // المرحلة الثانية: جدولة الإصدار للدورة القادمة (schedule)
        $scheduleRes = $this->actingAs($this->standardsManager, 'sanctum')
            ->postJson("/api/v1/standard-versions/{$draft->version_id}/lock", [
                'approval_code'      => 'DEC-STAGE2-2099',
                'legal_confirmation' => true,
                'action'             => 'schedule',
            ]);

        $scheduleRes->assertOk();
        $this->assertStringContainsString('مجدول', $draft->fresh()->source_description);

        // تنظيف
        app(\App\Services\StandardManagementService::class)->deleteVersion($draft);
    }

    /**
     * اختبار سجل الفروقات الغني بمقارنة المؤشرات التفصيلية (الأدوات والشواهد وسلالم التقدير).
     */
    public function test_diff_log_includes_enriched_indicator_comparisons(): void
    {
        $res = $this->actingAs($this->standardsManager, 'sanctum')
            ->getJson("/api/v1/standard-versions/{$this->seededVersion->version_id}/diff-log");

        $res->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'versionId',
                    'versionNo',
                    'integrityHash',
                    'standardsComparison',
                    'indicatorsComparison' => [
                        '*' => [
                            'code',
                            'name',
                            'standardCode',
                            'weight',
                            'status',
                            'tools',
                            'evidence',
                            'descriptors',
                        ],
                    ],
                    'rubricsComparison',
                ],
            ]);
    }
}
