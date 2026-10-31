# دليل وتوثيق ملفات Migrations وقاعدة البيانات
**مشروع:** نظام إدارة الجودة والخطط التعليمية في المدارس  
**تاريخ التوثيق:** أكتوبر 2026  
**الإصدار:** 1.0 (النسخة النهائية المعتمدة)  
**المرجع:** قاموس البيانات (Data Dictionary) ومخطط ERD-0 (40 جدولاً • 281 حقلاً • 63 علاقة)

---

## 1. الفكرة العامة والمعمارية لملفات Migrations

تم تجميع وتنظيم ملفات الـ Migrations في **14 ملفاً** داخل المسار:  
`school-eval-api/database/migrations/`  

تنقسم الملفات إلى:
1. **الملفات من 01 إلى 11:** تنشئ **الجداول الوظيفية الأربعين (40 جدولاً)** الخاصة بنظام التقييم والجودة دون زيادة أو نقصان، مقسمة حسب حزم الـ ERD والاعتماديات المنطقية.
2. **الملف رقم 12:** ملف توثيقي للقرارات المعمارية والمهام المستقبلية (لا ينشئ جداول في قاعدة البيانات).
3. **الملفان 13 و 14:** ملفات تشغيلية خاصة بإطار عمل Laravel لإدارة الـ Cache والـ Queue بشكل مستقل تماماً عن جداول النظام.

---

## 2. القواعد والقرارات التنفيذية الحاكمة في كل Migrations

- **المفاتيح الأساسية (PK):** تستخدم دائمًا `increments('<name>_id')` لإنتاج `UNSIGNED INT AUTO_INCREMENT` (مطابقة للقاموس).
- **المفاتيح الأجنبية (FK):** تستخدم `unsignedInteger()` مطابقة تماماً للمفتاح الأب، دون تحديد `ON DELETE` أو `ON UPDATE` صراحة (الاعتماد على **السلوك الافتراضي في MySQL** الذي يرفض حذف الأب عند وجود أبناء). لا نستخدم `CASCADE` أو `SET NULL`.
- **المفاتيح المركبة (Composite Keys):** تم تطبيق المفاتيح الأساسية المركبة `primary(['col1', 'col2'])` في جداول الربط الأربعة: `role_permissions`، `user_roles`، `cycle_participations`، `plan_improvement_areas`.
- **المفتاح الأجنبي المركب:** تم تطبيق قيد أجنبي مركب في `improvement_actions` على `(plan_id, area_id)` يشير إلى `plan_improvement_areas(plan_id, area_id)`.
- **الحالات (Enums):** جميع الحالات مخزنة كـ `VARCHAR(20)` أو `VARCHAR(30)`؛ لا نستخدم `MySQL ENUM` ولا قيود `CHECK` على قيم الحالات (تُدار عبر PHP Enums).
- **قيود الفحص (CHECK Constraints):** تم تطبيق قيود الفحص الثلاثة المنصوص عليها صراحة في القاموس فقط:
  1. `improvement_areas`: التحقق من وجود مصدر واحد على الأقل `(result_id IS NOT NULL OR indicator_id IS NOT NULL)`.
  2. `completion_request_items`: التحقق من وجود هدف واحد على الأقل `(indicator_id IS NOT NULL OR evidence_id IS NOT NULL)`.
  3. `evaluation_submissions`: شرط تاريخ الإرسال `((status = 'Draft' AND submitted_at IS NULL) OR (status <> 'Draft' AND submitted_at IS NOT NULL))`.
- **الطوابع الزمنية (Timestamps):** لا يُستخدم `$table->timestamps()` تلقائياً؛ بل تم تحديد `dateTime` لكل جدول حقلًا بحقل وفق القاموس وخريطة الملحق أ (بعض الجداول بدون تواريخ، وبعضها بـ created_at فقط، وبعضها بكلا الحقلين).
- **المراجع متعددة الأشكال (Polymorphic):** في جدولي `attachments` و `notifications` تم الربط عبر الحقول ونوع الكيان مع فهارس مركبة دون مفاتيح أجنبية مباشرة.
- **قيد النسخة الحالية (current=true):** في `evidence_versions`، قيد «نسخة واحدة فقط current=true لكل شاهد» يُفرض في طبقة التطبيق (Application Layer) وليس في قاعدة البيانات.

---

## 3. تفاصيل ملفات Migrations والجداول التي تحتويها

