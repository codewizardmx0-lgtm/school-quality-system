# توثيق واجهة برمجة التطبيقات: خطط التحسين المدرسي (Improvement Plans API)

**منصة التقييم الذاتي والتحسين المدرسي**  
**الشريحة:** الشريحة الثالثة (Backend) — أكتوبر 2026  
**المرجعية:** الفصل الرابع (4.4.4 و4.7)، اتفاقيات `conventions.md`، وقاموس البيانات، وحالات الاستخدام `UC-SCH-04` و `UC-SCH-05` و `UC-PRIN-01`.  
**المستهدف:** مطور الواجهة الأمامية (Frontend Engineer).

---

## 1. جدول الانحرافات والتحديثات مقارنة بكتالوج الفصل الرابع (4.4.4)

| المسار المعتمد في الشريحة | المسار المقابل في كتالوج 4.4.4 | نوع التغيير | سبب الانحراف والقرار المعتمد |
|---|---|---|---|
| `GET /api/v1/evaluations/{id}/improvement-suggestions` | غير موجود | **إضافة معتمدة** | استرجاع مقترحات مجالات التحسين ديناميكياً عند الطلب للمؤشرات التي نالت تقديراً أقل من المستهدف (`score < target_score`) دون تخزينها مسبقاً، مع اقتراح الأولوية وعلم التبني المسبق. |
| `GET /api/v1/improvement-areas` | `GET /api/v1/improvement-areas` | **مطابق تماماً** | استعراض مجالات التحسين المعتمدة للمدرسة مع عزل مؤسسي صارم. |
| `POST /api/v1/improvement-areas` | `POST /api/v1/improvement-areas` | **مطابق مع قيد** | إنشاء/تبني مجال تحسين؛ تم إلزام حقل `resultId` لأن الجدول يفتقر لعمود `school_id`، فيمر العزل المؤسسي عبر نتيجة التقييم. |
| `PATCH /api/v1/improvement-areas/{id}` | `PATCH /api/v1/improvement-areas/{id}` | **مطابق تماماً** | تعديل الاسم والوصف والأولوية لمجال تحسين قائم يتبع لمدرسة المستخدم. |
| `GET /api/v1/improvement-plans` | `GET /api/v1/improvement-plans` | **مطابق تماماً** | استعراض خطط المدرسة مع إحصائيات الإجراءات ومستوى التقدم الإجمالي وحالة التأخر. |
| `POST /api/v1/improvement-plans` | `POST /api/v1/improvement-plans` | **مطابق تماماً** | إنشاء مسودة خطة جديدة؛ يشترط ربط مجال تحسين واحد على الأقل (`areaIds >= 1`) في جدول `plan_improvement_areas`. |
| `GET /api/v1/improvement-plans/{id}` | `GET /api/v1/improvement-plans/{id}` | **مطابق تماماً** | استعراض تفاصيل الخطة الكاملة ومجالاتها وإجراءاتها وملاحظات المراجعة ونظرة التقدم (FR-SCH-25). |
| `PATCH /api/v1/improvement-plans/{id}` | `PATCH /api/v1/improvement-plans/{id}` | **مطابق تماماً** | تعديل بيانات الخطة وإدارة دورة حياتها (`Draft` -> `Active` -> `Completed` / `Cancelled`) وفق القيود المعمارية. |
| `POST /api/v1/improvement-plans/{id}/actions` | `POST /api/v1/improvement-plans/{id}/actions` | **مطابق تماماً** | إضافة إجراء تنفيذي للخطة مع التحقق من قيد المفتاح المركب `(plan_id, area_id)`. |
| `PATCH /api/v1/improvement-plans/{id}/actions/{actionId}` | `PATCH /api/v1/improvement-plans/{id}/actions/{actionId}` | **مطابق تماماً** | تحديث الإجراء ومستوى تقدمه وتعديل تواريخه. |
| `POST /api/v1/improvement-plans/{id}/review-notes` | `POST /api/v1/improvement-plans/{id}/review-notes` | **مطابق تماماً** | تدوين ملاحظة مراجعة من قبل مدير المدرسة حصراً بالصلاحية `reviews.write`. |

