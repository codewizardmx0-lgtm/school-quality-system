# اتفاقيات المشروع (Conventions)

**المرجع التنفيذي الملزم للـ Backend (Laravel API) والواجهة (React) معًا**
منصة التقييم الذاتي والتحسين المدرسي — 12 أكتوبر 2026

**المصادر بترتيب الأسبقية:** (1) وثيقة التحليل والتصميم (المشروع الأول) — المتطلبات وقسم 3.10.8؛ (2) قاموس البيانات النهائي ومخطط ERD-0 النهائي — قرار تنفيذي متفق ومعتمد؛ (3) خطة المشروع الثاني وهذا الملف — وثيقتا عمل داخليتان وليستا متطلبًا أصليًا.

---

## 1. مبادئ عامة وحدود الملف

1.1. هذا الملف يترجم القرارات الموجودة في المصادر أعلاه إلى قواعد تنفيذية يومية. **أسبقية الحسم عند أي خلاف: وثيقة المشروع ← القاموس/الـERD ← الخطة وهذا الملف ← التفضيل الشخصي.**

1.2. ما لم يُوسم بـ **[اقتراح]** فهو منقول من المصادر بمرجعه. وما وُسم به فهو قرار تنفيذي من عندنا قابل للتعديل بقرار صريح منك — وكل الاقتراحات المفتوحة مجموعة في القسم 14.

1.3. لغة الكود والمعرفات: الإنجليزية. كل النصوص الظاهرة للمستخدم: عربية. الواجهة RTL بالكامل (خطة المشروع الثاني — المرحلة 4).

1.4. أي تعارض يُكتشف بين هذا الملف والمصادر يُوثق في القسم 14 ولا يُحل بصمت.

1.5. لا متطلبات جديدة هنا إطلاقًا — هذا الملف يفسر وينفذ، ولا يضيف.

---

## 2. التسمية

| ماذا | القاعدة | مثال | المصدر |
|---|---|---|---|
| الجداول | snake_case جمع، بالأسماء الحرفية للقاموس | `evaluation_results`, `cycle_participations` | قاموس البيانات |
| الأعمدة | snake_case، لا تغيير لأي اسم في القاموس | `score_descriptor_id`, `human_modifications` | قاموس البيانات |
| المفاتيح الأساسية | `<المفرد>_id` (مخصصة لا `id` عام) | `role_id`, `result_id`, `note_id` | قاموس البيانات |
| الـ Models | مفرد PascalCase | `EvaluationResult`, `CycleParticipation` | [اقتراح] (متوافق مع Laravel) |
| الـ Controllers | `<Resource>Controller` داخل مجلد الوحدة | `EvaluationResultsController` | [اقتراح] |
| الـ Services | `<Domain>Service` — منطق الأعمال هنا لا في المتحكم | `EvaluationService` | خطة المشروع الثاني — المرحلة 3 |
| الـ Policies | `<Model>Policy` | `EvaluationPolicy` | خطة المشروع الثاني — المرحلة 3 |
| الـ Requests | `<Action><Resource>Request` | `StoreEvaluationResultRequest` | [اقتراح] |
| الـ Resources | `<Resource>Resource` + `<Resource>Collection` | `IndicatorResource` | خطة المشروع الثاني — المرحلة 3 |
| مسارات الـ API | `/{إصدار}/{مورد-جمع-kebab}` — لا أفعال في المسار | `/api/v1/evaluation-results` | خطة المشروع الثاني — المرحلة 3 |
| الأفعال غير القياسية | POST بمسار اسمي واضح | `POST /api/v1/ai/analyses` | خطة المشروع الثاني |
| حقول JSON (طلبًا وردًا) | camelCase — التحويل يتم في Resources/Requests | `evaluationId`, `submittedAt` | [اقتراح] (خطة المشروع الثاني) — قرار مفتوح §14-1 |
| TypeScript | متغيرات/دوال camelCase، أنواع PascalCase، ثوابت Enums بمسميات القسم 5 | `submissionStatus`, `type Submission` | خطة المشروع الثاني — المرحلة 4 |
| ملفات React | مكوّنات `PascalCase.tsx`، دوال مساعدة وhooks بـ `camelCase.ts` (`useAuth.ts`) | `StatusBadge.tsx` | [اقتراح] |
| مجلدات React | `features/<module>/` بوحدات الوثيقة | `features/evaluation/`, `features/ai-assistant/` | خطة المشروع الثاني — المرحلة 4 |

