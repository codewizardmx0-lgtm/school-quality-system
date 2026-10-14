<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ==============================================================================================
 * ملف Migration: create_identity_relations_tables
 * ==============================================================================================
 * 
 * الجداول التي ينشئها الملف:
 * 1. role_permissions: جدول ربط الأدوار بالصلاحيات (علاقة Many-to-Many).
 * 2. user_roles: جدول ربط المستخدمين بالأدوار مع تاريخ الإسناد وتاريخ السحب.
 * 3. sessions: سجل الجلسات الوظيفية للمستخدمين وتتبع الخمول (FR-GEN-02).
 * 
 * الغرض الوظيفي:
 * يكمل منظومة الصلاحيات والتحكم بالوصول المبني على الأدوار (RBAC) الخاص بالمنصة،
 * ويوفر سجل تتبع جلسات العمل الوظيفية دون الاعتماد على جلسات Laravel الافتراضية.
 * 
 * الاعتماديات وترتيب التنفيذ:
 * يعتمد على الجداول المنشأة في الملفات السابقة: roles و permissions (ملف 01) و users (ملف 02).
 * 
 * القيود المعتمدة:
 * - المفاتيح الأساسية المركبة (Composite PK):
 *   * role_permissions: PRIMARY KEY (role_id, permission_id) يمنع تكرار الصلاحية للدور الواحد.
 *   * user_roles: PRIMARY KEY (user_id, role_id) يمنع تكرار إسناد الدور النشط للمستخدم نفسه.
 * - القيود الفريدة: session_token فريد في sessions.
 * - المفاتيح الأجنبية:
 *   * تشير إلى roles, permissions, users بنوع unsignedInteger مطابق للـ PKs.
 *   * السلوك الافتراضي في MySQL دون أي CASCADE أو SET NULL صريح.
 * - التواريخ: assigned_at إلزامي، revoked_at و ended_at اختيارية (nullable).
 * - sessions يحتوي created_at و updated_at إلزاميين لدعم تتبع التدقيق الزمني.
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
        // جدول role_permissions: إسناد الصلاحيات الذرية للأدوار
        // --------------------------------------------------------------------------------------
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->unsignedInteger('role_id'); // معرّف الدور (جزء من المفتاح المركب وFK)
            $table->unsignedInteger('permission_id'); // معرّف الصلاحية (جزء من المفتاح المركب وFK)
            $table->dateTime('assigned_at'); // تاريخ ووقت منح الصلاحية للدور

            $table->primary(['role_id', 'permission_id']); // مفتاح أساسي مركب يمنع التكرار
            $table->foreign('role_id')->references('role_id')->on('roles');
            $table->foreign('permission_id')->references('permission_id')->on('permissions');
        });

        // --------------------------------------------------------------------------------------
        // جدول user_roles: إسناد الأدوار للمستخدمين وحفظ تاريخ الإسناد أو الإلغاء
        // --------------------------------------------------------------------------------------
        Schema::create('user_roles', function (Blueprint $table) {
            $table->unsignedInteger('user_id'); // معرّف المستخدم (جزء من المفتاح المركب وFK)
            $table->unsignedInteger('role_id'); // معرّف الدور (جزء من المفتاح المركب وFK)
            $table->dateTime('assigned_at'); // تاريخ ووقت إسناد الدور
            $table->dateTime('revoked_at')->nullable(); // تاريخ ووقت سحب الدور (فارغ طالما الدور نشط)
            $table->boolean('active'); // حالة تفعيل الدور للمستخدم حاليًا

            $table->primary(['user_id', 'role_id']); // مفتاح أساسي مركب (يحفظ آخر حالة إسناد لكل مستخدم ودور)
            $table->foreign('user_id')->references('user_id')->on('users');
            $table->foreign('role_id')->references('role_id')->on('roles');
        });

        // --------------------------------------------------------------------------------------
        // جدول sessions: سجل الجلسات الوظيفية وتتبع النشاط
        // ملاحظة معمارية: هذا جدول وظيفي لسجل الجلسات (سلوك أعمال) وليس جدول جلسات Laravel الافتراضي
        // --------------------------------------------------------------------------------------
        Schema::create('sessions', function (Blueprint $table) {
            $table->increments('session_id'); // المعرف الفريد للجلسة (PK)
            $table->unsignedInteger('user_id'); // صاحب الجلسة (FK)
            $table->string('session_token', 255)->unique(); // رمز الجلسة أو بصمة التجزئة - فريد
            $table->dateTime('started_at'); // وقت بداية الجلسة
            $table->dateTime('ended_at')->nullable(); // وقت نهاية الجلسة (فارغ ما دامت الجلسة جارية)
            $table->boolean('active'); // هل الجلسة نشطة حاليًا
            $table->dateTime('created_at'); // تاريخ إنشاء سجل الجلسة
            $table->dateTime('updated_at'); // تاريخ آخر نشاط أو تحديث للجلسة

            $table->foreign('user_id')->references('user_id')->on('users');
        });
    }

    /**
     * إلغاء التهجير وحذف الجداول بترتيب عكسي آمن.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('user_roles');
        Schema::dropIfExists('role_permissions');
    }
};
