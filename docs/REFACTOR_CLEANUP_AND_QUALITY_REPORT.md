# تقرير التنظيف الهيكلي، التفكيك المعماري، الإصلاحات الحرجة، وتغطية الاختبارات

**التاريخ:** 2026-11-25  
**الفرع الجديد:** `refactor/codebase-cleanup-and-testing` (مُشتق من `develop` عند الـ Commit `26267e6`)  
**الـ Commit المسجّل:** `7535c80` — `refactor(architecture,tests): modularize backend/frontend, add Vitest & live health, and harden seeders and test isolation`  
**الحالة العامة:** مكتمل ومتحقق منه بنجاح (`516/516` PHPUnit، `tsc -b && vite build` ناجح، `12/12` Vitest)

---

## 1. الملخص التنفيذي وما تم التحقق منه

أُنشئ فرع جديد نظيف باسم `refactor/codebase-cleanup-and-testing` انطلاقاً من `develop` (`26267e6`، علماً أن شجرة `feature/ministry-supervisor-standards-ui` عند `40274d3` كانت مطابقة تماماً له بـ `0` اختلافات).  
تمت مراجعة كافة العناصر الـ **130** (`70` معدّلاً، `21` محذوفاً، `39` مضافاً — وتظهر في ملخص `git commit` بصيغة `129 files changed` لأن Git ربط حذف `frontend-prototype/verification-guide.md` وإنشاء `docs/archive/prototype/verification-guide.md` تلقائياً كعملية `rename 100%`) والتأكد من سلامتها ومشروعيتها بالكامل قبل تثبيت الـ Commit `7535c80`.

### أبرز المحاور المنجزة:
1. **تنظيف الجذور وأرشفة النموذج الأولي:** إزالة 15 سكربتاً مؤقتاً من الجذر ومجلد `scratch/` و`school-eval-api/`، وإزالة نسخة PDF مكررة (`docs/graduation_doc.pdf` المطابقة بالبايت لـ `docs/‏‏‏‏‏‏النسخة النهائية كامل 5.pdf`)، وأرشفة دليل التحقق من `frontend-prototype/` إلى `docs/archive/prototype/verification-guide.md`.
2. **التفكيك المعماري في Laravel API:** تقسيم المتحكمات الضخمة (`AdminController`, `EvaluatorApiController`, `StandardManagementController`, `SupervisionController`) إلى متحكمات متخصصة وTraits مشتركة (`Concerns/`) وخدمة تدقيق مستقلة (`EvaluationAuditService`)، وتجزئة ملف المسارات `routes/api.php` إلى 5 ملفات معيارية داخل `routes/api/`.
3. **إصلاحات حرجة في قاعدة البيانات والـ Seeders ومنطق الأعمال:**
   - جعل حقلي `score` و`score_descriptor_id` قابلين للـ `NULL` في `evaluation_results` لمنع تعطل `storeIndicatorReviewNote()` على المؤشرات غير المرصودة.
   - إصلاح `IndicatorEvidenceRequirementSeeder` ليحدّث المتطلبات في مكانها مع الحفاظ على معرفات `requirement_id` بدلاً من حذفها وإعادة إدراجها (ما كان يكسر مصفوفات `covered_requirements` في `evidence_links` عند إعادة التشغيل).
   - إصلاح `ImprovementSuggestionController` لدعم علامة `isAlreadyAdopted = true` لمجال التحسين المتبنى قبل ربطه بخطة نشطة، مع الإبقاء على `isPreviouslyAdopted` للمجالات المؤرشفة.
   - تصحيح استعلام سجل الحوادث الأمنية في `AdminController::dashboardStats` ليستخدم العمود الفعلي `action = 'auth.login_failed'` بدلاً من عمود غير موجود (`event_category`).
4. **القياس الحي لصحة الخادم والتحميل البطئ وتفكيك الواجهة (`React`):**
   - بث قياسات الخادم الحية (`systemHealthDetails`) من الخلفية إلى لوحة مدير النظام.
   - تفعيل `React.lazy` و`Suspense` مع `PortalLoader` وتقسيم حزم البناء في `vite.config.ts`.
   - استخراج مكونات مستقلة من الشاشات الكبيرة (`AdminDashboard`, `ImprovementPlanPage`, `EvidencesRepository`, `RubricAssessmentPage`, `CyclesListPage`, `AdoptSuggestionModal`).
