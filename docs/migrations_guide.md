# دليل وتوثيق ملفات Migrations وقاعدة البيانات
**مشروع:** نظام إدارة الجودة والخطط التعليمية في المدارس  
**تاريخ التوثيق:** 3 نوفمبر 2026م (محدث ومعتمد بعد تصحيحات 1 و 2 و 3)  
**الإصدار:** 2.0 (النسخة النهائية المحدثة)  
**المرجع:** قاموس البيانات المحدث ومخطط ERD-0 (42 جدولاً أساسياً • 301 حقلاً • معمارية الشواهد وسجل التدقيق)

---

## 1. الفكرة العامة والمعمارية لملفات Migrations

تم تنظيم وتطوير ملفات الـ Migrations داخل المسار:  
`school-eval-api/database/migrations/`  

تنقسم ملفات التهجير في النظام إلى:
1. **التهجيرات الأساسية (01 إلى 11):** أنشأت الهيكل الأولي للجداول الأربعين.
2. **ملف التوثيق المعماري (12):** توثيق القرارات المعمارية.
3. **الجداول التشغيلية لإطار Laravel (13 و 14 و Personal Access Tokens):** إدارة الـ Cache والـ Queue والـ Tokens.
4. **تهجيرات الترقية والتصحيحات المعمارية (نوفمبر 2026):**
   - ترقية معمارية الشواهد إلى النمط النظيف ثلاثي المستويات وإسقاط الجداول القديمة (U-24).
   - ترقية مسار الاستكمال وإضافة المهل الزمنية وحقل رابط الشاهد (U-03, U-11, U-29).
   - إنشاء جدول سجل التدقيق غير القابل للتعديل `audit_logs` (U-08).
   - إضافة حقل التقدير المستهدف `target_score` لجدول `improvement_areas` (U-23).

---

## 2. القواعد والقرارات التنفيذية الحاكمة في Migrations

- **المفاتيح الأساسية (PK):** تستخدم `increments('<name>_id')` في الجداول القديمة و `increments('id')` في جداول المعمارية الجديدة و `log_id` في سجل التدقيق لإنتاج `UNSIGNED INT AUTO_INCREMENT`.
- **المفاتيح الأجنبية (FK):** تستخدم `unsignedInteger()` مطابقة تماماً للمفتاح الأب؛ وتعتمد الحماية الصارمة ضد الحذف العشوائي (`RESTRICT` الافتراضي في MySQL لحماية النسخ والوثائق المعتمدة كشواهد تقييمية).
- **المفاتيح المركبة (Composite Keys):** تم تطبيق المفاتيح الأساسية المركبة `primary(['col1', 'col2'])` في جداول الربط: `role_permissions`، `user_roles`، `cycle_participations`، `plan_improvement_areas`.
- **المفتاح الأجنبي المركب:** تم تطبيق قيد أجنبي مركب في `improvement_actions` على `(plan_id, area_id)` يشير إلى `plan_improvement_areas(plan_id, area_id)`.
- **معمارية الشواهد ثلاثية المستويات (U-24):**
  1. `school_documents`: وعاء الوثيقة المدرسية.
  2. `document_versions`: نسخ الملفات المرفوعة وتتبع الإصدارات مع قيد تفرّد `UNIQUE (school_document_id, version_no)`.
  3. `evidence_links`: روابط الاستدلال التقييمي مع قيد تفرّد حاسم `UNIQUE (evaluation_id, indicator_id, document_version_id)` لمنع تكرار ربط نفس نسخة المستند بنفس المؤشر لنفس التقييم.
- **إسقاط الجداول القديمة:** تم إسقاط جدولي `evidences` و `evidence_versions` نهائياً بعد نقل المعمارية بأمان.
- **سجل التدقيق (U-08):** جدول `audit_logs` محصن للإضافة فقط (Append-Only) لا يحتوي على `updated_at`، مع فهارس على العمليات والتواريخ والكيانات المستهدفة.

---

## 3. تفاصيل ملفات التهجير المعمارية والتصحيحية