### 1) الملف الأول: `create_identity_entities_tables`
- **اسم الملف:** `2026_10_12_000001_create_identity_entities_tables.php`
- **الحزمة:** ERD-01 (الهوية والجهات والصلاحيات)
- **الجداول (4 جداول):**
  1. `roles`: الأدوار الوظيفية (مدير، مقيّم، مشرف، مسؤول نظام). الحقول: `role_id` (PK)، `role_name` (UK)، `description`.
  2. `permissions`: الصلاحيات الذرية. الحقول: `permission_id` (PK)، `permission_code` (UK)، `permission_name`، `description`.
  3. `schools`: المدارس التابعة للنظام وبياناتها ومراحلها والمديرية والمحافظة والحالة.
  4. `ministries`: الإدارات والجهات الوزارية التي يتبع لها المشرفون.
- **الاعتماديات:** لا تعتمد على أي جدول آخر (حجر الأساس).

---

### 2) الملف الثاني: `create_users_table`
- **اسم الملف:** `2026_10_12_000002_create_users_table.php`
- **الحزمة:** ERD-01 (الهوية والجهات والصلاحيات)
- **الجداول (جدول واحد):**
  1. `users`: حسابات المستخدمين في المنصة.
- **أهم الحقول والقيود:**
  - `user_id` (PK).
  - `school_id` و `ministry_id` مفاتيح أجنبية nullable (تمثل الحقل الشرطي لقاعدة الجهة الواحدة XOR وتُفرض في التطبيق).
  - `username` (UK فريد)، `password_hash`، `full_name`، `email`، `user_type`، `status`، `created_at`، `updated_at`.
- **الاعتماديات:** يعتمد على `schools` و `ministries`.

---

### 3) الملف الثالث: `create_identity_relations_tables`
- **اسم الملف:** `2026_10_12_000003_create_identity_relations_tables.php`
- **الحزمة:** ERD-01 (الهوية والجهات والصلاحيات)
- **الجداول (3 جداول):**
  1. `role_permissions`: ربط الأدوار بالصلاحيات. مفتاح أساسي مركب `(role_id, permission_id)`.
  2. `user_roles`: إسناد الأدوار للمستخدمين مع تتبع فترات الإسناد والإلغاء (`assigned_at`, `revoked_at`, `active`). مفتاح أساسي مركب `(user_id, role_id)`.
  3. `sessions`: سجل الجلسات الوظيفية للمستخدمين وتتبع الخمول (FR-GEN-02). الحقول: `session_id` (PK)، `session_token` (UK)، `started_at`، `ended_at`، `active`.
- **ملاحظة:** جدول `sessions` هنا هو جدول سجل أعمال للمنصة وليس جدول جلسات إطار عمل Laravel (حيث تم ضبط `SESSION_DRIVER=file`).
- **الاعتماديات:** يعتمد على `roles`، `permissions`، `users`.

---

### 4) الملف الرابع: `create_standard_reference_tables`
- **اسم الملف:** `2026_10_12_000004_create_standard_reference_tables.php`
- **الحزمة:** ERD-02 (الإطار المرجعي والإصدارات)
- **الجداول (5 جداول - مرتبة هرمياً):**
  1. `standard_versions`: الإصدارات المعيارية المعتمدة (رقم الإصدار فريد `version_no`، تاريخ الإصدار، جهة الاعتماد).
  2. `standards`: المعايير الرئيسة التابعة للإصدار ووزنها النسبي `weight`.
  3. `sub_standards`: المعايير الفرعية التابعة للمعايير الرئيسة.
  4. `indicators`: المؤشرات التفصيلية (وحدة التقييم الذرية في النظام - قرار RC-06) مع حالتها ووزنها.
  5. `score_levels`: سلم التقدير الرسمي المعتمد للإصدار (قيم الدرجات من 0 إلى 3 والتسميات الرسمية).
- **الاعتماديات:** يعتمد تسلسلياً داخل الملف، وجذرها `standard_versions`.

---

### 5) الملف الخامس: `create_indicator_support_tables`
- **اسم الملف:** `2026_10_12_000005_create_indicator_support_tables.php`
- **الحزمة:** ERD-02 (دعم المؤشرات وأدوات التحقق)
- **الجداول (4 جداول):**
  1. `verification_tools`: بنك أدوات وأساليب التحقق المعتمدة (بطاقة ملاحظة، مقابلة، استبانة...).
  2. `indicator_score_descriptors`: الأوصاف التقديرية التفصيلية لكل مؤشر عند كل درجة من درجات السلم (0–3).
  3. `indicator_evidence_requirements`: الشواهد والأدلة المرجعية المطلوبة رسميًا لكل مؤشر.
  4. `indicator_verification_methods`: ربط المؤشرات بأدوات التحقق المقررة لها مع إرشادات التطبيق.
- **الاعتماديات:** يعتمد على `indicators`، `score_levels`، `standard_versions`.

---