قاعدة تعارض الأسماء: إذا اختلف اسم الجدول عن اصطلاح Laravel الافتراضي، يبقى اسم القاموس ويتكيف الكود (انظر §12).

---

## 3. مغلف JSON الموحد

كل استجابة — بلا استثناء — بالشكل:

```
{ "data": ... | null, "message": "نص عربي أو null", "errors": {...} | null, "meta": {...} | null }
```

**نجاح — عنصر واحد** (`GET /api/v1/evaluation-results/12`):

```json
{
  "data": {
    "resultId": 12,
    "evaluationId": 3,
    "indicatorId": 57,
    "score": 2,
    "scoreDescriptorId": 210,
    "completionStatus": "Completed",
    "updatedAt": "2026-10-12T06:41:00Z"
  },
  "message": null,
  "errors": null,
  "meta": null
}
```

**نجاح — قائمة مع الصفحات** (`GET /api/v1/evaluation-submissions?status=NeedsCompletion`):

```json
{
  "data": [
    { "submissionId": 8, "status": "NeedsCompletion", "attemptNo": 2,
      "submittedAt": "2026-10-10T08:20:00Z" }
  ],
  "message": null,
  "errors": null,
  "meta": { "page": 1, "perPage": 20, "total": 134, "lastPage": 7 }
}
```

**فشل التحقق 422** — `errors` خريطة: المفتاح اسم الحقل (camelCase) والقيمة مصفوفة رسائل عربية:

```json
{
  "data": null,
  "message": "البيانات المُدخلة غير صحيحة",
  "errors": {
    "score": ["قيمة التقدير يجب أن تكون بين 0 و 3."],
    "indicatorId": ["المؤشر مطلوب."]
  },
  "meta": null
}
```

**مسودة لم تُرسل بعد** — `submittedAt` تعود `null` ما دامت الحالة `Draft`، وتُضبط لحظة الإرسال (قاموس البيانات — قيد الجدول؛ بقية الحالات الأربع تستلزم قيمة):

```json
{
  "data": { "submissionId": 9, "status": "Draft", "attemptNo": 1, "submittedAt": null },
  "message": null,
  "errors": null,
  "meta": null
}
```

**401 (غير مصادق):**

```json
{ "data": null, "message": "يجب تسجيل الدخول للمتابعة.", "errors": null, "meta": null }
```

**403 (خارج الصلاحية/النطاق)** — `message` حرفيًا كما في نص اختبار NFR-SEC-03:

```json
{ "data": null, "message": "غير مصرح", "errors": null, "meta": null }
```

**404:**

```json
{ "data": null, "message": "العنصر المطلوب غير موجود.", "errors": null, "meta": null }
```

**500** — بلا أي تفاصيل داخلية أو مسارات ملفات **[اقتراح]**:

```json
{ "data": null, "message": "حدث خطأ غير متوقع. حاول مرة أخرى لاحقًا.", "errors": null, "meta": null }
```

**تنفيذ المغلف في Laravel [اقتراح]:** طبّق المغلف مرة واحدة في طبقة واحدة (Response Macro موحد يُغلف مخرجات الـResource) حتى لا يضيف الـResource حقل `data` بنفسه فينتج `data.data`.

---

## 4. رموز حالة HTTP

| الرمز | متى يُستخدم | مثال من المنصة |
|---|---|---|
| 200 | نجاح قراءة أو تحديث | جلب المؤشرات، حفظ تقدير |
| 201 | نجاح إنشاء | إنشاء نتيجة/خطة/طلب استكمال |
| 204 | نجاح بلا جسم استجابة — لا يرتبط بأي سياسة حذف أو تعطيل. لا مسار معرفًا يستخدمه حاليًا؛ يُعتمد عند وجود عملية نجاحها لا يحتاج جسمًا **[اقتراح]** | — |
| 401 | بلا رمز صالح أو منتهٍ | قبل تسجيل الدخول |
| 403 | مصادق لكن خارج صلاحيته أو **خارج نطاقه** (NFR-SEC-03) | مستخدم مدرسة يفتح رابط وزارة → «غير مصرح» |
| 404 | غير موجود فعلًا | معرّف مؤشر غير صحيح |
| 409 | تعارض قيد تكاملي | تقييم ثانٍ لنفس المدرسة/الدورة — UNIQUE(cycle_id, school_id) (3.10.8) **[اقتراح]** |
| 422 | فشل تحقق المدخلات | تقدير خارج 0–3 |
| 500 | خطأ خادم غير متوقع | — |

