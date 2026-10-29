# نظام إدارة وتقويم الجودة المدرسية (School Quality System)

نظام وطني متكامل لإدارة وتقويم جودة المدارس، يغطي دورات التقييم الذاتي، رصد درجات المؤشرات والمعايير، إدارة الشواهد والوثائق، إعداد ومتابعة خطط التحسين المدرسي، إنتاج التقارير والتحليلات وحساب النتائج، تنظيم وتدقيق الشواهد، وإدارة الملف التعريفي والإحصاءات والمرافق المدرسية وسياق المؤشرات الاسترشادي.

---

## بنية المشروع (Architecture Structure)

```
school-quality-system/
├── school-eval-api/       # الباك إند: Laravel 11 API مع Sanctum و MySQL
├── school-eval-web/       # الفرونت إند: تطبيق React (Vite + TailwindCSS)
├── frontend-prototype/    # نموذج أولي تفاعلي للتحقق من تسلسل العمليات (الشرائح 1-6)
└── docs/                  # التوثيق المعماري، الأدلة، وتوثيق الشرائح (Slices)
```

---

## الشرائح المنجزة والرسمية (Implemented Slices)

| الشريحة | العنوان | الحالة | التوثيق |
|---|---|---|---|
| **الشريحة 0** | قاعدة البيانات، النماذج Eloquent، ومصفوفة الصلاحيات الرسمية | مكتملة 100% | [`docs/slices/README.md`](docs/slices/README.md) |
| **الشريحة 1** | المصادقة، العزل المؤسسي للمدارس، وإدارة النظام للمسؤول | مكتملة 100% | [`docs/slices/slice1_auth_admin.md`](docs/slices/slice1_auth_admin.md) |
| **الشريحة 2** | التقييم الذاتي، رصد درجات المؤشرات، وإدارة الشواهد والنسخ التاريخية | مكتملة 100% | [`docs/slices/slice2_evaluation_evidence.md`](docs/slices/slice2_evaluation_evidence.md) |
| **الشريحة 3** | خطط التحسين المدرسي، الإجراءات التنفيذية، وملاحظات المراجعة | مكتملة 100% | [`docs/slices/slice3_improvement_plans.md`](docs/slices/slice3_improvement_plans.md) |
| **الشريحة 4** | التقارير والتحليلات وحساب النتائج (لوحة المعلومات، حساب الدرجات، الشواهد، تصدير JSON) | مكتملة 100% | [`docs/slices/slice4_reports_analytics.md`](docs/slices/slice4_reports_analytics.md) |
| **الشريحة 4.1** | إنهاء وتقديم التقييم وقفل التعديل النهائي (G-01 / BR-SCH-03) | مكتملة 100% | [`gaps.md`](gaps.md) |
| **الشريحة 5** | تنظيم الشواهد وتصنيفها وربطها بالمؤشرات وحصرها (بدون ذكاء اصطناعي) | مكتملة 100% | [`docs/slices/slice5_evidence_organization.md`](docs/slices/slice5_evidence_organization.md) |
| **الشريحة 6** | إدارة المدرسة: الملف التعريفي، الإحصاءات التجميعية، المرافق، وسياق المؤشرات | مكتملة 100% | [`docs/slices/slice6_school_profile.md`](docs/slices/slice6_school_profile.md) |
| **الشريحة 7** | **إدارة المعايير وإصداراتها وأوزانها النسبية (Standards & Versions Management)** | **مكتملة 100%** | [`docs/slices/slice7_standards_management.md`](docs/slices/slice7_standards_management.md) |

---

## نقطة الاسترجاع والوسم الرسمي للمرحلة (Milestone Release Tag)

> [!TIP]
> **الوسم المرجعي للمرحلة السابقة (الشرائح 1 إلى 6):** `v0.6.0-slices-1-to-6-complete` (مدمج في main)  
> **فرع الشريحة السابعة:** `feature/slice7-standards-management` مع 172 اختباراً آلياً ناجحاً بنسبة 100% (7,859 تأكيداً).

---

## الشريحة السابعة: إدارة المعايير وإصداراتها وأوزانها النسبية (Standards & Versions Management)

