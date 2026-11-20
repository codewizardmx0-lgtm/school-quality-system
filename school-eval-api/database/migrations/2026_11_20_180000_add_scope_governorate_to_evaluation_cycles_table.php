<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('evaluation_cycles') && !Schema::hasColumn('evaluation_cycles', 'scope_governorate')) {
            Schema::table('evaluation_cycles', function (Blueprint $table) {
                $table->string('scope_governorate', 100)->nullable()->after('academic_year');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('evaluation_cycles') && Schema::hasColumn('evaluation_cycles', 'scope_governorate')) {
            Schema::table('evaluation_cycles', function (Blueprint $table) {
                $table->dropColumn('scope_governorate');
            });
        }
    }
};