**التمييز بين 422 و409 [اقتراح]:** 422 لفشل التحقق على المدخلات نفسها قبل منطق الأعمال (حقل ناقص، قيمة خارج 0–3). 409 لتعارض يظهر مقابل بيانات قائمة رغم سلامة المدخلات شكليًا (تقييم ثانٍ لمدرسة لها تقييم في الدورة نفسها). كلاهما يعيد المغلف الموحد والفرق في رمز الحالة ومحتوى `errors`.

---

## 5. اتفاقية قيم الحالات (Enums)

**قاعدة التسمية المعتمدة** (قاموس البيانات — التمهيد، نسخة 12 أكتوبر المحدَّثة بالفعل بهذه القيم): حالات الكيانات **PascalCase**، وقيم الأنواع والمعرفات المركبة **snake_case**.

**الاستثناء الموثق:** حالات `evaluation_submissions` الخمس منصوصة حرفيًا في 3.10.8 ومجمدة بنص الوثيقة — لا تُعَدَّل ولو طابقتها القاعدة.

| الكيان (الجدول) | الحقل | القيم | المصدر |
|---|---|---|---|
| users | user_type | `school` \| `ministry` \| `system` | قاموس البيانات |
| users | status | `Active` \| `Disabled` | قاموس البيانات |
| schools | status | `Active` \| `Inactive` | قاموس البيانات |
| standard_versions | status | `Draft` \| `Active` \| `Retired` | قاموس البيانات |
| indicators | status | `Active` \| `Inactive` | قاموس البيانات |
| evaluation_cycles | status | `Active` \| `Closed` (الإغلاق تلقائي عند انتهاء الفترة — FR-SUP-01) | قاموس البيانات |
| evaluations | status | `InProgress` \| `Completed` | قاموس البيانات |
| evaluation_results | completion_status | `Pending` \| `Completed` | قاموس البيانات |
| **evaluation_submissions** | status | `Draft` \| `Submitted` \| `UnderReview` \| `NeedsCompletion` \| `Completed` | **3.10.8 — مجمدة نصًا (SubmissionStatus)** |
| reports | status | `Draft` \| `Final` | قاموس البيانات |
| improvement_areas | priority | `Low` \| `Medium` \| `High` | قاموس البيانات |
| improvement_plans | status | `Draft` \| `Active` \| `Completed` \| `Cancelled` | قاموس البيانات |
| improvement_actions | status | `Pending` \| `InProgress` \| `Done` \| `Cancelled` | قاموس البيانات |
| completion_requests | status | `Open` \| `Resolved` | قاموس البيانات |
| completion_request_items | status | `Pending` \| `Resolved` | قاموس البيانات |
| ai_analysis | status | `Pending` \| `Completed` \| `Failed` | قاموس البيانات |
| ai_analysis | input_scope | `results` \| `results_and_notes` | قاموس البيانات |
| ai_recommendations | type | `strength` \| `improvement` \| `recommendation` \| `draft` | قاموس البيانات |
| ai_recommendations | priority | `Low` \| `Medium` \| `High` | قاموس البيانات |
| ai_recommendations | status | `PendingReview` \| `Accepted` \| `Modified` \| `Ignored` | قاموس البيانات |
| attachments | target_type | `evidence_version` \| `report` | قاموس البيانات + 3.10.8 |
| notifications | type | `cycle_launched` \| `cycle_closed` \| `completion_requested` \| `action_due_soon` \| `version_activated` | قاموس البيانات (أحداث FR-GEN-05) |
| notifications | related_entity_type | `completion_request` \| `evaluation_cycle` \| `standard_version` \| `improvement_action` | قاموس البيانات |

