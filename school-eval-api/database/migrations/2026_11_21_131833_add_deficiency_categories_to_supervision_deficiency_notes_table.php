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
        Schema::table('supervision_deficiency_notes', function (Blueprint $table) {
            $table->json('deficiency_categories')->nullable()->after('deficiency_category');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('supervision_deficiency_notes', function (Blueprint $table) {
            $table->dropColumn('deficiency_categories');
        });
    }
};
