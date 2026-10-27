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
use App\Models\School;
use App\Models\StandardVersion;
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
}
