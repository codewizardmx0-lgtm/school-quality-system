# دليل وتوثيق نماذج Eloquent (Models Guide)
**مشروع:** نظام إدارة الجودة والخطط التعليمية في المدارس  
**تاريخ التوثيق:** 3 نوفمبر 2026م (محدث ومعتمد بعد تصحيحات 1 و2 و3)  
**الإصدار:** 2.0 (النسخة المحدثة المتوافقة مع النظام الفعلي)  
**المرجع:** قاموس البيانات (Data Dictionary)، مخطط ERD، اتفاقيات المشروع (conventions.md)، وملفات الـ Migrations المعتمدة (42 جدولاً أساسياً).

---

## 1. الفكرة العامة والقرارات المعمارية المعتمدة في الموديلات

تم بناء وتحديث نماذج Eloquent داخل المسار:  
`school-eval-api/app/Models/`  

تمثل هذه الموديلات جميع كيانات وجداول النظام الفعلية مع الالتزام التام بالقرارات المعمارية التالية:

1. **تسمية الموديلات والمفاتيح الأساسية:**
   - تسمية الموديل بصيغة المفرد PascalCase (مثل: `SchoolDocument`, `DocumentVersion`, `EvidenceLink`, `AuditLog`).
   - تحديد الجدول صراحة في كل موديل عبر `protected $table = '...';`.
   - تخصيص المفتاح الأساسي عبر `protected $primaryKey = '...';` ليتطابق مع حقول القاموس (`<entity>_id` للجداول القديمة و `id` لجداول المعمارية الجديدة و `log_id` لسجل التدقيق).
   - في الجداول ذات المفاتيح المركبة (`role_permissions`, `user_roles`, `cycle_participations`, `plan_improvement_areas`) تم ضبط `public $incrementing = false;` ومصفوفة المفاتيح المركبة.

2. **الالتزام الحرفي بخريطة الطوابع الزمنية:**
   - **الوضع الافتراضي (الحقلان created_at و updated_at مفعلان):** معظم الموديلات الأساسية وموديلات المعمارية الحديثة (`SchoolDocument`, `DocumentVersion`, `EvidenceLink`).
   - **created_at فقط (`const UPDATED_AT = null;`):** موديلات (`IndicatorVerificationMethod`, `PlanImprovementArea`, `Notification`, `AuditLog` حيث إنه جدول للإضافة فقط).
   - **updated_at فقط (`const CREATED_AT = null;`):** موديلان (`Report`, `EvaluationSubmission` حيث يتم تسجيل التوليد والإرسال يدوياً عبر `generated_at` و `submitted_at`).
   - **تعطيل الطوابع الزمنية تماماً (`public $timestamps = false;`):** موديلات المراجع والأدوار (`Role`, `Permission`, `RolePermission`, `School`, `Ministry`, `UserRole`, `ScoreLevel`, `IndicatorScoreDescriptor`, `IndicatorEvidenceRequirement`, `EvaluationResultVerificationMethod`... إلخ).

3. **الحقول المسموح تعيينها جماعياً ($fillable) والتحويلات ($casts):**
   - تحديد الحقول المسموحة بدقة لحماية التطبيق من ثغرة Mass Assignment.
   - تحويل حقول التواريخ والأوقات إلى `date` و `datetime`، والحقول الرقمية إلى `integer` و `decimal:2`، والمنطقية إلى `boolean`، والـ JSON إلى `array` (مثل `old_values` و `new_values` في `AuditLog`).
   - في موديل `User`: تم تخصيص دالة `getAuthPasswordName()` لتعيد `password_hash` بدلاً من `password` الافتراضي.

4. **العلاقات المرجعية والمعمارية الحديثة للشواهد (U-24):**
   - إسقاط موديلات الشواهد القديمة الثنائية واستبدالها بنماذج المعمارية النظيفة ثلاثية المستويات: `SchoolDocument` -> `DocumentVersion` -> `EvidenceLink`.
   - تمثيل العلاقات متعددة الأشكال (Polymorphic) في `Attachment` و `Notification`.
   - توثيق القيود المفروضة على مستوى التطبيق وقاعدة البيانات (مثل حظر حذف النسخ المستخدمة كشواهد تقييمية عبر قيد `RESTRICT`).

---

## 2. فهرس وتفاصيل الموديلات حسب الحزم (ERD Packages)

