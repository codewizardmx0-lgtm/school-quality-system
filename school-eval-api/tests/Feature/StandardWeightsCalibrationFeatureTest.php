<?php

namespace Tests\Feature;

use App\Models\Indicator;
use App\Models\Standard;
use App\Models\StandardVersion;
use App\Models\SubStandard;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * اختبارات الميزة لمعايرة أوزان المعايير الثلاثية والتحقق الصارم من اتزان المؤشرات.
 */
class StandardWeightsCalibrationFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $standardsManager;
    protected StandardVersion $draftVersion;

    protected function setUp(): void
    {
        parent::setUp();

        $this->standardsManager = User::where('email', 'standards.manager@moe.gov.ye')->firstOrFail();

        // إنشاء مسودة إصدار لاختبار التعديل والمعايرة
        $this->draftVersion = StandardVersion::create([
            'version_no' => '9999.TEST',
            'status' => StandardVersion::STATUS_DRAFT,
            'issue_date' => now()->toDateString(),
            'source_organization' => 'وزارة التربية والتعليم',
            'created_by' => $this->standardsManager->user_id,
        ]);

        // معيار 1 (الوزن 50%)
        $std1 = Standard::create([
            'version_id' => $this->draftVersion->version_id,
            'code' => 'TEST-STD-1',
            'name' => 'معيار تجريبي أول',
            'weight' => 50.0,
        ]);

        // معيار 2 (الوزن 50%)
        $std2 = Standard::create([
            'version_id' => $this->draftVersion->version_id,
            'code' => 'TEST-STD-2',
            'name' => 'معيار تجريبي ثان',
            'weight' => 50.0,
        ]);

        // معيار فرعي 1-1 (وزن 50%)
        $sub1 = SubStandard::create([
            'standard_id' => $std1->standard_id,
            'code' => 'TEST-SUB-1-1',
            'name' => 'معيار فرعي تجريبي',
            'weight' => 50.0,
        ]);

        // معيار فرعي 2-1 (وزن 50%)
        $sub2 = SubStandard::create([
            'standard_id' => $std2->standard_id,
            'code' => 'TEST-SUB-2-1',
            'name' => 'معيار فرعي تجريبي ثان',
            'weight' => 50.0,
        ]);

        // مؤشران للمعيار الفرعي 1-1 (كل مؤشر 25%، مجموعهما 50%)
        Indicator::create([
            'sub_standard_id' => $sub1->sub_standard_id,
            'code' => 'TEST-IND-1-1-1',
            'name' => 'مؤشر تجريبي 1',
            'weight' => 25.0,
            'status' => 'Active',
        ]);

        Indicator::create([
            'sub_standard_id' => $sub1->sub_standard_id,
            'code' => 'TEST-IND-1-1-2',
            'name' => 'مؤشر تجريبي 2',
            'weight' => 25.0,
            'status' => 'Active',
        ]);

        // مؤشر واحد للمعيار الفرعي 2-1 (50%)
        Indicator::create([
            'sub_standard_id' => $sub2->sub_standard_id,
            'code' => 'TEST-IND-2-1-1',
            'name' => 'مؤشر تجريبي 3',
            'weight' => 50.0,
            'status' => 'Active',
        ]);
    }

    /**
     * 1. فحص أن getWeights يعيد المستوى الثالث (المؤشرات) داخل كل معيار فرعي.
     */
    public function test_get_weights_includes_level_three_indicators(): void
    {
        $response = $this->actingAs($this->standardsManager, 'sanctum')
            ->getJson("/api/v1/standard-versions/{$this->draftVersion->version_id}/weights");

        $response->assertOk()
            ->assertJsonPath('data.versionId', $this->draftVersion->version_id)
            ->assertJsonStructure([
                'data' => [
                    'standards' => [
                        '*' => [
                            'standardId',
                            'code',
                            'weight',
                            'subStandards' => [
                                '*' => [
                                    'subStandardId',
                                    'code',
                                    'weight',
                                    'indicators' => [
                                        '*' => [
                                            'indicatorId',
                                            'code',
                                            'name',
                                            'weight',
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ]);

        $standards = $response->json('data.standards');
        $this->assertNotEmpty($standards[0]['subStandards'][0]['indicators']);
        $this->assertCount(2, $standards[0]['subStandards'][0]['indicators']);
    }

    /**
     * 2. حفظ ناجح عند اتزان المستويات الثلاثة (المعايير 100%، الفرعية تطابق الرئيسية، المؤشرات تطابق الفرعية).
     */
    public function test_can_save_balanced_three_tier_weights(): void
    {
        $std1 = Standard::where('version_id', $this->draftVersion->version_id)->where('code', 'TEST-STD-1')->firstOrFail();
        $std2 = Standard::where('version_id', $this->draftVersion->version_id)->where('code', 'TEST-STD-2')->firstOrFail();
        $sub1 = SubStandard::where('standard_id', $std1->standard_id)->firstOrFail();
        $sub2 = SubStandard::where('standard_id', $std2->standard_id)->firstOrFail();
        $ind1 = Indicator::where('sub_standard_id', $sub1->sub_standard_id)->where('code', 'TEST-IND-1-1-1')->firstOrFail();
        $ind2 = Indicator::where('sub_standard_id', $sub1->sub_standard_id)->where('code', 'TEST-IND-1-1-2')->firstOrFail();
        $ind3 = Indicator::where('sub_standard_id', $sub2->sub_standard_id)->where('code', 'TEST-IND-2-1-1')->firstOrFail();

        // إعادة توزيع: المعيار 1 يصبح 60% والمعيار 2 يصبح 40%
        // المعيار الفرعي 1 يصبح 60%، مؤشر 1 = 35% ومؤشر 2 = 25% (مجموع 60%)
        // المعيار الفرعي 2 يصبح 40%، مؤشر 3 = 40% (مجموع 40%)
        $payload = [
            'standards_weights' => [
                ['standard_id' => $std1->standard_id, 'weight' => 60.0],
                ['standard_id' => $std2->standard_id, 'weight' => 40.0],
            ],
            'sub_standards_weights' => [
                ['sub_standard_id' => $sub1->sub_standard_id, 'weight' => 60.0],
                ['sub_standard_id' => $sub2->sub_standard_id, 'weight' => 40.0],
            ],
            'indicators_weights' => [
                ['indicator_id' => $ind1->indicator_id, 'weight' => 35.0],
                ['indicator_id' => $ind2->indicator_id, 'weight' => 25.0],
                ['indicator_id' => $ind3->indicator_id, 'weight' => 40.0],
            ],
        ];

        $response = $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/standard-versions/{$this->draftVersion->version_id}/weights", $payload);

        $response->assertOk();

        // التحقق في قاعدة البيانات
        $this->assertEquals(60.0, (float) $std1->fresh()->weight);
        $this->assertEquals(40.0, (float) $std2->fresh()->weight);
        $this->assertEquals(35.0, (float) $ind1->fresh()->weight);
        $this->assertEquals(25.0, (float) $ind2->fresh()->weight);
        $this->assertEquals(40.0, (float) $ind3->fresh()->weight);
    }

    /**
     * 3. رفض الحفظ (422) عندما تختل أوزان المؤشرات عن وزن معيارها الفرعي.
     */
    public function test_rejects_unbalanced_indicator_weights_with_422(): void
    {
        $std1 = Standard::where('version_id', $this->draftVersion->version_id)->where('code', 'TEST-STD-1')->firstOrFail();
        $std2 = Standard::where('version_id', $this->draftVersion->version_id)->where('code', 'TEST-STD-2')->firstOrFail();
        $sub1 = SubStandard::where('standard_id', $std1->standard_id)->firstOrFail();
        $sub2 = SubStandard::where('standard_id', $std2->standard_id)->firstOrFail();
        $ind1 = Indicator::where('sub_standard_id', $sub1->sub_standard_id)->where('code', 'TEST-IND-1-1-1')->firstOrFail();
        $ind2 = Indicator::where('sub_standard_id', $sub1->sub_standard_id)->where('code', 'TEST-IND-1-1-2')->firstOrFail();
        $ind3 = Indicator::where('sub_standard_id', $sub2->sub_standard_id)->where('code', 'TEST-IND-2-1-1')->firstOrFail();

        // هنا المعيار الفرعي 1 وزنه 50% ولكن مجموع مؤشراته 20 + 20 = 40% (عجز 10%)
        $payload = [
            'standards_weights' => [
                ['standard_id' => $std1->standard_id, 'weight' => 50.0],
                ['standard_id' => $std2->standard_id, 'weight' => 50.0],
            ],
            'sub_standards_weights' => [
                ['sub_standard_id' => $sub1->sub_standard_id, 'weight' => 50.0],
                ['sub_standard_id' => $sub2->sub_standard_id, 'weight' => 50.0],
            ],
            'indicators_weights' => [
                ['indicator_id' => $ind1->indicator_id, 'weight' => 20.0],
                ['indicator_id' => $ind2->indicator_id, 'weight' => 20.0], // المجموع 40% بدلاً من 50%
                ['indicator_id' => $ind3->indicator_id, 'weight' => 50.0],
            ],
        ];

        $response = $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/standard-versions/{$this->draftVersion->version_id}/weights", $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['indicators_weights']);
    }

    /**
     * 4. رفض الحفظ (422) عندما تختل أوزان المعايير الفرعية عن المعيار الرئيسي.
     */
    public function test_rejects_unbalanced_sub_standard_weights_with_422(): void
    {
        $std1 = Standard::where('version_id', $this->draftVersion->version_id)->where('code', 'TEST-STD-1')->firstOrFail();
        $std2 = Standard::where('version_id', $this->draftVersion->version_id)->where('code', 'TEST-STD-2')->firstOrFail();
        $sub1 = SubStandard::where('standard_id', $std1->standard_id)->firstOrFail();
        $sub2 = SubStandard::where('standard_id', $std2->standard_id)->firstOrFail();

        // المعيار 1 وزنه 50% لكن الفرعي 1-1 وزنه 45% (خلل في المستوى 2)
        $payload = [
            'standards_weights' => [
                ['standard_id' => $std1->standard_id, 'weight' => 50.0],
                ['standard_id' => $std2->standard_id, 'weight' => 50.0],
            ],
            'sub_standards_weights' => [
                ['sub_standard_id' => $sub1->sub_standard_id, 'weight' => 45.0],
                ['sub_standard_id' => $sub2->sub_standard_id, 'weight' => 55.0],
            ],
        ];

        $response = $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/standard-versions/{$this->draftVersion->version_id}/weights", $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sub_standards_weights']);
    }

    /**
     * 5. حماية الإصدارات المقرة أو النشطة من تعديل الأوزان (BR-GEN-04 و BR-GEN-05).
     */
    public function test_cannot_update_weights_on_non_draft_version(): void
    {
        $this->draftVersion->update(['status' => StandardVersion::STATUS_APPROVED]);

        $payload = [
            'standards_weights' => [
                ['standard_id' => 1, 'weight' => 100.0],
            ],
        ];

        $response = $this->actingAs($this->standardsManager, 'sanctum')
            ->putJson("/api/v1/standard-versions/{$this->draftVersion->version_id}/weights", $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['version']);
    }
}
