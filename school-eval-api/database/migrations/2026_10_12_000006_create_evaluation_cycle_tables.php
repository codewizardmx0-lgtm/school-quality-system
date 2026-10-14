<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ==============================================================================================
 * ملف Migration: create_evaluation_cycle_tables
 * ==============================================================================================
 * 
 * الجداول التي ينشئها الملف (حزمة ERD-03 الجزء الأول):
 * 1. evaluation_cycles: الدورات التقييمية المركزية وفتراتها الزمنية وحالتها.
 * 2. cycle_participations: مشاركة المدارس في الدورات التقييمية (جدول الربط المركزي).
 * 3. evaluations: ملف التقييم الذاتي الخاص بمدرسة محددة ضمن دورة معينة.
 * 
 * الغرض الوظيفي:
 * إدارة دورات التقييم على المستوى المركزي، وتمكين المدارس من المشاركة وإنشاء ملف تقييم ذاتي،
 * مع فرض عزل التقييمات وفق العام الدراسي والدورة المركزية المعتمدة.
 * 
 * الاعتماديات وترتيب التنفيذ:
 * - evaluation_cycles يُنشأ أولاً ويعتمد على standard_versions (من ملف 04).
 * - cycle_participations يعتمد على evaluation_cycles (بهذا الملف) و schools (ملف 01).
 * - evaluations يعتمد على evaluation_cycles و schools و users (ملف 02).
 * 
 * القيود المعتمدة:
 * - المفاتيح الأساسية:
 *   * evaluation_cycles و evaluations: معرفات increments() فردية.
 *   * cycle_participations: مفتاح مركب PRIMARY KEY (cycle_id, school_id) لضمان مشاركة واحدة للمدرسة بالدورة.
 * - القيود الفريدة: UNIQUE (cycle_id, school_id) في evaluations (تقييم واحد فقط للمدرسة في الدورة).
 * - المفاتيح الأجنبية: تشير إلى الجداول المذكورة بالسلوك الافتراضي في MySQL دون أي CASCADE أو SET NULL صريح.
 * - الطوابع الزمنية: الجداول الثلاثة تحتوي created_at و updated_at إلزاميين.
 * ==============================================================================================
 */
return new class extends Migration
{
    /**
     * تشغيل التهجير وإنشاء جداول دورات وملفات التقييم.
     */
    public function up(): void
    {
        // --------------------------------------------------------------------------------------
        // جدول evaluation_cycles: الدورات التقييمية المركزية
        // ملاحظة: الدورة مركزية ولا ترتبط بمدرسة محددة (لا وجود لـ school_id هنا)
        // --------------------------------------------------------------------------------------
        Schema::create('evaluation_cycles', function (Blueprint $table) {
            $table->increments('cycle_id'); // المعرف الفريد للدورة (PK)
            $table->unsignedInteger('version_id'); // الإصدار المعياري الحاكم للدورة (FK)
            $table->string('academic_year', 20); // العام الدراسي (مثل: 2026/2027)
            $table->date('start_date'); // تاريخ بداية فترة الدورة
            $table->date('end_date'); // تاريخ نهاية فترة الدورة
            $table->string('status', 20); // حالة الدورة (Active, Closed - تغلق تلقائيًا بانتهاء الفترة)
            $table->dateTime('created_at'); // تاريخ ووقت إنشاء السجل
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تحديث للسجل

            $table->foreign('version_id')->references('version_id')->on('standard_versions');
        });

        // --------------------------------------------------------------------------------------
        // جدول cycle_participations: تسجيل ومشاركة المدارس في الدورات التقييمية
        // --------------------------------------------------------------------------------------
        Schema::create('cycle_participations', function (Blueprint $table) {
            $table->unsignedInteger('cycle_id'); // معرّف الدورة (جزء من المفتاح المركب وFK)
            $table->unsignedInteger('school_id'); // معرّف المدرسة المشاركة (جزء من المفتاح المركب وFK)
            $table->dateTime('created_at'); // تاريخ ووقت تسجيل المشاركة
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تحديث

            $table->primary(['cycle_id', 'school_id']); // مفتاح أساسي مركب يمنع تكرار مشاركة المدرسة في نفس الدورة
            $table->foreign('cycle_id')->references('cycle_id')->on('evaluation_cycles');
            $table->foreign('school_id')->references('school_id')->on('schools');
        });

        // --------------------------------------------------------------------------------------
        // جدول evaluations: ملف التقييم الذاتي للمدرسة
        // --------------------------------------------------------------------------------------
        Schema::create('evaluations', function (Blueprint $table) {
            $table->increments('evaluation_id'); // المعرف الفريد لملف التقييم (PK)
            $table->unsignedInteger('cycle_id'); // الدورة التقييمية التابع لها (FK)
            $table->unsignedInteger('school_id'); // المدرسة صاحبة التقييم (FK)
            $table->unsignedInteger('created_by_user_id'); // المستخدم منشئ ملف التقييم (FK)
            $table->string('status', 20); // حالة ملف التقييم (InProgress, Completed)
            $table->dateTime('created_at'); // تاريخ ووقت إنشاء ملف التقييم
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تحديث للملف

            $table->foreign('cycle_id')->references('cycle_id')->on('evaluation_cycles');
            $table->foreign('school_id')->references('school_id')->on('schools');
            $table->foreign('created_by_user_id')->references('user_id')->on('users');

            $table->unique(['cycle_id', 'school_id']); // قيد فريد يضمن وجود ملف تقييم واحد فقط للمدرسة في الدورة الواحدة
        });
    }

    /**
     * إلغاء التهجير وحذف الجداول بترتيب عكسي آمن يحترم المفاتيح الأجنبية.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluations');
        Schema::dropIfExists('cycle_participations');
        Schema::dropIfExists('evaluation_cycles');
    }
};
