<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * G-15 / BE-GAP-02: إضافة فهارس مركبة متقدمة لتسريع استعلامات روابط الشواهد والمستندات
     */
    public function up(): void
    {
        Schema::table('document_versions', function (Blueprint $table) {
            // تسريع استعلامات جلب النسخ النشطة للمدرسة
            $table->index(['school_id', 'is_current'], 'idx_doc_versions_school_current');
        });

        Schema::table('evidence_links', function (Blueprint $table) {
            // تسريع فحص ارتباط النسخ وحالتها
            $table->index(['document_version_id', 'status'], 'idx_ev_links_doc_version_status');
            // تسريع استعلامات حصر شواهد المؤشر بالمدرسة
            $table->index(['school_id', 'indicator_id'], 'idx_ev_links_school_indicator');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('document_versions', function (Blueprint $table) {
            $table->dropIndex('idx_doc_versions_school_current');
        });

        Schema::table('evidence_links', function (Blueprint $table) {
            $table->dropIndex('idx_ev_links_doc_version_status');
            $table->dropIndex('idx_ev_links_school_indicator');
        });
    }
};
