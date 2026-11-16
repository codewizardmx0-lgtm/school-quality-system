# توثيق نقاط نهاية المصادقة والصلاحيات والعزل المؤسسي (Authentication & Authorization API)

**منصة التقييم الذاتي والتحسين المدرسي**  
**الإصدار:** v1 — أكتوبر 2026  
**المرجعية:** الفصل الرابع (التصميم المعماري)، اتفاقيات `conventions.md`، وقاموس البيانات.

---

## 1. نظرة عامة والقرارات المعمارية

تعتمد طبقة المصادقة والتحكم بالوصول في واجهة برمجة التطبيقات (API) على المعايير التالية:
- **نوع المصادقة:** رموز الوصول الشخصية `Bearer Tokens` عبر حزمة `Laravel Sanctum` في بيئة معمارية منفصلة تمامًا (Stateless REST API مع عميل React مستقل).
- **مغلف الاستجابة الموحد (JSON Envelope):** تلتزم كافة نقاط النهاية بنمط الاستجابة الرباعي الإلزامي:
  ```json
  {
    "data": null,
    "message": "رسالة توضيحية بالعربية أو null",
    "errors": null,
    "meta": null
  }
  ```
- **حقول JSON:** تعتمد أسلوب `camelCase` في الطلب والاستجابة، بينما تُخزن البيانات داخليًا بأسلوب `snake_case`.
- **صيغة التواريخ:** كافة الطوابع الزمنية تتبع معيار UTC ISO-8601 المنتهي بالحرف `Z` (مثال: `2026-10-16T22:30:00Z`).
- **إدارة الجلسات التشغيلية وفرض الخمول (FR-GEN-02 والقرار 14):**
  - جدول `sessions` هو جدول سجل الأعمال التشغيلي والتدقيق الزمني.
  - يُطبق وسيط `EnforceSessionTimeout` مهلة خمول مدتها 30 دقيقة؛ يتم تمديدها عند كل طلب ناجح، وفي حال انقضائها دون نشاط، تُغلق الجلسة ويُلغى رمز الوصول تلقائيًا ويُرجع الخطأ `401 Unauthorized`.
- **العزل المؤسسي بين المدارس (Multi-tenant School Isolation والقرار 9):**
  - مستخدم المدرسة (مدير أو مسؤول تقييم) يقتصر وصوله على بيانات مدرسته فقط.
  - محاولة طلب بيانات مدرسة أخرى تُرجع رمز الحالة `404 Not Found` عمدًا (Obfuscation) لمنع استكشاف وجود المعرفات في النظام.

---

## 2. الترويسات المشتركة (Headers)

### الطلبات العامة (Public Requests)
```http
Accept: application/json
Content-Type: application/json
```

### الطلبات المحمية (Protected Requests)
```http
Accept: application/json
Content-Type: application/json
Authorization: Bearer <plainTextToken>
```

---

## 3. نقاط النهاية (Endpoints Catalog)

### 3.1 تسجيل الدخول (Login)

- **المسار:** `POST /api/v1/auth/login`
- **الحماية:** عام (Public)
- **الوصف:** التحقق من اسم المستخدم وكلمة المرور المشفرة (`password_hash`)، والتحقق من حالة الحساب (`Active`)، وإصدار رمز وصول Sanctum، وتسجيل جلسة نشطة في جدول `sessions` وإغلاق أي جلسات سابقة.

#### طلب تسجيل الدخول (Request Body):
```json
{
  "username": "quality_belqees",
  "password": "ChangeMeDevPassword@2026"
}
```

#### قواعد التحقق:
- `username`: مطلوب، نص، بحد أقصى 50 حرفًا.
- `password`: مطلوب، نص، بحد أدنى 8 أحرف.

