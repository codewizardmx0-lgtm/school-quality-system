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
        $devSafePassword = env('SEED_DEFAULT_PASSWORD', 'TestingEnv_Seed_Password_2026_Strict!');
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

        // ب. إنشاء 45 وثيقة مدرسية واقعية تغطي كافة المعايير والمتطلبات الوطنية الـ 278 (ارتباط ثنائي وثلاثي مدروس)
        $samplePdfContent = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n";

        // تعريف الوثائق المدرسية الـ 45 الموزعة على المعايير السبعة
        $documentsCatalog = [
            // المعيار 1: الإدارة المدرسية (24 مؤشراً - 10 وثائق: 4 ثلاثية و 6 ثنائية)
            ['title' => 'الخطة الاستراتيجية والتطويرية الشاملة لمدرسة الفاروق (2024-2027)', 'type' => 'plan', 'size' => 3],
            ['title' => 'الخطة التشغيلية السنوية والبرنامج التنفيذي لمدرسة الفاروق (2026/2027)', 'type' => 'plan', 'size' => 3],
            ['title' => 'الهيكل التنظيمي والوصف الوظيفي للعاملين بالمدرسة', 'type' => 'policy', 'size' => 3],
            ['title' => 'سجل اجتماعات مجلس إدارة المدرسة والمجالس الإدارية', 'type' => 'minutes', 'size' => 3],
            ['title' => 'اللائحة التنظيمية المدرسية وسياسات العمل الإداري', 'type' => 'policy', 'size' => 2],
            ['title' => 'السجل المالي ومستندات المصروفات والإيرادات والميزانية المدرسية', 'type' => 'record', 'size' => 2],
            ['title' => 'سجل استلام وتوزيع العهد والكتب المدرسية والمستلزمات', 'type' => 'record', 'size' => 2],
            ['title' => 'التقرير السنوي للتقييم الذاتي وإدارة الجودة المدرسية', 'type' => 'report', 'size' => 2],
            ['title' => 'سجل المراسلات الإدارية والتعاميم الوزارية الصادرة والواردة', 'type' => 'record', 'size' => 2],
            ['title' => 'ملف الإشراف والمتابعة الإدارية وسجل الأرشفة والتوثيق الإلكتروني', 'type' => 'record', 'size' => 2],

            // المعيار 2: المعلمون والكوادر الإدارية والخدمية (18 مؤشراً - 7 وثائق: 4 ثلاثية و 3 ثنائية)
            ['title' => 'سجل حصر الكادر التعليمي والإداري وبيانات المؤهلات والتخصصات', 'type' => 'record', 'size' => 3],
            ['title' => 'سجل توزيع الجدول المدرسي وأنصبة الحصص للمعلمين', 'type' => 'record', 'size' => 3],
            ['title' => 'خطة وسجل التنمية المهنية وورش التدريب الداخلي للمعلمين', 'type' => 'plan', 'size' => 3],
            ['title' => 'سجل الزيارات الإشرافية والتوجيه التربوي والتقويم الصفي', 'type' => 'record', 'size' => 3],
            ['title' => 'سجل تقييم الأداء الوظيفي السنوي للمعلمين والموظفين', 'type' => 'report', 'size' => 2],
            ['title' => 'ملف الحوافز والمكافآت ولائحة التكريم والتحفيز المدرسي', 'type' => 'policy', 'size' => 2],
            ['title' => 'سجل دوام وحضور وغياب الكادر التعليمي والإداري', 'type' => 'record', 'size' => 2],

            // المعيار 3: المتعلمون (13 مؤشراً - 5 وثائق: 3 ثلاثية و 2 ثنائية)
            ['title' => 'سجل قيد وقبول الطلاب وملفات الإحصاء المدرسي السنوي', 'type' => 'record', 'size' => 3],
            ['title' => 'لائحة الانضباط المدرسي وقواعد السلوك والمواظبة للطلاب', 'type' => 'policy', 'size' => 3],
            ['title' => 'سجل متابعة الحالات الخاصة والإرشاد الطلابي والاجتماعي', 'type' => 'record', 'size' => 3],
            ['title' => 'خطة وبرامج رعاية الموهوبين والمتفوقين والطلاب المتعثرين', 'type' => 'plan', 'size' => 2],
            ['title' => 'سجل الأنشطة الطلابية والاتحاد الطلابي والمبادرات المدرسية', 'type' => 'record', 'size' => 2],

            // المعيار 4: التعليم والتعلم (21 مؤشراً - 9 وثائق: 3 ثلاثية و 6 ثنائية)
            ['title' => 'الخطة الفصلية وسجلات تحضير الدروس وتوزيع المناهج الدراسية', 'type' => 'plan', 'size' => 3],
            ['title' => 'سجل استخدام المعامل والمختبرات العلمية والتجارب العملية', 'type' => 'record', 'size' => 3],
            ['title' => 'خطة وسجل تفعيل مصادر التعلم والمكتبة المدرسية', 'type' => 'plan', 'size' => 3],
            ['title' => 'سجل استخدام الوسائل التعليمية والتقنيات الرقمية في التدريس', 'type' => 'record', 'size' => 2],
            ['title' => 'بنك الأسئلة ونماذج الاختبارات التشخيصية والدورية والنهائية', 'type' => 'record', 'size' => 2],
            ['title' => 'سجل رصد درجات الطلاب وتقارير التقويم المستمر والنتائج الشهرية', 'type' => 'record', 'size' => 2],
            ['title' => 'سجل تحليل نتائج الاختبارات واستخراج نسب التحصيل الدراسي', 'type' => 'report', 'size' => 2],
            ['title' => 'خطة برامج التقوية والخطط العلاجية لرفع التحصيل التعليمي', 'type' => 'plan', 'size' => 2],
            ['title' => 'سجل المسابقات العلمية والمنهجية والأنشطة الصفية المعززة للتعلم', 'type' => 'record', 'size' => 2],

            // المعيار 5: البيئة المدرسية (21 مؤشراً - 9 وثائق: 3 ثلاثية و 6 ثنائية)
            ['title' => 'خطة الأمن والسلامة المدرسية ودليل الإخلاء في حالات الطوارئ', 'type' => 'plan', 'size' => 3],
            ['title' => 'تقارير الصيانة الدورية للمبنى والمرافق المدرسية', 'type' => 'report', 'size' => 3],
            ['title' => 'سجل فحص وتجهيز طفايات الحريق وحقائب الإسعافات الأولية', 'type' => 'record', 'size' => 3],
            ['title' => 'سجل النظافة العامة والاشتراطات الصحية لمرافق المدرسة والمقصف', 'type' => 'record', 'size' => 2],
            ['title' => 'سجل كفاءة غرف التدريس والإضاءة والتهوية والمقاعد الدراسية', 'type' => 'record', 'size' => 2],
            ['title' => 'سجل صيانة الشبكة الكهربائية وشبكة المياه والصرف الصحي', 'type' => 'record', 'size' => 2],
            ['title' => 'ملف تجهيزات الملاعب والساحات الرياضية والأنشطة الخارجية', 'type' => 'record', 'size' => 2],
            ['title' => 'دليل الاستخدام الآمن للأجهزة والمعدات في المعامل المدرسية', 'type' => 'policy', 'size' => 2],
            ['title' => 'سجل اللوحات الإرشادية وسلامة المداخل ومخارج الطوارئ', 'type' => 'board', 'size' => 2],

            // المعيار 6: الشراكة المجتمعية (6 مؤشرات - وثيقتان ثلاثيتان)
            ['title' => 'لائحة ومحاضر اجتماعات مجلس الآباء والمعلمين والشراكة المجتمعية', 'type' => 'minutes', 'size' => 3],
            ['title' => 'سجل برامج التوعية المجتمعية والمبادرات المشتركة مع أولياء الأمور', 'type' => 'record', 'size' => 3],

            // المعيار 7: ضمان الجودة والتحسين المستمر (6 مؤشرات - 3 وثائق ثنائية)
            ['title' => 'ميثاق الجودة وسياسة التحسين المستمر والتقويم الذاتي لمدرسة الفاروق', 'type' => 'policy', 'size' => 2],
            ['title' => 'تقرير مراجعة الأداء المؤسسي ومؤشرات قياس الجودة المدرسية', 'type' => 'report', 'size' => 2],
            ['title' => 'خطة التحسين المدرسي الشاملة ومصفوفة المتابعة الدورية', 'type' => 'plan', 'size' => 2],
        ];

        // خريطة نتائج التقييم للمؤشرات
        $resultMap = [];
        foreach ($ratedResults as $item) {
            $resultMap[$item['indicator']->indicator_id] = $item['result']->result_id;
        }

        // تقسيم الـ 109 مؤشراً على الـ 45 وثيقة بدقة تامة
        $indicatorOffset = 0;
        foreach ($documentsCatalog as $docIdx => $catalogItem) {
            $chunkSize = $catalogItem['size'];
            $chunkIndicators = $allIndicators->slice($indicatorOffset, $chunkSize)->values();
            $indicatorOffset += $chunkSize;

            $docNumber = $docIdx + 1;
            $doc = SchoolDocument::create([
                'school_id'          => $schoolFarouq->school_id,
                'title'              => $catalogItem['title'],
                'document_type'      => $catalogItem['type'],
                'description'        => "شاهد توثيقي رسمي معتمد يغطي متطلبات مؤشرات الجودة الوطنية لمدرسة الفاروق الأساسية للبنين لعام 2026.",
                'created_by_user_id' => $evaluatorFarouq->user_id,
            ]);

            // لأول 3 مستندات: إنشاء نسخة أرشيفية قديمة (v1) لاختبار تبويب الإصدارات والنسخ القديمة وسجل التاريخ
            if ($docNumber <= 3) {
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
                    'notes'              => 'المسودة الأولية قبل مراجعة وإقرار مجلس إدارة المدرسة (نسخة سابقة)',
                ]);
                Storage::disk('local')->put("documents/{$schoolFarouq->school_id}/{$oldFileName}", $samplePdfContent);

                $currentVersionNo = 2;
            } else {
                $currentVersionNo = 1;
            }

            $curFileName = "farouq_doc_{$doc->id}_v{$currentVersionNo}.pdf";
            $fileSize = 1024 * 768 + (($docNumber * 57) % 3500) * 1024;

            $ver = DocumentVersion::create([
                'school_document_id' => $doc->id,
                'version_no'         => $currentVersionNo,
                'school_id'          => $schoolFarouq->school_id,
                'is_current'         => true,
                'file_name'          => $curFileName,
                'storage_uri'        => "documents/{$schoolFarouq->school_id}/{$curFileName}",
                'file_size'          => $fileSize,
                'mime_type'          => 'application/pdf',
                'notes'              => 'الإصدار المعتمد والنهائي للشاهد التوثيقي لعام 2026/2027',
            ]);

            // تخزين الملف الفيزيائي لأول 3 مستندات فقط لتقليل استهلاك القرص وضمان الأداء الخفيف
            if ($docNumber <= 3) {
                Storage::disk('local')->put("documents/{$schoolFarouq->school_id}/{$curFileName}", $samplePdfContent);
            }

            // ربط الشاهد بكافة المؤشرات التابعة لهذه الوثيقة مع تغطية 100% لكافة متطلباتها الإلزامية
            foreach ($chunkIndicators as $ind) {
                $mandatoryReqIds = \App\Models\IndicatorEvidenceRequirement::where('indicator_id', $ind->indicator_id)
                    ->where('required', true)
                    ->pluck('requirement_id')
                    ->map(fn($id) => (int)$id)
                    ->all();

                EvidenceLink::create([
                    'evaluation_id'        => $evalFarouq->evaluation_id,
                    'indicator_id'         => $ind->indicator_id,
                    'document_version_id'  => $ver->id,
                    'school_id'            => $schoolFarouq->school_id,
                    'evaluation_result_id' => $resultMap[$ind->indicator_id] ?? null,
                    'justification'        => "شاهد معتمد وموثق يغطي كافة متطلبات المؤشر ({$ind->code}: {$ind->name}) ضمن وثيقة [{$catalogItem['title']}].",
                    'covered_requirements' => $mandatoryReqIds,
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
