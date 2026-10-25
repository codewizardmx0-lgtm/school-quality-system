# توثيق واجهة برمجة التطبيقات: التقييم الذاتي والشواهد (Evaluation & Evidence API)

**منصة التقييم الذاتي والتحسين المدرسي**  
**الشريحة:** الشريحة الثانية (Backend) — أكتوبر 2026  
**المرجعية:** الفصل الرابع (4.4.4 و4.7)، اتفاقيات `conventions.md`، وقاموس البيانات.  
**المستهدف:** مطور الواجهة الأمامية (Frontend Engineer).

---

## 1. جدول الانحرافات والتحديثات مقارنة بكتالوج الفصل الرابع (4.4.4)

لتحديث الفصل الرابع لاحقاً، يوضح الجدول التالي الفروق بين المسارات المقترحة في كتالوج 4.4.4 والمسارات المعتمدة فعلياً في الشريحة:

| المسار المعتمد في الشريحة | المسار المقابل في كتالوج 4.4.4 | نوع التغيير | سبب الانحراف والقرار المعتمد |
|---|---|---|---|
| `GET /api/v1/evaluations/{id}/standards-tree` | غير موجود (كان فقط `GET /api/v1/standard-versions/{id}`) | **إضافة جديدة** | تمكين واجهة التقييم من جلب شجرة المعايير والمؤشرات والواصفات للدورة مدمجاً بها نتائج رصد مدرسة المستخدم وعدد الشواهد ونسبة الإنجاز دفعة واحدة مع فرض العزل المؤسسي. |
| `PUT /api/v1/evaluations/{evaluationId}/indicators/{indicatorId}/score` | `PUT /api/v1/evaluation-results/{id}` | **تعديل هيكلية** | المؤشرات غير المرصودة لا تملك `result_id` مسبقاً في قاعدة البيانات؛ لذا اعتمد مسار بأسلوب (Upsert) يربط التقييم بالمؤشر مباشرة، وينشئ النتيجة بحالة `Completed` تلقائياً فور أول رصد. |
| `POST /api/v1/evaluations/{evaluationId}/indicators/{indicatorId}/notes` | `POST /api/v1/evaluation-results/{id}/notes` | **تعديل هيكلية** | تدوين الملاحظات التوثيقية من سياق شجرة المؤشرات مع التحقق من وجود نتيجة مرصودة مسبقاً للمؤشر لربطها بها. |
| `POST /api/v1/evaluation-results/{id}/evidences` | `POST /api/v1/evaluation-results/{id}/evidences` | **مطابق تماماً** | إنشاء شاهد جديد لنتيجة مؤشر محدد مع رفع النسخة الأولى ومرفقها. |
| `POST /api/v1/evidences/{id}/versions` | `POST /api/v1/evidences/{id}/versions` | **مطابق تماماً** | رفع نسخة جديدة لشاهد قائم مع الاحتفاظ بالنسخ السابقة وضمان نسخة حالية واحدة. |

---

## 2. إرشادات وتوجيهات هامة لمطور الواجهة الأمامية

> [!IMPORTANT]
> **علاقة المؤشر بالشاهد وزر "إرفاق شاهد":**
> * في شجرة التقييم (`standards-tree`)، إذا كان المؤشر غير مرصود ستجد `resultId: null`.
> * **توجيه الواجهة:** يجب **إخفاء أو تعطيل** زر "إرفاق شاهد" لأي مؤشر قيمته `resultId === null`. لا يمكن رفع شاهد إلا بعد رصد درجة المؤشر والحصول على `resultId`.
> * محاولة فتح مسار رفع الشاهد بمعرف غير موجود ترجع `404 Not Found`.

> [!NOTE]
> **حالة الاكتمال (`completionStatus`):**
> * قيمة `completionStatus` تُكتب دائماً `Completed` عند رصد الدرجة، لأن الدرجة والواصفة متوفرتان دائماً.
> * حالة `Pending` معرّفة في قاموس البيانات لكنها **غير مستعملة** في هذه الشريحة تجنباً لكسر قيود قاعدة البيانات (`score` و `score_descriptor_id` هما `NOT NULL`).

