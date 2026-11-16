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
        // 1. إضافة حقل اسم الدورة التقييمية name إلى جدول evaluation_cycles
        if (Schema::hasTable('evaluation_cycles') && !Schema::hasColumn('evaluation_cycles', 'name')) {
            Schema::table('evaluation_cycles', function (Blueprint $table) {
                $table->string('name', 100)->nullable()->after('version_id');
            });
        }

        // 2. إنشاء جدول رموز استعادة كلمة المرور password_reset_tokens
        if (!Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $table) {
                $table->string('email')->index();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('evaluation_cycles') && Schema::hasColumn('evaluation_cycles', 'name')) {
            Schema::table('evaluation_cycles', function (Blueprint $table) {
                $table->dropColumn('name');
            });
        }

        Schema::dropIfExists('password_reset_tokens');
    }
};
