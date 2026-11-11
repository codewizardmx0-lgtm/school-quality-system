<?php

namespace App\Services;

use App\Models\Evaluation;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\View;
use Mpdf\Config\ConfigVariables;
use Mpdf\Config\FontVariables;
use Mpdf\Mpdf;

/**
 * خدمة توليد بطاقة تقويم المدرسة الرسمية بصيغة PDF (EvaluationReportService) - الشريحة 9.
 *
 * المواصفات الفنية:
 * - مقاس A4 عمودي (Portrait) باتجاه RTL كامل ودعم الخطوط العربية الأصيل.
 * - الترويسة المعتمدة ببيانات المدرسة واللقطة الإحصائية المعتمدة.
 * - النتيجة الموزونة والتصنيف النوعي المحايد (متميز / جيد جداً / جيد / يحتاج إلى تطوير).
 * - جدول تفصيلي للمجالات السبعة مع الأوزان والدرجات والمساهمات الموزونة.
 * - ثلاث خانات توقيع رسمية: إعداد (المقيّم)، إقرار واطلاع (المدير)، مراجعة وتوثيق (المشرف).
 * - علامة مائية "مسودة تقييم غير مكتملة" للتقييمات غير المنتهية.
 */
class EvaluationReportService
{
    public function __construct(
        protected ReportsAnalyticsService $analyticsService,
        protected SchoolMetricsService $metricsService
    ) {}

    /**
     * توليد محتوى PDF لبطاقة تقويم المدرسة الرسمية.
     *
     * @param Evaluation $evaluation
     * @param User|null $requester
     * @return string بايتات ملف الـ PDF
     */
    public function generateEvaluationCardPdf(Evaluation $evaluation, ?User $requester = null): string
    {
        // 1. حساب النتائج الموزونة الشاملة
        $results = $this->analyticsService->calculateAssessmentResults($evaluation);
        $finalScore = (float) ($results['final_score'] ?? 0.0);

        // 2. تحديد التصنيف النوعي المحايد من الإعدادات
        $rating = $this->resolveRatingTier($finalScore);

        // 3. جلب السياق الإحصائي (اللقطة إن وجدت أو الحي)
        $context = $this->metricsService->calculateIndicatorsContext($evaluation);
        $summary = $context['summary'] ?? [];

        // 4. تجهيز بيانات العرض للـ Blade Template
        $school = $evaluation->school;
        $viewData = [
            'system_name'     => config('reports.system_name', 'نظام معايير الاعتماد المدرسي وجودة التعليم'),
            'evaluation'      => [
                'evaluation_id' => $evaluation->evaluation_id,
                'status'        => $evaluation->status,
                'created_at'    => $evaluation->created_at,
            ],
            'school'          => [
                'school_id'            => $school->school_id,
                'school_code'          => $school->school_code,
                'school_name'          => $school->school_name,
                'governorate'          => $school->governorate,
                'educational_district' => $school->educational_district,
                'educational_admin'    => $school->educational_admin,
                'educational_stage'    => $school->educational_stage,
                'building_type'        => $school->building_type,
                'shift_type'           => $school->shift_type,
                'total_area'           => $school->total_area,
            ],
            'cycle'           => [
                'cycle_id'      => $evaluation->cycle_id,
                'academic_year' => $evaluation->cycle?->academic_year ?? '2025/2026',
            ],
            'summary'         => $summary,
            'final_score'     => $finalScore,
            'rating'          => $rating,
            'standards'       => $results['standards'] ?? [],
            'report_date'     => Carbon::now()->format('Y-m-d H:i'),
        ];

        $html = View::make('reports.evaluation_card', $viewData)->render();

        // 5. تهيئة محرك mPDF وضبط الخط العربي المعتمد (Amiri) والاتجاه والعلامة المائية
        $defaultConfig = (new ConfigVariables())->getDefaults();
        $fontDirs = $defaultConfig['fontDir'];

        $defaultFontConfig = (new FontVariables())->getDefaults();
        $fontData = $defaultFontConfig['fontdata'];

        $customFontsDir = resource_path('fonts');
        $hasAmiri = file_exists($customFontsDir . '/Amiri-Regular.ttf');

        $mpdfConfig = [
            'mode'             => 'utf-8',
            'format'           => 'A4',
            'orientation'      => 'P',
            'margin_left'      => 10,
            'margin_right'     => 10,
            'margin_top'       => 10,
            'margin_bottom'    => 10,
            'margin_header'    => 5,
            'margin_footer'    => 5,
            'autoScriptToLang' => true,
            'autoArabic'       => true,
            'autoLangToFont'   => true,
            'default_font'     => $hasAmiri ? 'amiri' : 'dejavusans',
            'tempDir'          => storage_path('app/temp-mpdf'),
        ];

        if ($hasAmiri) {
            $mpdfConfig['fontDir'] = array_merge($fontDirs, [$customFontsDir]);
            $mpdfConfig['fontdata'] = $fontData + [
                'amiri' => [
                    'R' => 'Amiri-Regular.ttf',
                    'B' => 'Amiri-Bold.ttf',
                ],
            ];
        }

        $mpdf = new Mpdf($mpdfConfig);

        $mpdf->SetDirectionality('rtl');
        $mpdf->SetTitle('بطاقة تقويم المدرسة الرسمية - ' . $school->school_name);
        $mpdf->SetAuthor(config('reports.system_name'));

        // إذا لم يكن التقييم مكتملاً ومقفلاً، نضع علامة مائية صريحة
        if ($evaluation->status !== 'Completed') {
            $mpdf->SetWatermarkText('مسودة تقييم غير مكتملة');
            $mpdf->showWatermarkText = true;
            $mpdf->watermarkTextAlpha = 0.12;
        }

        $mpdf->WriteHTML($html);

        return $mpdf->Output('', 'S');
    }

