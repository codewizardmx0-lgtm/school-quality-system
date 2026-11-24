<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * إضافة حقل governorate إلى جدول users لدعم النطاق الجغرافي للمشرفين الوزاريين
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
            $table->string('governorate', 100)->nullable()->after('ministry_id');
        });
    }

    /**
     * إلغاء التهجير وحذف العمود.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('governorate');
        });
    }
};