#### استجابة النجاح (200 OK):
```json
{
  "data": {
    "token": "1|YUxhIw7qFuKplUEDSBNGHoNgfmsiSMRDxQzXELyN981095ad",
    "tokenType": "Bearer",
    "sessionId": 1,
    "user": {
      "userId": 3,
      "schoolId": 1,
      "ministryId": null,
      "username": "quality_belqees",
      "fullName": "مسؤول تقييم تجريبي 1 — مدرسة بلقيس",
      "email": "quality@belqees.edu.ye",
      "userType": "school",
      "status": "Active",
      "school": {
        "schoolId": 1,
        "schoolName": "مدرسة بلقيس الثانوية للبنات",
        "status": "Active"
      },
      "ministry": null,
      "roles": [
        {
          "roleId": 6,
          "roleName": "school_evaluator",
          "description": "مقيّم ومسؤول الجودة بالمدرسة - تنفيذ التقييمات الذاتية وإدارة الشواهد وخطط التحسين وتوليد التقارير"
        }
      ],
      "permissions": [
        "standards.view",
        "evaluations.create",
        "evaluations.view",
        "evaluations.edit",
        "evaluations.submit",
        "reports.generate",
        "reports.view",
        "plans.manage",
        "plans.view",
        "evidence.manage",
        "ai.use"
      ],
      "createdAt": "2026-10-16T01:13:13Z",
      "updatedAt": "2026-10-16T14:20:40Z"
    }
  },
  "message": "تم تسجيل الدخول بنجاح.",
  "errors": null,
  "meta": null
}
```

#### استجابات الأخطاء المحتملة:
- **422 Unprocessable Content (فشل التحقق من صحة المدخلات):**
```json
{
  "data": null,
  "message": "البيانات المدخلة غير صالحة.",
  "errors": {
    "username": [
      "حقل اسم المستخدم مطلوب."
    ],
    "password": [
      "يجب ألا يقل طول كلمة المرور عن 8 أحرف."
    ]
  },
  "meta": null
}
```
- **401 Unauthorized (بيانات الدخول غير صحيحة):**
```json
{
  "data": null,
  "message": "بيانات الدخول غير صحيحة.",
  "errors": null,
  "meta": null
}
```
- **401 Unauthorized (حساب معطل Disabled):**
```json
{
  "data": null,
  "message": "الحساب معطل. يرجى التواصل مع مسؤول النظام.",
  "errors": null,
  "meta": null
}
```

---

### 3.2 تسجيل الخروج (Logout)

- **المسار:** `POST /api/v1/auth/logout`
- **الحماية:** محمي (`auth:sanctum`, `session.timeout`)
- **الوصف:** إلغاء وحذف رمز الوصول الحالي من جدول `personal_access_tokens`، وإنهاء الجلسة الوظيفية المرتبطة به في جدول `sessions` وتعيين `ended_at = now()` و `active = false`.

#### استجابة النجاح (200 OK):
```json
{
  "data": null,
  "message": "تم تسجيل الخروج بنجاح.",
  "errors": null,
  "meta": null
}
```

---

### 3.3 استعلام بيانات المستخدم الحالي والمصادق (Current Authenticated User)

- **المسار:** `GET /api/v1/auth/me`
- **الحماية:** محمي (`auth:sanctum`, `session.timeout`)
- **الوصف:** استرجاع بيانات المستخدم الحالي مع أدواره وقائمة صلاحياته الممنوحة له والمؤسسة المرتبط بها (مدرسة أو جهة إشرافية).

#### استجابة النجاح (200 OK):
```json
{
  "data": {
    "userId": 3,
    "schoolId": 1,
    "ministryId": null,
    "username": "quality_belqees",
    "fullName": "مسؤول تقييم تجريبي 1 — مدرسة بلقيس",
    "email": "quality@belqees.edu.ye",
    "userType": "school",
    "status": "Active",
    "school": {
      "schoolId": 1,
      "schoolName": "مدرسة بلقيس الثانوية للبنات",
      "status": "Active"
    },
    "ministry": null,
    "roles": [
      {
        "roleId": 6,
        "roleName": "school_evaluator",
        "description": "مقيّم ومسؤول الجودة بالمدرسة - تنفيذ التقييمات الذاتية وإدارة الشواهد وخطط التحسين وتوليد التقارير"
      }
    ],
    "permissions": [
      "standards.view",
      "evaluations.create",
      "evaluations.view",
      "evaluations.edit",
      "evaluations.submit",
      "reports.generate",
      "reports.view",
      "plans.manage",
      "plans.view",
      "evidence.manage",
      "ai.use"
    ],
    "createdAt": "2026-10-16T01:13:13Z",
    "updatedAt": "2026-10-16T14:20:40Z"
  },
  "message": null,
  "errors": null,
  "meta": null
}
```

#### استجابات الأخطاء عند الخمول أو عدم الصلاحية:
- **401 Unauthorized (عند انقضاء مهلة الخمول 30 دقيقة):**
```json
{
  "data": null,
  "message": "انتهت الجلسة لعدم النشاط. يجب تسجيل الدخول للمتابعة.",
  "errors": null,
  "meta": null
}
```
- **401 Unauthorized (رمز غير صالح أو تم إلغاؤه):**
```json
{
  "data": null,
  "message": "يجب تسجيل الدخول للمتابعة.",
  "errors": null,
  "meta": null
}
```

