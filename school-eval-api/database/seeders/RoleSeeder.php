<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\RolePermission;
use App\Models\UserRole;
use Illuminate\Database\Seeder;

/**
 * Seeder: RoleSeeder
 * 
 * الوظيفة: تهيئة الأدوار الوظيفية الخمسة المعتمدة في النظام حصراً.
 * الجداول المغذاة: roles
 * مصدر البيانات: قاموس البيانات ومتطلبات إدارة الهوية والصلاحيات (ERD-01).
 * الأدوار الخمسة المعتمدة:
 *  1. admin - مدير النظام
 *  2. school_evaluator - مقيّم ومسؤول الجودة في المدرسة
 *  3. school_principal - مدير المدرسة / المراجع الداخلي
 *  4. ministry_standards_manager - مسؤول المعايير بالوزارة
 *  5. ministry_supervisor - المشرف والمراجع الوزاري
 * 
 * ترتيب التنفيذ في DatabaseSeeder: الترتيب العاشر (10).
 */
class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            [
                'role_name'   => 'admin',
                'description' => 'مدير النظام - إدارة المنصة والمستخدمين والمدارس فقط، بدون صلاحيات تقييم أو إشراف أو تقارير',
            ],
            [
                'role_name'   => 'school_evaluator',
                'description' => 'مقيّم ومسؤول الجودة بالمدرسة - تنفيذ التقييمات الذاتية وإدارة الشواهد وخطط التحسين وتوليد التقارير',
            ],
            [
                'role_name'   => 'school_principal',
                'description' => 'مدير المدرسة / المراجع الداخلي - استعراض التقييمات والخطط والتقارير وكتابة الملاحظات الداخلية',
            ],
            [
                'role_name'   => 'ministry_standards_manager',
                'description' => 'مسؤول المعايير بالوزارة - إدارة وتحديث الإطار المرجعي للمعايير والمؤشرات والواصفات',
            ],
            [
                'role_name'   => 'ministry_supervisor',
                'description' => 'المشرف والمراجع الوزاري - مراجعة التقييمات وإطلاق الدورات وإصدار طلبات الاستكمال والتحليلات',
            ],
        ];

        // 1. إنشاء أو تحديث الأدوار الخمسة المعتمدة
        $activeRoleIds = [];
        foreach ($roles as $roleData) {
            $role = Role::updateOrCreate(
                ['role_name' => $roleData['role_name']],
                ['description' => $roleData['description']]
            );
            $activeRoleIds[$roleData['role_name']] = $role->role_id;
        }

        // 2. ترحيل أي مستخدمين مسند لهم الدورين القديمين (quality_manager, evaluator) إلى school_evaluator
        $evaluatorRoleId = $activeRoleIds['school_evaluator'];
        $obsoleteRoles = Role::whereIn('role_name', ['quality_manager', 'evaluator'])->get();

        foreach ($obsoleteRoles as $oldRole) {
            $oldUserRoles = UserRole::where('role_id', $oldRole->role_id)->get();
            foreach ($oldUserRoles as $ur) {
                // نقل التعيين إلى school_evaluator
                UserRole::firstOrCreate(
                    [
                        'user_id' => $ur->user_id,
                        'role_id' => $evaluatorRoleId,
                    ],
                    [
                        'assigned_at' => $ur->assigned_at ?? now(),
                        'revoked_at'  => null,
                        'active'      => true,
                    ]
                );
            }
            // حذف سجلات user_roles للدور القديم
            UserRole::where('role_id', $oldRole->role_id)->delete();
            // حذف سجلات role_permissions للدور القديم
            RolePermission::where('role_id', $oldRole->role_id)->delete();
            // حذف الدور القديم نهائياً من جدول roles
            $oldRole->delete();
        }
    }
}
