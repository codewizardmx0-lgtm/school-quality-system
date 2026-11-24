<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * تشغيل التهجير لإنشاء جدول رصد النواقص الإشرافية الميدانية (FR-SUP-04, BR-MIN-02).
     * يتيح للمشرف الوزاري رصد وتوثيق تصنيف النقص والملاحظات والتوجيهات لكل مؤشر
     * على مستوى ملف التقييم ومحاولة التسليم وحفظها في قاعدة البيانات.
     */
    public function up(): void
    {
        Schema::create('supervision_deficiency_notes', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('evaluation_id');
            $table->unsignedInteger('submission_id')->nullable();
            $table->unsignedInteger('indicator_id');
            $table->string('deficiency_category', 150);
            $table->text('supervisor_note')->nullable();
            $table->text('directives')->nullable();
            $table->unsignedInteger('created_by');
            $table->timestamps();

            $table->foreign('evaluation_id')->references('evaluation_id')->on('evaluations')->cascadeOnDelete();
            $table->foreign('submission_id')->references('submission_id')->on('evaluation_submissions')->nullOnDelete();
            $table->foreign('indicator_id')->references('indicator_id')->on('indicators')->cascadeOnDelete();
            $table->foreign('created_by')->references('user_id')->on('users')->cascadeOnDelete();

            $table->unique(['evaluation_id', 'indicator_id'], 'uq_eval_indicator_deficiency');
            $table->index(['submission_id', 'indicator_id'], 'idx_submission_indicator_deficiency');
        });
    }

    /**
     * التراجع عن التهجير بشكل آمن (Reversible Migration).
     */
    public function down(): void
    {
        Schema::dropIfExists('supervision_deficiency_notes');
    }
};
