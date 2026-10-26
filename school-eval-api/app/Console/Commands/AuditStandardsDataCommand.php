<?php

namespace App\Console\Commands;

use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\IndicatorScoreDescriptor;
use App\Models\ScoreLevel;
use App\Models\Standard;
use App\Models\SubStandard;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AuditStandardsDataCommand extends Command
{
    /**
     * اسم الأمر المستخدم في artisan.
     *
     * @var string
     */
    protected $signature = 'audit:standards-data {--json : إخراج النتائج بصيغة JSON}';

    /**
     * وصف الأمر.
     *
     * @var string
     */
    protected $description = 'تدقيق بيانات المعايير والمؤشرات والواصفات وأدوات التحقق ومتطلبات الشواهد في قاعدة البيانات';

    /**
     * تنفيذ أمر التدقيق.
     */
    public function handle(): int
    {
        $this->info('بدء تدقيق بيانات المعايير والمؤشرات...');

        // 1. أعداد الكيانات الأساسية
        $standardsTotal = Standard::count();
        $subStandardsTotal = SubStandard::count();
        $indicatorsTotal = Indicator::count();
        $indicatorsActive = Indicator::where('status', 'Active')->count();

        // 2. الواصفات
        $descriptorsTotal = IndicatorScoreDescriptor::count();
        $expectedDescriptors = 436; // 109 مؤشرات × 4 مستويات

        // 3. المؤشرات التي لا تحتوي على 4 واصفات بالضبط
        $indicatorsWithDescriptors = Indicator::with(['scoreDescriptors.scoreLevel'])->get();
        $abnormalDescriptorCounts = [];
        $emptyDescriptors = [];
        $duplicatedDescriptors = [];

        foreach ($indicatorsWithDescriptors as $indicator) {
            $descriptors = $indicator->scoreDescriptors;
            $count = $descriptors->count();

            if ($count !== 4) {
                $scoresPresent = $descriptors->map(fn($d) => $d->scoreLevel?->score_value)->filter(fn($v) => $v !== null)->values()->all();
                $abnormalDescriptorCounts[] = [
                    'code'          => $indicator->code,
                    'name'          => $indicator->name,
                    'actualCount'   => $count,
                    'scoresPresent' => $scoresPresent,
                ];
            }

            // فحص الواصفات الفارغة
            foreach ($descriptors as $desc) {
                $text = trim((string) $desc->description);
                if ($text === '') {
                    $emptyDescriptors[] = [
                        'code'        => $indicator->code,
                        'name'        => $indicator->name,
                        'scoreValue'  => $desc->scoreLevel?->score_value,
                        'descriptorId'=> $desc->descriptor_id,
                    ];
                }
            }

            // فحص التكرار النصي لنفس المؤشر بين مستويين مختلفين
            $texts = [];
            foreach ($descriptors as $desc) {
                $text = trim((string) $desc->description);
                if ($text === '') {
                    continue;
                }
                $scoreVal = $desc->scoreLevel?->score_value;
                if (isset($texts[$text])) {
                    $duplicatedDescriptors[] = [
                        'code'         => $indicator->code,
                        'name'         => $indicator->name,
                        'scoreLevel1'  => $texts[$text],
                        'scoreLevel2'  => $scoreVal,
                        'textSnippet'  => mb_substr($text, 0, 60) . '...',
                    ];
                } else {
                    $texts[$text] = $scoreVal;
                }
            }
        }

        // 4. المؤشرات بلا أدوات تحقق وبلا متطلبات شواهد
        $indicatorsWithoutTools = [];
        $indicatorsWithoutRequirements = [];

        $allIndicators = Indicator::withCount(['verificationTools', 'evidenceRequirements'])->get();
        foreach ($allIndicators as $ind) {
            if ($ind->verification_tools_count === 0) {
                $indicatorsWithoutTools[] = [
                    'code' => $ind->code,
                    'name' => $ind->name,
                ];
            }
            if ($ind->evidence_requirements_count === 0) {
                $indicatorsWithoutRequirements[] = [
                    'code' => $ind->code,
                    'name' => $ind->name,
                ];
            }
        }

        // 5. مطابقة تسميات المستويات الأربعة في score_levels مع ScoreLevelSeeder
        $expectedLevelLabels = [
            0 => 'غير متوفر',
            1 => 'متحقق بدرجة ضعيفة',
            2 => 'متحقق بدرجة متوسطة',
            3 => 'متحقق',
        ];

        $actualScoreLevels = ScoreLevel::orderBy('score_value')->get();
        $scoreLevelMismatches = [];
        foreach ($expectedLevelLabels as $scoreVal => $expectedLabel) {
            $actual = $actualScoreLevels->firstWhere('score_value', $scoreVal);
            if (!$actual) {
                $scoreLevelMismatches[] = [
                    'scoreValue' => $scoreVal,
                    'expected'   => $expectedLabel,
                    'actual'     => 'غير موجود',
                    'matches'    => false,
                ];
            } elseif ($actual->label !== $expectedLabel) {
                $scoreLevelMismatches[] = [
                    'scoreValue' => $scoreVal,
                    'expected'   => $expectedLabel,
                    'actual'     => $actual->label,
                    'matches'    => false,
                ];
            }
        }

        $auditData = [
            'counts' => [
                'standardsTotal'      => $standardsTotal,
                'subStandardsTotal'   => $subStandardsTotal,
                'indicatorsTotal'     => $indicatorsTotal,
                'indicatorsActive'    => $indicatorsActive,
                'descriptorsTotal'    => $descriptorsTotal,
                'descriptorsExpected' => $expectedDescriptors,
            ],
            'anomalies' => [
                'indicatorsWithout4Descriptors'    => $abnormalDescriptorCounts,
                'emptyDescriptors'                 => $emptyDescriptors,
                'duplicatedDescriptors'            => $duplicatedDescriptors,
                'indicatorsWithoutVerificationTools' => $indicatorsWithoutTools,
                'indicatorsWithoutEvidenceRequirements' => $indicatorsWithoutRequirements,
                'scoreLevelMismatches'             => $scoreLevelMismatches,
            ],
        ];

        if ($this->option('json')) {
            $this->line(json_encode($auditData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            return Command::SUCCESS;
        }

        // عرض النتائج المنسقة
        $this->newLine();
        $this->table(
            ['البيان', 'العدد الفعلي', 'العدد المتوقع', 'الحالة'],
            [
                ['المعايير الرئيسية', $standardsTotal, 7, $standardsTotal === 7 ? 'مطابق' : 'فارق'],
                ['المجالات الفرعية', $subStandardsTotal, 14, $subStandardsTotal === 14 ? 'مطابق' : 'فارق'],
                ['المؤشرات الكلية', $indicatorsTotal, 109, $indicatorsTotal === 109 ? 'مطابق' : 'فارق'],
                ['المؤشرات الفعالة (Active)', $indicatorsActive, 109, $indicatorsActive === 109 ? 'مطابق' : 'فارق'],
                ['الواصفات الكلية', $descriptorsTotal, $expectedDescriptors, $descriptorsTotal === $expectedDescriptors ? 'مطابق' : 'فارق'],
            ]
        );

        $this->newLine();
        $this->info("مؤشرات ليس لها 4 واصفات: " . count($abnormalDescriptorCounts));
        if (!empty($abnormalDescriptorCounts)) {
            $this->table(
                ['كود المؤشر', 'الاسم', 'عدد الواصفات', 'المستويات الموجودة'],
                array_map(fn($item) => [$item['code'], $item['name'], $item['actualCount'], implode(',', $item['scoresPresent'])], $abnormalDescriptorCounts)
            );
        }

        $this->info("واصفات فارغة: " . count($emptyDescriptors));
        if (!empty($emptyDescriptors)) {
            $this->table(
                ['كود المؤشر', 'الاسم', 'المستوى'],
                array_map(fn($item) => [$item['code'], $item['name'], $item['scoreValue']], $emptyDescriptors)
            );
        }

        $this->info("واصفات مكررة نصاً لنفس المؤشر: " . count($duplicatedDescriptors));
        if (!empty($duplicatedDescriptors)) {
            $this->table(
                ['كود المؤشر', 'الاسم', 'المستوى 1', 'المستوى 2', 'مقتطف النص'],
                array_map(fn($item) => [$item['code'], $item['name'], $item['scoreLevel1'], $item['scoreLevel2'], $item['textSnippet']], $duplicatedDescriptors)
            );
        }

        $this->info("مؤشرات بلا أدوات تحقق: " . count($indicatorsWithoutTools));
        if (!empty($indicatorsWithoutTools)) {
            $this->table(
                ['كود المؤشر', 'اسم المؤشر'],
                array_map(fn($item) => [$item['code'], $item['name']], $indicatorsWithoutTools)
            );
        }

        $this->info("مؤشرات بلا متطلبات شواهد: " . count($indicatorsWithoutRequirements));
        if (!empty($indicatorsWithoutRequirements)) {
            $this->table(
                ['كود المؤشر', 'اسم المؤشر'],
                array_map(fn($item) => [$item['code'], $item['name']], $indicatorsWithoutRequirements)
            );
        }

        $this->info("فحص تطابق تسميات score_levels مع ScoreLevelSeeder:");
        if (empty($scoreLevelMismatches)) {
            $this->line(" ✅ جميع تسميات المستويات (0، 1، 2، 3) مطابقة تماماً للمعتمد.");
        } else {
            $this->table(
                ['الدرجة', 'المتوقع', 'الفعلي'],
                array_map(fn($item) => [$item['scoreValue'], $item['expected'], $item['actual']], $scoreLevelMismatches)
            );
        }

        return Command::SUCCESS;
    }
}
