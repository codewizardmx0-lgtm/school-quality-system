<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Database\Seeder;

/**
 * Seeder: UserRoleSeeder
 * 
 * الوظيفة: إسناد الأدوار الوظيفية الخمسة المعتمدة للمستخدمين التجريبيين السبعة (تناظر تام بين المدرستين).
 * الجداول المغذاة: user_roles
 * 
 * التعيينات المعتمدة (دور واحد لكل مستخدم):
 *  - admin -> admin
 *  - principal_belqees -> school_principal
 *  - quality_belqees -> school_evaluator
 *  - principal_farouq -> school_principal
 *  - quality_farouq -> school_evaluator
 *  - supervisor_ministry -> ministry_supervisor
 *  - standards_manager_ministry -> ministry_standards_manager
 * 
 * ترتيب التنفيذ في DatabaseSeeder: الترتيب السادس عشر (16).
 */
class UserRoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $assignments = [
            ['username' => 'admin',                       'role_name' => 'admin'],
            ['username' => 'principal_belqees',           'role_name' => 'school_principal'],
            ['username' => 'quality_belqees',             'role_name' => 'school_evaluator'],
            ['username' => 'principal_farouq',            'role_name' => 'school_principal'],
            ['username' => 'quality_farouq',              'role_name' => 'school_evaluator'],
            ['username' => 'supervisor_ministry',         'role_name' => 'ministry_supervisor'],
            ['username' => 'standards_manager_ministry',  'role_name' => 'ministry_standards_manager'],
        ];

        $validUserRolePairs = [];

        foreach ($assignments as $assignment) {
            $user = User::where('username', $assignment['username'])->first();
            $role = Role::where('role_name', $assignment['role_name'])->first();

            if ($user && $role) {
                $validUserRolePairs[$user->user_id] = $role->role_id;

                UserRole::firstOrCreate(
                    [
                        'user_id' => $user->user_id,
                        'role_id' => $role->role_id,
                    ],
                    [
                        'assigned_at' => now(),
                        'revoked_at'  => null,
                        'active'      => true,
                    ]
                );
            }
        }

        // إزالة أي إسنادات إضافية أو قديمة لهؤلاء المستخدمين لضمان بقاء دور واحد فقط لكل مستخدم
        foreach ($validUserRolePairs as $userId => $roleId) {
            UserRole::where('user_id', $userId)
                ->where('role_id', '!=', $roleId)
                ->delete();
        }
    }
}
