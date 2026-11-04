# تقرير الاختبارات والتحقق الشامل لموديلات Eloquent وقاعدة البيانات
**مشروع:** نظام إدارة الجودة والخطط التعليمية في المدارس  
**تاريخ التنفيذ:** 15 أكتوبر 2026  
**الإصدار:** 1.0  
**بيئة الاختبار:** محرك MySQL 8.4 معزول (`school_eval_test`) عبر PHPUnit 12 و Laravel 13  
**المرجع الحاكم:** قاموس البيانات (Data Dictionary)، اتفاقيات المشروع (conventions.md)، ملفات الـ Migrations المعتمدة

---

## 1. الفكرة العامة والهدف من الاختبارات

بعد الانتهاء من بناء نماذج **Eloquent الأربعين (40 Models)** المعتمدة في النظام، تم تنفيذ حزمة اختبارات ميزات (Feature Tests) شاملة ومؤتمتة للتأكد العملي والتنفيذي — وليس النظري فقط — من:
1. سلامة وصحة `$fillable` لكافة الموديلات ومطابقتها لأعمدة قاعدة البيانات، واستبعاد المفاتيح التزايدية والحقول الحساسة.
2. الالتزام الصارم بخريطة الطوابع الزمنية (الملحق أ في conventions.md) في كل موديل.
3. إنشاء الكيانات الفعلية والتأكد من صحة العلاقات المرجعية الثنائية في الاتجاهين.
4. اختبار عمليات الجداول ذات المفاتيح المركبة الأربعة (`role_permissions`, `user_roles`, `cycle_participations`, `plan_improvement_areas`).
5. اختبار العلاقات متعددة الأشكال (Polymorphic) في `Attachment` و `Notification`.
6. اختبار آلية مصادقة المستخدم (`User`) والتجزئة الآمنة لكلمات المرور وتوافقها مع `Auth::attempt()`.
7. اختبار استجابة قيود محرك قاعدة البيانات الفعلي MySQL 8.4 (المفاتيح الأجنبية، القيود الفريدة، وقيود الفحص `CHECK` الثلاثة المعتمدة).

---

## 2. النتيجة الفعلية لتشغيل الاختبارات (`php artisan test`)

تم تشغيل الاختبارات في بيئة اختبار معزولة متصلة بقاعدة `school_eval_test` دون المساس بقاعدة البيانات التطويرية `school_eval`.

```text
PHPUnit 12.5.38 by Sebastian Bergmann and contributors.

Runtime:       PHP 8.4.20
Configuration: C:\laragon\www\school-quality-system\school-eval-api\phpunit.xml

Time: 00:02.741, Memory: 48.00 MB

Composite Key Models (Tests\Feature\CompositeKeyModels)
 ✔ Role permissions composite pivot operations
 ✔ User roles composite pivot operations
 ✔ Cycle participations composite pivot operations
 ✔ Plan improvement areas and composite action link

Core Entities Creation And Relations (Tests\Feature\CoreEntitiesCreationAndRelations)
 ✔ Standard reference hierarchy creation and bidirectional relations
 ✔ Evaluation workflow and review relations
 ✔ Ai analysis and recommendations relations

Database Constraints (Tests\Feature\DatabaseConstraints)
 ✔ Inserting non existing foreign key fails
 ✔ Inserting duplicate unique value fails
 ✔ Check constraint on improvement areas source
 ✔ Check constraint on completion request items target
 ✔ Check constraint on submission draft status

Example (Tests\Feature\Example)
 ✔ The application returns a successful response

Example (Tests\Unit\Example)
 ✔ That true is true

Models Fillable (Tests\Feature\ModelsFillable)
 ✔ There are exactly forty models
 ✔ Fillable attributes exist in database tables
 ✔ Auto incrementing primary keys are guarded from fillable
 ✔ Models follow timestamps conventions

Models Structure (Tests\Feature\ModelsStructure)
 ✔ All forty models can be instantiated and have correct tables
 ✔ Model relationships can be called

Polymorphic Relations (Tests\Feature\PolymorphicRelations)
 ✔ Attachment polymorphic relation with evidence version and report
 ✔ Notification polymorphic relation

User Authentication (Tests\Feature\UserAuthentication)
 ✔ User password is hashed and not plain text
 ✔ Auth attempt succeeds with correct credentials
 ✔ Auth attempt fails with wrong password

OK (25 tests, 470 assertions)
```

