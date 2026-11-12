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
        if (Schema::hasTable('document_versions') && !Schema::hasColumn('document_versions', 'notes')) {
            Schema::table('document_versions', function (Blueprint $table) {
                $table->text('notes')->nullable()->after('mime_type');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('document_versions') && Schema::hasColumn('document_versions', 'notes')) {
            Schema::table('document_versions', function (Blueprint $table) {
                $table->dropColumn('notes');
            });
        }
    }
};