    /**
     * استخراج شارة وبيانات التصنيف النوعي المحايد بناءً على النسبة المئوية الموزونة.
     *
     * @param float $finalScore
     * @return array<string, mixed>
     */
    public function resolveRatingTier(float $finalScore): array
    {
        $tiers = config('reports.rating_tiers', []);

        foreach ($tiers as $tier) {
            if ($finalScore >= (float) $tier['min_score']) {
                return $tier;
            }
        }

        return [
            'code'        => 'needs_improvement',
            'label'       => 'يحتاج إلى تطوير',
            'color'       => '#ef4444',
            'description' => 'المدرسة تواجه فجوات جوهرية في المعايير وتستلزم تدخلاً تطويرياً عاجلاً.',
        ];
    }

    /**
     * تجهيز مصفوفة بيانات استمارة التقرير المفصلة (Detailed Dossier).
     *
     * @param Evaluation $evaluation
     * @return array<string, mixed>
     */
    public function buildDetailedDossierViewData(Evaluation $evaluation): array
    {
        // 1. حساب النتائج الموزونة والتقييم النوعي
        $results = $this->analyticsService->calculateAssessmentResults($evaluation);
        $finalScore = (float) ($results['final_score'] ?? 0.0);
        $rating = $this->resolveRatingTier($finalScore);

        // 2. تحميل النتائج المسجلة في هذا التقييم
        $allResults = \App\Models\EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
            ->get()
            ->keyBy('indicator_id');

        // 3. بناء إحصائيات توزيع المستويات الأربعة
        $scoreDistribution = [
            3 => 0,
            2 => 0,
            1 => 0,
            0 => 0,
        ];
        $totalEarnedPoints = 0.0;
        $scoredCount = 0;

        foreach ($allResults as $res) {
            if ($res->score !== null && in_array((int)$res->score, [0, 1, 2, 3], true)) {
                $scoreDistribution[(int)$res->score]++;
                $totalEarnedPoints += (float)$res->score;
                $scoredCount++;
            }
        }

        // 4. استرجاع الشجرة المعيارية الكاملة والمؤشرات الـ 109 وشواهدها
        $versionId = $evaluation->cycle?->version_id;
        $standards = \App\Models\Standard::query()
            ->when($versionId, fn($q) => $q->where('version_id', $versionId))
            ->with([
                'subStandards.indicators.verificationTools',
                'subStandards.indicators.evidenceLinks' => fn($q) => $q->where('evaluation_id', $evaluation->evaluation_id)->with('documentVersion.document'),
            ])
            ->orderBy('standard_id')
            ->get();

        $totalIndicatorsCount = 0;
        $totalEvidenceCount = 0;
        $standardsTree = [];
        $standardsSummary = [];

        foreach ($standards as $std) {
            $stdIndicatorsCount = 0;
            $stdScoredCount = 0;
            $stdPoints = 0.0;
            $stdEvidenceCount = 0;
            $subStandardsData = [];

            foreach ($std->subStandards as $sub) {
                $indicatorsData = [];

                foreach ($sub->indicators as $ind) {
                    $totalIndicatorsCount++;
                    $stdIndicatorsCount++;

                    $result = $allResults->get($ind->indicator_id);
                    $score = $result ? ($result->score !== null ? (int)$result->score : null) : null;
                    if ($score !== null) {
                        $stdScoredCount++;
                        $stdPoints += $score;
                    }

                    $evidenceLinks = $ind->evidenceLinks ?? collect();
                    $evidenceCount = $evidenceLinks->count();
                    $totalEvidenceCount += $evidenceCount;
                    $stdEvidenceCount += $evidenceCount;

                    $evidenceTitles = $evidenceLinks->map(function ($link) {
                        return $link->documentVersion?->document?->title
                            ?? $link->documentVersion?->file_name
                            ?? 'مستند بدون اسم';
                    })->filter()->values()->all();

                    $tools = $ind->verificationTools->pluck('name')->filter()->values()->all();

                    $indicatorsData[] = [
                        'indicator_id'        => $ind->indicator_id,
                        'indicator_code'      => $ind->code,
                        'indicator_name'      => $ind->name,
                        'verification_tools'  => $tools,
                        'score'               => $score,
                        'evidence_count'      => $evidenceCount,
                        'evidence_titles'     => $evidenceTitles,
                        'notes'               => $result?->textual_result,
                    ];
                }

                $subStandardsData[] = [
                    'sub_standard_id'   => $sub->sub_standard_id,
                    'sub_standard_code' => $sub->code,
                    'sub_standard_name' => $sub->name,
                    'indicators'        => $indicatorsData,
                ];
            }

            $stdAvg = $stdScoredCount > 0 ? round($stdPoints / $stdScoredCount, 2) : 0.0;
            $stdComp = $stdIndicatorsCount > 0 ? round(($stdScoredCount / $stdIndicatorsCount) * 100, 1) : 0.0;
            $stdWeight = (float) $std->weight;
            $weightedContrib = ($stdAvg / 3.0) * $stdWeight;

            $standardsSummary[] = [
                'standard_id'           => $std->standard_id,
                'standard_code'         => $std->code,
                'standard_name'         => $std->name,
                'weight'                => $stdWeight,
                'average_score'         => $stdAvg,
                'completion_rate'       => $stdComp,
                'weighted_contribution' => round($weightedContrib, 1),
                'evidence_count'        => $stdEvidenceCount,
            ];

            $standardsTree[] = [
                'standard_id'   => $std->standard_id,
                'standard_code' => $std->code,
                'standard_name' => $std->name,
                'weight'        => $stdWeight,
                'sub_standards' => $subStandardsData,
            ];
        }

        $completionRate = $totalIndicatorsCount > 0 ? round(($scoredCount / $totalIndicatorsCount) * 100, 1) : 0.0;
        $avgScoreOutOf3 = $scoredCount > 0 ? round($totalEarnedPoints / $scoredCount, 2) : 0.0;

        $school = $evaluation->school;

        $uniqueDocumentsCount = \App\Models\SchoolDocument::where('school_id', $evaluation->school_id)->count();
        $requirementsTarget = \App\Models\IndicatorEvidenceRequirement::count() ?: 278;

        return [
            'system_name'            => config('reports.system_name', 'نظام إدارة الجودة والتقويم والاعتماد المدرسي - منصة ارتقاء'),
            'school'                 => [
                'school_id'            => $school->school_id,
                'school_code'          => $school->school_code ?? ('SCH-' . $school->school_id),
                'school_name'          => $school->school_name,
                'governorate'          => $school->governorate ?? 'أمانة العاصمة',
                'educational_district' => $school->educational_district ?? 'معين',
                'educational_stage'    => $school->educational_stage ?? 'أساسي وثانوي',
                'school_type'          => $school->school_type === 'private' ? 'أهلي' : 'حكومي',
            ],
            'evaluation'             => [
                'evaluation_id' => $evaluation->evaluation_id,
                'status'        => $evaluation->status,
                'created_at'    => $evaluation->created_at,
            ],
            'cycle'                  => [
                'cycle_name'    => $evaluation->cycle?->name ?? 'الدورة الوطنية للتقويم المدرسي',
                'academic_year' => $evaluation->cycle?->academic_year ?? '2026/2027',
            ],
            'final_score'            => $finalScore,
            'rating'                 => $rating,
            'completion_rate'        => $completionRate,
            'scored_indicators_count'=> $scoredCount,
            'total_indicators_count' => $totalIndicatorsCount,
            'total_evidence_count'   => $totalEvidenceCount,
            'unique_documents_count' => $uniqueDocumentsCount,
            'requirements_target'    => $requirementsTarget,
            'average_score_out_of_3' => $avgScoreOutOf3,
            'scoreDistribution'      => $scoreDistribution,
            'standards_summary'      => $standardsSummary,
            'standards_tree'         => $standardsTree,
            'report_date'            => Carbon::now()->format('Y-m-d H:i'),
        ];
    }

