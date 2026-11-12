<?php

namespace Database\Seeders;

use App\Models\DocumentVersion;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\EvaluationResult;
use App\Models\EvidenceLink;
use App\Models\ImprovementAction;
use App\Models\ImprovementArea;
use App\Models\ImprovementPlan;
use App\Models\Indicator;
use App\Models\IndicatorScoreDescriptor;
use App\Models\Note;
use App\Models\EvaluationResultVerificationMethod;
use App\Models\Notification;
use App\Models\PlanImprovementArea;
use App\Models\PlanReviewNote;
use App\Models\School;
use App\Models\SchoolDocument;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

/**
 * Seeder اختباري لتهيئة بيانات التقييم الحي لمدرسة الفاروق (مكتملة وقابلة للتعديل)
 * ومدرسة بلقيس (فارغة لاختبار Empty States) وفق متطلبات الجودة والأمان الصارم لكلمات المرور.
 */
class DemoEvaluationSeeder extends Seeder
{
    public function run(): void
    {
        $cycle = EvaluationCycle::where('status', 'Active')->first() ?? EvaluationCycle::firstOrFail();

        $schoolBelqees = School::where('identification_data', 'SCH-AMANA-2026-001')
            ->orWhere('school_name', 'like', '%بلقيس%')
            ->firstOrFail();

        $schoolFarouq = School::where('identification_data', 'SCH-TAIZ-2026-001')
            ->orWhere('school_name', 'like', '%الفاروق%')
            ->firstOrFail();

        $evaluatorBelqees = User::where('username', 'quality_belqees')->firstOrFail();
        $principalBelqees = User::where('username', 'principal_belqees')->firstOrFail();
        $evaluatorFarouq  = User::where('username', 'quality_farouq')->firstOrFail();
        $principalFarouq  = User::where('username', 'principal_farouq')->firstOrFail();

        // تحديث كلمات مرور حسابات الاختبار برمز بيئة آمن مخصص للتطوير دون أي بيانات حساسة
        $devSafePassword = env('SEED_DEFAULT_PASSWORD', 'DevTestPassword2026!');
        $safeHash = Hash::make($devSafePassword);

        foreach ([$evaluatorBelqees, $principalBelqees, $evaluatorFarouq, $principalFarouq] as $u) {
            $u->password_hash = $safeHash;
            $u->status = 'Active';
            $u->save();
        }

        // =========================================================================
        // 1. مدرسة بلقيس الثانوية للبنات — أمانة العاصمة (الحالة الفارغة النظيفة)
        // =========================================================================
        $evalBelqees = Evaluation::firstOrCreate(
            [
                'cycle_id'  => $cycle->cycle_id,
                'school_id' => $schoolBelqees->school_id,
            ],
            [
                'created_by_user_id' => $evaluatorBelqees->user_id,
                'status'             => 'InProgress',
            ]
        );

        // تصفير أي شواهد أو نتائج أو خطط لمدرسة بلقيس لضمان Empty State نظيف 100%
        $this->cleanSchoolEvaluationData((int) $schoolBelqees->school_id, (int) $evalBelqees->evaluation_id);

        // =========================================================================
        // 2. مدرسة الفاروق الأساسية للبنين — تعز (بيانات كاملة وجاهزة للاختبار)
        // =========================================================================
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

        // تنظيف قديم لمدرسة الفاروق لإعادة البناء المنضبط وفق ترتيب المفاتيح الأجنبية
        $this->cleanSchoolEvaluationData((int) $schoolFarouq->school_id, (int) $evalFarouq->evaluation_id);

        // أ. رصد كافة المؤشرات الـ 109 بدرجات متنوعة (62 بدرجة 3، 32 بدرجة 2، 10 بدرجة 1، 5 بدرجة 0)
        $allIndicators = Indicator::orderBy('indicator_id')->get();

        $lowScoreResults = [];
        $ratedResults = [];

        foreach ($allIndicators as $idx => $ind) {
            // توزيع واقعي ومدروس للمستويات الأربعة عبر كافة المجالات السبعة
            if ($idx % 22 === 0) {
                $score = 0; // 5 مؤشرات غير مفعلة / فجوة حرجة
            } elseif ($idx % 10 === 0) {
                $score = 1; // 10 مؤشرات بمستوى محدود
            } elseif ($idx % 3 === 0) {
                $score = 2; // 32 مؤشراً بمستوى كافٍ
            } else {
                $score = 3; // 62 مؤشراً بمستوى متقدم
            }

            $descriptor = IndicatorScoreDescriptor::where('indicator_id', $ind->indicator_id)
                ->where('score_level_id', $score + 1)
                ->first()
                ?? IndicatorScoreDescriptor::where('indicator_id', $ind->indicator_id)->first()
                ?? IndicatorScoreDescriptor::first();

            $justification = match ($score) {
                3 => "تم استيفاء متطلبات المؤشر ({$ind->code}) بالكامل وتوثيقها بملفات الجودة والمحاضر الرسمية لعام 2026.",
                2 => "تحقق جيد للمؤشر ({$ind->code}) مع وجود فرص للتحسين في جانب المتابعة الدورية وتفعيل السجلات.",
                1 => "تحقق جزئي للمؤشر ({$ind->code}) وتوجد فجوات في التجهيزات والمستلزمات تتطلب خطة تدخل عاجلة.",
                0 => "غير متوفر حالياً للمؤشر ({$ind->code})؛ يتطلب مبادرة تأسيسية وتوفير متطلبات البنية واللائحة المنظمة.",
            };

            $res = EvaluationResult::create([
                'evaluation_id'       => $evalFarouq->evaluation_id,
                'indicator_id'        => $ind->indicator_id,
                'score_descriptor_id' => $descriptor->descriptor_id,
                'standard_version_id' => $cycle->version_id,
                'evaluator_user_id'   => $evaluatorFarouq->user_id,
                'score'               => $score,
                'textual_result'      => $justification,
                'completion_status'   => 'Completed',
            ]);

            $ratedResults[] = ['result' => $res, 'indicator' => $ind, 'score' => $score];
            if ($score <= 1) {
                $lowScoreResults[] = ['result' => $res, 'indicator' => $ind];
            }
        }

        // ب. إنشاء وثائق مدرسية واقعية تغطي كافة المتطلبات الوطنية الـ 278 عبر الـ 109 مؤشراً (159 وثيقة أصيلة)
        $samplePdfContent = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n";

        $docIndex = 0;
        foreach ($ratedResults as $item) {
            $indicator = $item['indicator'];
            $result = $item['result'];
            $reqs = $indicator->evidenceRequirements()->orderBy('requirement_id')->get();
            if ($reqs->isEmpty()) {
                continue;
            }

            // تقسيم المتطلبات إلى وثيقة أو وثيقتين واقعيتين للمؤشر
            $primaryReqs = [];
            $secondaryReqs = [];

            if ($reqs->count() === 1) {
                $primaryReqs = [$reqs[0]];
            } elseif ($reqs->count() === 2) {
                $r1 = $reqs[0];
                $r2 = $reqs[1];
                $isBoard1 = str_contains($r1->title, 'لوحة') || str_contains($r1->title, 'صورة');
                $isBoard2 = str_contains($r2->title, 'لوحة') || str_contains($r2->title, 'صورة');
                if ($isBoard1 !== $isBoard2) {
                    $primaryReqs = [$r1];
                    $secondaryReqs = [$r2];
                } else {
                    $primaryReqs = [$r1, $r2];
                }
            } else {
                $primaryReqs = [$reqs[0], $reqs[1]];
                for ($k = 2; $k < $reqs->count(); $k++) {
                    $secondaryReqs[] = $reqs[$k];
                }
            }

            $docGroups = array_filter([$primaryReqs, $secondaryReqs]);

            foreach ($docGroups as $group) {
                $docIndex++;
                $titleParts = array_map(function ($r) {
                    $t = trim($r->title);
                    $t = preg_replace('/^وثيقة\s+/u', '', $t);
                    $t = preg_replace('/^نسخة\s+(من\s+)?/u', '', $t);
                    return $t;
                }, $group);
                $combinedTitle = implode(' و', array_unique($titleParts));

                $cleanTitle = $combinedTitle;
                if (!preg_match('/^(محضر|سجل|خطة|تقرير|دليل|كشف|لوحة|قائمة|ملف|استمارة|استبانة|مصفوفة|ميثاق|برنامج|جدول)/u', $cleanTitle)) {
                    $cleanTitle = "ملف وثائقي: " . $cleanTitle;
                }
                $cleanTitle .= " لمدرسة الفاروق (2026/2027)";

                $docType = 'record';
                if (preg_match('/(محضر|اجتماع)/u', $cleanTitle)) {
                    $docType = 'minutes';
                } elseif (preg_match('/(خطة|برنامج)/u', $cleanTitle)) {
                    $docType = 'plan';
                } elseif (preg_match('/(تقرير|تحليل|استبانة|نتائج)/u', $cleanTitle)) {
                    $docType = 'report';
                } elseif (preg_match('/(لوحة|صورة)/u', $cleanTitle)) {
                    $docType = 'board';
                } elseif (preg_match('/(دليل|لائحة|ميثاق|سياسة)/u', $cleanTitle)) {
                    $docType = 'policy';
                }

                $doc = SchoolDocument::create([
                    'school_id'          => $schoolFarouq->school_id,
                    'title'              => $cleanTitle,
                    'document_type'      => $docType,
                    'description'        => "شاهد توثيقي رسمي معتمد يغطي متطلبات مؤشر ({$indicator->code}: {$indicator->name}) لمدرسة الفاروق.",
                    'created_by_user_id' => $evaluatorFarouq->user_id,
                ]);

                // لأول 3 مستندات: إنشاء نسخة أرشيفية قديمة (v1) لإثبات واختبار تبويب الإصدارات والنسخ القديمة
                if ($docIndex <= 3) {
                    $oldFileName = "farouq_doc_{$doc->id}_v1.pdf";
                    DocumentVersion::create([
                        'school_document_id' => $doc->id,
                        'version_no'         => 1,
                        'school_id'          => $schoolFarouq->school_id,
                        'is_current'         => false,
                        'file_name'          => $oldFileName,
                        'storage_uri'        => "documents/{$schoolFarouq->school_id}/{$oldFileName}",
                        'file_size'          => 1024 * 1024 * 2, // 2MB
                        'mime_type'          => 'application/pdf',
                        'notes'              => 'المسودة الأولى قبل التعديل والاعتماد النهائي (نسخة أرشيفية سابقة)',
                    ]);
                    Storage::disk('local')->put("documents/{$schoolFarouq->school_id}/{$oldFileName}", $samplePdfContent);

                    $currentVersionNo = 2;
                } else {
                    $currentVersionNo = 1;
                }

                $cleanCode = str_replace(['-', '.'], '_', $indicator->code);
                $curFileName = "farouq_ind_{$cleanCode}_doc_{$doc->id}_v{$currentVersionNo}.pdf";
                $fileSize = 1024 * 512 + (($docIndex * 43) % 2500) * 1024;

                $ver = DocumentVersion::create([
                    'school_document_id' => $doc->id,
                    'version_no'         => $currentVersionNo,
                    'school_id'          => $schoolFarouq->school_id,
                    'is_current'         => true,
                    'file_name'          => $curFileName,
                    'storage_uri'        => "documents/{$schoolFarouq->school_id}/{$curFileName}",
                    'file_size'          => $fileSize,
                    'mime_type'          => 'application/pdf',
                    'notes'              => 'الإصدار المعتمد للشاهد التوثيقي لعام 2026',
                ]);
                Storage::disk('local')->put("documents/{$schoolFarouq->school_id}/{$curFileName}", $samplePdfContent);

                // ربط الشاهد حصرياً بالمؤشر والمتطلبات المحددة
                $reqIds = array_map(fn($r) => $r->requirement_id, $group);
                EvidenceLink::create([
                    'evaluation_id'        => $evalFarouq->evaluation_id,
                    'indicator_id'         => $indicator->indicator_id,
                    'document_version_id'  => $ver->id,
                    'school_id'            => $schoolFarouq->school_id,
                    'evaluation_result_id' => $result->result_id,
                    'justification'        => "شاهد توثيقي رسمي معتمد يغطي متطلبات (" . implode('، ', $titleParts) . ") لمؤشر ({$indicator->code}) لعام 2026/2027.",
                    'covered_requirements' => $reqIds,
                    'status'               => 'completed',
                ]);
            }
        }

        // د. خطة تحسين سنوية منشأة
        $plan = ImprovementPlan::create([
            'school_id'            => $schoolFarouq->school_id,
            'cycle_id'             => $cycle->cycle_id,
            'title'                => 'خطة التحسين والتطوير لمدرسة الفاروق 2026/2027',
            'plan_type'            => ImprovementPlan::TYPE_QUALITY_IMPROVEMENT,
            'start_date'           => now()->startOfMonth()->toDateString(),
            'end_date'             => now()->addMonths(6)->endOfMonth()->toDateString(),
            'status'               => 'Draft',
            'progress_description' => 'جاري مراجعة الإجراءات ومتابعة تخصيص الموارد لتنفيذ بنود خطة التحسين.',
            'created_by_user_id'   => $evaluatorFarouq->user_id,
        ]);

        // هـ. 4 مجالات تحسين منبثقة عن المؤشرات المتدنية
        $areaDefs = [
            ['name' => 'تطوير معمل الحاسوب وتجهيزات التقنية التعليمية', 'priority' => 'High', 'target' => 3],
            ['name' => 'تعزيز منظومة الأمن والسلامة وتدريب فرق الطوارئ', 'priority' => 'Critical', 'target' => 3],
            ['name' => 'تنفيذ برامج علاجية للطلبة ذوي صعوبات التعلم', 'priority' => 'Medium', 'target' => 2],
            ['name' => 'تفعيل لجان الشراكة المجتمعية ومجلس الآباء والمعلمين', 'priority' => 'Medium', 'target' => 2],
        ];

        $createdAreas = [];
        foreach ($areaDefs as $i => $aDef) {
            $linkedRes = $lowScoreResults[$i] ?? null;
            $area = ImprovementArea::create([
                'result_id'    => $linkedRes ? $linkedRes['result']->result_id : null,
                'indicator_id' => $linkedRes ? $linkedRes['indicator']->indicator_id : null,
                'name'         => $aDef['name'],
                'priority'     => $aDef['priority'],
                'target_score' => $aDef['target'],
                'description'  => "مجال تحسين ذو أولوية للعام الدراسي لرفع مستوى الأداء المؤسسي.",
            ]);

            PlanImprovementArea::create([
                'plan_id' => $plan->plan_id,
                'area_id' => $area->area_id,
            ]);

            $createdAreas[] = $area;
        }

        // و. 5 إجراءات تنفيذية في improvement_actions
        $actionsData = [
            [
                'title'  => 'تجهيز قاعة الحاسوب بـ 15 جهازاً حديثاً مع شبكة محلية',
                'leader' => 'أ. سمير الجبلي — مسؤول التقنية',
                'status' => 'InProgress',
                'pct'    => 40,
                'area'   => $createdAreas[0],
            ],
            [
                'title'  => 'صيانة مخارج الطوارئ وتركيب 10 طفايات حريق إضافية مع لوحات إرشادية',
                'leader' => 'أ. مروان الصلوي — مسؤول السلامة',
                'status' => 'Done',
                'pct'    => 100,
                'area'   => $createdAreas[1],
            ],
            [
                'title'  => 'تنظيم برنامج علاجي للطلبة الضعاف في مادتي العلوم والرياضيات',
                'leader' => 'أ. أحمد الهاشمي — المشرف الأكاديمي',
                'status' => 'InProgress',
                'pct'    => 60,
                'area'   => $createdAreas[2],
            ],
            [
                'title'  => 'عقد ورشة تدريبية لمعلمي المدرسة في استراتيجيات التعلم النشط',
                'leader' => 'أ. رضوان القادري — مدرب الجودة',
                'status' => 'Done',
                'pct'    => 100,
                'area'   => $createdAreas[0],
            ],
            [
                'title'  => 'تشكيل لجان العمل التطوعي المشتركة مع أولياء الأمور لتشجير المدرسة',
                'leader' => 'أ. طارق العديني — الأخصائي الاجتماعي',
                'status' => 'InProgress',
                'pct'    => 30,
                'area'   => $createdAreas[3],
            ],
        ];

        foreach ($actionsData as $act) {
            ImprovementAction::create([
                'plan_id'                        => $plan->plan_id,
                'area_id'                        => $act['area']->area_id,
                'title'                          => $act['title'],
                'responsible_person_description' => $act['leader'],
                'start_date'                     => now()->toDateString(),
                'due_date'                       => now()->addMonths(2)->toDateString(),
                'status'                         => $act['status'],
                'completion_percentage'          => $act['pct'],
                'progress_description'           => "إجراء معتمد قيد المتابعة وفق الجدول الزمني للخطة.",
            ]);
        }

        // ز. إشعارات حقيقية للمستخدمين متوافقة مع الحالة الفعلية دون تكرار (الملاحظة 2)
        Notification::whereIn('recipient_user_id', [$evaluatorFarouq->user_id, $principalFarouq->user_id])
            ->where('related_entity_id', $evalFarouq->evaluation_id)
            ->delete();

        $notificationData = [
            [
                'user'  => $evaluatorFarouq,
                'title' => 'انطلاق دورة التقييم الذاتي للعام 2026/2027',
                'msg'   => 'تم تفعيل الإصدار المعياري المعتمد (109 مؤشرات) وفتح ملف التقييم الذاتي لمدرسة الفاروق.',
                'type'  => 'cycle_launched',
                'read'  => true,
                'entity'=> 'cycle',
            ],
            [
                'user'  => $evaluatorFarouq,
                'title' => 'اكتمال رصد جميع المؤشرات الوطنية وتغطية الشواهد (109/109)',
                'msg'   => 'تم رصد كافة مؤشرات الأداء الـ 109 وربطها بالشواهد الموثقة في المستودع بنجاح؛ يمكنك مراجعة الختم الرقمي وخطة التحسين.',
                'type'  => 'version_activated',
                'read'  => false,
                'entity'=> 'standard_version',
            ],
            [
                'user'  => $evaluatorFarouq,
                'title' => 'متابعة جدول تنفيذ إجراءات خطة التحسين المدرسي',
                'msg'   => 'تم رصد 15 مؤشراً من المستويين (0 و 1) وإدراج خطة التحسين بإجراءاتها الخمسة، يرجى متابعة نسب الإنجاز.',
                'type'  => 'action_due_soon',
                'read'  => false,
                'entity'=> 'improvement_action',
            ],
            [
                'user'  => $principalFarouq,
                'title' => 'اكتمال صياغة مسودة خطة التحسين المدرسي',
                'msg'   => 'أنهى مقيم الجودة إعداد مسودة خطة التحسين ومصفوفة الإجراءات الخمسة، بانتظار مراجعة الإدارة واعتماد الملاحظات.',
                'type'  => 'plan_ready',
                'read'  => true,
                'entity'=> 'improvement_action',
            ],
            [
                'user'  => $principalFarouq,
                'title' => 'ملف التقييم الذاتي جاهز للمراجعة الداخلية والاعتماد',
                'msg'   => 'يمكنك استعراض النتائج الكاملة (109/109) من تبويب المراجعة والاعتماد وتدوين ملاحظات مدير المدرسة.',
                'type'  => 'report_review',
                'read'  => false,
                'entity'=> 'Evaluation',
            ],
        ];

        foreach ($notificationData as $idx => $n) {
            Notification::create([
                'recipient_user_id'   => $n['user']->user_id,
                'title'               => $n['title'],
                'message'             => $n['msg'],
                'type'                => $n['type'],
                'related_entity_type' => $n['entity'],
                'related_entity_id'   => $evalFarouq->evaluation_id,
                'is_read'             => $n['read'],
                'read_at'             => $n['read'] ? now()->subHours(2) : null,
                'created_at'          => now()->subHours(($idx + 1) * 3),
            ]);
        }
    }

