# توثيق واجهة برمجة التطبيقات: التقييم الذاتي ومعمارية الشواهد ومسار الاستكمال (Evaluation, Evidence & Completion API)

**منصة التقييم الذاتي والتحسين المدرسي**  
**الشريحة:** الشريحة الثانية + حزم التصحيح المعمارية (U-24, U-03, U-11, U-29) — نوفمبر 2026م (محدث ومعتمد)  
**المرجعية:** الفصل الرابع (4.4.3 و 4.7)، اتفاقيات `conventions.md`، قاموس البيانات، وقرارات التصحيحات 1 و 2 و 3.  
**المستهدف:** مطور الواجهة الأمامية (Frontend Engineer) وفريق المراجعة الأكاديمية والتقنية.

---

## 1. جدول الانحرافات والتحديثات المعمارية مقارنة بكتالوج الفصل الرابع

يوضح الجدول التالي الفروق بين التصميم المبدئي والمعمارية المعتمدة فعلياً في النظام بعد اكتمال حزم التصحيح:

| المسار المعتمد في النظام | المسار المقابل في التصميم المبدئي | نوع التغيير | سبب الانحراف والقرار المعماري المعتمد |
|---|---|---|---|
| `GET /api/v1/evaluations/{id}/standards-tree` | `GET /api/v1/standard-versions/{id}` | **إضافة معتمدة** | تمكين واجهة التقييم من جلب شجرة المعايير والمؤشرات والواصفات للدورة مدمجاً بها نتائج رصد مدرسة المستخدم وأدوات التحقق وعدد الشواهد ونسبة الإنجاز دفعة واحدة مع فرض العزل المؤسسي. |
| `PUT /api/v1/evaluations/{eId}/indicators/{iId}/score` | `PUT /api/v1/evaluation-results/{id}` | **تعديل هيكلي** | المؤشرات غير المرصودة لا تملك `result_id` مسبقاً في قاعدة البيانات؛ لذا اعتمد مسار بأسلوب (Upsert) يربط التقييم بالمؤشر مباشرة، وينشئ النتيجة بحالة `Completed` تلقائياً، مع قبول ومزامنة `verificationToolIds`. |
| `GET /api/v1/schools/{schoolId}/documents` | مسارات `evidences` القديمة | **معمارية نظيفة (U-24)** | فصل وثائق ومستندات المدرسة عن سياق التقييم في مستودع مستقل (`school_documents`) لإتاحة إعادة استخدام المستند دون إعادة رفعه. |
| `POST /api/v1/evaluations/{id}/indicators/{iId}/evidence-links` | `POST /evaluation-results/{id}/evidences` | **معمارية نظيفة (U-24)** | ربط استدلالي مرن (`evidence_links`) يربط نسخة المستند بالمؤشر وسياق التقييم مباشرة دون وساطة إلزامية لنتيجة مقفلة، مع حفظ التبرير وسياق الاستخدام. |
| `POST /api/v1/evaluations/{id}/submit` | `POST /evaluations/{id}/submit` | **ضبط دورة الحياة (U-03)** | تسليم التقييم ينقله إلى `Submitted` (وليس `Completed`)، وينشئ تقريراً بحالة `Draft` وسجل محاولة أولى `attempt_no = 1` في `evaluation_submissions`. |
| `POST /api/v1/evaluations/{id}/close` | غير موجود | **إضافة معتمدة (U-03)** | مسار الإغلاق المباشر للتقييم من المشرف الوزاري؛ ينقل التقييم إلى `Completed` والتقرير إلى `Final`. |
| `POST /api/v1/evaluations/{id}/completion-requests` | غير موجود | **إضافة معتمدة (U-03/U-11)** | إصدار طلب استكمال من المشرف الوزاري بمهلة زمنية إلزامية (`completion_deadline`) وبنود نواقص تفصيلية، وينقل التقييم إلى `NeedsCompletion`. |
| `PATCH /api/v1/completion-requests/{id}/deadline` | غير موجود | **إضافة معتمدة (U-11)** | تمديد مهلة الاستكمال من قبل المشرف الوزاري حصراً قبل أو بعد انتهائها مع توثيق عدد التمديدات. |
| `POST /api/v1/completion-requests/{id}/resubmit` | غير موجود | **إضافة معتمدة (U-03/U-29)** | إعادة تقديم التقييم من المدرسة بعد معالجة كافة البنود وداخل المهلة؛ ينشئ محاولة جديدة `attempt_no = N + 1` وينقل الطلب إلى `UnderReview` والتقييم إلى `Submitted`. |
| `POST /api/v1/completion-requests/{id}/close` | غير موجود | **إضافة معتمدة (U-03)** | إغلاق طلب الاستكمال نهائياً من المشرف الوزاري ونقل التقييم إلى `Completed` والطلب إلى `Resolved` والتقرير إلى `Final`. |

