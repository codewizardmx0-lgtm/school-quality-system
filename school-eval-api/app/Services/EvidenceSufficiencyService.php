<?php

namespace App\Services;

use App\Models\Evaluation;
use App\Models\EvaluationResult;
use App\Models\Indicator;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\Standard;
use Illuminate\Support\Collection;

/**
 * خدمة حساب كفاية الشواهد الموحدة (Evidence Sufficiency Single Source of Truth).
 *
 * المصدر المعتمد والموحد لكافة عمليات فحص واحتساب كفاية الشواهد في النظام:
 * 1. جرد وحصر الشواهد التفصيلي (الشريحة 5): GET /api/v1/evaluations/{id}/evidence-inventory
 * 2. ملخص وتقارير الشواهد (الشريحة 4): ReportsAnalyticsService@calculateEvidenceSummary
 * 3. شرط الإغلاق والاعتماد (الشريحة 4.1): POST /api/v1/evaluations/{id}/submit
 *
 * القواعد الموحدة الحتمية:
 * - المؤشر الذي له متطلب إلزامي واحد على الأقل يُعدّ مستوفيًا فقط إذا توفر له العدد المطلوب من شواهد بحالة Completed أو Audited.
 * - المؤشر بلا متطلبات إلزامية لا يُعدّ ناقصًا أبدًا، وحالته NotRequired ونسبة كفايته 100%.
 * - شواهد المسودة (Draft) لا تدخل في نسبة الاستيفاء ولا في خفض عدد النواقص (missing_count)، وتُحسب في عمود منفصل draft_count.
 * - النسب المئوية تُحسب بالشواهد الصالحة فقط (Completed / Audited).
 */
class EvidenceSufficiencyService
{
    /**
     * احتساب كفاية الشواهد لمؤشر محدد بدقة.
     *
     * @param Indicator $indicator
     * @param EvaluationResult|null $result
     * @param Collection<int, IndicatorEvidenceRequirement> $requirements
     * @return array<string, mixed>
     */
    public function evaluateIndicator(Indicator $indicator, ?EvaluationResult $result, Collection $requirements): array
    {
        $mandatoryReqs = $requirements->where('required', true);
        $mandatoryCount = $mandatoryReqs->count();
        $totalReqCount = $requirements->count();

        $evidences = $result ? $result->evidences : collect();
        $uploadedCount = $evidences->count();

        $validEvidences = $evidences->filter(function ($ev) {
            return in_array($ev->status, ['Completed', 'Audited'], true);
        });
        $validCount = $validEvidences->count();

        $draftEvidences = $evidences->filter(function ($ev) {
            return ($ev->status === 'Draft' || empty($ev->status));
        });
        $draftCount = $draftEvidences->count();

        // القاعدة: إذا كان له متطلبات إلزامية، يجب استيفاؤها بالشواهد الصالحة
        // وإذا لم يكن له متطلبات إلزامية، لا يُعدّ ناقصاً أبداً
        if ($mandatoryCount > 0) {
            $isSufficient = ($validCount >= $mandatoryCount);
            $missingCount = max(0, $mandatoryCount - $validCount);
            $status = $isSufficient ? 'Completed' : 'Missing';
            $completionRate = min(100.0, round(($validCount / $mandatoryCount) * 100, 2));
        } else {
            $isSufficient = true;
            $missingCount = 0;
            $status = ($validCount > 0) ? 'Completed' : 'NotRequired';
            $completionRate = 100.0;
        }

        return [
            'indicator_id'             => $indicator->indicator_id,
            'code'                     => $indicator->code,
            'name'                     => $indicator->name,
            'mandatory_required_count' => $mandatoryCount,
            'total_required_count'     => $totalReqCount,
            'uploaded_evidence_count'  => $uploadedCount,
            'valid_evidence_count'     => $validCount,
            'draft_evidence_count'     => $draftCount,
            'is_sufficient'            => $isSufficient,
            'missing_count'            => $missingCount,
            'status'                   => $status,
            'completion_rate'          => $completionRate,
            'evidences'                => $evidences,
        ];
    }