5. **اختبارات الواجهة الأمامية (`Vitest`) وتحسين `TypeScript` و`ESLint` وعزل اختبارات `PHPUnit`:**
   - إنشاء حزمة اختبارات `Vitest` + `@testing-library/react` (`12/12` اختباراً ناجحاً).
   - تغطية كافة ملفات اختبارات الميزات بـ `DatabaseTransactions` ومعالجة اعتمادها على البيانات المتبقية.
   - خفض ملاحظات `ESLint` في `school-eval-web` من **675** إلى **312** وتصفير أخطاء `rules-of-hooks` و`no-useless-escape` و`immutability` و`purity` و`only-export-components` و`no-unused-vars`، وإزالة `any` من طبقات الـ API الأربع الرئيسة.

---

## 2. نتائج التحقق النهائية (Verification Ground Truth)

| المسار | الأداة / الأمر | النتيجة المرصودة |
|---|---|---|
| الخلفية (`school-eval-api`) | `php artisan test` | **516 / 516 اختباراً ناجحاً** (`14,468` assertions، `100.24s`، 0 إخفاقات) |
| بناء الواجهة (`school-eval-web`) | `npm.cmd run build` (`tsc -b && vite build`) | **نجح بالكامل** (`754ms`، `2235` modules، 0 أخطاء TypeScript) |
| اختبارات الواجهة (`school-eval-web`) | `npm.cmd test` (`vitest run`) | **2 ملفان / 12 اختباراً ناجحاً** (`utils.test.ts`: 7، `portalComponents.test.tsx`: 5) |
| تدقيق `ESLint` (`school-eval-web`) | `node node_modules/eslint/bin/eslint.js src -f json` | انخفض الإجمالي **675 ← 312** (`no-explicit-any`: `206`، `set-state-in-effect`: `85`، `exhaustive-deps`: `13`، `preserve-manual-memoization`: `8`؛ **0** أخطاء hook-rules / unused-vars / useless-escape / export-components) |

---

## 3. السجل الكامل للملفات الـ 130 وسبب كل تعديل

> **ملاحظة تدقيق:** تم فحص القائمة الكاملة عبر `git status --porcelain --untracked-files=all` و`git diff-tree --no-commit-id --name-status --no-renames -r 7535c80` (`130` عنصراً بالضبط)، وكلها ناتجة عن عملياتنا الهندسية وخالية من أي ملفات غريبة أو مخلفات مؤقتة.

### أولاً: الجذر والتوثيق والأرشفة والتنظيف (24 عنصراً: `2 M`, `21 D`, `1 A`)

| الحالة | المسار | السبب الهندسي |
|---|---|---|
| `M` | `.gitignore` | استثناء مجلدات وملفات `scratch/` و`scratch_*` لمنع تلوث المستودع مستقبلاً. |
| `M` | `README.md` | تحديث هيكلة المشروع بعد إزالة النموذج الأولي وتحديث إحصاءات الاختبارات (`516` PHPUnit و`12` Vitest). |
| `A` | `docs/archive/prototype/verification-guide.md` | أرشفة دليل التحقق التفاعلي المنقول من `frontend-prototype/verification-guide.md` (`rename 100%` في Git). |
| `D` | `docs/graduation_doc.pdf` | إزالة نسخة PDF المكررة بالبايت (`7,053,636` بايت) مع الإبقاء على النسخة المعتمدة `docs/‏‏‏‏‏‏النسخة النهائية كامل 5.pdf`. |
| `D` | `extract_doc.php` | إزالة سكربت استخراج مؤقت في جذر المشروع. |
| `D` | `frontend-prototype/README.md` | إزالة ملفات النموذج الأولي القديم بعد اكتمال تطبيق `React` (`school-eval-web`). |
| `D` | `frontend-prototype/app.js` | إزالة ملفات النموذج الأولي القديم بعد اكتمال تطبيق `React`. |
| `D` | `frontend-prototype/index.html` | إزالة ملفات النموذج الأولي القديم بعد اكتمال تطبيق `React`. |
| `D` | `frontend-prototype/style.css` | إزالة ملفات النموذج الأولي القديم بعد اكتمال تطبيق `React`. |
| `D` | `frontend-prototype/verification-guide.md` | نُقل وأُرشف إلى `docs/archive/prototype/verification-guide.md`. |
| `D` | `school-eval-api/check_standards_user.php` | إزالة سكربت فحص يدوي مؤقت من جذر الـ API. |
| `D` | `school-eval-api/test_standards_suite.php` | إزالة سكربت اختبار يدوي مؤقت بعد توفر تغطية PHPUnit الشاملة. |
| `D` | `scratch/build_structure.php` | إزالة سكربتات التجربة والاستخراج المؤقتة من مجلد `scratch/`. |
| `D` | `scratch/check_db_evals.php` | إزالة سكربت تجربة مؤقت من `scratch/`. |
| `D` | `scratch/check_fr_sup_18.py` | إزالة سكربت فحص مؤقت من `scratch/`. |
| `D` | `scratch/check_templates.php` | إزالة سكربت فحص قوالب مؤقت من `scratch/`. |
| `D` | `scratch/extract_historical.py` | إزالة سكربت استخراج مؤقت من `scratch/`. |
| `D` | `scratch/extract_verbatim.py` | إزالة سكربت استخراج مؤقت من `scratch/`. |
| `D` | `scratch/generate_templates.php` | إزالة سكربت توليد قوالب مؤقت من `scratch/`. |
| `D` | `scratch/generate_ts_templates.php` | إزالة سكربت توليد قوالب TypeScript مؤقت من `scratch/`. |
| `D` | `scratch/list_images.php` | إزالة سكربت مؤقت من `scratch/`. |
| `D` | `scratch/move_duplicates.php` | إزالة سكربت مؤقت من `scratch/`. |
| `D` | `scratch/parse_templates_info.php` | إزالة سكربت مؤقت من `scratch/`. |
| `D` | `scratch/verify_structure.php` | إزالة سكربت تحقق مؤقت من `scratch/`. |

