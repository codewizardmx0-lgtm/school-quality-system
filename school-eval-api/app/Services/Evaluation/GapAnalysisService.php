<?php

namespace App\Services\Evaluation;

use App\Models\AiAnalysis;
use App\Models\AiRecommendation;
use App\Models\Evaluation;
use App\Models\EvaluationResult;
use App\Models\EvidenceLink;
use App\Models\IndicatorEvidenceRequirement;

class GapAnalysisService
{
    /**
     * Run automated dynamic gap analysis based on actual school scores.
     *
     * @return array<string, mixed>
     */
    public function runForEvaluation(Evaluation $evaluation, int $requestedByUserId): array
    {
        $evaluation->loadMissing(['school']);
        $schoolName = $evaluation->school?->school_name ?? 'المدرسة';

        $results = EvaluationResult::with(['indicator.subStandard.standard'])
            ->where('evaluation_id', $evaluation->evaluation_id)
            ->whereNotNull('score')
            ->where('completion_status', '!=', 'Pending')
            ->get();

        $totalScored = $results->count();
        $overallAvg = $totalScored > 0 ? round($results->avg('score'), 2) : 0.0;
        $strengthResults = $results->filter(fn ($r) => (int) $r->score >= 2)->sortByDesc('score')->values();
        $gapResults = $results->filter(fn ($r) => (int) $r->score < 2)->sortBy('score')->values();

        $evidencesCount = EvidenceLink::where('evaluation_id', $evaluation->evaluation_id)->count();
        $requirementsTarget = IndicatorEvidenceRequirement::count() ?: 278;

        if ($totalScored === 0) {
            $summary = "تحليل بيانات التقييم الذاتي لـ ({$schoolName}): لا توجد مؤشرات مرصودة حتى الآن. يرجى البدء برصد التقديرات وإيداع الشواهد لاستخلاص نقاط القوة وفرص التحسين الفعلية.";
        } else {
            $strengthsCount = $strengthResults->count();
            $gapsCount = $gapResults->count();
            $summary = "تحليل بيانات التقييم الذاتي لـ ({$schoolName}): تم فحص {$totalScored} مؤشراً مرصوداً بمتوسط أداء عام {$overallAvg} من 3.00 نقاط. أظهرت النتائج توفر {$strengthsCount} نقطة قوة (المستوى 2 و 3)، مقابل {$gapsCount} فرصة تحسين وفجوة ميدانية (المستوى 0 و 1) تستلزم المعالجة في خطة التحسين المدرسي.";
        }

        $analysis = AiAnalysis::create([
            'evaluation_id'        => $evaluation->evaluation_id,
            'requested_by_user_id' => $requestedByUserId,
            'analysis_date'        => now(),
            'input_scope'          => 'results_and_notes',
            'summary'              => $summary,
            'status'               => 'Completed',
        ]);

        $recommendations = [];

        $strengthsByStd = $strengthResults->groupBy(fn ($r) => $r->indicator?->subStandard?->standard?->standard_id ?? 0);
        $topStandards = $strengthsByStd->sortByDesc(fn ($group) => $group->count())->take(3);

        foreach ($topStandards as $group) {
            $first = $group->first();
            $std = $first->indicator?->subStandard?->standard;
            $stdName = $std?->name ?? 'المعيار الوطني';
            $stdAvg = round($group->avg('score'), 2);
            $count = $group->count();

            $recommendations[] = [
                'analysis_id' => $analysis->analysis_id,
                'type'        => 'strength',
                'title'       => "تفوق الأداء في مجال: {$stdName}",
                'description' => "حقق المجال {$count} مؤشراً بمستويات متقدمة (2 و 3) وبمتوسط جودة بلغ {$stdAvg} من 3.00 نقاط وفق المرصود الفعلي في {$schoolName}.",
                'priority'    => $stdAvg >= 2.5 ? 'High' : 'Medium',
                'status'      => 'Accepted',
            ];
        }

        foreach ($gapResults->take(5) as $gapRes) {
            $ind = $gapRes->indicator;
            $indCode = $ind?->code ?? ('IND-' . $gapRes->indicator_id);
            $indName = $ind?->name ?? 'مؤشر أداء مدرسي';
            $scoreVal = (int) $gapRes->score;
            $levelLabel = $scoreVal === 0 ? 'المستوى 0: غير متوفر' : 'المستوى 1: متحقق بدرجة ضعيفة';

            $recommendations[] = [
                'analysis_id' => $analysis->analysis_id,
                'type'        => 'improvement',
                'title'       => "فرصة تحسين ({$indCode}): {$indName}",
                'description' => "تم رصد المؤشر بتقدير ({$levelLabel}) في ملف المدرسة الفعلي، مما يتطلب استيفاء الممارسات والشواهد الداعمة لرفعه إلى المستوى المستهدف.",
                'priority'    => $scoreVal === 0 ? 'High' : 'Medium',
                'status'      => 'PendingReview',
            ];

            $recommendations[] = [
                'analysis_id' => $analysis->analysis_id,
                'type'        => 'draft',
                'title'       => "مبادرة تطويرية للمؤشر ({$indCode}): تعزيز وتحسين {$indName}",
                'description' => "برنامج عمل تنفيذي لمعالجة الفجوة المرصودة في ({$indName}) والانتقال من ({$levelLabel}) إلى مستوى متحقق بالكامل مع توثيق الشواهد الداعمة.",
                'priority'    => $scoreVal === 0 ? 'High' : 'Medium',
                'status'      => 'PendingReview',
            ];
        }

        foreach ($recommendations as $rec) {
            AiRecommendation::create($rec);
        }

        $initiativesCount = collect($recommendations)->whereIn('type', ['recommendation', 'draft'])->count();

        return [
            'analysisId'                => $analysis->analysis_id,
            'summary'                   => $analysis->summary,
            'averageScore'              => $overallAvg,
            'evaluatedEvidences'        => $evidencesCount,
            'totalEvidences'            => $requirementsTarget,
            'suggestedInitiativesCount' => $initiativesCount,
            'createdAt'                 => $analysis->created_at?->toIso8601String(),
        ];
    }
}
