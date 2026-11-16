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
        Schema::table('improvement_plans', function (Blueprint $table) {
            $table->unsignedTinyInteger('version_number')->default(1)->after('plan_type');
            $table->unsignedInteger('parent_plan_id')->nullable()->after('version_number');
            $table->string('version_tag', 60)->nullable()->after('parent_plan_id');

            $table->foreign('parent_plan_id')
                ->references('plan_id')
                ->on('improvement_plans')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('improvement_plans', function (Blueprint $table) {
            $table->dropForeign(['parent_plan_id']);
            $table->dropColumn(['version_number', 'parent_plan_id', 'version_tag']);
        });
    }
};