---

### 3.4 تغيير كلمة المرور للمستخدم المسجل (Change Password - U-40)

- **المسار:** `POST /api/v1/auth/password/change`
- **الحماية:** محمي (`auth:sanctum`, `session.timeout`)
- **الوصف:** تغيير كلمة المرور للمستخدم المسجل الحالي مع فرض الضوابط الأمنية التالية:
  1. التحقق الإلزامي من صحة كلمة المرور الحالية للمستخدم (`current_password`).
  2. التحقق من أن كلمة المرور الجديدة تفي بالحد الأدنى للأمان (8 أحرف على الأقل، ومطابقة للتأكيد `new_password_confirmation`).
  3. حظر استخدام كلمة المرور القديمة نفسها ككلمة مرور جديدة.
  4. إبطال وحذف كافة رموز الوصول الأخرى السابقة للمستخدم في `personal_access_tokens` عدا رمز الجلسة الحالية لضمان إخراج أي جلسات مسروقة أو غير مصرح بها.
  5. تدوين عملية تغيير كلمة المرور في سجل التدقيق (`auth.password_changed`).

#### جسم الطلب (Request Body):
```json
{
  "current_password": "ChangeMeDevPassword@2026",
  "new_password": "NewStrongSecurePassword@2026",
  "new_password_confirmation": "NewStrongSecurePassword@2026"
}
```

#### استجابة النجاح (200 OK):
```json
{
  "data": {
    "userId": 3,
    "username": "quality_belqees",
    "passwordChangedAt": "2026-11-03T20:00:00Z"
  },
  "message": "تم تغيير كلمة المرور بنجاح وإلغاء صلاحية الجلسات الأخرى.",
  "errors": null,
  "meta": null
}
```

#### استجابات الأخطاء المحتملة:
- **422 Unprocessable Content (كلمة المرور الحالية غير صحيحة):**
```json
{
  "data": null,
  "message": "كلمة المرور الحالية غير صحيحة.",
  "errors": {
    "current_password": [
      "كلمة المرور الحالية غير صحيحة."
    ]
  },
  "meta": null
}
```
- **422 Unprocessable Content (تطابق كلمة المرور الجديدة مع القديمة):**
```json
{
  "data": null,
  "message": "البيانات المدخلة غير صالحة.",
  "errors": {
    "new_password": [
      "يجب أن تكون كلمة المرور الجديدة مختلفة عن كلمة المرور الحالية."
    ]
  },
  "meta": null
}
```

---

### 3.5 استعراض سجل التدقيق غير القابل للتعديل (Audit Logs - U-08)

- **المسار:** `GET /api/v1/audit-logs`
- **الحماية:** محمي (`auth:sanctum`, `session.timeout`)
- **الصلاحية المطلوبة:** مسؤول النظام (`admin`) أو المشرف الوزاري (`ministry_supervisor`) حصرًا. يُمنع مدير المدرسة ومقيم المدرسة تمامًا (`403 Forbidden`).
- **الوصف:** استعراض وقائع سجل التدقيق غير القابل للتعديل أو الحذف (`audit_logs`) والذي يوثق 12 حدثاً تشغيلياً وأمنياً وتقييمياً في النظام:
  - أحداث المصادقة: `auth.login_success`, `auth.login_failed`, `auth.logout`, `auth.password_changed`.
  - أحداث التقييم: `evaluation.scored`, `evaluation.submitted`, `evaluation.direct_closed`.
  - أحداث الاستكمال: `completion.created`, `completion.deadline_extended`, `completion.resubmitted`, `completion.closed`.
  - أحداث الشواهد: `evidence.unlinked`.
- **محددات الخصوصية:** لا تُسجل كلمات المرور أو الرموز السرية أو البيانات الحساسة إطلاقاً في `old_values` أو `new_values`.

#### معاملات الاستعلام (Query Parameters):
| المعامل | النوع | الوصف |
|---|---|---|
| `school_id` | رقم | فلترة السجل لمدرسة محددة (متاح للمشرف ومسؤول النظام) |
| `action` | نص | فلترة بنوع العملية المحددة (مثل `evaluation.submitted`) |
| `user_id` | رقم | فلترة بالمستخدم الفاعل |
| `date_from` | تاريخ | بداية النطاق الزمني |
| `date_to` | تاريخ | نهاية النطاق الزمني |
| `per_page` | رقم | عدد السجلات في الصفحة (افتراضي 25) |