---

### ثانياً: الخلفية البرمجية — المتحكمات والخدمات والهجرات والمسارات والـ Seeders (`26` عنصراً: `7 M`, `19 A`)

| الحالة | المسار | السبب الهندسي |
|---|---|---|
| `M` | `school-eval-api/app/Http/Controllers/Api/V1/AdminController.php` | تقليص المتحكم بنقل العمليات المتخصصة لمتحكمات فرعية، وتزويد `dashboardStats()` بمقاييس `systemHealthDetails` الحية وتصحيح استعلام `AuditLog` (`action = auth.login_failed`). |
| `M` | `school-eval-api/app/Http/Controllers/Api/V1/EvaluatorApiController.php` | تقليص المتحكم من ~4,241 إلى ~952 سطراً بتفكيك مسارات الشواهد والتحسين والتسليم لمتحكمات متخصصة، وتفويض التدقيق إلى `EvaluationAuditService`. |
| `M` | `school-eval-api/app/Http/Controllers/Api/V1/ImprovementSuggestionController.php` | إصلاح حساب `isAlreadyAdopted` عند تبنّي مجال تحسين قبل ربطه بخطة نشطة مع الإبقاء على تمييز الخطط المؤرشفة. |
| `M` | `school-eval-api/app/Http/Controllers/Api/V1/StandardManagementController.php` | تقليص المتحكم ونقل عمليات الحوكمة والفروقات والأوزان إلى `StandardGovernanceController`. |
| `M` | `school-eval-api/app/Http/Controllers/Api/V1/SupervisionController.php` | تقليص المتحكم ونقل عمليات المراجعة والتحليلات إلى `SupervisionReviewController` و`SupervisionAnalyticsController`. |
| `M` | `school-eval-api/database/seeders/IndicatorEvidenceRequirementSeeder.php` | تحديث متطلبات الشواهد في مكانها للحفاظ على قيم `requirement_id` ومنع كسر `covered_requirements` في `evidence_links` عند إعادة تشغيل `db:seed`. |
| `M` | `school-eval-api/routes/api.php` | تحويله إلى نقطة تحميل معيارية نظيفة تستدعي ملفات `routes/api/*.php`. |
| `A` | `school-eval-api/app/Http/Controllers/Api/V1/AdminBackupController.php` | فصل نقاط نهاية النسخ الاحتياطي عن `AdminController`. |
| `A` | `school-eval-api/app/Http/Controllers/Api/V1/AdminDirectorateController.php` | فصل إدارة المديريات التعليمية عن `AdminController`. |
| `A` | `school-eval-api/app/Http/Controllers/Api/V1/AdminSecurityController.php` | فصل سياسات الأمان وحظر عناوين IP عن `AdminController`. |
| `A` | `school-eval-api/app/Http/Controllers/Api/V1/AdminSystemSettingsController.php` | فصل إعدادات النظام والتكامل ووضع الصيانة عن `AdminController`. |
| `A` | `school-eval-api/app/Http/Controllers/Api/V1/Concerns/ResolvesEvaluatorContext.php` | سمة مشتركة (Trait) لحل سياق التقييم النشط والإصدار المعياري بين متحكمات بوابة المقيّم. |
| `A` | `school-eval-api/app/Http/Controllers/Api/V1/Concerns/ResolvesSupervisorScope.php` | سمة مشتركة (Trait) لفرض النطاق الجغرافي وصلاحيات المشرف عبر متحكمات الإشراف. |
| `A` | `school-eval-api/app/Http/Controllers/Api/V1/EvaluatorEvidenceController.php` | فصل عمليات الشواهد، النسخ التاريخية، والجرد عن `EvaluatorApiController`. |
| `A` | `school-eval-api/app/Http/Controllers/Api/V1/EvaluatorImprovementController.php` | فصل إدارة خطط وإجراءات التحسين والكتالوج والمقترحات عن `EvaluatorApiController`. |
| `A` | `school-eval-api/app/Http/Controllers/Api/V1/EvaluatorSubmissionController.php` | فصل فحص ما قبل الإرسال، التسليم النهائي، وإعادة إرسال الاستكمال عن `EvaluatorApiController`. |
| `A` | `school-eval-api/app/Http/Controllers/Api/V1/StandardGovernanceController.php` | فصل معايرة الأوزان، سجل الفروقات، وفحص القفل والإقرار عن `StandardManagementController`. |
| `A` | `school-eval-api/app/Http/Controllers/Api/V1/SupervisionAnalyticsController.php` | فصل التقارير المركزية والمقارنات التاريخية وتقارير المتابعة عن `SupervisionController`. |
| `A` | `school-eval-api/app/Http/Controllers/Api/V1/SupervisionReviewController.php` | فصل فحص المخرجات، رصد النواقص، طلبات الاستكمال، والإغلاق عن `SupervisionController`. |
| `A` | `school-eval-api/app/Services/EvaluationAuditService.php` | استخراج منطق تدقيق التناقضات ومركز المراجعة والتدقيق من `EvaluatorApiController`. |
| `A` | `school-eval-api/database/migrations/2026_11_25_000000_make_evaluation_result_score_nullable.php` | جعل `score` و`score_descriptor_id` قابلين للـ `NULL` في `evaluation_results` لدعم تدوين ملاحظات المدير على المؤشرات غير المرصودة. |
| `A` | `school-eval-api/routes/api/auth_admin.php` | تقسيم مسارات المصادقة وبوابة مدير النظام. |
| `A` | `school-eval-api/routes/api/evaluations_reports.php` | تقسيم مسارات التقييمات والشواهد والتقارير. |
| `A` | `school-eval-api/routes/api/evaluator.php` | تقسيم مسارات مقيّم المدرسة ومدير المدرسة. |
| `A` | `school-eval-api/routes/api/standards.php` | تقسيم مسارات إدارة المعايير والإصدارات. |
| `A` | `school-eval-api/routes/api/supervision.php` | تقسيم مسارات بوابة المشرف الوزاري. |

