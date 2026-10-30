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
}
