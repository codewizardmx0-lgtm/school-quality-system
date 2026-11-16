<?php

namespace Tests\Feature;

use App\Models\CompletionRequest;
use App\Models\CompletionRequestItem;
use App\Models\Evaluation;
use App\Models\EvaluationSubmission;
use App\Models\Indicator;
use App\Models\School;
use App\Models\User;
use Database\Seeders\DemoEvaluationSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Phase1TrackingCodeAndCompletionSeederTest extends TestCase
{
    use DatabaseTransactions;

    public function test_evaluation_submissions_stores_tracking_code_and_digital_hash(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        Sanctum::actingAs($evaluator);

        $school = School::where('school_name', 'like', '%الفاروق%')->firstOrFail();
        $evaluation = Evaluation::where('school_id', $school->school_id)->firstOrFail();

        $submission = EvaluationSubmission::where('report_id', function ($q) use ($evaluation) {
            $q->select('report_id')->from('reports')->where('evaluation_id', $evaluation->evaluation_id);
        })->first();

        $this->assertNotNull($submission, 'يجب أن توجد محاولة تسليم لمدرسة الفاروق.');
        $this->assertNotEmpty($submission->tracking_code, 'يجب أن يحتوي حقل tracking_code على رمز تتبع وطني.');
        $this->assertNotEmpty($submission->digital_hash, 'يجب أن يحتوي حقل digital_hash على بصمة رقمية.');
        $this->assertStringStartsWith('ARQ-', $submission->tracking_code);
    }

    public function test_current_completion_request_returns_indicator_621_for_farouq(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        Sanctum::actingAs($evaluator);

        $response = $this->getJson('/api/v1/completion-requests/current');

        $response->assertOk();
        $response->assertJsonPath('data.status', 'Open');
        $this->assertNotEmpty($response->json('data.flaggedItems'));

        $item = $response->json('data.flaggedItems.0');
        $this->assertEquals('Pending', $item['status']);
        $this->assertStringContainsString('6-2-1', $item['indicatorCode']);
    }

    public function test_resubmit_completion_request_fails_if_items_are_pending(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        Sanctum::actingAs($evaluator);

        $comp = CompletionRequest::where('status', 'Open')->firstOrFail();

        $response = $this->postJson("/api/v1/completion-requests/{$comp->request_id}/resubmit", [
            'schoolNotes' => 'محاولة تسليم غير مكتملة',
        ]);

        $response->assertStatus(422);
    }

    public function test_resubmit_completion_request_succeeds_when_items_resolved_and_increments_attempt(): void
    {
        $evaluator = User::where('username', 'quality_farouq')->firstOrFail();
        Sanctum::actingAs($evaluator);

        $school = School::where('school_name', 'like', '%الفاروق%')->firstOrFail();
        $evaluation = Evaluation::where('school_id', $school->school_id)->firstOrFail();
        $link621 = \App\Models\EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)
            ->where('indicator_id', 11)
            ->first();

        if ($link621) {
            $link621->status = 'completed';
            $link621->save();
        }

        $comp = CompletionRequest::where('status', 'Open')->firstOrFail();

        // حل كافة البنود
        CompletionRequestItem::where('request_id', $comp->request_id)->update(['status' => 'resolved']);

        $response = $this->postJson("/api/v1/completion-requests/{$comp->request_id}/resubmit", [
            'schoolNotes' => 'تم استيفاء كافة الشواهد والتقارير المطلوبة.',
        ]);

        $response->assertOk();
        $this->assertEquals(2, $response->json('data.attemptNo'));
        $this->assertStringContainsString('-R1-', $response->json('data.trackingCode'));
        $this->assertNotEmpty($response->json('data.digitalHash'));
    }
}
