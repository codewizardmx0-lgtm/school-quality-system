<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * تشغيل التهجير:
     * 1. إضافة عمود allowed_actions بصيغة JSON لجدول completion_request_items لحفظ الصلاحيات المتعددة للفك الجزئي.
     * 2. إضافة عمود allowed_actions بصيغة JSON لجدول supervision_deficiency_notes للمزامنة مع رصد النواقص في الشاشة 4.
     * 3. إضافة عمود max_completion_days لجدول evaluation_cycles لحوكمة السقف الأعلى لمهلة الاستكمال بالدورة.
     */
    public function up(): void
    {
        Schema::table('completion_request_items', function (Blueprint $table) {
            if (!Schema::hasColumn('completion_request_items', 'allowed_actions')) {
                $table->json('allowed_actions')->nullable()->after('missing_description');
            }
        });

        Schema::table('supervision_deficiency_notes', function (Blueprint $table) {
            if (!Schema::hasColumn('supervision_deficiency_notes', 'allowed_actions')) {
                $table->json('allowed_actions')->nullable()->after('directives');
            }
        });

        Schema::table('evaluation_cycles', function (Blueprint $table) {
            if (!Schema::hasColumn('evaluation_cycles', 'max_completion_days')) {
                $table->unsignedSmallInteger('max_completion_days')->default(14)->after('end_date');
            }
        });
    }

    /**
     * إلغاء التهجير وعكس التغييرات بشكل آمن وقابل للتراجع (Reversible Migration).
     */
    public function down(): void
    {
        Schema::table('completion_request_items', function (Blueprint $table) {
            if (Schema::hasColumn('completion_request_items', 'allowed_actions')) {
                $table->dropColumn('allowed_actions');
            }
        });

        Schema::table('supervision_deficiency_notes', function (Blueprint $table) {
            if (Schema::hasColumn('supervision_deficiency_notes', 'allowed_actions')) {
                $table->dropColumn('allowed_actions');
            }
        });

        Schema::table('evaluation_cycles', function (Blueprint $table) {
            if (Schema::hasColumn('evaluation_cycles', 'max_completion_days')) {
                $table->dropColumn('max_completion_days');
            }
        });
    }
};
