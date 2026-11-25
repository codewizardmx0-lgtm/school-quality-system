<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * السماح بتسجيل ملاحظات المراجعة الداخلية على مؤشرات لم تُرصد درجتها بعد (Pending)
     * دون تعارض مع قيود NOT NULL في جدول evaluation_results.
     */
    public function up(): void
    {
        if (Schema::hasTable('evaluation_results')) {
            Schema::table('evaluation_results', function (Blueprint $table) {
                $table->integer('score')->nullable()->change();
                $table->unsignedInteger('score_descriptor_id')->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // لا نُعيد فرض NOT NULL تلقائياً لتجنب فشل التراجع عند وجود سجلات مراجعة بحالة Pending
    }
};