### أ. ملفات التأسيس الهيكلي
* `2026_10_12_000001_create_identity_entities_tables.php`: أدوار وصلاحيات ومدارس ووزارات (`roles`, `permissions`, `schools`, `ministries`).
* `2026_10_12_000002_create_users_table.php`: حسابات المستخدمين وقيد XOR (`users`).
* `2026_10_12_000003_create_identity_relations_tables.php`: ربط الصلاحيات بالأدوار والأدوار بالمستخدمين (`role_permissions`, `user_roles`, `sessions`).
* `2026_10_12_000004_create_standard_reference_tables.php`: الإصدارات والمعايير والمؤشرات والواصفات (`standard_versions`, `standards`, `sub_standards`, `indicators`, `score_levels`, `indicator_score_descriptors`).
* `2026_10_12_000005_create_indicator_support_tables.php`: متطلبات الشواهد وأدوات التحقق (`indicator_evidence_requirements`, `verification_tools`, `indicator_verification_methods`).
* `2026_10_12_000006_create_evaluation_cycle_tables.php`: الدورات التقييمية ومشاركة المدارس وملفات التقييم (`evaluation_cycles`, `cycle_participations`, `evaluations`).
* `2026_10_12_000007_create_evaluation_result_and_evidence_tables.php`: نتائج التقييم والملاحظات والمرفقات وأدوات التحقق الفعلية (`evaluation_results`, `notes`, `attachments`, `evaluation_result_verification_methods`).
* `2026_10_12_000008_create_improvement_planning_tables.php`: خطط ومجالات وإجراءات التحسين (`improvement_areas`, `improvement_plans`, `plan_improvement_areas`, `improvement_actions`).
* `2026_10_12_000009_create_reports_and_submissions_tables.php`: التقارير والمحاولات والملاحظات الإشرافية والداخلية (`reports`, `evaluation_submissions`, `internal_review_notes`, `plan_review_notes`, `supervisor_notes`).
* `2026_10_12_000010_create_completion_workflow_tables.php`: طلبات الاستكمال وبنودها الأولية (`completion_requests`, `completion_request_items`).
* `2026_10_12_000011_create_notifications_and_ai_tables.php`: الإشعارات الدائمة والتحليل الذكي والتوصيات (`notifications`, `ai_analysis`, `ai_recommendations`).

### ب. ملفات الترقية والتصحيحات المعمارية (نوفمبر 2026)
1. **`2026_11_02_100000_create_evidence_architecture_tables.php` (U-24):**
   إنشاء جداول المعمارية النظيفة الثلاثة: `school_documents` و `document_versions` و `evidence_links`.
2. **`2026_11_02_110000_add_action_id_to_evidence_links_table.php` (U-24):**
   إضافة المفتاح الأجنبي `action_id` لجدول `evidence_links` لربط الشواهد بإجراءات خطط التحسين.
3. **`2026_11_02_120000_drop_legacy_evidence_tables.php` (U-24):**
   إسقاط المفتاح القديم `evidence_id` من بنود الاستكمال، وإسقاط الجداول القديمة `evidence_versions` و `evidences`.
4. **`2026_11_03_100000_upgrade_completion_requests_and_items_schema.php` (U-03, U-11, U-29):**
   - إضافة حقول المهلة الزمنية وتمديدها في `completion_requests` (`completion_deadline`, `deadline_extended_at`, `deadline_extensions_count`).
   - إضافة `evidence_link_id` وجعل `indicator_id` إلزامياً في `completion_request_items`.
5. **`2026_11_03_200000_create_audit_logs_table.php` (U-08):**
   إنشاء جدول `audit_logs` المستقل بـ 11 حقلاً لتسجيل العمليات الحساسة للإضافة فقط.
6. **`2026_11_03_200001_add_target_score_to_improvement_areas_table.php` (U-23):**
   إضافة حقل `target_score` (tinyint unsigned, default 3) لجدول `improvement_areas`.

---

## 4. ملخص جدول المطابقة النهائي (42 جدولاً أساسياً)

| الحزمة في القاموس | عدد الجداول | أسماء الجداول الفعلية في قاعدة البيانات |
|:---|:---:|:---|
| **ERD-01:** الهوية والجهات والصلاحيات | 8 جداول | `roles`, `permissions`, `role_permissions`, `schools`, `ministries`, `users`, `user_roles`, `sessions` |
| **ERD-02:** الإطار المرجعي وأدوات التحقق | 9 جداول | `standard_versions`, `standards`, `sub_standards`, `indicators`, `score_levels`, `indicator_score_descriptors`, `indicator_evidence_requirements`, `verification_tools`, `indicator_verification_methods` |
| **ERD-03:** دورات التقييم والشواهد النظيفة | 10 جداول | `evaluation_cycles`, `cycle_participations`, `evaluations`, `evaluation_results`, `school_documents`, `document_versions`, `evidence_links`, `attachments`, `notes`, `evaluation_result_verification_methods` |
| **ERD-04:** خطط وإجراءات التحسين | 4 جداول | `improvement_areas`, `improvement_plans`, `plan_improvement_areas`, `improvement_actions` |
| **ERD-05:** التقارير والاستكمال والتدقيق والذكاء | 11 جدولاً | `reports`, `evaluation_submissions`, `internal_review_notes`, `plan_review_notes`, `supervisor_notes`, `completion_requests`, `completion_request_items`, `notifications`, `audit_logs`, `ai_analysis`, `ai_recommendations` |
| **جداول Laravel التشغيلية** | 6 جداول | `migrations`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `personal_access_tokens` |
| **المجموع الوظيفي للـ ERD** | **42 جدولاً** | **301 حقلاً • مطابقة تامة 100% للنظام الفعلي** |
