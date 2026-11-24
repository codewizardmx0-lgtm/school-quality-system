<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * تشغيل التهجير لتوسيع جدول ملاحظات ومذكرات المشرف الوزاري (FR-SUP-16).
     * يتيح ربط الملاحظة بسياق المدرسة والدورة وطلب الاستكمال مباشرة
     * عند عدم وجود محاولة تسليم بعد، مع الحفاظ الكامل على سلامة البيانات السابقة.
     */
    public function up(): void
    {
        Schema::table('supervisor_notes', function (Blueprint $table) {
            $table->dropForeign(['submission_id']);
        });

        Schema::table('supervisor_notes', function (Blueprint $table) {
            $table->unsignedInteger('submission_id')->nullable()->change();
            $table->foreign('submission_id')->references('submission_id')->on('evaluation_submissions')->nullOnDelete();

            $table->unsignedInteger('school_id')->nullable()->after('submission_id');
            $table->unsignedInteger('cycle_id')->nullable()->after('school_id');
            $table->unsignedInteger('completion_request_id')->nullable()->after('cycle_id');
            $table->string('memo_type', 50)->default('supervisor_memo')->after('author_user_id');
            $table->string('subject', 255)->nullable()->after('memo_type');
            $table->boolean('is_visible_to_school')->default(true)->after('text');

            $table->foreign('school_id')->references('school_id')->on('schools')->cascadeOnDelete();
            $table->foreign('cycle_id')->references('cycle_id')->on('evaluation_cycles')->cascadeOnDelete();
            $table->foreign('completion_request_id')->references('request_id')->on('completion_requests')->nullOnDelete();
        });
    }

    /**
     * التراجع عن التهجير بشكل آمن (Reversible Migration).
     */
    public function down(): void
    {
        Schema::table('supervisor_notes', function (Blueprint $table) {
            $table->dropForeign(['completion_request_id']);
            $table->dropForeign(['cycle_id']);
            $table->dropForeign(['school_id']);
            $table->dropForeign(['submission_id']);

            $table->dropColumn([
                'school_id',
                'cycle_id',
                'completion_request_id',
                'memo_type',
                'subject',
                'is_visible_to_school',
            ]);
        });

        Schema::table('supervisor_notes', function (Blueprint $table) {
            $table->unsignedInteger('submission_id')->nullable(false)->change();
            $table->foreign('submission_id')->references('submission_id')->on('evaluation_submissions');
        });
    }
};