---

## 2. إرشادات وتوجيهات هامة لمطور الواجهة الأمامية

> [!IMPORTANT]
> **إلزامية `resultId` في مجالات التحسين والعزل المؤسسي:**
> * جدول `improvement_areas` لا يحتوي على حقل `school_id`. لذا يلزم الـ API دائماً إرسال `resultId` عند إنشاء مجال تحسين جديد.
> * يقوم النظام بالتحقق من أن نتيجة المؤشر تتبع لتقييم مدرسة المستخدم؛ وإذا أُرسل معرّف يخص مدرسة أخرى أو غير موجود يُرجع الـ API رمز الخطأ `404 Not Found`.

> [!NOTE]
> **مستويات التقدم المغلقة (Progress Levels):**
> * حقل التقدم `progress` يمثل قائمة مغلقة من الأكواد اللاتينية (Enum) لتفادي أخطاء المحارف والترتيب، ويعيد الـ API الكود مع التسمية العربية دائماً:
>   * `NotStarted`: لم يبدأ
>   * `Limited`: تقدم محدود
>   * `Moderate`: تقدم متوسط
>   * `Significant`: تقدم ملحوظ
>   * `Complete`: مكتمل
> * لا توجد نسب مئوية مفروضة في قاعدة البيانات لإجراءات التحسين.

> [!IMPORTANT]
> **قيد المفتاح المركب لإجراءات التحسين (Composite Key Constraint):**
> * جدول `improvement_actions` يعتمد مفتاحاً أجنبياً مركباً `FOREIGN KEY (plan_id, area_id) REFERENCES plan_improvement_areas (plan_id, area_id)`.
> * عند إنشاء إجراء تنفيذي جديد في الخطة، **يجب اختيار `areaId` من ضمن المجالات المربوطة مسبقاً بتلك الخطة**. إذا اختار المستخدم مجالاً لم يُربط بالخطة، سيرفض الـ API الطلب برمز `422 Unprocessable Entity` مع رسالة: `مجال التحسين المحدد غير مدرج ضمن مجالات هذه الخطة (قيد المفتاح المركب).`

> [!NOTE]
> **حقل التأخر المحسوب (`isDelayed`):**
> * حقل `isDelayed` يُحسب ديناميكياً عند كل استدعاء: يكون `true` إذا كان تاريخ الاستحقاق `due_date < today()` وكانت حالة الإجراء **ليست** `Done` و**ليست** `Cancelled`.

> [!WARNING]
> **قيود دورة حياة الخطة (Plan Lifecycle Transitions):**
> 1. **التفعيل (`Active`):** لا يمكن نقل الخطة من `Draft` إلى `Active` إلا إذا كانت الخطة تحتوي على **مجال تحسين واحد على الأقل وإجراء تنفيذي واحد على الأقل**. محاولة التفعيل دون ذلك ترجع `422 Unprocessable Entity`.
> 2. **الإكمال (`Completed`):** لا يمكن نقل الخطة إلى `Completed` طالما يوجد أي إجراء تنفيذي بحالة `Pending` أو `InProgress`. يجب أن تكون جميع الإجراءات `Done` أو `Cancelled`.

> [!TIP]
> **دور مدير المدرسة (School Principal UX):**
> * مدير المدرسة يملك صلاحية القراءة `plans.view` وصلاحية المراجعة `reviews.write`.
> * **توجيه الواجهة:** عند تسجيل دخول المدير، يجب إخفاء أو تعطيل أزرار إضافة المجالات والخطط والإجراءات وتعديلها (لأنه لا يملك `plans.manage` وسترجع له `403 Forbidden`). في المقابل، يظهر له صندوق مخصص لـ **«تدوين ملاحظة مراجعة»** على الخطة.

---

## 3. الترويسات المشتركة (Headers)

```http
Accept: application/json
Content-Type: application/json
Authorization: Bearer <plainTextToken>
```

---

## 4. تفاصيل نقاط النهاية (Endpoints Specification)

