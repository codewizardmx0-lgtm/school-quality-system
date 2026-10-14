<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ==============================================================================================
 * ملف Migration: create_evaluation_result_and_evidence_tables
 * ==============================================================================================
 * 
 * الجداول التي ينشئها الملف (حزمة ERD-03 الجزء الثاني):
 * 1. evaluation_results: نتائج تقدير كل مؤشر مقرونة بالوصف والإصدار المعياري.
 * 2. evidences: الشواهد والأدلة الداعمة لنتائج التقييم والمؤشرات.
 * 3. evidence_versions: النسخ التاريخية للشاهد عند الاستبدال أو التعديل أثناء الاستكمال.
 * 4. attachments: المرفقات والملفات المرفوعة (جدول متعدد الأشكال Polymorphic).
 * 5. notes: الملاحظات النصية الموثقة على نتائج التقييم.
 * 6. evaluation_result_verification_methods: أدوات وأساليب التحقق المستخدمة فعليًا في النتيجة.
 * 
 * الغرض الوظيفي:
 * يمثل جوهر عملية التقييم الذاتي: تسجيل الدرجة والشواهد والنسخ التاريخية والمرفقات والملاحظات.
 * 
 * ترتيب التنفيذ والعلاقات:
 * - evaluation_results ينشأ أولاً.
 * - evidences يعتمد على evaluation_results و indicators.
 * - evidence_versions يعتمد على evidences.
 * - attachments جدول متعدد الأهداف ولا يملك مفتاحًا أجنبيًا مباشرًا.
 * - notes و evaluation_result_verification_methods يعتمدان على evaluation_results.
 * 
 * القيود والقرارات الخاصة:
 * - المفاتيح الأساسية (PK): increments() نوع UNSIGNED INT.
 * - المفاتيح الأجنبية: تشير للجداول بالسلوك الافتراضي في MySQL دون أي CASCADE أو SET NULL صريح.
 * - جدول evaluation_result_verification_methods: تم استخدام أسماء صريحة ومختصرة للقيود الأجنبية
 *   ('ervm_result_id_foreign' و 'ervm_tool_id_foreign') لتفادي تجاوز الحد الأقصى لمعرّفات MySQL (64 حرفًا).
 * - جدول attachments: علاقة متعددة الأشكال (Polymorphic) عبر target_type و target_id، مع فهرس مركب
 *   دون مفتاح أجنبي مباشر بقاعدة البيانات.
 * - جدول evidence_versions وقيد current=true:
 *   [قرار معتمد]: قيد «نسخة واحدة فقط current=true لكل evidence_id» يُفرض في طبقة التطبيق
 *   (في الـ Model أو الـ Service أو الـ Validation) وليس في قاعدة البيانات، ولا يتم استخدام
 *   Generated Column أو Unique Index أو CHECK هنا.
 * ==============================================================================================
 */