    /**
     * توليد محتوى PDF لاستمارة التقرير المفصلة لتقويم المدرسة (Detailed Dossier) - الحزمة 5 / FE-GAP-08 / BE-GAP-07 / U-44.
     *
     * @param Evaluation $evaluation
     * @param User|null $requester
     * @return string بايتات ملف الـ PDF
     */
    public function generateDetailedDossierPdf(Evaluation $evaluation, ?User $requester = null): string
    {
        $viewData = $this->buildDetailedDossierViewData($evaluation);
        $school = $evaluation->school;

        $html = View::make('reports.detailed_dossier_report', $viewData)->render();

        // 5. تهيئة mPDF
        $defaultConfig = (new ConfigVariables())->getDefaults();
        $fontDirs = $defaultConfig['fontDir'];
        $defaultFontConfig = (new FontVariables())->getDefaults();
        $fontData = $defaultFontConfig['fontdata'];

        $customFontsDir = resource_path('fonts');
        $hasAmiri = file_exists($customFontsDir . '/Amiri-Regular.ttf');

        $tempDir = storage_path('app/temp-mpdf');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $mpdfConfig = [
            'mode'             => 'utf-8',
            'format'           => 'A4',
            'orientation'      => 'P',
            'margin_left'      => 10,
            'margin_right'     => 10,
            'margin_top'       => 31,
            'margin_bottom'    => 18,
            'margin_header'    => 8,
            'margin_footer'    => 8,
            'autoScriptToLang' => true,
            'autoArabic'       => true,
            'autoLangToFont'   => true,
            'default_font'     => $hasAmiri ? 'amiri' : 'dejavusans',
            'tempDir'          => $tempDir,
        ];

        if ($hasAmiri) {
            $mpdfConfig['fontDir'] = array_merge($fontDirs, [$customFontsDir]);
            $mpdfConfig['fontdata'] = $fontData + [
                'amiri' => [
                    'R' => 'Amiri-Regular.ttf',
                    'B' => 'Amiri-Bold.ttf',
                ],
            ];
        }

        $mpdf = new Mpdf($mpdfConfig);
        $mpdf->SetDirectionality('rtl');
        $mpdf->SetTitle('استمارة التقرير المفصلة - ' . $school->school_name);
        $mpdf->SetAuthor(config('reports.system_name'));

        if ($evaluation->status !== 'Completed') {
            $mpdf->SetWatermarkText('مسودة تقييم غير مكتملة');
            $mpdf->showWatermarkText = true;
            $mpdf->watermarkTextAlpha = 0.08;
        }

        $mpdf->WriteHTML($html);

        return $mpdf->Output('', 'S');
    }
}
