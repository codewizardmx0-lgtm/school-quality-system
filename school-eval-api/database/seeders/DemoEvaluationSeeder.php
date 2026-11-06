<?php

namespace Database\Seeders;

use App\Models\DocumentVersion;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\EvidenceLink;
use App\Models\ImprovementPlan;
use App\Models\Indicator;
use App\Models\IndicatorScoreDescriptor;
use App\Models\School;
use App\Models\SchoolDocument;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeder اختباري لإنشاء بيانات تقييم حية ومميزة لكل من مدرسة بلقيس ومدرسة الفاروق
 * للتحقق من العزل المؤسسي (Tenant Isolation NFR-SEC-03) والفصل التام بين بيانات المدرستين.
 */
class DemoEvaluationSeeder extends Seeder
{
    public function run(): void
    {
        $cycle = EvaluationCycle::firstOrFail();
        $schoolBelqees = School::where('identification_data', 'SCH-AMANA-2026-001')
            ->orWhere('identification_data', 'SCH-SANAA-2026-001')
            ->orWhere('school_name', 'like', '%بلقيس%')
            ->firstOrFail();
        $schoolFarouq  = School::where('identification_data', 'SCH-TAIZ-2026-002')->firstOrFail();

        $evaluatorBelqees = User::where('username', 'quality_belqees')->firstOrFail();
        $evaluatorFarouq  = User::where('username', 'quality_farouq')->firstOrFail();

        $principalBelqees = User::where('username', 'principal_belqees')->firstOrFail();
        $principalFarouq  = User::where('username', 'principal_farouq')->firstOrFail();

        // 1. إنشاء عملية تقييم لمدرسة بلقيس
        $evalBelqees = Evaluation::updateOrCreate(
            [
                'cycle_id'  => $cycle->cycle_id,
                'school_id' => $schoolBelqees->school_id,
            ],
            [
                'created_by_user_id' => $evaluatorBelqees->user_id,
                'status'             => 'InProgress',
            ]
        );

        // 2. إنشاء عملية تقييم لمدرسة الفاروق
        $evalFarouq = Evaluation::updateOrCreate(
            [
                'cycle_id'  => $cycle->cycle_id,
                'school_id' => $schoolFarouq->school_id,
            ],
            [
                'created_by_user_id' => $evaluatorFarouq->user_id,
                'status'             => 'InProgress',
            ]
        );

        // جلب أول 3 مؤشرات
        $indicators = Indicator::take(3)->get();
        if ($indicators->count() < 3) return;

        // نتائج مدرسة بلقيس (متميزة بدرجات 3 و 2)
        foreach ($indicators as $idx => $ind) {
            $score = ($idx === 0) ? 3 : 2;
            $descriptor = IndicatorScoreDescriptor::where('indicator_id', $ind->indicator_id)
                ->where('score_level_id', $score + 1)
                ->first();

            $res = EvaluationResult::updateOrCreate(
                [
                    'evaluation_id' => $evalBelqees->evaluation_id,
                    'indicator_id'  => $ind->indicator_id,
                ],
                [
                    'score_descriptor_id' => $descriptor?->descriptor_id ?? 1,
                    'standard_version_id' => $cycle->version_id,
                    'evaluator_user_id'   => $evaluatorBelqees->user_id,
                    'score'               => $score,
                    'textual_result'      => "رصد ذاتي خاص بمدرسة بلقيس النموذجية للمؤشر ({$ind->code}): الأداء متميز وموثق بسجلات الجودة المدرسية لعام 2026.",
                    'completion_status'   => 'Completed',
                ]
            );

            // مستند وشاهد إثبات لمدرسة بلقيس (المعمارية الجديدة U-24)
            $doc = SchoolDocument::updateOrCreate(
                [
                    'school_id' => $schoolBelqees->school_id,
                    'title'     => "ملف شواهد مدرسة بلقيس — {$ind->code}",
                ],
                [
                    'description'        => 'سجلات الحضور وتوثيق خطط التدريس وجداول الفعاليات المدرسية المعتمدة بختم الإدارة.',
                    'document_type'      => 'record',
                    'created_by_user_id' => $evaluatorBelqees->user_id,
                ]
            );

            $docVer = DocumentVersion::updateOrCreate(
                [
                    'school_document_id' => $doc->id,
                    'version_no'         => 1,
                ],
                [
                    'school_id'   => $schoolBelqees->school_id,
                    'is_current'  => true,
                    'file_name'   => "belqees_evidence_{$ind->code}.pdf",
                    'storage_uri' => "documents/{$schoolBelqees->school_id}/belqees_evidence_{$ind->code}.pdf",
                    'file_size'   => 1024,
                    'mime_type'   => 'application/pdf',
                ]
            );

            EvidenceLink::updateOrCreate(
                [
                    'evaluation_id'       => $evalBelqees->evaluation_id,
                    'indicator_id'        => $ind->indicator_id,
                    'document_version_id' => $docVer->id,
                ],
                [
                    'school_id'            => $schoolBelqees->school_id,
                    'evaluation_result_id' => $res->result_id,
                    'justification'        => 'تم استيفاء كافة متطلبات المعيار وفق الدليل الإجرائي الوطني.',
                    'status'               => 'completed',
                ]
            );
        }

        // خطة تحسين لمدرسة بلقيس
        ImprovementPlan::updateOrCreate(
            [
                'cycle_id'  => $cycle->cycle_id,
                'school_id' => $schoolBelqees->school_id,
            ],
            [
                'created_by_user_id'   => $evaluatorBelqees->user_id,
                'title'                => 'الخطة التطويرية الشاملة لمدرسة بلقيس النموذجية 2026',
                'start_date'           => '2026-02-01',
                'end_date'             => '2026-06-15',
                'status'               => 'Draft',
                'progress_description' => 'تم استكمال تحديد الأولويات بالتعاون مع فريق التطوير المدرسي بمدرسة بلقيس.',
            ]
        );

        // -------------------------------------------------------------
        // نتائج مدرسة الفاروق (بدرجات مختلفة 1 و 2)
        // -------------------------------------------------------------
        foreach ($indicators as $idx => $ind) {
            $score = ($idx === 0) ? 1 : 2;
            $descriptor = IndicatorScoreDescriptor::where('indicator_id', $ind->indicator_id)
                ->where('score_level_id', $score + 1)
                ->first();

            $res = EvaluationResult::updateOrCreate(
                [
                    'evaluation_id' => $evalFarouq->evaluation_id,
                    'indicator_id'  => $ind->indicator_id,
                ],
                [
                    'score_descriptor_id' => $descriptor?->descriptor_id ?? 1,
                    'standard_version_id' => $cycle->version_id,
                    'evaluator_user_id'   => $evaluatorFarouq->user_id,
                    'score'               => $score,
                    'textual_result'      => "تقييم أولي خاص بمدرسة الفاروق الأساسية للمؤشر ({$ind->code}): تحقق جزئي وتوجد حاجة لتعزيز الوسائل التعليمية والمعامل.",
                    'completion_status'   => 'Completed',
                ]
            );

            // مستند وشاهد إثبات لمدرسة الفاروق (المعمارية الجديدة U-24)
            $docFarouq = SchoolDocument::updateOrCreate(
                [
                    'school_id' => $schoolFarouq->school_id,
                    'title'     => "وثائق شواهد مدرسة الفاروق — {$ind->code}",
                ],
                [
                    'description'        => 'محاضر اجتماعات المجالس المدرسية ولجان الجودة بمدرسة الفاروق بتعز.',
                    'document_type'      => 'minutes',
                    'created_by_user_id' => $evaluatorFarouq->user_id,
                ]
            );

            $docVerFarouq = DocumentVersion::updateOrCreate(
                [
                    'school_document_id' => $docFarouq->id,
                    'version_no'         => 1,
                ],
                [
                    'school_id'   => $schoolFarouq->school_id,
                    'is_current'  => true,
                    'file_name'   => "farouq_evidence_{$ind->code}.pdf",
                    'storage_uri' => "documents/{$schoolFarouq->school_id}/farouq_evidence_{$ind->code}.pdf",
                    'file_size'   => 1024,
                    'mime_type'   => 'application/pdf',
                ]
            );

            EvidenceLink::updateOrCreate(
                [
                    'evaluation_id'       => $evalFarouq->evaluation_id,
                    'indicator_id'        => $ind->indicator_id,
                    'document_version_id' => $docVerFarouq->id,
                ],
                [
                    'school_id'            => $schoolFarouq->school_id,
                    'evaluation_result_id' => $res->result_id,
                    'justification'        => 'شواهد أولية جاري استكمالها قبل الموعد النهائي.',
                    'status'               => 'draft',
                ]
            );
        }

        // خطة تحسين لمدرسة الفاروق
        ImprovementPlan::updateOrCreate(
            [
                'cycle_id'  => $cycle->cycle_id,
                'school_id' => $schoolFarouq->school_id,
            ],
            [
                'created_by_user_id'   => $evaluatorFarouq->user_id,
                'title'                => 'خطة التحسين والتطوير لمدرسة الفاروق الأساسية (تعز)',
                'start_date'           => '2026-03-01',
                'end_date'             => '2026-06-30',
                'status'               => 'Draft',
                'progress_description' => 'جاري حصر الفجوات في البنية التحتية والوسائل التعليمية بمدرسة الفاروق.',
            ]
        );
    }
}
