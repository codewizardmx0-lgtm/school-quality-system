# نظام إدارة وتقويم الجودة المدرسية (School Quality System)

نظام وطني متكامل لإدارة وتقويم جودة المدارس، يغطي دورات التقييم الذاتي، رصد درجات المؤشرات والمعايير، إدارة الشواهد والوثائق، إعداد ومتابعة خطط التحسين المدرسي، إنتاج التقارير والتحليلات وحساب النتائج، تنظيم وتدقيق الشواهد، وإدارة الملف التعريفي والإحصاءات والمرافق المدرسية وسياق المؤشرات الاسترشادي، وإطلاق دورات التقييم المركزية وإدارتها ومنظومة الإشعارات واستعادة الحسابات.

---

## بنية المشروع (Architecture Structure)

```
school-quality-system/
├── school-eval-api/       # الباك إند: Laravel 11 API مع Sanctum و MySQL
├── school-eval-web/       # الفرونت إند: تطبيق React (Vite + TailwindCSS)
├── frontend-prototype/    # نموذج أولي تفاعلي للتحقق من تسلسل العمليات وتكامل الـ API (الشرائح 1-10)
└── docs/                  # التوثيق المعماري، الأدلة، وتوثيق الشرائح (Slices)
```

---

## وسوم الإصدارات الرسمية للمراحل (Milestone Release Tags)

