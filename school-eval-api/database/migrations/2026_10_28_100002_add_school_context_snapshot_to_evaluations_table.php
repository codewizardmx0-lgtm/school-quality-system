<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * تهجير إضافة حقل school_context_snapshot لجدول التقييمات (الشريحة 6).
 *
 * الحقل:
 * - school_context_snapshot: لقطة مجمدة (JSON) من إحصاءات المدرسة والمرافق للعام التابع للدورة،
 *   تُملأ حتمياً عند تقديم التقييم (submit) وتحوله إلى Completed لحماية التقييم المقفل
 *   من أي أثر رجعي (BR-SCH-03).
 */
return new class extends Migration
{
    /**
     * تشغيل التهجير.
     */
    public function up(): void
    {
        Schema::table('evaluations', function (Blueprint $table) {
            $table->json('school_context_snapshot')->nullable()->after('status');
        });
    }

    /**
     * إلغاء التهجير.
     */
    public function down(): void
    {
        Schema::table('evaluations', function (Blueprint $table) {
            $table->dropColumn('school_context_snapshot');
        });
    }
};
