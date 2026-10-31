# الشريحة 10: إدارة دورات التقييم، بدء ملفات التقييم الذاتي، ومنظومة الإشعارات واستعادة الحسابات
## Slice 10: Evaluation Cycles Management, Evaluation Initiation, In-App Notifications & Password Recovery

---

### 1. ملخص الشريحة ونطاق العمل
تُحقق الشريحة العاشرة إغلاق الفجوات الجوهرية الحرجة في دورة حياة النظام: **G-24** (إدارة وإطلاق دورات التقييم)، **G-26** (بدء ملفات التقييم الذاتي للمدارس)، و **G-05** (استعادة وتعيين كلمة المرور)، بالإضافة إلى تفعيل سجل الإشعارات والتنبيهات النظامية الدائم (**FR-GEN-05**)، وفق مصفوفة الأدوار والصلاحيات المعتمدة في الفصل 3 من وثيقة النظام الرسمية.

#### المبادئ والضوابط المنفذة:
1. **حوكمة دورات التقييم حكراً على المشرف الوزاري (G-24):**
   - إطلاق وإدارة دورات التقييم المركزية مسندة حصراً إلى المشرف الوزاري (`ministry_supervisor`) عبر صلاحية `cycles.manage` و `cycles.launch`.
   - حظر مسؤول النظام (`admin`) قطعياً من إطلاق أو إدارة الدورات التقييمية (يرجع `403 Forbidden` - القرار المعماري `BR-GEN-06` والوثيقة الرسمية 3.2.4). نطاق الأدمن محصور بتهيئة المدارس والحسابات.
2. **الربط التلقائي الحتمي بالإصدار المعياري المُقرّ:**
   - عند إطلاق المشرف الوزاري لدورة جديدة، يربط النظام الدورة تلقائياً بآخر إصدار معايير مُقرّ ونشط (`Approved`/`Active`).
   - لا يختار المشرف الإصدار يدوياً؛ وإن لم يوجد إصدار مُقرّ في المنظومة، يُرفض الطلب برمز `422` ورسالة دقيقة.
3. **بدء ملفات التقييم الذاتي حكراً لمقيّم المدرسة (G-26):**
   - نقطة النهاية `POST /api/v1/evaluations` متاحة حصراً لمستخدم التقييم في المدرسة (`school_evaluator`) لمدرسته فقط.
   - فرض الشروط الخمسة الحتمية:
     - الدورة نشطة ومفتوحة (`status = 'Active'`) وضمن الإطار الزمني المسموح.
     - إصدار المعايير المرتبط بالدورة مُقرّ ونافذ.
     - المدرسة مسجلة رسمياً بالدورة في جدول الربط المركزي `cycle_participations`.
     - منع التكرار بصرامة: ملف تقييم واحد فقط لكل مدرسة في الدورة الواحدة (`unique(cycle_id, school_id)`).
     - المنشئ مقيّم نفس المدرسة التابع لها، والحالة المبدئية للملف هي `InProgress`.
   - حظر الأدمن والمشرف والمدير من إنشاء ملف التقييم نيابة عن المدارس (`403 Forbidden`).
4. **سجل الإشعارات والتنبيهات الدائم (FR-GEN-05):**
   - اعتماد جدول `notifications` كسجل تاريخي دائم لا يُحذف لتوثيق كافة الأحداث المحورية.
   - بث تلقائي للإشعارات عند:
     - إطلاق دورة تقييمية جديدة (إشعار مديري ومقيمي المدارس المشاركة).
     - بدء ملف تقييم ذاتي لمدرسة (إشعار مدير المدرسة والمشرفين الوزاريين).
     - تقديم ملف التقييم المكتمل (إشعار المشرفين الوزاريين ومدير المدرسة).
   - عزل أمني صارم: إرجاع `404` عند محاولة أي مستخدم الوصول لإشعار مستخدم آخر.
