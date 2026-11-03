# الشريحة 8: الخطط التربوية والتطوير المهني ومتابعة التنفيذ
## Educational & Professional Development Plans and Execution Tracking

---

### 1. ملخص الشريحة ونطاق العمل
تمثل الشريحة الثامنة التوسعة المنهجية لمنظومة التخطيط المدرسي (امتداداً للشريحة 3)، حيث تنقل النظام من مجرد "خطط تحسين شكلية" إلى منظومة متكاملة للتخطيط التربوي، الإنماء والتطوير المهني للكوادر التعليمية، ومتابعة التنفيذ الميداني التراكمي ونسب الإنجاز.

#### القيود الملزمة المنفذة (وفقاً لدراسة النطاق ووثيقة gaps.md):
1. **أنواع الخطط (`plan_type`):** دعم 3 أنواع رئيسة للخطط المدرسية:
   - `QualityImprovement` (خطة تحسين الجودة المدرسية - القيمة الافتراضية للتوافق التراجعي الكامل مع الشريحة 3).
   - `StaffProfessionalDevelopment` (خطة التطوير المهني والتربوي للكوادر المدرسية).
   - `AnnualOperational` (الخطة التشغيلية السنوية للأنشطة والبرامج).
2. **نسبة الإنجاز (`completion_percentage`):** حقل رقمي مباشر (0 - 100%) على مستوى كل إجراء تنفيذي (`improvement_actions`)، مع احتساب متوسط نسبة الإنجاز الإجمالية ديناميكياً على مستوى الخطة واستبعاد الإجراءات الملغاة `Cancelled`.
3. **التحول التلقائي للحالة:** عند بلوغ نسبة الإنجاز 100%، تتحول حالة الإجراء تلقائياً إلى منجز `Done` والتقدم إلى `Complete`. والعكس: عند تراجع النسبة عن 100%، تعود الحالة إلى `InProgress`.
4. **قيد إغلاق الخطة (Completion Guard):** يمنع النظام قطعياً إغلاق الخطة (`Completed`) إلا إذا كانت كافة إجراءاتها غير الملغاة مكتملة بنسبة 100% ومنجزة.
5. **قيد حذف الإجراء (Deletion Guard):** حذف الإجراء مسموح فقط أثناء حالة المسودة `Draft`. وفي الخطط النشطة أو المكتملة، البديل التنظيمي المعتمد هو إلغاء الإجراء بتغيير حالته إلى `Cancelled`.
6. **بنك الإجراءات النموذجية (`ActionCatalogService`):** توفير كتالوج معياري ثابت يضم 16 إجراءً نموذجياً معتمداً موزعة على المجالات الفرعية الـ 14 والأنواع الثلاثة، مع تحديد الفئة المستهدفة والمدة الزمنية المقترحة.
7. **فصل المراجعات (Dual Review Separation):** تمييز ملاحظات المراجعة الداخلية لمدير المدرسة (`school_principal` بصلاحية `reviews.write`) عن ملاحظات المراجعة الخارجية للمشرف التربوي الوزاري (`ministry_supervisor` بصلاحية `supervision.review`).
8. **ربط شواهد التنفيذ الميدانية:** ربط أدلة وشواهد الإثبات الميدانية بالإجراءات التنفيذية عبر حقل المفتاح الأجنبي `action_id` في جدول `evidences`.
9. **العزل المؤسسي والزمني الصارم:** التحقق من أن جميع مجالات التحسين المرتبطة بالخطة تتبع نفس مدرسة المستخدم ونفس دورة التقييم (`cycle_id`)، مع رد 404 للعزل المدرسي و422 للعزل الزمني للدورة.
10. **العناصر المؤجلة صراحةً (Deferred):**
   - مؤشرات الأداء المستهدفة `target_kpi` (فجوة G-19 مؤجلة).
   - التكلفة التقديرية ومصدر التمويل `estimated_cost` / `funding_source` (فجوة G-18 مؤجلة).
   - معالجات التوليد الذكي التجميعية `Wizards` (فجوة G-20 مؤجلة لواجهات React الرئيسية).
   - لا سجلات فردية للمعلمين؛ الإسناد محصور بالفئة المستهدفة والعدد (مثل: "فريق معلمي الرياضيات - 12 معلماً").

---

### 2. التغييرات في قاعدة البيانات (Migrations)

تم تنفيذ Migration تراجعي واحد:
`2026_10_30_160000_upgrade_improvement_planning_for_slice8.php`:
1. إضافة `plan_type` (`string(40)`, `nullable`, `default: QualityImprovement`) في جدول `improvement_plans`.
2. إضافة `completion_percentage` (`unsignedTinyInteger`, `default: 0`) في جدول `improvement_actions`.
3. إضافة `reviewer_role` (`string(40)`, `nullable`, `default: school_principal`) في جدول `plan_review_notes`.
4. إضافة `action_id` (`foreignId`, `nullable`, `constrained('improvement_actions', 'action_id')`, `nullOnDelete`) في جدول `evidences`.

---

### 3. نقاط النهاية البرمجية (API Endpoints)