### 4.1 استرجاع مقترحات مجالات التحسين
* **المسار:** `GET /api/v1/evaluations/{id}/improvement-suggestions`
* **الصلاحية:** `plans.view` أو `plans.manage`
* **الاستجابة الناجحة (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "evaluationId": 1,
    "schoolId": 1,
    "targetScore": 3,
    "suggestions": [
      {
        "resultId": 12,
        "indicatorId": 5,
        "indicatorCode": "IND-1-1-2",
        "indicatorName": "تفعيل التعلم النشط",
        "score": 1,
        "targetScore": 3,
        "gap": 2,
        "suggestedPriority": "High",
        "priorityLabel": "عالية",
        "suggestedName": "تحسين أداء: تفعيل التعلم النشط",
        "isAlreadyAdopted": false
      },
      {
        "resultId": 14,
        "indicatorId": 8,
        "indicatorCode": "IND-1-2-1",
        "indicatorName": "تقييم أداء المعلمين",
        "score": 2,
        "targetScore": 3,
        "gap": 1,
        "suggestedPriority": "Medium",
        "priorityLabel": "متوسطة",
        "suggestedName": "تحسين أداء: تقييم أداء المعلمين",
        "isAlreadyAdopted": true
      }
    ],
    "meta": {
      "totalSuggestions": 2,
      "highPriorityCount": 1,
      "mediumPriorityCount": 1,
      "alreadyAdoptedCount": 1
    }
  },
  "message": null
}
```

---

### 4.2 استعراض مجالات التحسين
* **المسار:** `GET /api/v1/improvement-areas`
* **الصلاحية:** `plans.view` أو `plans.manage`
* **الاستجابة الناجحة (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "areaId": 1,
      "resultId": 14,
      "indicatorId": 8,
      "indicatorCode": "IND-1-2-1",
      "indicatorName": "تقييم أداء المعلمين",
      "name": "تطوير أدوات القياس والتقويم الصفي",
      "description": "معالجة ضعف توثيق نتائج الاختبارات التشخيصية.",
      "priority": "High",
      "priorityLabel": "عالية",
      "linkedPlansCount": 1,
      "createdAt": "2026-10-26T11:00:00+03:00"
    }
  ],
  "message": null
}
```

---

### 4.3 إنشاء / تبني مجال تحسين جديد
* **المسار:** `POST /api/v1/improvement-areas`
* **الصلاحية:** `plans.manage`
* **جسم الطلب (Request Body):**
```json
{
  "resultId": 12,
  "name": "تفعيل وتوثيق استراتيجيات التعلم النشط",
  "description": "إلزام المعلمين بإرفاق خطط الدروس التفاعلية وسجلات المشاركة الصفية.",
  "priority": "High"
}
```
* **الاستجابة الناجحة (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "areaId": 2,
    "resultId": 12,
    "indicatorId": 5,
    "indicatorCode": "IND-1-1-2",
    "indicatorName": "تفعيل التعلم النشط",
    "name": "تفعيل وتوثيق استراتيجيات التعلم النشط",
    "description": "إلزام المعلمين بإرفاق خطط الدروس التفاعلية وسجلات المشاركة الصفية.",
    "priority": "High",
    "priorityLabel": "عالية",
    "linkedPlansCount": 0,
    "createdAt": "2026-10-26T11:15:00+03:00"
  },
  "message": "تم إنشاء مجال التحسين بنجاح."
}
```

---

### 4.4 تعديل مجال تحسين
* **المسار:** `PATCH /api/v1/improvement-areas/{id}`
* **الصلاحية:** `plans.manage`
* **جسم الطلب (Request Body):**
```json
{
  "name": "تفعيل وتوثيق استراتيجيات التعلم النشط (معدل)",
  "priority": "Medium"
}
```
* **الاستجابة الناجحة (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "areaId": 2,
    "name": "تفعيل وتوثيق استراتيجيات التعلم النشط (معدل)",
    "priority": "Medium",
    "priorityLabel": "متوسطة"
  },
  "message": "تم تحديث مجال التحسين بنجاح."
}
```

---

