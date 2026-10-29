# توثيق واجهة برمجة التطبيقات: التقارير والتحليلات وحساب النتائج (Reports & Analytics API)

**منصة التقييم الذاتي والتحسين المدرسي**  
**الشريحة:** الشريحة الرابعة (Backend) — أكتوبر 2026  
**المرجعية:** الفصل الرابع من وثيقة النظام، الأوزان الوطنية المعتمدة، القرار المعماري 9 (عزل المدارس)، وقاعدة العمل 8 (منع حساب نتائج التقييم غير المكتمل).  
**المستهدف:** مطور الواجهة الأمامية (Frontend Engineer).

---

## 1. نظرة عامة وقواعد العمل الأساسية

توفر نقاط النهاية في هذه الشريحة واجهات قراءة وتحليل وحساب جاهزة للعرض والتصدير دون إدخال أي بيانات جديدة من المستخدم:
1. **الأوزان المعتمدة:** تُقرأ ديناميكياً من قاعدة البيانات (15% إدارة مدرسية، 20% كادر تعليمي وإداري، 15% متعلمون، 20% تعليم وتعلم، 15% بيئة مدرسية، 5% شراكة مجتمعية، 10% جودة وتحسين مستمر — الإجمالي 100%).
2. **القاعدة الإلزامية رقم 8 (اكتمال التقييم):**
   * يُمنع حساب النتائج النهائية للمدرسة (`/results`) أو تصدير التقرير (`/export`) لتقييم غير مكتمل (أقل من 109 مؤشرات مرصودة).
   * يُرجع النظام في هذه الحالة رمز الخطأ `422 Unprocessable Content` مع رسالة عربية واضحة وعدد المؤشرات المرصودة والمتبقية.
   * يُمنع حساب نتيجة معيار محدد (`/standards/{id}/results`) إذا كان المعيار نفسه ينقصه رصد بعض مؤشراته (`422`).
3. **العزل المؤسسي الصارم (القرار المعماري 9):**
   * مدير المدرسة ومقيم الجودة محصورون بمدرستهم فقط، ومحاولة الوصول لمعرف مدرسة أخرى تُرجع **`404 Not Found`** فوراً (وليس 403) لمنع كشف وجود بيانات لمدارس أخرى.
   * مسؤول النظام (`admin`) والمشرف الوزاري (`ministry_supervisor`) يحق لهما الاطلاع على كافة المدارس.
   * مسؤول المعايير بالوزارة ممنوع تماماً من الاطلاع على تقارير المدارس ويُرجع له **`403 Forbidden`** ('غير مصرح') وفق قاعدة `BR-MIN-01`.
4. **المسارات البديلة (Aliases):**
   * جميع نقاط النهاية متاحة بمسارين متطابقين:
     * المسار الرسمي: `/api/v1/schools/{school}/...`
     * المسار البديل: `/api/schools/{school}/...`

---

## 2. جدول نقاط النهاية السريع (Endpoints Summary)

| الطريقة | المسار (Path) | الصلاحية المطلوبة | الوصف الوظيفي |
|---|---|---|---|
| `GET` | `/api/v1/schools/{school}/dashboard` | `reports.view` أو `analytics.view` أو دور `admin` | لوحة القيادة التنفيذية للمدرسة (التقييم، الشواهد، الخطط، المعايير السبعة). |
| `GET` | `/api/v1/schools/{school}/assessments/{assessment}/results` | `reports.view` أو `evaluations.view` أو دور `admin` | حساب وعرض النتائج النهائية الشاملة للتقييم والمدرسة (يشترط اكتمال التقييم). |
| `GET` | `/api/v1/schools/{school}/assessments/{assessment}/standards/{standard}/results` | `reports.view` أو `evaluations.view` أو دور `admin` | حساب نتيجة معيار محدد مع درجات مؤشراته ونسبها (يشترط اكتمال المعيار). |
| `GET` | `/api/v1/schools/{school}/assessments/{assessment}/evidence-summary` | `reports.view` أو `evaluations.view` أو دور `admin` | ملخص الشواهد: المطلوب مقابل المرفوع ونسب الاستيفاء لكل مؤشر ومعيار. |
| `GET` | `/api/v1/schools/{school}/improvement-plans/summary` | `plans.view` أو `reports.view` أو دور `admin` | ملخص خطط وإجراءات التحسين وتحديد الخطط والإجراءات المتأخرة ديناميكياً. |
| `GET` | `/api/v1/schools/{school}/assessments/{assessment}/export` | `reports.view` أو دور `admin` | تصدير تقرير التقييم الكامل بصيغة JSON مهيكلة للفرونت إند والمستوى الوزاري. |

