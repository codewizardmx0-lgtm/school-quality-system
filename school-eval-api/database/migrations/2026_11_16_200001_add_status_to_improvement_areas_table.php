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
        Schema::table('improvement_areas', function (Blueprint $table) {
            $table->string('status', 30)->default('pending_action')->after('target_score');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('improvement_areas', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
