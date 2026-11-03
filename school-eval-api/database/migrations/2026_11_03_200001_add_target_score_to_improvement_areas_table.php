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
            $table->unsignedTinyInteger('target_score')->default(3)->nullable()->after('priority');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('improvement_areas', function (Blueprint $table) {
            $table->dropColumn('target_score');
        });
    }
};
