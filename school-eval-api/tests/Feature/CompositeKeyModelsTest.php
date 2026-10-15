<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Models\Role;
use App\Models\Permission;
use App\Models\RolePermission;
use App\Models\User;
use App\Models\UserRole;
use App\Models\School;
use App\Models\EvaluationCycle;
use App\Models\CycleParticipation;
use App\Models\StandardVersion;
use App\Models\Standard;
use App\Models\SubStandard;
use App\Models\Indicator;
use App\Models\ImprovementPlan;
use App\Models\ImprovementArea;
use App\Models\PlanImprovementArea;
use App\Models\ImprovementAction;

class CompositeKeyModelsTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * اختبار جدول الربط ذو المفتاح المركب: role_permissions
     */
    public function test_role_permissions_composite_pivot_operations(): void
    {
        $role = Role::create([
            'role_name' => 'test_role_' . uniqid(),
            'description' => 'دور اختباري',
        ]);

        $permission = Permission::create([
            'permission_code' => 'test.perm.' . uniqid(),
            'permission_name' => 'صلاحية اختبارية',
            'description' => 'وصف اختباري',
        ]);

        // اختبار الربط عبر العلاقة
        $assignedAt = now()->format('Y-m-d H:i:s');
        $role->permissions()->attach($permission->permission_id, ['assigned_at' => $assignedAt]);

        $this->assertDatabaseHas('role_permissions', [
            'role_id' => $role->role_id,
            'permission_id' => $permission->permission_id,
        ]);

        // التحقق من الاستعلام المباشر عبر الموديل
        $pivot = RolePermission::where('role_id', $role->role_id)
            ->where('permission_id', $permission->permission_id)
            ->first();

        $this->assertNotNull($pivot);
        $this->assertEquals($role->role_id, $pivot->role->role_id);
        $this->assertEquals($permission->permission_id, $pivot->permission->permission_id);

        // اختبار الفك (Detach)
        $role->permissions()->detach($permission->permission_id);

        $this->assertDatabaseMissing('role_permissions', [
            'role_id' => $role->role_id,
            'permission_id' => $permission->permission_id,
        ]);
    }

    /**
     * اختبار جدول الربط ذو المفتاح المركب: user_roles
     */
    public function test_user_roles_composite_pivot_operations(): void
    {
        $role = Role::create([
            'role_name' => 'role_u_' . uniqid(),
            'description' => 'دور اختباري للمستخدم',
        ]);

        $user = User::create([
            'username' => 'test_user_' . uniqid(),
            'password_hash' => bcrypt('password123'),
            'full_name' => 'مستخدم اختباري',
            'email' => 'user_' . uniqid() . '@example.com',
            'user_type' => 'system',
            'status' => 'Active',
        ]);

        $assignedAt = now()->format('Y-m-d H:i:s');
        $user->roles()->attach($role->role_id, [
            'assigned_at' => $assignedAt,
            'revoked_at' => null,
            'active' => true,
        ]);

        $this->assertDatabaseHas('user_roles', [
            'user_id' => $user->user_id,
            'role_id' => $role->role_id,
            'active' => 1,
        ]);

        $pivot = UserRole::where('user_id', $user->user_id)
            ->where('role_id', $role->role_id)
            ->first();

        $this->assertNotNull($pivot);
        $this->assertTrue((bool)$pivot->active);
        $this->assertEquals($user->user_id, $pivot->user->user_id);
        $this->assertEquals($role->role_id, $pivot->role->role_id);

        // تحديث السجل المركب
        UserRole::where('user_id', $user->user_id)
            ->where('role_id', $role->role_id)
            ->update(['active' => false, 'revoked_at' => now()->format('Y-m-d H:i:s')]);

        $this->assertDatabaseHas('user_roles', [
            'user_id' => $user->user_id,
            'role_id' => $role->role_id,
            'active' => 0,
        ]);

        $user->roles()->detach($role->role_id);
        $this->assertDatabaseMissing('user_roles', [
            'user_id' => $user->user_id,
            'role_id' => $role->role_id,
        ]);
    }

    /**
     * اختبار جدول الربط ذو المفتاح المركب: cycle_participations
     */
    public function test_cycle_participations_composite_pivot_operations(): void
    {
        $version = StandardVersion::create([
            'version_no' => 'V_' . uniqid(),
            'issue_date' => '2026-01-01',
            'source_organization' => 'وزارة التربية',
            'status' => 'Active',
        ]);

        $cycle = EvaluationCycle::create([
            'version_id' => $version->version_id,
            'academic_year' => '2026/2027',
            'start_date' => '2026-09-01',
            'end_date' => '2027-06-30',
            'status' => 'Active',
        ]);

        $school = School::create([
            'school_name' => 'مدرسة اختبارية ' . uniqid(),
            'educational_stage' => 'Secondary',
            'educational_district' => 'الوسطى',
            'governorate' => 'العاصمة',
            'status' => 'Active',
        ]);

        // ربط المدرسة بالدورة
        $cycle->schools()->attach($school->school_id);

        $this->assertDatabaseHas('cycle_participations', [
            'cycle_id' => $cycle->cycle_id,
            'school_id' => $school->school_id,
        ]);

        $pivot = CycleParticipation::where('cycle_id', $cycle->cycle_id)
            ->where('school_id', $school->school_id)
            ->first();

        $this->assertNotNull($pivot);
        $this->assertEquals($cycle->cycle_id, $pivot->cycle->cycle_id);
        $this->assertEquals($school->school_id, $pivot->school->school_id);

        // التحقق من جلب المدارس من خلال الدورة
        $this->assertTrue($cycle->schools->contains($school->school_id));
        $this->assertTrue($school->cycles->contains($cycle->cycle_id));

        $cycle->schools()->detach($school->school_id);
        $this->assertDatabaseMissing('cycle_participations', [
            'cycle_id' => $cycle->cycle_id,
            'school_id' => $school->school_id,
        ]);
    }

    /**
     * اختبار جدول الربط والمفتاح المركب: plan_improvement_areas وعلاقة improvement_actions
     */
    public function test_plan_improvement_areas_and_composite_action_link(): void
    {
        $version = StandardVersion::create([
            'version_no' => 'V_' . uniqid(),
            'issue_date' => '2026-01-01',
            'source_organization' => 'وزارة التربية',
            'status' => 'Active',
        ]);

        $standard = Standard::create([
            'version_id' => $version->version_id,
            'code' => 'ST_01',
            'name' => 'معيار القيادة',
            'weight' => 20.00,
        ]);

        $subStandard = SubStandard::create([
            'standard_id' => $standard->standard_id,
            'code' => 'SUB_01',
            'name' => 'التخطيط الاستراتيجي',
        ]);

        $indicator = Indicator::create([
            'sub_standard_id' => $subStandard->sub_standard_id,
            'code' => 'IND_01',
            'name' => 'وضوح الرؤية والرسالة',
            'status' => 'Active',
        ]);

        $cycle = EvaluationCycle::create([
            'version_id' => $version->version_id,
            'academic_year' => '2026/2027',
            'start_date' => '2026-09-01',
            'end_date' => '2027-06-30',
            'status' => 'Active',
        ]);

        $school = School::create([
            'school_name' => 'مدرسة ' . uniqid(),
            'educational_stage' => 'Primary',
            'educational_district' => 'الشمال',
            'governorate' => 'العاصمة',
            'status' => 'Active',
        ]);

        $user = User::create([
            'username' => 'plan_creator_' . uniqid(),
            'password_hash' => bcrypt('password'),
            'full_name' => 'مدير تخطيط',
            'email' => 'creator_' . uniqid() . '@example.com',
            'user_type' => 'school',
            'school_id' => $school->school_id,
            'status' => 'Active',
        ]);

        $plan = ImprovementPlan::create([
            'cycle_id' => $cycle->cycle_id,
            'school_id' => $school->school_id,
            'created_by_user_id' => $user->user_id,
            'title' => 'خطة تحسين ' . uniqid(),
            'start_date' => '2026-10-01',
            'end_date' => '2027-05-01',
            'status' => 'Draft',
        ]);

        // إنشاء مجال تحسين مستند لمؤشر (مطابقة لقيد CHECK)
        $area = ImprovementArea::create([
            'name' => 'مجال تحسين اختباري ' . uniqid(),
            'priority' => 'High',
            'description' => 'وصف المجال',
            'indicator_id' => $indicator->indicator_id,
            'result_id' => null,
        ]);

        // ربط الخطة بالمجال عبر جدول الربط المركب
        $createdAt = now()->format('Y-m-d H:i:s');
        $plan->areas()->attach($area->area_id, ['created_at' => $createdAt]);

        $this->assertDatabaseHas('plan_improvement_areas', [
            'plan_id' => $plan->plan_id,
            'area_id' => $area->area_id,
        ]);

        // إنشاء إجراء تحسين مرتبط بالخطة والمجال معاً (FK مركب)
        $action = ImprovementAction::create([
            'plan_id' => $plan->plan_id,
            'area_id' => $area->area_id,
            'title' => 'إجراء تنفيذي محدد',
            'responsible_person_description' => 'منسق الجودة بالمدرسة',
            'start_date' => '2026-10-15',
            'due_date' => '2026-11-15',
            'status' => 'Pending',
        ]);

        $this->assertDatabaseHas('improvement_actions', [
            'action_id' => $action->action_id,
            'plan_id' => $plan->plan_id,
            'area_id' => $area->area_id,
        ]);

        $this->assertEquals($plan->plan_id, $action->plan->plan_id);
        $this->assertEquals($area->area_id, $action->area->area_id);
    }
}