---

## 3. تفاصيل نقاط النهاية (Endpoints Specification)

### 3.1 لوحة معلومات المدرسة الموحدة (School Dashboard)
* **المسار:** `GET /api/v1/schools/{school}/dashboard`
* **الهدف:** توفير شاشة رئيسية سريعة تلخص وضع الجودة في المدرسة بعد تسجيل الدخول.
* **الترويسة:** `Authorization: Bearer {token}`

#### نموذج استجابة النجاح (`200 OK`):
```json
{
  "data": {
    "school": {
      "school_id": 1,
      "school_name": "مدرسة بلقيس الثانوية للبنات",
      "educational_stage": "أساسي وثانوي",
      "educational_district": "معين",
      "governorate": "أمانة العاصمة",
      "status": "Active"
    },
    "assessment": {
      "evaluation_id": 1,
      "cycle_id": 1,
      "academic_year": "2025/2026",
      "cycle_name": "2025/2026",
      "status": "Completed",
      "is_complete": true,
      "is_locked": true,
      "final_score": 100,
      "performance_level": {
        "key": "outstanding",
        "label": "متميز"
      },
      "completion_percentage": 100,
      "standards_summary": [
        {
          "standard_id": 1,
          "code": "STD-01",
          "name": "الإدارة المدرسية",
          "weight": 15,
          "raw_score": 3,
          "percentage": 100,
          "weighted_score": 15,
          "performance_level": { "key": "outstanding", "label": "متميز" }
        }
      ]
    },
    "evidence_overview": {
      "total_indicators": 109,
      "indicators_with_evidence": 109,
      "total_required_evidences": 278,
      "total_uploaded_evidences": 278,
      "completion_rate": 100
    },
    "improvement_plans_overview": {
      "total_plans": 2,
      "in_progress_plans": 1,
      "completed_plans": 1,
      "delayed_plans": 0,
      "actions_completion_rate": 80
    }
  },
  "message": "تم تحميل لوحة بيانات المدرسة بنجاح.",
  "errors": null,
  "meta": null
}
```

> **ملاحظة للواجهة:** إذا كان التقييم قيد الإجراء ولم تكتمل مؤشراته بعد، تعيد الاستجابة `final_score: null` و `is_complete: false` مع نسبة الإنجاز وعدد المؤشرات المقيمة والمتبقية.

---

### 3.2 حساب وعرض النتائج النهائية الشاملة (Assessment Results)
* **المسار:** `GET /api/v1/schools/{school}/assessments/{assessment}/results`
* **الهدف:** حساب النتيجة النهائية للمدرسة بالأوزان الرسمية السبعة واستعراض تفاصيل المعايير والمؤشرات.

#### استجابة الرفض عند عدم اكتمال التقييم (`422 Unprocessable Content`):
```json
{
  "data": null,
  "message": "لا يمكن حساب النتائج النهائية لتقييم غير مكتمل.",
  "errors": {
    "evaluation": [
      "التقييم غير مكتمل. تم تقييم 3 من أصل 109 مؤشر معتمد."
    ]
  },
  "meta": null
}
```

