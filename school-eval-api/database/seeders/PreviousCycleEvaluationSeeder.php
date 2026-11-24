<?php

namespace Database\Seeders;

use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\Indicator;
use App\Models\IndicatorScoreDescriptor;
use App\Models\School;
use App\Models\ScoreLevel;
use App\Models\StandardVersion;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeder تجريبي خاص بتهيئة دورة تقييمية سابقة لمدرسة الفاروق (SCH-TAIZ-2026-001)
 * لاختبار المقارنة التاريخية التراكمية عبر الدورات (UC-SUP-07 & FR-SUP-18).
 * آمن وقابل للتكرار.
 */
class PreviousCycleEvaluationSeeder extends Seeder
{
    public function run(): void
    {
        $schoolFarouq = School::where('identification_data', 'SCH-TAIZ-2026-001')
            ->orWhere('school_name', 'like', '%الفاروق%')
            ->first();

        if (!$schoolFarouq) {
            return;
        }

        // ضمان وجود إصدار معياري مُقرّ ومتاح لربط الدورة السابقة به
        $approvedVersion = StandardVersion::whereIn('status', ['Approved', 'Active'])->first()
            ?? StandardVersion::first();

        if (!$approvedVersion) {
            $approvedVersion = new StandardVersion();
            $approvedVersion->version_no = '1.0';
            $approvedVersion->status = 'Approved';
            $approvedVersion->issue_date = '2024-08-01';
            $approvedVersion->source_organization = 'وزارة التربية والتعليم';
            $approvedVersion->source_description = 'وثيقة المعايير الوطنية لتقويم الجودة المدرسية';
            $approvedVersion->save();
        } elseif (!$approvedVersion->isApproved()) {
            $approvedVersion->update(['status' => 'Approved']);
        }

        $targetVersionId = (int) $approvedVersion->version_id;

        // 1. الدورة التقييمية السابقة (2024/2025)
        $prevCycle = EvaluationCycle::updateOrCreate(
            ['academic_year' => '2024/2025'],
            [
                'name'               => 'دورة التقييم الذاتي للعام الدراسي 2024/2025',
                'status'             => 'Closed',
                'version_id'         => $targetVersionId,
                'scope_governorate'  => null,
                'start_date'         => '2024-09-01',
                'end_date'           => '2025-06-30',
                'max_completion_days'=> 14,
            ]
        );

        $evaluatorFarouq = User::where('username', 'quality_farouq')->first()
            ?? User::where('school_id', $schoolFarouq->school_id)->first();

        // 2. تقييم الدورة السابقة لمدرسة الفاروق (مكتمل)
        $prevEval = Evaluation::updateOrCreate(
            [
                'cycle_id'  => $prevCycle->cycle_id,
                'school_id' => $schoolFarouq->school_id,
            ],
            [
                'created_by_user_id' => $evaluatorFarouq?->user_id ?? 1,
                'status'             => 'Completed',
                'created_at'         => '2025-05-15 10:00:00',
                'updated_at'         => '2025-05-20 14:00:00',
            ]
        );

        // تنظيف أي نتائج قديمة لهذا التقييم
        EvaluationResult::where('evaluation_id', $prevEval->evaluation_id)->delete();

        // 3. رصد درجات الـ 109 مؤشرات الخاصة بالإصدار 1 لدورة 2024/2025
        $currentEval = Evaluation::where('school_id', $schoolFarouq->school_id)
            ->where('evaluation_id', '!=', $prevEval->evaluation_id)
            ->first();

        $currentScores = $currentEval
            ? EvaluationResult::where('evaluation_id', $currentEval->evaluation_id)->pluck('score', 'indicator_id')
            : collect();

        $versionIndicators = Indicator::whereHas('subStandard.standard', fn($q) => $q->where('version_id', $prevCycle->version_id ?? 1))
            ->orderBy('indicator_id')
            ->get();

        foreach ($versionIndicators as $ind) {
            $currScore = (int) ($currentScores[$ind->indicator_id] ?? 2);

            // توزيع درجات سابقة واقعية ومنضبطة (تحسن، تراجع، ثبات)
            $mod = ($ind->indicator_id * 7 + 3) % 10;
            if ($currScore === 3) {
                if ($mod < 4) {
                    $prevScore = 2; // تحسن بمقدار +1
                } elseif ($mod < 6) {
                    $prevScore = 1; // تحسن بمقدار +2
                } else {
                    $prevScore = 3; // ثبات
                }
            } elseif ($currScore === 2) {
                if ($mod < 3) {
                    $prevScore = 1; // تحسن بمقدار +1
                } elseif ($mod < 6) {
                    $prevScore = 3; // تراجع بمقدار -1
                } else {
                    $prevScore = 2; // ثبات
                }
            } elseif ($currScore === 1) {
                if ($mod < 5) {
                    $prevScore = 2; // تراجع بمقدار -1
                } else {
                    $prevScore = 1; // ثبات
                }
            } else {
                $prevScore = ($mod < 5) ? 1 : 0;
            }

            $scoreLevel = ScoreLevel::where('standard_version_id', 1)
                ->where('score_value', $prevScore)
                ->first();

            $descriptor = null;
            if ($scoreLevel) {
                $descriptor = IndicatorScoreDescriptor::where('indicator_id', $ind->indicator_id)
                    ->where('score_level_id', $scoreLevel->score_level_id)
                    ->first();
            }

            if (!$descriptor) {
                $descriptor = IndicatorScoreDescriptor::where('indicator_id', $ind->indicator_id)->first()
                    ?? IndicatorScoreDescriptor::first();
            }

            EvaluationResult::create([
                'evaluation_id'       => $prevEval->evaluation_id,
                'indicator_id'        => $ind->indicator_id,
                'score_descriptor_id' => $descriptor?->descriptor_id ?? 1,
                'standard_version_id' => $prevCycle->version_id ?? 1,
                'evaluator_user_id'   => $evaluatorFarouq?->user_id ?? 1,
                'score'               => $prevScore,
                'textual_result'      => "تقييم الدورة السابقة للعام الدراسي 2024/2025 لمؤشر ({$ind->code}).",
                'completion_status'   => 'Completed',
                'created_at'          => '2025-05-15 10:00:00',
                'updated_at'          => '2025-05-15 10:00:00',
            ]);
        }
    }
}
