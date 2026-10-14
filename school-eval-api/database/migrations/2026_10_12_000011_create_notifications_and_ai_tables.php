<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ==============================================================================================
 * ملف Migration: create_notifications_and_ai_tables
 * ==============================================================================================
 * 
 * الجداول التي ينشئها الملف (حزمة ERD-05 الجزء الثالث):
 * 1. notifications: سجل الإشعارات الدائم للمستخدمين (سجل محفوظ دائمًا لا يُحذف - FR-GEN-05).
 * 2. ai_analysis: طلبات وعمليات التحليل الذكي للتقييم بالذكاء الاصطناعي وحالتها ومخرجاتها العامة.
 * 3. ai_recommendations: توصيات الذكاء الاصطناعي ومخرجاته الخاضعة للمراجعة والتدخل البشري الإلزامي.
 * 
 * الغرض الوظيفي:
 * إدارة منظومة التنبيهات والأحداث، ودعم عمليات المساعد الذكي في تحليل الأداء واقتراح التوصيات
 * ومسودات خطط التحسين مع ضمان الحاكمية البشرية الصارمة (BR-AI-01 و BR-AI-02).
 * 
 * الاعتماديات وترتيب التنفيذ:
 * - notifications يعتمد على users.
 * - ai_analysis يعتمد على evaluations و users.
 * - ai_recommendations يعتمد على ai_analysis و improvement_actions.
 * 
 * القيود المعتمدة والقرارات الخاصة:
 * - جدول notifications (علاقة متعددة الأشكال Polymorphic):
 *   * الربط بالكيان المصدر عبر related_entity_type و related_entity_id دون FK مباشر بقاعدة البيانات.
 *   * فهرس مركب موثق على (related_entity_type, related_entity_id).
 *   * فهرس مركب موثق على (recipient_user_id, is_read) لتسريع جلب التنبيهات غير المقروءة.
 *   * الطوابع الزمنية: يتضمن created_at فقط، مع حقل read_at عند القراءة (لا يوجد updated_at وفق الملحق أ).
 * - جدول ai_recommendations:
 *   * improvement_action_id يقبل nullable (لا يُربط بإجراء تحسين إلا بعد المراجعة البشرية والقبول).
 *   * human_modifications نصي nullable لحفظ تعديل المستخدم على التوصية.
 * - سياسة المفاتيح الأجنبية: السلوك الافتراضي في MySQL دون أي CASCADE أو SET NULL صريح.
 * - الطوابع الزمنية لجدولي الذكاء الاصطناعي: تتضمن created_at و updated_at.
 * ==============================================================================================
 */
return new class extends Migration
{
    /**
     * تشغيل التهجير وإنشاء جداول الإشعارات والذكاء الاصطناعي.
     */
    public function up(): void
    {
        // --------------------------------------------------------------------------------------
        // جدول notifications: سجل الإشعارات الدائم للمستخدمين
        // مرجع متعدد الأشكال (Polymorphic) دون مفتاح أجنبي للكيان المصدر
        // --------------------------------------------------------------------------------------
        Schema::create('notifications', function (Blueprint $table) {
            $table->increments('notification_id'); // المعرف الفريد للإشعار (PK)
            $table->unsignedInteger('recipient_user_id'); // المستخدم المستلم للإشعار (FK)
            $table->string('title', 150); // عنوان الإشعار
            $table->text('message'); // نص ومحتوى الإشعار
            $table->string('type', 30); // نوع الحدث (cycle_launched, cycle_closed, completion_requested, action_due_soon, version_activated)
            $table->string('related_entity_type', 30); // نوع الكيان المرتبط (completion_request, evaluation_cycle, standard_version, improvement_action)
            $table->unsignedInteger('related_entity_id'); // معرّف الكيان المرتبط
            $table->boolean('is_read')->default(false); // هل تمت قراءة الإشعار (افتراضيًا false)
            $table->dateTime('created_at'); // تاريخ ووقت إرسال الإشعار (لا يوجد updated_at وفق القاموس)
            $table->dateTime('read_at')->nullable(); // تاريخ ووقت القراءة الفعلي

            $table->foreign('recipient_user_id')->references('user_id')->on('users');

            // فهارس مركبة لتسريع الأداء والاستعلامات
            $table->index(['related_entity_type', 'related_entity_id']);
            $table->index(['recipient_user_id', 'is_read']);
        });

        // --------------------------------------------------------------------------------------
        // جدول ai_analysis: طلبات وسجلات التحليل الذكي
        // الذكاء الاصطناعي يقرأ فقط ولا يعدل نتائج التقييم الرسمية إطلاقًا
        // --------------------------------------------------------------------------------------
        Schema::create('ai_analysis', function (Blueprint $table) {
            $table->increments('analysis_id'); // المعرف الفريد لعملية التحليل (PK)
            $table->unsignedInteger('evaluation_id'); // ملف التقييم المحلَّل (FK)
            $table->unsignedInteger('requested_by_user_id'); // المستخدم طالب التحليل (FK)
            $table->dateTime('analysis_date'); // تاريخ ووقت تنفيذ عملية التحليل
            $table->string('input_scope', 30); // نطاق المدخلات (results, results_and_notes)
            $table->text('summary')->nullable(); // الملخص العام للتحليل
            $table->string('status', 20); // حالة التحليل (Pending, Completed, Failed)
            $table->dateTime('created_at'); // تاريخ ووقت إنشاء الطلب
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تحديث لطلب التحليل

            $table->foreign('evaluation_id')->references('evaluation_id')->on('evaluations');
            $table->foreign('requested_by_user_id')->references('user_id')->on('users');
        });

        // --------------------------------------------------------------------------------------
        // جدول ai_recommendations: توصيات الذكاء الاصطناعي والمراجعة البشرية
        // --------------------------------------------------------------------------------------
        Schema::create('ai_recommendations', function (Blueprint $table) {
            $table->increments('recommendation_id'); // المعرف الفريد للتوصية (PK)
            $table->unsignedInteger('analysis_id'); // عملية التحليل المصدر (FK)
            $table->unsignedInteger('improvement_action_id')->nullable(); // الإجراء الرسمي المدعوم (FK - يُربط بعد القبول البشري فقط)
            $table->string('type', 30); // نوع المخرج المقترح (strength, improvement, recommendation, draft)
            $table->string('title', 200); // عنوان التوصية
            $table->text('description'); // النص التفصيلي للتوصية
            $table->string('priority', 10); // الأولوية المقترحة (Low, Medium, High)
            $table->text('human_modifications')->nullable(); // نص تعديل المستخدم البشري على التوصية
            $table->string('status', 20); // قرار المراجعة البشرية (PendingReview, Accepted, Modified, Ignored)
            $table->dateTime('created_at'); // تاريخ ووقت إنشاء التوصية
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تحديث للتوصية

            $table->foreign('analysis_id')->references('analysis_id')->on('ai_analysis');
            $table->foreign('improvement_action_id')->references('action_id')->on('improvement_actions');
        });
    }

    /**
     * إلغاء التهجير وحذف الجداول بترتيب عكسي آمن يحترم المفاتيح الأجنبية.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_recommendations');
        Schema::dropIfExists('ai_analysis');
        Schema::dropIfExists('notifications');
    }
};
