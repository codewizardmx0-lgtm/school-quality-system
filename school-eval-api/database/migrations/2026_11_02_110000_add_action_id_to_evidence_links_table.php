<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * إضافة حقل الربط التنفيذي (action_id) لجدول evidence_links (U-24 / الخطوة 4أ).
 *
 * يسمح بربط رابط الشاهد التقييمي بإجراء تحسين محدد لتوثيق الإنجاز ميدانياً،
 * مع الحفاظ على التبرير وسياق الاستخدام المستقل.
 */
return new class extends Migration
{
    /**
     * تشغيل التهجير وإضافة المفتاح الأجنبي.
     */
    public function up(): void
    {
        Schema::table('evidence_links', function (Blueprint $table) {
            $table->unsignedInteger('action_id')->nullable()->after('indicator_id');
            $table->foreign('action_id')->references('action_id')->on('improvement_actions')->nullOnDelete();
            $table->index(['action_id', 'status']);
        });
    }

    /**
     * إلغاء التهجير وحذف الحقل والقيد.
     */
    public function down(): void
    {
        Schema::table('evidence_links', function (Blueprint $table) {
            $table->dropForeign(['action_id']);
            $table->dropIndex(['action_id', 'status']);
            $table->dropColumn('action_id');
        });
    }
};
