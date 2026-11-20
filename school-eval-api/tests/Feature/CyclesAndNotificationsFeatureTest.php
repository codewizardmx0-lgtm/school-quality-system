<?php

namespace Tests\Feature;

use App\Models\CycleParticipation;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\Notification;
use App\Models\School;
use App\Models\StandardVersion;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * اختبارات الميزة الشاملة للشريحة العاشرة (Slice 10):
 * إدارة وإطلاق دورات التقييم المركزية (G-24)، بدء ملفات التقييم الذاتي (G-26)،
 * منظومة الإشعارات والتنبيهات (FR-GEN-05)، واستعادة الحسابات وكلمات المرور (G-05).
 */
class CyclesAndNotificationsFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected User $evaluatorBelqees;
    protected User $evaluatorFarouq;
    protected User $principalBelqees;
    protected User $supervisorMinistry;
    protected User $standardsManager;
    protected User $adminUser;
    protected School $schoolBelqees;
    protected School $schoolFarouq;

    protected function setUp(): void
    {
        parent::setUp();

        $this->schoolBelqees = School::find(1) ?? School::firstOrFail();
        $this->schoolFarouq  = School::find(2) ?? School::where('school_id', '!=', $this->schoolBelqees->school_id)->firstOrFail();

        $this->evaluatorBelqees   = User::where('email', 'quality@belqees.edu.ye')->firstOrFail();
        $this->evaluatorFarouq    = User::where('email', 'quality@farouq.edu.ye')->firstOrFail();
        $this->principalBelqees   = User::where('email', 'principal@belqees.edu.ye')->firstOrFail();
        $this->supervisorMinistry = User::where('email', 'supervisor@moe.gov.ye')->firstOrFail();
        $this->standardsManager   = User::where('email', 'standards.manager@moe.gov.ye')->firstOrFail();
        $this->adminUser          = User::where('email', 'admin@school-eval.gov.ye')->firstOrFail();
    }

    /**
     * 1. المشرف الوزاري يطلق دورة تقييمية جديدة، ويربطها النظام تلقائياً بآخر إصدار معايير مُقرّ (G-24).
     */
    public function test_supervisor_can_launch_cycle_with_auto_bound_approved_standard_version(): void
    {
        Sanctum::actingAs($this->supervisorMinistry);

        // التأكد من وجود إصدار معايير مُقرّ
        $latestApproved = StandardVersion::whereIn('status', ['Approved', 'Active'])->latest('version_id')->first();
        $this->assertNotNull($latestApproved, 'يجب أن يوجد إصدار مُقرّ في قاعدة البيانات');

        // إغلاق الدورة القائمة للسماح بإطلاق دورة جديدة وفق ضابط منع التداخل (FR-SUP-01)
        EvaluationCycle::where('status', 'Active')->update(['status' => 'Closed']);

        $payload = [
            'name'               => 'الدورة التقييمية لعام 2026-2027',
            'academic_year'      => '2026/2027',
            'start_date'         => now()->subDays(5)->format('Y-m-d'),
            'end_date'           => now()->addMonths(6)->format('Y-m-d'),
            'enroll_all_schools' => true,
        ];

        $response = $this->postJson('/api/v1/evaluation-cycles', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.academicYear', '2026/2027')
            ->assertJsonPath('data.status', 'Active')
            ->assertJsonPath('data.versionId', $latestApproved->version_id);

        $cycleId = $response->json('data.cycleId');
        $this->assertDatabaseHas('evaluation_cycles', [
            'cycle_id'   => $cycleId,
            'version_id' => $latestApproved->version_id,
            'status'     => 'Active',
        ]);

        // التحقق من تسجيل المدارس وإشعار مديري ومقيمي المدارس
        $activeSchoolsCount = School::where('status', 'Active')->count();
        $this->assertEquals($activeSchoolsCount, CycleParticipation::where('cycle_id', $cycleId)->count());

        $this->assertDatabaseHas('notifications', [
            'type'                => 'cycle_launched',
            'related_entity_type' => 'evaluation_cycle',
            'related_entity_id'   => $cycleId,
        ]);
    }

    /**
     * 2. رفض إطلاق الدورة إذا لم يكن هناك أي إصدار معايير مُقرّ ونشط في النظام.
     */
    public function test_supervisor_cannot_launch_cycle_if_no_approved_version_exists(): void
    {
        Sanctum::actingAs($this->supervisorMinistry);

        // تعديل مؤقت لحالات الإصدارات لتكون مسودة أو مؤرشفة فقط وإغلاق الدورات القائمة
        StandardVersion::query()->update(['status' => 'Draft']);
        EvaluationCycle::where('status', 'Active')->update(['status' => 'Closed']);

        $payload = [
            'academic_year' => '2027/2028',
            'start_date'    => now()->format('Y-m-d'),
            'end_date'      => now()->addMonths(3)->format('Y-m-d'),
        ];

        $response = $this->postJson('/api/v1/evaluation-cycles', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['version']);
    }

    /**
     * 3. مسؤول النظام (admin) محظور قطعياً من إطلاق أو إدارة الدورات (BR-GEN-06 -> 403 Forbidden).
     */
    public function test_admin_is_strictly_forbidden_from_launching_or_managing_cycles(): void
    {
        Sanctum::actingAs($this->adminUser);

        $payload = [
            'academic_year' => '2026/2027',
            'start_date'    => now()->format('Y-m-d'),
            'end_date'      => now()->addMonths(3)->format('Y-m-d'),
        ];

        // محاولة إنشاء دورة من الأدمن
        $createResponse = $this->postJson('/api/v1/evaluation-cycles', $payload);
        $createResponse->assertStatus(403);

        // محاولة تعديل دورة من الأدمن
        $cycle = EvaluationCycle::first();
        if ($cycle) {
            $updateResponse = $this->patchJson("/api/v1/evaluation-cycles/{$cycle->cycle_id}", ['status' => 'Closed']);
            $updateResponse->assertStatus(403);

            $enrollResponse = $this->postJson("/api/v1/evaluation-cycles/{$cycle->cycle_id}/participations", [
                'school_ids' => [$this->schoolBelqees->school_id],
            ]);
            $enrollResponse->assertStatus(403);
        }
    }

    /**
     * 4. المشرف الوزاري يستطيع تحديث الدورة وإغلاقها.
     */
    public function test_supervisor_can_update_and_close_evaluation_cycle(): void
    {
        Sanctum::actingAs($this->supervisorMinistry);

        $approvedVersion = StandardVersion::whereIn('status', ['Approved', 'Active'])->firstOrFail();
        $cycle = EvaluationCycle::create([
            'name'          => 'دورة تجريبية للتحديث',
            'version_id'    => $approvedVersion->version_id,
            'academic_year' => '2025/2026',
            'start_date'    => now()->subDays(10),
            'end_date'      => now()->addDays(20),
            'status'        => 'Active',
        ]);

        $response = $this->patchJson("/api/v1/evaluation-cycles/{$cycle->cycle_id}", [
            'name'   => 'دورة تجريبية محدثة',
            'status' => 'Closed',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'دورة تجريبية محدثة')
            ->assertJsonPath('data.status', 'Closed');

        $this->assertDatabaseHas('evaluation_cycles', [
            'cycle_id' => $cycle->cycle_id,
            'status'   => 'Closed',
        ]);
    }

    /**
     * 5. المشرف الوزاري يستطيع تسجيل وإلحاق مدارس في الدورة.
     */
    public function test_supervisor_can_enroll_schools_in_cycle(): void
    {
        Sanctum::actingAs($this->supervisorMinistry);

        $approvedVersion = StandardVersion::whereIn('status', ['Approved', 'Active'])->firstOrFail();
        $cycle = EvaluationCycle::create([
            'name'          => 'دورة إلحاق المدارس',
            'version_id'    => $approvedVersion->version_id,
            'academic_year' => '2026/2027',
            'start_date'    => now()->subDays(5),
            'end_date'      => now()->addMonths(2),
            'status'        => 'Active',
        ]);

        $response = $this->postJson("/api/v1/evaluation-cycles/{$cycle->cycle_id}/participations", [
            'school_ids' => [$this->schoolBelqees->school_id, $this->schoolFarouq->school_id],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.enrolledCount', 2);

        $this->assertDatabaseHas('cycle_participations', [
            'cycle_id'  => $cycle->cycle_id,
            'school_id' => $this->schoolBelqees->school_id,
        ]);
        $this->assertDatabaseHas('cycle_participations', [
            'cycle_id'  => $cycle->cycle_id,
            'school_id' => $this->schoolFarouq->school_id,
        ]);
    }

    /**
     * 6. مقيّم المدرسة ينشئ ملف تقييم ذاتي جديد لمدرسته بنجاح (G-26).
     */
    public function test_school_evaluator_can_initiate_evaluation_in_active_participating_cycle(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $approvedVersion = StandardVersion::whereIn('status', ['Approved', 'Active'])->firstOrFail();
        $cycle = EvaluationCycle::create([
            'name'          => 'دورة بدء التقييم',
            'version_id'    => $approvedVersion->version_id,
            'academic_year' => '2026/2027',
            'start_date'    => now()->subDays(2),
            'end_date'      => now()->addMonths(4),
            'status'        => 'Active',
        ]);

        // تسجيل مدرسة بلقيس في الدورة
        CycleParticipation::create([
            'cycle_id'  => $cycle->cycle_id,
            'school_id' => $this->schoolBelqees->school_id,
        ]);

        $response = $this->postJson('/api/v1/evaluations', [
            'cycle_id' => $cycle->cycle_id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'InProgress')
            ->assertJsonPath('data.schoolId', $this->schoolBelqees->school_id)
            ->assertJsonPath('data.cycleId', $cycle->cycle_id);

        $evaluationId = $response->json('data.evaluationId');
        $this->assertDatabaseHas('evaluations', [
            'evaluation_id'      => $evaluationId,
            'cycle_id'           => $cycle->cycle_id,
            'school_id'          => $this->schoolBelqees->school_id,
            'created_by_user_id' => $this->evaluatorBelqees->user_id,
            'status'             => 'InProgress',
        ]);

        // التأكد من إرسال إشعار بدء التقييم للمدير والمشرفين
        $this->assertDatabaseHas('notifications', [
            'recipient_user_id'   => $this->principalBelqees->user_id,
            'type'                => 'evaluation_initiated',
            'related_entity_type' => 'evaluation',
            'related_entity_id'   => $evaluationId,
        ]);

        $this->assertDatabaseHas('notifications', [
            'recipient_user_id'   => $this->supervisorMinistry->user_id,
            'type'                => 'evaluation_initiated',
            'related_entity_type' => 'evaluation',
            'related_entity_id'   => $evaluationId,
        ]);
    }

    /**
     * 7. منع تكرار إنشاء أكثر من ملف تقييم واحد لنفس المدرسة في نفس الدورة (قيد الفرادة الصارم).
     */
    public function test_evaluator_cannot_initiate_duplicate_evaluation_in_same_cycle(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $approvedVersion = StandardVersion::whereIn('status', ['Approved', 'Active'])->firstOrFail();
        $cycle = EvaluationCycle::create([
            'name'          => 'دورة منع التكرار',
            'version_id'    => $approvedVersion->version_id,
            'academic_year' => '2026/2027',
            'start_date'    => now()->subDays(2),
            'end_date'      => now()->addMonths(4),
            'status'        => 'Active',
        ]);

        CycleParticipation::create([
            'cycle_id'  => $cycle->cycle_id,
            'school_id' => $this->schoolBelqees->school_id,
        ]);

        // التقييم الأول
        $firstResponse = $this->postJson('/api/v1/evaluations', ['cycle_id' => $cycle->cycle_id]);
        $firstResponse->assertStatus(201);

        // محاولة ثانية لنفس المدرسة والدورة
        $secondResponse = $this->postJson('/api/v1/evaluations', ['cycle_id' => $cycle->cycle_id]);
        $secondResponse->assertStatus(422)
            ->assertJsonValidationErrors(['cycle_id']);
    }

    /**
     * 8. رفض بدء التقييم إذا لم تكن المدرسة مسجلة في الدورة (غير مشاركة).
     */
    public function test_evaluator_cannot_initiate_evaluation_if_school_not_enrolled(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $approvedVersion = StandardVersion::whereIn('status', ['Approved', 'Active'])->firstOrFail();
        $cycle = EvaluationCycle::create([
            'name'          => 'دورة غير مسجلة بها المدرسة',
            'version_id'    => $approvedVersion->version_id,
            'academic_year' => '2026/2027',
            'start_date'    => now()->subDays(2),
            'end_date'      => now()->addMonths(4),
            'status'        => 'Active',
        ]);

        // لا نقوم بإنشاء CycleParticipation لمدرسة بلقيس

        $response = $this->postJson('/api/v1/evaluations', ['cycle_id' => $cycle->cycle_id]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['school_id']);
    }

    /**
     * 9. رفض بدء التقييم إذا كانت الدورة مغلقة أو منتهية الصلاحية الزمنية.
     */
    public function test_evaluator_cannot_initiate_evaluation_if_cycle_is_closed_or_out_of_bounds(): void
    {
        Sanctum::actingAs($this->evaluatorBelqees);

        $approvedVersion = StandardVersion::whereIn('status', ['Approved', 'Active'])->firstOrFail();

        // 1. دورة مغلقة
        $closedCycle = EvaluationCycle::create([
            'name'          => 'دورة مغلقة',
            'version_id'    => $approvedVersion->version_id,
            'academic_year' => '2026/2027',
            'start_date'    => now()->subDays(10),
            'end_date'      => now()->addMonths(1),
            'status'        => 'Closed',
        ]);
        CycleParticipation::create(['cycle_id' => $closedCycle->cycle_id, 'school_id' => $this->schoolBelqees->school_id]);

        $resClosed = $this->postJson('/api/v1/evaluations', ['cycle_id' => $closedCycle->cycle_id]);
        $resClosed->assertStatus(422)->assertJsonValidationErrors(['cycle_id']);

        // 2. دورة لم تبدأ بعد (تاريخ مستقبلي)
        $futureCycle = EvaluationCycle::create([
            'name'          => 'دورة مستقبلية',
            'version_id'    => $approvedVersion->version_id,
            'academic_year' => '2027/2028',
            'start_date'    => now()->addDays(10),
            'end_date'      => now()->addMonths(3),
            'status'        => 'Active',
        ]);
        CycleParticipation::create(['cycle_id' => $futureCycle->cycle_id, 'school_id' => $this->schoolBelqees->school_id]);

        $resFuture = $this->postJson('/api/v1/evaluations', ['cycle_id' => $futureCycle->cycle_id]);
        $resFuture->assertStatus(422)->assertJsonValidationErrors(['cycle_id']);
    }

    /**
     * 10. مسؤول النظام والمشرف الوزاري محظوران من بدء ملفات التقييم نيابة عن المدارس (403 Forbidden).
     */
    public function test_admin_and_supervisor_cannot_initiate_evaluation(): void
    {
        $approvedVersion = StandardVersion::whereIn('status', ['Approved', 'Active'])->firstOrFail();
        $cycle = EvaluationCycle::create([
            'name'          => 'دورة فحص الحظر',
            'version_id'    => $approvedVersion->version_id,
            'academic_year' => '2026/2027',
            'start_date'    => now()->subDays(1),
            'end_date'      => now()->addMonths(1),
            'status'        => 'Active',
        ]);

        // الأدمن
        Sanctum::actingAs($this->adminUser);
        $resAdmin = $this->postJson('/api/v1/evaluations', ['cycle_id' => $cycle->cycle_id]);
        $resAdmin->assertStatus(403);

        // المشرف الوزاري
        Sanctum::actingAs($this->supervisorMinistry);
        $resSup = $this->postJson('/api/v1/evaluations', ['cycle_id' => $cycle->cycle_id]);
        $resSup->assertStatus(403);
    }

    /**
     * 11. استعراض قائمة الدورات التقييمية وإرجاع سياق مدرسة المقيّم وإمكانية بدء التقييم canStartEvaluation.
     */
    public function test_evaluation_cycles_index_shows_school_context_metadata(): void
    {
        $approvedVersion = StandardVersion::whereIn('status', ['Approved', 'Active'])->firstOrFail();
        $cycle = EvaluationCycle::create([
            'name'          => 'دورة بيانات السياق',
            'version_id'    => $approvedVersion->version_id,
            'academic_year' => '2026/2027',
            'start_date'    => now()->subDays(1),
            'end_date'      => now()->addMonths(1),
            'status'        => 'Active',
        ]);

        CycleParticipation::create(['cycle_id' => $cycle->cycle_id, 'school_id' => $this->schoolBelqees->school_id]);

        Sanctum::actingAs($this->evaluatorBelqees);
        $res = $this->getJson('/api/v1/evaluation-cycles');

        $res->assertStatus(200);
        $item = collect($res->json('data'))->firstWhere('cycleId', $cycle->cycle_id);
        $this->assertNotNull($item);
        $this->assertTrue($item['schoolContext']['isEnrolled']);
        $this->assertTrue($item['schoolContext']['canStartEvaluation']);
        $this->assertNull($item['schoolContext']['evaluationId']);
    }

    /**
     * 12. استعراض إشعارات المستخدم والعدد غير المقروء مع العزل التام بين المستخدمين.
     */
    public function test_notification_listing_and_unread_count_with_strict_isolation(): void
    {
        // إشعار للمقيّم
        $notifEvaluator = Notification::create([
            'recipient_user_id'   => $this->evaluatorBelqees->user_id,
            'title'               => 'تنبيه خاص بالمقيّم',
            'message'             => 'محتوى التنبيه الخاص',
            'type'                => 'test_type',
            'related_entity_type' => 'school',
            'related_entity_id'   => $this->schoolBelqees->school_id,
            'is_read'             => false,
            'created_at'          => now(),
        ]);

        // إشعار لشخص آخر (مدير بلقيس)
        $notifPrincipal = Notification::create([
            'recipient_user_id'   => $this->principalBelqees->user_id,
            'title'               => 'تنبيه للمدير فقط',
            'message'             => 'محتوى التنبيه للمدير',
            'type'                => 'test_type',
            'related_entity_type' => 'school',
            'related_entity_id'   => $this->schoolBelqees->school_id,
            'is_read'             => false,
            'created_at'          => now(),
        ]);

        Sanctum::actingAs($this->evaluatorBelqees);

        // قائمة الإشعارات
        $res = $this->getJson('/api/v1/notifications');
        $res->assertStatus(200);

        $notifIds = collect($res->json('data'))->pluck('notificationId')->toArray();
        $this->assertContains($notifEvaluator->notification_id, $notifIds);
        $this->assertNotContains($notifPrincipal->notification_id, $notifIds);

        // عداد غير المقروء
        $countRes = $this->getJson('/api/v1/notifications/unread-count');
        $countRes->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, $countRes->json('data.unreadCount'));
    }

    /**
     * 13. تحديد إشعار محدد كمقروء وتحديد الكل كمقروء، مع عزل أمان يمنع قراءة إشعارات الغير (404).
     */
    public function test_mark_notification_as_read_and_mark_all_as_read(): void
    {
        $notif1 = Notification::create([
            'recipient_user_id'   => $this->evaluatorBelqees->user_id,
            'title'               => 'إشعار 1',
            'message'             => 'رسالة 1',
            'type'                => 'general',
            'related_entity_type' => 'school',
            'related_entity_id'   => $this->schoolBelqees->school_id,
            'is_read'             => false,
            'created_at'          => now(),
        ]);

        $notifOther = Notification::create([
            'recipient_user_id'   => $this->principalBelqees->user_id,
            'title'               => 'إشعار مستخدم آخر',
            'message'             => 'رسالة للغير',
            'type'                => 'general',
            'related_entity_type' => 'school',
            'related_entity_id'   => $this->schoolBelqees->school_id,
            'is_read'             => false,
            'created_at'          => now(),
        ]);

        Sanctum::actingAs($this->evaluatorBelqees);

        // 1. تحديد إشعار المستخدم كمقروء
        $readRes = $this->patchJson("/api/v1/notifications/{$notif1->notification_id}/read");
        $readRes->assertStatus(200)->assertJsonPath('data.isRead', true);
        $this->assertTrue((bool) $notif1->fresh()->is_read);
        $this->assertNotNull($notif1->fresh()->read_at);

        // 2. محاولة قراءة إشعار شخص آخر -> 404 (منع كشف وجود السجل)
        $readOtherRes = $this->patchJson("/api/v1/notifications/{$notifOther->notification_id}/read");
        $readOtherRes->assertStatus(404);

        // 3. تحديد الكل كمقروء للمستخدم الحالي
        Notification::create([
            'recipient_user_id'   => $this->evaluatorBelqees->user_id,
            'title'               => 'إشعار إضافي',
            'message'             => 'رسالة إضافية',
            'type'                => 'general',
            'related_entity_type' => 'school',
            'related_entity_id'   => $this->schoolBelqees->school_id,
            'is_read'             => false,
            'created_at'          => now(),
        ]);

        $markAllRes = $this->postJson('/api/v1/notifications/mark-all-read');
        $markAllRes->assertStatus(200);

        $unreadCount = Notification::where('recipient_user_id', $this->evaluatorBelqees->user_id)->where('is_read', false)->count();
        $this->assertEquals(0, $unreadCount);
    }

    /**
     * 14. تدفق استعادة كلمة المرور الناجح (G-05): طلب الرمز ثم إعادة التعيين والتحقق من كلمة المرور الجديدة.
     */
    public function test_password_forgot_and_reset_successful_flow(): void
    {
        $email = $this->evaluatorFarouq->email;

        // 1. طلب رمز الاستعادة
        $forgotRes = $this->postJson('/api/v1/auth/password/forgot', ['email' => $email]);
        $forgotRes->assertStatus(200);

        $resetToken = $forgotRes->json('data.resetToken');
        $this->assertNotEmpty($resetToken);
        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => $email,
        ]);

        // 2. إعادة تعيين كلمة المرور
        $newPassword = 'NewSecretPassword2026!';
        $resetRes = $this->postJson('/api/v1/auth/password/reset', [
            'email'                 => $email,
            'token'                 => $resetToken,
            'password'              => $newPassword,
            'password_confirmation' => $newPassword,
        ]);

        $resetRes->assertStatus(200)
            ->assertJsonPath('data.email', $email);

        // التأكد من حذف الرمز بعد استخدامه
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $email]);

        // التأكد من إمكانية تسجيل الدخول بكلمة المرور الجديدة
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'username' => $this->evaluatorFarouq->username,
            'password' => $newPassword,
        ]);
        $loginRes->assertStatus(200)->assertJsonStructure(['data' => ['token']]);
    }

    /**
     * 15. فشل إعادة تعيين كلمة المرور برمز غير صحيح أو منتهي الصلاحية زمنيًا.
     */
    public function test_password_reset_fails_with_invalid_or_expired_token(): void
    {
        $email = $this->evaluatorFarouq->email;

        // طلب رمز أولاً
        $this->postJson('/api/v1/auth/password/forgot', ['email' => $email]);

        // رمز خاطئ
        $resWrongToken = $this->postJson('/api/v1/auth/password/reset', [
            'email'                 => $email,
            'token'                 => 'invalid-token-string-123456',
            'password'              => 'AnotherSecret123!',
            'password_confirmation' => 'AnotherSecret123!',
        ]);
        $resWrongToken->assertStatus(422)->assertJsonValidationErrors(['token']);

        // محاكاة رمز منتهي الصلاحية (> 60 دقيقة)
        DB::table('password_reset_tokens')->where('email', $email)->update([
            'created_at' => now()->subMinutes(65),
        ]);

        $resExpired = $this->postJson('/api/v1/auth/password/reset', [
            'email'                 => $email,
            'token'                 => 'any-token',
            'password'              => 'AnotherSecret123!',
            'password_confirmation' => 'AnotherSecret123!',
        ]);
        $resExpired->assertStatus(422)->assertJsonValidationErrors(['token']);
    }

    /**
     * 16. تعديل الدورة النشطة مع التحقق من قفل تغيير الإصدار المعياري (BR-GEN-05).
     */
    public function test_supervisor_cannot_change_standard_version_on_active_cycle_update(): void
    {
        Sanctum::actingAs($this->supervisorMinistry);

        $cycle = EvaluationCycle::where('status', 'Active')->first() ?? EvaluationCycle::create([
            'name'          => 'دورة اختبار التعديل',
            'version_id'    => StandardVersion::first()->version_id,
            'academic_year' => '2026/2027',
            'start_date'    => now()->format('Y-m-d'),
            'end_date'      => now()->addMonths(3)->format('Y-m-d'),
            'status'        => 'Active',
        ]);

        // محاولة تعديل اسم الدورة وتمديد التاريخ بنجاح
        $newEndDate = now()->addMonths(4)->format('Y-m-d');
        $validUpdate = $this->patchJson("/api/v1/evaluation-cycles/{$cycle->cycle_id}", [
            'name'     => 'مسمى معدل للدورة التقييمية',
            'end_date' => $newEndDate,
        ]);
        $validUpdate->assertStatus(200)
            ->assertJsonPath('data.name', 'مسمى معدل للدورة التقييمية')
            ->assertJsonPath('data.endDate', $newEndDate);

        // محاولة تغيير الإصدار المعياري المرتبط بالدورة (يجب أن تُرفض بـ 422)
        $fakeOtherVersionId = $cycle->version_id + 999;
        $invalidUpdate = $this->patchJson("/api/v1/evaluation-cycles/{$cycle->cycle_id}", [
            'version_id' => $fakeOtherVersionId,
        ]);
        $invalidUpdate->assertStatus(422)
            ->assertJsonValidationErrors(['version_id']);
    }

    /**
     * 17. إغلاق الدورة وتحويلها إلى Closed وتجميد بوابة المقيم عن بدء تقييم جديد أو رفع المخرج.
     */
    public function test_closing_cycle_freezes_evaluator_submission_and_new_evaluation(): void
    {
        Sanctum::actingAs($this->supervisorMinistry);

        $cycle = EvaluationCycle::where('status', 'Active')->first() ?? EvaluationCycle::create([
            'name'          => 'دورة الإغلاق والتجميد',
            'version_id'    => StandardVersion::first()->version_id,
            'academic_year' => '2026/2027',
            'start_date'    => now()->subMonths(2)->format('Y-m-d'),
            'end_date'      => now()->addMonths(1)->format('Y-m-d'),
            'status'        => 'Active',
        ]);

        // إغلاق الدورة من قبل المشرف العام
        $closeRes = $this->patchJson("/api/v1/evaluation-cycles/{$cycle->cycle_id}", [
            'status' => 'Closed',
        ]);
        $closeRes->assertStatus(200)
            ->assertJsonPath('data.status', 'Closed');

        // التحقق من تجميد بدء تقييم جديد للمدرسة في الدورة المغلقة
        Sanctum::actingAs($this->evaluatorFarouq);
        $startRes = $this->postJson('/api/v1/evaluations', [
            'cycle_id' => $cycle->cycle_id,
        ]);
        $startRes->assertStatus(422)
            ->assertJsonValidationErrors(['cycle_id']);

        // التحقق من منع الرفع والتسليم النهائي للمخرج بعد إغلاق الدورة
        $eval = Evaluation::firstOrCreate([
            'school_id' => $this->schoolBelqees->school_id,
            'cycle_id'  => $cycle->cycle_id,
        ], [
            'created_by_user_id' => $this->evaluatorBelqees->user_id,
            'status'             => 'InProgress',
        ]);

        Sanctum::actingAs($this->evaluatorBelqees);
        $submitRes = $this->postJson("/api/v1/evaluations/{$eval->evaluation_id}/submit");
        $submitRes->assertStatus(422)
            ->assertJsonValidationErrors(['cycle']);
    }

    /**
     * 18. حظر المشرف الجغرافي المقيد بمحافظة من إطلاق أو تعديل أو إغلاق الدورات (403 Forbidden).
     */
    public function test_geographic_supervisor_forbidden_from_launching_editing_or_closing_cycles(): void
    {
        // تهيئة مشرف مقيد جغرافياً بمحافظة محددة
        $localSupervisor = User::create([
            'username'      => 'local_supervisor_taiz',
            'full_name'     => 'مشرف محلي تجريبي تعز',
            'email'         => 'supervisor.taiz@moe.gov.ye',
            'password_hash' => Hash::make('TestingEnv_Seed_Password_2026_Strict!'),
            'user_type'     => 'ministry',
            'ministry_id'   => \App\Models\Ministry::first()->ministry_id,
            'governorate'   => 'محافظة تعز',
            'status'        => 'Active',
        ]);
        $role = \App\Models\Role::where('role_name', 'ministry_supervisor')->firstOrFail();
        $localSupervisor->roles()->attach($role->role_id, ['assigned_at' => now(), 'active' => 1]);

        Sanctum::actingAs($localSupervisor);

        $cycle = EvaluationCycle::firstOrFail();

        // 1. حظر الإطلاق (403)
        $launchRes = $this->postJson('/api/v1/evaluation-cycles', [
            'academic_year' => '2026/2027',
            'start_date'    => now()->format('Y-m-d'),
            'end_date'      => now()->addMonths(3)->format('Y-m-d'),
        ]);
        $launchRes->assertStatus(403);

        // 2. حظر التعديل (403)
        $editRes = $this->patchJson("/api/v1/evaluation-cycles/{$cycle->cycle_id}", [
            'name' => 'تعديل غير مصرح به',
        ]);
        $editRes->assertStatus(403);

        // 3. حظر الإغلاق (403)
        $closeRes = $this->patchJson("/api/v1/evaluation-cycles/{$cycle->cycle_id}", [
            'status' => 'Closed',
        ]);
        $closeRes->assertStatus(403);
    }

    /**
     * 19. التحقق الذكي من عدم التداخل الجغرافي (Scope-Aware Conflict Check):
     * يسمح بإطلاق دورة نشطة لـ محافظة تعز بالتزامن مع وجود دورة نشطة لـ أمانة العاصمة،
     * ويرفض إطلاق دورة ثانية لنفس المحافظة أو دورة عامة متداخلة.
     */
    public function test_scope_aware_active_cycle_validation_allows_distinct_governorates_and_rejects_overlaps(): void
    {
        Sanctum::actingAs($this->supervisorMinistry);

        // إغلاق أي دورات سابقة لتهيئة بيئة الاختبار
        EvaluationCycle::where('status', 'Active')->update(['status' => 'Closed']);

        $version = StandardVersion::whereIn('status', ['Approved', 'Active'])->latest('version_id')->firstOrFail();

        // 1. إنشاء دورة نشطة لنطاق «أمانة العاصمة»
        $capitalCycle = EvaluationCycle::create([
            'name'              => 'دورة التقييم الذاتي - أمانة العاصمة',
            'version_id'        => $version->version_id,
            'academic_year'     => '2026/2027',
            'scope_governorate' => 'أمانة العاصمة',
            'start_date'        => now()->format('Y-m-d'),
            'end_date'          => now()->addMonths(3)->format('Y-m-d'),
            'status'            => 'Active',
        ]);

        // 2. إطلاق دورة نشطة لـ «محافظة تعز» -> يجب أن تنجح (201 Created) لعدم وجود تداخل جغرافي
        $taizRes = $this->postJson('/api/v1/evaluation-cycles', [
            'name'              => 'دورة التقييم الذاتي - محافظة تعز',
            'academic_year'     => '2026/2027',
            'scope_governorate' => 'محافظة تعز',
            'start_date'        => now()->format('Y-m-d'),
            'end_date'          => now()->addMonths(3)->format('Y-m-d'),
            'status'            => 'Active',
        ]);
        $taizRes->assertStatus(201);
        $this->assertDatabaseHas('evaluation_cycles', [
            'name'              => 'دورة التقييم الذاتي - محافظة تعز',
            'scope_governorate' => 'محافظة تعز',
            'status'            => 'Active',
        ]);

        // 3. محاولة إطلاق دورة نشطة ثانية لنفس نطاق «أمانة العاصمة» -> يجب أن تُرْفض (422)
        $capitalDuplicateRes = $this->postJson('/api/v1/evaluation-cycles', [
            'name'              => 'دورة مكررة لأمانة العاصمة',
            'academic_year'     => '2026/2027',
            'scope_governorate' => 'أمانة العاصمة',
            'start_date'        => now()->format('Y-m-d'),
            'end_date'          => now()->addMonths(3)->format('Y-m-d'),
            'status'            => 'Active',
        ]);
        $capitalDuplicateRes->assertStatus(422);

        // 4. محاولة إطلاق دورة عامة (scope_governorate = null) في ظل وجود دورات نشطة لمحافظات -> يجب أن تُرْفض (422)
        $generalDuplicateRes = $this->postJson('/api/v1/evaluation-cycles', [
            'name'              => 'دورة عامة متداخلة',
            'academic_year'     => '2026/2027',
            'scope_governorate' => null,
            'start_date'        => now()->format('Y-m-d'),
            'end_date'          => now()->addMonths(3)->format('Y-m-d'),
            'status'            => 'Active',
        ]);
        $generalDuplicateRes->assertStatus(422);
    }

    /**
     * 20. التحقق من خيار التحديد اليدوي للمدارس وضبط النطاق الجغرافي (الواجهة 28 & FR-SUP-01):
     * - يمنع الإطلاق اليدوي دون تحديد مدرسة واحدة على الأقل (422).
     * - يمنع اختيار مدارس تقع خارج النطاق الجغرافي المحدد للدورة (422).
     * - ينجح في تسجيل المدارس المحددة يدوياً المطابقة للنطاق الجغرافي (201).
     */
    public function test_manual_school_selection_and_governorate_scope_boundary_enforcement(): void
    {
        Sanctum::actingAs($this->supervisorMinistry);

        // إغلاق أي دورات سابقة
        EvaluationCycle::where('status', 'Active')->update(['status' => 'Closed']);

        // 1. محاولة إطلاق بتحديد يدوي دون إرسال أي مدارس -> 422
        $emptyRes = $this->postJson('/api/v1/evaluation-cycles', [
            'name'               => 'دورة تجريبية بدون مدارس',
            'academic_year'      => '2026/2027',
            'scope_governorate'  => 'أمانة العاصمة',
            'enroll_all_schools' => false,
            'school_ids'         => [],
            'start_date'         => now()->format('Y-m-d'),
            'end_date'           => now()->addMonths(2)->format('Y-m-d'),
            'status'             => 'Active',
        ]);
        $emptyRes->assertStatus(422);

        // 2. محاولة إطلاق لدورة أمانة العاصمة مع مدرسة تابعة لمحافظة تعز (المدرسة 6) -> 422
        $schoolTaiz = School::where('governorate', 'محافظة تعز')->first();
        if ($schoolTaiz) {
            $foreignRes = $this->postJson('/api/v1/evaluation-cycles', [
                'name'               => 'دورة تجريبية مع مدرسة خارج النطاق',
                'academic_year'      => '2026/2027',
                'scope_governorate'  => 'أمانة العاصمة',
                'enroll_all_schools' => false,
                'school_ids'         => [$schoolTaiz->school_id],
                'start_date'         => now()->format('Y-m-d'),
                'end_date'           => now()->addMonths(2)->format('Y-m-d'),
                'status'             => 'Active',
            ]);
            $foreignRes->assertStatus(422);
        }

        // 3. إطلاق ناجح بتحديد يدوي لمدارس تابعة لأمانة العاصمة حصراً (المدرسة 1 و 2) -> 201
        $capitalSchools = School::where('governorate', 'أمانة العاصمة')->take(2)->pluck('school_id')->toArray();
        $successRes = $this->postJson('/api/v1/evaluation-cycles', [
            'name'               => 'دورة مخصصة لمدارس محددة بأمانة العاصمة',
            'academic_year'      => '2026/2027',
            'scope_governorate'  => 'أمانة العاصمة',
            'enroll_all_schools' => false,
            'school_ids'         => $capitalSchools,
            'start_date'         => now()->format('Y-m-d'),
            'end_date'           => now()->addMonths(2)->format('Y-m-d'),
            'status'             => 'Active',
        ]);
        $successRes->assertStatus(201);

        $newCycleId = $successRes->json('data.cycleId') ?? $successRes->json('data.cycle_id');
        $this->assertNotNull($newCycleId);

        // التحقق من تسجيل المدارس المحددة فقط في جدول cycle_participations
        $enrolledCount = \App\Models\CycleParticipation::where('cycle_id', $newCycleId)->count();
        $this->assertEquals(count($capitalSchools), $enrolledCount);
    }
}