---

### ثالثاً: الخلفية البرمجية — اختبارات `PHPUnit` (`12` عنصراً: `12 M`)

| الحالة | المسار | السبب الهندسي |
|---|---|---|
| `M` | `school-eval-api/tests/Feature/Batch1EvaluatorDataAndCycleTest.php` | إضافة `DatabaseTransactions` لعزل الاختبارات ومنع تسرب البيانات بين التشغيلات. |
| `M` | `school-eval-api/tests/Feature/Batch2FarouqAndUnifiedExcelTest.php` | إضافة `DatabaseTransactions` وإزالة استيراد `RefreshDatabase` غير المستخدم. |
| `M` | `school-eval-api/tests/Feature/Batch3And4EvaluatorFeaturesTest.php` | إضافة `DatabaseTransactions` لضمان تراجع كل تعديلات الاختبار تلقائياً. |
| `M` | `school-eval-api/tests/Feature/Batch5DetailedReportExportTest.php` | إضافة `DatabaseTransactions` لعزل حالات الاختبار. |
| `M` | `school-eval-api/tests/Feature/BatchBDataAccuracyAndAiTest.php` | إضافة `DatabaseTransactions` لعزل اختبار تحليل الذكاء وإشعارات الـ Seeder. |
| `M` | `school-eval-api/tests/Feature/BatchDVerificationAndSufficiencyTest.php` | إضافة `DatabaseTransactions` لعزل اختبارات كفاية الشواهد. |
| `M` | `school-eval-api/tests/Feature/BatchEImprovementPlansAndArchiveTest.php` | إضافة `DatabaseTransactions` وتغليف حذف الأرشيف المؤقت بـ `try...finally`. |
| `M` | `school-eval-api/tests/Feature/BatchFMetricsAndCatalogTest.php` | إضافة `DatabaseTransactions` لعزل اختبارات السياق الإحصائي والكتالوج. |
| `M` | `school-eval-api/tests/Feature/EvaluatorScreenRegressionTest.php` | ضمان استقلالية اختبار تحديث بيانات المستند بإنشاء `SchoolDocument` تجريبي داخل المعاملة عند عمله على قاعدة نظيفة. |
| `M` | `school-eval-api/tests/Feature/EvaluatorSuiteFeatureTest.php` | إضافة `DatabaseTransactions` لعزل اختبارات جناح المقيّم. |
| `M` | `school-eval-api/tests/Feature/SchoolPrincipalWorkflowTest.php` | إضافة الاختبار الانحداري `test_principal_can_submit_review_note_on_unscored_indicator_safely` للتحقق من تدوين الملاحظة على مؤشر غير مرصود (`score = null`). |
| `M` | `school-eval-api/tests/Feature/StandardsAndSeedersIntegrityTest.php` | إضافة `DatabaseTransactions` لمنع تسرب إعادة تشغيل `DatabaseSeeder` لباقي ملفات الاختبار. |