### 4.5 استعراض قائمة خطط التحسين
* **المسار:** `GET /api/v1/improvement-plans`
* **الصلاحية:** `plans.view` أو `plans.manage`
* **الاستجابة الناجحة (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "planId": 1,
      "cycleId": 1,
      "cycleName": "دورة التقييم الذاتي 2025/2026",
      "schoolId": 1,
      "schoolName": "مدرسة بلقيس النموذجية",
      "title": "خطة التطوير الشامل للفصل الأول 2026",
      "startDate": "2026-11-01",
      "endDate": "2027-01-31",
      "status": "Active",
      "statusLabel": "نشطة",
      "overallProgress": "Moderate",
      "overallProgressLabel": "تقدم متوسط",
      "areasCount": 2,
      "totalActions": 3,
      "delayedActions": 1,
      "reviewNotesCount": 1,
      "createdAt": "2026-10-26T11:20:00+03:00"
    }
  ],
  "message": null
}
```

---

### 4.6 إنشاء خطة تحسين جديدة
* **المسار:** `POST /api/v1/improvement-plans`
* **الصلاحية:** `plans.manage`
* **جسم الطلب (Request Body):**
```json
{
  "cycleId": 1,
  "title": "خطة التطوير الشامل للفصل الأول 2026",
  "startDate": "2026-11-01",
  "endDate": "2027-01-31",
  "areaIds": [1, 2]
}
```
* **الاستجابة الناجحة (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "planId": 1,
    "cycleId": 1,
    "schoolId": 1,
    "title": "خطة التطوير الشامل للفصل الأول 2026",
    "startDate": "2026-11-01",
    "endDate": "2027-01-31",
    "status": "Draft",
    "statusLabel": "مسودة",
    "overallProgress": "NotStarted",
    "overallProgressLabel": "لم يبدأ",
    "overview": {
      "totalAreas": 2,
      "totalActions": 0,
      "pendingActions": 0,
      "inProgressActions": 0,
      "doneActions": 0,
      "cancelledActions": 0,
      "delayedActions": 0,
      "overallProgress": "NotStarted",
      "overallProgressLabel": "لم يبدأ"
    }
  },
  "message": "تم إنشاء خطة التحسين وربط مجالاتها بنجاح."
}
```

---

### 4.7 تفاصيل خطة التحسين ونظرة التقدم (FR-SCH-25)
* **المسار:** `GET /api/v1/improvement-plans/{id}`
* **الصلاحية:** `plans.view` أو `plans.manage`
* **الاستجابة الناجحة (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "planId": 1,
    "cycleId": 1,
    "cycleName": "دورة التقييم الذاتي 2025/2026",
    "schoolId": 1,
    "schoolName": "مدرسة بلقيس النموذجية",
    "createdById": 5,
    "creatorName": "أحمد مقيم الجودة",
    "title": "خطة التطوير الشامل للفصل الأول 2026",
    "startDate": "2026-11-01",
    "endDate": "2027-01-31",
    "status": "Active",
    "statusLabel": "نشطة",
    "overallProgress": "Moderate",
    "overallProgressLabel": "تقدم متوسط",
    "areas": [
      {
        "areaId": 1,
        "name": "تطوير أدوات القياس والتقويم الصفي",
        "priority": "High",
        "priorityLabel": "عالية"
      }
    ],
    "actions": [
      {
        "actionId": 1,
        "planId": 1,
        "areaId": 1,
        "areaName": "تطوير أدوات القياس والتقويم الصفي",
        "title": "عقد ورش تدريبية للمعلمين على بنوك الأسئلة",
        "responsiblePersonDescription": "منسق الجودة والتدريب",
        "startDate": "2026-11-05",
        "dueDate": "2026-11-20",
        "status": "InProgress",
        "statusLabel": "جاري التنفيذ",
        "progress": "Moderate",
        "progressLabel": "تقدم متوسط",
        "isDelayed": false,
        "createdAt": "2026-10-26T11:30:00+03:00"
      }
    ],
    "reviewNotes": [
      {
        "noteId": 1,
        "authorId": 3,
        "authorName": "سارة مديرة المدرسة",
        "text": "تم الاطلاع والموافقة المبدئية، ونؤكد على سرعة تجهيز القاعات.",
        "createdAt": "2026-10-26T11:45:00+03:00"
      }
    ],
    "overview": {
      "totalAreas": 1,
      "totalActions": 1,
      "pendingActions": 0,
      "inProgressActions": 1,
      "doneActions": 0,
      "cancelledActions": 0,
      "delayedActions": 0,
      "overallProgress": "Moderate",
      "overallProgressLabel": "تقدم متوسط"
    }
  },
  "message": null
}
```

---

### 4.8 تحديث خطة التحسين ودورة حياتها
* **المسار:** `PATCH /api/v1/improvement-plans/{id}`
* **الصلاحية:** `plans.manage`
* **تفعيل الخطة (`Active`):**
```json
{
  "status": "Active"
}
```
* **الاستجابة الناجحة (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "planId": 1,
    "status": "Active",
    "statusLabel": "نشطة"
  },
  "message": "تم تحديث خطة التحسين بنجاح."
}
```
* **في حال تعذر التفعيل لغياب الإجراءات (`422 Unprocessable Entity`):**
```json
{
  "success": false,
  "message": "فشلت عملية التحقق من صحة البيانات.",
  "errors": {
    "status": [
      "لا يمكن تفعيل الخطة دون إدراج مجال تحسين واحد وإجراء تنفيذي واحد على الأقل."
    ]
  }
}
```

