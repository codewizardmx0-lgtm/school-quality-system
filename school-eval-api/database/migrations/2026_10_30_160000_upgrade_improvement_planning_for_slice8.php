<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ملف تهجير الشريحة 8: ترقية خطط التحسين لتشمل الخطط التربوية والتطوير المهني ومتابعة الإنجاز.
 *
 * التعديلات المتوافقة تراجعياً:
 * 1. plan_type على جدول improvement_plans (افتراضي QualityImprovement).
 * 2. completion_percentage على جدول improvement_actions (0-100، افتراضي 0).
 * 3. reviewer_role على جدول plan_review_notes (لتمييز المراجعة الداخلية لمدير المدرسة عن الخارجية للمشرف).
 * 4. action_id على جدول evidences (ربط اختياري لشاهد تنفيذ بالإجراء).
 */
return new class extends Migration
{
    /**
     * تشغيل التهجير وإضافة الحقول التوسعية.
     */
    public function up(): void
    {
        // 1. إضافة نوع الخطة plan_type لجدول improvement_plans
        Schema::table('improvement_plans', function (Blueprint $table) {
            $table->string('plan_type', 40)->nullable()->default('QualityImprovement')->after('school_id');
        });

        // 2. إضافة نسبة الإنجاز completion_percentage لجدول improvement_actions
        Schema::table('improvement_actions', function (Blueprint $table) {
            $table->unsignedTinyInteger('completion_percentage')->default(0)->after('status');
        });

        // 3. إضافة دور المراجع reviewer_role لجدول plan_review_notes
        Schema::table('plan_review_notes', function (Blueprint $table) {
            $table->string('reviewer_role', 40)->nullable()->default('school_principal')->after('author_user_id');
        });

        // 4. إضافة ربط اختياري بإجراء التحسين action_id لجدول evidences
        Schema::table('evidences', function (Blueprint $table) {
            $table->unsignedInteger('action_id')->nullable()->after('result_id');

            $table->foreign('action_id')
                ->references('action_id')
                ->on('improvement_actions')
                ->onDelete('set null');
        });
    }

    /**
     * إلغاء التهجير وحذف الحقول الإضافية.
     */
    public function down(): void
    {
        Schema::table('evidences', function (Blueprint $table) {
            $table->dropForeign(['action_id']);
            $table->dropColumn('action_id');
        });

        Schema::table('plan_review_notes', function (Blueprint $table) {
            $table->dropColumn('reviewer_role');
        });

        Schema::table('improvement_actions', function (Blueprint $table) {
            $table->dropColumn('completion_percentage');
        });

        Schema::table('improvement_plans', function (Blueprint $table) {
            $table->dropColumn('plan_type');
        });
    }
};
