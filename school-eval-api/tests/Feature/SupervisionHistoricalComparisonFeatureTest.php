<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\Indicator;
use App\Models\IndicatorScoreDescriptor;
use App\Models\Role;
use App\Models\School;
use App\Models\ScoreLevel;
use App\Models\StandardVersion;
use App\Models\User;
use Database\Seeders\PreviousCycleEvaluationSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات الميزات للمقارنة التاريخية التراكمية والتصدير والعزل الجغرافي (Screen 7).
 * مطابقة تامة لـ UC-SUP-07 و FR-SUP-18 و BR-GEN-05 و BR-MIN-03 و NFR-SEC-03.
 */
class SupervisionHistoricalComparisonFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $supervisorCentral;
    protected User $supervisorAmana;
    protected User $supervisorTaiz;
    protected School $schoolFarouq;
    protected School $schoolAmana;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. مشرف وزاري عام مركزي (دون قيد جغرافي)
        $this->supervisorCentral = User::firstOrCreate(
            ['username' => 'test_supervisor_central_historical'],
            [
                'full_name'     => 'مشرف وزاري مركزي عام للاختبار',
                'email'         => 'sup.central.hist@moe.gov.ye',
                'password_hash' => bcrypt('password'),
                'user_type'     => 'ministry',
                'status'        => 'Active',
                'governorate'   => null,
            ]
        );
        $roleSupervisor = Role::firstOrCreate(
            ['role_name' => 'ministry_supervisor'],
            ['description' => 'مشرف وزاري', 'is_system_role' => true]
        );
        $this->supervisorCentral->roles()->syncWithoutDetaching([
            $roleSupervisor->role_id => ['assigned_at' => now(), 'active' => 1],
        ]);

        // 2. مشرف محلي لأمانة العاصمة
        $this->supervisorAmana = User::firstOrCreate(
            ['username' => 'test_supervisor_amana_historical'],
            [
                'full_name'     => 'مشرف أمانة العاصمة للاختبار',
                'email'         => 'sup.amana.hist@moe.gov.ye',
                'password_hash' => bcrypt('password'),
                'user_type'     => 'ministry',
                'status'        => 'Active',
                'governorate'   => 'أمانة العاصمة',
            ]
        );
        $this->supervisorAmana->roles()->syncWithoutDetaching([
            $roleSupervisor->role_id => ['assigned_at' => now(), 'active' => 1],
        ]);

        // 3. مدرسة الفاروق (محافظة تعز) - مسجل لها دورتان تقييميتان
        $this->schoolFarouq = School::where('identification_data', 'SCH-TAIZ-2026-001')
            ->orWhere('school_name', 'like', '%الفاروق%')
            ->first() ?? School::create([
                'identification_data'  => 'SCH-TAIZ-2026-001',
                'name'                 => 'مدرسة الفاروق الأساسية للبنين',
                'school_name'          => 'مدرسة الفاروق الأساسية للبنين',
                'educational_stage'    => 'أساسي',
                'school_type'          => 'government',
                'governorate'          => 'محافظة تعز',
                'educational_district' => 'المظفر',
                'status'               => 'Active',
            ]);

        // 4. مدرسة الأمانة (دورة تقييمية واحدة فقط لاختبار التدفق البديل)
        $this->schoolAmana = School::where('governorate', 'أمانة العاصمة')->first() ?? School::create([
            'identification_data'  => 'SCH-AMANA-TEST-SINGLE',
            'name'                 => 'مدرسة الأمانة الفردية',
            'school_name'          => 'مدرسة الأمانة الفردية',
            'educational_stage'    => 'أساسي',
            'school_type'          => 'government',
            'governorate'          => 'أمانة العاصمة',
            'educational_district' => 'السبعين',
            'status'               => 'Active',
        ]);

        // ضمان وجود بيانات الدورة السابقة لمدرسة الفاروق عبر الـ Seeder
        (new PreviousCycleEvaluationSeeder())->run();
    }

    /**
     * 1. نجاح استرجاع المقارنة التاريخية التراكمية بين دورتين لمدرسة الفاروق (FR-SUP-18).
     */
    public function test_historical_comparison_two_cycles_success_with_standards_and_indicators(): void
    {
        Sanctum::actingAs($this->supervisorCentral);

        $response = $this->getJson("/api/v1/schools/{$this->schoolFarouq->school_id}/historical-comparison?base_cycle=2025/2026&compare_cycle=2024/2025");

        $response->assertStatus(200)
            ->assertJsonPath('data.hasPreviousCycle', true)
            ->assertJsonPath('data.alternateFlow', false)
            ->assertJsonPath('data.school.schoolId', $this->schoolFarouq->school_id);

        $data = $response->json('data');

        // التحقق من المعايير السبعة
        $this->assertCount(7, $data['standardsDeltas']);
        foreach ($data['standardsDeltas'] as $std) {
            $this->assertArrayHasKey('standardId', $std);
            $this->assertArrayHasKey('name', $std);
            $this->assertArrayHasKey('previousScore', $std);
            $this->assertArrayHasKey('currentScore', $std);
            $this->assertArrayHasKey('delta', $std);
            $this->assertArrayHasKey('trend', $std);
        }

        // التحقق من شمول الـ 109 مؤشرات
        $this->assertCount(109, $data['allIndicatorsDeltas']);
        foreach ($data['allIndicatorsDeltas'] as $ind) {
            $this->assertArrayHasKey('indicatorId', $ind);
            $this->assertArrayHasKey('code', $ind);
            $this->assertArrayHasKey('name', $ind);
            $this->assertArrayHasKey('previousScore', $ind);
            $this->assertArrayHasKey('currentScore', $ind);
            $this->assertArrayHasKey('delta', $ind);
            $this->assertContains($ind['trend'], ['improved', 'regressed', 'maintained', 'new', 'deprecated']);
        }

        // التحقق من مؤشرات التطور KPIs
        $this->assertArrayHasKey('trajectory', $data);
        $this->assertGreaterThan(0, $data['trajectory']['improvedCount']);
        $this->assertGreaterThan(0, $data['trajectory']['regressedCount']);
        $this->assertGreaterThan(0, $data['trajectory']['maintainedCount']);
    }

    /**
     * 2. اختبار التدفق البديل لمدرسة ذات دورة واحدة فقط وفق (UC-SUP-07).
     */
    public function test_historical_comparison_single_cycle_alternative_flow_uc_sup_07(): void
    {
        Sanctum::actingAs($this->supervisorCentral);

        // إنشاء دورة واحدة فقط وتقييم واحد لمدرسة الأمانة
        $cycle = EvaluationCycle::firstOrCreate(
            ['academic_year' => '2025/2026'],
            ['name' => 'دورة 2025/2026', 'status' => 'Active', 'version_id' => 1]
        );
        Evaluation::where('school_id', $this->schoolAmana->school_id)->delete();
        Evaluation::create([
            'cycle_id'           => $cycle->cycle_id,
            'school_id'          => $this->schoolAmana->school_id,
            'created_by_user_id' => 1,
            'status'             => 'InProgress',
        ]);

        $response = $this->getJson("/api/v1/schools/{$this->schoolAmana->school_id}/historical-comparison");

        $response->assertStatus(200)
            ->assertJsonPath('data.hasPreviousCycle', false)
            ->assertJsonPath('data.alternateFlow', true)
            ->assertJsonPath('data.isSingleCycleOnly', true);

        $this->assertStringContainsString('التقييم التأسيسي الأول', $response->json('data.notice'));
    }

    /**
     * 3. فرض العزل الجغرافي الصارم عند محاولة تصدير تقرير PDF لمدرسة خارج المحافظة (403 Forbidden).
     */
    public function test_historical_comparison_pdf_enforces_geographic_isolation(): void
    {
        // مشرف أمانة العاصمة يحاول تصدير تقرير مدرسة الفاروق (محافظة تعز)
        Sanctum::actingAs($this->supervisorAmana);

        $response = $this->getJson("/api/v1/schools/{$this->schoolFarouq->school_id}/historical-comparison/pdf");

        $response->assertStatus(403);
        $this->assertStringContainsString('غير مصرح: المدرسة تقع خارج النطاق الجغرافي', $response->json('message'));
    }

    /**
     * 4. نجاح توليد وتنزيل التقرير الرسمي بصيغة PDF وتطابق الترويسة والمحتوى.
     */
    public function test_historical_comparison_pdf_generates_valid_pdf_stream(): void
    {
        Sanctum::actingAs($this->supervisorCentral);

        $response = $this->get("/api/v1/schools/{$this->schoolFarouq->school_id}/historical-comparison/pdf?base_cycle=2025/2026&compare_cycle=2024/2025");

        $response->assertStatus(200);
        $this->assertEquals('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('attachment;', $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('.pdf', $response->headers->get('Content-Disposition'));

        // التحقق من توقيع ملف الـ PDF (%PDF-)
        $content = $response->getContent();
        $this->assertStringStartsWith('%PDF', $content);
        $this->assertGreaterThan(5000, strlen($content)); // حجم ملف حقيقي
    }

    /**
     * 5. رفض مقارنة الدورة بنفسها وإرجاع 422 Unprocessable Entity برسالة عربية واضحة.
     */
    public function test_historical_comparison_rejects_identical_cycles_with_422(): void
    {
        Sanctum::actingAs($this->supervisorCentral);

        // محاولة مقارنة 2025/2026 بـ 2025/2026
        $response = $this->getJson("/api/v1/schools/{$this->schoolFarouq->school_id}/historical-comparison?base_cycle=2025/2026&compare_cycle=2025/2026");

        $response->assertStatus(422);
        $this->assertStringContainsString('لا يمكن إجراء مقارنة تاريخية بين نفس الدورة التقييمية؛ يرجى اختيار دورتين مختلفتين', $response->json('message'));

        // فحص التصدير بـ PDF مع نفس الدورة
        $pdfResponse = $this->getJson("/api/v1/schools/{$this->schoolFarouq->school_id}/historical-comparison/pdf?base_cycle=2025/2026&compare_cycle=2025/2026");
        $pdfResponse->assertStatus(422);
        $this->assertStringContainsString('لا يمكن إجراء مقارنة تاريخية بين نفس الدورة التقييمية؛ يرجى اختيار دورتين مختلفتين', $pdfResponse->json('message'));
    }
}
