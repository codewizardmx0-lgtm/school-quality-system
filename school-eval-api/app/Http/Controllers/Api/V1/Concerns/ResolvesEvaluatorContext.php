<?php

namespace App\Http\Controllers\Api\V1\Concerns;

use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\School;
use App\Models\StandardVersion;
use Illuminate\Http\Request;

/**
 * سمة مشتركة لاسترجاع التقييم النشط والإصدار المعياري المرجعي لبوابة المقيّم ومدير المدرسة.
 */
trait ResolvesEvaluatorContext
{
    /**
     * الحصول على التقييم الحالي للمدرسة والمستخدم.
     */
    protected function getActiveEvaluation(Request $request): ?Evaluation
    {
        $user = $request->user();
        $schoolId = $user ? $user->school_id : null;

        if (!$schoolId) {
            $schoolId = School::first()?->school_id ?? 1;
        }

        $requestedEvalId = $request->query('evaluationId') ?? $request->header('X-Evaluation-Id');
        if ($requestedEvalId && is_numeric($requestedEvalId)) {
            $selected = Evaluation::where('school_id', $schoolId)
                ->where('evaluation_id', (int) $requestedEvalId)
                ->first();
            if ($selected) {
                return $selected;
            }
        }

        $school = School::find($schoolId);

        $activeCycle = EvaluationCycle::where('status', 'Active')
            ->where(function ($q) use ($school) {
                $q->whereNull('scope_governorate');
                if ($school && $school->governorate) {
                    $q->orWhere('scope_governorate', $school->governorate);
                }
            })
            ->latest('cycle_id')
            ->first();

        if ($activeCycle) {
            $evaluationInActiveCycle = Evaluation::where('school_id', $schoolId)
                ->where('cycle_id', $activeCycle->cycle_id)
                ->latest('evaluation_id')
                ->first();

            if ($evaluationInActiveCycle) {
                return $evaluationInActiveCycle;
            }

            return Evaluation::create([
                'school_id'          => $schoolId,
                'cycle_id'           => $activeCycle->cycle_id,
                'created_by_user_id' => $user?->user_id ?? 1,
                'status'             => 'InProgress',
            ]);
        }

        $evaluation = Evaluation::where('school_id', $schoolId)
            ->orderBy('evaluation_id', 'desc')
            ->first();

        if (!$evaluation) {
            $cycle = EvaluationCycle::where('status', 'Active')->first() ?? EvaluationCycle::first();
            $cycleId = $cycle ? $cycle->cycle_id : 1;
            $evaluation = Evaluation::create([
                'school_id'          => $schoolId,
                'cycle_id'           => $cycleId,
                'created_by_user_id' => $user?->user_id ?? 1,
                'status'             => 'InProgress',
            ]);
        }

        return $evaluation;
    }

    /**
     * Resolves the authoritative standard version for an evaluation.
     * Prioritizes the evaluation's cycle version, then Active version, then latest.
     */
    protected function getEvaluationStandardVersion(?Evaluation $evaluation): StandardVersion
    {
        if ($evaluation && $evaluation->cycle && $evaluation->cycle->version_id) {
            $version = StandardVersion::find($evaluation->cycle->version_id);
            if ($version) {
                return $version;
            }
        }

        $activeVersion = StandardVersion::where('status', StandardVersion::STATUS_ACTIVE)->orderBy('version_id', 'desc')->first();
        if ($activeVersion) {
            return $activeVersion;
        }

        return StandardVersion::orderBy('version_id', 'desc')->firstOrFail();
    }
}
