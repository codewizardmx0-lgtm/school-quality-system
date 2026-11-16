<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * إضافة عمود covered_requirements (JSON) إلى جدول evidence_links.
 *
 * يتيح هذا العمود تحديد المتطلبات الإلزامية المغطاة بواسطة شاهد واحد
 * دون كسر قيد التفرّد uq_ev_links_eval_ind_doc_ver.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('evidence_links', function (Blueprint $table) {
            if (!Schema::hasColumn('evidence_links', 'covered_requirements')) {
                $table->json('covered_requirements')->nullable()->after('justification');
            }
        });
    }

    public function down(): void
    {
        Schema::table('evidence_links', function (Blueprint $table) {
            if (Schema::hasColumn('evidence_links', 'covered_requirements')) {
                $table->dropColumn('covered_requirements');
            }
        });
    }
};