| المسار (Path) | الطريقة (Method) | الصلاحية (Permission) | الوصف والدور الوظيفي |
| :--- | :---: | :---: | :--- |
| `/api/v1/improvement-plans/action-catalog` | `GET` | `plans.view` / `plans.manage` | استعراض بنك الإجراءات النموذجية مع دعم فلترة `sub_standard_code` و `plan_type`. |
| `/api/v1/improvement-plans` | `GET` | `plans.view` / `plans.manage` | استعراض قائمة الخطط مع فلترة `plan_type` و `cycle_id` ومتوسط نسبة الإنجاز. |
| `/api/v1/improvement-plans` | `POST` | `plans.manage` | إنشاء مسودة خطة جديدة مع تحديد نوع الخطة والتحقق من العزل المؤسسي والزمني. |
| `/api/v1/improvement-plans/{id}` | `GET` | `plans.view` / `plans.manage` | تفاصيل الخطة والمجالات والإجراءات بنسب إنجازها وشواهدها والملاحظات المصنفة. |
| `/api/v1/improvement-plans/{id}` | `PATCH` | `plans.manage` | تحديث بيانات الخطة وحالتها مع فرض قيد الإغلاق `Completed`. |
| `/api/v1/improvement-plans/{id}/actions` | `POST` | `plans.manage` | إضافة إجراء تنفيذي للخطة مع تحديد نسبة الإنجاز الأولية (0-100%). |
| `/api/v1/improvement-plans/{id}/actions/{actionId}` | `PATCH` | `plans.manage` | تحديث الإجراء ونسبة إنجازه التراكمية مع التحول التلقائي للحالة (100% -> `Done`). |
| `/api/v1/improvement-plans/{id}/actions/{actionId}` | `DELETE` | `plans.manage` | حذف إجراء تنفيذي (مسموح فقط في مسودة الخطة `Draft`؛ 422 في الخطط النشطة). |
| `/api/v1/improvement-plans/{id}/actions/{actionId}/evidences` | `POST` | `plans.manage` | ربط شاهد/دليل إثبات بإجراء التنفيذ الميداني مع التحقق من عزل المدرسة. |
| `/api/v1/improvement-plans/{id}/review-notes` | `POST` | `reviews.write` / `supervision.review` | تدوين ملاحظة مراجعة داخلية (مدير المدرسة) أو مراجعة خارجية (مشرف وزاري). |

> [!NOTE]
> تم تعريف مسار `GET /api/v1/improvement-plans/action-catalog` **قبل** مسار `GET /api/v1/improvement-plans/{id}` في `routes/api.php` لتفادي تعارض الروابط وابتلاع متغير المعرف `{id}` لكلمة `action-catalog`.

---

### 4. بنية الاستجابات البرمجية (Payloads)

#### تفاصيل الخطة (`GET /api/v1/improvement-plans/{id}`):
```json
{
  "success": true,
  "data": {
    "planId": 54,
    "cycleId": 1,
    "cycleName": "2026-2027",
    "title": "خطة الإنماء المهني لمعلمي العلوم والرياضيات",
    "planType": "StaffProfessionalDevelopment",
    "planTypeLabel": "خطة التطوير المهني والتربوي",
    "status": "Active",
    "statusLabel": "نشطة",
    "overallProgress": "Moderate",
    "overallProgressPercentage": 75.0,
    "areas": [
      {
        "areaId": 12,
        "name": "مجال تحسين طرائق التدريس والتقويم",
        "priority": "High"
      }
    ],
    "actions": [
      {
        "actionId": 88,
        "title": "ورشة عمل تدريبية على استراتيجيات التعلم النشط",
        "responsiblePersonDescription": "منسق التدريب - فريق معلمي العلوم (10 معلمين)",
        "startDate": "2026-11-01",
        "dueDate": "2026-11-30",
        "completionPercentage": 100,
        "status": "Done",
        "progress": "Complete",
        "isDelayed": false,
        "evidences": [
          {
            "evidenceId": 302,
            "title": "محضر ورشة العمل وقائمة التوقيعات",
            "status": "Approved"
          }
        ]
      }
    ],
    "internalNotes": [
      {
        "noteId": 14,
        "authorName": "أحمد الشامي (مدير المدرسة)",
        "reviewerRole": "school_principal",
        "text": "تم الاطلاع وتوفير القاعة المجهزة للورشة.",
        "createdAt": "2026-11-02T09:00:00Z"
      }
    ],
    "externalNotes": [
      {
        "noteId": 15,
        "authorName": "د. محمد الوزاري (مشرف الوزارة)",
        "reviewerRole": "ministry_supervisor",
        "text": "خطة متميزة وسيتم التحقق من الأثر الميداني خلال الزيارة الإشرافية.",
        "createdAt": "2026-11-03T11:30:00Z"
      }
    ]
  }
}
```

---

### 5. التحقق والاختبارات الآلية (Testing Suite)

- **الملف المخصص:** `school-eval-api/tests/Feature/EducationalPlansFeatureTest.php`.
- **عدد الاختبارات المضافة:** 10 اختبارات ميزة تغطي كافة القواعد وحالات الخطأ والعزل.
- **إجمالي اختبارات النظام الكلية:** **185 اختباراً** بنجاح 100% (8053 توكيداً - Assertions).
- **التوافق التراجعي:** كافة اختبارات الشرائح 1 إلى 7 السابقة نجحت دون أي تعديل أو انكسار.