### الإحصائية الإجمالية:
* **إجمالي الاختبارات:** 25 اختباراً.
* **الاختبارات الناجحة (Passed):** 25 اختباراً (بنسبة نجاح 100%).
* **الاختبارات الفاشلة (Failed):** 0 (صفر).
* **الاختبارات المتخطاة (Skipped):** 0 (صفر).
* **إجمالي التأكيدات البرمجية (Assertions):** 470 تأكيداً برمجياً ناجحاً.

---

## 3. تفاصيل المحاور الاختبارية السبعة وماذا حصل فيها

### المحور الأول: فحص الـ `$fillable` وحماية المفاتيح والطوابع الزمنية
- **ملف الاختبار:** `tests/Feature/ModelsFillableTest.php` (4 اختبارات، 295 تأكيداً).
- **ماذا تم فحصه:**
  1. التحقق من وجود 40 موديلاً بالتمام والكمال.
  2. مقارنة مصفوفة `$fillable` لكل موديل مع الأعمدة الفعلية لجدوله عبر `Schema::getColumnListing($table)`؛ والنتيجة: لا يوجد أي حقل وهمي أو غير موجود.
  3. التحقق من استبعاد المفاتيح الأساسية التزايدية (`increments`) من مصفوفات `$fillable` في جميع الموديلات لمنع التلاعب بها.
  4. التحقق من مطابقة إعدادات التوقيت:
     - 13 موديلاً معطلة التوقيت تماماً (`$timestamps = false`).
     - 3 موديلات بـ `created_at` فقط (`UPDATED_AT = null`).
     - موديلان بـ `updated_at` فقط (`CREATED_AT = null`).
     - 22 موديلاً بالتوقيت الافتراضي (`created_at` و `updated_at`).

---

### المحور الثاني: الجداول ذات المفاتيح المركبة (Composite Keys)
- **ملف الاختبار:** `tests/Feature/CompositeKeyModelsTest.php` (4 اختبارات، 23 تأكيداً).
- **ماذا تم فحصه وماذا حصل:**
  1. **`role_permissions`:** تم ربط دور بصلاحية، والتحقق من حفظ تاريخ الإسناد `assigned_at` واستعلامه عبر الموديل، ثم فك الارتباط (`detach`) والتأكد من حذفه من القاعدة.
  2. **`user_roles`:** تم إسناد دور لمستخدم، وتحديث الحقول المخصصة في السجل المركب المزدوج (`active = false`, `revoked_at`)، والتأكد من دقة التعديل على السجل المستهدف ثم حذفه.
  3. **`cycle_participations`:** تم تسجيل مشاركة مدرسة في دورة تقييمية مركزية واستعلامها والتحقق من وجود المدرسة في علاقة الدورة والعكس.
  4. **`plan_improvement_areas` و `improvement_actions`:** تم ربط خطة بمجال تحسين عبر المفتاح المركب، ثم إنشاء إجراء تحسين مرتبط بهما بواسطة **المفتاح الأجنبي المركب** `(plan_id, area_id)`.
- **ملاحظة معمارية موثقة:** إن Eloquent بطبيعته لا يدعم استدعاء `Model::find([$id1, $id2])` تلقائياً للمفاتيح المركبة؛ والحل المعتمد والمطبق بنجاح هو إدارة هذه السجلات إما كعلاقات `belongsToMany` مع جداول الـ Pivot، أو عبر استعلامات التحديد الصريحة `Model::where('col1', ...)->where('col2', ...)`.

---

