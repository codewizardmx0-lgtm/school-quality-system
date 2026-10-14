<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * ==============================================================================================
 * ملف Migration: create_reports_and_submissions_tables
 * ==============================================================================================
 * 
 * الجداول التي ينشئها الملف (حزمة ERD-05 الجزء الأول):
 * 1. reports: تقارير التقييم المولدة من ملف التقييم.
 * 2. evaluation_submissions: محاولات إرسال ورفع المخرج للمستوى الوزاري بحالاتها الخمس (SubmissionStatus).
 * 3. internal_review_notes: ملاحظات المراجعة الداخلية (مدير المدرسة) على التقرير.
 * 4. plan_review_notes: ملاحظات مراجعة مدير المدرسة على خطة التحسين.
 * 5. supervisor_notes: ملاحظات المشرف الوزاري الإدارية والإشرافية على محاولة الإرسال.
 * 
 * الغرض الوظيفي:
 * إدارة دورة تسليم المخرجات ومراجعتها داخليًا وإشرافيًا، وتسجيل محاولات الرفع وإعادة الإرسال.
 * 
 * الاعتماديات وترتيب التنفيذ:
 * - reports ينشأ أولاً ويعتمد على evaluations.
 * - evaluation_submissions يعتمد على reports و users.
 * - جداول الملاحظات الثلاثة تنشأ بعد الجداول المرتبطة بها (reports, improvement_plans, evaluation_submissions).
 * 
 * القيود المعتمدة والقرارات الخاصة:
 * - القيود الفريدة: UNIQUE (report_id, attempt_no) لضمان تسلسل محاولات الإرسال لكل تقرير.
 * - قيد الفحص (CHECK Constraint):
 *   * chk_submission_submitted_at في evaluation_submissions:
 *     ((status = 'Draft' AND submitted_at IS NULL) OR (status <> 'Draft' AND submitted_at IS NOT NULL))
 *     يفرض أن تاريخ الإرسال يكون فارغًا طالما التقرير مسودة، وإلزاميًا عند تحوله لأي حالة إرسال أخرى.
 * - الطوابع الزمنية:
 *   * reports يحتوي generated_at و updated_at (بدون created_at).
 *   * evaluation_submissions يحتوي submitted_at و updated_at (بدون created_at).
 *   * جداول الملاحظات الثلاثة تحتوي created_at و updated_at.
 * - سياسة المفاتيح الأجنبية: السلوك الافتراضي في MySQL دون أي CASCADE أو SET NULL صريح.
 * - [ملاحظة توثيقية حول FR-SUP-16]: جدول supervisor_notes مرتبط بـ submission_id فقط وفق القاموس
 *   المعتمد، وتعارض المتطلب مؤجل لحسم مستقبلي دون إضافة أعمدة من خارج التصميم.
 * ==============================================================================================
 */