#### استجابة النجاح (200 OK):
```json
{
  "data": [
    {
      "logId": 89,
      "userId": 3,
      "schoolId": 1,
      "action": "auth.password_changed",
      "targetType": "User",
      "targetId": 3,
      "oldValues": null,
      "newValues": null,
      "ipAddress": "127.0.0.1",
      "userAgent": "Mozilla/5.0 ...",
      "createdAt": "2026-11-03T20:00:00Z",
      "user": {
        "userId": 3,
        "fullName": "مسؤول تقييم مدرسة بلقيس",
        "username": "quality_belqees"
      },
      "school": {
        "schoolId": 1,
        "schoolName": "مدرسة بلقيس الثانوية للبنات"
      }
    }
  ],
  "message": "تم استرجاع سجل التدقيق بنجاح.",
  "errors": null,
  "meta": {
    "currentPage": 1,
    "lastPage": 4,
    "total": 89
  }
}
```

#### استجابة حظر مدرسة من استعراض التدقيق (403 Forbidden):
```json
{
  "data": null,
  "message": "غير مصرح لك باستعراض سجل التدقيق. هذه الصلاحية مقصورة على مسؤول النظام والمشرف الوزاري.",
  "errors": null,
  "meta": null
}
```

---

### 3.6 استعراض المدارس (Schools Index)

- **المسار:** `GET /api/v1/schools`
- **الحماية:** محمي (`auth:sanctum`, `session.timeout`, `SchoolPolicy::viewAny`)
- **الوصف:** استعراض المدارس وفق قواعد العزل المؤسسي:
  - مستخدمو الوزارة والنظام يتاح لهم استعراض جميع المدارس الفعالة.
  - مستخدم المدرسة (مدير أو مقيم) يُقيد استعلامه تلقائيًا ليعيد مدرسته فقط.

#### استجابة النجاح لمستخدم مدرسة (200 OK):
```json
{
  "data": [
    {
      "schoolId": 1,
      "schoolName": "مدرسة بلقيس الثانوية للبنات",
      "educationalStage": "ثانوي",
      "identificationData": "SCH-SANAA-2026-001",
      "educationalDistrict": "منطقة التحرير التعليمية",
      "governorate": "أمانة العاصمة - صنعاء",
      "status": "Active"
    }
  ],
  "message": null,
  "errors": null,
  "meta": null
}
```

---

### 3.7 استعراض تفاصيل مدرسة محددة (Show School With Tenant Isolation)

- **المسار:** `GET /api/v1/schools/{id}`
- **الحماية:** محمي (`auth:sanctum`, `session.timeout`, `SchoolPolicy::view`)
- **الوصف:** جلب تفاصيل مدرسة بالمعرف:
  - إذا كان المستخدم ينتمي إلى نفس المدرسة: يُرجع تفاصيل المدرسة بـ 200 OK.
  - إذا كان المستخدم ينتمي إلى مدرسة أخرى: يُرجع `404 Not Found` عمدًا لحجب وجود المدرسة ومنع استكشاف البيانات عبر الثغرات التخمينية (القرار 9).
  - إذا كان المستخدم من الوزارة أو النظام: يُسمح بالوصول المباشر.

#### استجابة محاولة الوصول لمدرسة أخرى (404 Not Found):
```json
{
  "data": null,
  "message": "المدرسة المطلوبة غير موجودة.",
  "errors": null,
  "meta": null
}
```

---


### 3.4 طلب استعادة كلمة المرور (Forgot Password - G-05)

- **المسار:** `POST /api/v1/auth/password/forgot`
- **الحماية:** عام (Public)
- **الوصف:** استلام البريد الإلكتروني للمستخدم، وتوليد رمز تحقق آمن ومؤقت بصلاحية 60 دقيقة في جدول `password_reset_tokens`.

#### جسم الطلب (Request Body):
```json
{
  "email": "quality@belqees.edu.ye"
}
```

#### استجابة النجاح (200 OK):
```json
{
  "success": true,
  "message": "تم إرسال تعليمات ورمز استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح.",
  "data": {
    "email": "quality@belqees.edu.ye"
  }
}
```

---