### المحور الثالث: العلاقات متعددة الأشكال (Polymorphic Relations)
- **ملف الاختبار:** `tests/Feature/PolymorphicRelationsTest.php` (اختباران، 7 تأكيدات).
- **ماذا تم فحصه:**
  1. **موديل `Attachment`:** تم بنجاح ربط مرفق بنسخة شاهد `evidence_version` ومرفق آخر بتقرير تقييم `report`، وتم استرجاع المرفقات والكيانات المستهدفة من كلا الطرفين عبر `target_type` و `target_id`.
  2. **موديل `Notification`:** تم إنشاء إشعار مرتبط بكيان دورة تقييم `evaluation_cycle` وجلبه بنجاح من طرف المستخدم المستلم وطرف الإشعار.

---

### المحور الرابع: مصادقة المستخدم وتشفير كلمة المرور (`User`)
- **ملف الاختبار:** `tests/Feature/UserAuthenticationTest.php` (3 اختبارات، 8 تأكيدات).
- **ماذا تم فحصه وماذا حصل:**
  1. التأكد من أن كلمة المرور تُخزن دائماً مشفرة بنظام التجزئة الآمن (Bcrypt Hash) عبر `Hash::make()`، وأنها لا تخزن نصاً صريحاً إطلاقاً.
  2. التأكد من استبعاد عمود `password_hash` تلقائياً عند تحويل كائن `User` إلى JSON أو Array لحماية البيانات الحساسة.
  3. تجربة تسجيل الدخول الفعلي عبر حارس المصادقة `Auth::attempt()`:
     - نجاح الدخول عند إدخال اسم المستخدم وكلمة المرور الصحيحة.
     - فشل المصادقة تماماً عند إدخال كلمة مرور خاطئة مع بقاء `Auth::user()` فارغاً (`null`).

---

### المحور الخامس: قيود قاعدة البيانات (Database Constraints)
- **ملف الاختبار:** `tests/Feature/DatabaseConstraintsTest.php` (5 اختبارات، 5 تأكيدات).
- **ماذا تم فحصه وماذا حصل:**
  1. **فشل المفتاح الأجنبي غير الموجود:** تم اختبار إدخال مستخدم بمعرف مدرسة غير موجود (`school_id = 999999`) ورُفضت العملية فوراً برمي استثناء `QueryException` (خطأ 1452).
  2. **فشل التكرار في القيود الفريدة (Unique):** تم إدخال دورين بنفس الاسم `role_name` ورُفض السجل الثاني برمي `QueryException` (خطأ 1062).
  3. **قيد الفحص `CHECK` في `improvement_areas`:** تم اختبار إدخال مجال تحسين كلاهما NULL (`result_id` و `indicator_id`) ورُفضت العملية برمي `QueryException` (خطأ 3819).
  4. **قيد الفحص `CHECK` في `completion_request_items`:** تم اختبار إدخال بند استكمال كلاهما NULL ورُفضت العملية برمي `QueryException`.
  5. **قيد الفحص `CHECK` في `evaluation_submissions`:** تم اختبار إدخال محاولة إرسال بحالة `Draft` مع وجود تاريخ `submitted_at` غير فارغ ورُفضت العملية برمي `QueryException` مطابقةً للقيد المنصوص عليه في القاموس.

---

### المحور السادس: بناء الكيانات والعلاقات الثنائية التبادلية
- **ملف الاختبار:** `tests/Feature/CoreEntitiesCreationAndRelationsTest.php` (3 اختبارات، 33 تأكيداً).
- **ماذا تم فحصه:**
  - تم بناء واختبار السلسلة الهرمية الكاملة للإطار المرجعي:
    `StandardVersion` ⟷ `Standard` ⟷ `SubStandard` ⟷ `Indicator` ⟷ `IndicatorScoreDescriptor` / `IndicatorEvidenceRequirement` / `IndicatorVerificationMethod`.
  - تم بناء واختبار دورة التقييم والنتائج والشواهد والمراجعات والاستكمال:
    `EvaluationCycle` ⟷ `Evaluation` ⟷ `EvaluationResult` ⟷ `Evidence` ⟷ `EvidenceVersion` ⟷ `Note` ⟷ `Report` ⟷ `EvaluationSubmission` ⟷ `SupervisorNote` ⟷ `CompletionRequest` ⟷ `CompletionRequestItem`.
  - تم بناء واختبار علاقات الذكاء الاصطناعي والتوصيات والحوكمة البشرية:
    `Evaluation` ⟷ `AiAnalysis` ⟷ `AiRecommendation`.
