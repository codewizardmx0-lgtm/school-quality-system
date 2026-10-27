<?php

namespace Tests\Feature;

use App\Models\Attachment;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\Evidence;
use App\Models\EvidenceVersion;
use App\Models\Indicator;
use App\Models\IndicatorScoreDescriptor;
use App\Models\School;
use App\Models\StandardVersion;
use App\Models\User;
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
}