### 6) الملف السادس: `create_evaluation_cycle_tables`
- **اسم الملف:** `2026_10_12_000006_create_evaluation_cycle_tables.php`
- **الحزمة:** ERD-03 (دورات التقييم والملفات المدرسية)
- **الجداول (3 جداول):**
  1. `evaluation_cycles`: الدورات التقييمية المركزية (العام الدراسي، تاريخ البداية والنهاية، الحالة Active/Closed).
  2. `cycle_participations`: جدول الربط المركزي لمشاركة المدارس في الدورات. مفتاح أساسي مركب `(cycle_id, school_id)`.
  3. `evaluations`: ملف التقييم الذاتي الفعلي للمدرسة في الدورة. يتضمن قيد `UNIQUE (cycle_id, school_id)` لمنع إنشاء أكثر من ملف تقييم للمدرسة في نفس الدورة.
- **الاعتماديات:** يعتمد على `standard_versions`، `schools`، `users`.

---

### 7) الملف السابع: `create_evaluation_result_and_evidence_tables`
- **اسم الملف:** `2026_10_12_000007_create_evaluation_result_and_evidence_tables.php`
- **الحزمة:** ERD-03 (نتائج التقييم والشواهد والمرفقات)
- **الجداول (6 جداول):**
  1. `evaluation_results`: النتيجة الرقمية والنصية لكل مؤشر مقرونة بالوصف المختار وحالة الإدخال.
  2. `evidences`: الشواهد والأدلة المرفوعة لإثبات نتيجة المؤشر مع التعليل والمبررات.
  3. `evidence_versions`: النسخ المتسلسلة للشاهد عند التعديل أو الاستبدال أثناء الاستكمال مع حقل `current`.
  4. `attachments`: الملفات المرفوعة فعليًا (مرجع متعدد الأشكال Polymorphic عبر `target_type` و `target_id` مع فهرس مركب).
  5. `notes`: الملاحظات التوثيقية المسجلة على نتائج التقييم.
  6. `evaluation_result_verification_methods`: أدوات التحقق المطبقة فعليًا في تقييم النتيجة. (تستخدم قيود FK مختصرة صراحة لتفادي حد الـ 64 حرفاً في MySQL).
- **الاعتماديات:** يعتمد على `evaluations`، `indicators`، `indicator_score_descriptors`، `standard_versions`، `users`، `verification_tools`.

---

### 8) الملف الثامن: `create_improvement_planning_tables`
- **اسم الملف:** `2026_10_12_000008_create_improvement_planning_tables.php`
- **الحزمة:** ERD-04 (خطط ومجالات وإجراءات التحسين)
- **الجداول (4 جداول):**
  1. `improvement_areas`: مجالات التحسين المستهدفة مع قيد فحص `CHECK (result_id IS NOT NULL OR indicator_id IS NOT NULL)`.
  2. `improvement_plans`: خطط تحسين أداء المدرسة المرتبطة بالدورة التقييمية ومواعيدها وتطور إنجازها.
  3. `plan_improvement_areas`: ربط الخطط بمجالات التحسين (Many-to-Many). مفتاح أساسي مركب `(plan_id, area_id)`.
  4. `improvement_actions`: الإجراءات التنفيذية بمسؤوليها وتواريخ إنجازها.
- **ملاحظة محورية:** جدول `improvement_actions` يحتوي قيد **FK مركب واحد** على `(plan_id, area_id)` يشير لـ `plan_improvement_areas(plan_id, area_id)` لضمان عدم خروج الإجراء عن خطته ومجالاتها.
- **الاعتماديات:** يعتمد على `evaluation_results`، `indicators`، `evaluation_cycles`، `schools`، `users`.

---

### 9) الملف التاسع: `create_reports_and_submissions_tables`
- **اسم الملف:** `2026_10_12_000009_create_reports_and_submissions_tables.php`
- **الحزمة:** ERD-05 (التقارير والمخرجات والمراجعات)
- **الجداول (5 جداول):**
  1. `reports`: تقارير التقييم المولدة رسمياً وحالتها (Draft, Final).
  2. `evaluation_submissions`: محاولات رفع وتسليم المخرج للوزارة بحالاتها الخمس (SubmissionStatus). تتضمن قيد `UNIQUE (report_id, attempt_no)` وقيد فحص `CHECK` لتاريخ الإرسال `submitted_at`.
  3. `internal_review_notes`: ملاحظات المراجعة الداخلية لمدير المدرسة على التقرير قبل تسليمه.
  4. `plan_review_notes`: ملاحظات مدير المدرسة على خطة التحسين وإجراءاتها.
  5. `supervisor_notes`: ملاحظات المشرف الوزاري على محاولة الإرسال (مرتبطة بـ `submission_id`).
- **الاعتماديات:** يعتمد على `evaluations`، `users`، `improvement_plans`.

---