> [!WARNING]
> **قفل التعديل (قاعدة العمل BR-SCH-03):**
> * يُقفل التقييم بالكامل وتُمنع عمليات الرصد وتعديل الملاحظات ورفع الشواهد فور إرسال التقرير النهائي (إذا كان آخر تسليم بحالة `Submitted` أو `UnderReview` أو `Completed`، أو كانت حالة التقييم `Completed`).
> * في حالة طلب الاستكمال (`NeedsCompletion`)، يُسمح بالرصد ورفع نسخ الشواهد **فقط وحصراً** للمؤشرات والشواهد المفتوحة المحددة في بنود طلب الاستكمال (`completion_request_items`).
> * عند محاولة التعديل والتقييم مقفل، يُرجع الـ API رمز الخطأ `422 Unprocessable Entity` مع تفصيل سبب القفل بالعربية داخل `errors.evaluation`.

---

## 3. الترويسات المشتركة (Headers)

### طلبات JSON (استعراض الشجرة والرصد والملاحظات)
```http
Accept: application/json
Content-Type: application/json
Authorization: Bearer <plainTextToken>
```

### طلبات رفع الملفات (الشواهد والنسخ التاريخية)
```http
Accept: application/json
Content-Type: multipart/form-data
Authorization: Bearer <plainTextToken>
```

---

## 4. نقاط النهاية التفصيلية

### 4.1 استعراض شجرة الإصدار المعياري الخام
* **المسار:** `GET /api/v1/standard-versions/{id}`
* **الصلاحية المطلوبة:** `standards.view`
* **الوصف:** استعراض شجرة المعايير والمؤشرات والواصفات بدون ربط بنتائج تقييم مدرسة محددة.

#### استجابة النجاح (200 OK):
```json
{
  "data": {
    "versionId": 1,
    "versionName": "المعايير الوطنية لجودة التعليم العام - الإصدار الأول",
    "issueYear": 2026,
    "status": "Active",
    "createdAt": "2026-10-12T19:20:00Z",
    "standards": [
      {
        "standardId": 1,
        "code": "STD-01",
        "name": "القيادة والإدارة المدرسية",
        "description": "معيار القيادة والتخطيط الاستراتيجي والمناخ المدرسي",
        "weight": 20.00,
        "subStandards": [
          {
            "subStandardId": 1,
            "code": "SUB-01-01",
            "name": "التخطيط الاستراتيجي والتطوير",
            "description": "فاعلية الخطط التشغيلية والمدرسية",
            "indicators": [
              {
                "indicatorId": 1,
                "code": "IND-01-01-01",
                "name": "تمتلك المدرسة خطة تشغيلية واضحة وموثقة",
                "description": "توصيف دقة واكتمال الخطة المدرسية السنوية",
                "weight": 1.50,
                "status": "Active",
                "scoreDescriptors": [
                  {
                    "descriptorId": 1,
                    "scoreLevelId": 1,
                    "scoreValue": 0,
                    "label": "غير متوفر",
                    "description": "لا توجد خطة تشغيلية للمدرسة إطلاقاً",
                    "displayOrder": 1
                  },
                  {
                    "descriptorId": 2,
                    "scoreLevelId": 2,
                    "scoreValue": 1,
                    "label": "متحقق بدرجة ضعيفة",
                    "description": "توجد خطة عامة غير مكتملة وغير معتمدة",
                    "displayOrder": 2
                  },
                  {
                    "descriptorId": 3,
                    "scoreLevelId": 3,
                    "scoreValue": 2,
                    "label": "متحقق بدرجة متوسطة",
                    "description": "توجد خطة موثقة ولكن لا تتضمن مؤشرات أداء دقيقة",
                    "displayOrder": 3
                  },
                  {
                    "descriptorId": 4,
                    "scoreLevelId": 4,
                    "scoreValue": 3,
                    "label": "متحقق",
                    "description": "توجد خطة تشغيلية سنوية متكاملة ومعتمدة ومشارَكة مع المجتمع المدرسي",
                    "displayOrder": 4
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  "message": null,
  "errors": null,
  "meta": null
}
```

---

### 4.2 استعراض شجرة التقييم مع حالة الرصد ونسبة الإنجاز
* **المسار:** `GET /api/v1/evaluations/{id}/standards-tree`
* **الصلاحية المطلوبة:** `standards.view` أو `evaluations.view`
* **قاعدة العزل:** إذا كان المستخدم يتبع مدرسة أخرى يرجع `404 Not Found`.

