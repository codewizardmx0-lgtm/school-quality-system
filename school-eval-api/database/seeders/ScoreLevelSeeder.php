<?php

namespace Database\Seeders;

use App\Models\ScoreLevel;
use App\Models\StandardVersion;
use Illuminate\Database\Seeder;

/**
 * Seeder: ScoreLevelSeeder
 * 
 * الوظيفة: تهيئة مستويات سلم التقدير الرباعي المعتمد (0، 1، 2، 3) المرتبطة بالإصدار النشط.
 * الجداول المغذاة: score_levels
 * مصدر البيانات: وثيقة سلم التقديرات وأداة التقييم المدرسي (الصفحة 2 - نص حرفي مطابق للوثيقة الرسمية).
 * ترتيب التنفيذ في DatabaseSeeder: الترتيب الثاني (2) بعد StandardVersionSeeder.
 */
class ScoreLevelSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // جلب الإصدار المرجعي النشط لربط مستويات التقدير به
        $version = StandardVersion::where('version_no', '2026.1')->firstOrFail();

        $levels = [
            [
                'score_value'         => 0,
                'label'               => 'غير متوفر',
                'general_description' => 'يشير إلى عدم قيام المدرسة بالأداءات المطلوبة منها، وهي بحاجة إلى مراجعة أدائها وتصحيح أخطائها.',
                'display_order'       => 1,
            ],
            [
                'score_value'         => 1,
                'label'               => 'متحقق بدرجة ضعيفة',
                'general_description' => 'يعبر عن قيام المدرسة بأداءات كتابية أو متحققة أحياناً، وبحاجة إلى بذل مجهود لاستكمال المؤشرات.',
                'display_order'       => 2,
            ],
            [
                'score_value'         => 2,
                'label'               => 'متحقق بدرجة متوسطة',
                'general_description' => 'يعبر عن قيام المدرسة بأداءات متحققة بصورة متوسطة الفاعلية مع وجود مجال للتحسين، وخطط للتحسين.',
                'display_order'       => 3,
            ],
            [
                'score_value'         => 3,
                'label'               => 'متحقق',
                'general_description' => 'المستوى الدال على وصول المؤسسة إلى المستوى المطلوب تحقيقه وبشكل مستمر ؛ بالإضافة إلى وجود خططاً لتحسين الجودة، كما يتم متابعة عمليات تنفيذ هذه الخطط ويتم رفع تقارير دورية عنها.',
                'display_order'       => 4,
            ],
        ];

        foreach ($levels as $level) {
            ScoreLevel::updateOrCreate(
                [
                    'standard_version_id' => $version->version_id,
                    'score_value'         => $level['score_value'],
                ],
                [
                    'label'               => $level['label'],
                    'general_description' => $level['general_description'],
                    'display_order'       => $level['display_order'],
                ]
            );
        }
    }
}
