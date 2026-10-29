<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * تهجير إضافة حقول الملف التعريفي الموسع لجدول المدارس (الشريحة 6).
 *
 * الحقول المضافة (جميعها nullable لحماية وتوافق الاختبارات السابقة):
 * - address: العنوان وموقع المدرسة.
 * - phone: هاتف التواصل.
 * - email: البريد الإلكتروني للمدرسة.
 * - educational_admin: الإدارة أو المديرية التعليمية التابعة.
 * - building_type: نوع المبنى (حكومي، مستأجر، تبرع، خيري).
 * - shift_type: نوع الفترة (صباحي، مسائي، فترتان).
 * - total_area: المساحة الإجمالية للأرض بالمتر المربع.
 * - built_up_area: مساحة البناء المغطى بالمتر المربع.
 */
return new class extends Migration
{
    /**
     * تشغيل التهجير.
     */
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->string('address', 255)->nullable()->after('governorate');
            $table->string('phone', 50)->nullable()->after('address');
            $table->string('email', 100)->nullable()->after('phone');
            $table->string('educational_admin', 100)->nullable()->after('email');
            $table->string('building_type', 50)->nullable()->after('educational_admin');
            $table->string('shift_type', 50)->nullable()->after('building_type');
            $table->decimal('total_area', 10, 2)->nullable()->after('shift_type');
            $table->decimal('built_up_area', 10, 2)->nullable()->after('total_area');
        });
    }

    /**
     * إلغاء التهجير.
     */
    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropColumn([
                'address',
                'phone',
                'email',
                'educational_admin',
                'building_type',
                'shift_type',
                'total_area',
                'built_up_area',
            ]);
        });
    }
};
