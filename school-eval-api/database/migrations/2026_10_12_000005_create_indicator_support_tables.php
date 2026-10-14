<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ==============================================================================================
 * ملف Migration: create_indicator_support_tables
 * ==============================================================================================
 * 
 * الجداول التي ينشئها الملف (مكملات ERD-02):
 * 1. verification_tools: أدوات التحقق المعتمدة رسميًا (ملاحظة صفية، فحص وثائق، مقابلات...).
 * 2. indicator_score_descriptors: الأوصاف الرسمية لتقدير كل مؤشر عند كل درجة (0–3).
 * 3. indicator_evidence_requirements: متطلبات الشواهد المرجعية المحددة لكل مؤشر.
 * 4. indicator_verification_methods: ربط أساليب وأدوات التحقق المسموح بها بكل مؤشر.
 * 
 * الغرض الوظيفي:
 * تزويد المقيمين بالموجهات المرجعية الرسمية والأدلة الاسترشادية اللازمة أثناء التقييم،
 * بما يضمن اتساق عملية الحكم التقييمي ومطابقتها للمعايير الوزارية.
 * 
 * الاعتماديات وترتيب التنفيذ:
 * - verification_tools ينشأ أولاً داخل الملف لاستخدامه لاحقًا كمرجع.
 * - indicator_score_descriptors يعتمد على indicators و score_levels و standard_versions (من ملف 04).
 * - indicator_evidence_requirements يعتمد على indicators و standard_versions (من ملف 04).
 * - indicator_verification_methods يعتمد على indicators (من ملف 04) و verification_tools (داخل هذا الملف).
 * 
 * القيود المعتمدة:
 * - المفاتيح الأساسية (PK): increments() نوع UNSIGNED INT.
 * - المفاتيح الأجنبية: تشير إلى الجداول المذكورة بالسلوك الافتراضي في MySQL دون أي CASCADE أو SET NULL صريح.
 * - الطوابع الزمنية:
 *   * verification_tools يحتوي created_at و updated_at.
 *   * indicator_verification_methods يحتوي created_at فقط مطابقة لقاموس البيانات والملحق أ.
 *   * indicator_score_descriptors و indicator_evidence_requirements لا يحتويان timestamps.
 * ==============================================================================================
 */
return new class extends Migration
{
    /**
     * تشغيل التهجير وإنشاء جداول دعم المؤشرات.
     */
    public function up(): void
    {
        // --------------------------------------------------------------------------------------
        // جدول verification_tools: أدوات وأساليب التحقق الرسمية
        // --------------------------------------------------------------------------------------
        Schema::create('verification_tools', function (Blueprint $table) {
            $table->increments('tool_id'); // المعرف الفريد لأداة التحقق (PK)
            $table->string('name', 150); // اسم الأداة (مثل: بطاقة ملاحظة، استبانة، مراجعة ملف)
            $table->string('tool_type', 50); // نوع الأداة وتصنيفها
            $table->text('description')->nullable(); // الوصف التفصيلي للأداة وطريقة تطبيقها
            $table->boolean('approved'); // هل الأداة معتمدة رسميًا من الوزارة
            $table->dateTime('created_at'); // تاريخ ووقت إنشاء السجل
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تحديث للسجل
        });

        // --------------------------------------------------------------------------------------
        // جدول indicator_score_descriptors: الأوصاف التقديرية التفصيلية لكل مؤشر وسلم الدرجات
        // --------------------------------------------------------------------------------------
        Schema::create('indicator_score_descriptors', function (Blueprint $table) {
            $table->increments('descriptor_id'); // المعرف الفريد للوصف (PK)
            $table->unsignedInteger('indicator_id'); // المؤشر التابع له (FK)
            $table->unsignedInteger('score_level_id'); // مستوى الدرجة المرتبط به (FK)
            $table->unsignedInteger('standard_version_id'); // الإصدار المعياري المرجعي (FK)
            $table->string('label', 100); // عنوان أو مسمى الوصف
            $table->text('description'); // النص الكامل للوصف التقديري الرسمي
            $table->integer('display_order'); // ترتيب العرض في واجهة التقييم
            $table->boolean('is_active'); // هل الوصف نشط ومعتمد للاستخدام

            $table->foreign('indicator_id')->references('indicator_id')->on('indicators');
            $table->foreign('score_level_id')->references('score_level_id')->on('score_levels');
            $table->foreign('standard_version_id')->references('version_id')->on('standard_versions');
        });

        // --------------------------------------------------------------------------------------
        // جدول indicator_evidence_requirements: متطلبات الشواهد المرجعية للمؤشر
        // --------------------------------------------------------------------------------------
        Schema::create('indicator_evidence_requirements', function (Blueprint $table) {
            $table->increments('requirement_id'); // المعرف الفريد لمتطلب الشاهد (PK)
            $table->unsignedInteger('indicator_id'); // المؤشر التابع له (FK)
            $table->unsignedInteger('standard_version_id'); // الإصدار المعياري (FK)
            $table->string('title', 200); // عنوان المتطلب المرجعي للشاهد
            $table->text('description')->nullable(); // الشرح التفصيلي لما يجب أن يحتويه الشاهد
            $table->boolean('required'); // هل إرفاق هذا الشاهد إلزامي للمؤشر
            $table->integer('display_order'); // ترتيب العرض

            $table->foreign('indicator_id')->references('indicator_id')->on('indicators');
            $table->foreign('standard_version_id')->references('version_id')->on('standard_versions');
        });

        // --------------------------------------------------------------------------------------
        // جدول indicator_verification_methods: أساليب التحقق المقررة للمؤشر
        // --------------------------------------------------------------------------------------
        Schema::create('indicator_verification_methods', function (Blueprint $table) {
            $table->increments('id'); // المعرف الفريد للسجل (PK)
            $table->unsignedInteger('indicator_id'); // المؤشر المستهدف (FK)
            $table->unsignedInteger('tool_id'); // أداة التحقق المخصصة (FK)
            $table->boolean('required'); // هل استخدام هذه الأداة إلزامي لهذا المؤشر
            $table->string('usage_guidance', 255)->nullable(); // إرشادات وتوجيهات الاستخدام الميداني
            $table->dateTime('created_at'); // تاريخ ووقت إنشاء السجل (لا يوجد updated_at وفق القاموس)

            $table->foreign('indicator_id')->references('indicator_id')->on('indicators');
            $table->foreign('tool_id')->references('tool_id')->on('verification_tools');
        });
    }

    /**
     * إلغاء التهجير وحذف الجداول بترتيب عكسي آمن يحترم المفاتيح الأجنبية.
     */
    public function down(): void
    {
        Schema::dropIfExists('indicator_verification_methods');
        Schema::dropIfExists('indicator_evidence_requirements');
        Schema::dropIfExists('indicator_score_descriptors');
        Schema::dropIfExists('verification_tools');
    }
};