**مصدر حقيقة واحد:** PHP Enum في الـAPI + ملف ثوابت TypeScript مطابق في الواجهة، يُحدَّثان معًا (قاموس البيانات — التمهيد).

---

## 6. التواريخ والأوقات

| البند | القاعدة | المصدر |
|---|---|---|
| التخزين في قاعدة البيانات | `datetime` بتوقيت UTC | **[اقتراح]** |
| الإرسال في JSON | ISO 8601 بتوقيت UTC بصيغة `Z`: `"2026-10-12T06:41:00Z"` | **[اقتراح]** — قرار مفتوح §14-3 |
| حقول التاريخ فقط (`issue_date`, `start_date`, `due_date`) | `"2026-10-12"` بلا وقت | قاموس البيانات |
| العام الدراسي `academic_year` | `"2026/2027"` | **[اقتراح]** |
| العرض في الواجهة | التحويل في React حسب إعداد المستخدم (افتراضيًا +03:00) ثم صياغة عربية ميلادية (مثل: 12 أكتوبر 2026) | **[اقتراح]** |
| `created_at` / `updated_at` | تُملأ تلقائيًا حيث وُجدت في القاموس — لدعم التتبع والتدقيق (3.10.8: لا جدول تدقيق مستقل) | قاموس البيانات |

---

## 7. الصفحات والبحث والفرز والتصفية

معاملات الاستعلام (camelCase كبقية النقل):

| المعامل | المعنى | الافتراضي | المصدر |
|---|---|---|---|
| `page` | رقم الصفحة | 1 | [اقتراح] |
| `perPage` | حجم الصفحة | 20 (حد أقصى 100) | [اقتراح] |
| `q` | بحث نصي حر | — | [اقتراح] |
| `sort` | حقل الفرز، والبادئة `-` تنازلي: `sort=-submittedAt` | حسب السياق | [اقتراح] |
| `<حقل>=<قيمة>` | تصفية مباشرة: `status=NeedsCompletion&cycleId=4` | — | [اقتراح] |

- الردود القائمة دائمًا مع `meta` (§3). القوائم الكبيرة (المؤشرات، الملاحظات، الإشعارات) تُصفَّن إلزاميًا **[اقتراح]**.
- العلاقات المطلوبة عبر معامل `with` مثل `?with=descriptors` (خطة المشروع الثاني — عينة المسارات).

---

## 8. التحقق من المدخلات ورسائل الأخطاء

- **مكان الكتابة:** FormRequests في Laravel + ملفات لغة عربية (`lang/ar`) — لا رسائل في المتحكمات ولا في الواجهة. الواجهة تعرض رسائل الخادم كما وردت في `errors` (§3) **[اقتراح]**.
- أمثلة قواعد ملزمة من الوثائق:

| القاعدة | الرسالة العربية | المصدر |
|---|---|---|
| التقدير ضمن 0–3 | «قيمة التقدير يجب أن تكون بين 0 و 3.» | 3.10.8 |
| نهاية بعد بداية (الدورة/الخطة/الإجراء) | «تاريخ النهاية يجب أن يكون بعد تاريخ البداية.» | [اقتراح] صياغةً — المبدأ من منطق الفترات |
| إلزامية أحد المصدرين لمجال التحسين | «يجب تحديد مصدر المجال: نتيجة تقييم أو مؤشر.» | 3.10.8 (CHECK) |
| المرفق بنوع غير مسموح | «نوع الملف غير مسموح.» | NFR-PER-02 |

- التحقق مزدوج **حيثما أمكن**: قيد في قاعدة البيانات + تحقق في الطلب/الخدمة برسالة عربية. القيود العابرة للجداول والمراجع متعددة الأشكال (المرفقات، الإشعارات، مصادر المجالات) تفرضها طبقة التطبيق وحدها وتغطيها اختبارات صريحة (خطة المشروع الثاني — المرحلة 3).

---

## 9. المصادقة والجلسات والأدوار والنطاق

