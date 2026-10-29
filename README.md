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
| **الشريحة 6** | **إدارة المدرسة: الملف التعريفي، الإحصاءات التجميعية، المرافق، وسياق المؤشرات** | **مكتملة 100%** | [`docs/slices/slice6_school_profile.md`](docs/slices/slice6_school_profile.md) |

---

## نقطة الاسترجاع والوسم الرسمي للمرحلة (Milestone Release Tag)

> [!TIP]
> **الوسم المرجعي للمرحلة الأولى:** `v0.6.0-slices-1-to-6-complete`  
> يمثل هذا الوسم نقطة استرجاع مستقرة ومكتملة 100% لنصف النظام الأساسي (الشرائح 1 إلى 6)، شاملاً:
> 1. الباك إند المكتمل لجميع المسارات مع 160 اختباراً آلياً ناجحاً بنسبة 100% (7,793 تأكيداً).
> 2. النموذج الأولي التفاعلي للواجهات (`frontend-prototype/`) كمرجع حي (Living Spec) يغطي الأدوار الخمسة والتوجيه التلقائي وسير العمليات بدون أخطاء.
> 3. كافة التوثيقات وسجل الفجوات (`gaps.md`) وأدلة التحقق الميداني.

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

* التفاصيل الكاملة للشريحة 6: [`docs/slices/slice6_school_profile.md`](docs/slices/slice6_school_profile.md)
* التفاصيل الكاملة للشريحة 5: [`docs/slices/slice5_evidence_organization.md`](docs/slices/slice5_evidence_organization.md)
* خارطة الطريق للشرائح المستقبلية (12 شريحة): [`docs/slices_roadmap.md`](docs/slices_roadmap.md)
* سجل حصر الفجوات والقرارات التقنية: [`gaps.md`](gaps.md)
* دليل التحقق اليدوي للواجهات المؤقتة (مُعاد بناؤه ومبوّب بالشرائح 1-6 مع أدلة الأدوار ومراكز الإشراف والمعايير): [`frontend-prototype/verification-guide.md`](frontend-prototype/verification-guide.md)
* توثيق النموذج الأولي التفاعلي (21 شاشة مع شريط تنقل ديناميكي حسب الدور، مركز الإشراف، مركز المعايير، أداة التعبئة الإلزامية والدخول السريع): [`frontend-prototype/README.md`](frontend-prototype/README.md)

---

## تشغيل الاختبارات الآلية (Testing)

```bash
cd school-eval-api
php artisan test
```

**نتيجة الاختبارات الإجمالية:**
- **160 اختباراً ناجحاً بنسبة 100%**
- **7,793 تأكيداً (Assertions)**
- **0 إخفاقات / 0 أخطاء**