### 3.5 إعادة تعيين كلمة المرور (Reset Password - G-05)

- **المسار:** `POST /api/v1/auth/password/reset`
- **الحماية:** عام (Public)
- **الوصف:** التحقق من مطابقة الرمز والبريد وصلاحيته الزمنية، وتحديث كلمة المرور المشفرة للمستخدم، وإبطال التوكن المستخدم والجلسات السابقة.

#### جسم الطلب (Request Body):
```json
{
  "email": "quality@belqees.edu.ye",
  "token": "a1b2c3d4e5f6...",
  "password": "NewStrongPassword@2026",
  "password_confirmation": "NewStrongPassword@2026"
}
```

#### استجابة النجاح (200 OK):
```json
{
  "success": true,
  "message": "تمت إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
  "data": null
}
```

## 4. مصفوفة الصلاحيات والأدوار الخمسة الرسمية (19 صلاحية قانونية و27 ربطًا)

تطابق مصفوفة الصلاحيات في النظام مصفوفة الفصل الرابع (القسم 4.5.3) بصورة قطعية:

| # | كود الصلاحية (Permission Code) | الوصف العربي | `admin` | `school_evaluator` | `school_principal` | `ministry_supervisor` | `ministry_standards_manager` |
|---|---|---|:---:|:---:|:---:|:---:|:---:|
| 1 | `standards.view` | عرض المعايير والمؤشرات | | ✓ | ✓ | ✓ | ✓ |
| 2 | `standards.manage` | إدارة المعايير والمؤشرات | | | | | ✓ |
| 3 | `cycles.launch` | إطلاق دورات التقييم | | | | ✓ | |
| 4 | `evaluations.create` | إنشاء تقييم مدرسي | | ✓ | | | |
| 5 | `evaluations.view` | عرض التقييمات | | ✓ | ✓ | ✓ | |
| 6 | `evaluations.edit` | رصد وتعديل نتائج التقييم | | ✓ | | | |
| 7 | `evaluations.submit` | تسليم التقييم الذاتي النهائي | | ✓ | | | |
| 8 | `evidence.manage` | إدارة الشواهد والأدلة | | ✓ | | | |
| 9 | `reports.generate` | توليد تقارير التقييم | | ✓ | | | |
| 10 | `reports.view` | عرض التقارير | | ✓ | ✓ | ✓ | |
| 11 | `plans.manage` | إدارة خطط التحسين | | ✓ | | | |
| 12 | `plans.view` | عرض خطط التحسين | | ✓ | ✓ | | |
| 13 | `reviews.write` | تدوين المراجعات الداخلية | | | ✓ | | |
| 14 | `supervision.review` | مراجعة وتقييم المشرف | | | | ✓ | |
| 15 | `completion.request` | إصدار طلبات استكمال | | | | ✓ | |
| 16 | `ai.use` | استخدام أدوات الذكاء الاصطناعي | | ✓ | | | |
| 17 | `analytics.view` | عرض التحليلات والإحصاءات | | | | ✓ | |
| 18 | `users.manage` | إدارة المستخدمين | ✓ | | | | |
| 19 | `schools.manage` | إدارة المدارس | ✓ | | | | |
| **المجموع** | **19 صلاحية** | **27 ربطًا إجماليًا** | **2** | **11** | **5** | **7** | **2** |

---

## 5. أمثلة الاختبار اليدوي عبر cURL

### أ. تسجيل دخول مسؤول تقييم مدرسة بلقيس:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"quality_belqees\",\"password\":\"ChangeMeDevPassword@2026\"}"
```

### ب. استعلام بيانات المستخدم الحالي `/me`:
```bash
curl -X GET http://127.0.0.1:8000/api/v1/auth/me \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <TOKEN>"
```

### ج. طلب استعراض قائمة المدارس (يقتصر على مدرسة المستخدم فقط):
```bash
curl -X GET http://127.0.0.1:8000/api/v1/schools \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <TOKEN>"
```

### د. تجربة العزل المؤسسي (طلب مدرسة الفاروق بالمعرف 2 لمستخدم مدرسة بلقيس بالمعرف 1):
```bash
curl -i -X GET http://127.0.0.1:8000/api/v1/schools/2 \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <TOKEN>"
```
*النتيجة الفعلية:* `HTTP/1.1 404 Not Found` مع رسالة «المدرسة المطلوبة غير موجودة.».

### هـ. تسجيل الخروج:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/logout \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <TOKEN>"
```