### الحزمة الأولى: ERD-01 (الهوية والجهات والصلاحيات) — 8 موديلات
| # | الموديل (Model) | الجدول المقابل | المفتاح الأساسي (PK) | الطوابع الزمنية | أهم العلاقات |
|:---:|:---|:---|:---:|:---:|:---|
| 1 | `Role` | `roles` | `role_id` | معطلة | `permissions()` (BelongsToMany), `users()` (BelongsToMany), `userRoles()` (HasMany) |
| 2 | `Permission` | `permissions` | `permission_id` | معطلة | `roles()` (BelongsToMany), `rolePermissions()` (HasMany) |
| 3 | `RolePermission` | `role_permissions` | `['role_id', 'permission_id']` | معطلة | `role()` (BelongsTo), `permission()` (BelongsTo) |
| 4 | `School` | `schools` | `school_id` | معطلة | `users()` (HasMany), `cycles()` (BelongsToMany), `evaluations()` (HasMany), `documents()` (HasMany), `improvementPlans()` (HasMany) |
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
| 12 | `Indicator` | `indicators` | `indicator_id` | افتراضي | `subStandard()` (BelongsTo), `scoreDescriptors()`, `evidenceRequirements()`, `verificationTools()`, `evaluationResults()`, `evidenceLinks()` |
| 13 | `ScoreLevel` | `score_levels` | `score_level_id` | معطلة | `version()` (BelongsTo), `descriptors()` (HasMany) |
| 14 | `IndicatorScoreDescriptor` | `indicator_score_descriptors` | `descriptor_id` | معطلة | `indicator()` (BelongsTo), `scoreLevel()` (BelongsTo), `standardVersion()` (BelongsTo) |
| 15 | `IndicatorEvidenceRequirement` | `indicator_evidence_requirements` | `requirement_id` | معطلة | `indicator()` (BelongsTo), `standardVersion()` (BelongsTo) |
| 16 | `VerificationTool` | `verification_tools` | `tool_id` | افتراضي | `indicators()` (BelongsToMany), `evaluationResultVerificationMethods()` (HasMany) |
| 17 | `IndicatorVerificationMethod` | `indicator_verification_methods` | `id` | `created_at` فقط | `indicator()` (BelongsTo), `tool()` (BelongsTo) |

---

### الحزمة الثالثة: ERD-03 (دورات التقييم والنتائج ومعمارية الشواهد النظيفة) — 10 موديلات
| # | الموديل (Model) | الجدول المقابل | المفتاح الأساسي (PK) | الطوابع الزمنية | أهم العلاقات |
|:---:|:---|:---|:---:|:---:|:---|
| 18 | `EvaluationCycle` | `evaluation_cycles` | `cycle_id` | افتراضي | `version()` (BelongsTo), `schools()` (BelongsToMany), `evaluations()` (HasMany) |
| 19 | `CycleParticipation` | `cycle_participations` | `['cycle_id', 'school_id']` | افتراضي | `cycle()` (BelongsTo), `school()` (BelongsTo) |
| 20 | `Evaluation` | `evaluations` | `evaluation_id` | افتراضي | `cycle()` (BelongsTo), `school()` (BelongsTo), `creator()` (BelongsTo), `results()`, `evidenceLinks()`, `reports()` |
| 21 | `EvaluationResult` | `evaluation_results` | `result_id` | افتراضي | `evaluation()`, `indicator()`, `scoreDescriptor()`, `evaluator()`, `evidenceLinks()`, `notes()`, `verificationTools()` |
| 22 | `SchoolDocument` | `school_documents` | `id` | افتراضي | `school()` (BelongsTo), `creator()` (BelongsTo), `versions()` (HasMany), `currentVersion()` (HasOne) |
| 23 | `DocumentVersion` | `document_versions` | `id` | افتراضي | `document()` (BelongsTo), `school()` (BelongsTo), `evidenceLinks()` (HasMany) |
| 24 | `EvidenceLink` | `evidence_links` | `id` | افتراضي | `evaluation()` (BelongsTo), `evaluationResult()` (BelongsTo), `indicator()` (BelongsTo), `documentVersion()` (BelongsTo), `action()` (BelongsTo) |
| 25 | `Attachment` | `attachments` | `attachment_id` | افتراضي | `target()` (MorphTo متعدد الأشكال: `report`) |
| 26 | `Note` | `notes` | `note_id` | افتراضي | `result()` (BelongsTo), `author()` (BelongsTo) |
| 27 | `EvaluationResultVerificationMethod` | `evaluation_result_verification_methods` | `id` | معطلة | `evaluationResult()` (BelongsTo), `tool()` (BelongsTo) |

---

