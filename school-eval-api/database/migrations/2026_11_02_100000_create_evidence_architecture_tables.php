<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * تهجير المعمارية النظيفة ثلاثية المستويات للشواهد والمستندات المدرسية (U-24 / الخطوة 1).
 *
 * ينشئ ثلاثة جداول معمارية مستقلة:
 * 1. school_documents: الوعاء الوثائقي للمستند على مستوى المدرسة.
 * 2. document_versions: النسخ والملفات الفيزيائية المرفوعة للمستند مع تتبع الإصدارات.
 * 3. evidence_links: روابط الاستدلال التقييمية لربط نسخة المستند بمؤشر محدد في تقييم محدد.
 */
return new class extends Migration
{
    /**
     * تشغيل التهجير وإنشاء الجداول الثلاثة مع قيود العزل والتكامل المرجعي.
     */
    public function up(): void
    {
        // --------------------------------------------------------------------------------------
        // 1. جدول school_documents: المستند المدرسي
        // --------------------------------------------------------------------------------------
        Schema::create('school_documents', function (Blueprint $table) {
            $table->increments('id'); // المعرف الفريد للمستند (PK)
            $table->unsignedInteger('school_id'); // المدرسة المالكة للمستند (عزل مؤسسي)
            $table->string('title', 200); // عنوان المستند
            $table->string('document_type', 50)->default('other'); // نوع المستند (minutes, plan, record, report, board, image, other)
            $table->text('description')->nullable(); // وصف المستند
            $table->unsignedInteger('created_by_user_id')->nullable(); // المستخدم الذي أنشأ المستند
            $table->timestamps();

            // المفاتيح الأجنبية
            $table->foreign('school_id')->references('school_id')->on('schools');
            $table->foreign('created_by_user_id')->references('user_id')->on('users');

            // فهارس لتسريع استعلامات العزل والنوع
            $table->index(['school_id', 'document_type']);
        });

        // --------------------------------------------------------------------------------------
        // 2. جدول document_versions: نسخ الملفات الفعلية المرفوعة
        // --------------------------------------------------------------------------------------
        Schema::create('document_versions', function (Blueprint $table) {
            $table->increments('id'); // المعرف الفريد لنسخة المستند (PK)
            $table->unsignedInteger('school_id'); // المدرسة (عزل مؤسسي صريح)
            $table->unsignedInteger('school_document_id'); // المستند الأب التابعة له هذه النسخة
            $table->integer('version_no')->default(1); // رقم النسخة المتسلسل
            $table->boolean('is_current')->default(true); // هل هي النسخة الحالية الفعالة للمستند
            $table->string('file_name', 255); // الاسم الأصلي للملف
            $table->string('storage_uri', 500); // مسار التخزين الفيزيائي الآمن
            $table->unsignedBigInteger('file_size'); // حجم الملف بالبايت
            $table->string('mime_type', 100); // نوع MIME للملف
            $table->timestamps();

            // المفاتيح الأجنبية (منع حذف المستند الأب إذا كانت له نسخ restrict)
            $table->foreign('school_id')->references('school_id')->on('schools');
            $table->foreign('school_document_id')->references('id')->on('school_documents')->onDelete('restrict');

            // قيد تفرّد رقم النسخة لنفس المستند
            $table->unique(['school_document_id', 'version_no'], 'uq_doc_versions_doc_version_no');
            $table->index(['school_id', 'school_document_id']);
        });

        // --------------------------------------------------------------------------------------
        // 3. جدول evidence_links: ربط نسخة مستند بمؤشر داخل تقييم محدد
        // --------------------------------------------------------------------------------------
        Schema::create('evidence_links', function (Blueprint $table) {
            $table->increments('id'); // المعرف الفريد لرابط الشاهد (PK)
            $table->unsignedInteger('school_id'); // المدرسة (عزل مؤسسي صريح)
            $table->unsignedInteger('evaluation_id'); // ملف التقييم المعني
            $table->unsignedInteger('evaluation_result_id')->nullable(); // نتيجة التقييم المرتبطة (إن وجدت)
            $table->unsignedInteger('indicator_id'); // المؤشر المستهدف
            $table->unsignedInteger('document_version_id'); // نسخة المستند المستخدمة كشاهد
            $table->text('justification')->nullable(); // مبررات وأوجه دلالة المستند على المؤشر
            $table->string('status', 20)->default('draft'); // حالة الرابط: draft أو completed فقط
            $table->timestamps();

            // المفاتيح الأجنبية
            $table->foreign('school_id')->references('school_id')->on('schools');
            $table->foreign('evaluation_id')->references('evaluation_id')->on('evaluations');
            $table->foreign('evaluation_result_id')->references('result_id')->on('evaluation_results');
            $table->foreign('indicator_id')->references('indicator_id')->on('indicators');
            // منع حذف نسخة المستند إذا كانت معتمدة كشاهد في تقييم (restrict)
            $table->foreign('document_version_id')->references('id')->on('document_versions')->onDelete('restrict');

            // قيد التفرّد الحاسم: منع ربط نفس نسخة المستند بنفس المؤشر داخل نفس التقييم أكثر من مرة
            $table->unique(['evaluation_id', 'indicator_id', 'document_version_id'], 'uq_ev_links_eval_ind_doc_ver');

            // فهارس استعلامات التقييم والنتائج
            $table->index(['evaluation_id', 'indicator_id', 'status']);
            $table->index(['school_id', 'evaluation_id']);
        });
    }

    /**
     * إلغاء التهجير وحذف الجداول بترتيب عكسي يحترم القيود الأجنبية.
     */
    public function down(): void
    {
        Schema::dropIfExists('evidence_links');
        Schema::dropIfExists('document_versions');
        Schema::dropIfExists('school_documents');
    }
};