---

### رابعاً: الواجهة الأمامية — الإعدادات وبنية اختبارات `Vitest` (`8` عناصر: `4 M`, `4 A`)

| الحالة | المسار | السبب الهندسي |
|---|---|---|
| `M` | `school-eval-web/eslint.config.js` | تهيئة تجاهل البادئة `^_` في `no-unused-vars` والسماح بتصدير `useAuth` في `only-export-components`. |
| `M` | `school-eval-web/package.json` | إضافة سكربت `"test": "vitest run"` وتبعيات التطوير (`vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`). |
| `M` | `school-eval-web/package-lock.json` | تثبيت إصدارات حزم الاختبار المضافة في `package.json`. |
| `M` | `school-eval-web/vite.config.ts` | تهيئة تقسيم الحزم (`manualChunks`) لتحسين التحميل البطئ للمكتبات والبوابات. |
| `A` | `school-eval-web/vitest.config.ts` | إعداد بيئة `jsdom` وتهيئة Vitest لاختبار مكونات ووظائف React. |
| `A` | `school-eval-web/src/test/setup.ts` | ملف التهيئة العامة لمطابقات `@testing-library/jest-dom` قبل الاختبارات. |
| `A` | `school-eval-web/src/test/utils.test.ts` | اختبارات وحدة (7 اختبارات) لأدوات التاريخ والتصدير المنسق. |
| `A` | `school-eval-web/src/test/portalComponents.test.tsx` | اختبارات مكونات React (5 اختبارات) تغطي `PortalLoader`, `AdminSystemHealthWidget`, `EvidenceVaultStatsCards`, و`PlanSummaryCards`. |

---

### خامساً: الواجهة الأمامية — المكونات، البوابات، الـ API، وتنظيف الأنواع (`60` عنصراً: `45 M`, `15 A`)

#### 1) المكونات والأدوات المستخرجة والمضافة (`15 A`)