#### استجابة النجاح (200 OK):
```json
{
  "data": {
    "evaluationId": 1,
    "cycleId": 1,
    "versionId": 1,
    "versionName": "المعايير الوطنية لجودة التعليم العام - الإصدار الأول",
    "standards": [
      {
        "standardId": 1,
        "code": "STD-01",
        "name": "القيادة والإدارة المدرسية",
        "weight": 20.00,
        "subStandards": [
          {
            "subStandardId": 1,
            "code": "SUB-01-01",
            "name": "التخطيط الاستراتيجي والتطوير",
            "indicators": [
              {
                "indicatorId": 1,
                "code": "IND-01-01-01",
                "name": "تمتلك المدرسة خطة تشغيلية واضحة وموثقة",
                "weight": 1.50,
                "status": "Active",
                "resultId": 14,
                "score": 3,
                "scoreDescriptorId": 4,
                "scoreDescriptorLabel": "متحقق",
                "completionStatus": "Completed",
                "textualResult": "تمت مراجعة الخطة السنوية لعام 2026 بحضور لجنة الجودة.",
                "evidenceCount": 1,
                "scoreDescriptors": [ ... ]
              },
              {
                "indicatorId": 2,
                "code": "IND-01-01-02",
                "name": "متابعة وتقويم تنفيذ الخطة المدرسية",
                "weight": 1.50,
                "status": "Active",
                "resultId": null,
                "score": null,
                "scoreDescriptorId": null,
                "scoreDescriptorLabel": null,
                "completionStatus": null,
                "textualResult": null,
                "evidenceCount": 0,
                "scoreDescriptors": [ ... ]
              }
            ]
          }
        ]
      }
    ]
  },
  "message": null,
  "errors": null,
  "meta": {
    "totalActiveIndicators": 109,
    "completedResults": 1,
    "completionPercentage": 0.92
  }
}
```

---

### 4.3 رصد نتيجة مؤشر (Upsert Score)
* **المسار:** `PUT /api/v1/evaluations/{evaluationId}/indicators/{indicatorId}/score`
* **الصلاحية المطلوبة:** `evaluations.edit`
* **الوصف:** رصد أو تحديث درجة المؤشر (0 إلى 3). إذا لم يُرسل `scoreDescriptorId`، يشتق الـ API الواصفة المطابقة للتقدير تلقائياً.

#### جسم الطلب (Request Body):
```json
{
  "score": 3,
  "scoreDescriptorId": 4,
  "textualResult": "المدرسة تلتزم بتطبيق المعيار وتوفر كافة النماذج المعتمدة."
}
```
*(ملاحظة: حقل `scoreDescriptorId` اختياري وحقل `textualResult` اختياري).*

#### استجابة النجاح (200 OK):
```json
{
  "data": {
    "resultId": 14,
    "evaluationId": 1,
    "indicatorId": 1,
    "score": 3,
    "scoreDescriptorId": 4,
    "scoreDescriptorLabel": "متحقق",
    "textualResult": "المدرسة تلتزم بتطبيق المعيار وتوفر كافة النماذج المعتمدة.",
    "completionStatus": "Completed",
    "evaluatorUserId": 3,
    "updatedAt": "2026-10-25T19:20:00Z"
  },
  "message": "تم رصد نتيجة المؤشر بنجاح.",
  "errors": null,
  "meta": {
    "totalActiveIndicators": 109,
    "completedResults": 1,
    "completionPercentage": 0.92
  }
}
```

---

### 4.4 تدوين ملاحظة نصية على مؤشر مرصود
* **المسار:** `POST /api/v1/evaluations/{evaluationId}/indicators/{indicatorId}/notes`
* **الصلاحية المطلوبة:** `evaluations.edit`
* **الوصف:** إضافة ملاحظة توثيقية ترتبط بنتيجة المؤشر المرصودة مسبقاً.

#### جسم الطلب (Request Body):
```json
{
  "text": "تم استيفاء المؤشر بناءً على محضر اجتماع لجنة الجودة بتاريخ 2026-10-20."
}
```

#### استجابة النجاح (201 Created):
```json
{
  "data": {
    "noteId": 5,
    "resultId": 14,
    "authorUserId": 3,
    "text": "تم استيفاء المؤشر بناءً على محضر اجتماع لجنة الجودة بتاريخ 2026-10-20.",
    "createdAt": "2026-10-25T19:21:00Z"
  },
  "message": "تم حفظ الملاحظة بنجاح.",
  "errors": null,
  "meta": null
}
```

