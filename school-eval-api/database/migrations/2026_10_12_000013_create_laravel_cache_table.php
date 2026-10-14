<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ==============================================================================================
 * ملف Migration تشغيلي خاص بإطار عمل Laravel — Cache Table
 * ==============================================================================================
 * هذا الملف مستقل تمامًا عن الجداول الأربعين الوظيفية لنظام الجودة والتقييم (ERD).
 * ينشئ جداول التخزين المؤقت وقفل المهام (cache و cache_locks) لدعم إعداد:
 * CACHE_STORE=database في ملف .env
 * ==============================================================================================
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cache', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->mediumText('value');
            $table->integer('expiration');
        });

        Schema::create('cache_locks', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->string('owner');
            $table->integer('expiration');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cache_locks');
        Schema::dropIfExists('cache');
    }
};
