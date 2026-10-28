<?php

namespace Tests\Feature;

use App\Models\Attachment;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\Evidence;
use App\Models\EvidenceVersion;
use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\IndicatorScoreDescriptor;
use App\Models\Note;
use App\Models\School;
use App\Models\Standard;
use App\Models\StandardVersion;
use App\Models\SubStandard;
use App\Models\User;
use App\Services\ReportsAnalyticsService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات ميزة تنظيم الشواهد وتصنيفها وربطها بالمؤشرات (الشريحة 5).
 *
 * تغطي:
 * 1. التصنيف اليدوي للشاهد (minutes, plan, record, report, board, image, other).
 * 2. التحقق من صحة نوع التصنيف (رفض الأنواع غير المعرفة بكود 422).
 * 3. الربط اليدوي للشاهد بمؤشر آخر مع إنشاء/ربط النتيجة المناسبة تلقائياً.
 * 4. إدارة حالة الشاهد (Draft, Completed, Audited).
 * 5. تسجيل ملاحظات المراجع/المقيم وتوثيق هوية المراجع والطابع الزمني.
 * 6. جرد واستخراج حصر الشواهد للتقييم مع بيان المكتمل والناقص.
 * 7. العزل المؤسسي الصارم للمدارس (القرار المعماري 9: 404).
 * 8. حظر تعديل أو تصنيف الشواهد بعد إغلاق التقييم وقفله (BR-SCH-03: 422).
 * 9. التحقق من صلاحيات المستخدمين (RBAC: 403).
 */
class EvidenceOrganizationFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $evaluatorBelqees;
    protected User $evaluatorFarouq;
    protected User $principalBelqees;
    protected User $userWithoutPermissions;
    protected School $schoolBelqees;
    protected School $schoolFarouq;
    protected Evaluation $evaluationBelqees;
    protected Evaluation $evaluationFarouq;
    protected StandardVersion $standardVersion;
    protected Indicator $firstIndicator;
    protected Indicator $secondIndicator;
    protected EvaluationResult $resultBelqees;
    protected Evidence $evidenceBelqees;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->schoolBelqees = School::where('identification_data', 'SCH-SANAA-2026-001')->firstOrFail();
        $this->schoolFarouq  = School::where('identification_data', 'SCH-TAIZ-2026-002')->firstOrFail();

        $this->evaluatorBelqees = User::where('username', 'quality_belqees')->firstOrFail();
        $this->evaluatorFarouq  = User::where('username', 'quality_farouq')->firstOrFail();
        $this->principalBelqees = User::where('username', 'principal_belqees')->firstOrFail();

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

        $indicators = Indicator::where('status', 'Active')
            ->whereHas('subStandard.standard', fn($q) => $q->where('version_id', $this->standardVersion->version_id))
            ->orderBy('indicator_id', 'asc')
            ->take(2)
            ->get();

        $this->firstIndicator  = $indicators[0];
        $this->secondIndicator = $indicators[1];

        $descriptor = IndicatorScoreDescriptor::where('indicator_id', $this->firstIndicator->indicator_id)
            ->where('standard_version_id', $this->standardVersion->version_id)
            ->first();

        $this->resultBelqees = EvaluationResult::firstOrCreate(
            [
                'evaluation_id' => $this->evaluationBelqees->evaluation_id,
                'indicator_id'  => $this->firstIndicator->indicator_id,
            ],
            [
                'score_descriptor_id' => $descriptor?->descriptor_id ?? 1,
                'standard_version_id' => $this->standardVersion->version_id,
                'evaluator_user_id'   => $this->evaluatorBelqees->user_id,
                'score'               => 2,
                'textual_result'      => 'نتيجة تجريبية',
                'completion_status'   => 'Completed',
            ]
        );

        // إنشاء شاهد أساسي لمدرسة بلقيس
        $this->evidenceBelqees = Evidence::create([
            'result_id'     => $this->resultBelqees->result_id,
            'indicator_id'  => $this->firstIndicator->indicator_id,
            'title'         => 'محضر اجتماع لجنة التقييم الذاتي الأول',
            'description'   => 'توثيق الاجتماع التحضيري لتوزيع الأدوار',
            'justification' => 'يثبت تفعيل لجان الجودة بالمدرسة',
            'evidence_type' => 'other',
            'status'        => 'Draft',
        ]);

        $v = EvidenceVersion::create([
            'evidence_id' => $this->evidenceBelqees->evidence_id,
            'version_no'  => 1,
            'current'     => true,
        ]);

        Attachment::create([
            'target_type' => 'evidence_version',
            'target_id'   => $v->evidence_version_id,
            'file_name'   => 'minutes.pdf',
            'file_type'   => 'application/pdf',
            'file_size'   => 1024,
            'storage_uri' => 'attachments/evidence/sample.pdf',
        ]);
    }

    /**
     * اختبار 1: تصنيف الشاهد يدوياً بأنواع صالحة مختلفة.
     */
    public function test_user_can_classify_evidence_manually(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $validTypes = ['minutes', 'plan', 'record', 'report', 'board', 'image', 'other'];

        foreach ($validTypes as $type) {
            $response = $this->patchJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/classify", [
                'evidence_type' => $type,
            ]);

            $response->assertStatus(200)
                ->assertJsonPath('data.evidenceType', $type)
                ->assertJsonPath('message', 'تم تصنيف الشاهد بنجاح.');

            $this->assertDatabaseHas('evidences', [
                'evidence_id'   => $this->evidenceBelqees->evidence_id,
                'evidence_type' => $type,
            ]);
        }
    }

    /**
     * اختبار 2: رفض نوع تصنيف غير صالح برمز 422.
     */
    public function test_classify_evidence_rejects_invalid_type(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->patchJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/classify", [
            'evidence_type' => 'unsupported_type_xyz',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['evidence_type']);
    }

    /**
     * اختبار 3: إعادة ربط الشاهد بمؤشر آخر مع إنشاء نتيجة التقييم للمؤشر الجديد تلقائياً.
     */
    public function test_user_can_link_evidence_to_another_indicator(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $targetIndicatorId = $this->secondIndicator->indicator_id;

        $response = $this->postJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/link-indicator", [
            'indicator_id' => $targetIndicatorId,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.indicatorId', $targetIndicatorId)
            ->assertJsonPath('message', 'تم ربط الشاهد بالمؤشر بنجاح.');

        $this->assertDatabaseHas('evidences', [
            'evidence_id'  => $this->evidenceBelqees->evidence_id,
            'indicator_id' => $targetIndicatorId,
        ]);

        // التأكد من إنشاء نتيجة تقييم في نفس التقييم للمؤشر الجديد
        $this->assertDatabaseHas('evaluation_results', [
            'evaluation_id' => $this->evaluationBelqees->evaluation_id,
            'indicator_id'  => $targetIndicatorId,
        ]);
    }

    /**
     * اختبار 4: ربط الشاهد بنفس المؤشر يرجع نجاحاً ورسالة تفيد بأنه مرتبط بالفعل.
     */
    public function test_linking_evidence_to_same_indicator_is_idempotent(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->postJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/link-indicator", [
            'indicator_id' => $this->firstIndicator->indicator_id,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.indicatorId', $this->firstIndicator->indicator_id)
            ->assertJsonPath('message', 'الشاهد مرتبط بالفعل بهذا المؤشر.');
    }

    /**
     * اختبار 5: تحديث حالة الشاهد (Draft, Completed, Audited).
     */
    public function test_user_can_update_evidence_status(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $statuses = [
            'completed' => 'Completed',
            'audited'   => 'Audited',
            'draft'     => 'Draft',
        ];

        foreach ($statuses as $input => $expected) {
            $response = $this->patchJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/status", [
                'status' => $input,
            ]);

            $response->assertStatus(200)
                ->assertJsonPath('data.status', $expected)
                ->assertJsonPath('message', 'تم تحديث حالة الشاهد بنجاح.');

            $this->assertDatabaseHas('evidences', [
                'evidence_id' => $this->evidenceBelqees->evidence_id,
                'status'      => $expected,
            ]);
        }
    }

    /**
     * اختبار 6: رفض تحديث حالة الشاهد بقيمة غير معروفة برمز 422.
     */
    public function test_update_status_rejects_invalid_status(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->patchJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/status", [
            'status' => 'Rejected',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    /**
     * اختبار 7: إضافة ملاحظات المراجع وتوثيق المراجع والوقت.
     */
    public function test_reviewer_can_add_review_notes_on_evidence(): void
    {
        Sanctum::actingAs($this->principalBelqees);

        $note = 'الشاهد مستوفٍ ومطابق لكافة بنود الواصفة الرابعة.';

        $response = $this->postJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/review-notes", [
            'notes' => $note,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.reviewerNotes', $note)
            ->assertJsonPath('data.reviewedBy.userId', $this->principalBelqees->user_id)
            ->assertJsonPath('message', 'تمت إضافة ملاحظات المراجع على الشاهد بنجاح.');

        $this->assertDatabaseHas('evidences', [
            'evidence_id'         => $this->evidenceBelqees->evidence_id,
            'reviewer_notes'      => $note,
            'reviewed_by_user_id' => $this->principalBelqees->user_id,
        ]);
    }

    /**
     * اختبار 8: استعلام جرد وحصر الشواهد للتقييم وإظهار النواقص والمكتمل.
     */
    public function test_user_can_retrieve_evidence_inventory(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $response = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/evidence-inventory");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'evaluationId',
                    'schoolId',
                    'schoolName',
                    'inventoryStatus',
                    'summary' => [
                        'totalIndicators',
                        'indicatorsWithSufficientEvidence',
                        'indicatorsMissingEvidence',
                        'totalEvidencesUploaded',
                        'byType',
                        'byStatus',
                    ],
                    'standards',
                ],
                'message',
            ])
            ->assertJsonPath('data.evaluationId', $this->evaluationBelqees->evaluation_id)
            ->assertJsonPath('message', 'تم استخراج حصر الشواهد بنجاح.');
    }

    /**
     * اختبار 9: تطبيق العزل المؤسسي الصارم للمدارس برمز 404 عند محاولة الوصول لشواهد مدرسة أخرى (القرار المعماري 9).
     */
    public function test_evidence_organization_strictly_enforces_tenant_isolation_404(): void
    {
        // مقيم مدرسة الفاروق يحاول الوصول لشاهد مدرسة بلقيس
        Sanctum::actingAs($this->evaluatorFarouq);

        // محاولة التصنيف
        $this->patchJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/classify", [
            'evidence_type' => 'report',
        ])->assertStatus(404);

        // محاولة إعادة الربط
        $this->postJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/link-indicator", [
            'indicator_id' => $this->secondIndicator->indicator_id,
        ])->assertStatus(404);

        // محاولة تعديل الحالة
        $this->patchJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/status", [
            'status' => 'Audited',
        ])->assertStatus(404);

        // محاولة إضافة ملاحظات مراجع
        $this->postJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/review-notes", [
            'notes' => 'ملاحظة متسللة',
        ])->assertStatus(404);

        // محاولة جرد شواهد مدرسة أخرى
        $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/evidence-inventory")
            ->assertStatus(404);
    }

    /**
     * اختبار 10: حظر التعديل أو التصنيف للشواهد بعد قفل التقييم واعتماده برمز 422 (BR-SCH-03).
     */
    public function test_modifications_are_prohibited_when_evaluation_is_locked_422(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // قفل التقييم ونقله لحالة Completed
        $this->evaluationBelqees->update(['status' => 'Completed']);

        // 1. محاولة التصنيف
        $responseClassify = $this->patchJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/classify", [
            'evidence_type' => 'plan',
        ]);
        $responseClassify->assertStatus(422);

        // 2. محاولة إعادة الربط
        $responseLink = $this->postJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/link-indicator", [
            'indicator_id' => $this->secondIndicator->indicator_id,
        ]);
        $responseLink->assertStatus(422);

        // 3. محاولة تعديل الحالة
        $responseStatus = $this->patchJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/status", [
            'status' => 'Audited',
        ]);
        $responseStatus->assertStatus(422);

        // 4. محاولة إضافة ملاحظة مراجع
        $responseNote = $this->postJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/review-notes", [
            'notes' => 'ملاحظة بعد القفل',
        ]);
        $responseNote->assertStatus(422);
    }

    /**
     * اختبار 11: التحقق من الصلاحيات والرفض برمز 403 لمن لا يملك الصلاحية.
     */
    public function test_unauthorized_user_receives_403_forbidden(): void
    {
        // مستخدم من مدرسة بلقيس بدون صلاحية evidence.manage
        $regularUser = User::create([
            'username'      => 'user_no_perms',
            'email'         => 'no_perms@belqees.edu.ye',
            'full_name'     => 'مستخدم بدون صلاحيات',
            'password_hash' => '$2y$04$somehash',
            'user_type'     => 'school',
            'school_id'     => $this->schoolBelqees->school_id,
            'status'        => 'Active',
        ]);

        Sanctum::actingAs($regularUser);

        // محاولة التصنيف
        $this->patchJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/classify", [
            'evidence_type' => 'report',
        ])->assertStatus(403);

        // محاولة إعادة الربط
        $this->postJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/link-indicator", [
            'indicator_id' => $this->secondIndicator->indicator_id,
        ])->assertStatus(403);

        // محاولة تعديل الحالة
        $this->patchJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/status", [
            'status' => 'Audited',
        ])->assertStatus(403);

        // محاولة إضافة ملاحظة مراجع
        $this->postJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/review-notes", [
            'notes' => 'ملاحظة غير مصرح بها',
        ])->assertStatus(403);

        // محاولة جرد الشواهد
        $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/evidence-inventory")
            ->assertStatus(403);
    }

    /**
     * اختبار 12: إمكانية إنشاء أكثر من شاهد نشط لنفس المؤشر بنجاح.
     */
    public function test_can_create_multiple_evidences_for_same_indicator(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $file2 = UploadedFile::fake()->create('second_evidence.pdf', 300, 'application/pdf');

        $response = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/evidences", [
            'title'         => 'الشاهد الثاني لنفس المؤشر - سجل إضافي',
            'description'   => 'وثيقة داعمة إضافية لا تحل محل الشاهد الأول',
            'evidence_type' => 'record',
            'file'          => $file2,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'الشاهد الثاني لنفس المؤشر - سجل إضافي')
            ->assertJsonPath('data.evidenceType', 'record');

        $newEvidenceId = $response->json('data.evidenceId');
        $this->assertNotNull($newEvidenceId);
        $this->assertNotEquals($this->evidenceBelqees->evidence_id, $newEvidenceId);

        // التأكد من وجود شاهدين للمؤشر في قاعدة البيانات
        $count = Evidence::where('indicator_id', $this->firstIndicator->indicator_id)
            ->where('result_id', $this->resultBelqees->result_id)
            ->count();
        $this->assertEquals(2, $count);

        // التأكد من أن كل شاهد له نسخته النشطة (current = true)
        $this->assertDatabaseHas('evidence_versions', [
            'evidence_id' => $this->evidenceBelqees->evidence_id,
            'version_no'  => 1,
            'current'     => true,
        ]);

        $this->assertDatabaseHas('evidence_versions', [
            'evidence_id' => $newEvidenceId,
            'version_no'  => 1,
            'current'     => true,
        ]);
    }

    /**
     * اختبار 13: استعراض قائمة الشواهد المتعددة للمؤشر الواحد.
     */
    public function test_can_list_all_evidences_for_indicator(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // إنشاء شاهد ثانٍ
        $file2 = UploadedFile::fake()->create('plan_doc.pdf', 250, 'application/pdf');
        $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/evidences", [
            'title'         => 'خطة العمل الداعمة',
            'description'   => 'خطة داعمة للمؤشر',
            'evidence_type' => 'plan',
            'file'          => $file2,
        ])->assertStatus(201);

        // استدعاء endpoint قائمة شواهد المؤشر
        $response = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/evidences");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'evidenceId',
                        'resultId',
                        'indicatorId',
                        'title',
                        'evidenceType',
                        'status',
                        'versions',
                    ],
                ],
                'message',
            ]);

        $evidences = $response->json('data');
        $this->assertCount(2, $evidences);
    }

    /**
     * اختبار 14: بقاء النسخة النشطة لكل شاهد مستقلة عند رفع نسخة جديدة لأحد الشاهدين.
     */
    public function test_active_versions_remain_independent_between_multiple_evidences(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // إنشاء شاهد ثانٍ
        $file2 = UploadedFile::fake()->create('minutes.pdf', 150, 'application/pdf');
        $createRes = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/evidences", [
            'title'         => 'محضر الاجتماع الداعم',
            'description'   => 'محضر اجتماع رقم 2',
            'evidence_type' => 'minutes',
            'file'          => $file2,
        ]);
        $secondEvidenceId = $createRes->json('data.evidenceId');
        $this->assertNotNull($secondEvidenceId);

        // رفع نسخة ثانية للشاهد الأول فقط
        $revisionFile = UploadedFile::fake()->create('first_evidence_v2.pdf', 400, 'application/pdf');
        $versionRes = $this->postJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/versions", [
            'change_summary' => 'تحديث بيانات الشاهد الأول بالإحصائيات الأحدث',
            'file'           => $revisionFile,
        ]);
        $versionRes->assertStatus(201);

        // فحص الشاهد الأول: نسخته الأولى أصبحت غير نشطة ونسخته الثانية نشطة
        $this->assertDatabaseHas('evidence_versions', [
            'evidence_id' => $this->evidenceBelqees->evidence_id,
            'version_no'  => 1,
            'current'     => false,
        ]);
        $this->assertDatabaseHas('evidence_versions', [
            'evidence_id' => $this->evidenceBelqees->evidence_id,
            'version_no'  => 2,
            'current'     => true,
        ]);

        // فحص الشاهد الثاني: نسخته الأولى ما زالت نشطة بالكامل ولم تتأثر إطلاقاً
        $this->assertDatabaseHas('evidence_versions', [
            'evidence_id' => $secondEvidenceId,
            'version_no'  => 1,
            'current'     => true,
        ]);
    }

    /**
     * اختبار 15: عدم كسر قيد "نسخة واحدة نشطة لكل شاهد" مهما تعددت النسخ والشواهد.
     */
    public function test_single_active_version_per_evidence_preserved(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // إنشاء شاهد ثانٍ
        $file2 = UploadedFile::fake()->create('board.png', 100, 'image/png');
        $createRes = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/evidences", [
            'title'         => 'لوحة الشرف',
            'description'   => 'صورة لوحة الشرف',
            'evidence_type' => 'board',
            'file'          => $file2,
        ]);
        $secondEvidenceId = $createRes->json('data.evidenceId');
        $this->assertNotNull($secondEvidenceId);

        // رفع نسخة v2 ثم v3 للشاهد الأول
        $v2 = UploadedFile::fake()->create('v2.pdf', 200, 'application/pdf');
        $this->postJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/versions", [
            'change_summary' => 'نسخة ثانية',
            'file'           => $v2,
        ])->assertStatus(201);

        $v3 = UploadedFile::fake()->create('v3.pdf', 250, 'application/pdf');
        $this->postJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/versions", [
            'change_summary' => 'نسخة ثالثة',
            'file'           => $v3,
        ])->assertStatus(201);

        // فحص: الشاهد الأول يملك نسخة نشطة واحدة فقط
        $activeVersionsCount1 = EvidenceVersion::where('evidence_id', $this->evidenceBelqees->evidence_id)
            ->where('current', true)
            ->count();
        $this->assertEquals(1, $activeVersionsCount1);

        // فحص: الشاهد الثاني يملك أيضاً نسخة نشطة واحدة فقط
        $activeVersionsCount2 = EvidenceVersion::where('evidence_id', $secondEvidenceId)
            ->where('current', true)
            ->count();
        $this->assertEquals(1, $activeVersionsCount2);

        // إجمالي النسخ للشاهد الأول هو 3
        $this->assertEquals(3, EvidenceVersion::where('evidence_id', $this->evidenceBelqees->evidence_id)->count());
    }

    /**
     * اختبار 16: التحقق من العزل المؤسسي وقفل التقييم لمسار شواهد المؤشر.
     */
    public function test_indicator_evidences_tenant_isolation_and_lock_rules(): void
    {
        // 1. عزل المؤسسات: مقيم مدرسة الفاروق يحاول الوصول لشواهد مؤشر مدرسة بلقيس -> 404
        Sanctum::actingAs($this->evaluatorFarouq);
        $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/evidences")
            ->assertStatus(404);

        $file = UploadedFile::fake()->create('intruder.pdf', 100, 'application/pdf');
        $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/evidences", [
            'title'         => 'شاهد غير مصرح به',
            'evidence_type' => 'report',
            'file'          => $file,
        ])->assertStatus(404);

        // 2. قفل التقييم: مقيم بلقيس يحاول إضافة شاهد بعد إغلاق التقييم -> 422
        Sanctum::actingAs($this->evaluatorBelqees);
        $this->evaluationBelqees->update(['status' => 'Completed']);

        $fileValid = UploadedFile::fake()->create('valid.pdf', 100, 'application/pdf');
        $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/evidences", [
            'title'         => 'شاهد بعد القفل',
            'evidence_type' => 'report',
            'file'          => $fileValid,
        ])->assertStatus(422);
    }

    /**
     * دالة مساعدة لرصد جميع المؤشرات الفعالة لتقييم بلقيس.
     */
    protected function scoreAllActiveIndicators(int $score = 3, ?int $exceptIndicatorId = null): void
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
     * دالة مساعدة لإرفاق شواهد مستوفية بحالة Completed للمؤشرات التي تتطلب شواهد إلزامية.
     */
    protected function attachCompletedEvidenceToRequiredIndicators(?int $exceptIndicatorId = null): void
    {
        $requirements = IndicatorEvidenceRequirement::where('required', true)
            ->get()
            ->groupBy('indicator_id');

        foreach ($requirements as $indicatorId => $reqList) {
            if ($exceptIndicatorId && (int) $indicatorId === (int) $exceptIndicatorId) {
                continue;
            }

            $result = EvaluationResult::where('evaluation_id', $this->evaluationBelqees->evaluation_id)
                ->where('indicator_id', $indicatorId)
                ->first();

            if ($result) {
                foreach ($reqList as $req) {
                    $evidence = Evidence::create([
                        'result_id'     => $result->result_id,
                        'indicator_id'  => $indicatorId,
                        'title'         => 'شاهد مستوف للمتطلب ' . $req->requirement_id,
                        'description'   => 'وصف الشاهد',
                        'justification' => 'مبرر الشاهد',
                        'status'        => 'Completed',
                    ]);

                    EvidenceVersion::create([
                        'evidence_id' => $evidence->evidence_id,
                        'version_no'  => 1,
                        'current'     => true,
                    ]);
                }
            }
        }
    }

    /**
     * اختبار 17: رفع شاهد لمؤشر بلا رصد ينشئ نتيجة Pending ويُرفض عند محاولة submit ويظهر في unscored_indicators.
     */
    public function test_auto_created_result_for_unscored_indicator_fails_submit_and_appears_in_unscored_indicators(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // 1. رصد جميع المؤشرات ما عدا مؤشر واحد
        $targetIndicator = $this->secondIndicator;
        $this->scoreAllActiveIndicators(3, $targetIndicator->indicator_id);
        $this->attachCompletedEvidenceToRequiredIndicators($targetIndicator->indicator_id);

        // 2. التأكد من عدم وجود نتيجة لهذا المؤشر مسبقاً
        EvaluationResult::where('evaluation_id', $this->evaluationBelqees->evaluation_id)
            ->where('indicator_id', $targetIndicator->indicator_id)
            ->delete();

        // 3. رفع شاهد لهذا المؤشر دون رصد درجات له
        $file = UploadedFile::fake()->create('unscored_evidence.pdf', 200, 'application/pdf');
        $uploadRes = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$targetIndicator->indicator_id}/evidences", [
            'title'         => 'شاهد لمؤشر بلا رصد',
            'description'   => 'شاهد مرفوع قبل رصد الدرجة',
            'evidence_type' => 'record',
            'file'          => $file,
        ]);
        $uploadRes->assertStatus(201);

        // 4. التحقق من أن النتيجة أُنشئت بحالة Pending
        $autoResult = EvaluationResult::where('evaluation_id', $this->evaluationBelqees->evaluation_id)
            ->where('indicator_id', $targetIndicator->indicator_id)
            ->first();
        $this->assertNotNull($autoResult);
        $this->assertEquals('Pending', $autoResult->completion_status);

        // 5. محاولة إغلاق وتقديم التقييم: يجب أن ترفض وتذكر المؤشر في unscored_indicators
        $submitRes = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/submit");
        $submitRes->assertStatus(422)
            ->assertJsonPath('errors.unscored_indicators.0.indicator_id', $targetIndicator->indicator_id);
    }

    /**
     * اختبار 18: وجود سجل نتيجة تلقائي Pending لا يؤثر على حساب نتائج المعيار أو النتيجة النهائية في الشريحة 4.
     */
    public function test_auto_created_result_does_not_affect_standard_or_evaluation_score_calculation(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $service = app(ReportsAnalyticsService::class);

        // مؤشر مستهدف بلا درجة
        $targetIndicator = $this->secondIndicator;
        EvaluationResult::where('evaluation_id', $this->evaluationBelqees->evaluation_id)
            ->where('indicator_id', $targetIndicator->indicator_id)
            ->delete();

        // رصد المؤشر الأول فقط
        $this->resultBelqees->update([
            'score'             => 3,
            'completion_status' => 'Completed',
        ]);

        $standard = $targetIndicator->subStandard->standard;

        // حساب النتائج قبل رفع الشاهد
        $standardBefore = $service->calculateStandardResults($this->evaluationBelqees, $standard);
        $assessmentBefore = $service->calculateAssessmentResults($this->evaluationBelqees);

        // رفع شاهد للمؤشر غير المرصود (ينشئ نتيجة تلقائية بحالة Pending)
        $file = UploadedFile::fake()->create('pending_ev.pdf', 200, 'application/pdf');
        $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$targetIndicator->indicator_id}/evidences", [
            'title'         => 'شاهد غير مرصود',
            'evidence_type' => 'plan',
            'file'          => $file,
        ])->assertStatus(201);

        // حساب النتائج بعد رفع الشاهد
        $standardAfter = $service->calculateStandardResults($this->evaluationBelqees, $standard);
        $assessmentAfter = $service->calculateAssessmentResults($this->evaluationBelqees);

        // التأكد من عدم تأثر مجموع النقاط والنسب المئوية إطلاقاً
        $this->assertEquals($standardBefore['raw_score'], $standardAfter['raw_score']);
        $this->assertEquals($standardBefore['percentage'], $standardAfter['percentage']);
        $this->assertEquals($standardBefore['weighted_score'], $standardAfter['weighted_score']);
        $this->assertEquals($standardBefore['evaluated_indicators'], $standardAfter['evaluated_indicators']);

        $this->assertEquals($assessmentBefore['final_score'], $assessmentAfter['final_score']);
        $this->assertEquals($assessmentBefore['evaluated_indicators'], $assessmentAfter['evaluated_indicators']);
    }

    /**
     * اختبار 19: المؤشر الذي يحتوي على شاهد Draft فقط يظهر ناقصاً في الجرد ويُرفض عند submit.
     */
    public function test_indicator_with_only_draft_evidence_is_missing_in_inventory_and_fails_submit(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // تجهيز تقييم كامل الرصد والشواهد ما عدا مؤشر ذي متطلب إلزامي
        $this->scoreAllActiveIndicators(3);
        $this->attachCompletedEvidenceToRequiredIndicators();

        // اختيار مؤشر لديه متطلب إلزامي واحد بالضبط
        $targetIndicatorId = (int) IndicatorEvidenceRequirement::where('required', true)
            ->selectRaw('indicator_id, count(*) as c')
            ->groupBy('indicator_id')
            ->having('c', '=', 1)
            ->firstOrFail()
            ->indicator_id;

        // حذف الشواهد السابقة للمؤشر وجعل شاهده بحالة Draft فقط
        $result = EvaluationResult::where('evaluation_id', $this->evaluationBelqees->evaluation_id)
            ->where('indicator_id', $targetIndicatorId)
            ->first();

        $existingEvIds = Evidence::where('result_id', $result->result_id)->pluck('evidence_id');
        $existingVersionIds = EvidenceVersion::whereIn('evidence_id', $existingEvIds)->pluck('evidence_version_id');
        Attachment::where('target_type', 'evidence_version')->whereIn('target_id', $existingVersionIds)->delete();
        EvidenceVersion::whereIn('evidence_id', $existingEvIds)->delete();
        Evidence::whereIn('evidence_id', $existingEvIds)->delete();

        $draftEvidence = Evidence::create([
            'result_id'     => $result->result_id,
            'indicator_id'  => $targetIndicatorId,
            'title'         => 'شاهد مسودة فقط',
            'status'        => 'Draft',
            'evidence_type' => 'report',
        ]);

        EvidenceVersion::create([
            'evidence_id' => $draftEvidence->evidence_id,
            'version_no'  => 1,
            'current'     => true,
        ]);

        // 1. فحص الجرد: يجب أن يظهر المؤشر كناقص الشواهد لأن الشاهد مسودة Draft
        $inventoryRes = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/evidence-inventory");
        $inventoryRes->assertStatus(200);

        $standards = $inventoryRes->json('data.standards');
        $indicatorFound = false;
        foreach ($standards as $std) {
            foreach ($std['indicators'] as $ind) {
                if ($ind['indicatorId'] === $targetIndicatorId) {
                    $this->assertFalse($ind['isSufficient']);
                    $this->assertEquals('Missing', $ind['status']);
                    $indicatorFound = true;
                    break 2;
                }
            }
        }
        $this->assertTrue($indicatorFound);

        // 2. محاولة الإغلاق: يجب أن تفشل برمز 422 لعدم استيفاء الشاهد الإلزامي
        $submitRes = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/submit");
        $submitRes->assertStatus(422)
            ->assertJsonPath('errors.missing_evidence_indicators.0.indicator_id', $targetIndicatorId);
    }

    /**
     * اختبار 20: بعد تعديل حالة الشاهد إلى Completed يصبح المؤشر مستوفياً في الجرد ويقبل submit.
     */
    public function test_updating_evidence_status_to_completed_satisfies_inventory_and_allows_submit(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $this->scoreAllActiveIndicators(3);
        $this->attachCompletedEvidenceToRequiredIndicators();

        // اختيار مؤشر لديه متطلب إلزامي واحد بالضبط
        $targetIndicatorId = (int) IndicatorEvidenceRequirement::where('required', true)
            ->selectRaw('indicator_id, count(*) as c')
            ->groupBy('indicator_id')
            ->having('c', '=', 1)
            ->firstOrFail()
            ->indicator_id;

        $result = EvaluationResult::where('evaluation_id', $this->evaluationBelqees->evaluation_id)
            ->where('indicator_id', $targetIndicatorId)
            ->first();

        $existingEvIds = Evidence::where('result_id', $result->result_id)->pluck('evidence_id');
        $existingVersionIds = EvidenceVersion::whereIn('evidence_id', $existingEvIds)->pluck('evidence_version_id');
        Attachment::where('target_type', 'evidence_version')->whereIn('target_id', $existingVersionIds)->delete();
        EvidenceVersion::whereIn('evidence_id', $existingEvIds)->delete();
        Evidence::whereIn('evidence_id', $existingEvIds)->delete();

        $draftEvidence = Evidence::create([
            'result_id'     => $result->result_id,
            'indicator_id'  => $targetIndicatorId,
            'title'         => 'شاهد سيتم اعتماده',
            'status'        => 'Draft',
            'evidence_type' => 'report',
        ]);

        EvidenceVersion::create([
            'evidence_id' => $draftEvidence->evidence_id,
            'version_no'  => 1,
            'current'     => true,
        ]);

        // تعديل حالة الشاهد إلى Completed
        $patchRes = $this->patchJson("/api/v1/evidences/{$draftEvidence->evidence_id}/status", [
            'status' => 'Completed',
        ]);
        $patchRes->assertStatus(200);

        // 1. فحص الجرد بعد التعديل: يجب أن يصبح مستوفياً
        $inventoryRes = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/evidence-inventory");
        $inventoryRes->assertStatus(200);

        $standards = $inventoryRes->json('data.standards');
        $indicatorFound = false;
        foreach ($standards as $std) {
            foreach ($std['indicators'] as $ind) {
                if ($ind['indicatorId'] === $targetIndicatorId) {
                    $this->assertTrue($ind['isSufficient']);
                    $this->assertEquals('Completed', $ind['status']);
                    $indicatorFound = true;
                    break 2;
                }
            }
        }
        $this->assertTrue($indicatorFound);

        // 2. محاولة تقديم التقييم: تنجح الآن برمز 200
        $submitRes = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/submit");
        $submitRes->assertStatus(200)
            ->assertJsonPath('data.status', 'Completed');
    }

    /**
     * اختبار 21: رفع ثلاثة شواهد لنفس المؤشر وتعديل حالة أحدها فقط يترك الآخرين دون أي تغيير.
     */
    public function test_uploading_three_evidences_and_updating_one_leaves_others_unchanged(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // حذف الشواهد السابقة للمؤشر الأول لبدء اختبار نظيف
        $existingEvIds = Evidence::where('result_id', $this->resultBelqees->result_id)->pluck('evidence_id');
        $existingVersionIds = EvidenceVersion::whereIn('evidence_id', $existingEvIds)->pluck('evidence_version_id');
        Attachment::where('target_type', 'evidence_version')->whereIn('target_id', $existingVersionIds)->delete();
        EvidenceVersion::whereIn('evidence_id', $existingEvIds)->delete();
        Evidence::whereIn('evidence_id', $existingEvIds)->delete();

        // 1. رفع الشاهد الأول
        $file1 = UploadedFile::fake()->create('ev1.pdf', 100, 'application/pdf');
        $res1 = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/evidences", [
            'title'         => 'الشاهد الأول',
            'evidence_type' => 'minutes',
            'file'          => $file1,
        ]);
        $ev1Id = $res1->json('data.evidenceId');

        // 2. رفع الشاهد الثاني
        $file2 = UploadedFile::fake()->create('ev2.pdf', 100, 'application/pdf');
        $res2 = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/evidences", [
            'title'         => 'الشاهد الثاني',
            'evidence_type' => 'plan',
            'file'          => $file2,
        ]);
        $ev2Id = $res2->json('data.evidenceId');

        // 3. رفع الشاهد الثالث
        $file3 = UploadedFile::fake()->create('ev3.pdf', 100, 'application/pdf');
        $res3 = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/evidences", [
            'title'         => 'الشاهد الثالث',
            'evidence_type' => 'record',
            'file'          => $file3,
        ]);
        $ev3Id = $res3->json('data.evidenceId');

        // التحقق من أن الشواهد الثلاثة موجودة بحالة مسودة Draft ولكل منها نسخة نشطة
        $this->assertEquals(3, Evidence::where('indicator_id', $this->firstIndicator->indicator_id)->count());
        $this->assertEquals('Draft', Evidence::find($ev1Id)->status);
        $this->assertEquals('Draft', Evidence::find($ev2Id)->status);
        $this->assertEquals('Draft', Evidence::find($ev3Id)->status);

        // 4. تعديل حالة الشاهد الثاني فقط إلى Completed
        $this->patchJson("/api/v1/evidences/{$ev2Id}/status", [
            'status' => 'Completed',
        ])->assertStatus(200);

        // 5. التحقق الصارم من أن الشاهد الأول والثالث لم تتغير حالتهما أو نسخهما النشطة
        $ev1 = Evidence::find($ev1Id);
        $ev2 = Evidence::find($ev2Id);
        $ev3 = Evidence::find($ev3Id);

        $this->assertEquals('Completed', $ev2->status);
        $this->assertEquals('Draft', $ev1->status);
        $this->assertEquals('Draft', $ev3->status);

        $this->assertDatabaseHas('evidence_versions', [
            'evidence_id' => $ev1Id,
            'version_no'  => 1,
            'current'     => true,
        ]);
        $this->assertDatabaseHas('evidence_versions', [
            'evidence_id' => $ev2Id,
            'version_no'  => 1,
            'current'     => true,
        ]);
        $this->assertDatabaseHas('evidence_versions', [
            'evidence_id' => $ev3Id,
            'version_no'  => 1,
            'current'     => true,
        ]);
    }

    /**
     * اختبار 22: التحقق من أن الواصفة المرتبطة بالنتيجة التلقائية تخص نفس المؤشر والإصدار ولها score = 0 ورفض الإنشاء إن لم توجد.
     */
    public function test_auto_created_result_selects_descriptor_for_same_indicator_and_version_with_score_zero(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // 1. استخدام المؤشر الثاني (indicator_id = 2) لضمان أن معرف الواصفة ليس 1
        $targetIndicator = $this->secondIndicator;
        $versionId = (int) $this->standardVersion->version_id;

        // حذف أي نتيجة سابقة للمؤشر الثاني في هذا التقييم
        EvaluationResult::where('evaluation_id', $this->evaluationBelqees->evaluation_id)
            ->where('indicator_id', $targetIndicator->indicator_id)
            ->delete();

        // استخراج الواصفة المتوقعة للمؤشر الثاني ذات الدرجة 0
        $expectedDescriptor = IndicatorScoreDescriptor::where('indicator_id', $targetIndicator->indicator_id)
            ->where('standard_version_id', $versionId)
            ->whereHas('scoreLevel', function ($q) {
                $q->where('score_value', 0);
            })
            ->firstOrFail();

        $this->assertNotEquals(1, $expectedDescriptor->descriptor_id, 'واصفة المؤشر الثاني يجب ألا تكون الواصفة رقم 1');

        // 2. رفع شاهد جديد للمؤشر الثاني لإنشاء النتيجة تلقائياً
        $file = UploadedFile::fake()->create('descriptor_check.pdf', 150, 'application/pdf');
        $res = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$targetIndicator->indicator_id}/evidences", [
            'title'         => 'شاهد فحص الواصفة',
            'description'   => 'التحقق من ربط الواصفة الصحيحة للنتيجة التلقائية',
            'evidence_type' => 'report',
            'file'          => $file,
        ]);

        $res->assertStatus(201);

        // 3. التحقق من النتيجة التلقائية المنشأة في قاعدة البيانات
        $autoResult = EvaluationResult::with(['scoreDescriptor.scoreLevel'])
            ->where('evaluation_id', $this->evaluationBelqees->evaluation_id)
            ->where('indicator_id', $targetIndicator->indicator_id)
            ->firstOrFail();

        $this->assertEquals('Pending', $autoResult->completion_status);
        $this->assertEquals(0, $autoResult->score);
        $this->assertEquals($versionId, $autoResult->standard_version_id);
        $this->assertEquals($expectedDescriptor->descriptor_id, $autoResult->score_descriptor_id);

        // التحقق الدقيق من مطابقة الواصفة لنفس المؤشر ونفس الإصدار ودرجة 0
        $this->assertNotNull($autoResult->scoreDescriptor);
        $this->assertEquals($targetIndicator->indicator_id, $autoResult->scoreDescriptor->indicator_id);
        $this->assertEquals($versionId, $autoResult->scoreDescriptor->standard_version_id);
        $this->assertEquals(0, $autoResult->scoreDescriptor->scoreLevel->score_value);

        // 4. اختبار حالة الرفض عند عدم وجود واصفة بدرجة 0 للمؤشر
        // إنشاء مؤشر تجريبي بدون أي واصفات
        $dummyIndicator = Indicator::create([
            'sub_standard_id' => $targetIndicator->sub_standard_id,
            'code'            => 'TEST-IND-NO-DESC',
            'name'            => 'مؤشر تجريبي بلا واصفات',
            'status'          => 'Active',
        ]);

        $fileDummy = UploadedFile::fake()->create('dummy.pdf', 100, 'application/pdf');
        $failRes = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$dummyIndicator->indicator_id}/evidences", [
            'title'         => 'شاهد مؤشر بلا واصفات',
            'description'   => 'اختبار رفض إنشاء النتيجة التلقائية',
            'evidence_type' => 'other',
            'file'          => $fileDummy,
        ]);

        $failRes->assertStatus(422)
            ->assertJsonPath('message', 'تعذر إنشاء النتيجة التلقائية لعدم وجود واصفة تقييم معتمدة للدرجة (0) لهذا المؤشر في هذا الإصدار المعياري.')
            ->assertJsonStructure(['errors' => ['descriptor']]);
    }

    /**
     * اختبار 23: التحقق من رفض رفع شاهد لمؤشر ينتمي لإصدار معياري مختلف عن إصدار دورة التقييم (422).
     */
    public function test_store_by_indicator_rejects_indicator_from_different_standard_version(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // إنشاء إصدار معياري آخر ومعيار ومؤشر تابع له
        $otherVersion = StandardVersion::create([
            'version_no'          => '2026.2-TEST',
            'source_organization' => 'وزارة التربية والتعليم',
            'status'              => 'Active',
            'issue_date'          => '2026-01-01',
        ]);

        $otherStandard = Standard::create([
            'version_id'    => $otherVersion->version_id,
            'code'          => 'STD-V2',
            'name'          => 'معيار الإصدار الثاني',
            'weight'        => 10.0,
            'display_order' => 99,
        ]);

        $otherSub = SubStandard::create([
            'standard_id'   => $otherStandard->standard_id,
            'code'          => 'SUB-V2',
            'name'          => 'مجال الإصدار الثاني',
            'display_order' => 1,
        ]);

        $otherIndicator = Indicator::create([
            'sub_standard_id' => $otherSub->sub_standard_id,
            'code'            => 'IND-V2-01',
            'name'            => 'مؤشر تابع للإصدار الثاني',
            'status'          => 'Active',
        ]);

        $file = UploadedFile::fake()->create('other_version.pdf', 100, 'application/pdf');
        $res = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$otherIndicator->indicator_id}/evidences", [
            'title'         => 'شاهد لمؤشر إصدار مختلف',
            'evidence_type' => 'report',
            'file'          => $file,
        ]);

        $res->assertStatus(422)
            ->assertJsonPath('message', 'المؤشر لا ينتمي للإصدار المعياري المعتمد لدورة التقييم.')
            ->assertJsonPath('errors.indicator.0', 'المؤشر لا ينتمي للإصدار المعياري المعتمد لدورة التقييم.');
    }

    /**
     * اختبار 24: التحقق من رفض ربط شاهد بمؤشر مستهدف ينتمي لإصدار معياري مختلف عن إصدار دورة التقييم (422).
     */
    public function test_link_indicator_rejects_target_indicator_from_different_standard_version(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $otherVersion = StandardVersion::create([
            'version_no'          => '2026.3-TEST',
            'source_organization' => 'وزارة التربية والتعليم',
            'status'              => 'Active',
            'issue_date'          => '2026-01-01',
        ]);

        $otherStandard = Standard::create([
            'version_id'    => $otherVersion->version_id,
            'code'          => 'STD-V3',
            'name'          => 'معيار الإصدار الثالث',
            'weight'        => 10.0,
            'display_order' => 99,
        ]);

        $otherSub = SubStandard::create([
            'standard_id'   => $otherStandard->standard_id,
            'code'          => 'SUB-V3',
            'name'          => 'مجال الإصدار الثالث',
            'display_order' => 1,
        ]);

        $otherIndicator = Indicator::create([
            'sub_standard_id' => $otherSub->sub_standard_id,
            'code'            => 'IND-V3-01',
            'name'            => 'مؤشر مستهدف بإصدار مختلف',
            'status'          => 'Active',
        ]);

        $res = $this->postJson("/api/v1/evidences/{$this->evidenceBelqees->evidence_id}/link-indicator", [
            'indicator_id' => $otherIndicator->indicator_id,
        ]);

        $res->assertStatus(422)
            ->assertJsonPath('message', 'المؤشر المستهدف لا ينتمي للإصدار المعياري المعتمد لدورة التقييم.')
            ->assertJsonPath('errors.indicator_id.0', 'المؤشر المستهدف لا ينتمي للإصدار المعياري المعتمد لدورة التقييم.');
    }

    /**
     * اختبار 25: مقارنة أرقام inventory و evidence-summary لنفس التقييم وتطابقها في الحالات الثلاث:
     * 1) مؤشر إلزامي بشاهد Draft (غير مستوفٍ في الاثنين، ونواقص متطابقة).
     * 2) مؤشر إلزامي بشاهد Completed (مستوفٍ في الاثنين بنسبة 100%).
     * 3) مؤشر غير إلزامي بلا شواهد (مستوفٍ في الاثنين ولا يُعد ناقصاً أبداً).
     */
    public function test_inventory_and_evidence_summary_metrics_match_strictly_across_all_three_cases(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // تنظيف الشواهد السابقة للتقييم
        $results = EvaluationResult::where('evaluation_id', $this->evaluationBelqees->evaluation_id)->get();
        foreach ($results as $r) {
            foreach ($r->evidences as $ev) {
                EvidenceVersion::where('evidence_id', $ev->evidence_id)->delete();
                $ev->delete();
            }
        }

        // اختيار مؤشر إلزامي أول: وضع شاهد Draft فقط
        $mandatoryInd1 = IndicatorEvidenceRequirement::where('required', true)->value('indicator_id');
        $this->assertNotNull($mandatoryInd1);
        $res1 = EvaluationResult::firstOrCreate(
            [
                'evaluation_id' => $this->evaluationBelqees->evaluation_id,
                'indicator_id'  => $mandatoryInd1,
            ],
            [
                'standard_version_id' => $this->standardVersion->version_id,
                'evaluator_user_id'   => $this->evaluatorBelqees->user_id,
                'score_descriptor_id' => 1,
                'score'               => 0,
                'completion_status'   => 'Pending',
            ]
        );

        $evDraft = Evidence::create([
            'result_id'     => $res1->result_id,
            'indicator_id'  => $mandatoryInd1,
            'title'         => 'شاهد مسودة غير معتمد',
            'status'        => 'Draft',
            'evidence_type' => 'report',
        ]);
        EvidenceVersion::create([
            'evidence_id' => $evDraft->evidence_id,
            'version_no'  => 1,
            'current'     => true,
        ]);

        // اختيار مؤشر إلزامي ثانٍ: استيفاء شواهده بالكامل بحالة Completed
        $mandatoryInd2 = IndicatorEvidenceRequirement::where('required', true)
            ->where('indicator_id', '!=', $mandatoryInd1)
            ->value('indicator_id');
        $this->assertNotNull($mandatoryInd2);

        $res2 = EvaluationResult::firstOrCreate(
            [
                'evaluation_id' => $this->evaluationBelqees->evaluation_id,
                'indicator_id'  => $mandatoryInd2,
            ],
            [
                'standard_version_id' => $this->standardVersion->version_id,
                'evaluator_user_id'   => $this->evaluatorBelqees->user_id,
                'score_descriptor_id' => 1,
                'score'               => 0,
                'completion_status'   => 'Pending',
            ]
        );

        $reqs2 = IndicatorEvidenceRequirement::where('indicator_id', $mandatoryInd2)->where('required', true)->get();
        foreach ($reqs2 as $req) {
            $evComp = Evidence::create([
                'result_id'     => $res2->result_id,
                'indicator_id'  => $mandatoryInd2,
                'title'         => 'شاهد مكتمل للمتطلب ' . $req->requirement_id,
                'status'        => 'Completed',
                'evidence_type' => 'plan',
            ]);
            EvidenceVersion::create([
                'evidence_id' => $evComp->evidence_id,
                'version_no'  => 1,
                'current'     => true,
            ]);
        }

        // اختيار مؤشر ثالث وجعله غير إلزامي بلا شواهد لاختبار الحالة 3
        $optionalInd = Indicator::where('status', 'Active')
            ->whereNotIn('indicator_id', [$mandatoryInd1, $mandatoryInd2])
            ->firstOrFail();

        IndicatorEvidenceRequirement::where('indicator_id', $optionalInd->indicator_id)
            ->update(['required' => false]);

        // 1. طلب الجرد التفصيلي inventory
        $invRes = $this->getJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/evidence-inventory");
        $invRes->assertStatus(200);
        $invData = $invRes->json('data');

        // 2. طلب ملخص وتقارير الشواهد evidence-summary
        $reportsService = app(ReportsAnalyticsService::class);
        $summaryData = $reportsService->calculateEvidenceSummary($this->evaluationBelqees);

        // التحقق من التطابق الإجمالي بين المصدرين
        $this->assertEquals($invData['summary']['totalIndicators'], $summaryData['total_indicators']);
        $this->assertEquals($invData['summary']['indicatorsWithSufficientEvidence'], $summaryData['indicators_complete_evidence']);
        $this->assertEquals($invData['summary']['indicatorsMissingEvidence'], $summaryData['indicators_missing_evidence']);
        $this->assertEquals($invData['summary']['totalValidEvidences'], $summaryData['total_valid_evidences']);
        $this->assertEquals($invData['summary']['totalDraftEvidences'], $summaryData['total_draft_evidences']);

        // فحص الحالة 1: مؤشر إلزامي بشاهد Draft
        $invInd1 = null;
        foreach ($invData['standards'] as $std) {
            foreach ($std['indicators'] as $i) {
                if ($i['indicatorId'] === $mandatoryInd1) {
                    $invInd1 = $i;
                    break 2;
                }
            }
        }
        $sumInd1 = null;
        foreach ($summaryData['standards'] as $std) {
            foreach ($std['indicators'] as $i) {
                if ($i['indicator_id'] === $mandatoryInd1) {
                    $sumInd1 = $i;
                    break 2;
                }
            }
        }
        $this->assertFalse($invInd1['isSufficient']);
        $this->assertEquals('Missing', $invInd1['status']);
        $this->assertEquals(1, $invInd1['draftEvidenceCount']);
        $this->assertEquals(0, $invInd1['validEvidenceCount']);

        $this->assertFalse($sumInd1['is_satisfied']);
        $this->assertEquals(0, $sumInd1['valid_count']);
        $this->assertEquals(1, $sumInd1['draft_count']);
        $this->assertGreaterThan(0, $sumInd1['missing_count']);

        // فحص الحالة 2: مؤشر إلزامي بشاهد Completed
        $invInd2 = null;
        foreach ($invData['standards'] as $std) {
            foreach ($std['indicators'] as $i) {
                if ($i['indicatorId'] === $mandatoryInd2) {
                    $invInd2 = $i;
                    break 2;
                }
            }
        }
        $sumInd2 = null;
        foreach ($summaryData['standards'] as $std) {
            foreach ($std['indicators'] as $i) {
                if ($i['indicator_id'] === $mandatoryInd2) {
                    $sumInd2 = $i;
                    break 2;
                }
            }
        }
        $this->assertTrue($invInd2['isSufficient']);
        $this->assertEquals('Completed', $invInd2['status']);
        $this->assertTrue($sumInd2['is_satisfied']);
        $this->assertEquals(0, $sumInd2['missing_count']);
        $this->assertEquals(100.0, $sumInd2['completion_rate']);

        // فحص الحالة 3: مؤشر غير إلزامي بلا شواهد
        $invInd3 = null;
        foreach ($invData['standards'] as $std) {
            foreach ($std['indicators'] as $i) {
                if ($i['indicatorId'] === $optionalInd->indicator_id) {
                    $invInd3 = $i;
                    break 2;
                }
            }
        }
        $sumInd3 = null;
        foreach ($summaryData['standards'] as $std) {
            foreach ($std['indicators'] as $i) {
                if ($i['indicator_id'] === $optionalInd->indicator_id) {
                    $sumInd3 = $i;
                    break 2;
                }
            }
        }
        $this->assertTrue($invInd3['isSufficient']);
        $this->assertEquals('NotRequired', $invInd3['status']);
        $this->assertTrue($sumInd3['is_satisfied']);
        $this->assertEquals(0, $sumInd3['missing_count']);
    }

    /**
     * اختبار 26: تنظيف وحذف النتيجة التلقائية المعلقة (Pending) عند نقل شاهده الوحيد إذا استوفت كافة شروط الحذف.
     */
    public function test_link_indicator_cleans_up_orphaned_pending_result_when_conditions_met(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // مؤشر أ بلا رصد وبلا شواهد سابقة
        $indicatorA = $this->secondIndicator;
        $indicatorB = $this->firstIndicator;

        EvaluationResult::where('evaluation_id', $this->evaluationBelqees->evaluation_id)
            ->where('indicator_id', $indicatorA->indicator_id)
            ->delete();

        // رفع شاهد لمؤشر أ -> ينشئ سجل EvaluationResult بحالة Pending تلقائياً
        $file = UploadedFile::fake()->create('isolated_ev.pdf', 100, 'application/pdf');
        $createRes = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$indicatorA->indicator_id}/evidences", [
            'title'         => 'شاهد مؤشر أ الوحيد',
            'evidence_type' => 'report',
            'file'          => $file,
        ]);
        $createRes->assertStatus(201);
        $evidenceId = $createRes->json('data.evidenceId');

        $resultA = EvaluationResult::where('evaluation_id', $this->evaluationBelqees->evaluation_id)
            ->where('indicator_id', $indicatorA->indicator_id)
            ->first();
        $this->assertNotNull($resultA);
        $this->assertEquals('Pending', $resultA->completion_status);
        $this->assertEquals(1, $resultA->evidences()->count());

        // نقل الشاهد من المؤشر أ إلى المؤشر ب
        $linkRes = $this->postJson("/api/v1/evidences/{$evidenceId}/link-indicator", [
            'indicator_id' => $indicatorB->indicator_id,
        ]);
        $linkRes->assertStatus(200);

        // التحقق من حذف النتيجة القديمة للمؤشر أ لأنها Pending وبلا شواهد وبلا ملاحظات
        $this->assertDatabaseMissing('evaluation_results', [
            'result_id'     => $resultA->result_id,
            'evaluation_id' => $this->evaluationBelqees->evaluation_id,
            'indicator_id'  => $indicatorA->indicator_id,
        ]);
    }

    /**
     * اختبار 27: عدم حذف النتيجة السابقة Pending عند نقل الشاهد إذا كانت تحتوي على ملاحظات تدقيقية (notes).
     */
    public function test_link_indicator_preserves_old_pending_result_if_it_contains_a_note(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $indicatorA = $this->secondIndicator;
        $indicatorB = $this->firstIndicator;

        EvaluationResult::where('evaluation_id', $this->evaluationBelqees->evaluation_id)
            ->where('indicator_id', $indicatorA->indicator_id)
            ->delete();

        // رفع شاهد لمؤشر أ
        $file = UploadedFile::fake()->create('note_ev.pdf', 100, 'application/pdf');
        $createRes = $this->postJson("/api/v1/evaluations/{$this->evaluationBelqees->evaluation_id}/indicators/{$indicatorA->indicator_id}/evidences", [
            'title'         => 'شاهد مؤشر أ مع ملاحظة',
            'evidence_type' => 'record',
            'file'          => $file,
        ]);
        $createRes->assertStatus(201);
        $evidenceId = $createRes->json('data.evidenceId');

        $resultA = EvaluationResult::where('evaluation_id', $this->evaluationBelqees->evaluation_id)
            ->where('indicator_id', $indicatorA->indicator_id)
            ->firstOrFail();

        // إضافة ملاحظة نصية على النتيجة أ
        Note::create([
            'result_id'      => $resultA->result_id,
            'author_user_id' => $this->evaluatorBelqees->user_id,
            'text'           => 'ملاحظة توثيقية تمنع حذف السجل',
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        // نقل الشاهد من المؤشر أ إلى المؤشر ب
        $linkRes = $this->postJson("/api/v1/evidences/{$evidenceId}/link-indicator", [
            'indicator_id' => $indicatorB->indicator_id,
        ]);
        $linkRes->assertStatus(200);

        // التحقق من بقاء النتيجة القديمة للمؤشر أ في قاعدة البيانات لوجود ملاحظة مسجلة عليها
        $this->assertDatabaseHas('evaluation_results', [
            'result_id'     => $resultA->result_id,
            'evaluation_id' => $this->evaluationBelqees->evaluation_id,
            'indicator_id'  => $indicatorA->indicator_id,
        ]);
    }

    /**
     * اختبار 28: احتساب completion_rate على مستوى المعيار والتقييم بحيث يقيد البسط بـ min(valid, required) لكل مؤشر.
     * مثال الاختبار: مؤشر يتطلب 2 وله 3 صالحة، ومؤشر يتطلب 2 وله 0؛ النسبة المتوقعة للمعيار 50% وليست 75%.
     * والتحقق من تطابق الرقم بين ReportsAnalyticsService و evidence-inventory.
     */
    public function test_completion_rate_caps_numerator_at_mandatory_count_per_indicator(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // إنشاء إصدار ودورة وتقييم مستقل لاختبار الحسبة بدقة
        $version = StandardVersion::create([
            'version_name'        => 'إصدار اختبار النسبة',
            'version_no'          => '2026.RATE-TEST',
            'source_organization' => 'وزارة التربية والتعليم',
            'issue_date'          => '2026-01-01',
            'status'              => 'Active',
        ]);

        $standard = Standard::create([
            'version_id'    => $version->version_id,
            'code'          => 'STD-RATE',
            'name'          => 'معيار اختبار النسبة',
            'weight'        => 10.0,
            'display_order' => 1,
        ]);

        $subStandard = \App\Models\SubStandard::create([
            'standard_id'   => $standard->standard_id,
            'code'          => 'SUB-RATE',
            'name'          => 'مجال اختبار النسبة',
            'weight'        => 10.0,
            'display_order' => 1,
        ]);

        $ind1 = Indicator::create([
            'sub_standard_id' => $subStandard->sub_standard_id,
            'code'            => 'IND-RATE-1',
            'name'            => 'مؤشر النسبة 1',
            'weight'          => 5.0,
            'display_order'   => 1,
            'status'          => 'Active',
        ]);

        $ind2 = Indicator::create([
            'sub_standard_id' => $subStandard->sub_standard_id,
            'code'            => 'IND-RATE-2',
            'name'            => 'مؤشر النسبة 2',
            'weight'          => 5.0,
            'display_order'   => 2,
            'status'          => 'Active',
        ]);

        // ربط متطلبين إلزاميين لكل مؤشر (المجموع المطلوب للمعيار = 4)
        for ($i = 1; $i <= 2; $i++) {
            IndicatorEvidenceRequirement::create([
                'indicator_id'        => $ind1->indicator_id,
                'standard_version_id' => $version->version_id,
                'title'               => "متطلب إلزامي {$i} للمؤشر 1",
                'required'            => true,
                'display_order'       => $i,
            ]);
            IndicatorEvidenceRequirement::create([
                'indicator_id'        => $ind2->indicator_id,
                'standard_version_id' => $version->version_id,
                'title'               => "متطلب إلزامي {$i} للمؤشر 2",
                'required'            => true,
                'display_order'       => $i,
            ]);
        }

        $cycle = EvaluationCycle::create([
            'academic_year'       => '2026-2027',
            'start_date'          => '2026-09-01',
            'end_date'            => '2027-06-30',
            'standard_version_id' => $version->version_id,
            'version_id'          => $version->version_id,
            'status'              => 'Active',
        ]);

        $evaluation = Evaluation::create([
            'school_id'          => $this->schoolBelqees->school_id,
            'cycle_id'           => $cycle->cycle_id,
            'created_by_user_id' => $this->evaluatorBelqees->user_id,
            'status'             => 'InProgress',
        ]);

        $level0 = \App\Models\ScoreLevel::create([
            'standard_version_id' => $version->version_id,
            'score_value'         => 0,
            'label'               => 'غير متحقق',
            'display_order'       => 1,
        ]);

        $desc1 = \App\Models\IndicatorScoreDescriptor::create([
            'indicator_id'        => $ind1->indicator_id,
            'standard_version_id' => $version->version_id,
            'score_level_id'      => $level0->score_level_id,
            'label'               => 'غير متحقق',
            'description'         => 'واصفة الصفر للمؤشر 1',
            'display_order'       => 1,
            'is_active'           => true,
        ]);

        // مؤشر 1: إنشاء نتيجة له وربط 3 شواهد صالحة (Completed) -> المطلوب 2 والصالح 3
        $result1 = EvaluationResult::create([
            'evaluation_id'       => $evaluation->evaluation_id,
            'indicator_id'        => $ind1->indicator_id,
            'score_descriptor_id' => $desc1->descriptor_id,
            'standard_version_id' => $version->version_id,
            'evaluator_user_id'   => $this->evaluatorBelqees->user_id,
            'score'               => 0,
            'completion_status'   => 'Pending',
        ]);

        for ($e = 1; $e <= 3; $e++) {
            Evidence::create([
                'result_id'      => $result1->result_id,
                'indicator_id'   => $ind1->indicator_id,
                'title'          => "شاهد صالح {$e} للمؤشر 1",
                'evidence_type'  => 'report',
                'status'         => 'Completed',
                'current_version'=> 1,
            ]);
        }

        // مؤشر 2: لا ننشئ له أي شواهد (المطلوب 2 والصالح 0)
        // الحسبة المتوقعة:
        // مؤشر 1: min(3, 2) = 2
        // مؤشر 2: min(0, 2) = 0
        // بسط المعيار = 2 + 0 = 2
        // مقام المعيار = 2 + 2 = 4
        // نسبة إكمال المعيار = (2 / 4) * 100 = 50.0% (وليست 75%)

        /** @var \App\Services\EvidenceSufficiencyService $sufficiencyService */
        $sufficiencyService = app(\App\Services\EvidenceSufficiencyService::class);
        $data = $sufficiencyService->evaluateEvaluation($evaluation);

        $stdData = collect($data['standards'])->firstWhere('standard_id', $standard->standard_id);
        $this->assertNotNull($stdData);
        $this->assertEquals(4, $stdData['mandatory_required_count']);
        $this->assertEquals(3, $stdData['valid_evidence_count']);
        $this->assertEquals(50.0, $stdData['completion_rate']); // 50% بدلاً من 75%
        $this->assertEquals(50.0, $data['overall_evidence_completion_rate']);

        // التحقق من مطابقة ReportsAnalyticsService لنفس الرقم (50.0%)
        /** @var \App\Services\ReportsAnalyticsService $reportsService */
        $reportsService = app(\App\Services\ReportsAnalyticsService::class);
        $summary = $reportsService->calculateEvidenceSummary($evaluation);
        $stdSummary = collect($summary['standards'])->firstWhere('standard_id', $standard->standard_id);
        $this->assertNotNull($stdSummary);
        $this->assertEquals(50.0, $stdSummary['completion_rate']);
        $this->assertEquals(50.0, $summary['overall_evidence_completion_rate']);

        // التحقق من استجابة مسار evidence-inventory وتطابق الرقم نفسه تماماً
        $invRes = $this->getJson("/api/v1/evaluations/{$evaluation->evaluation_id}/evidence-inventory");
        $invRes->assertStatus(200);
        $invStd = collect($invRes->json('data.standards'))->firstWhere('standardId', $standard->standard_id);
        $this->assertNotNull($invStd);
        $this->assertEquals(50.0, $invStd['completionRate']);
        $this->assertEquals(50.0, $invRes->json('data.overallEvidenceCompletionRate'));
    }

    /**
     * اختبار 29: رفض العمليات برمز 422 واستثناء عربي عند غياب إصدار الدورة المعياري (غياب ?? 1).
     */
    public function test_rejection_when_cycle_lacks_standard_version(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        // إنشاء دورة بدون إصدار معياري (version_id = 0)
        \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        $cycleWithoutVersion = EvaluationCycle::create([
            'academic_year'       => '2026-NO-VERSION',
            'start_date'          => '2026-09-01',
            'end_date'            => '2027-06-30',
            'standard_version_id' => null,
            'version_id'          => 0,
            'status'              => 'Active',
        ]);

        $evalWithoutVersion = Evaluation::create([
            'school_id'          => $this->schoolBelqees->school_id,
            'cycle_id'           => $cycleWithoutVersion->cycle_id,
            'created_by_user_id' => $this->evaluatorBelqees->user_id,
            'status'             => 'InProgress',
        ]);
        \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // 1. فحص مسار رفع الشاهد للمؤشر: يرفض 422 برسالة عربية واضحة
        $file = UploadedFile::fake()->create('no_version.pdf', 100, 'application/pdf');
        $storeRes = $this->postJson("/api/v1/evaluations/{$evalWithoutVersion->evaluation_id}/indicators/{$this->firstIndicator->indicator_id}/evidences", [
            'title'         => 'شاهد دورة بلا إصدار',
            'evidence_type' => 'report',
            'file'          => $file,
        ]);
        $storeRes->assertStatus(422)
            ->assertJsonValidationErrors(['cycle'])
            ->assertJsonPath('errors.cycle.0', 'دورة التقييم غير مرتبطة بإصدار معياري معتمد.');

        // 2. فحص مسار جرد الشواهد evidence-inventory: يرفض 422 برسالة عربية
        $invRes = $this->getJson("/api/v1/evaluations/{$evalWithoutVersion->evaluation_id}/evidence-inventory");
        $invRes->assertStatus(422)
            ->assertJsonValidationErrors(['cycle'])
            ->assertJsonPath('errors.cycle.0', 'دورة التقييم غير مرتبطة بإصدار معياري معتمد.');

        // 3. فحص استدعاء الخدمة المباشر EvidenceSufficiencyService: يرمي InvalidArgumentException بالعربية
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('دورة التقييم غير مرتبطة بإصدار معياري معتمد.');
        app(\App\Services\EvidenceSufficiencyService::class)->evaluateEvaluation($evalWithoutVersion);
    }
}
