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
        $belqeesPlans = ImprovementPlan::where('school_id', $schoolBelqees->school_id)->get();
        foreach ($belqeesPlans as $p) {
            ImprovementAction::where('plan_id', $p->plan_id)->delete();
            $areaIds = PlanImprovementArea::where('plan_id', $p->plan_id)->pluck('area_id');
            PlanImprovementArea::where('plan_id', $p->plan_id)->delete();
            ImprovementArea::whereIn('area_id', $areaIds)->delete();
            $p->delete();
        }
        EvaluationResult::where('evaluation_id', $evalBelqees->evaluation_id)->delete();
        $belqeesDocIds = SchoolDocument::where('school_id', $schoolBelqees->school_id)->pluck('id');
        DocumentVersion::whereIn('school_document_id', $belqeesDocIds)->delete();
        SchoolDocument::where('school_id', $schoolBelqees->school_id)->delete();

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
        EvidenceLink::where('school_id', $schoolFarouq->school_id)->delete();
        $farouqPlans = ImprovementPlan::where('school_id', $schoolFarouq->school_id)->get();
        foreach ($farouqPlans as $p) {
            ImprovementAction::where('plan_id', $p->plan_id)->delete();
            $areaIds = PlanImprovementArea::where('plan_id', $p->plan_id)->pluck('area_id');
            PlanImprovementArea::where('plan_id', $p->plan_id)->delete();
            ImprovementArea::whereIn('area_id', $areaIds)->delete();
            $p->delete();
        }
        EvaluationResult::where('evaluation_id', $evalFarouq->evaluation_id)->delete();
        $farouqDocIds = SchoolDocument::where('school_id', $schoolFarouq->school_id)->pluck('id');
        DocumentVersion::whereIn('school_document_id', $farouqDocIds)->delete();
        SchoolDocument::where('school_id', $schoolFarouq->school_id)->delete();

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

        // ب. إنشاء 20 وثيقة مدرسية معتمدة تغطي كافة المجالات المعيارية
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
            [
                'title' => 'دليل الإرشاد التربوي والنفسي ورعاية الفئات الخاصة',
                'type'  => 'policy',
                'desc'  => 'برامج الدعم النفسي والاجتماعي ومتابعة الحالات السلوكية وصعوبات التعلم.',
                'file'  => 'farouq_counseling_and_special_needs_guide.pdf',
            ],
            [
                'title' => 'الخطة العلاجية والبرامج الإثرائية لتحسين التحصيل العلمي',
                'type'  => 'plan',
                'desc'  => 'كشوفات نتائج الاختبارات التشخيصية وخطط تحسين مستويات الطلبة الضعاف.',
                'file'  => 'farouq_remedial_and_enrichment_plans.pdf',
            ],
            [
                'title' => 'تقرير التدقيق الداخلي ومطابقة معايير الجودة والاعتماد',
                'type'  => 'report',
                'desc'  => 'محضر اجتماع لجنة التقييم الذاتي واعتماد حزم الشواهد المرفوعة.',
                'file'  => 'farouq_internal_quality_audit_2026.pdf',
            ],
            [
                'title' => 'سجل الدورات التدريبية والتطوير المهني للكوادر التعليمية',
                'type'  => 'record',
                'desc'  => 'بيانات الورش التدريبية المنفذة في استراتيجيات التدريس الحديثة والإدارة الصفية.',
                'file'  => 'farouq_staff_professional_development.pdf',
            ],
            [
                'title' => 'دليل وسياسات إدارة البيئة المدرسية والمرافق الصحية',
                'type'  => 'policy',
                'desc'  => 'تعليمات النظافة العامة ومتابعة المقصف المدرسي وجودة مياه الشرب.',
                'file'  => 'farouq_hygiene_and_facilities_policy.pdf',
            ],
            [
                'title' => 'تقرير تحليل نتائج الاختبارات الدورية والنهائية ونسب النجاح',
                'type'  => 'report',
                'desc'  => 'مقارنة مستويات التحصيل بين المراحل الدراسية ومؤشرات تقدم الطلبة.',
                'file'  => 'farouq_academic_performance_analysis.pdf',
            ],
            [
                'title' => 'ميثاق الشراكة المجتمعية وبرامج التعاون مع أولياء الأمور',
                'type'  => 'policy',
                'desc'  => 'وثيقة اتفاقيات التعاون مع المجتمع المحلي والمؤسسات الداعمة للمدرسة.',
                'file'  => 'farouq_community_partnership_charter.pdf',
            ],
            [
                'title' => 'سجلات حضور وغياب الطلبة والكوادر الإدارية والتعليمية',
                'type'  => 'record',
                'desc'  => 'بيانات الانضباط المدرسي ونسب الالتزام بالدوام الرسمي لعام 2026.',
                'file'  => 'farouq_attendance_and_punctuality_log.pdf',
            ],
            [
                'title' => 'محاضر تسليم واستلام المقررات المدرسية والوسائل التعليمية',
                'type'  => 'minutes',
                'desc'  => 'كشوفات توزيع الكتب المدرسية والوسائل الإيضاحية على الفصول.',
                'file'  => 'farouq_textbook_and_media_inventory.pdf',
            ],
            [
                'title' => 'خطة وبرامج الرعاية الصحية المدرسية والإسعافات الأولية',
                'type'  => 'plan',
                'desc'  => 'تجهيزات العيادة المدرسية وجداول الفحص الدوري ومتابعة السجلات الصحية.',
                'file'  => 'farouq_school_health_program_2026.pdf',
            ],
            [
                'title' => 'سجل برامج الموهوبين والابتكارات والمسابقات العلمية',
                'type'  => 'record',
                'desc'  => 'قوائم الطلاب الموهوبين والمشاريع العلمية المشاركة في معارض المديرية.',
                'file'  => 'farouq_gifted_students_portfolio.pdf',
            ],
            [
                'title' => 'دليل إجراءات الشكاوى والمقترحات وصندوق الملاحظات',
                'type'  => 'policy',
                'desc'  => 'آلية استقبال ومعالجة شكاوى أولياء الأمور والطلبة وضمان سرية المتابعة.',
                'file'  => 'farouq_grievance_and_feedback_mechanism.pdf',
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

        // ج. ربط كافة المؤشرات الـ 109 بوثائق شواهد كافية ومستوفاة (متوسط 2-3 شواهد لكل مؤشر بإجمالي 250+ شاهد)
        for ($i = 0; $i < count($ratedResults); $i++) {
            $item = $ratedResults[$i];
            $ver1 = $createdVersions[$i % count($createdVersions)];
            $ver2 = $createdVersions[($i + 7) % count($createdVersions)];

            // الشاهد الأساسي الأول
            EvidenceLink::create([
                'evaluation_id'        => $evalFarouq->evaluation_id,
                'indicator_id'         => $item['indicator']->indicator_id,
                'document_version_id'  => $ver1->id,
                'school_id'            => $schoolFarouq->school_id,
                'evaluation_result_id' => $item['result']->result_id,
                'justification'        => "شاهد إثبات أساسي مستوفٍ عبر الوثيقة الرسمية ({$ver1->file_name}) لعام 2026.",
                'status'               => 'completed',
            ]);

            // الشاهد الداعم الثاني لجميع المؤشرات
            EvidenceLink::create([
                'evaluation_id'        => $evalFarouq->evaluation_id,
                'indicator_id'         => $item['indicator']->indicator_id,
                'document_version_id'  => $ver2->id,
                'school_id'            => $schoolFarouq->school_id,
                'evaluation_result_id' => $item['result']->result_id,
                'justification'        => "وثيقة داعمة ومحضر متابعة ميداني إضافي عبر ({$ver2->file_name}).",
                'status'               => 'completed',
            ]);

            // الشاهد الثالث للمؤشرات ذات الأداء المتقدم (المستوى 2 والمستوى 3)
            if ($item['score'] >= 2) {
                $ver3 = $createdVersions[($i + 13) % count($createdVersions)];
                EvidenceLink::create([
                    'evaluation_id'        => $evalFarouq->evaluation_id,
                    'indicator_id'         => $item['indicator']->indicator_id,
                    'document_version_id'  => $ver3->id,
                    'school_id'            => $schoolFarouq->school_id,
                    'evaluation_result_id' => $item['result']->result_id,
                    'justification'        => "تقرير جودة دوري وإحصائيات داعمة للتحقق المستمر ({$ver3->file_name}).",
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
}