| البند | القاعدة | المصدر |
|---|---|---|
| المصادقة | رموز Sanctum عبر `POST /api/v1/auth/login` باسم المستخدم وكلمة المرور | [اقتراح] (خطة المشروع الثاني) |
| تخزين كلمة المرور | `password_hash` بتجزئة آمنة — لا نص صريح ولا قابل للاسترجاع | NFR-SEC-02 |
| الجلسة | تُنهى تلقائيًا بعد **30 دقيقة خمول** — تُنفذ بوسيط يتتبع آخر نشاط ويُحدث جدول `sessions` | FR-GEN-02 |
| وظيفة جدول `sessions` | **سجل الجلسات الوظيفية** (البداية/النهاية/النشاط). رموز الدخول يصدرها Sanctum في جدوله الخاص (`personal_access_tokens`)، وعمود `session_token` يخزن **بصمة تجزئة** للرمز لربط السجل بالآلية — لا يخزن الرمز الصالح نصًا **[اقتراح]** | قاموس البيانات + [اقتراح] |
| قاعدة الجهة الواحدة | `user_type` يحدد جهة واحدة: مدرسة **أو** وزارة، ومسؤول النظام بلا جهة — لا جمع إطلاقًا | 3.10.8 |
| الأدوار | نظام RBAC بجداول القاموس (roles/permissions/...) — **خاص، لا حزمة spatie** (مخططها لا يطابق تصميمنا) | قاموس البيانات + قرار المراجعة |
| صيغة `permission_code` | **نمط تسمية** `<المورد-جمع>.<فعل>` — قائمة الأفعال الفعلية تُستخرج من حالات الاستخدام عند بناء مصفوفة الصلاحيات (Seed) ولا تُغلق مسبقًا. أمثلة توضيحية فقط: `evaluations.create` (من القاموس)، `submissions.submit` (يوحي به FR-SCH-33) | القاموس (المثال الأول) — النمط [اقتراح] |
| عزل النطاق | مستخدم المدرسة لا يرى إلا بيانات مدرسته. **المستوى الوزاري يرى المدارس المرتبطة بالمنصة كلها** — لا يوجد في التصميم تقسيم نطاق فرعي للمشرفين (لا جدول ربط مشرف↔مدارس في ERD-0)؛ إن أُريد نطاق جغرافي (محافظة/مديرية) فهو قرار مفتوح §14-8 | NFR-SEC-03 + ERD-0 + FR-SUP-03 («من أي مدرسة») |
| الإرسال النهائي | للمستخدم المخول دون سواه | FR-SCH-33 |
| إعادة إسناد دور | تحديث الصف نفسه في `user_roles` (active=true، revoked_at=NULL) — لا صف جديد | قاموس البيانات — قيد الجدول |

---

## 10. رفع الملفات والمرفقات

| البند | القاعدة | المصدر |
|---|---|---|
| التحقق من النوع | النوع الفعلي (MIME) لا الامتداد فقط | NFR-PER-02 |
| قائمة السماح | معلنة — محتواها المقترح: `pdf, png, jpg, jpeg, docx, xlsx` | NFR-PER-02 (المبدأ) + **[اقتراح]** للمحتوى — §14-2 |
| الحجم الأقصى | حد معلن — مقترح 10MB قابل للضبط | NFR-PER-02 («حدود يحددها النظام») + **[اقتراح]** |
| التخزين | خارج مسار التنفيذ (خارج public) عبر `storage_uri` | NFR-PER-02 + قاموس البيانات |
| اسم الملف على القرص | عشوائي (UUID)؛ الاسم الأصلي محفوظ في `file_name` | **[اقتراح]** |
| ربط المرفق بهدفه | `target_type` + `target_id` (`evidence_version` \| `report`) — يُفرض في طبقة التطبيق + فهرس مركب | 3.10.8 + قاموس البيانات |

---

## 11. الذكاء الاصطناعي

