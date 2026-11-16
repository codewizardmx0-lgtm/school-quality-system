<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\Role;
use App\Models\School;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\SchoolMetricsAndFacilitiesSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SchoolAssignmentAndStrictLinkingTest extends TestCase
{
    use DatabaseTransactions;

    protected User $admin;
    protected School $school1;
    protected School $school2;
    protected Role $evaluatorRole;
    protected Role $principalRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(SchoolMetricsAndFacilitiesSeeder::class);

        $this->admin = User::where('username', 'admin')->firstOrFail();
        $this->school1 = School::firstOrFail();
        $this->school2 = School::where('school_id', '!=', $this->school1->school_id)->firstOrFail();

        $this->evaluatorRole = Role::where('role_name', 'school_evaluator')->firstOrFail();
        $this->principalRole = Role::where('role_name', 'school_principal')->firstOrFail();
    }

    protected function createEvaluator(string $name, ?int $schoolId = null): User
    {
        $user = User::create([
            'username' => 'ev_' . uniqid(),
            'full_name' => $name,
            'email' => 'ev_' . uniqid() . '@example.com',
            'password_hash' => bcrypt('Password123!'),
            'user_type' => 'school',
            'school_id' => $schoolId,
            'status' => 'Active',
        ]);

        UserRole::create([
            'user_id' => $user->user_id,
            'role_id' => $this->evaluatorRole->role_id,
            'assigned_at' => now(),
            'active' => true,
        ]);

        return $user;
    }

    protected function createPrincipal(string $name, ?int $schoolId = null): User
    {
        $user = User::create([
            'username' => 'pr_' . uniqid(),
            'full_name' => $name,
            'email' => 'pr_' . uniqid() . '@example.com',
            'password_hash' => bcrypt('Password123!'),
            'user_type' => 'school',
            'school_id' => $schoolId,
            'status' => 'Active',
        ]);

        UserRole::create([
            'user_id' => $user->user_id,
            'role_id' => $this->principalRole->role_id,
            'assigned_at' => now(),
            'active' => true,
        ]);

        return $user;
    }

    public function test_assign_evaluator_successfully_and_cache_updated(): void
    {
        Sanctum::actingAs($this->admin);

        $evaluator = $this->createEvaluator('مقيّم تجريبي 1');

        $res = $this->postJson("/api/v1/schools/{$this->school1->school_id}/assign-evaluator", [
            'userId' => $evaluator->user_id,
        ]);

        $res->assertStatus(200);
        $this->assertDatabaseHas('users', [
            'user_id' => $evaluator->user_id,
            'school_id' => $this->school1->school_id,
        ]);
    }

    public function test_prevent_assigning_evaluator_already_linked_to_another_school(): void
    {
        Sanctum::actingAs($this->admin);

        $evaluator = $this->createEvaluator('مقيّم مرتبط بمدرسة 1', $this->school1->school_id);

        // Attempt to assign to school2
        $res = $this->postJson("/api/v1/schools/{$this->school2->school_id}/assign-evaluator", [
            'userId' => $evaluator->user_id,
        ]);

        $res->assertStatus(422);
        $res->assertJsonStructure(['errors' => ['userId']]);
    }

    public function test_multiple_evaluators_can_be_assigned_to_same_school(): void
    {
        Sanctum::actingAs($this->admin);

        $ev1 = $this->createEvaluator('مقيّم 1 لنفس المدرسة');
        $ev2 = $this->createEvaluator('مقيّم 2 لنفس المدرسة');

        $this->postJson("/api/v1/schools/{$this->school1->school_id}/assign-evaluator", ['userId' => $ev1->user_id])
            ->assertStatus(200);
        $this->postJson("/api/v1/schools/{$this->school1->school_id}/assign-evaluator", ['userId' => $ev2->user_id])
            ->assertStatus(200);

        $evaluatorsCount = User::where('school_id', $this->school1->school_id)
            ->whereHas('roles', fn ($q) => $q->where('roles.role_name', 'school_evaluator'))
            ->count();

        $this->assertGreaterThanOrEqual(2, $evaluatorsCount);
    }

    public function test_prevent_unassigning_sole_evaluator_during_active_evaluation_cycle(): void
    {
        Sanctum::actingAs($this->admin);

        // Create standalone school with no prior evaluators
        $isolatedSchool = School::create([
            'identification_data' => 'TEST-ISO-' . uniqid(),
            'school_name' => 'مدرسة العزل الاختبارية',
            'educational_stage' => 'أساسي',
            'educational_district' => 'شعوب',
            'governorate' => 'أمانة العاصمة',
            'status' => 'Active',
            'school_type' => 'government',
        ]);

        $soleEvaluator = $this->createEvaluator('المقيم الوحيد', $isolatedSchool->school_id);

        $activeCycle = EvaluationCycle::where('status', 'Active')->first();
        if (!$activeCycle) {
            $activeCycle = EvaluationCycle::create([
                'cycle_name' => 'دورة تجريبية نشطة',
                'start_date' => now()->subMonth(),
                'end_date' => now()->addMonth(),
                'status' => 'Active',
            ]);
        }

        Evaluation::firstOrCreate([
            'school_id' => $isolatedSchool->school_id,
            'cycle_id' => $activeCycle->cycle_id,
        ], [
            'created_by_user_id' => $soleEvaluator->user_id,
            'status' => 'InProgress',
        ]);

        // Attempt to unassign sole evaluator
        $res = $this->postJson("/api/v1/schools/{$isolatedSchool->school_id}/unassign-evaluator", [
            'userId' => $soleEvaluator->user_id,
        ]);

        $res->assertStatus(422);
        $res->assertJsonPath('errors.userId.0', 'لا يمكن فك ارتباط المقيّم الوحيد للمدرسة أثناء وجود دورة تقييم نشطة.');
    }

    public function test_assign_principal_unassigns_previous_principal(): void
    {
        Sanctum::actingAs($this->admin);

        $oldPrincipal = $this->createPrincipal('المدير القديم', $this->school1->school_id);
        $newPrincipal = $this->createPrincipal('المدير الجديد', null);

        $res = $this->postJson("/api/v1/schools/{$this->school1->school_id}/assign-principal", [
            'userId' => $newPrincipal->user_id,
        ]);

        $res->assertStatus(200);

        // Previous principal must have school_id = null
        $this->assertDatabaseHas('users', [
            'user_id' => $oldPrincipal->user_id,
            'school_id' => null,
        ]);

        // New principal must have school_id = school1
        $this->assertDatabaseHas('users', [
            'user_id' => $newPrincipal->user_id,
            'school_id' => $this->school1->school_id,
        ]);
    }

    public function test_prevent_assigning_principal_linked_to_another_school(): void
    {
        Sanctum::actingAs($this->admin);

        $principalSchool2 = $this->createPrincipal('مدير المدرسة 2', $this->school2->school_id);

        $res = $this->postJson("/api/v1/schools/{$this->school1->school_id}/assign-principal", [
            'userId' => $principalSchool2->user_id,
        ]);

        $res->assertStatus(422);
        $res->assertJsonStructure(['errors' => ['userId']]);
    }

    public function test_school_type_and_role_name_arabic_in_resources(): void
    {
        Sanctum::actingAs($this->admin);

        // Create school with private type
        $res = $this->postJson('/api/v1/schools', [
            'schoolName' => 'مدرسة الرواد الأهلية الحديثة',
            'identificationData' => 'SCH-PVT-' . uniqid(),
            'educationalStage' => 'أساسي وثانوي (1-12)',
            'educationalDistrict' => 'السبعين',
            'governorate' => 'أمانة العاصمة',
            'schoolType' => 'private',
            'status' => 'Active',
        ]);

        $res->assertStatus(201);
        $res->assertJsonPath('data.schoolType', 'private');

        // Check user meta endpoint includes roleNameAr
        $metaRes = $this->getJson('/api/v1/users/meta');
        $metaRes->assertStatus(200);
        $roles = $metaRes->json('data.roles');
        $this->assertNotEmpty($roles);
        $this->assertArrayHasKey('roleNameAr', $roles[0]);
    }
}