---

## 2. قواعد العمل والمحددات المنفذة

> [!IMPORTANT]
> **المعمارية النظيفة ثلاثية المستويات للشواهد (U-24):**
> * **المستوى الأول (School Document):** الوعاء الوثائقي للمستند على مستوى المدرسة في جدول `school_documents` (العنوان، النوع، الوصف).
> * **المستوى الثاني (Document Version):** النسخ والملفات الفيزيائية المرفوعة في جدول `document_versions` (الملف، الحجم، نوع MIME، رقم النسخة، ومؤشر النسخة الحالية `is_current`).
> * **المستوى الثالث (Evidence Link):** روابط الاستدلال التقييمي في جدول `evidence_links` لربط نسخة المستند بمؤشر وإجراء تحسين محدد داخل تقييم معين.
> * تم إسقاط الجداول القديمة (`evidences`, `evidence_versions`) بالكامل، ومُنعت إمكانية حذف أي نسخة مستند معتمدة كشاهد تقييمي (`RESTRICT`).

> [!WARNING]
> **قفل التعديل ودورة حياة الاستكمال (BR-SCH-03 & U-03 & U-11 & U-29):**
> * يُقفل التقييم بعد تسليمه (`Submitted`) ولا يُسمح بأي تعديل على الدرجات أو الشواهد أثناء المراجعة الوزارية (`errors.evaluation`).
> * في حالة طلب الاستكمال (`NeedsCompletion`)، يُسمح فقط بتعديل المؤشرات ورفع شواهد للبنود المحددة في طلب الاستكمال حصراً.
> * إعادة التقديم (`resubmit`) تشترط:
>   1. سريان مهلة الاستكمال (`completion_deadline`). إذا انتهت المهلة يُرجع النظام `422 Unprocessable Entity` مع إمكانية قيام المشرف الوزاري بتمديدها.
>   2. معالجة كافة بنود الاستكمال؛ لا يُقبل إعادة التقديم إذا بقي أي بند بحالة `pending`.
> * تتحول حالة البند إلى `resolved` آلياً عند قيام المدرسة بربط شاهد مكتمل (`completed`) يحقق كفاية المؤشر؛ ولا تملك المدرسة صلاحية تغيير حالة البند يدوياً.
> * المشرف الوزاري هو الجهة الوحيدة المخولة برفض البند (`rejected`) أو إغلاق الطلب نهائياً.
> * يُحظر تماماً استخدام لفظ «اعتماد» لإجراءات المشرف الوزاري؛ فالإجراء إما «إغلاق مباشر» أو «طلب استكمال» أو «إغلاق طلب استكمال».

---

## 3. الترويسات المشتركة (Headers)

### طلبات JSON القياسية
```http
Accept: application/json
Content-Type: application/json
Authorization: Bearer <plainTextToken>
```

### طلبات رفع الملفات (Multipart Form Data)
```http
Accept: application/json
Content-Type: multipart/form-data
Authorization: Bearer <plainTextToken>
```

---

## 4. نقاط النهاية التفصيلية

### 4.0 بدء ملف تقييم ذاتي جديد للمدرسة (Evaluation Initiation)
- **المسار:** `POST /api/v1/evaluations`
- **الصلاحية المطلوبة:** `evaluations.create` (مقيّم المدرسة حصرًا)
- **الوصف:** بدء ملف تقييم ذاتي للمدرسة في دورة نشطة مفتوحة.

#### جسم الطلب:
```json
{
  "cycle_id": 1
}
```

#### استجابة النجاح (201 Created):
```json
{
  "data": {
    "evaluation_id": 3,
    "school_id": 1,
    "cycle_id": 1,
    "status": "InProgress"
  },
  "message": "تم بدء ملف التقييم الذاتي للمدرسة بنجاح.",
  "errors": null,
  "meta": null
}
```

