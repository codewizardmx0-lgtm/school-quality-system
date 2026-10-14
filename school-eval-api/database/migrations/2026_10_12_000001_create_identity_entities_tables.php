<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ==============================================================================================
 * ملف Migration: create_identity_entities_tables
 * ==============================================================================================
 * 
 * الجداول التي ينشئها الملف:
 * 1. roles: الأدوار الوظيفية في المنصة (مثل: مدير مدرسة، مقيّم، مشرف وزاري، مسؤول نظام).
 * 2. permissions: الصلاحيات الذرية الدقيقة (مثل: evaluations.create).
 * 3. schools: المدارس المسجلة في المنصة وبياناتها المؤسسية والجغرافية.
 * 4. ministries: الجهات الوزارية والإدارية التي يتبع لها المستخدمون الوزاريون.
 * 
 * الغرض الوظيفي:
 * يمثل هذا الملف اللبنات الأساسية لحزمة الهوية والصلاحيات والجهات (ERD-01) دون أي اعتماديات خارجية،
 * حيث تستند إليها حسابات المستخدمين وجداول الربط وصلاحيات الوصول في النظام لاحقًا.
 * 
 * ترتيب التنفيذ والعلاقات:
 * الجداول داخل هذا الملف مستقلة تمامًا ولا تشير إلى بعضها بمفاتيح أجنبية.
 * 
 * القيود المعتمدة:
 * - المفاتيح الأساسية (PK): معرفات صحيحة تزايدية increments() ذات نوع UNSIGNED INT.
 * - القيود الفريدة (UNIQUE): role_name فريد في roles، و permission_code فريد في permissions.
 * - المفاتيح الأجنبية: لا توجد في هذا الملف.
 * - سياسة الحالات (Status): استخدام VARCHAR(20) دون استخدام MySQL ENUM أو قيود CHECK عليها.
 * - الطوابع الزمنية: الجداول الأربعة لا تتضمن created_at أو updated_at مطابقة لقاموس البيانات والملحق أ.
 * ==============================================================================================
 */
return new class extends Migration
{
    /**
     * تشغيل التهجير وإنشاء الجداول.
     */
    public function up(): void
    {
        // --------------------------------------------------------------------------------------
        // جدول roles: تعريف الأدوار الوظيفية داخل النظام
        // --------------------------------------------------------------------------------------
        Schema::create('roles', function (Blueprint $table) {
            $table->increments('role_id'); // المعرف الفريد للدور (PK)
            $table->string('role_name', 50)->unique(); // اسم الدور الوظيفي - فريد
            $table->string('description', 255)->nullable(); // وصف الدور واختصاصه
        });

        // --------------------------------------------------------------------------------------
        // جدول permissions: الصلاحيات الذرية الممنوحة للأدوار
        // --------------------------------------------------------------------------------------
        Schema::create('permissions', function (Blueprint $table) {
            $table->increments('permission_id'); // المعرف الفريد للصلاحية (PK)
            $table->string('permission_code', 50)->unique(); // رمز الصلاحية الفريد بالإنجليزية (مثل: evaluations.create)
            $table->string('permission_name', 100); // اسم الصلاحية بالعربية
            $table->string('description', 255)->nullable(); // وصف الصلاحية
        });

        // --------------------------------------------------------------------------------------
        // جدول schools: المدارس التابعة للنظام
        // --------------------------------------------------------------------------------------
        Schema::create('schools', function (Blueprint $table) {
            $table->increments('school_id'); // المعرف الفريد للمدرسة (PK)
            $table->string('school_name', 150); // الاسم الرسمي للمدرسة
            $table->string('educational_stage', 50); // المرحلة التعليمية (ابتدائي، متوسط، ثانوي...)
            $table->string('identification_data', 100)->nullable(); // الرقم الإحصائي أو البيانات التعريفية
            $table->string('educational_district', 100); // المديرية التعليمية التابعة لها
            $table->string('governorate', 100); // المحافظة
            $table->string('status', 20); // حالة المدرسة (Active, Inactive) كنص VARCHAR
        });

        // --------------------------------------------------------------------------------------
        // جدول ministries: الجهات والإدارات الوزارية
        // --------------------------------------------------------------------------------------
        Schema::create('ministries', function (Blueprint $table) {
            $table->increments('ministry_id'); // المعرف الفريد للجهة الوزارية (PK)
            $table->string('ministry_name', 150); // الاسم الرسمي للجهة الوزارية
            $table->string('description', 255)->nullable(); // وصف اختصاص الجهة الوزارية
        });
    }

    /**
     * إلغاء التهجير وحذف الجداول بترتيب عكسي آمن.
     */
    public function down(): void
    {
        Schema::dropIfExists('ministries');
        Schema::dropIfExists('schools');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
    }
};