5. **استعادة وإعادة تعيين كلمة المرور (G-05):**
   - تدفق آمن عبر البريد الإلكتروني ورموز التحقق المشفرة بـ SHA-256.
   - صلاحية مؤقتة للرمز مدتها 60 دقيقة.
   - إبطال كافة الجلسات وتوكنات Sanctum السابقة فور التعيين.
   - حماية الخصوصية ومنع تعداد الحسابات (Account Enumeration Prevention).
6. **احترام قاعدة المصطلحات الصارمة:**
   - لا كلمة "اعتماد" في المنظومة بأسرها إلا حصراً ضمن اسم *"معايير الاعتماد المدرسي"*.

---

### 2. التعديلات على قاعدة البيانات والمخطط (Database Schema)

ملف التهجير: `database/migrations/2026_10_31_140000_create_slice10_tables_and_fields.php`:
1. إضافة عمود `name` إلى جدول `evaluation_cycles`:
   - نوع البيانات: `string(100)`, nullable.
   - يسمح بتعيين اسم وصفي للدورة (مثل: «دورة التقييم الذاتي لمدارس التعليم العام 2026-2027»).
2. إنشاء جدول `password_reset_tokens`:
   - الأعمدة: `email` (string, index), `token` (string), `created_at` (timestamp, nullable).
3. الحفاظ على مصفوفة الـ 19 صلاحية المعتمدة في النظام مع مطابقة مرنة (`cycles.manage` <-> `cycles.launch`) داخل نموذج `User.php`.

---

### 3. نقاط النهاية البرمجية الـ 12 المنجزة (API Endpoints)

| # | المسار (Endpoint) | الطريقة | الصلاحية / الدور | الوصف الوظيفي |
| :---: | :--- | :---: | :--- | :--- |
| **1** | `/api/v1/evaluation-cycles` | `GET` | مصادَق (`auth:sanctum`) | استعراض الدورات التقييمية مع سياق مدرسة المقيّم وإمكانية بدء التقييم (`canStartEvaluation`). |
| **2** | `/api/v1/evaluation-cycles` | `POST` | `ministry_supervisor` (`cycles.manage` / `cycles.launch`) | إطلاق دورة تقييمية جديدة مع الربط التلقائي بآخر إصدار مُقرّ وإشعار المدارس (الأدمن 403). |
| **3** | `/api/v1/evaluation-cycles/{id}` | `GET` | مصادَق (`auth:sanctum`) | تفاصيل الدورة، الإصدار المعياري، وإحصاء المدارس والتقييمات. |
| **4** | `/api/v1/evaluation-cycles/{id}` | `PATCH` | `ministry_supervisor` | تحديث بيانات الدورة أو إغلاقها (`status: Closed`). |
| **5** | `/api/v1/evaluation-cycles/{id}/participations` | `POST` | `ministry_supervisor` | تسجيل وإلحاق مدارس في الدورة وإرسال الإشعارات لهم. |
| **6** | `/api/v1/evaluations` | `POST` | `school_evaluator` (`evaluations.create`) | بدء ملف تقييم ذاتي جديد لمدرسة المقيّم بحالة `InProgress` (G-26). |
| **7** | `/api/v1/notifications` | `GET` | مصادَق (للمستخدم نفسه) | استعراض قائمة إشعارات وتنبيهات المستخدم بترتيب زمني عكسي. |
| **8** | `/api/v1/notifications/unread-count` | `GET` | مصادَق (للمستخدم نفسه) | إرجاع عدد التنبيهات غير المقروءة لتحديث شارة الجرس في الواجهة. |
| **9** | `/api/v1/notifications/{id}/read` | `PATCH` | مصادَق (للمستخدم نفسه) | تحديد إشعار معين كمقروء (عزل أمني 404 للغير). |
| **10** | `/api/v1/notifications/mark-all-read` | `POST` | مصادَق (للمستخدم نفسه) | تحديد كافة إشعارات المستخدم الحالي كمقروءة دفعة واحدة. |
| **11** | `/api/v1/auth/password/forgot` | `POST` | عام (Public) | طلب رمز مؤقت لاستعادة كلمة المرور عبر البريد الإلكتروني (G-05). |
| **12** | `/api/v1/auth/password/reset` | `POST` | عام (Public) | تعيين كلمة المرور الجديدة باستخدام الرمز المؤقت وإبطال الجلسات. |