### نقاط النهاية المتاحة (Endpoints)
- `GET /api/v1/standard-versions` — استعراض قائمة الإصدارات المعيارية مع إمكانية التصفية بالحالة (`?status=Draft`).
- `POST /api/v1/standard-versions` — إنشاء مسودة إصدار فارغة جديدة.
- `POST /api/v1/standard-versions/{id}/clone` — استنساخ إصدار مُقرّ كمسودة جديدة مع الشجرة الهرمية الكاملة (المعايير، المجالات، المؤشرات، الواصفات، والمتطلبات).
- `PUT /api/v1/standard-versions/{id}` — تعديل البيانات الوصفية للمسودة.
- `PUT /api/v1/standard-versions/{id}/weights` — تحديث مصفوفة الأوزان النسبية للمعايير مع التحقق الصارم من مجموع 100.00%.
- `POST /api/v1/standard-versions/{id}/approve` — إقرار المسودة رسمياً كإصدار نافذ وأرشفة الإصدار السابق تلقائياً بعد فحص الـ 100%.
- `POST /api/v1/standard-versions/{id}/archive` — أرشفة يدوية لإصدار مُقرّ.
- `PUT /api/v1/standards/{id}` — تعديل اسم أو رمز معيار رئيسي في مسودة.
- `PUT /api/v1/sub-standards/{id}` — تعديل اسم أو رمز مجال فرعي في مسودة.
- `PUT /api/v1/indicators/{id}` — تعديل اسم أو رمز أو وزن مؤشر في مسودة.
- `PUT /api/v1/indicators/{id}/descriptors` — تعديل صياغة واصفات درجات المؤشر في مسودة.
- `POST /api/v1/indicators/{id}/requirements` — إضافة متطلب شاهد جديد لمؤشر في مسودة.
- `PUT /api/v1/indicators/{id}/requirements/{reqId}` — تعديل متطلب شاهد في مسودة.
- `DELETE /api/v1/indicators/{id}/requirements/{reqId}` — حذف متطلب شاهد من مؤشر في مسودة.

### واجهات النموذج الأولي التفاعلي للشريحة 7
- **شريط التحكم بالإصدارات:** اختيار الإصدار، شارة الحالة الملونة (مسودة/مُقرّ/مؤرشف)، وأزرار الإجراءات (مسودة جديدة، استنساخ، إقرار، أرشفة).
- **مصفوفة الأوزان النسبية:** جدول تفاعلي لتعديل الأوزان مع عدّاد لحظي (أخضر عند 100.00% وأحمر عند أي انحراف) وتعطيل تلقائي للأزرار عند عدم التوازن.
- **أدوات التحرير المشروطة بحالة المسودة:** إظهار أزرار التعديل والإضافة والحذف حصراً للمسودات، وإخفائها للإصدارات المُقرّة والمؤرشفة (Immutability).

---

## الشريحة السادسة: إدارة المدرسة (الملف التعريفي، الإحصاءات التجميعية، المرافق، وسياق المؤشرات)

### نقاط النهاية المتاحة (Endpoints)
- `GET /api/v1/schools/{id}/profile` — استعراض الملف التعريفي الممتد للمدرسة.
- `PUT /api/v1/schools/{id}/profile` — تحديث بيانات الملف التعريفي للمدرسة.
- `GET /api/v1/schools/{id}/staff-metrics` — استعراض إحصاءات الكادر التعليمي والإداري التجميعية للعام الدراسي.
- `POST /api/v1/schools/{id}/staff-metrics` — حفظ أو تحديث إحصاءات الكادر التعليمي والإداري التجميعية.
- `GET /api/v1/schools/{id}/enrollment-metrics` — استعراض إحصاءات الطلاب والشعب التجميعية للعام الدراسي.
- `POST /api/v1/schools/{id}/enrollment-metrics` — حفظ مجمّع لإحصاءات الطلاب والشعب حسب الصفوف الدراسية.
- `GET /api/v1/schools/{id}/facilities` — استعراض سجل مرافق المدرسة وتجهيزاتها وتوفر متطلبات السلامة.
- `POST /api/v1/schools/{id}/facilities` — إضافة مرفق مدرسي جديد.
- `PUT /api/v1/schools/{id}/facilities/{facilityId}` — تحديث بيانات أو حالة مرفق مدرسي.
- `DELETE /api/v1/schools/{id}/facilities/{facilityId}` — حذف سجل مرفق مدرسي.
- `GET /api/v1/evaluations/{id}/indicators-context` (المسار البديل: `/api/v1/schools/{school}/assessments/{assessment}/indicators-context`) — استخراج السياق الإحصائي الاسترشادي للمؤشرات مع المستويات المقترحة (مع حماية القسمة على صفر وقراءة مباشرة من Snapshot المجمدة في التقييمات المنتهية `Completed`).