---

### 4.5 إنشاء شاهد جديد لنتيجة مؤشر ورفع ملفه
* **المسار:** `POST /api/v1/evaluation-results/{id}/evidences`
* **الصلاحية المطلوبة:** `evidence.manage`
* **نوع المحتوى:** `multipart/form-data`
* **الوصف:** إنشاء الشاهد ورفع النسخة الأولى v1 وتخزين المرفق بجدول `attachments` باسم UUID سري مع الاحتفاظ بالاسم الأصلي ونوعه.

#### حقول الطلب (Form-Data):
| الحقل | النوع | إلزامي | الشروط والقيود |
|---|---|---|---|
| `title` | نص | نعم | أقصى طول 200 حرف |
| `description` | نص | لا | وصف تفصيلي لمحتوى الشاهد |
| `justification` | نص | لا | مبررات دلالة الشاهد على المؤشر |
| `file` | ملف | نعم | أقصى حجم 10MB (10240 KB)، الصيغ المسموحة: `pdf, png, jpg, jpeg, docx, xlsx` |

#### استجابة النجاح (201 Created):
```json
{
  "data": {
    "evidenceId": 7,
    "resultId": 14,
    "indicatorId": 1,
    "title": "وثيقة اللائحة الداخلية المعتمدة",
    "description": "نسخة ممسوحة ضوئياً من اللائحة التنظيمية المطبقة للعام الحالي",
    "justification": "تثبت اكتمال وتوثيق خطة إدارة الجودة بالمدرسة",
    "createdAt": "2026-10-25T19:22:00Z",
    "currentVersion": {
      "evidenceVersionId": 12,
      "versionNo": 1,
      "current": true,
      "createdAt": "2026-10-25T19:22:00Z",
      "attachment": {
        "attachmentId": 8,
        "fileName": "school_regulations_2026.pdf",
        "fileType": "application/pdf",
        "fileSize": 1048576,
        "storageUri": "attachments/evidence/a83f1248-75c1-4b1f-bc91-ec596a77d120.pdf"
      }
    }
  },
  "message": "تم إضافة الشاهد ورفع ملفه بنجاح.",
  "errors": null,
  "meta": null
}
```

---

### 4.6 رفع نسخة جديدة لشاهد قائم (استبدال/تحديث)
* **المسار:** `POST /api/v1/evidences/{id}/versions`
* **الصلاحية المطلوبة:** `evidence.manage`
* **نوع المحتوى:** `multipart/form-data`
* **الوصف:** رفع نسخة جديدة للشاهد (`version_no` تلقائي تصاعدي)، وتحويل كافة النسخ السابقة إلى `current: false`، وتعيين النسخة الجديدة كـ `current: true` حصراً داخل معاملة قاعدة بيانات (Transaction).

#### حقول الطلب (Form-Data):
| الحقل | النوع | إلزامي | الشروط والقيود |
|---|---|---|---|
| `file` | ملف | نعم | أقصى حجم 10MB، الصيغ: `pdf, png, jpg, jpeg, docx, xlsx` |

#### استجابة النجاح (201 Created):
```json
{
  "data": {
    "evidenceId": 7,
    "evidenceVersionId": 13,
    "versionNo": 2,
    "current": true,
    "createdAt": "2026-10-25T19:23:00Z",
    "attachment": {
      "attachmentId": 9,
      "fileName": "school_regulations_2026_revised.pdf",
      "fileType": "application/pdf",
      "fileSize": 1258291,
      "storageUri": "attachments/evidence/f3c95190-8b43-4dc9-98fe-c2a0d8e87611.pdf"
    }
  },
  "message": "تم رفع النسخة الجديدة للشاهد بنجاح.",
  "errors": null,
  "meta": null
}
```

---

## 5. أمثلة الأخطاء المتوقعة ورموز الاستجابة (Error Handling)

### 5.1 رمز 401 Unauthorized (غير مصادق أو انتهت الجلسة)
```json
{
  "data": null,
  "message": "يجب تسجيل الدخول للمتابعة.",
  "errors": null,
  "meta": null
}
```

