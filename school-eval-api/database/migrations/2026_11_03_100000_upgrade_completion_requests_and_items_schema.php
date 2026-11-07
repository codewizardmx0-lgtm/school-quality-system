<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * تشغيل التهجير: ترقية هيكلية طلبات الاستكمال وبنودها (U-03, U-11, U-29).
     *
     * التعديلات:
     * 1. جدول completion_requests:
     *    - إضافة completion_deadline (dateTime، إلزامي).
     *    - إضافة deadline_extended_at (dateTime، اختياري).
     *    - إضافة deadline_extensions_count (unsignedInteger، افتراضي 0).
     *
     * 2. جدول completion_request_items:
     *    - إسقاط قيد الفحص القديم chk_completion_item_target المرتبط بـ evidence_id.
     *    - إسقاط عمود evidence_id القديم إن وجد بعد إسقاط قيده سابقاً.
     *    - إضافة عمود evidence_link_id (مفتاح أجنبي اختياري يربط بـ evidence_links.id).
     *    - تعديل indicator_id ليصبح إلزامياً (NOT NULL).
     *    - إضافة قيد الفحص الجديد chk_completion_item_indicator.
     */
    public function up(): void
    {
        // 1. ترقية جدول completion_requests
        Schema::table('completion_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('completion_requests', 'completion_deadline')) {
                $table->dateTime('completion_deadline')->nullable()->after('issued_by_user_id');
            }
            if (!Schema::hasColumn('completion_requests', 'deadline_extended_at')) {
                $table->dateTime('deadline_extended_at')->nullable()->after('completion_deadline');
            }
            if (!Schema::hasColumn('completion_requests', 'deadline_extensions_count')) {
                $table->unsignedInteger('deadline_extensions_count')->default(0)->after('deadline_extended_at');
            }
        });

        // 2. ترقية جدول completion_request_items
        // أ. إسقاط قيد الفحص القديم
        try {
            if (DB::getDriverName() !== 'sqlite') {
                DB::statement('ALTER TABLE completion_request_items DROP CHECK chk_completion_item_target');
            }
        } catch (\Throwable $e) {
            // في حال كان القيد محذوفاً مسبقاً
        }

        Schema::table('completion_request_items', function (Blueprint $table) {
            // ب. إسقاط عمود evidence_id القديم إن وجد
            if (Schema::hasColumn('completion_request_items', 'evidence_id')) {
                $table->dropColumn('evidence_id');
            }

            // ج. إضافة عمود evidence_link_id
            if (!Schema::hasColumn('completion_request_items', 'evidence_link_id')) {
                $table->unsignedInteger('evidence_link_id')->nullable()->after('indicator_id');
                $table->foreign('evidence_link_id')
                    ->references('id')
                    ->on('evidence_links')
                    ->nullOnDelete();
            }

            // د. جعل indicator_id إلزامياً
            if (DB::getDriverName() !== 'sqlite') {
                $table->unsignedInteger('indicator_id')->nullable(false)->change();
            }
        });

        // هـ. إضافة قيد الفحص الجديد (تجاوز في sqlite لعدم دعمه ADD CONSTRAINT بعد الإنشاء)
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE completion_request_items ADD CONSTRAINT chk_completion_item_indicator CHECK (indicator_id IS NOT NULL)');
        }
    }

    /**
     * إلغاء التهجير وعكس التغييرات بترتيب آمن.
     */
    public function down(): void
    {
        // 1. عكس تعديلات completion_request_items
        try {
            DB::statement('ALTER TABLE completion_request_items DROP CHECK chk_completion_item_indicator');
        } catch (\Throwable $e) {
        }

        Schema::table('completion_request_items', function (Blueprint $table) {
            if (Schema::hasColumn('completion_request_items', 'evidence_link_id')) {
                $table->dropForeign(['evidence_link_id']);
                $table->dropColumn('evidence_link_id');
            }

            if (!Schema::hasColumn('completion_request_items', 'evidence_id')) {
                $table->unsignedInteger('evidence_id')->nullable()->after('indicator_id');
            }

            $table->unsignedInteger('indicator_id')->nullable()->change();
        });

        try {
            DB::statement('ALTER TABLE completion_request_items ADD CONSTRAINT chk_completion_item_target CHECK (indicator_id IS NOT NULL OR evidence_id IS NOT NULL)');
        } catch (\Throwable $e) {
        }

        // 2. عكس تعديلات completion_requests
        Schema::table('completion_requests', function (Blueprint $table) {
            $table->dropColumn([
                'completion_deadline',
                'deadline_extended_at',
                'deadline_extensions_count',
            ]);
        });
    }
};
