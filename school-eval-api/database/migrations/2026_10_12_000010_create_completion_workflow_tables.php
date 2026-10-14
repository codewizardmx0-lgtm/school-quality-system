<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * ==============================================================================================
 * ملف Migration: create_completion_workflow_tables
 * ==============================================================================================
 * 
 * الجداول التي ينشئها الملف (حزمة ERD-05 الجزء الثاني):
 * 1. completion_requests: طلبات الاستكمال الصادرة عن المشرف الوزاري على محاولة إرسال محددة.
 * 2. completion_request_items: بنود ونواقص طلب الاستكمال (يستهدف كل بند مؤشرًا أو شاهدًا).
 * 
 * الغرض الوظيفي:
 * تنظيم مسار عمل الاستكمال (Completion Workflow) عند إعادة التقرير للمدرسة لاستيفاء النواقص،
 * مع تفصيل دقيق لكل نقطة نقص سواء كانت متعلقة بمؤشر أو شاهد محدد.
 * 
 * الاعتماديات وترتيب التنفيذ:
 * - completion_requests ينشأ أولاً ويعتمد على evaluation_submissions (من ملف 09) و users (ملف 02).
 * - completion_request_items يعتمد على completion_requests و indicators (ملف 04) و evidences (ملف 07).
 * 
 * القيود المعتمدة والقرارات الخاصة:
 * - المفاتيح الأساسية (PK): معرفات increments() نوع UNSIGNED INT.
 * - الحقول الشرطية (Conditional): indicator_id و evidence_id كلاهما nullable.
 * - قيد الفحص (CHECK Constraint):
 *   * chk_completion_item_target في completion_request_items:
 *     (indicator_id IS NOT NULL OR evidence_id IS NOT NULL)
 *     يضمن استهداف بند واحد على الأقل (مؤشر أو شاهد) في كل عنصر استكمال.
 * - التواريخ: resolved_at في completion_requests يقبل nullable (فارغ حتى معالجة الطلب وإغلاقه).
 * - سياسة المفاتيح الأجنبية: السلوك الافتراضي في MySQL دون أي CASCADE أو SET NULL صريح.
 * - الطوابع الزمنية: الجداول تحتوي created_at و updated_at.
 * ==============================================================================================
 */
return new class extends Migration
{
    /**
     * تشغيل التهجير وإنشاء جداول مسار عمل الاستكمال.
     */
    public function up(): void
    {
        // --------------------------------------------------------------------------------------
        // جدول completion_requests: طلبات الاستكمال الصادرة عن الوزارة
        // --------------------------------------------------------------------------------------
        Schema::create('completion_requests', function (Blueprint $table) {
            $table->increments('request_id'); // المعرف الفريد لطلب الاستكمال (PK)
            $table->unsignedInteger('submission_id'); // محاولة الإرسال التي صدر عنها الطلب (FK)
            $table->unsignedInteger('issued_by_user_id'); // المشرف الوزاري مُصدر الطلب (FK)
            $table->dateTime('created_at'); // تاريخ ووقت إصدار الطلب
            $table->dateTime('resolved_at')->nullable(); // تاريخ ووقت معالجة الطلب وإغلاقه (فارغ حتى الحل)
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تحديث للطلب
            $table->string('status', 20); // حالة الطلب (Open, Resolved)

            $table->foreign('submission_id')->references('submission_id')->on('evaluation_submissions');
            $table->foreign('issued_by_user_id')->references('user_id')->on('users');
        });

        // --------------------------------------------------------------------------------------
        // جدول completion_request_items: بنود وتفاصيل النواقص في طلب الاستكمال
        // --------------------------------------------------------------------------------------
        Schema::create('completion_request_items', function (Blueprint $table) {
            $table->increments('request_item_id'); // المعرف الفريد لبند الاستكمال (PK)
            $table->unsignedInteger('request_id'); // طلب الاستكمال الحاوي (FK)
            $table->unsignedInteger('indicator_id')->nullable(); // المؤشر المستهدف بالنقص (شرطي / FK)
            $table->unsignedInteger('evidence_id')->nullable(); // الشاهد المستهدف بالنقص (شرطي / FK)
            $table->text('missing_description'); // وصف النقص أو عدم الوضوح المطلوب استيفاؤه
            $table->string('status', 20); // حالة معالجة البند (Pending, Resolved)
            $table->dateTime('created_at'); // تاريخ ووقت إنشاء البند
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تعديل للبند

            $table->foreign('request_id')->references('request_id')->on('completion_requests');
            $table->foreign('indicator_id')->references('indicator_id')->on('indicators');
            $table->foreign('evidence_id')->references('evidence_id')->on('evidences');
        });

        // قيد فحص موثق: يجب تحديد هدف واحد على الأقل للبند (مؤشر أو شاهد)
        DB::statement('ALTER TABLE completion_request_items ADD CONSTRAINT chk_completion_item_target CHECK (indicator_id IS NOT NULL OR evidence_id IS NOT NULL)');
    }

    /**
     * إلغاء التهجير وحذف الجداول بترتيب عكسي آمن، مع إسقاط قيد الفحص أولاً.
     */
    public function down(): void
    {
        // إسقاط قيد الفحص قبل حذف الجدول
        DB::statement('ALTER TABLE completion_request_items DROP CHECK chk_completion_item_target');
        Schema::dropIfExists('completion_request_items');
        Schema::dropIfExists('completion_requests');
    }
};