| القاعدة | النص الحاكم | المصدر |
|---|---|---|
| حدود الدور | تحليل النتائج والملاحظات وإبراز المجالات واقتراح توصيات ومسودات — لا ينشئ معايير، لا يعدل المعايير أو التقديرات الرسمية، لا يصدر أحكام اعتماد | BR-AI-01 |
| المراجعة البشرية | كل المخرجات تخضع للمراجعة والحكم المهني قبل الاعتماد أو الاستخدام في الخطط الرسمية | BR-AI-02 |
| الخصوصية | لا تُرسل بيانات تعريفية للمدارس أو الأفراد خارج حدود المنصة + تنويه دائم بأن المخرجات مقترحات | BR-AI-02 (الجملة المضافة) |
| ما يكتب فيه الذكاء | جدولا `ai_analysis` و`ai_recommendations` فقط — لا يكتب في أي جدول رسمي | 3.10.8 + قاموس البيانات |
| التعديلات البشرية | عند تعديل التوصية يُحفظ النص في `human_modifications` | 3.10.8 |
| حالات التوصية | `PendingReview` \| `Accepted` \| `Modified` \| `Ignored` | قاموس البيانات |
| التنفيذ | طلب التحليل يدخل طابور Jobs — لا يحجب الاستجابة | خطة المشروع الثاني — المرحلة 6 |
| وضع Mock أولًا | تطوير واختبار وعرض بمخرجات نموذجية قبل تفعيل مزود حقيقي | خطة المشروع الثاني — المرحلة 6 **[اقتراح]** |

**شكل مخرجات النموذج المطلوب (JSON)** **[اقتراح]**:

```json
{
  "summary": "ملخص نصي عام للأداء",
  "strengths":   [ { "title": "...", "description": "..." } ],
  "improvements":[ { "title": "...", "description": "...", "priority": "Medium" } ],
  "recommendations": [ { "type": "recommendation", "title": "...", "description": "...", "priority": "High" } ]
}
```

**ربط المخرجات بالجداول (القاموس):** `summary` → `ai_analysis.summary`؛ كل عنصر في `strengths` → صف توصية `type=strength`؛ `improvements` → `type=improvement`؛ `recommendations` → `type=recommendation`؛ ومسودات الخطط `type=draft` تُطلب منفصلة وفق FR-AI-04. جميعها يُحفظ بحالة `PendingReview` — بلا أي كتابة في الجداول الرسمية.

---

## 12. ملاحظات تنفيذ Laravel الخاصة بتصميمنا

| # | الملاحظة | القرار |
|---|---|---|
| 1 | مفاتيح أساسية مخصصة (`role_id` لا `id`) | `protected $primaryKey = 'role_id';` في كل Model + `$table->id('role_id')` في الـMigration ليتطابق النوع مع `foreignId()` |
| 2 | الطوابع الزمنية تختلف بين الجداول حقلًا بحقل | الحالة الدقيقة لكل Model من الأربعين في **الملحق أ** أدناه: افتراضي / إيقاف `UPDATED_AT` / إيقاف `CREATED_AT` / `$timestamps = false` |
| 3 | المفاتيح المركبة (Eloquent لا يدعمها) | `role_permissions`, `user_roles`, `cycle_participations`, `plan_improvement_areas`: تعامل معها كـ `belongsToMany` (مع `using`/pivot models عند الحاجة لأعمدة إضافية) |
| 4 | جدول `sessions` الخاص بنا | تعارض اسمي مع جدول Laravel — `SESSION_DRIVER=file` دائمًا (لا نستخدم قاعدة بيانات لجلسات الإطار)؛ جدولنا سجل الجلسات الوظيفية كما في §9 |
| 5 | `password_hash` و`username` | تخصيص `getAuthPassword()` ومحاولة الدخول بحقل `username` — لا نغير أسماء القاموس |
| 6 | قيود CHECK | MySQL 8.0.16+ ينفذها فعليًا: شرط `submitted_at` مع Draft، مصادر مجالات التحسين، أهداف بنود الاستكمال — وتُفرض ثانيًا في الخدمة برسالة عربية (التحقق المزدوج حيثما أمكن — §8) |
| 7 | المرفقات والإشعارات متعددة الأهداف | لا FK قاعدة بيانات — فرض في طبقة التطبيق + فهرس مركب على العمودين |
| 8 | جدول `notifications` | خاص بنا — لا نفعّل قناة إشعارات Laravel الجاهزة (database) ولا `Notifiable` |
| 9 | RBAC | نظام خاص بسيط بجداول القاموس — لا spatie (مخططها لا يطابق `role_name`...) |
| 10 | الحذف | حالات عدم الحذف الموثقة بمصدرها: **الإشعارات** سجل دائم (FR-GEN-05)، **نسخ الشواهد السابقة** لا تُحذف عند الاستبدال (3.10.8). ما عدا ذلك: سياسة «تعطيل لا حذف» مقترحة كسياسة عامة — قرار مفتوح §14-7 **[اقتراح]** |