---

### 4. واجهات النموذج الأولي التفاعلي (Frontend Prototype)

1. **لوحة المشرف الوزاري (`screen-supervision`):**
   - إضافة تبويبين: متابعة تقييمات المدارس، وإدارة دورات التقييم المركزية.
   - استعراض الدورات التقييمية وإحصاء المدارس المشاركة وحالة كل دورة.
   - نافذة تفاعلية لإطلاق دورة جديدة (`modal-launch-cycle`) مع تعبئة تلقائية للتواريخ وتسجيل المدارس.
   - زر إغلاق الدورة وزر إلحاق مدارس إضافية.
2. **لوحة الدورات والتقييمات للمقيّم (`screen-cycles`):**
   - إبراز بطاقة حث خضراء ديناميكية (`cta-start-evaluation-card`): تظهر فقط عند وجود دورة نشطة ومفتوحة للمدرسة ولم يبدأ ملف التقييم بعد.
   - زر **«🌱 بدء ملف تقييم ذاتي جديد»**: يرسل `POST /evaluations` ويفتح فورياً استمارة رصد المعايير.
3. **جرس التنبيهات في شريط التنقل العلوي:**
   - أيقونة جرس 🔔 مع شارة حمراء ديناميكية تعرض عدد التنبيهات غير المقروءة.
   - نافذة منسدلة (`modal-notifications`) تعرض سجل التنبيهات مع تمييز غير المقروء وزر «تحديد الكل كمقروء».
4. **شاشة تسجيل الدخول (`screen-login`):**
   - رابط «🔑 نسيت كلمة المرور؟ استعادة الحساب».
   - نافذة من مرحلتين: طلب الرمز، ثم إدخال الرمز وكلمة المرور الجديدة مع مطابقة الشروط.
5. **تطهير لوحة الأدمن (`screen-admin`):**
   - إزالة تبويب دورات التقييم من شاشة الأدمن التزاماً بالقرار المعماري `BR-GEN-06`.

---

### 5. حزمة الاختبارات الآلية والتحقق (Test Suite Proof)

تم إنشاء ملف اختبارات الميزة الشامل للشريحة:
`school-eval-api/tests/Feature/CyclesAndNotificationsFeatureTest.php`

يحتوي على **15 اختباراً آلياً دقيقاً** تغطي كافة الحالات الإيجابية والسلبية:
1. `test_supervisor_can_launch_cycle_with_auto_bound_approved_standard_version`
2. `test_supervisor_cannot_launch_cycle_if_no_approved_version_exists`
3. `test_admin_is_strictly_forbidden_from_launching_or_managing_cycles` (403 Forbidden)
4. `test_supervisor_can_update_and_close_evaluation_cycle`
5. `test_supervisor_can_enroll_schools_in_cycle`
6. `test_school_evaluator_can_initiate_evaluation_in_active_participating_cycle` (201 Created)
7. `test_evaluator_cannot_initiate_duplicate_evaluation_in_same_cycle` (422 Uniqueness)
8. `test_evaluator_cannot_initiate_evaluation_if_school_not_enrolled` (422 Not Enrolled)
9. `test_evaluator_cannot_initiate_evaluation_if_cycle_is_closed_or_out_of_bounds` (422 Closed/Dates)
10. `test_admin_and_supervisor_cannot_initiate_evaluation` (403 Forbidden)
11. `test_evaluation_cycles_index_shows_school_context_metadata`
12. `test_notification_listing_and_unread_count_with_strict_isolation`
13. `test_mark_notification_as_read_and_mark_all_as_read`
14. `test_password_forgot_and_reset_successful_flow`
15. `test_password_reset_fails_with_invalid_or_expired_token`

#### نتيجة تشغيل الحزمة الكاملة للنظام:
```text
Tests:    223 passed (100%)
Assertions: 9,111 passed
Failures: 0
Duration: ~56s
```
صفر انحدار على كافة الشرائح 1 إلى 9.
