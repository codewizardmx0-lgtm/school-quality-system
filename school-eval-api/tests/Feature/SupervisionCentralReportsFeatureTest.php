<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\Role;
use App\Models\School;
use App\Models\StandardVersion;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات الميزات الشاملة للتحليلات المركزية والتصدير المزدوج واحتساب التأخير آلياً (Screen 8).
 * الامتثال الصارم لـ UC-SUP-05 و FR-SUP-12..15 و BR-MIN-02 و BR-MIN-03 و NFR-SEC-03.
 */
class SupervisionCentralReportsFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $supervisorCentral;
    protected User $supervisorAmana;
    protected School $schoolAmana;
    protected School $schoolTaiz;
    protected EvaluationCycle $activeCycle;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. دور المشرف الوزاري
        $roleSupervisor = Role::firstOrCreate(
            ['role_name' => 'ministry_supervisor'],
            ['description' => 'مشرف وزاري', 'is_system_role' => true]
        );

        // 2. مشرف وزاري مركزي عام
        $this->supervisorCentral = User::firstOrCreate(
            ['username' => 'test_supervisor_central_analytics'],
            [
                'full_name'     => 'مشرف وزاري مركزي عام للاختبار',
                'email'         => 'sup.central.analytics@moe.gov.ye',
                'password_hash' => bcrypt('password'),
                'user_type'     => 'ministry',
                'status'        => 'Active',
                'governorate'   => null,
            ]
        );
        $this->supervisorCentral->roles()->syncWithoutDetaching([
            $roleSupervisor->role_id => ['assigned_at' => now(), 'active' => 1],
        ]);

        // 3. مشرف وزاري محلي لأمانة العاصمة
        $this->supervisorAmana = User::firstOrCreate(
            ['username' => 'test_supervisor_amana_analytics'],
            [
                'full_name'     => 'مشرف أمانة العاصمة للاختبار',
                'email'         => 'sup.amana.analytics@moe.gov.ye',
                'password_hash' => bcrypt('password'),
                'user_type'     => 'ministry',
                'status'        => 'Active',
                'governorate'   => 'أمانة العاصمة',
            ]
        );
        $this->supervisorAmana->roles()->syncWithoutDetaching([
            $roleSupervisor->role_id => ['assigned_at' => now(), 'active' => 1],
        ]);

        // 4. مدرسة بأمانة العاصمة
        $this->schoolAmana = School::firstOrCreate(
            ['identification_data' => 'SCH-AMANA-TEST-001'],
            [
                'name'                => 'مدرسة أمانة العاصمة النموذجية',
                'school_name'         => 'مدرسة أمانة العاصمة النموذجية',
                'educational_stage'   => 'أساسي (1-9)',
                'governorate'         => 'أمانة العاصمة',
                'directorate'         => 'التحرير',
                'educational_district'=> 'التحرير',
                'status'              => 'Active',
            ]
        );

        // 5. مدرسة بمحافظة تعز
        $this->schoolTaiz = School::firstOrCreate(
            ['identification_data' => 'SCH-TAIZ-TEST-001'],
            [
                'name'                => 'مدرسة تعز النموذجية المشتركة',
                'school_name'         => 'مدرسة تعز النموذجية المشتركة',
                'educational_stage'   => 'ثانوي (10-12)',
                'governorate'         => 'تعز',
                'directorate'         => 'صالة',
                'educational_district'=> 'صالة',
                'status'              => 'Active',
            ]
        );

        // 6. الدورة التقييمية النشطة
        $version = StandardVersion::where('status', 'Active')->first() ?? StandardVersion::first();
        $this->activeCycle = EvaluationCycle::firstOrCreate(
            ['academic_year' => '2026/2027'],
            [
                'name'                => 'الدورة الوطنية للتقييم والتحسين 2026/2027',
                'status'              => 'Active',
                'version_id'          => $version?->version_id ?? 1,
                'start_date'          => Carbon::now()->subMonths(2)->toDateString(),
                'end_date'            => Carbon::now()->addMonths(4)->toDateString(),
                'max_completion_days' => 14,
            ]
        );
    }

    /**
     * 1. اختبار استرجاع التحليلات المركزية للمعايير السبعة والمؤشرات الـ 109 ومخرجات المدارس (Zero-Mock)
     * والتحقق من التزام BR-MIN-03 (استئصال لفظ الاعتماد).
     */
    public function test_central_analytics_returns_real_standards_and_indicators_zero_mock(): void
    {
        Sanctum::actingAs($this->supervisorCentral);

        $response = $this->getJson('/api/v1/supervision/reports/analytics');

        $response->assertStatus(200)
            ->assertJsonPath('errors', null);

        $data = $response->json('data');

        // تحقق من المعايير السبعة ومجموع أوزانها 100%
        $this->assertCount(7, $data['standardsMeans'], 'يجب أن تحتوي التحليلات على المعايير السبعة الوطنية بالضبط.');
        $totalWeight = array_sum(array_column($data['standardsMeans'], 'weight'));
        $this->assertEquals(100.0, (float)$totalWeight, 'مجموع أوزان المعايير السبعة يجب أن يعادل 100%.');

        // تحقق من وجود مصفوفة المؤشرات الشاملة
        $this->assertNotEmpty($data['allIndicatorsMeans'], 'يجب تضمين مصفوفة المؤشرات الوطنية.');
        $this->assertNotEmpty($data['centralSchoolsReport'], 'يجب تضمين تقرير حالة المدارس المركزي (FR-SUP-15).');

        // التزام BR-MIN-03: التأكد من غياب لفظ الاعتماد
        $this->assertArrayHasKey('completedReviewCount', $data['summaryStats']);
        $this->assertArrayNotHasKey('completedAccreditationCount', $data['summaryStats'], 'مخالفة BR-MIN-03: تم العثور على لفظ الاعتماد.');
        $this->assertArrayHasKey('completedReviewCount', $data['scopeSummary']);
        $this->assertArrayNotHasKey('completedAccreditationCount', $data['scopeSummary']);
    }

    /**
     * 2. اختبار فلاتر المرحلة وسقف الـ 10 مدارس لمحدد المدارس.
     */
    public function test_central_analytics_applies_stage_and_school_filters_capped_at_10(): void
    {
        Sanctum::actingAs($this->supervisorCentral);

        // فلترة بالمرحلة: أساسي (1-9)
        $respStage = $this->getJson('/api/v1/supervision/reports/analytics?stage=' . urlencode('أساسي (1-9)'));
        $respStage->assertStatus(200);
        $stageSchools = $respStage->json('data.centralSchoolsReport');
        foreach ($stageSchools as $s) {
            $this->assertEquals('أساسي (1-9)', $s['stage']);
        }

        // إرسال أكثر من 10 مدارس (12 معرفاً) والتحقق من تطبيق سقف 10 كحد أقصى
        $ids = range(1, 15);
        $respCap = $this->getJson('/api/v1/supervision/reports/analytics?school_ids=' . implode(',', $ids));
        $respCap->assertStatus(200);
        $reportCount = count($respCap->json('data.centralSchoolsReport'));
        $this->assertLessThanOrEqual(10, $reportCount, 'يجب ألا يتجاوز عدد المدارس المستعلمة 10 مدارس كحد أقصى.');
    }

    /**
     * 3. اختبار احتساب حالة التأخير آلياً عند انقضاء 80% من مدة الدورة (FR-SUP-15).
     */
    public function test_central_analytics_calculates_80_percent_overdue_schools_dynamically_fr_sup_15(): void
    {
        Sanctum::actingAs($this->supervisorCentral);

        // إنشاء دورة تقييمية مضى منها 90% (> 80%)
        $version = StandardVersion::where('status', 'Active')->first() ?? StandardVersion::first();
        $overdueCycle = EvaluationCycle::create([
            'academic_year'       => '2024/2025',
            'name'                => 'دورة اختبار التأخير التلقائي',
            'status'              => 'Active',
            'version_id'          => $version?->version_id ?? 1,
            'start_date'          => Carbon::now()->subDays(90)->toDateString(),
            'end_date'            => Carbon::now()->addDays(10)->toDateString(), // 90 يوماً من أصل 100 = 90%
            'max_completion_days' => 14,
        ]);

        // ربط المدرسة بالدورة بملف مسودة لم يُرسل
        $eval = Evaluation::create([
            'school_id'          => $this->schoolAmana->school_id,
            'cycle_id'           => $overdueCycle->cycle_id,
            'status'             => 'Draft',
            'created_by_user_id' => $this->supervisorCentral->user_id,
            'created_at'         => now(),
        ]);

        $response = $this->getJson('/api/v1/supervision/reports/analytics?cycle_id=' . $overdueCycle->cycle_id . '&school_ids=' . $this->schoolAmana->school_id);

        $response->assertStatus(200);
        $schools = $response->json('data.centralSchoolsReport');
        $this->assertNotEmpty($schools);

        $sch = $schools[0];
        $this->assertEquals('Overdue', $sch['status'], 'وفق FR-SUP-15: يجب احتساب المدرسة متأخرة آلياً لمضي 80% من الدورة دون تسليم.');
        $this->assertTrue($sch['isDelayed']);
        $this->assertStringContainsString('متأخرة عن التسليم', $sch['statusLabel']);
    }

    /**
     * 4. اختبار العزل الجغرافي الصارم للمشرف الوزاري في التصدير والاستعلام (403 Forbidden).
     */
    public function test_central_analytics_pdf_enforces_geographic_isolation(): void
    {
        // المشرف المحلي لأمانة العاصمة يحاول طلب تقرير يتضمن مدرسة بمحافظة تعز
        Sanctum::actingAs($this->supervisorAmana);

        // أ) التحليلات المركزية JSON
        $respJson = $this->getJson('/api/v1/supervision/reports/analytics?school_ids=' . $this->schoolTaiz->school_id);
        $respJson->assertStatus(403);

        // ب) تصدير PDF
        $respPdf = $this->get('/api/v1/supervision/reports/analytics/pdf?school_ids=' . $this->schoolTaiz->school_id);
        $respPdf->assertStatus(403);
    }

    /**
     * 5. اختبار توليد التقرير التحليلي الرسمي بتنسيق PDF وبثه الثنائي المباشر عبر mPDF.
     */
    public function test_central_analytics_pdf_generates_valid_pdf_stream(): void
    {
        Sanctum::actingAs($this->supervisorCentral);

        $response = $this->get('/api/v1/supervision/reports/analytics/pdf');

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/pdf');

        $content = $response->getContent();
        $this->assertNotEmpty($content);
        $this->assertStringStartsWith('%PDF-', $content, 'يجب أن يكون ناتج التصدير دفق ملف PDF ثنائي صالح يبدأ بترويسة %PDF-');
    }
}