### الملحق أ — الطوابع الزمنية لكل Model (الأربعون كاملة)

المصدر: قاموس البيانات، حقلًا بحقل. خريطة الإعدارات:

| الإعداد في Laravel | الحالة |
|---|---|
| افتراضي (لا شيء) | الحقلان `created_at` و`updated_at` موجودان |
| `const UPDATED_AT = null` | `created_at` فقط |
| `const CREATED_AT = null` | `updated_at` فقط |
| `public $timestamps = false` | لا يوجد أي منهما (الحقول الخاصة مثل `assigned_at` تُدار يدويًا) |

| الجدول | Model | created_at | updated_at | الإعداد |
|---|---|---|---|---|
| roles | Role | — | — | `$timestamps = false` |
| permissions | Permission | — | — | `$timestamps = false` |
| role_permissions | RolePermission | — | — | `$timestamps = false` |
| schools | School | — | — | `$timestamps = false` |
| ministries | Ministry | — | — | `$timestamps = false` |
| users | User | ✓ | ✓ | افتراضي |
| user_roles | UserRole | — | — | `$timestamps = false` |
| sessions | Session | ✓ | ✓ | افتراضي |
| standard_versions | StandardVersion | ✓ | ✓ | افتراضي |
| standards | Standard | ✓ | ✓ | افتراضي |
| sub_standards | SubStandard | ✓ | ✓ | افتراضي |
| indicators | Indicator | ✓ | ✓ | افتراضي |
| score_levels | ScoreLevel | — | — | `$timestamps = false` |
| indicator_score_descriptors | IndicatorScoreDescriptor | — | — | `$timestamps = false` |
| indicator_evidence_requirements | IndicatorEvidenceRequirement | — | — | `$timestamps = false` |
| verification_tools | VerificationTool | ✓ | ✓ | افتراضي |
| indicator_verification_methods | IndicatorVerificationMethod | ✓ | — | `UPDATED_AT = null` |
| evaluation_cycles | EvaluationCycle | ✓ | ✓ | افتراضي |
| cycle_participations | CycleParticipation | ✓ | ✓ | افتراضي |
| evaluations | Evaluation | ✓ | ✓ | افتراضي |
| evaluation_results | EvaluationResult | ✓ | ✓ | افتراضي |
| evidences | Evidence | ✓ | ✓ | افتراضي |
| evidence_versions | EvidenceVersion | ✓ | ✓ | افتراضي |
| attachments | Attachment | ✓ | ✓ | افتراضي |
| notes | Note | ✓ | ✓ | افتراضي |
| evaluation_result_verification_methods | EvaluationResultVerificationMethod | — | — | `$timestamps = false` |
| improvement_areas | ImprovementArea | ✓ | ✓ | افتراضي |
| improvement_plans | ImprovementPlan | ✓ | ✓ | افتراضي |
| plan_improvement_areas | PlanImprovementArea | ✓ | — | `UPDATED_AT = null` |
| improvement_actions | ImprovementAction | ✓ | ✓ | افتراضي |
| reports | Report | — | ✓ | `CREATED_AT = null` (+`generated_at` يدوي) |
| evaluation_submissions | EvaluationSubmission | — | ✓ | `CREATED_AT = null` (+`submitted_at` يدوي) |
| internal_review_notes | InternalReviewNote | ✓ | ✓ | افتراضي |
| plan_review_notes | PlanReviewNote | ✓ | ✓ | افتراضي |
| supervisor_notes | SupervisorNote | ✓ | ✓ | افتراضي |
| completion_requests | CompletionRequest | ✓ | ✓ | افتراضي (+`resolved_at` يدوي) |
| completion_request_items | CompletionRequestItem | ✓ | ✓ | افتراضي |
| notifications | Notification | ✓ | — | `UPDATED_AT = null` (+`read_at` يدوي) |
| ai_analysis | AiAnalysis | ✓ | ✓ | افتراضي |
| ai_recommendations | AiRecommendation | ✓ | ✓ | افتراضي |

---

## 13. اتفاقيات Git **[اقتراح — كامل القسم]**