return new class extends Migration
{
    /**
     * تشغيل التهجير وإنشاء جداول التقارير والمحاولات والملاحظات.
     */
    public function up(): void
    {
        // --------------------------------------------------------------------------------------
        // جدول reports: تقارير التقييم المولدة
        // --------------------------------------------------------------------------------------
        Schema::create('reports', function (Blueprint $table) {
            $table->increments('report_id'); // المعرف الفريد للتقرير (PK)
            $table->unsignedInteger('evaluation_id'); // ملف التقييم المصدر (FK)
            $table->dateTime('generated_at'); // تاريخ ووقت توليد التقرير
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تحديث للتقرير
            $table->string('status', 20); // حالة التقرير (Draft, Final)

            $table->foreign('evaluation_id')->references('evaluation_id')->on('evaluations');
        });

        // --------------------------------------------------------------------------------------
        // جدول evaluation_submissions: محاولات رفع مخرج التقييم إلى الوزارة
        // --------------------------------------------------------------------------------------
        Schema::create('evaluation_submissions', function (Blueprint $table) {
            $table->increments('submission_id'); // المعرف الفريد للمحاولة (PK)
            $table->unsignedInteger('report_id'); // التقرير المرفوع (FK)
            $table->unsignedInteger('submitted_by_user_id'); // المستخدم المخول بالرفع (مدير المدرسة دون سواه) (FK)
            $table->integer('attempt_no'); // رقم المحاولة المتسلسل (يبدأ من 1 ويتصاعد مع كل إعادة إرسال)
            $table->dateTime('submitted_at')->nullable(); // تاريخ الإرسال الفعلي (فارغ طالما الحالة مسودة Draft)
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تحديث للمحاولة
            $table->string('status', 20); // حالة المخرج (Draft, Submitted, UnderReview, NeedsCompletion, Completed)

            $table->foreign('report_id')->references('report_id')->on('reports');
            $table->foreign('submitted_by_user_id')->references('user_id')->on('users');

            $table->unique(['report_id', 'attempt_no']); // رقم المحاولة فريد داخل كل تقرير
        });

        // قيد فحص موثق: تاريخ الإرسال يكون NULL في Draft وغير NULL للحالات الأخرى
        DB::statement("ALTER TABLE evaluation_submissions ADD CONSTRAINT chk_submission_submitted_at CHECK ((status = 'Draft' AND submitted_at IS NULL) OR (status <> 'Draft' AND submitted_at IS NOT NULL))");

        // --------------------------------------------------------------------------------------
        // جدول internal_review_notes: ملاحظات المراجعة الداخلية لمدير المدرسة على التقرير
        // --------------------------------------------------------------------------------------
        Schema::create('internal_review_notes', function (Blueprint $table) {
            $table->increments('note_id'); // المعرف الفريد للملاحظة (PK)
            $table->unsignedInteger('report_id'); // التقرير المراجَع (FK)
            $table->unsignedInteger('author_user_id'); // كاتب الملاحظة (مدير المدرسة) (FK)
            $table->text('text'); // نص الملاحظة
            $table->dateTime('created_at'); // تاريخ ووقت كتابة الملاحظة
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تعديل للملاحظة

            $table->foreign('report_id')->references('report_id')->on('reports');
            $table->foreign('author_user_id')->references('user_id')->on('users');
        });

        // --------------------------------------------------------------------------------------
        // جدول plan_review_notes: ملاحظات مراجعة مدير المدرسة على خطة التحسين
        // --------------------------------------------------------------------------------------
        Schema::create('plan_review_notes', function (Blueprint $table) {
            $table->increments('note_id'); // المعرف الفريد للملاحظة (PK)
            $table->unsignedInteger('plan_id'); // الخطة المراجَعة (FK)
            $table->unsignedInteger('author_user_id'); // كاتب الملاحظة (مدير المدرسة) (FK)
            $table->text('text'); // نص الملاحظة
            $table->dateTime('created_at'); // تاريخ ووقت كتابة الملاحظة
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تعديل للملاحظة

            $table->foreign('plan_id')->references('plan_id')->on('improvement_plans');
            $table->foreign('author_user_id')->references('user_id')->on('users');
        });

        // --------------------------------------------------------------------------------------
        // جدول supervisor_notes: ملاحظات المشرف الوزاري على محاولة الإرسال
        // ملاحظة: مرتبط بمحاولة الإرسال submission_id وفق القاموس المعتمد
        // --------------------------------------------------------------------------------------
        Schema::create('supervisor_notes', function (Blueprint $table) {
            $table->increments('note_id'); // المعرف الفريد للملاحظة (PK)
            $table->unsignedInteger('submission_id'); // محاولة الإرسال الموثَّقة بالملاحظة (FK)
            $table->unsignedInteger('author_user_id'); // كاتب الملاحظة (المشرف الوزاري) (FK)
            $table->text('text'); // نص الملاحظة الإشرافية
            $table->dateTime('created_at'); // تاريخ ووقت كتابة الملاحظة
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تعديل للملاحظة

            $table->foreign('submission_id')->references('submission_id')->on('evaluation_submissions');
            $table->foreign('author_user_id')->references('user_id')->on('users');
        });
    }

    /**
     * إلغاء التهجير وحذف الجداول بترتيب عكسي آمن، مع إسقاط قيد الفحص أولاً.
     */
    public function down(): void
    {
        Schema::dropIfExists('supervisor_notes');
        Schema::dropIfExists('plan_review_notes');
        Schema::dropIfExists('internal_review_notes');
        DB::statement('ALTER TABLE evaluation_submissions DROP CHECK chk_submission_submitted_at');
        Schema::dropIfExists('evaluation_submissions');
        Schema::dropIfExists('reports');
    }
};
