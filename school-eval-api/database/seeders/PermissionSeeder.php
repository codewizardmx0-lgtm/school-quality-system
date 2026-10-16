<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

/**
 * Seeder: PermissionSeeder
 * 
 * الوظيفة: تهيئة الصلاحيات المحددة للوظائف والعمليات الرئيسية في النظام (19 صلاحية معتمدة).
 * الجداول المغذاة: permissions
 * مصدر البيانات: قاموس البيانات ومتطلبات إدارة الصلاحيات ومصفوفة الأدوار المعتمدة (ERD-01).
 * ترتيب التنفيذ في DatabaseSeeder: الترتيب الحادي عشر (11).
 */
class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            // ==========================================
            // الصلاحيات الأساسية السابقة (13 صلاحية)
            // ==========================================
            [
                'permission_code' => 'standards.view',
                'permission_name' => 'عرض المعايير والمؤشرات',
                'description'     => 'صلاحية استعراض الإطار المرجعي للمعايير والمؤشرات وواصفات الأداء',
            ],
            [
                'permission_code' => 'evaluations.create',
                'permission_name' => 'إنشاء تقييم مدرسي',
                'description'     => 'صلاحية فتح تقييم جديد للمدرسة ضمن دورة تقييمية نشطة',
            ],
            [
                'permission_code' => 'evaluations.view',
                'permission_name' => 'عرض التقييمات',
                'description'     => 'صلاحية استعراض التقييمات المدرسية ونتائجها',
            ],
            [
                'permission_code' => 'evaluations.edit',
                'permission_name' => 'رصد وتعديل نتائج التقييم',
                'description'     => 'صلاحية رصد درجات المؤشرات وإرفاق الشواهد وكتابة الملاحظات',
            ],
            [
                'permission_code' => 'evaluations.submit',
                'permission_name' => 'تقديم التقييم للاعتماد',
                'description'     => 'صلاحية رفع التقييم المكتمل وإرساله للمراجعة الإشرافية',
            ],
            [
                'permission_code' => 'reports.generate',
                'permission_name' => 'توليد تقارير التقييم',
                'description'     => 'صلاحية توليد تقارير الأداء ومسودات تقارير التقييم النهائي',
            ],
            [
                'permission_code' => 'reports.view',
                'permission_name' => 'عرض التقارير',
                'description'     => 'صلاحية استعراض وتنزيل التقارير الرسمية للتقييم',
            ],
            [
                'permission_code' => 'plans.manage',
                'permission_name' => 'إدارة خطط التحسين',
                'description'     => 'صلاحية إنشاء وتعديل ومتابعة خطط وإجراءات التحسين المدرسي',
            ],
            [
                'permission_code' => 'plans.view',
                'permission_name' => 'عرض خطط التحسين',
                'description'     => 'صلاحية استعراض خطط التحسين وإجراءاتها ومؤشراتها',
            ],
            [
                'permission_code' => 'supervision.review',
                'permission_name' => 'مراجعة وتقييم المشرف',
                'description'     => 'صلاحية مراجعة التقييمات وكتابة الملاحظات الإشرافية من الوزارة',
            ],
            [
                'permission_code' => 'completion.request',
                'permission_name' => 'إصدار طلبات استكمال',
                'description'     => 'صلاحية إصدار طلبات استكمال الشواهد والوثائق الناقصة للمدارس',
            ],
            [
                'permission_code' => 'users.manage',
                'permission_name' => 'إدارة المستخدمين',
                'description'     => 'صلاحية إنشاء وتعديل حسابات المستخدمين وتعيين الأدوار',
            ],
            [
                'permission_code' => 'schools.manage',
                'permission_name' => 'إدارة المدارس',
                'description'     => 'صلاحية إدارة بيانات المدارس والمراحل التعليمية',
            ],

            // ==========================================
            // الصلاحيات الجديدة المعتمدة (6 صلاحيات)
            // ==========================================
            [
                'permission_code' => 'standards.manage',
                'permission_name' => 'إدارة المعايير والمؤشرات',
                'description'     => 'صلاحية تعديل وإدارة إطار المعايير والمؤشرات والواصفات الرسمية',
            ],
            [
                'permission_code' => 'cycles.launch',
                'permission_name' => 'إطلاق دورات التقييم',
                'description'     => 'صلاحية فتح وإدارة دورات التقييم وتحديد فتراتها الزمنية بالوزارة',
            ],
            [
                'permission_code' => 'evidence.manage',
                'permission_name' => 'إدارة الشواهد والأدلة',
                'description'     => 'صلاحية رفع وإدارة إصدارات الشواهد والملفات المرفقة للتقييم',
            ],
            [
                'permission_code' => 'reviews.write',
                'permission_name' => 'تدوين المراجعات الداخلية',
                'description'     => 'صلاحية تدوين ملاحظات المراجعة الداخلية على التقارير المدرسية',
            ],
            [
                'permission_code' => 'ai.use',
                'permission_name' => 'استخدام أدوات الذكاء الاصطناعي',
                'description'     => 'صلاحية طلب تحليلات الذكاء الاصطناعي واستعراض التوصيات المقترحة',
            ],
            [
                'permission_code' => 'analytics.view',
                'permission_name' => 'عرض التحليلات والإحصاءات',
                'description'     => 'صلاحية استعراض لوحات البيانات والمؤشرات التحليلية الوزارية',
            ],
        ];

        foreach ($permissions as $perm) {
            Permission::updateOrCreate(
                ['permission_code' => $perm['permission_code']],
                [
                    'permission_name' => $perm['permission_name'],
                    'description'     => $perm['description'],
                ]
            );
        }
    }
}