### واجهات النموذج الأولي التفاعلي للشريحة 6
- **شاشة إدارة المدرسة (`Screen School Hub`):** 4 تبويبات متكاملة (الملف التعريفي، الكادر التعليمي والإداري مع الحسابات الحية لنسبة التأهيل ونصاب المعلم وقواعد التحقق، إحصاءات الطلاب والشعب مع حساب كثافة الفصول وإضافة/حذف الصفوف، وسجل المرافق والتجهيزات مع شارات الحالة واشتراطات السلامة).
- **بطاقة الدعم الاسترشادي لسياق المؤشر (`Advisory Context Card`):** بطاقة زرقاء سماوية تظهر تلقائياً في نافذة رصد الدرجات للمؤشرات المدعومة إحصائياً لتقديم دعم القرار وتجمد قراءتها بالـ Snapshot بعد تقديم التقييم.

---

## الشريحة الخامسة: تنظيم الشواهد وتصنيفها وربطها بالمؤشرات (No AI)

### نقاط النهاية المتاحة (Endpoints)
- `GET /api/v1/evaluations/{id}/indicators/{indicatorId}/evidences` — استعراض قائمة الشواهد النشطة للمؤشر مع نسخها ومرفقاتها وملاحظات التدقيق.
- `POST /api/v1/evaluations/{id}/indicators/{indicatorId}/evidences` — إضافة شاهد جديد للمؤشر (إمكانية تعدد الشواهد النشطة) مع إنشاء نتيجة تلقائية بحالة Pending.
- `PATCH /api/v1/evidences/{id}/classify` — تصنيف الشاهد يدوياً (محضر، خطة، سجل، تقرير، لوحة، صورة، أخرى).
- `POST|PATCH /api/v1/evidences/{id}/link-indicator` — ربط الشاهد بمؤشر آخر مع إنشاء نتيجة التقييم تلقائياً.
- `PATCH /api/v1/evidences/{id}/status` — تحديث حالة تدقيق الشاهد (Draft, Completed, Audited).
- `POST|PATCH /api/v1/evidences/{id}/review-notes` — إضافة ملاحظات المراجع وهوية وتاريخ المراجعة.
- `GET /api/v1/evaluations/{id}/evidence-inventory` (المسار البديل: `/api/v1/schools/{school}/assessments/{assessment}/evidence-inventory`) — جرد وحصر الشواهد التفصيلي للتقييم وبيان النواقص والمكتمل وفق حالة الشاهد (Completed / Audited).

* التفاصيل الكاملة للشريحة 7: [`docs/slices/slice7_standards_management.md`](docs/slices/slice7_standards_management.md)
* التفاصيل الكاملة للشريحة 6: [`docs/slices/slice6_school_profile.md`](docs/slices/slice6_school_profile.md)
* التفاصيل الكاملة للشريحة 5: [`docs/slices/slice5_evidence_organization.md`](docs/slices/slice5_evidence_organization.md)
* خارطة الطريق للشرائح المستقبلية (12 شريحة): [`docs/slices_roadmap.md`](docs/slices_roadmap.md)
* سجل حصر الفجوات والقرارات التقنية: [`gaps.md`](gaps.md)
* دليل التحقق اليدوي للواجهات المؤقتة (مُعاد بناؤه ومبوّب بالشرائح 1-7 مع أدلة الأدوار ومراكز الإشراف والمعايير): [`frontend-prototype/verification-guide.md`](frontend-prototype/verification-guide.md)
* توثيق النموذج الأولي التفاعلي (21 شاشة مع شريط تنقل ديناميكي حسب الدور، مركز الإشراف، مركز المعايير وإدارتها، أداة التعبئة الإلزامية والدخول السريع): [`frontend-prototype/README.md`](frontend-prototype/README.md)

---

## تشغيل الاختبارات الآلية (Testing)

```bash
cd school-eval-api
php artisan test
```

**نتيجة الاختبارات الإجمالية:**
- **172 اختباراً ناجحاً بنسبة 100%**
- **7,859 تأكيداً (Assertions)**
- **0 إخفاقات / 0 أخطاء**