return new class extends Migration
{
    /**
     * تشغيل التهجير وإنشاء جداول النتائج والشواهد والمرفقات.
     */
    public function up(): void
    {
        // --------------------------------------------------------------------------------------
        // جدول evaluation_results: نتيجة تقييم كل مؤشر
        // --------------------------------------------------------------------------------------
        Schema::create('evaluation_results', function (Blueprint $table) {
            $table->increments('result_id'); // المعرف الفريد لنتيجة التقييم (PK)
            $table->unsignedInteger('evaluation_id'); // ملف التقييم التابع له (FK)
            $table->unsignedInteger('indicator_id'); // المؤشر المُقيَّم (FK)
            $table->unsignedInteger('score_descriptor_id'); // وصف التقدير المختار (FK)
            $table->unsignedInteger('standard_version_id'); // الإصدار المعياري المرجعي (FK)
            $table->unsignedInteger('evaluator_user_id'); // المستخدم المقيم الذي سجل التقدير (FK)
            $table->integer('score'); // قيمة التقدير الرقمية المعتمدة (0, 1, 2, 3)
            $table->text('textual_result')->nullable(); // التعليل والتحليل النصي للنتيجة
            $table->string('completion_status', 20); // حالة اكتمال إدخال النتيجة (Pending, Completed)
            $table->dateTime('created_at'); // تاريخ ووقت إنشاء النتيجة
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تعديل للنتيجة

            $table->foreign('evaluation_id')->references('evaluation_id')->on('evaluations');
            $table->foreign('indicator_id')->references('indicator_id')->on('indicators');
            $table->foreign('score_descriptor_id')->references('descriptor_id')->on('indicator_score_descriptors');
            $table->foreign('standard_version_id')->references('version_id')->on('standard_versions');
            $table->foreign('evaluator_user_id')->references('user_id')->on('users');
        });

        // --------------------------------------------------------------------------------------
        // جدول evidences: الشواهد والأدلة الداعمة للنتيجة
        // --------------------------------------------------------------------------------------
        Schema::create('evidences', function (Blueprint $table) {
            $table->increments('evidence_id'); // المعرف الفريد للشاهد (PK)
            $table->unsignedInteger('result_id'); // نتيجة التقييم المدعومة بهذا الشاهد (FK)
            $table->unsignedInteger('indicator_id'); // سياق المؤشر المرتبط بالشاهد (FK)
            $table->string('title', 200); // عنوان الشاهد المرفق
            $table->text('description')->nullable(); // الوصف التفصيلي لمحتوى الشاهد
            $table->text('justification')->nullable(); // مبررات وأوجه دلالة الشاهد على المؤشر
            $table->dateTime('created_at'); // تاريخ ووقت تسجيل الشاهد
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تعديل للشاهد

            $table->foreign('result_id')->references('result_id')->on('evaluation_results');
            $table->foreign('indicator_id')->references('indicator_id')->on('indicators');
        });

        // --------------------------------------------------------------------------------------
        // جدول evidence_versions: النسخ التاريخية للشواهد
        // ملاحظة: قيد (نسخة واحدة فقط current=true لكل شاهد) يُفرض في طبقة التطبيق (Model/Service)
        // --------------------------------------------------------------------------------------
        Schema::create('evidence_versions', function (Blueprint $table) {
            $table->increments('evidence_version_id'); // المعرف الفريد لنسخة الشاهد (PK)
            $table->unsignedInteger('evidence_id'); // الشاهد الأصل التابعة له النسخة (FK)
            $table->integer('version_no'); // رقم النسخة المتسلسل (يبدأ من 1 ويتصاعد)
            $table->boolean('current'); // هل هذه النسخة هي المعتمدة الحالية (true/false)
            $table->dateTime('created_at'); // تاريخ إنشاء النسخة
            $table->dateTime('updated_at'); // تاريخ آخر تحديث

            $table->foreign('evidence_id')->references('evidence_id')->on('evidences');
        });

        // --------------------------------------------------------------------------------------
        // جدول attachments: الملفات والمرفقات المرفوعة (مرجع متعدد الأهداف Polymorphic)
        // لا يوجد مفتاح أجنبي مباشر؛ الربط عبر target_type و target_id
        // --------------------------------------------------------------------------------------
        Schema::create('attachments', function (Blueprint $table) {
            $table->increments('attachment_id'); // المعرف الفريد للمرفق (PK)
            $table->string('target_type', 30); // نوع الكيان المرتبط (evidence_version أو report)
            $table->unsignedInteger('target_id'); // معرّف الكيان المرتبط وفق نوعه
            $table->string('file_name', 255); // الاسم الأصلي للملف المرفوع
            $table->string('file_type', 100); // النوع الفعلي MIME للملف
            $table->bigInteger('file_size')->unsigned(); // حجم الملف بالبايت
            $table->string('storage_uri', 500); // مسار التخزين الآمن خارج مسار التنفيذ العام
            $table->dateTime('created_at'); // تاريخ رفع الملف
            $table->dateTime('updated_at'); // تاريخ آخر تحديث

            // فهرس مركب لتسريع استعلامات الربط متعدد الأشكال
            $table->index(['target_type', 'target_id']);
        });

        // --------------------------------------------------------------------------------------
        // جدول notes: الملاحظات النصية التوثيقية على النتائج
        // --------------------------------------------------------------------------------------
        Schema::create('notes', function (Blueprint $table) {
            $table->increments('note_id'); // المعرف الفريد للملاحظة (PK)
            $table->unsignedInteger('result_id'); // النتيجة الموثقة بالملاحظة (FK)
            $table->unsignedInteger('author_user_id'); // المستخدم كاتب الملاحظة (FK)
            $table->text('text'); // نص الملاحظة
            $table->dateTime('created_at'); // تاريخ ووقت كتابة الملاحظة
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تعديل للملاحظة

            $table->foreign('result_id')->references('result_id')->on('evaluation_results');
            $table->foreign('author_user_id')->references('user_id')->on('users');
        });

        // --------------------------------------------------------------------------------------
        // جدول evaluation_result_verification_methods: أساليب التحقق المستخدمة فعليًا في النتيجة
        // --------------------------------------------------------------------------------------
        Schema::create('evaluation_result_verification_methods', function (Blueprint $table) {
            $table->increments('id'); // المعرف الفريد للسجل (PK)
            $table->unsignedInteger('evaluation_result_id'); // نتيجة التقييم (FK)
            $table->unsignedInteger('tool_id'); // أداة التحقق المستخدمة (FK)

            // تسمية صريحة للقيود لتفادي تجاوز حد MySQL (64 حرفًا)
            $table->foreign('evaluation_result_id', 'ervm_result_id_foreign')->references('result_id')->on('evaluation_results');
            $table->foreign('tool_id', 'ervm_tool_id_foreign')->references('tool_id')->on('verification_tools');
        });
    }

    /**
     * إلغاء التهجير وحذف الجداول بترتيب عكسي آمن يحترم المفاتيح الأجنبية.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_result_verification_methods');
        Schema::dropIfExists('notes');
        Schema::dropIfExists('attachments');
        Schema::dropIfExists('evidence_versions');
        Schema::dropIfExists('evidences');
        Schema::dropIfExists('evaluation_results');
    }
};