---

### 4.9 إضافة إجراء تنفيذي للخطة
* **المسار:** `POST /api/v1/improvement-plans/{id}/actions`
* **الصلاحية:** `plans.manage`
* **جسم الطلب (Request Body):**
```json
{
  "areaId": 1,
  "title": "عقد ورش تدريبية للمعلمين على بنوك الأسئلة",
  "responsiblePersonDescription": "منسق الجودة والتدريب المدرسي",
  "startDate": "2026-11-05",
  "dueDate": "2026-11-25",
  "status": "Pending",
  "progress": "NotStarted"
}
```
* **الاستجابة الناجحة (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "actionId": 1,
    "planId": 1,
    "areaId": 1,
    "areaName": "تطوير أدوات القياس والتقويم الصفي",
    "title": "عقد ورش تدريبية للمعلمين على بنوك الأسئلة",
    "responsiblePersonDescription": "منسق الجودة والتدريب المدرسي",
    "startDate": "2026-11-05",
    "dueDate": "2026-11-25",
    "status": "Pending",
    "statusLabel": "قيد الانتظار",
    "progress": "NotStarted",
    "progressLabel": "لم يبدأ",
    "isDelayed": false,
    "createdAt": "2026-10-26T11:30:00+03:00"
  },
  "message": "تم إضافة الإجراء التنفيذي بنجاح."
}
```

---

### 4.10 تحديث إجراء تنفيذي
* **المسار:** `PATCH /api/v1/improvement-plans/{id}/actions/{actionId}`
* **الصلاحية:** `plans.manage`
* **جسم الطلب (Request Body):**
```json
{
  "status": "Done",
  "progress": "Complete"
}
```
* **الاستجابة الناجحة (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "actionId": 1,
    "status": "Done",
    "statusLabel": "منجز",
    "progress": "Complete",
    "progressLabel": "مكتمل",
    "isDelayed": false
  },
  "message": "تم تحديث الإجراء التنفيذي بنجاح."
}
```

---

### 4.11 تدوين ملاحظة مراجعة من مدير المدرسة
* **المسار:** `POST /api/v1/improvement-plans/{id}/review-notes`
* **الصلاحية:** `reviews.write`
* **جسم الطلب (Request Body):**
```json
{
  "text": "تمت مراجعة الخطة وإقرار أولوياتها، مع التأكيد على تسريع موعد الورش التدريبية."
}
```
* **الاستجابة الناجحة (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "noteId": 1,
    "planId": 1,
    "authorId": 3,
    "authorName": "سارة مديرة المدرسة",
    "text": "تمت مراجعة الخطة وإقرار أولوياتها، مع التأكيد على تسريع موعد الورش التدريبية.",
    "createdAt": "2026-10-26T11:45:00+03:00"
  },
  "message": "تم تدوين ملاحظة المراجعة بنجاح."
}
```
