<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * تهجير إنشاء جداول إحصاءات المدرسة والمرافق (الشريحة 6).
 *
 * الجداول:
 * 1. school_staff_metrics: إحصاءات الكادر التعليمي والإداري التجميعية حسب العام الدراسي.
 * 2. school_enrollment_metrics: إحصاءات الطلاب وتوزيع الفصول حسب المرحلة والصف والعام الدراسي.
 * 3. school_facilities: جرد مرافق المدرسة وتجهيزاتها وحالتها التشغيلية.
 */
return new class extends Migration
{
    /**
     * تشغيل التهجير.
     */
    public function up(): void
    {
        // --------------------------------------------------------------------------------------
        // جدول school_staff_metrics: إحصاءات الكادر التجميعية
        // --------------------------------------------------------------------------------------
        Schema::create('school_staff_metrics', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('school_id');
            $table->string('academic_year', 20); // العام الدراسي (مثل 2025/2026)
            $table->unsignedInteger('total_teachers')->default(0); // إجمالي المعلمين
            $table->unsignedInteger('qualified_teachers_count')->default(0); // المؤهلون تربوياً
            $table->unsignedInteger('permanent_teachers_count')->default(0); // المعينون رسمياً/الثابتون
            $table->unsignedInteger('matched_specialization_count')->default(0); // المتطابق تخصصهم مع المادة
            $table->unsignedInteger('total_admin_staff')->default(0); // الكادر الإداري
            $table->unsignedInteger('total_service_staff')->default(0); // الكادر الخدمي
            $table->timestamps();

            $table->foreign('school_id')->references('school_id')->on('schools')->onDelete('cascade');
            $table->unique(['school_id', 'academic_year'], 'ssm_school_year_unique');
        });

        // --------------------------------------------------------------------------------------
        // جدول school_enrollment_metrics: إحصاءات الطلاب وتوزيع الفصول
        // --------------------------------------------------------------------------------------
        Schema::create('school_enrollment_metrics', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('school_id');
            $table->string('academic_year', 20); // العام الدراسي (مثل 2025/2026)
            $table->string('education_level', 50); // المرحلة (أساسي، ثانوي، ...)
            $table->string('grade_level', 50); // الصف الدراسي (الأول، الثاني، ...)
            $table->unsignedInteger('classes_count')->default(1); // عدد الشعب / الفصول لهذا الصف
            $table->unsignedInteger('male_students_count')->default(0); // عدد الطلاب الذكور
            $table->unsignedInteger('female_students_count')->default(0); // عدد الطالبات الإناث
            $table->unsignedInteger('special_needs_count')->default(0); // عدد ذوي الاحتياجات الخاصة
            $table->unsignedInteger('talented_count')->default(0); // عدد الطلبة الموهوبين/المبدعين
            $table->timestamps();

            $table->foreign('school_id')->references('school_id')->on('schools')->onDelete('cascade');
            $table->unique(['school_id', 'academic_year', 'education_level', 'grade_level'], 'sem_school_year_grade_unique');
        });

        // --------------------------------------------------------------------------------------
        // جدول school_facilities: جرد مرافق المدرسة وتجهيزاتها
        // --------------------------------------------------------------------------------------
        Schema::create('school_facilities', function (Blueprint $table) {
            $table->increments('facility_id');
            $table->unsignedInteger('school_id');
            $table->string('facility_type', 50); // نوع المرفق (classroom, science_lab, computer_lab, library, restroom, ...)
            $table->string('name', 150); // اسم أو وصف المرفق
            $table->unsignedInteger('count')->default(1); // العدد (1 للمرفق الفردي أو عدد للمرافق المتعددة كدورات المياه)
            $table->boolean('is_usable')->default(true); // صالح للاستخدام والتشغيل
            $table->json('details')->nullable(); // تفاصيل إضافية (أجهزة صالحة، شبكة، نظافة، طفايات سلامة)
            $table->timestamps();

            $table->foreign('school_id')->references('school_id')->on('schools')->onDelete('cascade');
        });
    }

    /**
     * إلغاء التهجير.
     */
    public function down(): void
    {
        Schema::dropIfExists('school_facilities');
        Schema::dropIfExists('school_enrollment_metrics');
        Schema::dropIfExists('school_staff_metrics');
    }
};
