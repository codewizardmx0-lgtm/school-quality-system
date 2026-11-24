<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * إضافة حقل directorate_id إلى جدول users لدعم النطاق الجغرافي للمشرفين على مستوى المديرية
 * (FR-SUP-02 / FR-ADM-03)
 */
return new class extends Migration
{
    /**
     * تشغيل التهجير وإضافة العمود.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('directorate_id')->nullable()->after('governorate');

            $table->foreign('directorate_id')
                ->references('directorate_id')
                ->on('directorates')
                ->nullOnDelete();
        });
    }

    /**
     * إلغاء التهجير وحذف العمود.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['directorate_id']);
            $table->dropColumn('directorate_id');
        });
    }
};
