# دليل وتوثيق نماذج Eloquent (Models Guide)
**مشروع:** نظام إدارة الجودة والخطط التعليمية في المدارس  
**تاريخ التوثيق:** 14 أكتوبر 2026  
**الإصدار:** 1.0 (النسخة المعتمدة)  
**المرجع:** قاموس البيانات (Data Dictionary)، اتفاقيات المشروع (conventions.md)، ملفات الـ Migrations المعتمدة (40 جدولاً).

---

## 1. الفكرة العامة والقرارات المعمارية المعتمدة في الموديلات

تم إنشاء **40 موديلاً متكاملاً (Eloquent Models)** داخل المسار:  
`school-eval-api/app/Models/`  

تمثل هذه الموديلات جميع كيانات وجداول الـ ERD المعتمدة دون زيادة أو نقصان، مع الالتزام بالقرارات المعمارية التالية:

1. **تسمية الموديلات والمفاتيح الأساسية:**
   - تسمية الموديل بصيغة المفرد PascalCase (مثل: `EvaluationResult`, `StandardVersion`).
   - تحديد الجدول صراحة في كل موديل عبر `protected $table = '...';`.
   - تخصيص المفتاح الأساسي عبر `protected $primaryKey = '...';` ليتطابق مع حقول القاموس (`<entity>_id`) وليس الـ `id` الافتراضي.
   - في الجداول ذات المفاتيح المركبة (`role_permissions`, `user_roles`, `cycle_participations`, `plan_improvement_areas`) تم ضبط `public $incrementing = false;` ومصفوفة المفاتيح المركبة.

2. **الالتزام الحرفي بخريطة الطوابع الزمنية (الملحق أ في conventions.md):**
   - **الوضع الافتراضي (الحقلان created_at و updated_at مفعلان):** 22 موديلاً.
   - **created_at فقط (`const UPDATED_AT = null;`):** 3 موديلات (`IndicatorVerificationMethod`, `PlanImprovementArea`, `Notification`).
   - **updated_at فقط (`const CREATED_AT = null;`):** موديلان (`Report`, `EvaluationSubmission` حيث يتم تسجيل التوليد والإرسال يدوياً عبر `generated_at` و `submitted_at`).
   - **تعطيل الطوابع الزمنية تماماً (`public $timestamps = false;`):** 13 موديلاً (`Role`, `Permission`, `RolePermission`, `School`, `Ministry`, `UserRole`, `ScoreLevel`, `IndicatorScoreDescriptor`, `IndicatorEvidenceRequirement`, `EvaluationResultVerificationMethod`... إلخ).

3. **الحقول المسموح تعيينها جماعياً ($fillable) والتحويلات ($casts):**
   - تحديد الحقول المسموحة بدقة لحماية التطبيق من ثغرة Mass Assignment.
   - تحويل حقول التواريخ والأوقات إلى `date` و `datetime`، والحقول الرقمية إلى `integer` و `decimal:2`، والمنطقية إلى `boolean`.
   - في موديل `User`: تم تخصيص دالة `getAuthPasswordName()` لتعيد `password_hash` بدلاً من `password` الافتراضي.

4. **العلاقات المرجعية (Relationships):**
   - ربط كافة العلاقات ببارامترات صريحة للمفاتيح الأجنبية والمحلية لضمان عدم حدوث أي خطأ في استنتاج المفاتيح من قِبل Laravel.
   - تمثيل العلاقات متعددة الأشكال (Polymorphic) في `Attachment` (لـ `evidence_version` و `report`) وفي `Notification` (للكيان المصدر).
   - توثيق القيود المفروضة على مستوى التطبيق (مثل: شرط التبعية الحصرية XOR في `User`، وقيد النسخة النشطة الواحدة `current=true` في `EvidenceVersion`).

---

## 2. فهرس وتفاصيل الموديلات الأربعين حسب الحزم (ERD Packages)

### الحزمة الأولى: ERD-01 (الهوية والجهات والصلاحيات) — 8 موديلات
| # | الموديل (Model) | الجدول المقابل | المفتاح الأساسي (PK) | الطوابع الزمنية | أهم العلاقات |
|:---:|:---|:---|:---:|:---:|:---|
| 1 | `Role` | `roles` | `role_id` | معطلة | `permissions()` (BelongsToMany), `users()` (BelongsToMany), `userRoles()` (HasMany) |
| 2 | `Permission` | `permissions` | `permission_id` | معطلة | `roles()` (BelongsToMany), `rolePermissions()` (HasMany) |
| 3 | `RolePermission` | `role_permissions` | `['role_id', 'permission_id']` | معطلة | `role()` (BelongsTo), `permission()` (BelongsTo) |
| 4 | `School` | `schools` | `school_id` | معطلة | `users()` (HasMany), `cycles()` (BelongsToMany), `evaluations()` (HasMany), `improvementPlans()` (HasMany) |
| 5 | `Ministry` | `ministries` | `ministry_id` | معطلة | `users()` (HasMany) |
| 6 | `User` | `users` | `user_id` | افتراضي | `school()` (BelongsTo), `ministry()` (BelongsTo), `roles()` (BelongsToMany), `evaluations()`, `notes()`, `sessions()` |
| 7 | `UserRole` | `user_roles` | `['user_id', 'role_id']` | معطلة | `user()` (BelongsTo), `role()` (BelongsTo) |
| 8 | `Session` | `sessions` | `session_id` | افتراضي | `user()` (BelongsTo) — سجل الجلسات الوظيفية وتتبع الخمول (FR-GEN-02) |

