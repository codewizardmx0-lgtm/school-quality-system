<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('improvement_actions', function (Blueprint $table) {
            $table->unsignedTinyInteger('baseline_score')->nullable()->after('completion_percentage')
                ->comment('الدرجة المسجلة للمؤشر لحظة إضافة الإجراء للخطة');
            $table->unsignedTinyInteger('baseline_target_score')->nullable()->after('baseline_score')
                ->comment('الدرجة المستهدفة لحظة إضافة الإجراء للخطة');
            $table->unsignedTinyInteger('baseline_gap')->nullable()->after('baseline_target_score')
                ->comment('الفجوة المحسوبة لحظة إضافة الإجراء للخطة');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('improvement_actions', function (Blueprint $table) {
            $table->dropColumn(['baseline_score', 'baseline_target_score', 'baseline_gap']);
        });
    }
};
