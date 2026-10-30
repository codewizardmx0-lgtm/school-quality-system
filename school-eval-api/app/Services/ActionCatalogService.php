<?php

namespace App\Services;

use App\Models\ImprovementPlan;

/**
 * كتالوج بنك الإجراءات النموذجية المعتمدة لخطط التحسين المدرسية والتطوير المهني (الشريحة 8).
 *
 * يوفر حزمة مصفوفات مرجعية ثابتة مصنفة حسب:
 * - رمز المجال الفرعي (sub_standard_code)
 * - نوع الخطة (plan_type)
 * ويتضمن صياغات تربوية موحدة للإجراءات، الفئات والمسؤوليات المستهدفة، والمدد الزمنية المقترحة.
 */
class ActionCatalogService
{
    /**
     * استرجاع عناصر بنك الإجراءات النموذجية مع إمكانية التصفية.
     *
     * @param string|null $subStandardCode
     * @param string|null $planType
     * @return array<int, array<string, mixed>>
     */
    public function getCatalog(?string $subStandardCode = null, ?string $planType = null): array
    {
        $catalog = $this->allActions();

        if ($subStandardCode) {
            $catalog = array_values(array_filter($catalog, fn($item) => $item['sub_standard_code'] === $subStandardCode));
        }

        if ($planType) {
            $catalog = array_values(array_filter($catalog, fn($item) => $item['plan_type'] === $planType));
        }

        return $catalog;
    }

    /**
     * اسم بديل متوافق لطريقة التصفية.
     *
     * @param string|null $subStandardCode
     * @param string|null $planType
     * @return array<int, array<string, mixed>>
     */
    public function filter(?string $subStandardCode = null, ?string $planType = null): array
    {
        return $this->getCatalog($subStandardCode, $planType);
    }

    /**
     * استرجاع توصيات بنك الإجراءات النموذجية لمؤشر محدد في ضوء درجته.
     *
     * يرجع الإجراءات المطابقة فقط للمؤشرات الضعيفة (الدرجة 0 أو 1)،
     * بينما يرجع قائمة فارغة وتوضيحاً للمؤشرات المحققة (الدرجة 2 أو 3).
     *
     * @param string $indicatorCode
     * @param int|null $score
     * @return array<string, mixed>
     */
    public function getRecommendationsForIndicator(string $indicatorCode, ?int $score = null): array
    {
        if ($score !== null && $score > 1) {
            return [
                'is_weak' => false,
                'indicator_code' => $indicatorCode,
                'score' => $score,
                'message' => 'المؤشر في مستوى مقبول أو متميز (الدرجة > 1) ولا يتطلب إجراءات تحسين عاجلة من البنك.',
                'recommendations' => [],
            ];
        }

        // تحديد المجال الفرعي للمؤشر
        $subCode = null;
        $indicatorName = null;
        $indicator = \App\Models\Indicator::where('code', $indicatorCode)->with('subStandard')->first();
        if ($indicator) {
            $indicatorName = $indicator->name;
            if ($indicator->subStandard) {
                $subCode = $indicator->subStandard->code;
            }
        }

        // استخراج الإجراءات المطابقة
        $recommendations = [];
        if ($subCode) {
            $variants = $this->getSubStandardVariants($subCode);
            $catalog = $this->allActions();
            $recommendations = array_values(array_filter($catalog, function ($item) use ($variants) {
                return in_array($item['sub_standard_code'], $variants, true);
            }));
        }

        // في حال عدم وجود إجراءات مطابقة للمجال الفرعي بدقة، نقدم عينة استرشادية من أول 3 إجراءات
        if (empty($recommendations)) {
            $recommendations = array_slice($this->allActions(), 0, 3);
        }

        return [
            'is_weak' => true,
            'indicator_code' => $indicatorCode,
            'indicator_name' => $indicatorName,
            'sub_standard_code' => $subCode,
            'score' => $score,
            'recommendations_count' => count($recommendations),
            'recommendations' => $recommendations,
        ];
    }

