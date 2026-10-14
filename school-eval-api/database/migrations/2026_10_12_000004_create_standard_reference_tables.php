<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ==============================================================================================
 * ملف Migration: create_standard_reference_tables
 * ==============================================================================================
 * 
 * الجداول التي ينشئها الملف (حزمة ERD-02):
 * 1. standard_versions: الإصدارات المعيارية المعتمدة للإطار المرجعي (توثيق الوثيقة الرسمية).
 * 2. standards: المعايير الرئيسة داخل كل إصدار معياري وأوزانها النسبية.
 * 3. sub_standards: المعايير الفرعية المتفرعة من المعايير الرئيسة.
 * 4. indicators: المؤشرات التفصيلية - وحدة التقييم الذرية في النظام (قرار RC-06).
 * 5. score_levels: سلم الدرجات الرسمي (0 إلى 3) المعتمد لكل إصدار معياري.
 * 
 * الغرض الوظيفي:
 * بناء الهيكل الهرمي الكامل للإطار المرجعي لمعايير الجودة المدرسية:
 * (إصدار معياري ← معيار رئيس ← معيار فرعي ← مؤشر تفصيلي + سلم الدرجات).
 * 
 * ترتيب التنفيذ والعلاقات:
 * - standard_versions يُنشأ أولاً لكونه الجذر.
 * - standards يعتمد على standard_versions.
 * - sub_standards يعتمد على standards.
 * - indicators يعتمد على sub_standards.
 * - score_levels يعتمد على standard_versions.
 * 
 * القيود المعتمدة:
 * - المفاتيح الأساسية (PK): increments() نوع UNSIGNED INT لكل جدول.
 * - القيود الفريدة: version_no فريد في standard_versions.
 * - المفاتيح الأجنبية:
 *   * تربط المستويات الهرمية بالتسلسل.
 *   * جميعها بالسلوك الافتراضي في MySQL دون أي CASCADE أو SET NULL صريح.
 * - الأوزان: weight يقبل decimal(5,2) nullable.
 * - الحالات: status نوع VARCHAR(20) دون استخدام ENUM أو CHECK.
 * ==============================================================================================
 */
return new class extends Migration
{
    /**
     * تشغيل التهجير وإنشاء جداول الإطار المرجعي.
     */
    public function up(): void
    {
        // --------------------------------------------------------------------------------------
        // جدول standard_versions: الإصدارات المعتمدة للمعايير
        // --------------------------------------------------------------------------------------
        Schema::create('standard_versions', function (Blueprint $table) {
            $table->increments('version_id'); // المعرف الفريد للإصدار (PK)
            $table->string('version_no', 20)->unique(); // رقم الإصدار المعياري الرسمي (فريد)
            $table->date('issue_date'); // تاريخ إصدار الوثيقة الرسمية
            $table->string('source_organization', 150); // الجهة المصدرة الرسمية
            $table->string('source_number', 100)->nullable(); // رقم وثيقة الاعتماد أو القرار
            $table->text('source_description')->nullable(); // وصف المصدر وتوثيقه
            $table->string('status', 20); // حالة الإصدار (Draft, Active, Retired)
            $table->dateTime('created_at'); // تاريخ ووقت إنشاء السجل
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تحديث للسجل
        });

        // --------------------------------------------------------------------------------------
        // جدول standards: المعايير الرئيسة التابعة للإصدار
        // --------------------------------------------------------------------------------------
        Schema::create('standards', function (Blueprint $table) {
            $table->increments('standard_id'); // المعرف الفريد للمعيار الرئيس (PK)
            $table->unsignedInteger('version_id'); // الإصدار المعياري الحاوي (FK)
            $table->string('code', 20); // رمز المعيار داخل الإصدار (مثل: ST-01)
            $table->string('name', 200); // اسم المعيار الرئيس
            $table->text('description')->nullable(); // الوصف التفصيلي للمعيار
            $table->decimal('weight', 5, 2)->nullable(); // وزن المعيار النسبي في الاحتساب
            $table->dateTime('created_at'); // تاريخ ووقت إنشاء السجل
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تحديث للسجل

            $table->foreign('version_id')
                ->references('version_id')
                ->on('standard_versions');
        });

        // --------------------------------------------------------------------------------------
        // جدول sub_standards: المعايير الفرعية تحت المعايير الرئيسة
        // --------------------------------------------------------------------------------------
        Schema::create('sub_standards', function (Blueprint $table) {
            $table->increments('sub_standard_id'); // المعرف الفريد للمعيار الفرعي (PK)
            $table->unsignedInteger('standard_id'); // المعيار الرئيس الحاوي (FK)
            $table->string('code', 20); // رمز المعيار الفرعي (مثل: SUB-01)
            $table->string('name', 200); // اسم المعيار الفرعي
            $table->text('description')->nullable(); // شرح المعيار الفرعي
            $table->dateTime('created_at'); // تاريخ ووقت إنشاء السجل
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تحديث للسجل

            $table->foreign('standard_id')
                ->references('standard_id')
                ->on('standards');
        });

        // --------------------------------------------------------------------------------------
        // جدول indicators: المؤشرات (وحدة التقييم الذرية)
        // --------------------------------------------------------------------------------------
        Schema::create('indicators', function (Blueprint $table) {
            $table->increments('indicator_id'); // المعرف الفريد للمؤشر (PK)
            $table->unsignedInteger('sub_standard_id'); // المعيار الفرعي الحاوي (FK)
            $table->string('code', 20); // رمز المؤشر
            $table->string('name', 200); // نص المؤشر الرسمي المعتمد
            $table->text('description')->nullable(); // شرح وتوجيهات المؤشر
            $table->decimal('weight', 5, 2)->nullable(); // وزن المؤشر النسبي
            $table->string('status', 20); // حالة المؤشر (Active, Inactive)
            $table->dateTime('created_at'); // تاريخ ووقت إنشاء السجل
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تحديث للسجل

            $table->foreign('sub_standard_id')
                ->references('sub_standard_id')
                ->on('sub_standards');
        });

        // --------------------------------------------------------------------------------------
        // جدول score_levels: سلم الدرجات الرسمي (0 - 3) لكل إصدار
        // --------------------------------------------------------------------------------------
        Schema::create('score_levels', function (Blueprint $table) {
            $table->increments('score_level_id'); // المعرف الفريد لمستوى التقدير (PK)
            $table->unsignedInteger('standard_version_id'); // الإصدار المعياري المطبق عليه السلم (FK)
            $table->integer('score_value'); // قيمة التقدير الرقمية (0, 1, 2, 3)
            $table->string('label', 100); // تسمية المستوى (ضعيف، مقبول، جيد، ممتاز...)
            $table->text('general_description')->nullable(); // الوصف العام لمستوى الأداء
            $table->integer('display_order'); // ترتيب العرض في الواجهات

            $table->foreign('standard_version_id')
                ->references('version_id')
                ->on('standard_versions');
        });
    }

    /**
     * إلغاء التهجير وحذف الجداول بترتيب عكسي آمن يحترم المفاتيح الأجنبية.
     */
    public function down(): void
    {
        Schema::dropIfExists('score_levels');
        Schema::dropIfExists('indicators');
        Schema::dropIfExists('sub_standards');
        Schema::dropIfExists('standards');
        Schema::dropIfExists('standard_versions');
    }
};