#### نموذج استجابة النجاح عند اكتمال التقييم (`200 OK`):
```json
{
  "data": {
    "evaluation_id": 1,
    "school_id": 1,
    "school_name": "مدرسة بلقيس الثانوية للبنات",
    "cycle_id": 1,
    "academic_year": "2025/2026",
    "cycle_name": "2025/2026",
    "status": "Completed",
    "is_complete": true,
    "is_locked": true,
    "total_indicators": 109,
    "evaluated_indicators": 109,
    "missing_indicators": 0,
    "final_score": 92.5,
    "max_score": 100,
    "performance_level": {
      "key": "outstanding",
      "label": "متميز"
    },
    "standards_total_weight": 100,
    "standards": [
      {
        "standard_id": 1,
        "code": "STD-01",
        "name": "الإدارة المدرسية",
        "weight": 15,
        "raw_score": 2.85,
        "max_score": 3,
        "percentage": 95,
        "weighted_score": 14.25,
        "performance_level": { "key": "outstanding", "label": "متميز" },
        "is_complete": true,
        "sub_standards": [
          {
            "sub_standard_id": 1,
            "code": "SUB-1-1",
            "name": "الرؤية والرسالة والأهداف",
            "total_weight": 5,
            "raw_score": 3,
            "percentage": 100,
            "performance_level": { "key": "outstanding", "label": "متميز" },
            "indicators": [
              {
                "indicator_id": 1,
                "code": "1-1-1",
                "name": "امتلاك رؤية ورسالة وقيم وأهداف واضحة ومعلنة",
                "weight": 1,
                "score": 3,
                "max_score": 3,
                "percentage": 100,
                "level_label": "متحقق",
                "descriptor": "تمتلك المدرسة وثيقة رسمية معلنة للرؤية والرسالة...",
                "evidences_count": 2,
                "is_evaluated": true
              }
            ]
          }
        ]
      }
    ]
  },
  "message": "تم حساب نتائج التقييم بنجاح.",
  "errors": null,
  "meta": null
}
```

---

### 3.3 حساب نتيجة معيار محدد (Standard Results Inspector)
* **المسار:** `GET /api/v1/schools/{school}/assessments/{assessment}/standards/{standard}/results`
* **المعامل `{standard}`:** يقبل المعرف الرقمي `standard_id` (مثل `1`) أو كود المعيار (مثل `STD-01`).
* **الهدف:** فحص تفصيلي لمعيار واحد مع درجات مؤشراته ومجالاته الفرعية.

#### استجابة الرفض عند عدم اكتمال المعيار (`422`):
```json
{
  "data": null,
  "message": "لا يمكن حساب نتيجة المعيار لأن بعض مؤشراته لم تُقيّم بعد.",
  "errors": {
    "standard": [
      "المعيار (STD-01) غير مكتمل. تم تقييم 3 من أصل 24 مؤشر."
    ]
  },
  "meta": null
}
```

---

### 3.4 ملخص ونسب اكتمال الشواهد (Evidence Summary)
* **المسار:** `GET /api/v1/schools/{school}/assessments/{assessment}/evidence-summary`
* **الهدف:** مقارنة الشواهد المرفوعة بمتطلبات الشواهد الإلزامية (278 متطلباً في النظام) وإبراز المؤشرات الناقصة.
* **ملاحظة:** متاح للاستدعاء في أي وقت، حتى لو كان التقييم قيد الإجراء، لمساعدة المقيّم على معرفة ما ينقصه.

#### نموذج الاستجابة (`200 OK`):
```json
{
  "data": {
    "evaluation_id": 1,
    "school_id": 1,
    "total_indicators": 109,
    "indicators_with_evidence": 95,
    "indicators_complete_evidence": 88,
    "indicators_missing_evidence": 14,
    "total_required_evidences": 278,
    "total_uploaded_evidences": 240,
    "overall_evidence_completion_rate": 86.33,
    "standards": [
      {
        "standard_id": 1,
        "code": "STD-01",
        "name": "الإدارة المدرسية",
        "total_indicators": 24,
        "indicators_with_evidence": 22,
        "indicators_complete_evidence": 20,
        "indicators_missing_evidence": 2,
        "total_required_evidences": 58,
        "total_uploaded_evidences": 50,
        "completion_rate": 86.21,
        "indicators": [
          {
            "indicator_id": 1,
            "code": "1-1-1",
            "name": "امتلاك رؤية ورسالة وقيم وأهداف واضحة ومعلنة",
            "required_count": 2,
            "uploaded_count": 2,
            "missing_count": 0,
            "completion_rate": 100,
            "is_satisfied": true
          }
        ]
      }
    ]
  },
  "message": "تم حساب ملخص الشواهد بنجاح.",
  "errors": null,
  "meta": null
}
```