    /**
     * تنظيف آمن لبيانات التقييم والخطط والوثائق الخاصة بمدرسة دون خرق قيود المفاتيح الأجنبية
     * عند اشتراك أكثر من خطة تحسين في نفس مجال التحسين.
     */
    private function cleanSchoolEvaluationData(int $schoolId, int $evaluationId): void
    {
        EvidenceLink::where('school_id', $schoolId)->delete();

        $planIds = ImprovementPlan::where('school_id', $schoolId)->pluck('plan_id');
        if ($planIds->isNotEmpty()) {
            PlanReviewNote::whereIn('plan_id', $planIds)->delete();
            ImprovementAction::whereIn('plan_id', $planIds)->delete();
            $areaIdsFromPlans = PlanImprovementArea::whereIn('plan_id', $planIds)->pluck('area_id');
            PlanImprovementArea::whereIn('plan_id', $planIds)->delete();
            ImprovementPlan::whereIn('plan_id', $planIds)->delete();

            if ($areaIdsFromPlans->isNotEmpty()) {
                ImprovementArea::whereIn('area_id', $areaIdsFromPlans)
                    ->whereNotIn('area_id', PlanImprovementArea::query()->select('area_id'))
                    ->delete();
            }
        }

        // تنظيف أي مجالات أو ملاحظات أو أساليب تحقق تابعة لنتائج التقييم
        $resultIds = EvaluationResult::where('evaluation_id', $evaluationId)->pluck('result_id');
        if ($resultIds->isNotEmpty()) {
            Note::whereIn('result_id', $resultIds)->delete();
            EvaluationResultVerificationMethod::whereIn('evaluation_result_id', $resultIds)->delete();
            ImprovementArea::whereIn('result_id', $resultIds)
                ->whereNotIn('area_id', PlanImprovementArea::query()->select('area_id'))
                ->delete();
        }

        EvaluationResult::where('evaluation_id', $evaluationId)->delete();

        $docIds = SchoolDocument::where('school_id', $schoolId)->pluck('id');
        if ($docIds->isNotEmpty()) {
            DocumentVersion::whereIn('school_document_id', $docIds)->delete();
            SchoolDocument::whereIn('id', $docIds)->delete();
        }
    }
}
