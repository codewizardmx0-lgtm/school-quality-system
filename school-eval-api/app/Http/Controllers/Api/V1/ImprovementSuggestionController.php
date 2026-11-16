<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Evaluation;
use App\Models\EvaluationResult;
use App\Models\ImprovementArea;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * متحكم اقتراحات مجالات التحسين (Improvement Suggestions).
 *
 * يوفر استعلاماً ديناميكياً يحسب عند الطلب اقتراحات التحسين للمؤشرات التي أحرزت
 * تقديراً أقل من التقدير المستهدف (target_score = 3) دون تخزين الاقتراحات مسبقاً،
 * مما يتيح للمقوم استعراضها وتبنيها في مجالات تحسين معتمدة.
 */
class ImprovementSuggestionController extends Controller
{
    /**
     * استرجاع اقتراحات مجالات التحسين المبنية على نتائج تقييم محدد.
     *
     * GET /api/v1/evaluations/{id}/improvement-suggestions
     * الصلاحية: plans.view أو plans.manage
     */
    public function index(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasPermission('plans.view') && !$user->hasPermission('plans.manage')) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض مقترحات التحسين.');
        }

        $evaluation = Evaluation::find($id);
        if (!$evaluation) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        // عزل المدارس (القرار المعماري 9)
        if ($user->user_type === 'school' && (int) $user->school_id !== (int) $evaluation->school_id) {
            return ApiResponse::notFound('ملف التقييم المطلوب غير موجود.');
        }

        $targetScore = (int) config('evaluation.target_score', 3);
        if ($request->filled('target_score') || $request->filled('targetScore')) {
            $rawTarget = $request->input('target_score') ?? $request->input('targetScore');
            $inputTarget = is_numeric($rawTarget) ? (int) $rawTarget : -1;
            if ($inputTarget >= 1 && $inputTarget <= 3) {
                $targetScore = $inputTarget;
            } else {
                return ApiResponse::validationError([
                    'target_score' => ['يجب أن يكون التقدير المستهدف رقماً بين 1 و 3.'],
                ], 'قيمة التقدير المستهدف غير صالحة.');
            }
        }

        // جلب نتائج التقييم الأقل من التقدير المستهدف مع المعايير
        $lowResults = EvaluationResult::query()
            ->where('evaluation_id', $evaluation->evaluation_id)
            ->where('score', '<', $targetScore)
            ->with(['indicator.subStandard.standard'])
            ->orderBy('score', 'asc')
            ->get();

        // مجالات التحسين المتبناة مسبقاً في جدول improvement_areas مع خططها المرتبطة
        $adoptedAreas = ImprovementArea::query()
            ->whereIn('result_id', $lowResults->pluck('result_id'))
            ->with(['plans' => function ($q) {
                $q->orderBy('version_number', 'desc')->orderBy('plan_id', 'desc');
            }])
            ->get(['area_id', 'result_id', 'status']);

        $adoptedAreaMap = [];
        $adoptedPlanMap = [];
        foreach ($adoptedAreas as $area) {
            // فحص هل توجد خطة نشطة أو مسودة جارية
            $activePlan = $area->plans->first(fn($p) => in_array($p->status, ['Active', 'Draft']));
            $latestPlan = $area->plans->first();

            if ($activePlan) {
                $adoptedAreaMap[$area->result_id] = $area->area_id;
                $adoptedPlanMap[$area->result_id] = [
                    'planId'        => (int) $activePlan->plan_id,
                    'planTitle'     => $activePlan->title,
                    'planType'      => $activePlan->plan_type,
                    'versionNumber' => (int) ($activePlan->version_number ?? 1),
                    'versionTag'    => $activePlan->version_tag,
                    'status'        => $activePlan->status,
                    'isCurrentPlan' => true,
                ];
            } elseif ($latestPlan) {
                // متبنى سابقاً في خطة مؤرشفة أو مكتملة دون وجود خطة نشطة حالية
                $adoptedPlanMap[$area->result_id] = [
                    'planId'        => (int) $latestPlan->plan_id,
                    'planTitle'     => $latestPlan->title,
                    'planType'      => $latestPlan->plan_type,
                    'versionNumber' => (int) ($latestPlan->version_number ?? 1),
                    'versionTag'    => $latestPlan->version_tag,
                    'status'        => $latestPlan->status,
                    'isCurrentPlan' => false,
                ];
            }
        }

        $suggestions = $lowResults->map(function ($result) use ($targetScore, $adoptedAreaMap, $adoptedPlanMap) {
            $isHigh = ($result->score <= 1);
            $suggestedPriority = $isHigh ? 'High' : 'Medium';
            $priorityLabel = $isHigh ? 'عالية' : 'متوسطة';

            $planInfo = $adoptedPlanMap[$result->result_id] ?? null;
            $isCurrentAdopted = isset($adoptedAreaMap[$result->result_id]);
            $isPreviouslyAdopted = !$isCurrentAdopted && !empty($planInfo);

            return [
                'resultId'            => (int) $result->result_id,
                'indicatorId'         => (int) $result->indicator_id,
                'indicatorCode'       => $result->indicator?->code ?? '',
                'indicatorName'       => $result->indicator?->name ?? '',
                'standardCode'        => $result->indicator?->subStandard?->standard?->code ?? '',
                'standardName'        => $result->indicator?->subStandard?->standard?->name ?? 'المعايير الوطنية',
                'score'               => (int) $result->score,
                'targetScore'         => $targetScore,
                'gap'                 => $targetScore - (int) $result->score,
                'suggestedPriority'   => $suggestedPriority,
                'priorityLabel'       => $priorityLabel,
                'suggestedName'       => 'تحسين أداء: ' . ($result->indicator?->name ?? 'المؤشر'),
                'isAlreadyAdopted'    => $isCurrentAdopted,
                'isPreviouslyAdopted' => $isPreviouslyAdopted,
                'adoptedAreaId'       => $adoptedAreaMap[$result->result_id] ?? null,
                'adoptedPlan'         => $planInfo,
                'isExcluded'          => (bool) ($result->is_excluded ?? false),
                'excludedAt'          => $result->excluded_at?->toIso8601String(),
            ];
        })->values();

        $highCount = $suggestions->where('suggestedPriority', 'High')->count();
        $mediumCount = $suggestions->where('suggestedPriority', 'Medium')->count();
        $adoptedCount = $suggestions->where('isAlreadyAdopted', true)->count();

        return ApiResponse::success(
            data: [
                'evaluationId' => (int) $evaluation->evaluation_id,
                'schoolId'     => (int) $evaluation->school_id,
                'targetScore'  => $targetScore,
                'suggestions'  => $suggestions,
                'meta'         => [
                    'totalSuggestions'    => $suggestions->count(),
                    'highPriorityCount'   => $highCount,
                    'mediumPriorityCount' => $mediumCount,
                    'alreadyAdoptedCount' => $adoptedCount,
                ],
            ],
            message: null
        );
    }
}