---

### 3.5 ملخص خطط وإجراءات التحسين (Improvement Plans Summary)
* **المسار:** `GET /api/v1/schools/{school}/improvement-plans/summary`
* **الهدف:** إحصاء حالات الخطط وتحديد المتأخر منها ديناميكياً وفق المهل المحددة.

#### نموذج الاستجابة (`200 OK`):
```json
{
  "data": {
    "school_id": 1,
    "school_name": "مدرسة بلقيس الثانوية للبنات",
    "plans_summary": {
      "total_plans": 3,
      "in_progress_plans": 1,
      "completed_plans": 1,
      "draft_plans": 1,
      "cancelled_plans": 0,
      "delayed_plans": 1
    },
    "actions_summary": {
      "total_actions": 12,
      "pending_actions": 2,
      "in_progress_actions": 4,
      "completed_actions": 5,
      "cancelled_actions": 1,
      "delayed_actions": 2,
      "overall_completion_rate": 41.67
    },
    "plans": [
      {
        "plan_id": 1,
        "title": "الخطة التطويرية للفصل الدراسي الأول",
        "status": "Active",
        "start_date": "2026-09-01",
        "end_date": "2026-11-30",
        "is_delayed": true,
        "total_actions": 6,
        "pending_actions": 1,
        "in_progress_actions": 2,
        "completed_actions": 3,
        "delayed_actions": 1,
        "completion_rate": 50
      }
    ]
  },
  "message": "تم حساب ملخص خطط التحسين بنجاح.",
  "errors": null,
  "meta": null
}
```

---

### 3.6 تصدير تقرير التقييم الشامل بصيغة JSON (Export Assessment Report)
* **المسار:** `GET /api/v1/schools/{school}/assessments/{assessment}/export`
* **الهدف:** تصدير وثيقة التقييم الشاملة بتنسيق JSON مهيكل وجاهز للاستهلاك من الفرونت إند والأنظمة الوزارية.
* **الشرط:** يشترط اكتمال التقييم بنسبة 100%، وإلا يرجع خطأ `422`.

#### بنية التقرير المصدر:
```json
{
  "data": {
    "report_metadata": {
      "report_title": "تقرير نتائج التقييم الذاتي المدرسي الشامل",
      "report_type": "SelfEvaluationReport",
      "system_version": "1.0.0",
      "generated_at": "2026-10-26T23:30:00+03:00",
      "export_format": "JSON"
    },
    "school_information": {
      "school_id": 1,
      "school_name": "مدرسة بلقيس الثانوية للبنات",
      "educational_stage": "أساسي وثانوي",
      "educational_district": "معين",
      "governorate": "أمانة العاصمة"
    },
    "evaluation_context": {
      "evaluation_id": 1,
      "cycle_id": 1,
      "academic_year": "2025/2026",
      "status": "Completed",
      "is_locked": true
    },
    "executive_summary": {
      "final_score": 92.5,
      "max_score": 100,
      "performance_level": { "key": "outstanding", "label": "متميز" },
      "total_standards": 7,
      "total_indicators": 109,
      "strengths_count": 65,
      "improvement_opportunities_count": 12,
      "top_strengths": [
        {
          "indicator_id": 1,
          "code": "1-1-1",
          "name": "امتلاك رؤية ورسالة وقيم وأهداف واضحة ومعلنة",
          "standard_name": "الإدارة المدرسية",
          "score": 3
        }
      ],
      "priority_improvement_areas": [
        {
          "indicator_id": 10,
          "code": "1-2-5",
          "name": "تفعيل نظام المعلومات المدرسية",
          "standard_name": "الإدارة المدرسية",
          "score": 1,
          "level_label": "متحقق بدرجة ضعيفة"
        }
      ]
    },
    "standards_results": [ "..." ],
    "evidence_completion": { "..." },
    "improvement_plans_summary": { "..." }
  },
  "message": "تم تصدير تقرير التقييم بنجاح.",
  "errors": null,
  "meta": null
}
```