---

### 4.1 استعراض شجرة التقييم المدمجة بالنتائج والإنجاز
* **المسار:** `GET /api/v1/evaluations/{id}/standards-tree`
* **الصلاحية المطلوبة:** `standards.view` أو `evaluations.view`
* **الوصف:** جلب شجرة المعايير والمؤشرات والواصفات كاملة مدمجة بنتائج رصد المدرسة والشواهد ونسبة الإنجاز.

#### استجابة النجاح (200 OK):
```json
{
  "data": {
    "evaluationId": 1,
    "schoolId": 1,
    "status": "InProgress",
    "progressPercentage": 45.5,
    "standards": [
      {
        "standardId": 1,
        "code": "STD-01",
        "name": "القيادة والإدارة المدرسية",
        "indicators": [
          {
            "indicatorId": 1,
            "code": "IND-01-01-01",
            "name": "تمتلك المدرسة خطة تشغيلية واضحة وموثقة",
            "score": 3,
            "scoreDescriptorId": 4,
            "completionStatus": "Completed",
            "evidenceLinksCount": 2
          }
        ]
      }
    ]
  },
  "message": "تم استرجاع شجرة المعايير والنتائج بنجاح."
}
```

---

### 4.2 رصد درجة المؤشر والواصفة (Score Indicator Upsert)
* **المسار:** `PUT /api/v1/evaluations/{evaluationId}/indicators/{indicatorId}/score`
* **الصلاحية المطلوبة:** `evaluations.edit` (مقيّم المدرسة)
* **الوصف:** رصد أو تحديث درجة المؤشر (0 إلى 3) مع اشتقاق الواصفة آلياً ومزامنة أدوات التحقق وتدوين الحدث بسجل التدقيق.

#### جسم الطلب:
```json
{
  "score": 3,
  "scoreDescriptorId": 4,
  "verificationToolIds": [1, 2],
  "textualResult": "تم التحقق من اكتمال الخطة المدرسية واعتمادها رسمياً."
}
```

#### استجابة النجاح (200 OK):
```json
{
  "data": {
    "resultId": 14,
    "evaluationId": 1,
    "indicatorId": 1,
    "score": 3,
    "scoreDescriptorId": 4,
    "completionStatus": "Completed",
    "updatedAt": "2026-11-03T18:00:00Z"
  },
  "message": "تم رصد نتيجة المؤشر بنجاح."
}
```

---

### 4.3 تدوين ملاحظة على نتيجة المؤشر
* **المسار:** `POST /api/v1/evaluations/{eId}/indicators/{iId}/notes`
* **الصلاحية المطلوبة:** `evaluations.edit`