---

### الحزمة الثانية: ERD-02 (الإطار المرجعي والإصدارات وأدوات التحقق) — 9 موديلات
| # | الموديل (Model) | الجدول المقابل | المفتاح الأساسي (PK) | الطوابع الزمنية | أهم العلاقات |
|:---:|:---|:---|:---:|:---:|:---|
| 9 | `StandardVersion` | `standard_versions` | `version_id` | افتراضي | `standards()` (HasMany), `scoreLevels()` (HasMany), `evaluationCycles()` (HasMany) |
| 10 | `Standard` | `standards` | `standard_id` | افتراضي | `version()` (BelongsTo), `subStandards()` (HasMany) |
| 11 | `SubStandard` | `sub_standards` | `sub_standard_id` | افتراضي | `standard()` (BelongsTo), `indicators()` (HasMany) |
| 12 | `Indicator` | `indicators` | `indicator_id` | افتراضي | `subStandard()` (BelongsTo), `scoreDescriptors()`, `evidenceRequirements()`, `verificationTools()`, `evaluationResults()` |
| 13 | `ScoreLevel` | `score_levels` | `score_level_id` | معطلة | `version()` (BelongsTo), `descriptors()` (HasMany) |
| 14 | `IndicatorScoreDescriptor` | `indicator_score_descriptors` | `descriptor_id` | معطلة | `indicator()` (BelongsTo), `scoreLevel()` (BelongsTo), `standardVersion()` (BelongsTo) |
| 15 | `IndicatorEvidenceRequirement` | `indicator_evidence_requirements` | `requirement_id` | معطلة | `indicator()` (BelongsTo), `standardVersion()` (BelongsTo) |
| 16 | `VerificationTool` | `verification_tools` | `tool_id` | افتراضي | `indicators()` (BelongsToMany), `evaluationResultVerificationMethods()` (HasMany) |
| 17 | `IndicatorVerificationMethod` | `indicator_verification_methods` | `id` | `created_at` فقط | `indicator()` (BelongsTo), `tool()` (BelongsTo) |

---

### الحزمة الثالثة: ERD-03 (دورات التقييم والنتائج والشواهد) — 9 موديلات
| # | الموديل (Model) | الجدول المقابل | المفتاح الأساسي (PK) | الطوابع الزمنية | أهم العلاقات |
|:---:|:---|:---|:---:|:---:|:---|
| 18 | `EvaluationCycle` | `evaluation_cycles` | `cycle_id` | افتراضي | `version()` (BelongsTo), `schools()` (BelongsToMany), `evaluations()` (HasMany) |
| 19 | `CycleParticipation` | `cycle_participations` | `['cycle_id', 'school_id']` | افتراضي | `cycle()` (BelongsTo), `school()` (BelongsTo) |
| 20 | `Evaluation` | `evaluations` | `evaluation_id` | افتراضي | `cycle()` (BelongsTo), `school()` (BelongsTo), `creator()` (BelongsTo), `results()`, `reports()` |
| 21 | `EvaluationResult` | `evaluation_results` | `result_id` | افتراضي | `evaluation()`, `indicator()`, `scoreDescriptor()`, `evaluator()`, `evidences()`, `notes()`, `verificationTools()` |
| 22 | `Evidence` | `evidences` | `evidence_id` | افتراضي | `result()` (BelongsTo), `indicator()` (BelongsTo), `versions()` (HasMany), `currentVersion()` (HasOne) |
| 23 | `EvidenceVersion` | `evidence_versions` | `evidence_version_id` | افتراضي | `evidence()` (BelongsTo), `attachments()` (HasMany) |
| 24 | `Attachment` | `attachments` | `attachment_id` | افتراضي | `target()` (MorphTo متعدد الأشكال: `evidence_version` أو `report`) |
| 25 | `Note` | `notes` | `note_id` | افتراضي | `result()` (BelongsTo), `author()` (BelongsTo) |
| 26 | `EvaluationResultVerificationMethod` | `evaluation_result_verification_methods` | `id` | معطلة | `evaluationResult()` (BelongsTo), `tool()` (BelongsTo) |

---

