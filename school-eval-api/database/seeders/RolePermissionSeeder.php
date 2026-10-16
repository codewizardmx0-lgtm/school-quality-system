<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\RolePermission;
use Illuminate\Database\Seeder;

/**
 * Seeder: RolePermissionSeeder
 * 
 * الوظيفة: ربط الصلاحيات بالأدوار الوظيفية الخمسة المعتمدة وفق مصفوفة الأدوار والصلاحيات الصارمة (Role × Permission Matrix).
 * الجداول المغذاة: role_permissions
 * مصدر البيانات: قاموس البيانات ومتطلبات الفصل الصارم بين مسؤوليات الأدوار.
 * 
 * مصفوفة الصلاحيات المعتمدة:
 *  - admin:
 *    [users.manage, schools.manage] (لا يملك أي صلاحيات تقييم أو إشراف أو تقارير)
 *  - school_evaluator:
 *    [standards.view, evaluations.create, evaluations.view, evaluations.edit, evaluations.submit,
 *     evidence.manage, reports.generate, reports.view, plans.manage, plans.view, ai.use]
 *  - school_principal:
 *    [standards.view, evaluations.view, reports.view, plans.view, reviews.write]
 *  - ministry_supervisor:
 *    [standards.view, evaluations.view, reports.view, supervision.review, completion.request,
 *     cycles.launch, analytics.view]
 *  - ministry_standards_manager:
 *    [standards.view, standards.manage]
 * 
 * ترتيب التنفيذ في DatabaseSeeder: الترتيب الثاني عشر (12).
 */
class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = Role::all()->keyBy('role_name');
        $permissions = Permission::all()->keyBy('permission_code');

        $rolePermissionsMap = [
            'admin' => [
                'users.manage',
                'schools.manage',
            ],
            'school_evaluator' => [
                'standards.view',
                'evaluations.create',
                'evaluations.view',
                'evaluations.edit',
                'evaluations.submit',
                'evidence.manage',
                'reports.generate',
                'reports.view',
                'plans.manage',
                'plans.view',
                'ai.use',
            ],
            'school_principal' => [
                'standards.view',
                'evaluations.view',
                'reports.view',
                'plans.view',
                'reviews.write',
            ],
            'ministry_supervisor' => [
                'standards.view',
                'evaluations.view',
                'reports.view',
                'supervision.review',
                'completion.request',
                'cycles.launch',
                'analytics.view',
            ],
            'ministry_standards_manager' => [
                'standards.view',
                'standards.manage',
            ],
        ];

        // 1. تنظيف أي ربط لأدوار غير معتمدة
        $validRoleIds = [];

        foreach ($rolePermissionsMap as $roleName => $permCodes) {
            $role = $roles[$roleName] ?? null;
            if (!$role) {
                continue;
            }

            $validRoleIds[] = $role->role_id;
            $validPermIds = [];

            foreach ($permCodes as $code) {
                $permission = $permissions[$code] ?? null;
                if ($permission) {
                    $validPermIds[] = $permission->permission_id;
                    RolePermission::firstOrCreate(
                        [
                            'role_id'       => $role->role_id,
                            'permission_id' => $permission->permission_id,
                        ],
                        [
                            'assigned_at'   => now(),
                        ]
                    );
                }
            }

            // إزالة أي صلاحيات سابقة غير مدرجة في المصفوفة لهذا الدور
            RolePermission::where('role_id', $role->role_id)
                ->whereNotIn('permission_id', $validPermIds)
                ->delete();
        }

        // إزالة أي سجلات لأدوار محذوفة أو غير موجودة في المصفوفة
        RolePermission::whereNotIn('role_id', $validRoleIds)->delete();
    }
}