    /**
     * توليد صيغ الرموز المختلفة لنفس المجال الفرعي لضمان التوافق (مثال: SUB-1-1 و SUB-01-01).
     *
     * @param string $code
     * @return array<string>
     */
    protected function getSubStandardVariants(string $code): array
    {
        $variants = [$code];
        if (preg_match('/^SUB-(\d+)-(\d+)$/', $code, $matches)) {
            $stdNum = str_pad($matches[1], 2, '0', STR_PAD_LEFT);
            $subNum = str_pad($matches[2], 2, '0', STR_PAD_LEFT);
            $variants[] = "SUB-{$stdNum}-{$subNum}";
        } elseif (preg_match('/^SUB-(\d{2})-(\d{2})$/', $code, $matches)) {
            $stdNum = (int) $matches[1];
            $subNum = (int) $matches[2];
            $variants[] = "SUB-{$stdNum}-{$subNum}";
        }

        return array_values(array_unique($variants));
    }

    /**
     * القائمة الشاملة للإجراءات النموذجية عبر المجالات الأربعة عشر والأنواع الثلاثة.
     *
     * @return array<int, array<string, mixed>>
     */
    protected function allActions(): array
    {
        return [
            // ==========================================
            // المعيار 1: القيادة المدرسية
            // ==========================================
            // المجال 1.1: التخطيط والتطوير المؤسسي (SUB-01-01)
            [
                'catalog_id'                       => 1,
                'sub_standard_code'                => 'SUB-01-01',
                'plan_type'                        => ImprovementPlan::TYPE_QUALITY_IMPROVEMENT,
                'title'                            => 'تحديث الخطة التشغيلية للمدرسة ومواءمتها مع نتائج التقويم الذاتي والمجالات ذات الأولوية',
                'suggested_responsible_description'=> 'فريق التخطيط والجودة المدرسي (3 أعضاء)',
                'suggested_duration_days'          => 30,
            ],
            [
                'catalog_id'                       => 2,
                'sub_standard_code'                => 'SUB-01-01',
                'plan_type'                        => ImprovementPlan::TYPE_STAFF_DEVELOPMENT,
                'title'                            => 'تنفيذ برنامج تدريبي لقيادات المدرسة وفرق العمل حول آليات بناء الخطط التطويرية ومتابعتها',
                'suggested_responsible_description'=> 'منسق التدريب والتطوير المهني بالمدرسة (مستهدف: 10 إداريين ومعلمين)',
                'suggested_duration_days'          => 45,
            ],
            [
                'catalog_id'                       => 3,
                'sub_standard_code'                => 'SUB-01-01',
                'plan_type'                        => ImprovementPlan::TYPE_ANNUAL_OPERATIONAL,
                'title'                            => 'عقد لقاءات فصلية لمراجعة مؤشرات الأداء التشغيلية ومستوى إنجاز الأنشطة مع مجالس المدرسة',
                'suggested_responsible_description'=> 'مجلس إدارة المدرسة برئاسة المدير',
                'suggested_duration_days'          => 60,
            ],

            // المجال 1.2: قيادة التعليم والتعلم (SUB-01-02)
            [
                'catalog_id'                       => 4,
                'sub_standard_code'                => 'SUB-01-02',
                'plan_type'                        => ImprovementPlan::TYPE_QUALITY_IMPROVEMENT,
                'title'                            => 'تفعيل استمارات الملاحظة الصفية وتقديم التغذية الراجعة التكوينية المنتظمة للمعلمين',
                'suggested_responsible_description'=> 'المشرفون المقيمون ورؤساء الشعب الدراسية (مستهدف: جميع المعلمين)',
                'suggested_duration_days'          => 60,
            ],
            [
                'catalog_id'                       => 5,
                'sub_standard_code'                => 'SUB-01-02',
                'plan_type'                        => ImprovementPlan::TYPE_STAFF_DEVELOPMENT,
                'title'                            => 'ورشة عمل حول توظيف أدوات القياس والتقويم الصفي البديل والتقويم المستمر للطلاب',
                'suggested_responsible_description'=> 'منسق التطوير المهني بالتعاون مع التوجيه التربوي (مستهدف: 25 معلماً)',
                'suggested_duration_days'          => 30,
            ],

            // المجال 1.3: بيئة العمل والعلاقات المهنية (SUB-01-03)
            [
                'catalog_id'                       => 6,
                'sub_standard_code'                => 'SUB-01-03',
                'plan_type'                        => ImprovementPlan::TYPE_STAFF_DEVELOPMENT,
                'title'                            => 'برنامج تنمية مهارات التواصل الفعال والعمل الجماعي وحل المشكلات لفرق العمل المدرسية',
                'suggested_responsible_description'=> 'الأخصائي الاجتماعي ومنسق الجودة (مستهدف: 30 كادراً)',
                'suggested_duration_days'          => 45,
            ],

            // ==========================================
            // المعيار 2: التعليم والتعلم
            // ==========================================
            // المجال 2.1: بناء خبرات التعلم (SUB-02-01)
            [
                'catalog_id'                       => 7,
                'sub_standard_code'                => 'SUB-02-01',
                'plan_type'                        => ImprovementPlan::TYPE_QUALITY_IMPROVEMENT,
                'title'                            => 'تطبيق استراتيجيات التعلم النشط القائم على حل المشكلات والتعلم التعاوني في الحصص الدراسية',
                'suggested_responsible_description'=> 'معلمو المواد الأساسية بإشراف رؤساء المواد (مستهدف: 35 معلماً)',
                'suggested_duration_days'          => 90,
            ],
            [
                'catalog_id'                       => 8,
                'sub_standard_code'                => 'SUB-02-01',
                'plan_type'                        => ImprovementPlan::TYPE_STAFF_DEVELOPMENT,
                'title'                            => 'دورة تدريبية مكثفة حول تصميم المهمات الأدائية وتمايز التعليم لمراعاة الفروق الفردية',
                'suggested_responsible_description'=> 'مدرب معتمد بالتنسيق مع إدارة التدريب والتأهيل التربوي (مستهدف: 40 معلماً)',
                'suggested_duration_days'          => 30,
            ],

            // المجال 2.2: تقويم تعلم الطلاب وتطورهم (SUB-02-02)
            [
                'catalog_id'                       => 9,
                'sub_standard_code'                => 'SUB-02-02',
                'plan_type'                        => ImprovementPlan::TYPE_QUALITY_IMPROVEMENT,
                'title'                            => 'إنشاء ملفات إنجاز الطلاب (Portfolio) الرقمية وتوثيق تطور مستويات التحصيل دورياً',
                'suggested_responsible_description'=> 'معلمو الصفوف والمراحل الدراسية بالتنسيق مع الإرشاد الطلابي',
                'suggested_duration_days'          => 120,
            ],

            // ==========================================
            // المعيار 3: نواتج التعلم
            // ==========================================
            // المجال 3.1: التحصيل الأكاديمي والمهارات (SUB-03-01)
            [
                'catalog_id'                       => 10,
                'sub_standard_code'                => 'SUB-03-01',
                'plan_type'                        => ImprovementPlan::TYPE_QUALITY_IMPROVEMENT,
                'title'                            => 'تنفيذ خطة علاجية مخصصة للطلاب دون المستوى المقبول في مهارات القراءة والكتابة والرياضيات',
                'suggested_responsible_description'=> 'معلمو اللغات والرياضيات بالتنسيق مع المرشد التربوي (مستهدف: 50 طالباً)',
                'suggested_duration_days'          => 60,
            ],
            [
                'catalog_id'                       => 11,
                'sub_standard_code'                => 'SUB-03-01',
                'plan_type'                        => ImprovementPlan::TYPE_ANNUAL_OPERATIONAL,
                'title'                            => 'إطلاق مسابقات التفوق العلمي والابتكار وإقامة المعرض السنوي لإنتاج الطلاب الإبداعي',
                'suggested_responsible_description'=> 'لجنة الأنشطة العلمية والابتكار بالمدرسة',
                'suggested_duration_days'          => 90,
            ],

            // المجال 3.2: التطور الشخصي والقيمي للطلاب (SUB-03-02)
            [
                'catalog_id'                       => 12,
                'sub_standard_code'                => 'SUB-03-02',
                'plan_type'                        => ImprovementPlan::TYPE_ANNUAL_OPERATIONAL,
                'title'                            => 'تفعيل برامج العمل التطوعي وريادة الأعمال والمبادرات المجتمعية لغرس قيم الانتماء والمسؤولية',
                'suggested_responsible_description'=> 'فريق الأنشطة المدرسية ومجلس الطلاب (مستهدف: كافة الفصول)',
                'suggested_duration_days'          => 180,
            ],

            // ==========================================
            // المعيار 4: البيئة المدرسية والأمن والسلامة
            // ==========================================
            // المجال 4.1: الأمن والسلامة المدرسية (SUB-04-01)
            [
                'catalog_id'                       => 13,
                'sub_standard_code'                => 'SUB-04-01',
                'plan_type'                        => ImprovementPlan::TYPE_ANNUAL_OPERATIONAL,
                'title'                            => 'صيانة وتحديث تجهيزات ومعدات السلامة وطفايات الحريق ومخارج الطوارئ بالمبنى المدرسي',
                'suggested_responsible_description'=> 'مسؤول السلامة والصيانة المدرسية بالتعاون مع الدفاع المدني',
                'suggested_duration_days'          => 30,
            ],
            [
                'catalog_id'                       => 14,
                'sub_standard_code'                => 'SUB-04-01',
                'plan_type'                        => ImprovementPlan::TYPE_STAFF_DEVELOPMENT,
                'title'                            => 'تدريب الكادر التعليمي والإداري والطلاب على خطط الإخلاء الافتراضية وإجراءات الإسعافات الأولية',
                'suggested_responsible_description'=> 'فريق الأمن والسلامة المدرسي (مستهدف: جميع منسوبي المدرسة)',
                'suggested_duration_days'          => 15,
            ],

            // المجال 4.2: التجهيزات والمرافق المدرسية (SUB-04-02)
            [
                'catalog_id'                       => 15,
                'sub_standard_code'                => 'SUB-04-02',
                'plan_type'                        => ImprovementPlan::TYPE_ANNUAL_OPERATIONAL,
                'title'                            => 'تزويد معمل العلوم ومختبر الحاسوب بالأدوات التفاعلية وتأهيل أجهزة التعلم الرقمي',
                'suggested_responsible_description'=> 'أمين المختبرات بالتعاون مع إدارة الموارد والتجهيزات المدرسية',
                'suggested_duration_days'          => 45,
            ],

            // ==========================================
            // المعيار 5: الشراكة المجتمعية والأسرة
            // ==========================================
            // المجال 5.1: الشراكة مع أولياء الأمور (SUB-05-01)
            [
                'catalog_id'                       => 16,
                'sub_standard_code'                => 'SUB-05-01',
                'plan_type'                        => ImprovementPlan::TYPE_ANNUAL_OPERATIONAL,
                'title'                            => 'تفعيل منصة التواصل الدوري مع أولياء الأمور وعقد المجالس الدورية لمتابعة تطور الأبناء',
                'suggested_responsible_description'=> 'لجنة الشراكة المدرسية الأسرية برئاسة مدير المدرسة',
                'suggested_duration_days'          => 120,
            ],
        ];
    }
}