### 5.2 رمز 403 Forbidden (عدم امتلاك الصلاحية)
```json
{
  "data": null,
  "message": "غير مصرح لك برصد نتائج التقييم.",
  "errors": null,
  "meta": null
}
```

### 5.3 رمز 404 Not Found (العزل المؤسسي أو مورد غير موجود)
> تُرجع هذه الاستجابة أيضاً إذا حاول مستخدم مدرسة بلقيس طلب تقييم أو نتيجة أو شاهد يخص مدرسة الفاروق (القرار المعماري 9).
```json
{
  "data": null,
  "message": "ملف التقييم المطلوب غير موجود.",
  "errors": null,
  "meta": null
}
```

### 5.4 رمز 422 Unprocessable Entity: قفل التقييم (BR-SCH-03)
```json
{
  "data": null,
  "message": "ملف التقييم مقفل بعد إرساله النهائي وهو حالياً (تم الإرسال وبانتظار المراجعة الوزارية) (BR-SCH-03).",
  "errors": {
    "evaluation": [
      "ملف التقييم مقفل بعد إرساله النهائي وهو حالياً (تم الإرسال وبانتظار المراجعة الوزارية) (BR-SCH-03)."
    ]
  },
  "meta": null
}
```

### 5.5 رمز 422 Unprocessable Entity: قفل التقييم في مرحلة الاستكمال (NeedsCompletion)
```json
{
  "data": null,
  "message": "ملف التقييم في مرحلة استكمال الملاحظات، ولا يُسمح بتعديل هذا المؤشر لأنه ليس ضمن بنود طلب الاستكمال المفتوحة (BR-SCH-03).",
  "errors": {
    "evaluation": [
      "ملف التقييم في مرحلة استكمال الملاحظات، ولا يُسمح بتعديل هذا المؤشر لأنه ليس ضمن بنود طلب الاستكمال المفتوحة (BR-SCH-03)."
    ]
  },
  "meta": null
}
```

### 5.6 رمز 422 Unprocessable Entity: عدم تطابق الواصفة مع الدرجة
```json
{
  "data": null,
  "message": "البيانات المُدخلة غير صحيحة",
  "errors": {
    "scoreDescriptorId": [
      "الواصفة المحددة لا تنتمي لهذا المؤشر أو لا تطابق التقدير الرقمي المختار (BR-SCH-05)."
    ]
  },
  "meta": null
}
```

### 5.7 رمز 422 Unprocessable Entity: صيغة ملف غير مسموحة أو حجم زائد
```json
{
  "data": null,
  "message": "البيانات المُدخلة غير صحيحة",
  "errors": {
    "file": [
      "صيغة الملف غير مدعومة. الصيغ المسموحة: pdf, png, jpg, jpeg, docx, xlsx."
    ]
  },
  "meta": null
}
```

---

## 6. حسابات الاختبار المعتمدة للتجربة والتكامل (Test Accounts)

كلمة المرور الافتراضية لجميع الحسابات في بيئة التطوير المحلية: `ChangeMeDevPassword@2026`

| اسم المستخدم (`username`) | الدور (`Role`) | المؤسسة التابع لها | نوع الحساب (`user_type`) | الصلاحيات الأساسية المتعلقة بهذه الشريحة |
|---|---|---|---|---|
| `quality_belqees` | `school_evaluator` | مدرسة بلقيس (`school_id: 1`) | `school` | `evaluations.view`, `evaluations.create`, `evaluations.edit`, `evidence.manage`, `standards.view` |
| `principal_belqees` | `school_principal` | مدرسة بلقيس (`school_id: 1`) | `school` | `evaluations.view`, `reports.view`, `standards.view` *(لا يملك `evaluations.edit` أو `evidence.manage`)* |
| `quality_farouq` | `school_evaluator` | مدرسة الفاروق (`school_id: 2`) | `school` | `evaluations.view`, `evaluations.create`, `evaluations.edit`, `evidence.manage`, `standards.view` |
| `supervisor_ministry` | `ministry_supervisor` | الوزارة (`ministry_id: 1`) | `ministry` | `evaluations.view`, `supervision.review`, `reports.view`, `standards.view` |
| `admin` | `system_admin` | مسؤول نظام عام | `system` | `users.manage`, `schools.manage` *(محظور من عمليات التقييم BR-GEN-06)* |
