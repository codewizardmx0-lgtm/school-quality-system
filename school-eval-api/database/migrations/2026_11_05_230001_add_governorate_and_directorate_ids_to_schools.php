<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * إضافة حقول الربط المعرفي للمحافظات والمديريات في جدول المدارس.
     */
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->unsignedInteger('governorate_id')->nullable()->after('educational_stage');
            $table->unsignedInteger('directorate_id')->nullable()->after('governorate_id');

            $table->foreign('governorate_id')
                ->references('governorate_id')
                ->on('governorates')
                ->onDelete('set null');

            $table->foreign('directorate_id')
                ->references('directorate_id')
                ->on('directorates')
                ->onDelete('set null');
        });
    }

    /**
     * تراجع عن إضافة الحقول.
     */
    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropForeign(['directorate_id']);
            $table->dropForeign(['governorate_id']);
            $table->dropColumn(['directorate_id', 'governorate_id']);
        });
    }
};