| البند | القاعدة |
|---|---|
| المستودعات | اثنان: `school-eval-api` و`school-eval-web` + مجلد `docs/` مشترك في مستودع الـAPI |
| الفروع | `main` محمي (لا دفع مباشر) — عمل على `feature/<module>-<وصف>` و`fix/<وصف>` |
| رسائل الـCommits | Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:` + نطاق اختياري — مثال: `feat(api): مسارات الإطار المرجعي مع الاختبارات` |
| الدمج | عبر Pull Request بعد نجاح الاختبارات ومراجعة ذاتية مكتوبة بسطرين |
| الوسم | `v0.x` عند كل معلم مكتمل (خريطة معالم الخطة) |

---

## 14. القرارات المفتوحة والتعارضات الموثقة

### أ) قرارات تنتظر حسمك

| # | القرار | اقتراحي الحالي |
|---|---|---|
| 1 | صيغة حقول النقل (JSON ومعاملات الاستعلام): camelCase أم snake_case؟ | camelCase في النقل، snake_case في القاعدة — التحويل في Resources/Requests |
| 2 | محتوى قائمة السماح للمرفقات والحجم الأقصى | pdf/png/jpg/jpeg/docx/xlsx — و10MB قابلة للضبط |
| 3 | نمط التواريخ | المقترح محدد وواضح في §6: تخزين UTC ← إرسال ISO 8601 بصيغة `Z` ← تحويل العرض في الواجهة (+03:00 افتراضيًا) — ينتظر تأكيدك |
| 4 | النسخة البريدية للإشعارات («اختيارية» في FR-GEN-05) | تأجيلها لما بعد التسليم — القناة الداخلية والسجل الدائم إلزاميان الآن |
| 5 | مزود الذكاء الاصطناعي وموعد التبديل من Mock | Mock حتى اكتمال الوحدات ثم قرار المزود |
| 6 | تذكير مهلة المراجعة (FR-SUP-11: «يُستحسن ألا تتجاوز 10 أيام عمل») | تنفيذها لأنها بند واحد (Job يومي + إشعار) — لكنها «يُستحسن» لا «يجب» |
| 7 | سياسة الحذف العامة (تعطيل لا حذف) | اعتمادها رسميًا كسياسة — عدا الجداول المذكورة في §12-10 بمصادرها |
| 8 | نطاق المشرف الوزاري: التصميم الحالي بلا تقسيم فرعي (المشرف يرى كل المدارس المرتبطة — FR-SUP-03) | الإبقاء على الوضع الحالي؛ إن أُريد نطاق جغرافي فهو يتطلب جدول ربط جديد وتعديلًا في التصميم والقاموس |

### ب) تعارضات موثقة بين الوثائق (لا تُحل بصمت)

| # | التعارض | الوضع |
|---|---|---|
| 1 | **FR-SUP-16 مقابل جدول supervisor_notes:** المتطلب يقول «مرتبطًا بمدرسة محددة أو مخرج محدد أو طلب استكمال محدد» بينما الجدول مربوط بالمخرج وحده (`submission_id`) | قرارك السابق: تركه دون تعديل (ف-11). يبقى النص والتصميم غير متطابقين — يُحسم إما بتعديل نص المتطلب أو بإضافة العمودين لاحقًا |
| 2 | **أشكال ERD-03/04/05 وERD-00 مقابل نص 3.10.8 وERD-0 المفصل:** التعديلات الستة (cycle_participations، school_id في evaluations، المرفقات متعددة الأهداف، indicator_id للمجالات، evidence_id لبنود الاستكمال) قد لا تكون منعكسة في الأشكال المصيَّرة | موثقة في ملف ERD-0 (قسم المزامنة) — يجب حسمها قبل مناقشة المشروع الأول |

### ج) توضيح ليس تعارضًا

- `reports.status = Draft` و`evaluation_submissions.status = Draft` دلالتان مختلفتان لا تتعارضان: الأولى حالة **توليد التقرير** والثانية حالة **مخرج التقييم** المنصوصة في 3.10.8 (قاموس البيانات).

---

*نهاية الملف — أي إضافة تعديلًا على هذا الملف تتم بـ commit من نوع `docs:` مع ذكر القسم.*
