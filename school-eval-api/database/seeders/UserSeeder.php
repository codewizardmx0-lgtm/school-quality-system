<?php

namespace Database\Seeders;

use App\Models\Ministry;
use App\Models\School;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeder: UserSeeder
 * 
 * الوظيفة: تهيئة المستخدمين الأساسيين للنظام لأغراض التطوير والعرض التجريبي (7 مستخدمين بأسماء وظيفية افتراضية).
 * الجداول المغذاة: users
 * 
 * ضوابط الأمان والبيئة:
 *  - محظور التشغيل قطعيًا خارج بيئتي local و testing عبر حارس برمجي صريح.
 *  - قراءة كلمة المرور إلزاميًا من متغير البيئة SEED_DEFAULT_PASSWORD دون أي قيمة افتراضية مدمجة بالكود (Fallback).
 *  - استخدام أسماء افتراضية وظيفية خالية تماماً من أي أسماء أشخاص حقيقيين.
 * 
 * ترتيب التنفيذ في DatabaseSeeder: الترتيب الخامس عشر (15).
 */
class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // حارس البيئة: منع التشغيل في أي بيئة غير محلية أو اختبارية
        if (!app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('UserSeeder is restricted to local and testing environments only.');
        }

        // قراءة كلمة المرور الإلزامية من متغير البيئة
        $defaultPassword = env('SEED_DEFAULT_PASSWORD');
        if (empty($defaultPassword)) {
            throw new \RuntimeException('Environment variable SEED_DEFAULT_PASSWORD must be defined for seeding users.');
        }

        $passwordHash = Hash::make($defaultPassword);

        // جلب معرفات المدارس والوزارة لربط المستخدمين وفق قاعدة التكامل المرجعي
        $schoolBelqees = School::where('identification_data', 'SCH-SANAA-2026-001')->firstOrFail();
        $schoolFarouq  = School::where('identification_data', 'SCH-TAIZ-2026-002')->firstOrFail();
        $ministry      = Ministry::where('ministry_name', 'وزارة التربية والتعليم والبحث العلمي')->firstOrFail();

        $users = [
            // 1. مدير النظام (System User - school_id و ministry_id فارغان)
            [
                'username'    => 'admin',
                'full_name'   => 'مدير النظام التجريبي',
                'email'       => 'admin@school-eval.gov.ye',
                'user_type'   => 'system',
                'school_id'   => null,
                'ministry_id' => null,
                'status'      => 'Active',
            ],

            // 2. مدير مدرسة بلقيس (School User - مرتبط بمدرسة بلقيس فقط)
            [
                'username'    => 'principal_belqees',
                'full_name'   => 'مدير تجريبي 1 — مدرسة بلقيس',
                'email'       => 'principal@belqees.edu.ye',
                'user_type'   => 'school',
                'school_id'   => $schoolBelqees->school_id,
                'ministry_id' => null,
                'status'      => 'Active',
            ],

            // 3. مسؤول تقييم مدرسة بلقيس (School User - مرتبط بمدرسة بلقيس فقط)
            [
                'username'    => 'quality_belqees',
                'full_name'   => 'مسؤول تقييم تجريبي 1 — مدرسة بلقيس',
                'email'       => 'quality@belqees.edu.ye',
                'user_type'   => 'school',
                'school_id'   => $schoolBelqees->school_id,
                'ministry_id' => null,
                'status'      => 'Active',
            ],

            // 4. مدير مدرسة الفاروق (School User - مرتبط بمدرسة الفاروق فقط)
            [
                'username'    => 'principal_farouq',
                'full_name'   => 'مدير تجريبي 2 — مدرسة الفاروق',
                'email'       => 'principal@farouq.edu.ye',
                'user_type'   => 'school',
                'school_id'   => $schoolFarouq->school_id,
                'ministry_id' => null,
                'status'      => 'Active',
            ],

            // 5. مسؤول تقييم مدرسة الفاروق (School User - مرتبط بمدرسة الفاروق فقط)
            [
                'username'    => 'quality_farouq',
                'full_name'   => 'مسؤول تقييم تجريبي 2 — مدرسة الفاروق',
                'email'       => 'quality@farouq.edu.ye',
                'user_type'   => 'school',
                'school_id'   => $schoolFarouq->school_id,
                'ministry_id' => null,
                'status'      => 'Active',
            ],

            // 6. المشرف والمراجع الوزاري (Ministry User - مرتبط بالوزارة فقط)
            [
                'username'    => 'supervisor_ministry',
                'full_name'   => 'مشرف وزاري تجريبي',
                'email'       => 'supervisor@moe.gov.ye',
                'user_type'   => 'ministry',
                'school_id'   => null,
                'ministry_id' => $ministry->ministry_id,
                'status'      => 'Active',
            ],

            // 7. مسؤول المعايير الوزارية (Ministry User - مرتبط بالوزارة فقط)
            [
                'username'    => 'standards_manager_ministry',
                'full_name'   => 'مسؤول معايير وزاري تجريبي',
                'email'       => 'standards.manager@moe.gov.ye',
                'user_type'   => 'ministry',
                'school_id'   => null,
                'ministry_id' => $ministry->ministry_id,
                'status'      => 'Active',
            ],
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['username' => $userData['username']],
                [
                    'full_name'     => $userData['full_name'],
                    'email'         => $userData['email'],
                    'password_hash' => $passwordHash,
                    'user_type'     => $userData['user_type'],
                    'school_id'     => $userData['school_id'],
                    'ministry_id'   => $userData['ministry_id'],
                    'status'        => $userData['status'],
                ]
            );
        }
    }
}