| الحالة | المسار | السبب الهندسي |
|---|---|---|
| `A` | `school-eval-web/src/components/ui/PortalLoader.tsx` | شاشة تحميل موحدة لـ `React.Suspense` أثناء التحميل البطئ للبوابات. |
| `A` | `school-eval-web/src/features/admin/components/dashboard/AdminAuditStreamCard.tsx` | فصل بطاقة بث سجل التدقيق الحية من `AdminDashboard`. |
| `A` | `school-eval-web/src/features/admin/components/dashboard/AdminSystemHealthWidget.tsx` | فصل ويدجت صحة الخادم والبنية التحتية وربطها بمقاييس `systemHealthDetails` الحية. |
| `A` | `school-eval-web/src/features/admin/components/dashboard/AdminUrgentSchoolsWidget.tsx` | فصل بطاقة المدارس غير المكتملة التهيئة من `AdminDashboard`. |
| `A` | `school-eval-web/src/features/evaluation/components/evidences/EvidenceVaultStatsCards.tsx` | فصل بطاقات إحصاءات خزانة الشواهد من `EvidencesRepository`. |
| `A` | `school-eval-web/src/features/evaluation/components/improvement-plan/MasterPlansSection.tsx` | فصل قسم استعراض الخطط الثلاث الرئيسة من `ImprovementPlanPage`. |
| `A` | `school-eval-web/src/features/evaluation/components/improvement-plan/PlanActionFilterBar.tsx` | فصل شريط البحث والتصفية للإجراءات من `ImprovementPlanPage`. |
| `A` | `school-eval-web/src/features/evaluation/components/improvement-plan/PlanActionsTable.tsx` | فصل جدول إجراءات خطة التحسين وحالاتها وتقدمها من `ImprovementPlanPage`. |
| `A` | `school-eval-web/src/features/evaluation/components/improvement-plan/PlanExplanationsCard.tsx` | فصل بطاقة الدليل التوضيحي لمسارات الخطط من `ImprovementPlanPage`. |
| `A` | `school-eval-web/src/features/evaluation/components/improvement-plan/PlanReviewNotesSection.tsx` | فصل قسم ملاحظات المراجعة الداخلية للخطة من `ImprovementPlanPage`. |
| `A` | `school-eval-web/src/features/evaluation/components/improvement-plan/PlanSummaryCards.tsx` | فصل بطاقات ملخص الإجراءات والتأخير ونسب الإنجاز من `ImprovementPlanPage`. |
| `A` | `school-eval-web/src/features/evaluation/components/self-evaluation/RubricVerificationToolsCard.tsx` | فصل بطاقة أدوات ووسائل التحقق من `RubricAssessmentPage`. |
| `A` | `school-eval-web/src/features/evaluation/utils/planRecommendation.ts` | نقل دالة `getRecommendedPlanType` لملف أدوات مستقل لمعالجة قاعدة `only-export-components`. |
| `A` | `school-eval-web/src/features/supervision/components/cycles/CloseCycleModal.tsx` | فصل نافذة تأكيد إغلاق الدورة التقييمية من `CyclesListPage`. |
| `A` | `school-eval-web/src/features/supervision/components/cycles/ParticipatingSchoolsModal.tsx` | فصل نافذة عرض وإلحاق المدارس بالدورة من `CyclesListPage`. |

#### 2) ملفات الواجهة المعدّلة (`45 M`)

