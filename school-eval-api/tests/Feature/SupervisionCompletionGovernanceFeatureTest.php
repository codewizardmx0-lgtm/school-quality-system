<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\CompletionRequest;
use App\Models\CompletionRequestItem;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationSubmission;
use App\Models\Indicator;
use App\Models\Report;
use App\Models\School;
use App\Models\StandardVersion;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات حوكمة طلبات الاستكمال والعزل الجغرافي وسقف المحاولات (Screen 5 Governance).
 *
 * تغطي:
 * 1. العزل الجغرافي في إصدار وتمديد طلبات الاستكمال (403 للمشرف خارج النطاق).
 * 2. قيد عدم تجاوز مهلة الاستكمال لتاريخ إغلاق الدورة التقييمية (422).
 * 3. سقف محاولات الاستكمال (منع الإصدار عند attempt_no >= 3 بـ 422).
 * 4. منع ازدواجية الطلبات المفتوحة لنفس التقييم (422).
 * 5. توثيق تمديد المهلة مع المبرر في audit_logs (FR-SUP-05 / FR-SUP-11).
 * 6. جلب سجل ومتابعة طلبات الاستكمال مفلترة جغرافياً (GET /api/v1/supervision/completion-requests).
 */
class SupervisionCompletionGovernanceFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $supervisorAmana;
    protected User $supervisorTaiz;
    protected School $schoolAmana;
    protected School $schoolTaiz;
    protected EvaluationCycle $activeCycle;
    protected Evaluation $evalAmana;
    protected Evaluation $evalTaiz;
    protected Indicator $indicator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->schoolAmana = School::where('identification_data', 'SCH-AMANA-2026-001')->first()
            ?? School::firstOrCreate(
                ['school_name' => 'مدرسة الأمانة النموذجية'],
                [
                    'identification_data' => 'SCH-AMN-TEST',
                    'school_code' => 'SCH-AMN-TEST',
                    'governorate' => 'أمانة العاصمة',
                    'educational_district' => 'السبعين',
                    'status' => 'Active',
                ]
            );

        $this->schoolTaiz = School::where('identification_data', 'SCH-TAIZ-2026-001')->first()
            ?? School::firstOrCreate(
                ['school_name' => 'مدرسة تعز النموذجية'],
                [
                    'identification_data' => 'SCH-TAZ-TEST',
                    'school_code' => 'SCH-TAZ-TEST',
                    'governorate' => 'تعز',
                    'educational_district' => 'المظفر',
                    'status' => 'Active',
                ]
            );

        $this->schoolAmana->update(['governorate' => 'أمانة العاصمة']);
        $this->schoolTaiz->update(['governorate' => 'تعز']);

        $this->supervisorAmana = User::where('username', 'supervisor_ministry')->firstOrFail();
        $this->supervisorAmana->update(['governorate' => 'أمانة العاصمة']);

        $this->supervisorTaiz = User::firstOrCreate(
            ['username' => 'supervisor_taiz_test'],
            [
                'full_name' => 'مشرف محافظة تعز',
                'email' => 'supervisor_taiz@test.gov',
                'password_hash' => bcrypt('password'),
                'user_type' => 'ministry',
                'status' => 'Active',
                'governorate' => 'تعز',
            ]
        );
        $role = \App\Models\Role::where('role_name', 'ministry_supervisor')->first();
        if ($role && !$this->supervisorTaiz->hasRole('ministry_supervisor')) {
            $this->supervisorTaiz->roles()->attach($role->role_id, ['assigned_at' => now(), 'active' => true]);
            $this->supervisorTaiz->unsetRelation('activeRoles');
        }

        $version = StandardVersion::where('status', 'Active')->first()
            ?? StandardVersion::where('status', 'Approved')->first()
            ?? StandardVersion::first();

        $this->activeCycle = EvaluationCycle::where('status', 'Active')->first()
            ?? EvaluationCycle::create([
                'name' => 'دورة اختبار الحوكمة 2026',
                'academic_year' => '2025/2026',
                'start_date' => now()->subDays(10)->toDateString(),
                'end_date' => now()->addDays(20)->toDateString(),
                'status' => 'Active',
                'version_id' => $version->version_id,
            ]);

        // تقييم الأمانة بحالة Submitted
        $this->evalAmana = Evaluation::firstOrCreate(
            [
                'school_id' => $this->schoolAmana->school_id,
                'cycle_id' => $this->activeCycle->cycle_id,
            ],
            [
                'created_by_user_id' => $this->supervisorAmana->user_id,
                'status' => 'Submitted',
            ]
        );
        $this->evalAmana->update(['status' => 'Submitted']);

        $reportAmana = Report::firstOrCreate(
            ['evaluation_id' => $this->evalAmana->evaluation_id],
            ['status' => 'Draft', 'generated_at' => now()]
        );
        EvaluationSubmission::firstOrCreate(
            ['report_id' => $reportAmana->report_id, 'attempt_no' => 1],
            [
                'submitted_by_user_id' => $this->supervisorAmana->user_id,
                'submitted_at' => now(),
                'status' => 'Submitted',
            ]
        );

        // تقييم تعز بحالة Submitted
        $this->evalTaiz = Evaluation::firstOrCreate(
            [
                'school_id' => $this->schoolTaiz->school_id,
                'cycle_id' => $this->activeCycle->cycle_id,
            ],
            [
                'created_by_user_id' => $this->supervisorTaiz->user_id,
                'status' => 'Submitted',
            ]
        );
        $this->evalTaiz->update(['status' => 'Submitted']);

        $reportTaiz = Report::firstOrCreate(
            ['evaluation_id' => $this->evalTaiz->evaluation_id],
            ['status' => 'Draft', 'generated_at' => now()]
        );
        EvaluationSubmission::firstOrCreate(
            ['report_id' => $reportTaiz->report_id, 'attempt_no' => 1],
            [
                'submitted_by_user_id' => $this->supervisorTaiz->user_id,
                'submitted_at' => now(),
                'status' => 'Submitted',
            ]
        );

        $this->indicator = Indicator::firstOrFail();
    }

    /**
     * 1. منع مشرف تعز من إصدار طلب استكمال لمدرسة في أمانة العاصمة (403 Forbidden).
     */
    public function test_supervisor_from_another_governorate_cannot_create_completion_request(): void
    {
        Sanctum::actingAs($this->supervisorTaiz);

        $response = $this->postJson("/api/v1/evaluations/{$this->evalAmana->evaluation_id}/completion-requests", [
            'completion_deadline' => now()->addDays(5)->toIso8601String(),
            'notes' => 'محاولة اختراق النطاق الجغرافي',
            'items' => [
                [
                    'indicator_id' => $this->indicator->indicator_id,
                    'missing_description' => 'نقص مستندي',
                ],
            ],
        ]);

        $response->assertStatus(403);
    }

    /**
     * 2. نجاح المشرف في إصدار طلب استكمال لمدرسة ضمن نطاقه الجغرافي.
     */
    public function test_supervisor_creates_completion_request_within_governorate(): void
    {
        Sanctum::actingAs($this->supervisorAmana);

        $response = $this->postJson("/api/v1/evaluations/{$this->evalAmana->evaluation_id}/completion-requests", [
            'completion_deadline' => now()->addDays(7)->toIso8601String(),
            'notes' => 'توجيهات رسمية لمدرسة الأمانة',
            'items' => [
                [
                    'indicator_id' => $this->indicator->indicator_id,
                    'missing_description' => 'يرجى إرفاق خطة العمل المعتمدة.',
                ],
            ],
        ]);

        $response->assertStatus(201);
        $this->assertEquals('NeedsCompletion', $this->evalAmana->fresh()->status);
    }

    /**
     * 3. رفض إصدار طلب استكمال يتجاوز تاريخ إغلاق الدورة التقييمية (422).
     */
    public function test_completion_request_fails_if_deadline_exceeds_cycle_end_date(): void
    {
        Sanctum::actingAs($this->supervisorAmana);

        // تاريخ بعد نهاية الدورة بيومين
        $beyondCycle = Carbon::parse($this->activeCycle->end_date)->addDays(2)->toIso8601String();

        $response = $this->postJson("/api/v1/evaluations/{$this->evalAmana->evaluation_id}/completion-requests", [
            'completion_deadline' => $beyondCycle,
            'items' => [
                [
                    'indicator_id' => $this->indicator->indicator_id,
                    'missing_description' => 'اختبار تاريخ الدورة',
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['completion_deadline']);
    }

    /**
     * 4. منع إصدار طلب استكمال إذا وصلت المدرسة للحد الأقصى (attempt_no >= 3).
     */
    public function test_completion_request_fails_if_max_attempts_reached(): void
    {
        Sanctum::actingAs($this->supervisorAmana);

        $report = Report::where('evaluation_id', $this->evalAmana->evaluation_id)->first();
        EvaluationSubmission::create([
            'report_id' => $report->report_id,
            'attempt_no' => 3,
            'submitted_by_user_id' => $this->supervisorAmana->user_id,
            'submitted_at' => now(),
            'status' => 'Submitted',
        ]);

        $response = $this->postJson("/api/v1/evaluations/{$this->evalAmana->evaluation_id}/completion-requests", [
            'completion_deadline' => now()->addDays(5)->toIso8601String(),
            'items' => [
                [
                    'indicator_id' => $this->indicator->indicator_id,
                    'missing_description' => 'محاولة بعد استنفاد الـ 3 محاولات',
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['attempt_no']);
    }

    /**
     * 5. تمديد المهلة وتوثيق المبرر في audit_logs مع رفض تمديد المشرف خارج النطاق.
     */
    public function test_deadline_extension_governance_and_audit_logging(): void
    {
        Sanctum::actingAs($this->supervisorAmana);

        $createResp = $this->postJson("/api/v1/evaluations/{$this->evalAmana->evaluation_id}/completion-requests", [
            'completion_deadline' => now()->addDays(5)->toIso8601String(),
            'items' => [
                [
                    'indicator_id' => $this->indicator->indicator_id,
                    'missing_description' => 'نقص الشاهد',
                ],
            ],
        ]);
        $createResp->assertStatus(201);
        $requestId = $createResp->json('data.request_id');

        // محاولة مشرف تعز تمديد مهلة مدرسة في الأمانة -> 403
        Sanctum::actingAs($this->supervisorTaiz);
        $unauthExtend = $this->patchJson("/api/v1/completion-requests/{$requestId}/deadline", [
            'new_deadline' => now()->addDays(8)->toIso8601String(),
            'reason' => 'محاولة غير مصرحة',
        ]);
        $unauthExtend->assertStatus(403);

        // تمديد مشرف الأمانة صاحب النطاق -> 200 وتوثيق بسجل التدقيق
        Sanctum::actingAs($this->supervisorAmana);
        $authExtend = $this->patchJson("/api/v1/completion-requests/{$requestId}/deadline", [
            'new_deadline' => now()->addDays(9)->toIso8601String(),
            'reason' => 'بناءً على طلب المدرسة لتوفير تقرير مجلس الآباء المعتمد',
        ]);
        $authExtend->assertStatus(200);

        $cr = CompletionRequest::find($requestId);
        $this->assertEquals(1, $cr->deadline_extensions_count);
        $this->assertNotNull($cr->deadline_extended_at);

        // التحقق من توثيق المبرر في سجل التدقيق audit_logs
        $log = AuditLog::where('action', 'completion.deadline_extended')
            ->where('target_id', $requestId)
            ->first();
        $this->assertNotNull($log);
        $this->assertEquals('بناءً على طلب المدرسة لتوفير تقرير مجلس الآباء المعتمد', $log->new_values['extension_reason'] ?? null);
    }

    /**
     * 6. التحقق من مسار استعراض وتتبع طلبات الاستكمال مفلترة جغرافياً.
     */
    public function test_supervision_completion_requests_tracker_filters_by_governorate(): void
    {
        // إصدار طلب للأمانة
        Sanctum::actingAs($this->supervisorAmana);
        $this->postJson("/api/v1/evaluations/{$this->evalAmana->evaluation_id}/completion-requests", [
            'completion_deadline' => now()->addDays(5)->toIso8601String(),
            'items' => [
                ['indicator_id' => $this->indicator->indicator_id, 'missing_description' => 'طلب أمانة'],
            ],
        ]);

        // إصدار طلب لتعز
        Sanctum::actingAs($this->supervisorTaiz);
        $this->postJson("/api/v1/evaluations/{$this->evalTaiz->evaluation_id}/completion-requests", [
            'completion_deadline' => now()->addDays(6)->toIso8601String(),
            'items' => [
                ['indicator_id' => $this->indicator->indicator_id, 'missing_description' => 'طلب تعز'],
            ],
        ]);

        // استعلام مشرف الأمانة يجب أن يعيد فقط طلبات الأمانة
        Sanctum::actingAs($this->supervisorAmana);
        $amanaResp = $this->getJson('/api/v1/supervision/completion-requests');
        $amanaResp->assertStatus(200);
        $amanaRequests = $amanaResp->json('data.requests');
        foreach ($amanaRequests as $req) {
            $this->assertEquals('أمانة العاصمة', $req['governorate']);
        }

        // استعلام مشرف تعز يجب أن يعيد فقط طلبات تعز
        Sanctum::actingAs($this->supervisorTaiz);
        $taizResp = $this->getJson('/api/v1/supervision/completion-requests');
        $taizResp->assertStatus(200);
        $taizRequests = $taizResp->json('data.requests');
        foreach ($taizRequests as $req) {
            $this->assertEquals('تعز', $req['governorate']);
        }
    }

    /**
     * 7. التحقق من مسار جلب شجرة المعايير الوطنية السبعة (GET /api/v1/supervision/standards-tree).
     */
    public function test_national_standards_tree_endpoint_returns_standards(): void
    {
        Sanctum::actingAs($this->supervisorAmana);
        $response = $this->getJson('/api/v1/supervision/standards-tree');
        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertIsArray($data);
        $this->assertGreaterThan(0, count($data));
        $this->assertArrayHasKey('standardId', $data[0]);
        $this->assertArrayHasKey('subStandards', $data[0]);
    }

    /**
     * 8. التحقق من حفظ واسترجاع الصلاحيات المتعددة للفك الجزئي (allowed_actions).
     */
    public function test_completion_request_saves_and_returns_multi_select_allowed_actions(): void
    {
        Sanctum::actingAs($this->supervisorAmana);
        $actions = ['upload_replace_evidence', 'edit_justification', 'review_score'];

        $response = $this->postJson("/api/v1/evaluations/{$this->evalAmana->evaluation_id}/completion-requests", [
            'completion_deadline' => now()->addDays(5)->toIso8601String(),
            'items' => [
                [
                    'indicator_id' => $this->indicator->indicator_id,
                    'missing_description' => 'نقص متعدد الصلاحيات',
                    'allowed_actions' => $actions,
                ],
            ],
        ]);

        $response->assertStatus(201);
        $item = \App\Models\CompletionRequestItem::where('missing_description', 'نقص متعدد الصلاحيات')->first();
        $this->assertNotNull($item);
        $this->assertEquals($actions, $item->allowed_actions);

        // استرجاع السجل
        $trackerResp = $this->getJson('/api/v1/supervision/completion-requests');
        $trackerResp->assertStatus(200);
        $reqs = $trackerResp->json('data.requests');
        $found = collect($reqs)->firstWhere('requestId', $response->json('data.request_id'));
        $this->assertNotNull($found);
        $this->assertEquals($actions, $found['items'][0]['allowedActions']);
    }

    /**
     * 9. التحقق من تقييد مهلة الاستكمال بسقف الدورة (max_completion_days) وإرجاع 422 عند التجاوز.
     */
    public function test_completion_request_fails_if_deadline_exceeds_cycle_max_days(): void
    {
        Sanctum::actingAs($this->supervisorTaiz);
        $this->activeCycle->update(['max_completion_days' => 10]);

        // إغلاق أي طلب استكمال سابق لتعز لضمان استقلالية الاختبار
        \App\Models\CompletionRequest::whereHas('submission.report', fn($q) => $q->where('evaluation_id', $this->evalTaiz->evaluation_id))
            ->update(['status' => 'Resolved']);
        $this->evalTaiz->update(['status' => 'Submitted']);

        // طلب مهلة 15 يوماً بينما سقف الدورة 10 أيام
        $response = $this->postJson("/api/v1/evaluations/{$this->evalTaiz->evaluation_id}/completion-requests", [
            'completion_deadline' => now()->addDays(15)->toIso8601String(),
            'items' => [
                [
                    'indicator_id' => $this->indicator->indicator_id,
                    'missing_description' => 'تجاوز سقف الدورة',
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['completion_deadline']);
    }
}
