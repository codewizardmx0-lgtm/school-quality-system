<?php

namespace Database\Seeders;

use App\Models\VerificationTool;
use Illuminate\Database\Seeder;

/**
 * Seeder: VerificationToolSeeder
 * 
 * الوظيفة: تهيئة أدوات التحقق وأساليب التقييم المعتمدة في استمارة التقييم المدرسي وسلم التقديرات.
 * الجداول المغذاة: verification_tools
 * مصدر البيانات: عمود «أداة التحقق من الأدلة / أسلوب التقييم» في وثائق المعايير الأصلية.
 * ترتيب التنفيذ في DatabaseSeeder: الترتيب الثالث (3).
 */
class VerificationToolSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tools = [
            [
                'name'        => 'فحص الوثائق',
                'tool_type'   => 'وثائق وسجلات',
                'description' => 'فحص ومراجعة الوثائق المكتوبة، والخطط التشغيلية والاستراتيجية، والسجلات والتقارير الرسمية للمدرسة.',
                'approved'    => true,
            ],
            [
                'name'        => 'الملاحظة',
                'tool_type'   => 'ميداني',
                'description' => 'الملاحظة المباشرة لواقع البيئة المدرسية، والمرافق، وسير الحصص الدراسية، وطابور الصباح، والأنشطة.',
                'approved'    => true,
            ],
            [
                'name'        => 'المقابلة',
                'tool_type'   => 'شخصي',
                'description' => 'المقابلات الفردية والجماعية مع القيادة المدرسية، والمعلمين، والمتعلمين، وأولياء الأمور والمجتمع.',
                'approved'    => true,
            ],
            [
                'name'        => 'تحليل المضمون',
                'tool_type'   => 'تحليلي',
                'description' => 'التحليل المعمق لمحتوى الخطط، ودفاتر التحضير، ونماذج التقييم الذاتي، وسجلات التحصيل ونتاجات التعلم.',
                'approved'    => true,
            ],
            [
                'name'        => 'استبانة',
                'tool_type'   => 'استبانة',
                'description' => 'استطلاعات الرأي والاستبانات المقننة الموجهة للمتعلمين والمعلمين وأولياء الأمور لقياس مستوى الرضا والخدمات.',
                'approved'    => true,
            ],
            [
                'name'        => 'بطاقة ملاحظة',
                'tool_type'   => 'ميداني مقنن',
                'description' => 'بطاقة ملاحظة ميدانية مقننة لمعاينة المبنى المدرسي، والمعامل، والمقصف، والمرافق الصحية، وتجهيزات السلامة.',
                'approved'    => true,
            ],
        ];

        foreach ($tools as $tool) {
            VerificationTool::updateOrCreate(
                ['name' => $tool['name']],
                [
                    'tool_type'   => $tool['tool_type'],
                    'description' => $tool['description'],
                    'approved'    => $tool['approved'],
                ]
            );
        }
    }
}
