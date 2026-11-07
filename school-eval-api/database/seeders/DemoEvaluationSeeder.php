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
use App\Models\Notification;
use App\Models\PlanImprovementArea;
use App\Models\School;
use App\Models\SchoolDocument;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

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
        EvidenceLink::where('school_id', $schoolBelqees->school_id)->delete();
        EvaluationResult::where('evaluation_id', $evalBelqees->evaluation_id)->delete();
        $belqeesDocIds = SchoolDocument::where('school_id', $schoolBelqees->school_id)->pluck('id');
        DocumentVersion::whereIn('school_document_id', $belqeesDocIds)->delete();
        SchoolDocument::where('school_id', $schoolBelqees->school_id)->delete();

        $belqeesPlans = ImprovementPlan::where('school_id', $schoolBelqees->school_id)->get();
        foreach ($belqeesPlans as $p) {
            ImprovementAction::where('plan_id', $p->plan_id)->delete();
            PlanImprovementArea::where('plan_id', $p->plan_id)->delete();
            $p->delete();
        }

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

        // تنظيف قديم لمدرسة الفاروق لإعادة البناء المنضبط
        EvidenceLink::where('school_id', $schoolFarouq->school_id)->delete();
        EvaluationResult::where('evaluation_id', $evalFarouq->evaluation_id)->delete();
        $farouqDocIds = SchoolDocument::where('school_id', $schoolFarouq->school_id)->pluck('id');
        DocumentVersion::whereIn('school_document_id', $farouqDocIds)->delete();
        SchoolDocument::where('school_id', $schoolFarouq->school_id)->delete();

        $farouqPlans = ImprovementPlan::where('school_id', $schoolFarouq->school_id)->get();
        foreach ($farouqPlans as $p) {
            ImprovementAction::where('plan_id', $p->plan_id)->delete();
            PlanImprovementArea::where('plan_id', $p->plan_id)->delete();
            $p->delete();
        }

        // أ. رصد 42 مؤشراً بدرجات متنوعة (20 بدرجة 3، 14 بدرجة 2، 5 بدرجة 1، 3 بدرجة 0)
        $allIndicators = Indicator::orderBy('indicator_id')->get();
        $targetScores = array_merge(
            array_fill(0, 20, 3), // 20 مؤشراً بدرجة 3
            array_fill(0, 14, 2), // 14 مؤشراً بدرجة 2
            array_fill(0, 5, 1),  // 5 مؤشرات بدرجة 1
            array_fill(0, 3, 0)   // 3 مؤشرات بدرجة 0
        );

        $lowScoreResults = [];
        $ratedResults = [];

        foreach ($targetScores as $idx => $score) {
            if (!isset($allIndicators[$idx])) break;
            $ind = $allIndicators[$idx];

            $descriptor = IndicatorScoreDescriptor::where('indicator_id', $ind->indicator_id)
                ->where('score_level_id', $score + 1)
                ->first();

            $justification = match ($score) {
                3 => "تم استيفاء متطلبات المؤشر ({$ind->code}) بالكامل وتوثيقها بملفات الجودة والمحاضر الرسمية لعام 2026.",
                2 => "تحقق جيد للمؤشر ({$ind->code}) مع وجود فرص للتحسين في جانب المتابعة الدورية وتفعيل السجلات.",
                1 => "تحقق جزئي للمؤشر ({$ind->code}) وتوجد فجوات في التجهيزات والمستلزمات تتطلب خطة تدخل عاجلة.",
                0 => "غير متوفر حالياً للمؤشر ({$ind->code})؛ يتطلب مبادرة تأسيسية وتوفير متطلبات البنية واللائحة المنظمة.",
            };

            $res = EvaluationResult::create([
                'evaluation_id'       => $evalFarouq->evaluation_id,
                'indicator_id'        => $ind->indicator_id,
                'score_descriptor_id' => $descriptor?->descriptor_id ?? 1,
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

        // ب. إنشاء 8 وثائق مدرسية في school_documents و document_versions
        $documentTemplates = [
            [
                'title' => 'الخطة الاستراتيجية والتشغيلية السنوية لمدرسة الفاروق (2026/2027)',
                'type'  => 'plan',
                'desc'  => 'الخطة العامة المعتمدة من مجلس إدارة المدرسة ومكتب التربية بالمحافظة.',
                'file'  => 'farouq_operational_plan_2026.pdf',
            ],
            [
                'title' => 'اللائحة التنظيمية وقواعد الانضباط المدرسي المعتمدة',
                'type'  => 'policy',
                'desc'  => 'ميثاق السلوك الطلابي وإجراءات ضبط العملية التعليمية وحماية البيئة المدرسية.',
                'file'  => 'farouq_school_code_of_conduct.pdf',
            ],
            [
                'title' => 'محاضر اجتماعات مجلس الآباء والمعلمين الدورية',
                'type'  => 'minutes',
                'desc'  => 'توثيق مشاركات المجتمع المحلي ومناقشات تطوير مستوى التحصيل العلمي للطلبة.',
                'file'  => 'farouq_pt_council_minutes_2026.pdf',
            ],
            [
                'title' => 'خطة الأمن والسلامة وإجراءات الإخلاء للطوارئ المدرسية',
                'type'  => 'report',
                'desc'  => 'تقرير التفتيش الميداني على مخارج الطوارئ ومعدات الإطفاء وتدريب الطلاب.',
                'file'  => 'farouq_safety_and_evacuation_report.pdf',
            ],
            [
                'title' => 'سجلات تقييم الأداء التدريسي والزيارات الصفية للمعلمين',
                'type'  => 'record',
                'desc'  => 'بطاقات الملاحظة الصفية المعتمدة من الموجه التربوي ومدير المدرسة.',
                'file'  => 'farouq_teacher_evaluation_records.pdf',
            ],
            [
                'title' => 'سجل خطط الأنشطة اللاصفية والمسابقات الثقافية والرياضية',
                'type'  => 'record',
                'desc'  => 'جداول البرامج الإذاعية المدرسية والمعارض والمسابقات الطلابية للعام الحالي.',
                'file'  => 'farouq_extracurricular_activities_log.pdf',
            ],
            [
                'title' => 'كشوفات الصيانة الوقائية للمختبرات وقاعات الحاسوب المدرسي',
                'type'  => 'record',
                'desc'  => 'محاضر فحص الأجهزة التعليمية وصيانة الوسائل والمختبر المدرسي.',
                'file'  => 'farouq_lab_maintenance_checks.pdf',
            ],
            [
                'title' => 'التقرير المالي والموازنة التشغيلية لمشاريع التطوير المدرسي',
                'type'  => 'financial',
                'desc'  => 'كشف الإيرادات والمصروفات المخصصة لتحسين البيئة المدرسية وصيانة المرافق.',
                'file'  => 'farouq_financial_summary_2026.pdf',
            ],
        ];

        $createdVersions = [];
        foreach ($documentTemplates as $idx => $t) {
            $doc = SchoolDocument::create([
                'school_id'          => $schoolFarouq->school_id,
                'title'              => $t['title'],
                'document_type'      => $t['type'],
                'description'        => $t['desc'],
                'created_by_user_id' => $evaluatorFarouq->user_id,
            ]);

            $ver = DocumentVersion::create([
                'school_document_id' => $doc->id,
                'version_no'         => 1,
                'school_id'          => $schoolFarouq->school_id,
                'is_current'         => true,
                'file_name'          => $t['file'],
                'storage_uri'        => "documents/{$schoolFarouq->school_id}/{$t['file']}",
                'file_size'          => 2048 * (1 + $idx),
                'mime_type'          => 'application/pdf',
            ]);

            $createdVersions[] = $ver;
        }

        // ج. إنشاء 18 رابط شاهد تقييمي في evidence_links
        $linkCount = min(18, count($ratedResults));
        for ($i = 0; $i < $linkCount; $i++) {
            $item = $ratedResults[$i];
            $ver = $createdVersions[$i % count($createdVersions)];

            EvidenceLink::create([
                'evaluation_id'        => $evalFarouq->evaluation_id,
                'indicator_id'         => $item['indicator']->indicator_id,
                'document_version_id'  => $ver->id,
                'school_id'            => $schoolFarouq->school_id,
                'evaluation_result_id' => $item['result']->result_id,
                'justification'        => "تم استيفاء وتوثيق الشاهد عبر الوثيقة الرسمية ({$ver->file_name}) المعتمدة لعام 2026.",
                'status'               => ($i % 3 === 0) ? 'draft' : 'completed',
            ]);
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

        // ز. إشعارات حقيقية للمستخدمين
        $notificationData = [
            [
                'user'  => $evaluatorFarouq,
                'title' => 'بدء دورة التقييم الذاتي للعام 2026/2027',
                'msg'   => 'تم فتح دورة التقييم رسمياً من قبل الإشراف الوزاري. يرجى استكمال رصد المؤشرات المتبقية وإيداع الشواهد.',
                'type'  => 'cycle_opened',
                'read'  => false,
            ],
            [
                'user'  => $evaluatorFarouq,
                'title' => 'تنبيه: مؤشرات معيار البيئة المدرسية بحاجة لشواهد إضافية',
                'msg'   => 'لوحظ وجود 3 مؤشرات في معيار البيئة والسلامة بانتظار رفع محاضر الفحص الدوري.',
                'type'  => 'evidence_needed',
                'read'  => false,
            ],
            [
                'user'  => $principalFarouq,
                'title' => 'اكتمال صياغة مسودة خطة التحسين المدرسي',
                'msg'   => 'أنهى مقيم الجودة إعداد مسودة خطة التحسين ومصفوفة الإجراءات الخمسة، بانتظار مراجعة الإدارة واعتماد الملاحظات.',
                'type'  => 'plan_ready',
                'read'  => true,
            ],
            [
                'user'  => $principalFarouq,
                'title' => 'تقرير المراجعة الداخلية السنوي جاهز للمعاينة',
                'msg'   => 'يمكنك الاطلاع على مسودة تقرير التقييم الذاتي من تبويب المراجعة الداخلية وتدوين ملاحظات مدير المدرسة.',
                'type'  => 'report_review',
                'read'  => false,
            ],
        ];

        foreach ($notificationData as $n) {
            Notification::create([
                'recipient_user_id'   => $n['user']->user_id,
                'title'               => $n['title'],
                'message'             => $n['msg'],
                'type'                => $n['type'],
                'related_entity_type' => 'Evaluation',
                'related_entity_id'   => $evalFarouq->evaluation_id,
                'is_read'             => $n['read'],
                'read_at'             => $n['read'] ? now() : null,
                'created_at'          => now()->subHours(rand(1, 24)),
            ]);
        }
    }
}
