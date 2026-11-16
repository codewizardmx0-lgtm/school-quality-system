<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * تشغيل التهجير لإنشاء جداول المحافظات والمديريات.
     */
    public function up(): void
    {
        // جدول المحافظات (22 محافظة يمنية)
        Schema::create('governorates', function (Blueprint $table) {
            $table->increments('governorate_id');
            $table->string('name_ar', 100)->unique();
            $table->string('name_en', 100);
            $table->string('code', 20)->unique();
            $table->timestamps();
        });

        // جدول المديريات التعليمية
        Schema::create('directorates', function (Blueprint $table) {
            $table->increments('directorate_id');
            $table->unsignedInteger('governorate_id');
            $table->string('name_ar', 150);
            $table->string('name_en', 150)->nullable();
            $table->string('code', 20)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('governorate_id')
                ->references('governorate_id')
                ->on('governorates')
                ->onDelete('cascade');

            $table->unique(['governorate_id', 'name_ar']);
        });
    }

    /**
     * إلغاء التهجير.
     */
    public function down(): void
    {
        Schema::dropIfExists('directorates');
        Schema::dropIfExists('governorates');
    }
};