### 10) الملف العاشر: `create_completion_workflow_tables`
- **اسم الملف:** `2026_10_12_000010_create_completion_workflow_tables.php`
- **الحزمة:** ERD-05 (مسار عمل طلبات الاستكمال)
- **الجداول (جدولان):**
  1. `completion_requests`: طلبات الاستكمال الصادرة من المشرف الوزاري عند وجود نواقص في التقرير وحالتها (Open, Resolved).
  2. `completion_request_items`: البنود التفصيلية للنواقص المطلوب استيفاؤها، مع قيد فحص `CHECK (indicator_id IS NOT NULL OR evidence_id IS NOT NULL)` لضمان تحديد الهدف بدقة.
- **الاعتماديات:** يعتمد على `evaluation_submissions`، `users`، `indicators`، `evidences`.

---

### 11) الملف الحادي عشر: `create_notifications_and_ai_tables`
- **اسم الملف:** `2026_10_12_000011_create_notifications_and_ai_tables.php`
- **الحزمة:** ERD-05 (الإشعارات والتحليل الذكي وتوصيات الذكاء الاصطناعي)
- **الجداول (3 جداول):**
  1. `notifications`: سجل الإشعارات الدائم للمستخدمين (سجل محفوظ دائمًا لا يحذف - FR-GEN-05) مع فهارس مركبة لتسريع البحث وقراءة التنبيهات.
  2. `ai_analysis`: سجلات وعمليات التحليل الذكي للتقييم التي يطلبها المستخدم ونطاق مدخلاتها ونتائجها العامة.
  3. `ai_recommendations`: مخرجات وتوصيات المساعد الذكي (نقاط قوة، أولويات تحسين، مقترحات خطط)، مع خضوعها الإلزامي للحاكمية والتعديل والقبول البشري (`human_modifications`, `status`).
- **الاعتماديات:** يعتمد على `users`، `evaluations`، `improvement_actions`.

---

### 12) الملف الثاني عشر: `create_project_future_decisions_notes_table`
- **اسم الملف:** `2026_10_12_000012_create_project_future_decisions_notes_table.php`
- **الوظيفة:** **ملف توثيقي معماري فقط** (لا ينشئ أي جداول في قاعدة البيانات).
- **المحتوى:**
  - توثيق القرارات المعتمدة النهائية (سياسة FK، فرض current=true برمجياً، عدم إضافة جداول خارج القاموس).
  - قائمة المهام المستقبلية (بناء الـ 40 Model، Seeders، اختبارات التكامل، خريطة الطوابع الزمنية بالملحق أ).
  - توثيق القرارات غير المحسومة (حسم آلية Sanctum/JWT، تعارض FR-SUP-16 مع المشرف).

---

### 13) الملف الثالث عشر: `create_laravel_cache_table`
- **اسم الملف:** `2026_10_12_000013_create_laravel_cache_table.php`
- **الوظيفة:** جدول تشغيلي لإطار Laravel (مستقل عن ERD المشروع).
- **الجداول:** `cache`, `cache_locks`.
- **السبب:** دعم إعداد `CACHE_STORE=database` في ملف البيئة `.env`.

---

### 14) الملف الرابع عشر: `create_laravel_jobs_table`
- **اسم الملف:** `2026_10_12_000014_create_laravel_jobs_table.php`
- **الوظيفة:** جداول تشغيلية لإطار Laravel (مستقلة عن ERD المشروع).
- **الجداول:** `jobs`, `job_batches`, `failed_jobs`.
- **السبب:** دعم طوابير المهام الخلفية (Queue) لمعالجة تحليلات الذكاء الاصطناعي وإرسال التنبيهات وفق إعداد `QUEUE_CONNECTION=database`.

---

## 4. ملخص جدول المطابقة السريعة

| الحزمة في القاموس | عدد الجداول | الملف المسؤول |
|:---|:---:|:---|
| **ERD-01:** الهوية والجهات والصلاحيات | 8 جداول | الملفات: `000001`، `000002`، `000003` |
| **ERD-02:** الإطار المرجعي وأدوات التحقق | 9 جداول | الملفات: `000004`، `000005` |
| **ERD-03:** دورات التقييم والنتائج والشواهد | 9 جداول | الملفات: `000006`، `000007` |
| **ERD-04:** خطط وإجراءات التحسين | 4 جداول | الملف: `000008` |
| **ERD-05:** التقارير والاستكمال والذكاء الاصطناعي | 10 جداول | الملفات: `000009`، `000010`، `000011` |
| **التوثيق المعماري المستقبلي** | 0 جدول | الملف: `000012` |
| **جداول Laravel التشغيلية** | 5 جداول | الملفات: `000013` (Cache)، `000014` (Jobs) |
| **المجموع الوظيفي للـ ERD** | **40 جدولاً** | **مطابقة تامة 100% لقاموس البيانات ومخطط ERD-0** |
