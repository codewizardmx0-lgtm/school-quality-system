# نظام إدارة وتقويم الجودة المدرسية (School Quality System)

نظام وطني متكامل لإدارة وتقويم جودة المدارس، يغطي دورات التقييم الذاتي، رصد درجات المؤشرات والمعايير، إدارة الشواهد والوثائق، إعداد ومتابعة خطط التحسين المدرسي، إنتاج التقارير والتحليلات وحساب النتائج، تنظيم وتدقيق الشواهد، وإدارة الملف التعريفي والإحصاءات والمرافق المدرسية وسياق المؤشرات الاسترشادي، وإطلاق دورات التقييم المركزية وإدارتها ومنظومة الإشعارات واستعادة الحسابات.

---

## بنية المشروع (Architecture Structure)

```
school-quality-system/
├── school-eval-api/       # الباك إند: Laravel 13 API مع Sanctum و MySQL
├── school-eval-web/       # الفرونت إند: تطبيق React 19 (Vite + TypeScript)
└── docs/                  # التوثيق المعماري، الأدلة، الوثيقة المرجعية، وتوثيق الشرائح والأرشيف
```

---

## وسوم الإصدارات الرسمية للمراحل (Milestone Release Tags)

| الوسم (Release Tag) | نطاق المرحلة | حالة الاختبارات الآلية | التوثيق |
|---|---|---|---|
| [`v0.6.0`](https://github.com/codewizardmx0-lgtm/school-quality-system/releases/tag/v0.6.0) | اكتمال الشرائح 1 إلى 6 الأساسية | 112 اختبارًا ناجحًا (100%) | [`docs/slices/README.md`](docs/slices/README.md) |
| [`v0.9.0`](https://github.com/codewizardmx0-lgtm/school-quality-system/releases/tag/v0.9.0) | اكتمال الشرائح 7 و 8 و 9 وتصدير التقارير | 208 اختبارات ناجحة (100%) | [`docs/slices/slice9_reports_export.md`](docs/slices/slice9_reports_export.md) |
| [`v1.0.0`](https://github.com/codewizardmx0-lgtm/school-quality-system/releases/tag/v1.0.0) | الإطلاق الرسمي الشامل لكافة البوابات الخمس والنسخ الاحتياطي الحقيقي وتطهير الحوكمة | **515 اختبارًا ناجحًا (100%)** | [`docs/requirements-implementation-matrix.md`](docs/requirements-implementation-matrix.md) |

---

## الشرائح المنجزة والرسمية (Implemented Slices: 1 to 10)

| الشريحة | العنوان | الملخص الموجز | التوثيق المرجعي |
|---|---|---|---|
| **الشريحة 0** | **قاعدة البيانات ونماذج Eloquent** | بناء 40 جدولاً، 40 نموذجاً، والمصفوفة المعيارية الوطنية لـ 109 مؤشرات و 7 معايير و 19 صلاحية. | [`docs/models_guide.md`](docs/models_guide.md) |
| **الشريحة 1** | **المصادقة والعزل المؤسسي** | مصادقة Sanctum Bearer Token، عزل المدارس (404)، وإدارة المستخدمين والمدارس لمسؤول النظام. | [`docs/slices/slice1_auth_admin.md`](docs/slices/slice1_auth_admin.md) |
| **الشريحة 2** | **التقييم الذاتي والشواهد** | شجرة المعايير، رصد الدرجات (0-3)، إدارة نسخ الشواهد (is_current)، وقفل التعديل التنافسي. | [`docs/slices/slice2_evaluation_evidence.md`](docs/slices/slice2_evaluation_evidence.md) |
| **الشريحة 3** | **خطط وإجراءات التحسين** | توليد مقترحات التحسين ديناميكياً، إدارة خطط ومجالات التحسين، تتبع التأخر، وتدوين الملاحظات. | [`docs/slices/slice3_improvement_plans.md`](docs/slices/slice3_improvement_plans.md) |
| **الشريحة 4** | **التقارير والتحليلات واللوحة** | حساب النتيجة الموزونة بالأوزان السبعة، ملخص الشواهد والخطط، لوحة المعلومات، وتصدير JSON. | [`docs/slices/slice4_reports_analytics.md`](docs/slices/slice4_reports_analytics.md) |
| **الشريحة 4.1** | **إنهاء وتسليم التقييم الذاتي** | فحص استيفاء الـ 109 مؤشرات والحد الأدنى للشواهد، تجميد Snapshot، وقفل التعديل (BR-SCH-03). | [`docs/backend-gaps.md`](docs/backend-gaps.md) |
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

## دليل التشغيل السريع للمنظومة (Quick Start & Run Guide)

### 1. المتطلبات الأساسية للتشغيل
- **PHP:** إصدار 8.4 فما فوق (مدمج في Laragon).
- **Node.js:** إصدار v20 فما فوق مع npm.
- **MySQL:** إصدار 8.4 فما فوق (المنفذ الافتراضي `3306`).
- **Composer:** لإدارة حزم ومكتبات PHP.

### 2. تشغيل قاعدة البيانات (MySQL)
تأكد من تشغيل خدمة MySQL عبر لوحة تحكم Laragon بالنقر على **Start All**، أو عبر موجه الأوامر:
```powershell
& "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqld.exe" --defaults-file="C:\laragon\bin\mysql\mysql-8.4.3-winx64\my.ini" --console
```

### 3. تشغيل الواجهة الخلفية (Laravel API)
افتح نافذة طرفية أولى وتوجه إلى مجلد `school-eval-api`:
```bash
cd school-eval-api
php artisan serve --port=8000
```
> الخادم سيعمل على: `http://127.0.0.1:8000`

### 4. تشغيل تطبيق الواجهة الأمامية (React Web)
افتح نافذة طرفية ثانية وتوجه إلى مجلد `school-eval-web`:
```bash
cd school-eval-web
npm run dev
```
> التطبيق سيعمل على: `http://localhost:3000`

### 5. حسابات التجربة والفحص المسبق (Seed Data Accounts)

| الدور الوظيفي | اسم المستخدم (Username) | كلمة المرور | المدرسة / النطاق |
|---|---|---|---|
| **مسؤول النظام (Admin)** | `admin` | `ChangeMeDevPassword@2026` | إدارة النظام المركزية |
| **مقيّم الجودة (بلقيس)** | `quality_belqees` | `ChangeMeDevPassword@2026` | مدرسة بلقيس النموذجية |
| **مدير مدرسة (بلقيس)** | `principal_belqees` | `ChangeMeDevPassword@2026` | مدرسة بلقيس النموذجية |
| **مقيّم الجودة (الفاروق)** | `quality_farouq` | `ChangeMeDevPassword@2026` | مدرسة الفاروق الأساسية |
| **مدير مدرسة (الفاروق)** | `principal_farouq` | `ChangeMeDevPassword@2026` | مدرسة الفاروق الأساسية |
| **مشرف تربوي وزاري** | `supervisor_ministry` | `ChangeMeDevPassword@2026` | وزارة التربية والتعليم |
| **مدير إدارة المعايير** | `standards_manager_ministry` | `ChangeMeDevPassword@2026` | وزارة التربية والتعليم |

### 6. أوامر الصيانة الدورية
- **مسح الكاش وإعادة التهيئة:** `cd school-eval-api && php artisan optimize:clear`
- **فحص بناء تطبيق الويب واختباراته:** `cd school-eval-web && npm run build && npm test`
- **تشغيل اختبارات الخلفية الآلية:** `cd school-eval-api && php artisan test`

---

## تشغيل الاختبارات الآلية (Automated Testing)

```bash
cd school-eval-api
php artisan test
```

**النتيجة الفعلية لحزمة الاختبارات الآلية (Ground Truth):**
- **الواجهة الخلفية (`PHPUnit`):** **516 اختباراً ناجحاً بنسبة 100% (Passed)** — **14,468 تأكيداً برمجياً (Assertions)** (0 إخفاقات، 0 أخطاء).
- **الواجهة الأمامية (`Vitest`):** **12 اختباراً ناجحاً بنسبة 100% (Passed)** عبر ملفّي اختبار (`utils.test.ts` و`portalComponents.test.tsx`).

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
> مؤشرات الأداء الإحصائية الإضافية التي تتطلب جداول تجميعية موسعة (مثل نتائج الاختبارات الوزارية المجمعة، وساعات التدريب، ونسب الغياب السلوكي) مصنفة ومؤجلة كتوسعات هندسية لما بعد الإصدار v1.0 وفق [`docs/archive/indicator-context-roadmap.md`](docs/archive/indicator-context-roadmap.md).

---

## خريطة التوثيق المرجعي الشاملة (Master Documentation Index)

الهيكل التوثيقي المعتمد للمشروع منظم وفق مبدأ المصدر المرجعي الموحد (Single Source of Truth):

### 1. الوثائق التأسيسية والمعمارية (Core Specs & Guidelines)
- [`docs/backend-gaps.md`](docs/backend-gaps.md): سجل الفجوات والانحرافات التقنية للخلفية وقرارات التصميم وحالة الإغلاق.
- [`docs/frontend-gaps.md`](docs/frontend-gaps.md): سجل فجوات الواجهات وتوحيد البوابات الخمس.
- [`docs/slices_roadmap.md`](docs/slices_roadmap.md): خارطة طريق الشرائح الهندسية لجميع الشرائح من 1 إلى 12.
- [`docs/project_master_reference.md`](docs/project_master_reference.md): المرجع المعماري الشامل لبنية النظام، الفاعلين، ومصفوفة الصلاحيات.
- [`docs/conventions.md`](docs/conventions.md): معايير البرمجة والتسمية، وقواعد الأمان، واستراتيجية الاختبارات.

### 2. توثيق الشرائح المنفذة (Implemented Slices: 0 to 10)
- [`docs/slices/README.md`](docs/slices/README.md): الفهرس المعماري الموحد لجميع الشرائح المنفذة.
- [`docs/slices/slice1_auth_admin.md`](docs/slices/slice1_auth_admin.md): الشريحة 1 - المصادقة والعزل المؤسسي وإدارة المستخدمين والمدارس.
- [`docs/slices/slice2_evaluation_evidence.md`](docs/slices/slice2_evaluation_evidence.md): الشريحة 2 - التقييم الذاتي ورصد الدرجات والشواهد.
- [`docs/slices/slice3_improvement_plans.md`](docs/slices/slice3_improvement_plans.md): الشريحة 3 - خطط وإجراءات التحسين وتتبع التأخر.
- [`docs/slices/slice4_reports_analytics.md`](docs/slices/slice4_reports_analytics.md): الشريحة 4 - التقارير والتحليلات والنتائج الموزونة واللوحة.
- [`docs/slices/slice5_evidence_organization.md`](docs/slices/slice5_evidence_organization.md): الشريحة 5 - تنظيم وتصنيف وتدقيق الشواهد وحصر النواقص.
- [`docs/slices/slice6_school_profile.md`](docs/slices/slice6_school_profile.md): الشريحة 6 - الملف التعريفي، الكادر، المرافق، وسياق المؤشرات.
- [`docs/slices/slice7_standards_management.md`](docs/slices/slice7_standards_management.md): الشريحة 7 - إدارة المعايير وإصداراتها وأوزانها النسبية.
- [`docs/slices/slice8_educational_plans.md`](docs/slices/slice8_educational_plans.md): الشريحة 8 - الخطط التربوية وبنك الإجراءات والشواهد التنفيذية.
- [`docs/slices/slice9_reports_export.md`](docs/slices/slice9_reports_export.md): الشريحة 9 - تصدير PDF/Excel، مقارنة الأداء، وتوسيع السياقات.
- [`docs/slices/slice10_cycles_notifications.md`](docs/slices/slice10_cycles_notifications.md): الشريحة 10 - إدارة الدورات، بدء التقييم، الإشعارات، واستعادة الحسابات.

### 3. واجهات برمجة التطبيقات ونقاط النهاية والتسليم (API Endpoints & Handover)
- [`docs/handover/react-integration-guide.md`](docs/handover/react-integration-guide.md): دليل التسليم البرمجي لمهندسي React (نقاط النهاية، النماذج، أخطاء الاستجابة، ورسائل التحقق).
- [`docs/api/auth_endpoints.md`](docs/api/auth_endpoints.md): مرجع نقاط نهاية المصادقة، الملف الشخصي، استعادة كلمة المرور، وإدارة المستخدمين والمدارس.
- [`docs/api/evaluation_endpoints.md`](docs/api/evaluation_endpoints.md): مرجع نقاط نهاية شجرة المعايير، التقييم الذاتي، الشواهد، وسياق المؤشرات، وبدء التقييم.
- [`docs/api/improvement_endpoints.md`](docs/api/improvement_endpoints.md): مرجع نقاط نهاية خطط التحسين، الإجراءات، الملاحظات الداخلية، وبنك الإجراءات، والخطط التربوية.
- [`docs/api/reports_analytics_endpoints.md`](docs/api/reports_analytics_endpoints.md): مرجع نقاط نهاية التقارير، التحليلات، التصدير (PDF/Excel)، والدورات، والإشعارات.

### 4. سياق المؤشرات وقواعد البيانات والمعايير الوطنية (Data Layer & Standards)
- [`docs/archive/indicator-context-roadmap.md`](docs/archive/indicator-context-roadmap.md): خارطة السياق الاسترشادي للـ 109 مؤشرات وتصنيفها الحسابي والمستقبلي.
- [`docs/models_guide.md`](docs/models_guide.md): دليل نماذج البيانات (40 نموذج Eloquent) والعلاقات والسمات والقواعد.
- [`docs/migrations_guide.md`](docs/migrations_guide.md): دليل تهيئة وتنفيذ هجرات قاعدة البيانات.
- [`docs/المعايير/معايير_الاعتماد_المستخرجة.md`](docs/المعايير/معايير_الاعتماد_المستخرجة.md): الوثيقة المرجعية الرسمية المستخرجة للمجالات والمعايير والـ 109 مؤشرات وواصفاتها.
- [`docs/chapter4/chapter4_system_design.md`](docs/chapter4/chapter4_system_design.md): التصميم الهندسي التفصيلي للفصل الرابع المتوافق مع الواقع البرمجي.

### 5. الأرشيف التاريخي وأدلة التحقق (Historical Archive & Verification)
- [`docs/archive/prototype/verification-guide.md`](docs/archive/prototype/verification-guide.md): دليل التحقق السريع المؤرشف لسيناريوهات الفحص التفاعلي.
- [`docs/archive/chapter4/`](docs/archive/chapter4/): مسودات وسجلات المزامنة التاريخية للتصميم الهندسي قبل التوحيد.
- [`docs/archive/seeders/`](docs/archive/seeders/): تقارير التدقيق والتنفيذ الأولية للبيانات المعيارية والـ Seeders.
- [`docs/archive/reports/`](docs/archive/reports/): تقارير فحص واختبار النماذج والبيانات الأولية.
- [`docs/archive/prototype/`](docs/archive/prototype/): ملاحظات التدفقات وسجلات الفجوات المبكرة للنموذج الأولي.
