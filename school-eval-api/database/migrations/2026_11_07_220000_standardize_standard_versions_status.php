<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * U-07 / BE-GAP-01: توحيد وتطبيع حالات الإصدارات المعيارية القديمة إلى Approved
     */
    public function up(): void
    {
        // توحيد السجلات القديمة مع الحفاظ على التوافق
        DB::table('standard_versions')
            ->where('status', 'Active')
            ->update(['status' => 'Approved']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('standard_versions')
            ->where('status', 'Approved')
            ->where('version_no', '2026.1')
            ->update(['status' => 'Active']);
    }
};
