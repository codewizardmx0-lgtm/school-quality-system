# الشريحة 11: الجاهزية للأمان والإنتاج وتصليد النظام
## Slice 11: Security Hardening, Rate Limiting, Version Consistency (G-23) & Production Readiness

---

### 1. ملخص الشريحة ونطاق العمل
تستهدف الشريحة الحادية عشرة رفع مستوى حماية النظام إلى المعايير المؤسسية للإنتاج الفعلي (Production-Grade Security Hardening)، وإغلاق الثغرات التشغيلية وضمان اتساق البيانات، من خلال أربعة محاور أساسية:

1. **محدد معدل الطلبات لمسارات المصادقة الحساسة (Rate Limiting):**
   - حماية مسارات المصادقة العامة والخاصة من هجمات التخمين الآلية (Brute-Force Attacks) وهجمات حجب الخدمة (DoS).
   - اعتماد مفاتيح بسيطة ونظيفة: عنوان IP للمسارات العامة، ومعرف المستخدم `user:id` للمسار الموثق.
   - الرد برمز الحالة الموحد `429 Too Many Requests` متضمناً ترويسة `Retry-After` واستجابة JSON موحدة تتضمن `success = false`، ورسالة واضحة بالعربية، وحقل `retry_after`.
   - عزل التأثير بحيث لا تتأثر باقي مسارات النظام التشغيلية (التقييم، الشواهد، التقارير) لضمان انسيابية العمل المدرسي.

2. **وسيط ترويسات الأمان (Security Headers Middleware):**
   - حقن ترويسات الحماية القياسية في كافة استجابات الـ API:
     - `X-Frame-Options: DENY`: منع هجمات تضمين النوافذ (Clickjacking).
     - `X-Content-Type-Options: nosniff`: منع المتصفح من تخمين أنواع المحتوى (MIME Sniffing).
     - `Referrer-Policy: strict-origin-when-cross-origin`: حماية مسارات الـ API ومنع تسريب بيانات الإحالة الحساسة.
   - تفعيل ترويسة الأمان المشدد لنقل النصوص (HSTS - `Strict-Transport-Security: max-age=31536000; includeSubDomains`) حصرياً في بيئة الإنتاج (`production`) وعندما يكون الاتصال مشفراً بـ `HTTPS`، مع تعطيلها في بيئة التطوير والاختبار المحلي لتفادي مشاكل الشهادات والاتصال عبر HTTP.
   - الحفاظ التام على سلامة تصدير وتنزيل ملفات الـ PDF وبطاقات التقييم وملفات Excel، مع الإبقاء الكامل على ترويسات `Content-Type` و `Content-Disposition`.

3. **ضابط اتساق الإصدارات المعيارية والأرشفة الذرية (ضابط G-23):**
   - ضمان وجود إصدار معايير واحد فقط بحالة نشط (`Active` أو `Approved`) في عموم المنظومة.
   - تطبيق الأرشفة التلقائية الذرية داخل معاملة قاعدة البيانات (`DB::transaction`): عند قيام المشرف الوزاري بتنشيط أو إقرار إصدار معايير جديد، يتم آلياً وذرياً تحويل الإصدار النشط السابق إلى مؤرشف (`Archived`).
   - حماية مزدوجة على مستوى الخدمة (`StandardManagementService`) ومستوى النموذج (`StandardVersion::booted saving event`) لمنع وجود أكثر من إصدار نشط بأي طريقة برمجية.
   - توثيق القيد القاعدي (Generated Column Unique Index) كتحسين مستقبلي إضافي في قواعد البيانات.

4. **توسيع وحوكمة سجل التدقيق (Audit Logging for G-23):**
   - توثيق وتوسيع سجل التدقيق في `AuditLoggerService` ليشمل عمليتين إداريتين جديدتين:
     - `standard_version.activated`: تنشيط أو إقرار إصدار معايير جديد.
     - `standard_version.auto_archived`: الأرشفة التلقائية الذرية لإصدار معايير سابق.
   - الحفاظ على نفس البنية المعتمدة للتدقيق (المستخدم المنفذ، الإجراء، `old_values`، `new_values`، IP، User Agent)، مع حظر تسجيل كلمات المرور أو التوكنات، ودون أي تعديل على العمليات الـ 12 السابقة للمصادقة والتقييم والاستكمال وفك الشواهد.

5. **إعدادات الإنتاج وسياسة التوكنات (Production Configuration):**
   - تحديث ملف `.env.example` بكافة المتغيرات الإنتاجية وتعليقات التوجيه الأمنية.
   - توثيق سياسة توكنات Sanctum المعتمدة لمشروع التخرج: اعتماد صلاحية 30 يوماً (`SANCTUM_EXPIRATION=43200`) لتوفير تجربة عمل مستقرة لمديري ومقيمي المدارس دون انقطاع، مع إبطالها الفوري عند تسجيل الخروج أو تغيير كلمة المرور، واستبعاد تعقيدات الـ Refresh Tokens غير الضرورية في هذه المرحلة.

---

### 2. جدول ضوابط محدد المعدل (Rate Limiting Rules)