### الحزمة الرابعة: ERD-04 (خطط التحسين وإجراءاتها) — 4 موديلات
| # | الموديل (Model) | الجدول المقابل | المفتاح الأساسي (PK) | الطوابع الزمنية | أهم العلاقات |
|:---:|:---|:---|:---:|:---:|:---|
| 27 | `ImprovementArea` | `improvement_areas` | `area_id` | افتراضي | `result()` (BelongsTo), `indicator()` (BelongsTo), `plans()` (BelongsToMany) |
| 28 | `ImprovementPlan` | `improvement_plans` | `plan_id` | افتراضي | `cycle()`, `school()`, `creator()`, `areas()` (BelongsToMany), `actions()` (HasMany) |
| 29 | `PlanImprovementArea` | `plan_improvement_areas` | `['plan_id', 'area_id']` | `created_at` فقط | `plan()` (BelongsTo), `area()` (BelongsTo), `actions()` (HasMany) |
| 30 | `ImprovementAction` | `improvement_actions` | `action_id` | افتراضي | `plan()` (BelongsTo), `area()` (BelongsTo), `planArea()` (BelongsTo - قيد مركب), `aiRecommendations()` |

---

### الحزمة الخامسة: ERD-05 (التقارير والمخرجات والاستكمال والإشعارات والذكاء الاصطناعي) — 10 موديلات
| # | الموديل (Model) | الجدول المقابل | المفتاح الأساسي (PK) | الطوابع الزمنية | أهم العلاقات |
|:---:|:---|:---|:---:|:---:|:---|
| 31 | `Report` | `reports` | `report_id` | `updated_at` فقط | `evaluation()` (BelongsTo), `submissions()` (HasMany), `internalReviewNotes()`, `attachments()` |
| 32 | `EvaluationSubmission` | `evaluation_submissions` | `submission_id` | `updated_at` فقط | `report()` (BelongsTo), `submittedBy()` (BelongsTo), `supervisorNotes()`, `completionRequests()` |
| 33 | `InternalReviewNote` | `internal_review_notes` | `note_id` | افتراضي | `report()` (BelongsTo), `author()` (BelongsTo) |
| 34 | `PlanReviewNote` | `plan_review_notes` | `note_id` | افتراضي | `plan()` (BelongsTo), `author()` (BelongsTo) |
| 35 | `SupervisorNote` | `supervisor_notes` | `note_id` | افتراضي | `submission()` (BelongsTo), `author()` (BelongsTo) — مرتبط بـ submission_id |
| 36 | `CompletionRequest` | `completion_requests` | `request_id` | افتراضي | `submission()` (BelongsTo), `issuedBy()` (BelongsTo), `items()` (HasMany) |
| 37 | `CompletionRequestItem` | `completion_request_items` | `request_item_id` | افتراضي | `request()` (BelongsTo), `indicator()` (BelongsTo), `evidence()` (BelongsTo) |
| 38 | `Notification` | `notifications` | `notification_id` | `created_at` فقط | `recipient()` (BelongsTo), `relatedEntity()` (MorphTo) — سجل إشعارات دائم |
| 39 | `AiAnalysis` | `ai_analysis` | `analysis_id` | افتراضي | `evaluation()` (BelongsTo), `requestedBy()` (BelongsTo), `recommendations()` (HasMany) |
| 40 | `AiRecommendation` | `ai_recommendations` | `recommendation_id` | افتراضي | `analysis()` (BelongsTo), `improvementAction()` (BelongsTo - خاضع للمراجعة والقبول البشري) |

---

## 3. نتائج التحقق والاختبارات الآلية

تم فحص سلامة بناء الجمل البرمجية وتكامل الموديلات عبر مجموعة فحوصات شاملة:
1. **فحص الـ Syntax (PHP Lint):** خلو كافة الملفات الـ 40 من أي خطأ نحوي أو تصريحي.
2. **فحص استنتاج الجداول والمفاتيح:** تم كتابة وتشغيل اختبار وظيفي مخصص:  
   `Tests\Feature\ModelsStructureTest`  
   تحقق من مطابقة الجداول الـ 40 ومفاتيها واستدعاء دوال العلاقات الأساسية بنجاح.
3. **نتائج تشغيل جناح الاختبارات الكامل (`php artisan test`):**
   ```text
   PASS Tests\Unit\ExampleTest (1 test)
   PASS Tests\Feature\ExampleTest (1 test)
   PASS Tests\Feature\ModelsStructureTest (2 tests, 97 assertions)
   ---------------------------------------------------------------
   Tests:    4 passed (99 assertions)
   Duration: 0.84s
   ```

---

## 4. الملاحظات المعمارية وحالة النظام

- **التكامل مع الـ Migrations:** جميع الموديلات تعمل بتناغم تام مع الجداول المنشأة في قاعدة بيانات MySQL المعتمدة.
- **حدود المسؤوليات:** لم يتم إنشاء أي Controllers أو Services أو APIs أو Seeders التزاماً بنطاق مرحلة الـ Models فقط.
- **المشاكل المتبقية:** **لا توجد أي مشكلة برمجية أو معمارية متبقية**؛ كافة الموديلات جاهزة بنسبة 100% لبدء مرحلة الـ Seeders أو الـ Services والـ APIs التالية.
