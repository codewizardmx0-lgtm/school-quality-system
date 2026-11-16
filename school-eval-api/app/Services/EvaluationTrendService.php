<?php

namespace App\Services;

use App\Models\Evaluation;
use App\Models\EvaluationResult;

/**
 * خدمة مقارنة الأداء وتتبع مسار التطور بين الدورات التقييمية (EvaluationTrendService).
 *
 * تتبع المقارنة بين التقييم الحالي وآخر تقييم مكتمل لنفس المدرسة في دورة سابقة.
 * الترتيب الزمني مبني حصراً على معرف الدورة (cycle_id) أو تاريخ الإنشاء (created_at).
 */
class EvaluationTrendService
{
    public function __construct(
        protected ReportsAnalyticsService $analyticsService
    ) {}

    /**
     * حساب وتحليل مسار تطور أداء المدرسة مقارنة بالدورة التقييمية المكتملة السابقة.
     *
     * @param Evaluation $evaluation
     * @return array<string, mixed>
     */
    public function calculateTrend(Evaluation $evaluation): array
    {
        $schoolId = $evaluation->school_id;

        // البحث عن آخر تقييم مكتمل سابق لنفس المدرسة في دورة أقدم
        $previousEvaluation = Evaluation::query()
            ->where('school_id', $schoolId)
            ->where('status', 'Completed')
            ->where('evaluation_id', '!=', $evaluation->evaluation_id)
            ->where(function ($q) use ($evaluation) {
                if ($evaluation->cycle && $evaluation->cycle->start_date) {
                    $q->whereHas('cycle', function ($cq) use ($evaluation) {
                        $cq->where('start_date', '<', $evaluation->cycle->start_date);
                    });
                } else {
                    $q->where('created_at', '<', $evaluation->created_at);
                }
            })
            ->with(['cycle', 'results.indicator'])
            ->orderByDesc('created_at')
            ->orderByDesc('evaluation_id')
            ->first();

        if (!$previousEvaluation) {
            return [
                'has_previous_cycle' => false,
                'school_id' => $schoolId,
                'school_name' => $evaluation->school?->school_name,
                'current_evaluation_id' => $evaluation->evaluation_id,
                'current_cycle' => $evaluation->cycle?->academic_year ?? 'غير محدد',
                'notice' => 'التقييم التأسيسي الأول للمدرسة؛ لا تتوفر دورة تقييم سابقة للمقارنة.',
                'trend' => null,
            ];
        }

        // حساب النتائج الحالية والنتائج السابقة
        $currentResults = $this->analyticsService->calculateAssessmentResults($evaluation);
        $previousResults = $this->analyticsService->calculateAssessmentResults($previousEvaluation);

        $currentFinalScore = (float) ($currentResults['final_score'] ?? 0.0);
        $previousFinalScore = (float) ($previousResults['final_score'] ?? 0.0);
        $scoreDelta = round($currentFinalScore - $previousFinalScore, 2);

        // تجميع درجات المؤشرات في الدورتين
        $currentIndicatorScores = EvaluationResult::query()
            ->where('evaluation_id', $evaluation->evaluation_id)
            ->whereNotNull('score')
            ->with('indicator')
            ->get()
            ->keyBy(fn($r) => $r->indicator?->code ?? (string) $r->indicator_id);

        $prevIndicatorScores = EvaluationResult::query()
            ->where('evaluation_id', $previousEvaluation->evaluation_id)
            ->whereNotNull('score')
            ->with('indicator')
            ->get()
            ->keyBy(fn($r) => $r->indicator?->code ?? (string) $r->indicator_id);

        $improved = [];
        $regressed = [];
        $maintained = [];
        $newlyEvaluated = [];

        foreach ($currentIndicatorScores as $code => $currResult) {
            $currScore = (int) $currResult->score;
            $currName = $currResult->indicator?->name;

            if ($prevIndicatorScores->has($code)) {
                $prevResult = $prevIndicatorScores->get($code);
                $prevScore = (int) $prevResult->score;
                $prevName = $prevResult->indicator?->name;

                $textChanged = ($prevName !== null && $currName !== null && $prevName !== $currName);

                $item = [
                    'indicator_code' => $code,
                    'indicator_name' => $currName,
                    'previous_score' => $prevScore,
                    'current_score'  => $currScore,
                    'delta'          => $currScore - $prevScore,
                    'text_changed'   => $textChanged,
                ];

                if ($textChanged) {
                    $item['previous_name'] = $prevName;
                    $item['current_name']  = $currName;
                }

                if ($currScore > $prevScore) {
                    $improved[] = $item;
                } elseif ($currScore < $prevScore) {
                    $regressed[] = $item;
                } else {
                    $maintained[] = $item;
                }
            } else {
                $newlyEvaluated[] = [
                    'indicator_code' => $code,
                    'indicator_name' => $currName,
                    'current_score'  => $currScore,
                ];
            }
        }

        // استخراج المؤشرات المقيمة سابقاً والمستبعدة/المحذوفة من الدورة الحالية (BR-SCH-07)
        $deprecatedIndicators = [];
        foreach ($prevIndicatorScores as $code => $prevResult) {
            if (!$currentIndicatorScores->has($code)) {
                $deprecatedIndicators[] = [
                    'indicator_code' => $code,
                    'indicator_name' => $prevResult->indicator?->name,
                    'previous_score' => (int) $prevResult->score,
                    'notice'         => 'مؤشر تم استبعاده أو إلغاؤه في الإصدار المعياري للدورة الحالية.',
                ];
            }
        }

        return [
            'has_previous_cycle' => true,
            'school_id' => $schoolId,
            'school_name' => $evaluation->school?->school_name,
            'current_evaluation_id' => $evaluation->evaluation_id,
            'current_cycle' => $evaluation->cycle?->academic_year ?? 'الحالي',
            'previous_evaluation_id' => $previousEvaluation->evaluation_id,
            'previous_cycle' => $previousEvaluation->cycle?->academic_year ?? 'السابق',
            'notice' => 'تم استخراج مقارنة الأداء مع الدورة السابقة بنجاح.',
            'trend' => [
                'current_final_score' => $currentFinalScore,
                'previous_final_score' => $previousFinalScore,
                'score_delta' => $scoreDelta,
                'trend_direction' => $scoreDelta > 0 ? 'improving' : ($scoreDelta < 0 ? 'declining' : 'stable'),
                'improved_count' => count($improved),
                'regressed_count' => count($regressed),
                'maintained_count' => count($maintained),
                'newly_evaluated_count' => count($newlyEvaluated),
                'deprecated_count' => count($deprecatedIndicators),
                'improved_indicators' => $improved,
                'regressed_indicators' => $regressed,
                'maintained_indicators' => $maintained,
                'newly_evaluated_indicators' => $newlyEvaluated,
                'deprecated_indicators' => $deprecatedIndicators,
            ],
        ];
    }
}
