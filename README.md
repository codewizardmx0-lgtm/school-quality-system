# نظام إدارة وتقويم الجودة المدرسية (School Quality System)

نظام وطني متكامل لإدارة وتقويم جودة المدارس، يغطي دورات التقييم الذاتي، رصد درجات المؤشرات والمعايير، إدارة الشواهد والوثائق، إعداد ومتابعة خطط التحسين المدرسي، وإنتاج التقارير والتحليلات وحساب النتائج.

---

## بنية المشروع (Architecture Structure)

```
school-quality-system/
├── school-eval-api/       # الباك إند: Laravel 11 API مع Sanctum و MySQL
├── school-eval-web/       # الفرونت إند: تطبيق React (Vite + TailwindCSS)
├── frontend-prototype/    # نموذج أولي تفاعلي للتحقق من تسلسل العمليات
└── docs/                  # التوثيق المعماري، الأدلة، وتوثيق الشرائح (Slices)
```

---

## الشرائح المنجزة والمعتمدة (Implemented Slices)

| الشريحة | العنوان | الحالة | التوثيق |
|---|---|---|---|
| **الشريحة 0** | قاعدة البيانات، النماذج Eloquent، ومصفوفة الصلاحيات المعتمدة | مكتملة 100% | [`docs/slices/README.md`](docs/slices/README.md) |
| **الشريحة 1** | المصادقة، العزل المؤسسي للمدارس، وإدارة النظام للمسؤول | مكتملة 100% | [`docs/slices/slice1_auth_admin.md`](docs/slices/slice1_auth_admin.md) |
| **الشريحة 2** | التقييم الذاتي، رصد درجات المؤشرات، وإدارة الشواهد والنسخ التاريخية | مكتملة 100% | [`docs/slices/slice2_evaluation_evidence.md`](docs/slices/slice2_evaluation_evidence.md) |
| **الشريحة 3** | خطط التحسين المدرسي، الإجراءات التنفيذية، وملاحظات المراجعة | مكتملة 100% | [`docs/slices/slice3_improvement_plans.md`](docs/slices/slice3_improvement_plans.md) |
| **الشريحة 4** | **التقارير والتحليلات وحساب النتائج (لوحة المعلومات، حساب الدرجات، الشواهد، تصدير JSON)** | **مكتملة 100%** | [`docs/slices/slice4_reports_analytics.md`](docs/slices/slice4_reports_analytics.md) |

---

## الشريحة الرابعة: التقارير والتحليلات وحساب النتائج

### نقاط النهاية المتاحة (Endpoints)
- `GET /api/v1/schools/{school}/assessments/{assessment}/dashboard` (المسار البديل: `/api/schools/{school}/assessments/{assessment}/dashboard`)
- `GET /api/v1/schools/{school}/assessments/{assessment}/results` (المسار البديل: `/api/schools/{school}/assessments/{assessment}/results`)
- `GET /api/v1/schools/{school}/assessments/{assessment}/standards/{standard}/results`
- `GET /api/v1/schools/{school}/assessments/{assessment}/evidence-summary`
- `GET /api/v1/schools/{school}/assessments/{assessment}/improvement-plans/summary`
- `GET /api/v1/schools/{school}/assessments/{assessment}/export`
- `POST /api/v1/evaluations/{id}/submit` (المسار البديل: `/api/v1/schools/{school}/assessments/{assessment}/submit`) — إغلاق واعتماد التقييم وقفل التعديل (G-01 / BR-SCH-03)

* التفاصيل الكاملة لنقاط النهاية: [`docs/api/reports_analytics_endpoints.md`](docs/api/reports_analytics_endpoints.md) | ملف التجربة: [`docs/api/reports.http`](docs/api/reports.http)
* توثيق النموذج الأولي التفاعلي (15 شاشة): [`frontend-prototype/README.md`](frontend-prototype/README.md)
* سجل حصر الفجوات والقرارات التقنية: [`gaps.md`](gaps.md)
* وثيقة تصميم النظام (الفصل الرابع): [`docs/chapter4/chapter4_system_design.md`](docs/chapter4/chapter4_system_design.md)

### القواعد الحسابية والأوزان المعتمدة:
1. **أوزان المعايير السبعة:**
   - الإدارة المدرسية: 15%
   - المعلمون والكوادر الإدارية والخدمية: 20%
   - المتعلمون: 15%
   - التعليم والتعلم: 20%
   - البيئة المدرسية: 15%
   - الشراكة المجتمعية: 5%
   - ضمان الجودة والتحسين المستمر: 10%
   - **المجموع: 100%**
2. **قاعدة التحقق من الاكتمال (القاعدة 8):**
   - يمنع حساب النتائج النهائية أو تصدير التقرير لتقييم غير مكتمل أو مقفل، ويُرجع الرمز `422 Unprocessable Content` مع توضيح عدد المؤشرات المتبقية.
3. **حساب الشواهد وخطط التحسين:**
   - احتساب نسب استيفاء الشواهد الـ 278 لـ 109 مؤشرات معتمدة.
   - احتساب الخطط والإجراءات المتأخرة ديناميكياً بناءً على المواعيد المحددة.
4. **العزل المؤسسي (القرار المعماري 9):**
   - أي محاولة من مستخدم مدرسة لطلب تقارير مدرسة أخرى تُرجع `404 Not Found` لمنع كشف وجود المدارس، بينما يتاح لمسؤول النظام والمشرف الوزاري الاطلاع الشامل.

---

## تشغيل الاختبارات الآلية (Testing)

```bash
cd school-eval-api
php artisan test
```

**نتيجة الاختبارات الإجمالية:**
- **112 اختباراً ناجحاً بنسبة 100%**
- **7,426 تأكيداً (Assertions)**
- **0 إخفاقات / 0 أخطاء**
