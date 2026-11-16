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
        if (Schema::hasTable('evaluation_results')) {
            Schema::table('evaluation_results', function (Blueprint $table) {
                if (!Schema::hasColumn('evaluation_results', 'is_excluded')) {
                    $table->boolean('is_excluded')->default(false)->after('completion_status');
                }
                if (!Schema::hasColumn('evaluation_results', 'excluded_at')) {
                    $table->dateTime('excluded_at')->nullable()->after('is_excluded');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('evaluation_results')) {
            Schema::table('evaluation_results', function (Blueprint $table) {
                if (Schema::hasColumn('evaluation_results', 'is_excluded')) {
                    $table->dropColumn('is_excluded');
                }
                if (Schema::hasColumn('evaluation_results', 'excluded_at')) {
                    $table->dropColumn('excluded_at');
                }
            });
        }
    }
};
