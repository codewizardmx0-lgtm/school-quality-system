# نظام إدارة وتقويم الجودة المدرسية (School Quality System)

نظام وطني متكامل لإدارة وتقويم جودة المدارس، يغطي دورات التقييم الذاتي، رصد درجات المؤشرات والمعايير، إدارة الشواهد والوثائق، إعداد ومتابعة خطط التحسين المدرسي، وإنتاج التقارير والتحليلات وحساب النتائج، وتنظيم وتدقيق الشواهد.

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
| **الشريحة 4** | التقارير والتحليلات وحساب النتائج (لوحة المعلومات، حساب الدرجات، الشواهد، تصدير JSON) | مكتملة 100% | [`docs/slices/slice4_reports_analytics.md`](docs/slices/slice4_reports_analytics.md) |
| **الشريحة 4.1** | إغلاق واعتماد التقييم وقفل التعديل النهائي (G-01 / BR-SCH-03) | مكتملة 100% | [`gaps.md`](gaps.md) |
| **الشريحة 5** | **تنظيم الشواهد وتصنيفها وربطها بالمؤشرات وحصرها (بدون ذكاء اصطناعي)** | **مكتملة 100%** | [`docs/slices/slice5_evidence_organization.md`](docs/slices/slice5_evidence_organization.md) |

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

* التفاصيل الكاملة للشريحة: [`docs/slices/slice5_evidence_organization.md`](docs/slices/slice5_evidence_organization.md)
* خارطة الطريق للشرائح المستقبلية (12 شريحة): [`docs/slices_roadmap.md`](docs/slices_roadmap.md)
* سجل حصر الفجوات والقرارات التقنية: [`gaps.md`](gaps.md)
* توثيق النموذج الأولي التفاعلي (16 شاشة): [`frontend-prototype/README.md`](frontend-prototype/README.md)

---

## تشغيل الاختبارات الآلية (Testing)

```bash
cd school-eval-api
php artisan test
```

**نتيجة الاختبارات الإجمالية:**
- **123 اختباراً ناجحاً بنسبة 100%**
- **7,521 تأكيداً (Assertions)**
- **0 إخفاقات / 0 أخطاء**
