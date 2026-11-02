<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * تهجير الحذف النهائي للمعمارية القديمة للشواهد (U-24 / الخطوة 4ب).
 *
 * يحذف بالترتيب الآمن لمنع تعارض القيود المرجعية:
 * 1. إسقاط المفتاح الأجنبي evidence_id من جدول completion_request_items.
 * 2. إسقاط جدول evidence_versions (النسخ القديمة).
 * 3. إسقاط جدول evidences (الشواهد القديمة).
 */
return new class extends Migration
{
    /**
     * تشغيل التهجير وحذف المفاتيح والجداول القديمة.
     */
    public function up(): void
    {
        // 1. إسقاط المفتاح الأجنبي من completion_request_items أولاً لفك الارتباط بـ evidences
        if (Schema::hasTable('completion_request_items')) {
            Schema::table('completion_request_items', function (Blueprint $table) {
                $table->dropForeign(['evidence_id']);
            });
        }

        // 2. إسقاط جدول evidence_versions التابع أولاً
        Schema::dropIfExists('evidence_versions');

        // 3. إسقاط جدول evidences الرئيسي
        Schema::dropIfExists('evidences');
    }

    /**
     * إلغاء التهجير وإعادة بناء الهيكل القديم عند الحاجة للرجوع.
     */
    public function down(): void
    {
        // إعادة إنشاء evidences
        if (!Schema::hasTable('evidences')) {
            Schema::create('evidences', function (Blueprint $table) {
                $table->increments('evidence_id');
                $table->unsignedInteger('result_id')->nullable();
                $table->unsignedInteger('indicator_id');
                $table->string('title', 200);
                $table->text('description')->nullable();
                $table->string('evidence_type', 50)->default('other');
                $table->text('justification')->nullable();
                $table->string('status', 20)->default('Draft');
                $table->text('reviewer_notes')->nullable();
                $table->unsignedInteger('reviewed_by_user_id')->nullable();
                $table->dateTime('reviewed_at')->nullable();
                $table->unsignedInteger('action_id')->nullable();
                $table->timestamps();

                $table->foreign('result_id')->references('result_id')->on('evaluation_results');
                $table->foreign('indicator_id')->references('indicator_id')->on('indicators');
            });
        }

        // إعادة إنشاء evidence_versions
        if (!Schema::hasTable('evidence_versions')) {
            Schema::create('evidence_versions', function (Blueprint $table) {
                $table->increments('evidence_version_id');
                $table->unsignedInteger('evidence_id');
                $table->integer('version_no')->default(1);
                $table->boolean('current')->default(true);
                $table->timestamps();

                $table->foreign('evidence_id')->references('evidence_id')->on('evidences')->onDelete('cascade');
            });
        }

        // إعادة ربط المفتاح الأجنبي في completion_request_items
        if (Schema::hasTable('completion_request_items')) {
            Schema::table('completion_request_items', function (Blueprint $table) {
                $table->foreign('evidence_id')->references('evidence_id')->on('evidences');
            });
        }
    }
};