| الوسم (Release Tag) | نطاق المرحلة | حالة الاختبارات الآلية | التوثيق |
|---|---|---|---|
| [`v0.6.0`](https://github.com/codewizardmx0-lgtm/school-quality-system/releases/tag/v0.6.0) | اكتمال الشرائح 1 إلى 6 الأساسية | 112 اختبارًا ناجحًا (100%) | [`docs/slices/README.md`](docs/slices/README.md) |
| [`v0.9.0`](https://github.com/codewizardmx0-lgtm/school-quality-system/releases/tag/v0.9.0) | اكتمال الشرائح 7 و 8 و 9 وتصدير التقارير | 208 اختبارات ناجحة (100%) | [`docs/slices/slice9_reports_export.md`](docs/slices/slice9_reports_export.md) |
| **`v1.0.0-slices-1-to-10`** *(مقترح بعد الدمج)* | اكتمال دورات التقييم، بدء التقييم الذاتي، الإشعارات، واستعادة الحسابات | **223 اختبارًا ناجحًا (100%)** | [`docs/slices/slice10_cycles_notifications.md`](docs/slices/slice10_cycles_notifications.md) |

---

## الشرائح المنجزة والرسمية (Implemented Slices: 1 to 10)

| الشريحة | العنوان | الملخص الموجز | التوثيق المرجعي |
|---|---|---|---|
| **الشريحة 0** | **قاعدة البيانات ونماذج Eloquent** | بناء 40 جدولاً، 40 نموذجاً، والمصفوفة المعيارية الوطنية لـ 109 مؤشرات و 7 معايير و 19 صلاحية. | [`docs/models_guide.md`](docs/models_guide.md) |
| **الشريحة 1** | **المصادقة والعزل المؤسسي** | مصادقة Sanctum Bearer Token، عزل المدارس (404)، وإدارة المستخدمين والمدارس لمسؤول النظام. | [`docs/slices/slice1_auth_admin.md`](docs/slices/slice1_auth_admin.md) |
| **الشريحة 2** | **التقييم الذاتي والشواهد** | شجرة المعايير، رصد الدرجات (0-3)، إدارة نسخ الشواهد (is_current)، وقفل التعديل التنافسي. | [`docs/slices/slice2_evaluation_evidence.md`](docs/slices/slice2_evaluation_evidence.md) |
| **الشريحة 3** | **خطط وإجراءات التحسين** | توليد مقترحات التحسين ديناميكياً، إدارة خطط ومجالات التحسين، تتبع التأخر، وتدوين الملاحظات. | [`docs/slices/slice3_improvement_plans.md`](docs/slices/slice3_improvement_plans.md) |
| **الشريحة 4** | **التقارير والتحليلات واللوحة** | حساب النتيجة الموزونة بالأوزان السبعة، ملخص الشواهد والخطط، لوحة المعلومات، وتصدير JSON. | [`docs/slices/slice4_reports_analytics.md`](docs/slices/slice4_reports_analytics.md) |
| **الشريحة 4.1** | **إنهاء وتسليم التقييم الذاتي** | فحص استيفاء الـ 109 مؤشرات والحد الأدنى للشواهد، تجميد Snapshot، وقفل التعديل (BR-SCH-03). | [`gaps.md`](gaps.md) |
| **الشريحة 5** | **تنظيم الشواهد وتصنيفها** | تصنيف الشواهد، ربط الشاهد بعدة مؤشرات، دورة تدقيق الشاهد (Draft/Completed/Audited)، وحصر النواقص. | [`docs/slices/slice5_evidence_organization.md`](docs/slices/slice5_evidence_organization.md) |
| **الشريحة 6** | **إدارة المدرسة وسياق المؤشرات** | الملف التعريفي، الكادر، الطلاب، المرافق، والسياق الاسترشادي الحسابي اللحظي للـ 109 مؤشرات. | [`docs/slices/slice6_school_profile.md`](docs/slices/slice6_school_profile.md) |
| **الشريحة 7** | **إدارة المعايير والإصدارات** | دورة حياة الإصدارات (Draft/Approved/Archived)، ضبط الأوزان النسبية (100%)، واستنساخ المعايير. | [`docs/slices/slice7_standards_management.md`](docs/slices/slice7_standards_management.md) |
| **الشريحة 8** | **الخطط التربوية والتطوير المهني** | 3 أنواع خطط تربوية، نسب إنجاز تدرجية (0-100%)، بنك الإجراءات النموذجية، وربط شواهد التنفيذ. | [`docs/slices/slice8_educational_plans.md`](docs/slices/slice8_educational_plans.md) |
| **الشريحة 9** | **التقارير والتصدير ومقارنة الأداء** | بطاقة التقويم الرسمية PDF عبر mPDF، تصدير Excel، مقارنة الأداء بالدورة السابقة (Trend)، وتوسيع السياقات. | [`docs/slices/slice9_reports_export.md`](docs/slices/slice9_reports_export.md) |
| **الشريحة 10** | **إدارة الدورات وبدء التقييم والإشعارات** | إدارة الدورات المركزية للمشرف (G-24)، بدء التقييم للمقيّم (G-26)، سجل الإشعارات (FR-GEN-05)، واستعادة الحسابات (G-05). | [`docs/slices/slice10_cycles_notifications.md`](docs/slices/slice10_cycles_notifications.md) |

---

## خريطة الأدوار الخمسة المعتمدة والصلاحيات (RBAC Role-Permission Matrix)

النظام مبني على 5 أدوار مؤسسية محددة بدقة و 19 صلاحية حبيبية قانونية (Canonical Permissions)، مع الفصل التام للمسؤوليات (Separation of Concerns):

| الدور الوظيفي (`role_name`) | المسمى والتوصيف | الصلاحيات الممنوحة الحبيبية | القيود المؤسسية الحاسمة |
|---|---|---|---|
| **`admin`** | **مسؤول النظام التقني** | `users.manage`, `schools.manage` (صلاحيتان) | **محظور تماماً (403 Forbidden)** من إنشاء أو تعديل أو تقييم المدارس أو إدارة الدورات المركزية (BR-GEN-06 والوثيقة 3.2.4). |
| **`school_evaluator`** | **مقيّم الجودة في المدرسة** | `standards.view`, `evaluations.create`, `evaluations.view`, `evaluations.edit`, `evaluations.submit`, `evidence.manage`, `reports.generate`, `reports.view`, `plans.manage`, `plans.view`, `ai.use` (11 صلاحية) | معزول بمدرسته فقط (404 عند طلب غيرها). يملك حصرًا بدء ملف التقييم لمدرسته وتسليمه النهائي. |
| **`school_principal`** | **مدير المدرسة (إقرار واطلاع)** | `standards.view`, `evaluations.view`, `reports.view`, `plans.view`, `reviews.write` (5 صلاحيات) | يراجع التقييم والشواهد ويدوّن الملاحظات الداخلية ويقر خطط التحسين. لا يرصد درجات ولا يسلم التقييم. |
| **`ministry_supervisor`** | **المشرف الوزاري (إدارة الدورات والمراجعة)** | `standards.view`, `evaluations.view`, `reports.view`, `supervision.review`, `completion.request`, `cycles.launch` (المطابقة لـ `cycles.manage`), `analytics.view` (7 صلاحيات) | **المالك الحصري** لإطلاق وإغلاق دورات التقييم المركزية وإلحاق المدارس المشاركة. يدوّن ملاحظات المراجعة الخارجية ويطلب الاستكمال. |
| **`ministry_standards_manager`** | **مدير إدارة المعايير بالوزارة** | `standards.view`, `standards.manage` (صلاحيتان) | إدارة وثيقة "معايير الاعتماد المدرسي"، ترقية الإصدارات من مسودة إلى مُقرّ، وضبط الأوزان النسبية (مجموع 100%). |

---

## خارطة الشرائح المستقبلية المتبقية (Remaining Roadmap)

* **الشريحة 11: الجاهزية للإنتاج والأمان والتحسين (Production Readiness):**
  - إغلاق الدين التقني لتوحيد حالة الإصدار المعياري Active إلى Approved (G-23).
  - تعزيز أداء استعلامات الشواهد والفهارس المركبة (G-15).
  - التدقيق الأمني، وتحديد معدل الطلبات (Rate Limiting)، وتفعيل حماية الجلسات والبيئات الإنتاجية.
* **الشريحة 12: طبقة الذكاء الاصطناعي (AI Layer) — [أساسية وليست اختيارية]:**
  - محرك المعالجة الأساسي: **Google Gemini Flash** (عبر Gemini API)، مع خطة بديلة مدعومة عبر **OpenRouter**.
  - الوظائف الأساسية:
    1. استخراج النصوص آلياً من ملفات الشواهد المرفوعة (OCR Worker).
    2. التحليل الذكي للشواهد ومطابقتها مع واصفات مؤشرات "معايير الاعتماد المدرسي" وتقديم التوصيات المبدئية.
    3. المساعد التوليدي لبناء وتجميع مسودات خطط التحسين المدرسي بناءً على نقاط الضعف وفرص التحسين المرصودة.
  - مبدأ الحاكمية: **التدخل البشري الإلزامي (Human-in-the-Loop)**؛ لا تعديل تلقائي للدرجات ولا إقرار للشواهد دون قرار المقيّم البشري.

> [!NOTE]
> **التوسعات الإحصائية (النمط ب من خارطة السياقات):**
> مؤشرات الأداء الإحصائية الإضافية التي تتطلب جداول تجميعية موسعة (مثل نتائج الاختبارات الوزارية المجمعة، وساعات التدريب، ونسب الغياب السلوكي) مصنفة ومؤجلة كتوسعات هندسية لما بعد الإصدار v1.0 وفق [`docs/indicator-context-roadmap.md`](docs/indicator-context-roadmap.md).

---

## تشغيل الاختبارات الآلية (Automated Testing)

```bash
cd school-eval-api
php artisan test
```

**النتيجة الفعلية لحزمة الاختبارات الآلية (Ground Truth):**
- **223 اختبارًا ناجحًا بنسبة 100% (Passed)**
- **9,111 تأكيدًا برمجيًا (Assertions)**
- **0 إخفاقات / 0 أخطاء (0 Failures, 0 Errors)**

---

## روابط التوثيق المرجعي الأساسي

* الفهرس المعماري الشامل للشرائح: [`docs/slices/README.md`](docs/slices/README.md)
* خارطة طريق الشرائح وتفاصيل الشريحة 11 و 12: [`docs/slices_roadmap.md`](docs/slices_roadmap.md)
* سجل الفجوات والانحرافات التقنية: [`gaps.md`](gaps.md)
* دليل التسليم الهندسي لتطبيق React: [`docs/handover/react-integration-guide.md`](docs/handover/react-integration-guide.md)
* دليل التحقق العملي للواجهة النموذجية: [`frontend-prototype/verification-guide.md`](frontend-prototype/verification-guide.md)
* دليل تشغيل النموذج الأولي (الشرائح 1-10): [`frontend-prototype/README.md`](frontend-prototype/README.md)
* خارطة سياقات المؤشرات الـ 109: [`docs/indicator-context-roadmap.md`](docs/indicator-context-roadmap.md)