    /**
     * تقييم كفاية الشواهد الشامل لملف التقييم الذاتي بكامل معاييره ومؤشراته.
     *
     * @param Evaluation $evaluation
     * @return array<string, mixed>
     */
    public function evaluateEvaluation(Evaluation $evaluation): array
    {
        $evaluation->loadMissing(['cycle', 'school']);
        $versionId = (int) ($evaluation->cycle?->standard_version_id ?? $evaluation->cycle?->version_id);

        if (!$versionId) {
            throw new \InvalidArgumentException('دورة التقييم غير مرتبطة بإصدار معياري معتمد.');
        }

        $standards = Standard::query()
            ->where('version_id', $versionId)
            ->with(['subStandards.indicators' => function ($q) {
                $q->where('status', 'Active')->orderBy('code');
            }])
            ->orderBy('standard_id')
            ->get();

        $requirementsMap = IndicatorEvidenceRequirement::query()
            ->get()
            ->groupBy('indicator_id');

        $resultsMap = EvaluationResult::query()
            ->where('evaluation_id', $evaluation->evaluation_id)
            ->with([
                'evidences.versions.attachments',
                'evidences.reviewer',
            ])
            ->get()
            ->keyBy('indicator_id');

        $totalIndicators = 0;
        $indicatorsWithSufficientEvidence = 0;
        $indicatorsMissingEvidence = 0;
        $indicatorsWithValidEvidence = 0;
        $indicatorsWithZeroEvidence = 0;

        $totalMandatoryRequired = 0;
        $totalUploadedEvidences = 0;
        $totalValidEvidences = 0;
        $totalDraftEvidences = 0;
        $totalCappedValidEvidences = 0;

        $byType = [
            'minutes' => 0,
            'plan'    => 0,
            'record'  => 0,
            'report'  => 0,
            'board'   => 0,
            'image'   => 0,
            'other'   => 0,
        ];

        $byStatus = [
            'Draft'     => 0,
            'Completed' => 0,
            'Audited'   => 0,
        ];

        $missingEvidenceIndicators = [];
        $standardsData = [];

        foreach ($standards as $standard) {
            $stdTotalIndicators = 0;
            $stdSufficientIndicators = 0;
            $stdMissingIndicators = 0;
            $stdWithValidEvidence = 0;
            $stdZeroEvidence = 0;
            $stdMandatoryRequired = 0;
            $stdUploadedEvidences = 0;
            $stdValidEvidences = 0;
            $stdDraftEvidences = 0;
            $stdCappedValidEvidences = 0;

            $indicatorsList = [];

            foreach ($standard->subStandards as $sub) {
                foreach ($sub->indicators as $ind) {
                    $totalIndicators++;
                    $stdTotalIndicators++;

                    $reqs = $requirementsMap->get($ind->indicator_id, collect());
                    $result = $resultsMap->get($ind->indicator_id);

                    $evaluatedInd = $this->evaluateIndicator($ind, $result, $reqs);

                    $totalMandatoryRequired += $evaluatedInd['mandatory_required_count'];
                    $stdMandatoryRequired += $evaluatedInd['mandatory_required_count'];

                    $totalUploadedEvidences += $evaluatedInd['uploaded_evidence_count'];
                    $stdUploadedEvidences += $evaluatedInd['uploaded_evidence_count'];

                    $totalValidEvidences += $evaluatedInd['valid_evidence_count'];
                    $stdValidEvidences += $evaluatedInd['valid_evidence_count'];

                    $totalDraftEvidences += $evaluatedInd['draft_evidence_count'];
                    $stdDraftEvidences += $evaluatedInd['draft_evidence_count'];

                    $indCappedValid = min($evaluatedInd['valid_evidence_count'], $evaluatedInd['mandatory_required_count']);
                    $stdCappedValidEvidences += $indCappedValid;
                    $totalCappedValidEvidences += $indCappedValid;

                    if ($evaluatedInd['is_sufficient']) {
                        $indicatorsWithSufficientEvidence++;
                        $stdSufficientIndicators++;
                    } else {
                        $indicatorsMissingEvidence++;
                        $stdMissingIndicators++;
                        $missingEvidenceIndicators[] = [
                            'indicator_id'                => $ind->indicator_id,
                            'code'                        => $ind->code,
                            'name'                        => $ind->name,
                            'required_requirements_count' => $evaluatedInd['mandatory_required_count'],
                            'uploaded_evidence_count'     => $evaluatedInd['uploaded_evidence_count'],
                            'valid_evidence_count'        => $evaluatedInd['valid_evidence_count'],
                            'draft_evidence_count'        => $evaluatedInd['draft_evidence_count'],
                        ];
                    }

                    if ($evaluatedInd['valid_evidence_count'] > 0) {
                        $indicatorsWithValidEvidence++;
                        $stdWithValidEvidence++;
                    } else {
                        $indicatorsWithZeroEvidence++;
                        $stdZeroEvidence++;
                    }

                    // تجميع التصنيفات والحالات
                    foreach ($evaluatedInd['evidences'] as $ev) {
                        $t = $ev->evidence_type ?: 'other';
                        if (isset($byType[$t])) {
                            $byType[$t]++;
                        } else {
                            $byType['other']++;
                        }

                        $s = $ev->status ?: 'Draft';
                        if (isset($byStatus[$s])) {
                            $byStatus[$s]++;
                        } else {
                            $byStatus['Draft']++;
                        }
                    }

                    $evaluatedInd['domain_name'] = $sub->name;
                    $evaluatedInd['sub_standard_code'] = $sub->code;
                    $indicatorsList[] = $evaluatedInd;
                }
            }

            $stdCompletionRate = $stdMandatoryRequired > 0
                ? min(100.0, round(($stdCappedValidEvidences / $stdMandatoryRequired) * 100, 2))
                : 100.0;

            $standardsData[] = [
                'standard_id'              => $standard->standard_id,
                'standard_code'            => $standard->code,
                'standard_name'            => $standard->name,
                'total_indicators'         => $stdTotalIndicators,
                'sufficient_indicators'    => $stdSufficientIndicators,
                'missing_indicators'       => $stdMissingIndicators,
                'indicators_with_evidence' => $stdWithValidEvidence,
                'indicators_zero_evidence' => $stdZeroEvidence,
                'mandatory_required_count' => $stdMandatoryRequired,
                'uploaded_evidence_count'  => $stdUploadedEvidences,
                'valid_evidence_count'     => $stdValidEvidences,
                'draft_evidence_count'     => $stdDraftEvidences,
                'completion_rate'          => $stdCompletionRate,
                'indicators'               => $indicatorsList,
            ];
        }

        $overallCompletionRate = $totalMandatoryRequired > 0
            ? min(100.0, round(($totalCappedValidEvidences / $totalMandatoryRequired) * 100, 2))
            : 100.0;

        $inventoryStatus = ($indicatorsMissingEvidence === 0 && $totalIndicators > 0) ? 'Complete' : 'Incomplete';

        return [
            'evaluation_id'                     => $evaluation->evaluation_id,
            'school_id'                         => $evaluation->school_id,
            'school_name'                       => $evaluation->school?->school_name ?? $evaluation->school?->name,
            'inventory_status'                  => $inventoryStatus,
            'total_indicators'                  => $totalIndicators,
            'indicators_with_sufficient_evidence' => $indicatorsWithSufficientEvidence,
            'indicators_missing_evidence'       => $indicatorsMissingEvidence,
            'indicators_with_valid_evidence'    => $indicatorsWithValidEvidence,
            'indicators_zero_evidence'          => $indicatorsWithZeroEvidence,
            'total_mandatory_required'          => $totalMandatoryRequired,
            'total_uploaded_evidences'          => $totalUploadedEvidences,
            'total_valid_evidences'             => $totalValidEvidences,
            'total_draft_evidences'             => $totalDraftEvidences,
            'overall_evidence_completion_rate'  => $overallCompletionRate,
            'by_type'                           => $byType,
            'by_status'                         => $byStatus,
            'missing_evidence_indicators'       => $missingEvidenceIndicators,
            'standards'                         => $standardsData,
        ];
    }
}
