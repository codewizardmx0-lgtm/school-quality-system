<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ==============================================================================================
 * ملف Migration: create_users_table
 * ==============================================================================================
 * 
 * الجداول التي ينشئها الملف:
 * 1. users: حسابات المستخدمين في المنصة وبيانات الدخول والارتباط المؤسسي.
 * 
 * الغرض الوظيفي:
 * يمثل الكيان المحوري للمستخدمين عبر كافة الأدوار (مدارس، مشرفون، مسؤولو نظام).
 * يربط المستخدم بجهته المؤسسية المناسبة وفق قاعدة الجهة الواحدة (XOR).
 * 
 * الاعتماديات وترتيب التنفيذ:
 * يعتمد على جدول schools وجدول ministries المُنشأين في الملف السابق (01).
 * 
 * القيود المعتمدة:
 * - المفتاح الأساسي (PK): user_id من نوع increments() (UNSIGNED INT).
 * - القيود الفريدة (UNIQUE): username فريد على مستوى النظام بالكامل.
 * - المفاتيح الأجنبية (FK):
 *   * school_id: يشير إلى schools(school_id).
 *   * ministry_id: يشير إلى ministries(ministry_id).
 *   * كلاهما nullable لتمثيل الحقل الشرطي (قاعدة الجهة الواحدة XOR تُفرض برمجيًا في طبقة التطبيق).
 *   * سياسة المفاتيح الأجنبية: لا يوجد ON DELETE أو ON UPDATE صريحين؛ السلوك الافتراضي في MySQL هو المعتمد (يرفض حذف الأب المرتبط).
 * - التواريخ: created_at و updated_at من نوع dateTime إلزاميين (NOT NULL) لدعم التتبع الزمني.
 * - الحالات: user_type و status نصوص VARCHAR(20) دون استخدام ENUM أو قيود CHECK.
 * ==============================================================================================
 */
return new class extends Migration
{
    /**
     * تشغيل التهجير وإنشاء جدول المستخدمين.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->increments('user_id'); // المعرف الفريد للمستخدم (PK)
            $table->unsignedInteger('school_id')->nullable(); // معرّف المدرسة (شرطي - إذا كان نوع المستخدم school)
            $table->unsignedInteger('ministry_id')->nullable(); // معرّف الوزارة (شرطي - إذا كان نوع المستخدم ministry)
            $table->string('username', 50)->unique(); // اسم تسجيل الدخول - فريد
            $table->string('password_hash', 255); // التجزئة الآمنة لكلمة المرور (لا تُخزن نصًا صريحًا)
            $table->string('full_name', 150); // الاسم الكامل للمستخدم
            $table->string('email', 150); // البريد الإلكتروني لاستعادة الحساب والإشعارات
            $table->string('user_type', 20); // نوع المستخدم (school, ministry, system)
            $table->string('status', 20); // حالة الحساب (Active, Disabled)
            $table->dateTime('created_at'); // تاريخ ووقت إنشاء الحساب
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تحديث للحساب

            // المفاتيح الأجنبية (السلوك الافتراضي في MySQL دون أي CASCADE)
            $table->foreign('school_id')->references('school_id')->on('schools');
            $table->foreign('ministry_id')->references('ministry_id')->on('ministries');
        });
    }

    /**
     * إلغاء التهجير وحذف جدول المستخدمين.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