- **النتيجة:** استرجاع السجلات في الاتجاهين بنجاح تام وتطابق المفاتيح الأجنبية والمحلية بنسبة 100%.

---

### المحور السابع: استنساخ الموديلات والربط الهيكلي
- **ملف الاختبار:** `tests/Feature/ModelsStructureTest.php` (اختباران، 97 تأكيداً).
- **ماذا تم فحصه:**
  - استنساخ كافة الموديلات الـ 40 والتحقق من ارتباط كل منها باسم الجدول والمفتاح الأساسي الصحيحين.
  - التحقق من إمكانية استدعاء دوال العلاقات الأساسية دون حدوث أي خطأ برمجي.

---

## 4. قائمة الموديلات الأربعين وحالة كل موديل في الاختبارات

| # | الموديل (Model) | الجدول المقابل | الحالة العامة |
|:---:|:---|:---|:---:|
| 1 | `Role` | `roles` | **ناجح ومطابق 100%** |
| 2 | `Permission` | `permissions` | **ناجح ومطابق 100%** |
| 3 | `RolePermission` | `role_permissions` | **ناجح ومطابق 100%** |
| 4 | `School` | `schools` | **ناجح ومطابق 100%** |
| 5 | `Ministry` | `ministries` | **ناجح ومطابق 100%** |
| 6 | `User` | `users` | **ناجح ومطابق 100%** |
| 7 | `UserRole` | `user_roles` | **ناجح ومطابق 100%** |
| 8 | `Session` | `sessions` | **ناجح ومطابق 100%** |
| 9 | `StandardVersion` | `standard_versions` | **ناجح ومطابق 100%** |
| 10 | `Standard` | `standards` | **ناجح ومطابق 100%** |
| 11 | `SubStandard` | `sub_standards` | **ناجح ومطابق 100%** |
| 12 | `Indicator` | `indicators` | **ناجح ومطابق 100%** |
| 13 | `ScoreLevel` | `score_levels` | **ناجح ومطابق 100%** |
| 14 | `IndicatorScoreDescriptor` | `indicator_score_descriptors` | **ناجح ومطابق 100%** |
| 15 | `IndicatorEvidenceRequirement` | `indicator_evidence_requirements` | **ناجح ومطابق 100%** |
| 16 | `VerificationTool` | `verification_tools` | **ناجح ومطابق 100%** |
| 17 | `IndicatorVerificationMethod` | `indicator_verification_methods` | **ناجح ومطابق 100%** |
| 18 | `EvaluationCycle` | `evaluation_cycles` | **ناجح ومطابق 100%** |
| 19 | `CycleParticipation` | `cycle_participations` | **ناجح ومطابق 100%** |
| 20 | `Evaluation` | `evaluations` | **ناجح ومطابق 100%** |
| 21 | `EvaluationResult` | `evaluation_results` | **ناجح ومطابق 100%** |
| 22 | `Evidence` | `evidences` | **ناجح ومطابق 100%** |
| 23 | `EvidenceVersion` | `evidence_versions` | **ناجح ومطابق 100%** |
| 24 | `Attachment` | `attachments` | **ناجح ومطابق 100%** |
| 25 | `Note` | `notes` | **ناجح ومطابق 100%** |
| 26 | `EvaluationResultVerificationMethod` | `evaluation_result_verification_methods` | **ناجح ومطابق 100%** |
| 27 | `ImprovementArea` | `improvement_areas` | **ناجح ومطابق 100%** |
| 28 | `ImprovementPlan` | `improvement_plans` | **ناجح ومطابق 100%** |
| 29 | `PlanImprovementArea` | `plan_improvement_areas` | **ناجح ومطابق 100%** |
| 30 | `ImprovementAction` | `improvement_actions` | **ناجح ومطابق 100%** |
| 31 | `Report` | `reports` | **ناجح ومطابق 100%** |
| 32 | `EvaluationSubmission` | `evaluation_submissions` | **ناجح ومطابق 100%** |
| 33 | `InternalReviewNote` | `internal_review_notes` | **ناجح ومطابق 100%** |
| 34 | `PlanReviewNote` | `plan_review_notes` | **ناجح ومطابق 100%** |
| 35 | `SupervisorNote` | `supervisor_notes` | **ناجح ومطابق 100%** |
| 36 | `CompletionRequest` | `completion_requests` | **ناجح ومطابق 100%** |
| 37 | `CompletionRequestItem` | `completion_request_items` | **ناجح ومطابق 100%** |
| 38 | `Notification` | `notifications` | **ناجح ومطابق 100%** |
| 39 | `AiAnalysis` | `ai_analysis` | **ناجح ومطابق 100%** |
| 40 | `AiRecommendation` | `ai_recommendations` | **ناجح ومطابق 100%** |