#### جسم الطلب:
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
    "text": "تم استيفاء المؤشر بناءً على محضر اجتماع لجنة الجودة بتاريخ 2026-10-20.",
    "createdAt": "2026-11-03T18:05:00Z"
  },
  "message": "تم حفظ الملاحظة بنجاح."
}
```

---

### 4.4 استعراض مستودع وثائق المدرسة (School Documents Repository)
* **المسار:** `GET /api/v1/schools/{schoolId}/documents`
* **الصلاحية المطلوبة:** `evaluations.view` أو `evidence.manage`
* **الوصف:** استعراض كافة المستندات والوثائق المؤسسية الخاصة بالمدرسة مع نسخها الحالية وتاريخ رفعها.

#### استجابة النجاح (200 OK):
```json
{
  "data": [
    {
      "id": 12,
      "schoolId": 1,
      "title": "الخطة التشغيلية السنوية 2026",
      "documentType": "plan",
      "description": "الخطة السنوية الشاملة لإدارة المدرسة",
      "currentVersion": {
        "id": 25,
        "versionNo": 1,
        "isCurrent": true,
        "fileName": "operational_plan_2026.pdf",
        "fileSize": 2048576,
        "mimeType": "application/pdf",
        "createdAt": "2026-11-02T10:00:00Z"
      }
    }
  ],
  "message": "تم استرجاع مستندات المدرسة بنجاح."
}
```

---

### 4.5 ربط مستند قائم بمؤشر تقييمي (Link Existing Document)
* **المسار:** `POST /api/v1/evaluations/{id}/indicators/{indicatorId}/evidence-links`
* **الصلاحية المطلوبة:** `evidence.manage`
* **الوصف:** توظيف نسخة مستند مدرسي قائم كشاهد لمؤشر محدد ضمن ملف التقييم دون الحاجة لإعادة الرفع، مع إمكانية ربطه بإجراء تحسين تنفيذي (`action_id`).

#### جسم الطلب:
```json
{
  "document_version_id": 25,
  "justification": "تثبت الخطة التشغيلية جاهزية فرق العمل وتوزيع المهام",
  "status": "completed",
  "action_id": null
}
```

#### استجابة النجاح (201 Created):
```json
{
  "data": {
    "id": 40,
    "schoolId": 1,
    "evaluationId": 1,
    "indicatorId": 1,
    "documentVersionId": 25,
    "justification": "تثبت الخطة التشغيلية جاهزية فرق العمل وتوزيع المهام",
    "status": "completed",
    "createdAt": "2026-11-03T18:10:00Z"
  },
  "message": "تم ربط الشاهد بالمؤشر بنجاح."
}
```

---

### 4.6 رفع مستند مدرسي جديد وربطه بالمؤشر مباشرة
* **المسار:** `POST /api/v1/evaluations/{id}/indicators/{indicatorId}/evidence-links/upload`
* **الصلاحية المطلوبة:** `evidence.manage`
* **نوع المحتوى:** `multipart/form-data`
* **الوصف:** إنشاء المستند المدرسي ورفع نسخته الأولى وتوليد رابط الشاهد للمؤشر في عملية ذرية واحدة (Atomic Transaction).

#### حقول الطلب:
| الحقل | النوع | إلزامي | الشروط |
|---|---|---|---|
| `title` | نص | نعم | عنوان المستند (حتى 200 حرف) |
| `document_type` | نص | لا | نوع المستند (`minutes, plan, record, report, board, image, other`) |
| `description` | نص | لا | وصف المستند |
| `justification` | نص | لا | مبررات الاستدلال بالمستند للمؤشر |
| `status` | نص | لا | `draft` أو `completed` (الافتراضي `completed`) |
| `action_id` | رقم | لا | ربط الشاهد بإجراء تحسين تنفيذي |
| `file` | ملف | نعم | أقصى حجم 10MB؛ الصيغ: `pdf, png, jpg, jpeg, docx, xlsx` |

#### استجابة النجاح (201 Created):
```json
{
  "data": {
    "evidenceLink": {
      "id": 41,
      "evaluationId": 1,
      "indicatorId": 1,
      "status": "completed",
      "justification": "محضر الاجتماع الأول للجنة الجودة"
    },
    "document": {
      "id": 13,
      "title": "محضر لجنة الجودة الأول",
      "documentType": "minutes"
    },
    "version": {
      "id": 26,
      "versionNo": 1,
      "fileName": "minutes_meeting_1.pdf"
    }
  },
  "message": "تم رفع المستند وربطه كشاهد بنجاح."
}
```

---

### 4.7 إلغاء ربط شاهد تقييمي (Unlink Evidence)
* **المسار:** `DELETE /api/v1/evidence-links/{linkId}`
* **الصلاحية المطلوبة:** `evidence.manage`
* **الوصف:** فك ارتباط الشاهد عن المؤشر التقييمي دون حذف ملف المستند الأصلي من مستودع المدرسة، وتدوين العملية في سجل التدقيق (`evidence.unlinked`).

#### استجابة النجاح (200 OK):
```json
{
  "data": {
    "linkId": 40,
    "unlinked": true
  },
  "message": "تم إلغاء ربط الشاهد بنجاح."
}
```

---

### 4.8 تنزيل ملف نسخة المستند
* **المسار:** `GET /api/v1/document-versions/{versionId}/download`
* **الصلاحية المطلوبة:** `evaluations.view` أو `evidence.manage`
* **الوصف:** تنزيل الملف الأصلي باسمه ونوع MIME الصحيح مع حماية المسار الفعلي على الخادم وفرض العزل المؤسسي الصارم (404 عند طلب مدرسة أخرى).

---

### 4.9 تسليم التقييم الذاتي للمراجعة الوزارية (Evaluation Submission)
* **المسار:** `POST /api/v1/evaluations/{id}/submit`
* **الصلاحية المطلوبة:** `evaluations.submit` (مقيّم المدرسة حصرًا)
* **الوصف:** التحقق من رصد كامل المؤشرات الـ 109، تجميد لقطة السياق، نقل حالة التقييم إلى `Submitted`، إنشاء تقرير بحالة `Draft`، وتسجيل محاولة التسليم الأولى (`attempt_no = 1`) في `evaluation_submissions`.

#### استجابة النجاح (200 OK):
```json
{
  "data": {
    "evaluationId": 1,
    "status": "Submitted",
    "reportId": 10,
    "attemptNo": 1,
    "submittedAt": "2026-11-03T18:30:00Z"
  },
  "message": "تم تسليم ملف التقييم الذاتي بنجاح وبانتظار المراجعة الإشرافية الوزارية."
}
```

---

### 4.10 الإغلاق المباشر للتقييم من المشرف الوزاري (Direct Close)
* **المسار:** `POST /api/v1/evaluations/{id}/close`
* **الصلاحية المطلوبة:** المشرف الوزاري حصراً (`user_type === 'ministry'`)
* **الوصف:** إغلاق ملف التقييم المسلّم مباشرة دون الحاجة لطلب استكمال، ونقل حالة التقييم إلى `Completed` والتقرير إلى `Final` وتدوين الحدث بسجل التدقيق (`evaluation.direct_closed`).

#### استجابة النجاح (200 OK):
```json
{
  "data": {
    "evaluationId": 1,
    "status": "Completed",
    "reportStatus": "Final",
    "closedAt": "2026-11-03T18:40:00Z"
  },
  "message": "تم الإغلاق النهائي لملف التقييم بنجاح."
}
```

---

### 4.11 إنشاء طلب استكمال بمهلة زمنية (Create Completion Request)
* **المسار:** `POST /api/v1/evaluations/{id}/completion-requests`
* **الصلاحية المطلوبة:** المشرف الوزاري حصراً
* **الوصف:** إصدار طلب استكمال لتقييم مسلّم يتضمن مهلة زمنية ملزمة وبنود نواقص تفصيلية، ونقل حالة التقييم إلى `NeedsCompletion`.

#### جسم الطلب:
```json
{
  "completion_deadline": "2026-11-15T23:59:59Z",
  "notes": "يرجى استيفاء شواهد مؤشرات القيادة وتحديث خطة الطوارئ",
  "items": [
    {
      "indicator_id": 1,
      "missing_description": "الخطة المرفقة تفتقر لتوقيع مدير المدرسة وخاتم الاعتماد",
      "evidence_link_id": 41
    },
    {
      "indicator_id": 5,
      "missing_description": "لم يتم إرفاق محضر تشكيل لجنة الأمن والسلامة المدرسية",
      "evidence_link_id": null
    }
  ]
}
```

#### استجابة النجاح (201 Created):
```json
{
  "data": {
    "requestId": 4,
    "status": "Open",
    "completionDeadline": "2026-11-15T23:59:59Z",
    "deadlineExtensionsCount": 0,
    "items": [
      {
        "requestItemId": 8,
        "indicatorId": 1,
        "missingDescription": "الخطة المرفقة تفتقر لتوقيع مدير المدرسة وخاتم الاعتماد",
        "status": "pending"
      }
    ]
  },
  "message": "تم إنشاء طلب الاستكمال وتحديد المهلة بنجاح ونقل التقييم إلى حالة NeedsCompletion."
}
```

---

### 4.12 تمديد مهلة طلب الاستكمال (Extend Deadline)
* **المسار:** `PATCH /api/v1/completion-requests/{id}/deadline`
* **الصلاحية المطلوبة:** المشرف الوزاري حصراً
* **الوصف:** تمديد المهلة الزمنية لطلب الاستكمال بطلب من المدرسة أو تقدير من المشرف وتدوين الحدث بسجل التدقيق.

#### جسم الطلب:
```json
{
  "new_deadline": "2026-11-20T23:59:59Z"
}
```

#### استجابة النجاح (200 OK):
```json
{
  "data": {
    "requestId": 4,
    "status": "Open",
    "completionDeadline": "2026-11-20T23:59:59Z",
    "deadlineExtendedAt": "2026-11-03T19:00:00Z",
    "deadlineExtensionsCount": 1
  },
  "message": "تم تمديد مهلة طلب الاستكمال بنجاح."
}
```

---

### 4.13 إعادة تقديم التقييم بعد معالجة البنود (Resubmit Completion)
* **المسار:** `POST /api/v1/completion-requests/{id}/resubmit`
* **الصلاحية المطلوبة:** `evaluations.submit` (مدرسة التقييم حصراً)
* **الوصف:** إعادة رفع التقييم بعد معالجة كافة بنود الاستكمال برفع شواهد مكتملة وضمن سريان المهلة الزمانية؛ يُنشئ محاولة تسليم جديدة (`attempt_no = N + 1`) وينقل الطلب إلى `UnderReview` والتقييم إلى `Submitted`.

#### استجابة النجاح (200 OK):
```json
{
  "data": {
    "requestId": 4,
    "requestStatus": "UnderReview",
    "evaluationStatus": "Submitted",
    "newAttemptNo": 2,
    "submissionId": 15,
    "submittedAt": "2026-11-03T19:15:00Z"
  },
  "message": "تمت إعادة تسليم ملف التقييم بنجاح ونقله إلى قيد المراجعة الإشرافية (محاولة رقم 2)."
}
```

---

### 4.14 الإغلاق النهائي لطلب الاستكمال والتقييم (Close Completion Request)
* **المسار:** `POST /api/v1/completion-requests/{id}/close`
* **الصلاحية المطلوبة:** المشرف الوزاري حصراً
* **الوصف:** إغلاق طلب الاستكمال نهائياً بعد مراجعة شواهد المدرسة؛ ينقل طلب الاستكمال إلى `Resolved` والتقييم إلى `Completed` والتقرير إلى `Final`.

#### استجابة النجاح (200 OK):
```json
{
  "data": {
    "requestId": 4,
    "requestStatus": "Resolved",
    "evaluationStatus": "Completed",
    "reportStatus": "Final",
    "resolvedAt": "2026-11-03T19:30:00Z"
  },
  "message": "تم إغلاق طلب الاستكمال والتقييم نهائياً بنجاح."
}
```

---

## 5. رموز الأخطاء المتوقعة ومعالجتها (Error Handling)

### 5.1 رمز 403 Forbidden (محاولة استعراض أو تعديل غير مصرح به)
```json
{
  "data": null,
  "message": "غير مصرح لك بإغلاق ملف التقييم. هذه العملية مخصصة للمشرف الوزاري فقط.",
  "errors": null,
  "meta": null
}
```

### 5.2 رمز 404 Not Found (العزل المؤسسي الصارم)
> يُرجع عند محاولة مستخدم مدرسة الوصول لتقييم أو طلب استكمال أو مستند مدرسة أخرى.
```json
{
  "data": null,
  "message": "طلب الاستكمال المطلوب غير موجود.",
  "errors": null,
  "meta": null
}
```

### 5.3 رمز 422 Unprocessable Entity: انتهاء مهلة الاستكمال
```json
{
  "data": null,
  "message": "انتهت مهلة استكمال الملاحظات المحددة من المشرف الوزاري دون تمديد، ولا يمكن إعادة تقديم التقييم (422).",
  "errors": {
    "deadline": [
      "انتهت مهلة استكمال الملاحظات المحددة من المشرف الوزاري دون تمديد، ولا يمكن إعادة تقديم التقييم (422)."
    ]
  },
  "meta": null
}
```

### 5.4 رمز 422 Unprocessable Entity: محاولة resubmit بوجود بنود معلقة
```json
{
  "data": null,
  "message": "لا يمكن إعادة تقديم التقييم لوجود بنود استكمال لم يتم معالجتها واستيفاؤها بالكامل.",
  "errors": {
    "unresolved_items": [
      {
        "request_item_id": 8,
        "indicator_id": 1,
        "status": "pending",
        "missing_description": "الخطة المرفقة تفتقر لتوقيع مدير المدرسة وخاتم الاعتماد"
      }
    ]
  },
  "meta": null
}
```

### 5.5 رمز 422 Unprocessable Entity: قفل التقييم (BR-SCH-03)
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
