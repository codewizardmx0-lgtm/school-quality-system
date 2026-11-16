<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * إضافة عمودي tracking_code و digital_hash لجدول evaluation_submissions
     * لضمان الحوكمة الرقمية، عدم الإنكار، وربط تسليمات التقييم برمز التتبع الوطني.
     */
    public function up(): void
    {
        Schema::table('evaluation_submissions', function (Blueprint $table) {
            if (!Schema::hasColumn('evaluation_submissions', 'tracking_code')) {
                $table->string('tracking_code', 64)->nullable()->after('status')->index();
            }
            if (!Schema::hasColumn('evaluation_submissions', 'digital_hash')) {
                $table->string('digital_hash', 64)->nullable()->after('tracking_code');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evaluation_submissions', function (Blueprint $table) {
            if (Schema::hasColumn('evaluation_submissions', 'digital_hash')) {
                $table->dropColumn('digital_hash');
            }
            if (Schema::hasColumn('evaluation_submissions', 'tracking_code')) {
                $table->dropIndex(['tracking_code']);
                $table->dropColumn('tracking_code');
            }
        });
    }
};
