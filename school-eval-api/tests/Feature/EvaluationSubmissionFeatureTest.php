<?php

namespace Tests\Feature;

use App\Events\EvaluationSubmitted;
use App\Models\Attachment;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\Evidence;
use App\Models\EvidenceVersion;
use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\IndicatorScoreDescriptor;
use App\Models\School;
use App\Models\StandardVersion;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات ميزة إغلاق واعتماد التقييم الذاتي المدرسي (G-01).
 *
 * التحقق من:
 * 1. اشتراط اكتمال رصد كافة المؤشرات الـ 109.
 * 2. اشتراط استيفاء الحد الأدنى من الشواهد الإلزامية للمؤشرات.
 * 3. حظر الإغلاق المتكرر للتقييم المكتمل مسبقاً.
 * 4. تطبيق العزل المؤسسي الصارم (القرار المعماري 9: 404).
 * 5. قفل العمليات التعديلية (الرصد ورفع الشواهد) بعد الإغلاق برمز 422 (BR-SCH-03).
 * 6. عمل خدمات حساب النتائج والتصدير (الشريحة 4) بعد الإغلاق من البداية إلى النهاية.
 * 7. إطلاق حدث الإغلاق EvaluationSubmitted وتوثيق الطوابع الزمنية.
 */
class EvaluationSubmissionFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $evaluatorBelqees;
    protected User $principalBelqees;
    protected User $evaluatorFarouq;
    protected School $schoolBelqees;
    protected School $schoolFarouq;
    protected Evaluation $evaluationBelqees;
    protected Evaluation $evaluationFarouq;
    protected StandardVersion $standardVersion;

    protected function setUp(): void
    {
        parent::setUp();

        $this->schoolBelqees = School::where('identification_data', 'SCH-SANAA-2026-001')->firstOrFail();
        $this->schoolFarouq  = School::where('identification_data', 'SCH-TAIZ-2026-002')->firstOrFail();

        $this->evaluatorBelqees = User::where('username', 'quality_belqees')->firstOrFail();
        $this->principalBelqees = User::where('username', 'principal_belqees')->firstOrFail();
        $this->evaluatorFarouq  = User::where('username', 'quality_farouq')->firstOrFail();

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
        $this->evaluationBelqees->update(['status' => 'InProgress']);

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
        $this->evaluationFarouq->update(['status' => 'InProgress']);
    }

    /**
     * دالة مساعدة لرصد جميع المؤشرات الفعالة في النظام لتقييم بلقيس.
     */
    protected function scoreAllIndicators(int $score = 3, ?int $exceptIndicatorId = null): void
    {
        $indicators = Indicator::where('status', 'Active')->get();

        foreach ($indicators as $ind) {
            if ($exceptIndicatorId && $ind->indicator_id === $exceptIndicatorId) {
                continue;
            }

            $descriptor = IndicatorScoreDescriptor::where('indicator_id', $ind->indicator_id)->first();

            EvaluationResult::updateOrCreate(
                [
                    'evaluation_id' => $this->evaluationBelqees->evaluation_id,
                    'indicator_id'  => $ind->indicator_id,
                ],
                [
                    'standard_version_id' => $this->standardVersion->version_id,
                    'evaluator_user_id'   => $this->evaluatorBelqees->user_id,
                    'score_descriptor_id' => $descriptor ? $descriptor->descriptor_id : 1,
                    'score'               => $score,
                    'completion_status'   => 'Completed',
                ]
            );
        }
    }

    /**
     * دالة مساعدة لإرفاق شواهد للمؤشرات التي تتطلب شواهد إلزامية.
     */
    protected function attachEvidenceToRequiredIndicators(?int $exceptIndicatorId = null): void
    {
        $requiredIndicatorIds = IndicatorEvidenceRequirement::where('required', true)
            ->pluck('indicator_id')
            ->unique();

        foreach ($requiredIndicatorIds as $indicatorId) {
            if ($exceptIndicatorId && $indicatorId === $exceptIndicatorId) {
                continue;
            }

            $result = EvaluationResult::where('evaluation_id', $this->evaluationBelqees->evaluation_id)
                ->where('indicator_id', $indicatorId)
                ->first();

            if ($result) {
                $evidence = Evidence::firstOrCreate(
                    ['result_id' => $result->result_id],
                    [
                        'indicator_id' => $indicatorId,
                        'title' => 'شاهد معتمد للمؤشر رقم ' . $indicatorId,
                        'description' => 'وصف الشاهد المعتمد للتحقق',
                        'justification' => 'مبررات ودلالات الشاهد',
                    ]
                );

                EvidenceVersion::firstOrCreate(
                    [
                        'evidence_id' => $evidence->evidence_id,
                        'version_no'  => 1,
                    ],
                    [
                        'current' => true,
                    ]
                );
            }
        }
    }

    /**
     * 1. منع المستخدم غير الممتلك لصلاحية evaluations.submit من إغلاق التقييم (403).
     */
    public function test_submit_fails_when_user_lacks_permission(): void
    {
        Sanctum::actingAs($this->principalBelqees); // مدير المدرسة يملك reviews.write وليس evaluations.submit

        $response = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/submit");

        $response->assertStatus(403)
            ->assertJsonPath('message', 'غير مصرح لك بتقديم هذا التقييم.');
    }

    /**
     * 2. منع مستخدم مدرسة من إغلاق تقييم مدرسة أخرى وإرجاع 404 (العزل المؤسسي الصارم - القرار 9).
     */
    public function test_submit_fails_when_accessing_another_school_returns_404(): void
    {
        Sanctum::actingAs($this->evaluatorFarouq); // مقيم مدرسة الفاروق يحاول إغلاق تقييم مدرسة بلقيس

        $response = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/submit");

        $response->assertStatus(404)
            ->assertJsonPath('message', 'ملف التقييم المطلوب غير موجود.');
    }

    /**
     * 3. رفض الإغلاق عند وجود مؤشر واحد أو أكثر غير مرصود (422) وتحديد المؤشرات الناقصة.
     */
    public function test_submit_fails_when_unscored_indicator_exists(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $firstIndicator = Indicator::where('status', 'Active')->firstOrFail();

        // رصد جميع المؤشرات ما عدا مؤشر واحد
        $this->scoreAllIndicators(3, $firstIndicator->indicator_id);
        $this->attachEvidenceToRequiredIndicators();

        $response = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/submit");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'لا يمكن تقديم تقييم غير مكتمل الرصد.')
            ->assertJsonStructure([
                'errors' => [
                    'indicators',
                    'unscored_indicators' => [
                        '*' => ['indicator_id', 'code', 'name'],
                    ],
                ],
            ]);

        $unscored = $response->json('errors.unscored_indicators');
        $this->assertNotEmpty($unscored);
        $this->assertEquals($firstIndicator->indicator_id, $unscored[0]['indicator_id']);
    }

    /**
     * 4. رفض الإغلاق عند نقص الشواهد الإلزامية لمؤشر واحد أو أكثر (422).
     */
    public function test_submit_fails_when_required_evidence_is_missing(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // رصد كافة المؤشرات الـ 109
        $this->scoreAllIndicators(3);

        // إرفاق الشواهد لجميع المؤشرات ما عدا مؤشر إلزامي واحد
        $requiredIndicatorId = IndicatorEvidenceRequirement::where('required', true)->value('indicator_id');
        $this->assertNotNull($requiredIndicatorId);

        $this->attachEvidenceToRequiredIndicators($requiredIndicatorId);

        $response = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/submit");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'لا يمكن تقديم التقييم لعدم استيفاء الحد الأدنى من الشواهد المطلوبة.')
            ->assertJsonStructure([
                'errors' => [
                    'evidences',
                    'missing_evidence_indicators' => [
                        '*' => ['indicator_id', 'code', 'name', 'required_requirements_count', 'uploaded_evidence_count'],
                    ],
                ],
            ]);

        $missing = $response->json('errors.missing_evidence_indicators');
        $this->assertNotEmpty($missing);
        $this->assertEquals($requiredIndicatorId, $missing[0]['indicator_id']);
    }

    /**
     * 5. نجاح إغلاق وتقديم التقييم عند استيفاء كافة المؤشرات والحد الأدنى من الشواهد (200 OK)
     * وإطلاق حدث EvaluationSubmitted وتحديث الحالة إلى Completed.
     */
    public function test_submit_succeeds_when_all_requirements_met(): void
    {
        Event::fake([EvaluationSubmitted::class]);

        Sanctum::actingAs($this->evaluatorBelqees);

        // رصد كافة المؤشرات الـ 109
        $this->scoreAllIndicators(3);

        // إرفاق الحد الأدنى من الشواهد لجميع المؤشرات الإلزامية
        $this->attachEvidenceToRequiredIndicators();

        $response = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/submit");

        $response->assertStatus(200)
            ->assertJsonPath('message', 'تم إغلاق التقييم الذاتي واعتماده بنجاح وقفل العمليات التعديلية (BR-SCH-03).')
            ->assertJsonPath('data.status', 'Completed')
            ->assertJsonPath('data.isLocked', true)
            ->assertJsonPath('data.evaluationId', $this->evaluationBelqees->evaluation_id)
            ->assertJsonPath('data.schoolId', $this->schoolBelqees->school_id)
            ->assertJsonPath('data.submittedByUser.userId', $this->evaluatorBelqees->user_id);

        // التحقق من تحديث حالة السجل في قاعدة البيانات
        $this->assertEquals('Completed', $this->evaluationBelqees->fresh()->status);

        // التحقق من إطلاق الحدث
        Event::assertDispatched(EvaluationSubmitted::class, function ($event) {
            return $event->evaluation->evaluation_id === $this->evaluationBelqees->evaluation_id
                && $event->user->user_id === $this->evaluatorBelqees->user_id;
        });
    }

    /**
     * 6. رفض الإغلاق المتكرر لتقييم مكتمل مسبقاً (422).
     */
    public function test_submit_fails_when_already_completed(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // رصد كل شيء واستيفاء الشواهد
        $this->scoreAllIndicators(3);
        $this->attachEvidenceToRequiredIndicators();

        // الإغلاق الأول بنجاح
        $response1 = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/submit");
        $response1->assertStatus(200);

        // محاولة الإغلاق مرة أخرى
        $response2 = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/submit");
        $response2->assertStatus(422)
            ->assertJsonPath('message', 'ملف التقييم مكتمل ومقفل مسبقاً ولا يمكن إعادة تقديمه.');
    }

    /**
     * 7. بعد الإغلاق: حظر تعديل الدرجات وإرفاق الشواهد بسبب قفل التقييم (BR-SCH-03).
     */
    public function test_modifications_are_locked_after_submission(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $this->scoreAllIndicators(3);
        $this->attachEvidenceToRequiredIndicators();

        // إغلاق التقييم
        $submitResp = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/submit");
        $submitResp->assertStatus(200);

        $indicator = Indicator::where('status', 'Active')->firstOrFail();

        // محاولة رصد أو تعديل درجة مؤشر بعد الإغلاق -> 422 BR-SCH-03
        $scoreResp = $this->putJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$indicator->indicator_id}/score", [
            'score' => 2,
        ]);

        $scoreResp->assertStatus(422)
            ->assertJsonPath('message', 'ملف التقييم مكتمل ومقفل نهائياً (BR-SCH-03).');
    }

    /**
     * 8. بعد الإغلاق: تعمل خدمات الشريحة 4 (حساب النتائج، وتصدير JSON، ولوحة المعلومات) من البداية إلى النهاية.
     */
    public function test_slice4_reports_work_end_to_end_after_submission(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $this->scoreAllIndicators(3);
        $this->attachEvidenceToRequiredIndicators();

        // إغلاق التقييم
        $submitResp = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/submit");
        $submitResp->assertStatus(200);

        // 1. حساب النتائج الإجمالية
        $resultsResp = $this->getJson("/api/v1/schools/{$this->schoolBelqees->school_id}/assessments/{$this->evaluationBelqees->evaluation_id}/results");
        $resultsResp->assertStatus(200)
            ->assertJsonPath('data.is_complete', true)
            ->assertJsonPath('data.final_score', 100)
            ->assertJsonPath('data.performance_level.key', 'outstanding');

        // 2. تصدير التقرير الكامل كـ JSON
        $exportResp = $this->getJson("/api/v1/schools/{$this->schoolBelqees->school_id}/assessments/{$this->evaluationBelqees->evaluation_id}/export");
        $exportResp->assertStatus(200)
            ->assertJsonPath('message', 'تم تصدير تقرير التقييم بنجاح.')
            ->assertJsonPath('data.evaluation_context.status', 'Completed');

        // 3. لوحة المعلومات
        $dashboardResp = $this->getJson("/api/v1/schools/{$this->schoolBelqees->school_id}/dashboard");
        $dashboardResp->assertStatus(200)
            ->assertJsonPath('data.assessment.status', 'Completed');
    }

    /**
     * 9. اختبار مسارات التقديم البديلة (Aliased Routes).
     */
    public function test_submit_alias_routes_work_identically(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $this->scoreAllIndicators(3);
        $this->attachEvidenceToRequiredIndicators();

        // تقديم التقييم عبر مسار المدرسة في v1
        $response = $this->postJson("/api/v1/schools/{$this->schoolBelqees->school_id}/assessments/{$this->evaluationBelqees->evaluation_id}/submit");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'Completed')
            ->assertJsonPath('data.isLocked', true);
    }
}
