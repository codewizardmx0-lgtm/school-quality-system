<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * تهجير إضافة حقول التنظيم والتصنيف والتدقيق للشواهد (الشريحة 5).
 *
 * يضيف:
 * - evidence_type: تصنيف نوع الشاهد (minutes, plan, record, report, board, image, other).
 * - status: حالة تدقيق الشاهد (Draft, Completed, Audited).
 * - reviewer_notes: ملاحظات المراجع/المقيم الداخلي على كفاية الشاهد.
 * - reviewed_by_user_id: المستخدم الذي قام بالمراجعة (FK -> users).
 * - reviewed_at: تاريخ وتوقيت المراجعة.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('evidences', function (Blueprint $table) {
            $table->string('evidence_type', 50)->default('other')->after('justification');
            $table->string('status', 20)->default('Draft')->after('evidence_type');
            $table->text('reviewer_notes')->nullable()->after('status');
            $table->unsignedInteger('reviewed_by_user_id')->nullable()->after('reviewer_notes');
            $table->dateTime('reviewed_at')->nullable()->after('reviewed_by_user_id');

            $table->foreign('reviewed_by_user_id')->references('user_id')->on('users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evidences', function (Blueprint $table) {
            $table->dropForeign(['reviewed_by_user_id']);
            $table->dropColumn([
                'evidence_type',
                'status',
                'reviewer_notes',
                'reviewed_by_user_id',
                'reviewed_at',
            ]);
        });
    }
};