| نقطة النهاية (Endpoint) | الطريقة | معدل الطلب الأقصى | مفتاح التقييد (Key) | رمز الاستجابة | ترويسات الاستجابة | بنية الرد JSON |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `/api/v1/auth/login` | `POST` | 5 محاولات / دقيقة | `$request->ip()` | `429 Too Many Requests` | `Retry-After: 60` | `{"success": false, "message": "...", "retry_after": 60, "errors": {...}}` |
| `/api/v1/auth/password/forgot` | `POST` | 3 محاولات / 15 دقيقة | `$request->ip()` | `429 Too Many Requests` | `Retry-After: 900` | `{"success": false, "message": "...", "retry_after": 900, "errors": {...}}` |
| `/api/v1/auth/password/change` | `POST` | 5 محاولات / 10 دقائق | `'user:'.$user->id` | `429 Too Many Requests` | `Retry-After: 600` | `{"success": false, "message": "...", "retry_after": 600, "errors": {...}}` |

---

### 3. ترويسات الأمان المعتمدة (Security Headers)

```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains (Production + HTTPS Only)
```

---

### 4. سجل العمليات المعتمدة للتدقيق (Audit Actions Registry)

أصبحت قائمة العمليات المعتمدة والمحمية بسجل التدقيق تضم 14 عملية:

1. `auth.login_success`: تسجيل دخول ناجح للمستخدم.
2. `auth.login_failed`: محاولة دخول فاشلة.
3. `auth.logout`: تسجيل خروج للمستخدم.
4. `auth.password_changed`: تغيير كلمة المرور للمستخدم المسجل.
5. `evaluation.scored`: رصد وحفظ درجات التقييم الذاتي والملاحظات.
6. `evaluation.submitted`: تسليم ملف التقييم الذاتي والانتقال إلى Submitted.
7. `evaluation.direct_closed`: إغلاق مباشر للتقييم واعتماده من المشرف الوزاري.
8. `completion.created`: إنشاء طلب استكمال وإعادة فتح الملف بمهلة يدوية.
9. `completion.deadline_extended`: تمديد مهلة الاستكمال من المشرف.
10. `completion.resubmitted`: إعادة تسليم ملف التقييم من المدرسة بمحاولة جديدة (N+1).
11. `completion.closed`: إغلاق طلب الاستكمال بعد استيفاء المتطلبات.
12. `evidence.unlinked`: فك ارتباط وثيقة بمؤشر مدرسي.
13. `standard_version.activated`: تنشيط أو إقرار إصدار معايير وطنية جديد (G-23).
14. `standard_version.auto_archived`: أرشفة تلقائية ذرية لإصدار معايير سابق (G-23).

---

### 5. الملفات المضافة والمعدلة

1. **الملفات المضافة (New Files):**
   - `app/Http/Middleware/SecurityHeadersMiddleware.php`: وسيط حقن ترويسات الأمان وتفعيل HSTS المشروط.
   - `tests/Feature/RateLimitingFeatureTest.php`: اختبارات حماية مسارات المصادقة بالـ Rate Limiting.
   - `tests/Feature/SecurityHeadersFeatureTest.php`: اختبارات ترويسات الأمان وتكامل تصدير PDF و Excel.

2. **الملفات المعدلة (Modified Files):**
   - `app/Http/Responses/ApiResponse.php`: إضافة الدالة الموحدة `tooManyRequests(message, retryAfter)` برمز 429.
   - `app/Providers/AppServiceProvider.php`: تسجيل تعريفات محددات المعدل لمسارات المصادقة الثلاثة.
   - `bootstrap/app.php`: تسجيل وسيط ترويسات الأمان العام، وتخصيص استجابة استثناءات `ThrottleRequestsException`.
   - `routes/api.php`: ربط مسارات المصادقة بالوسيط `throttle:...`، وإضافة مسار التنشيط الصريح `/standard-versions/{id}/activate`.
   - `app/Http/Controllers/Api/V1/StandardManagementController.php`: إضافة دالة `activate()` للمشرف الوزاري.
   - `app/Services/StandardManagementService.php`: تطبيق الأرشفة الذرية التلقائية وتوثيق سجلات التدقيق في `approveVersion()` و `activateVersion()`.
   - `app/Models/StandardVersion.php`: إضافة حماية على مستوى النموذج في حدث `booted() saving` لضمان تفرد الإصدار النشط.
   - `app/Services/AuditLoggerService.php`: توثيق الثوابت والعمليات الجديدة `standard_version.activated` و `standard_version.auto_archived`.
   - `config/sanctum.php`: ربط مدة انتهاء التوكن بمتغير البيئة `SANCTUM_EXPIRATION`.
   - `.env.example`: توثيق إعدادات الإنتاج المشفرة وتوكنات Sanctum.
   - `tests/Feature/StandardsManagementFeatureTest.php`: إضافة 3 اختبارات شاملة لضابط G-23 والأرشفة الذرية وسجلات التدقيق.

---

### 6. نتائج الاختبارات وضمان الجودة

- **إجمالي الاختبارات في النظام:** 250 اختباراً آلياً (مقارنة بـ 243 اختباراً قبل تنفيذ الشريحة).
- **إجمالي التوكيدات:** 9,314 توكيداً برمجياً.
- **نسبة النجاح:** 100% (صفر أخطاء، صفر إخفاقات).