---

## 5. الملفات التي أُنشئت لإنجاز هذا الفحص

1. **ملفات الاختبارات الآلية المكتوبة:**
   - [`tests/Feature/ModelsFillableTest.php`](file:///c:/laragon/www/school-quality-system/school-eval-api/tests/Feature/ModelsFillableTest.php): اختبار `$fillable` والأعمدة والتوقيت لجميع الموديلات الأربعين.
   - [`tests/Feature/CompositeKeyModelsTest.php`](file:///c:/laragon/www/school-quality-system/school-eval-api/tests/Feature/CompositeKeyModelsTest.php): اختبار عمليات الجداول ذات المفاتيح المركبة الأربعة.
   - [`tests/Feature/PolymorphicRelationsTest.php`](file:///c:/laragon/www/school-quality-system/school-eval-api/tests/Feature/PolymorphicRelationsTest.php): اختبار العلاقات متعددة الأشكال (`Attachment` و `Notification`).
   - [`tests/Feature/UserAuthenticationTest.php`](file:///c:/laragon/www/school-quality-system/school-eval-api/tests/Feature/UserAuthenticationTest.php): اختبار مصادقة المستخدم وتجزئة كلمة المرور.
   - [`tests/Feature/DatabaseConstraintsTest.php`](file:///c:/laragon/www/school-quality-system/school-eval-api/tests/Feature/DatabaseConstraintsTest.php): اختبار قيود قاعدة بيانات MySQL 8.4 الفعلية.
   - [`tests/Feature/CoreEntitiesCreationAndRelationsTest.php`](file:///c:/laragon/www/school-quality-system/school-eval-api/tests/Feature/CoreEntitiesCreationAndRelationsTest.php): اختبار إنشاء الكيانات والعلاقات التبادلية في الاتجاهين.
   - [`tests/Feature/ModelsStructureTest.php`](file:///c:/laragon/www/school-quality-system/school-eval-api/tests/Feature/ModelsStructureTest.php): اختبار استنساخ الموديلات والربط الهيكلي.

2. **ملف الإعداد البيئي:**
   - [`phpunit.xml`](file:///c:/laragon/www/school-quality-system/school-eval-api/phpunit.xml): تم توجيه بيئة الاختبارات لقاعدة MySQL معزولة (`school_eval_test`) لدعم قيود MySQL 8.4 وفهارسها المعتمدة بدقة.

---

## 6. الخلاصة والتأكيد النهائي

* **نسبة النجاح:** **100%** دون أي فشل أو استثناءات متبقية.
* **سلامة قاعدة البيانات التطويرية:** قاعدة البيانات التطويرية `school_eval` ظلت سليمة ومعزولة ولم تتأثر بعمليات الاختبار (حيث تم عزل كافة الاختبارات في قاعدة `school_eval_test` وباستخدام `DatabaseTransactions`).
* **الجاهزية:** طبقة الموديلات أصبحت مثبتة ومحمية بـ 25 اختباراً و 470 تأكيداً برمجياً، وجاهزة تماماً للمرحلة التالية (بناء وحدات الخدمات Services و APIs و Controllers).
