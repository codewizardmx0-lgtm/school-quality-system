<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Seeder الرئيسي للنظام: DatabaseSeeder
 * 
 * الوظيفة: التنسيق المركزي لتنفيذ جميع الـ Seeders بالترتيب الصحيح الذي يحترم المفاتيح الأجنبية (FK Integrity).
 * النطاق: تغذية البيانات المرجعية الرسمية للمعايير الوطنية (109 مؤشرات و436 واصفاً)
 *         بالإضافة إلى البيانات الأساسية للهوية والصلاحيات والمدرسة والوزارة والدورة التقييمية.
 */
class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            // المجموعة الأولى: الإطار المرجعي للمعايير الوطنية (ERD-02)
            StandardVersionSeeder::class,               // 1. الإصدار المرجعي النشط
            ScoreLevelSeeder::class,                    // 2. مستويات التقدير (0 - 3)
            VerificationToolSeeder::class,              // 3. أدوات التحقق وأساليب التقييم
            StandardSeeder::class,                      // 4. المعايير السبعة بأوزانها
            SubStandardSeeder::class,                   // 5. المعايير الفرعية الـ 14
            IndicatorSeeder::class,                     // 6. المؤشرات الـ 109
            IndicatorScoreDescriptorSeeder::class,      // 7. واصفات الأداء الـ 436
            IndicatorEvidenceRequirementSeeder::class,  // 8. الشواهد والأدلة المطلوبة
            IndicatorVerificationMethodSeeder::class,   // 9. ربط المؤشرات بأدوات التحقق

            // المجموعة الثانية: الأدوار والصلاحيات والهوية (ERD-01)
            RoleSeeder::class,                          // 10. الأدوار الوظيفية
            PermissionSeeder::class,                    // 11. الصلاحيات
            RolePermissionSeeder::class,                // 12. ربط الأدوار بالصلاحيات
            MinistrySeeder::class,                      // 13. وزارة التربية والتعليم
            SchoolSeeder::class,                        // 14. المدرسة النموذجية
            UserSeeder::class,                          // 15. المستخدمون الأساسيون
            UserRoleSeeder::class,                      // 16. إسناد الأدوار للمستخدمين

            // المجموعة الثالثة: دورات التقييم والمشاركة (ERD-03)
            EvaluationCycleSeeder::class,               // 17. دورة التقييم للعام 2026
            CycleParticipationSeeder::class,            // 18. مشاركة المدرسة في الدورة

            // المجموعة الرابعة: إحصاءات ومرافق المدارس النموذجية (الشريحة 6)
            SchoolMetricsAndFacilitiesSeeder::class,     // 19. إحصاءات الكادر والطلاب والمرافق النموذجية
        ]);
    }
}