### الحزمة الرابعة: ERD-04 (خطط التحسين وإجراءاتها) — 4 موديلات
| # | الموديل (Model) | الجدول المقابل | المفتاح الأساسي (PK) | الطوابع الزمنية | أهم العلاقات |
|:---:|:---|:---|:---:|:---:|:---|
| 28 | `ImprovementArea` | `improvement_areas` | `area_id` | افتراضي | `result()` (BelongsTo), `indicator()` (BelongsTo), `plans()` (BelongsToMany) — يدعم `target_score` (U-23) |
| 29 | `ImprovementPlan` | `improvement_plans` | `plan_id` | افتراضي | `cycle()`, `school()`, `creator()`, `areas()` (BelongsToMany), `actions()` (HasMany) |
| 30 | `PlanImprovementArea` | `plan_improvement_areas` | `['plan_id', 'area_id']` | `created_at` فقط | `plan()` (BelongsTo), `area()` (BelongsTo), `actions()` (HasMany) |
| 31 | `ImprovementAction` | `improvement_actions` | `action_id` | افتراضي | `plan()` (BelongsTo), `area()` (BelongsTo), `planArea()` (BelongsTo - قيد مركب), `evidenceLinks()` (HasMany), `aiRecommendations()` |

---

### الحزمة الخامسة: ERD-05 (التقارير والمخرجات والاستكمال والإشعارات والتدقيق والذكاء الاصطناعي) — 11 موديلاً
| # | الموديل (Model) | الجدول المقابل | المفتاح الأساسي (PK) | الطوابع الزمنية | أهم العلاقات |
|:---:|:---|:---|:---:|:---:|:---|
| 32 | `Report` | `reports` | `report_id` | `updated_at` فقط | `evaluation()` (BelongsTo), `submissions()` (HasMany), `internalReviewNotes()`, `attachments()` |
| 33 | `EvaluationSubmission` | `evaluation_submissions` | `submission_id` | `updated_at` فقط | `report()` (BelongsTo), `submittedBy()` (BelongsTo), `supervisorNotes()`, `completionRequests()` |
| 34 | `InternalReviewNote` | `internal_review_notes` | `note_id` | افتراضي | `report()` (BelongsTo), `author()` (BelongsTo) |
| 35 | `PlanReviewNote` | `plan_review_notes` | `note_id` | افتراضي | `plan()` (BelongsTo), `author()` (BelongsTo) |
| 36 | `SupervisorNote` | `supervisor_notes` | `note_id` | افتراضي | `submission()` (BelongsTo), `author()` (BelongsTo) |
| 37 | `CompletionRequest` | `completion_requests` | `request_id` | افتراضي | `submission()` (BelongsTo), `issuedBy()` (BelongsTo), `items()` (HasMany) — يحمل `completion_deadline` و `deadline_extensions_count` |
| 38 | `CompletionRequestItem` | `completion_request_items` | `request_item_id` | افتراضي | `request()` (BelongsTo), `indicator()` (BelongsTo), `evidenceLink()` (BelongsTo) |
| 39 | `Notification` | `notifications` | `notification_id` | `created_at` فقط | `recipient()` (BelongsTo), `relatedEntity()` (MorphTo) — سجل إشعارات دائم |
| 40 | `AuditLog` | `audit_logs` | `log_id` | `created_at` فقط | `user()` (BelongsTo), `school()` (BelongsTo) — سجل تدقيق محصن للإضافة فقط (U-08) |
| 41 | `AiAnalysis` | `ai_analysis` | `analysis_id` | افتراضي | `evaluation()` (BelongsTo), `requestedBy()` (BelongsTo), `recommendations()` (HasMany) |
| 42 | `AiRecommendation` | `ai_recommendations` | `recommendation_id` | افتراضي | `analysis()` (BelongsTo), `improvementAction()` (BelongsTo) |

---

## 3. نتائج التحقق والاختبارات الآلية

تم التحقق البرمجي التام من عمل وتكامل كافة النماذج والعلاقات:
1. **فحص الـ Syntax (PHP Lint):** خلو كافة ملفات النماذج الـ 42 من أي خطأ نحوي أو تصريحي.
2. **فحص سلامة العلاقات والقيود:** تغطية كافة النماذج عبر اختبارات ميزات مخصصة (`ModelsStructureTest`, `EvidenceArchitectureFeatureTest`, `CompletionWorkflowFeatureTest`, `AuditLogFeatureTest`).
3. **مؤشرات جناح الاختبارات الكلي للنظام:**
   - **عدد الاختبارات الناجحة:** **243 اختباراً** (بنسبة نجاح 100%).
   - **عدد التأكيدات البرمجية:** **9,252 تأكيداً**.