| الحالة | المسار | السبب الهندسي |
|---|---|---|
| `M` | `school-eval-web/src/AppContent.tsx` | تطبيق التحميل البطئ (`React.lazy` + `Suspense` + `PortalLoader`) لتخطيطات البوابات الخمس. |
| `M` | `school-eval-web/src/api/apiTypes.ts` | إضافة نوع `JsonRecord` ودالة `extractApiErrorMessage` الموحدة لإزالة `any` في معالجة الأخطاء. |
| `M` | `school-eval-web/src/components/ui/InteractiveDonutChart.tsx` | إصلاح خطأ `react-hooks/immutability` باستخدام `.reduce()` بدل إعادة تعيين متغير خارجي. |
| `M` | `school-eval-web/src/features/admin/api/dashboardApi.ts` | إضافة واجهة `systemHealthDetails` لاستقبال مقاييس الخادم الحية. |
| `M` | `school-eval-web/src/features/admin/api/usersApi.ts` | استبدال كافة استخدامات `any` بأنواع صريحة وتطبيع آمن. |
| `M` | `school-eval-web/src/features/admin/components/audit/SecurityAudit.tsx` | إزالة متغيرات غير مستخدمة وتنظيف `ESLint`. |
| `M` | `school-eval-web/src/features/admin/components/dashboard/AdminDashboard.tsx` | تفكيك اللوحة لويدجتات مستقلة، ربط بيانات `systemHealthDetails` الحية، وإزالة `any` وتحذير `exhaustive-deps`. |
| `M` | `school-eval-web/src/features/admin/components/layout/AdminLayout.tsx` | دعم التحميل البطئ للصفحات الفرعية وتنظيف الواردات غير المستخدمة. |
| `M` | `school-eval-web/src/features/admin/components/schools/RegisterSchoolModal.tsx` | إصلاح `react-hooks/immutability` بتغليف `loadDirectoratesAndCode` بـ `useCallback` قبل استدعائها في `useEffect`. |
| `M` | `school-eval-web/src/features/admin/utils/exportUtils.ts` | استبدال `(ws as any)` و`(wb as any)` بتوسيع نوع صريح متوافق مع SheetJS (`XLSX`). |
| `M` | `school-eval-web/src/features/auth/ForgotPasswordModal.tsx` | إصلاح استدعاء الـ Hooks قبل `return null` لمعالجة `react-hooks/rules-of-hooks`. |
| `M` | `school-eval-web/src/features/evaluation/api/evaluationTypes.ts` | إضافة الحقل الاختياري `needsReplacement` على `EvidenceItem`. |
| `M` | `school-eval-web/src/features/evaluation/api/evaluatorApi.ts` | استبدال كافة استخدامات `any` الـ 17 بأنواع صريحة مع الحفاظ التام على التوافق. |
| `M` | `school-eval-web/src/features/evaluation/components/ai-assistant/AdoptSuggestionModal.tsx` | استيراد `getRecommendedPlanType` من ملفها المستقل لعلاج `only-export-components`. |
| `M` | `school-eval-web/src/features/evaluation/components/ai-assistant/FormulaSuggestionsSection.tsx` | تحديث استيراد `getRecommendedPlanType` من `utils/planRecommendation.ts`. |
| `M` | `school-eval-web/src/features/evaluation/components/audit-hub/AuditReviewHubPage.tsx` | معالجة `no-useless-assignment` وتنظيف `ESLint`. |
| `M` | `school-eval-web/src/features/evaluation/components/evidences/EditEvidenceMetadataModal.tsx` | إصلاح `react-hooks/rules-of-hooks` بنقل `return null` بعد الـ Hooks. |
| `M` | `school-eval-web/src/features/evaluation/components/evidences/EvidencesRepository.tsx` | فصل `EvidenceVaultStatsCards` وإزالة `any` و`no-useless-assignment` وواردات غير مستخدمة. |
| `M` | `school-eval-web/src/features/evaluation/components/evidences/LinkEvidenceModal.tsx` | معالجة `prefer-const` وتنظيف الـ Hooks. |
| `M` | `school-eval-web/src/features/evaluation/components/evidences/UploadEvidenceModal.tsx` | إصلاح `react-hooks/rules-of-hooks` بنقل الشرط المبكر بعد الـ Hooks. |
| `M` | `school-eval-web/src/features/evaluation/components/final-review/FinalSubmissionLockModal.tsx` | إصلاح `react-hooks/rules-of-hooks` بنقل الشرط المبكر بعد الـ Hooks. |
| `M` | `school-eval-web/src/features/evaluation/components/improvement-plan/ActionProgressModal.tsx` | إصلاح `react-hooks/rules-of-hooks` بنقل الشرط المبكر بعد الـ Hooks. |
| `M` | `school-eval-web/src/features/evaluation/components/improvement-plan/ImprovementPlanPage.tsx` | تفكيك الشاشة إلى 6 مكونات فرعية وتغليف `actions` بـ `useMemo` واستبدال `err: any` بـ `extractApiErrorMessage`. |
| `M` | `school-eval-web/src/features/evaluation/components/layout/EvaluatorLayout.tsx` | دعم التحميل البطئ لشاشات بوابة المقيّم ومدير المدرسة وتوحيد نمط البوابة. |
| `M` | `school-eval-web/src/features/evaluation/components/self-evaluation/RubricAssessmentPage.tsx` | فصل `RubricVerificationToolsCard` وإزالة الواردات الزائدة ومعالجة الأخطاء بـ `extractApiErrorMessage`. |
| `M` | `school-eval-web/src/features/evaluation/components/self-evaluation/UnifiedStandardsAssessmentPage.tsx` | تنظيف وتوافق التقييم الموحد وتفادي أخطاء `ESLint` السطحية. |
| `M` | `school-eval-web/src/features/evaluation/data/evidenceTemplates.ts` | إزالة 142 هروباً زائداً (`\/` ← `/`) لمعالجة `no-useless-escape`. |
| `M` | `school-eval-web/src/features/standards/api/standardsApi.ts` | استبدال كافة استخدامات `any` الـ 43 بأنواع صريحة (`RawRecord` / `unknown` / DTOs). |
| `M` | `school-eval-web/src/features/standards/components/layout/StandardsLayout.tsx` | دعم التحميل البطئ لشاشات بوابة إدارة المعايير. |
| `M` | `school-eval-web/src/features/standards/components/versions/StandardsVersionsPage.tsx` | إصلاح `prefer-const` وتنظيف قواعد `ESLint`. |
| `M` | `school-eval-web/src/features/standards/components/workspace/StandardVersionWorkspacePage.tsx` | إزالة `no-useless-catch` وتنظيف الكود. |
| `M` | `school-eval-web/src/features/standards/utils/standardsExportUtils.ts` | إزالة كافة `any` الثمانية واستبدالها بأنواع بيانات التصدير والترويسة الصريحة. |
| `M` | `school-eval-web/src/features/supervision/api/supervisionApi.ts` | إزالة كافة `any` الـ 32 وتوحيد جلب ملفات الشواهد في المساعد المشترك `fetchDocumentVersionBlob` و`unwrapArray`. |
| `M` | `school-eval-web/src/features/supervision/api/supervisionTypes.ts` | إضافة واجهة `AvailableCycleSummary` وتضييق أنواع الدورات المتاحة. |
| `M` | `school-eval-web/src/features/supervision/components/common/SharedDeficiencyFormFields.tsx` | حصر `UNLOCK_PERMISSION_OPTIONS` و`DEFICIENCY_CATEGORIES` محلياً لمعالجة `only-export-components`. |
| `M` | `school-eval-web/src/features/supervision/components/completion/CreateCompletionRequestPage.tsx` | إصلاح `react-hooks/purity` باستبدال `Date.now()` المباشر في التصيير بـ `useState(() => Date.now())`. |
| `M` | `school-eval-web/src/features/supervision/components/completion/ExtendDeadlineModal.tsx` | إصلاح `react-hooks/rules-of-hooks` بنقل الشرط المبكر بعد الـ Hooks. |
| `M` | `school-eval-web/src/features/supervision/components/cycles/CycleFormTab.tsx` | استبدال كافة `any` الثمانية بنوع `CycleAvailableSchool` ومعالجة `err: unknown` وتنظيف متغير غير مستخدم. |
| `M` | `school-eval-web/src/features/supervision/components/cycles/CyclesListPage.tsx` | تفكيك نوافذ `CloseCycleModal` و`ParticipatingSchoolsModal` وإزالة كافة `any` الثمانية. |
| `M` | `school-eval-web/src/features/supervision/components/dashboard/SchoolsStatusMatrixTable.tsx` | معالجة `no-useless-assignment` وتنظيف تعيين غير مستخدم. |
| `M` | `school-eval-web/src/features/supervision/components/layout/SupervisionLayout.tsx` | دعم التحميل البطئ لشاشات بوابة المشرف الوزاري وتنسيق الاستيراد. |
| `M` | `school-eval-web/src/features/supervision/components/reports/HistoricalComparisonPage.tsx` | ربط اختيار الدورات بنوع `AvailableCycleSummary` وإزالة `any`. |
| `M` | `school-eval-web/src/features/supervision/components/review/SupervisionEvidenceVaultTab.tsx` | تغليف `documents` بـ `useMemo` لمعالجة `exhaustive-deps` وإبقاء `translateDocType` محلياً لمعالجة `only-export-components`. |
| `M` | `school-eval-web/src/features/supervision/components/tracking/MilestoneTimelineView.tsx` | معالجة `prefer-const` لثابت خط زمني. |
| `M` | `school-eval-web/src/features/supervision/hooks/useCentralReports.ts` | استخدام `AvailableCycleSummary[]` بدلاً من `any[]` لحالة الدورات المتاحة. |

---

## 4. الخطوات التالية المقترحة
- مراجعة التعديلات على الفرع الحالي `refactor/codebase-cleanup-and-testing`.
- في حال رغبتك بضم هذا التقرير إلى تاريخ الـ Git قبل الدفع (`git push`)، يمكنك عمل commit إضافي بسيط (`docs: add refactor cleanup and quality report`) ثم دمج الفرع إلى `develop` عند اعتمادك.
