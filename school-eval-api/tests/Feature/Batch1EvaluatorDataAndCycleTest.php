<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\EvidenceLink;
use App\Models\School;
use App\Models\User;
use Database\Seeders\DemoEvaluationSeeder;
use Tests\TestCase;

class Batch1EvaluatorDataAndCycleTest extends TestCase
{
    /**
     * التحقق من اكتمال رصد مدرسة الفاروق بنسبة 100% (109 مؤشرات و 109 روابط شواهد).
     */
    public function test_farouq_has_109_indicators_and_evidences_seeded(): void
    {
        $schoolFarouq = School::where('school_name', 'like', '%الفاروق%')->first();
        if (!$schoolFarouq) {
            $this->markTestSkipped('Farouq school not seeded in test DB.');
        }

        $this->seed(DemoEvaluationSeeder::class);
        $evalFarouq = Evaluation::where('school_id', $schoolFarouq->school_id)->firstOrFail();

        // التحقق من وجود 109 نتائج تقييم مرصودة
        $this->assertEquals(109, $evalFarouq->results()->whereNotNull('score')->count());

        // التحقق من وجود 200+ من روابط الشواهد (متوسط 2+ لكل مؤشر)
        $this->assertGreaterThanOrEqual(200, EvidenceLink::where('school_id', $schoolFarouq->school_id)->count());
    }

    /**
     * التحقق من تحديث مسار دورة التقييم إلى 5 مراحل وخلوها تماماً من كلمة "المكتب المعتمد".
     */
    public function test_cycle_steps_are_standardized_and_free_of_accredited_office(): void
    {
        $evaluatorFarouq = User::where('username', 'quality_farouq')->first();
        if (!$evaluatorFarouq) {
            $evaluatorFarouq = User::where('username', 'quality_belqees')->firstOrFail();
        }

        $response = $this->actingAs($evaluatorFarouq, 'sanctum')
            ->getJson('/api/v1/evaluator/dashboard-stats');

        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertArrayHasKey('cycleSteps', $data);

        $steps = $data['cycleSteps'];
        $this->assertCount(5, $steps, 'يجب أن يحتوي المسار على 5 مراحل رسمية');

        // التأكد من خلو المسار تماماً من مسمى "المكتب المعتمد"
        foreach ($steps as $step) {
            $this->assertStringNotContainsString('المكتب المعتمد', $step['label']);
        }

        // التحقق من تسميات المراحل الرسمية
        $labels = array_column($steps, 'label');
        $this->assertContains('إطلاق الدورة', $labels);
        $this->assertContains('التقييم الذاتي وتوثيق الشواهد', $labels);
        $this->assertContains('المراجعة والتدقيق الإشرافي', $labels);
    }

    /**
     * التحقق من بنية النواقص واسترجاع عمودين منفصلين لحالة الرصد وحالة الشواهد.
     */
    public function test_pending_indicators_structure_has_separate_status_columns(): void
    {
        $evaluatorBelqees = User::where('username', 'quality_belqees')->firstOrFail();

        $response = $this->actingAs($evaluatorBelqees, 'sanctum')
            ->getJson('/api/v1/evaluator/dashboard-stats');

        $response->assertStatus(200);

        $data = $response->json('data');
        $pending = $data['pendingIndicators'];

        // في مدرسة بلقيس الفارغة يجب أن تظهر المؤشرات الـ 109 كاملة دون قيد limit(10)
        $this->assertGreaterThan(10, count($pending), 'يجب ألا يتم تقييد النواقص بـ 10 صفوف فقط');

        // فحص وجود الحقول المستقلة لحالة الرصد وحالة الشواهد
        $first = $pending[0];
        $this->assertArrayHasKey('scoreStatus', $first);
        $this->assertArrayHasKey('scoreStatusArabic', $first);
        $this->assertArrayHasKey('evidenceStatus', $first);
        $this->assertArrayHasKey('evidenceStatusArabic', $first);
    }
}
