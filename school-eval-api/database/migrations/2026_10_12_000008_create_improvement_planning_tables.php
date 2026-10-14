<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * ==============================================================================================
 * ملف Migration: create_improvement_planning_tables
 * ==============================================================================================
 * 
 * الجداول التي ينشئها الملف (حزمة ERD-04):
 * 1. improvement_areas: مجالات التحسين المستخلصة من نتائج التقييم أو المؤشرات.
 * 2. improvement_plans: خطط تحسين الأداء المرتبطة بالدورة التقييمية والمدرسة معًا.
 * 3. plan_improvement_areas: جدول ربط الخطط بمجالات التحسين (علاقة Many-to-Many).
 * 4. improvement_actions: إجراءات التحسين التنفيذية المحكومة بمسؤوليها ومواعيدها وخطة عملها.
 * 
 * الغرض الوظيفي:
 * إدارة دورة التحسين المدرسي الشاملة المنبثقة عن نتائج التقييم الذاتي،
 * وضمان عدم انفصال إجراءات التحسين عن نطاق الخطط والمجالات المستهدفة رسميًا.
 * 
 * ترتيب التنفيذ والعلاقات:
 * - improvement_areas و improvement_plans يُنشآن أولاً.
 * - plan_improvement_areas ينشأ بعدهما لربطهما معًا بمفتاح مركب.
 * - improvement_actions يعتمد على plan_improvement_areas بمفتاح أجنبي مركب.
 * 
 * القيود المعتمدة والقرارات الخاصة:
 * - المفاتيح الأساسية المركبة:
 *   * plan_improvement_areas: PRIMARY KEY (plan_id, area_id).
 * - المفتاح الأجنبي المركب (Composite Foreign Key):
 *   * improvement_actions يحتوي قيد FK مركب واحد:
 *     FOREIGN KEY (plan_id, area_id) REFERENCES plan_improvement_areas (plan_id, area_id)
 *     (وليس مفتاحين بسيطين منفصلين، لضمان بقاء كل إجراء داخل نطاق مجالات خطته).
 * - قيود الفحص (CHECK Constraints):
 *   * improvement_areas: قيد chk_improvement_areas_source لضمان وجود مصدر واحد على الأقل:
 *     (result_id IS NOT NULL OR indicator_id IS NOT NULL)
 * - سياسة المفاتيح الأجنبية: السلوك الافتراضي في MySQL دون أي CASCADE أو SET NULL صريح.
 * - الطوابع الزمنية:
 *   * plan_improvement_areas يتضمن created_at فقط مطابقة لقاموس البيانات والملحق أ.
 *   * بقية الجداول تتضمن created_at و updated_at.
 * ==============================================================================================
 */
return new class extends Migration
{
    /**
     * تشغيل التهجير وإنشاء جداول التخطيط والتحسين.
     */
    public function up(): void
    {
        // --------------------------------------------------------------------------------------
        // جدول improvement_areas: مجالات التحسين المستخلصة
        // --------------------------------------------------------------------------------------
        Schema::create('improvement_areas', function (Blueprint $table) {
            $table->increments('area_id'); // المعرف الفريد لمجال التحسين (PK)
            $table->unsignedInteger('result_id')->nullable(); // مصدر المجال: نتيجة تقييم (شرطي / FK)
            $table->unsignedInteger('indicator_id')->nullable(); // مصدر المجال: مؤشر مباشرة (شرطي / FK)
            $table->string('name', 200); // اسم أو عنوان مجال التحسين
            $table->text('description')->nullable(); // الوصف والتحليل لمبررات التحسين
            $table->string('priority', 10); // أولوية المجال (Low, Medium, High)
            $table->dateTime('created_at'); // تاريخ ووقت إنشاء المجال
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تعديل للمجال

            $table->foreign('result_id')
                ->references('result_id')
                ->on('evaluation_results');

            $table->foreign('indicator_id')
                ->references('indicator_id')
                ->on('indicators');
        });

        // قيد فحص موثق: يجب أن يرتبط المجال بمصدر واحد على الأقل (نتيجة أو مؤشر)
        DB::statement('ALTER TABLE improvement_areas ADD CONSTRAINT chk_improvement_areas_source CHECK (result_id IS NOT NULL OR indicator_id IS NOT NULL)');

        // --------------------------------------------------------------------------------------
        // جدول improvement_plans: خطط تحسين الأداء للمدرسة
        // --------------------------------------------------------------------------------------
        Schema::create('improvement_plans', function (Blueprint $table) {
            $table->increments('plan_id'); // المعرف الفريد للخطة (PK)
            $table->unsignedInteger('cycle_id'); // دورة التقييم المرتبطة بها الخطة (FK)
            $table->unsignedInteger('school_id'); // المدرسة صاحبة الخطة (FK)
            $table->unsignedInteger('created_by_user_id'); // المستخدم منشئ الخطة (FK)
            $table->string('title', 200); // عنوان الخطة
            $table->date('start_date'); // تاريخ بداية تنفيذ الخطة
            $table->date('end_date'); // تاريخ نهاية تنفيذ الخطة
            $table->string('status', 20); // حالة الخطة (Draft, Active, Completed, Cancelled)
            $table->text('progress_description')->nullable(); // وصف التقدم نصيًا (بدل نسبة مئوية مفروضة)
            $table->dateTime('created_at'); // تاريخ ووقت إنشاء الخطة
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تعديل للخطة

            $table->foreign('cycle_id')
                ->references('cycle_id')
                ->on('evaluation_cycles');

            $table->foreign('school_id')
                ->references('school_id')
                ->on('schools');

            $table->foreign('created_by_user_id')
                ->references('user_id')
                ->on('users');
        });

        // --------------------------------------------------------------------------------------
        // جدول plan_improvement_areas: ربط الخطط بمجالات التحسين المتعددة
        // --------------------------------------------------------------------------------------
        Schema::create('plan_improvement_areas', function (Blueprint $table) {
            $table->unsignedInteger('plan_id'); // معرّف الخطة (جزء من المفتاح المركب وFK)
            $table->unsignedInteger('area_id'); // معرّف مجال التحسين (جزء من المفتاح المركب وFK)
            $table->dateTime('created_at'); // تاريخ ووقت الربط (لا يوجد updated_at وفق القاموس)

            $table->primary(['plan_id', 'area_id']); // مفتاح أساسي مركب

            $table->foreign('plan_id')
                ->references('plan_id')
                ->on('improvement_plans');

            $table->foreign('area_id')
                ->references('area_id')
                ->on('improvement_areas');
        });

        // --------------------------------------------------------------------------------------
        // جدول improvement_actions: إجراءات التحسين التنفيذية
        // --------------------------------------------------------------------------------------
        Schema::create('improvement_actions', function (Blueprint $table) {
            $table->increments('action_id'); // المعرف الفريد للإجراء (PK)
            $table->unsignedInteger('plan_id'); // معرّف الخطة الحاوية (جزء من القيد الأجنبي المركب)
            $table->unsignedInteger('area_id'); // معرّف المجال المستهدف (جزء من القيد الأجنبي المركب)
            $table->string('title', 200); // عنوان الإجراء التنفيذي
            $table->string('responsible_person_description', 150); // وصف الشخص أو الجهة المسؤولة عن التنفيذ
            $table->date('start_date'); // تاريخ بداية تنفيذ الإجراء
            $table->date('due_date'); // الموعد النهائي للإنجاز (أساس تذكير اقتراب المهلة)
            $table->string('status', 20); // حالة الإجراء (Pending, InProgress, Done, Cancelled)
            $table->text('progress_description')->nullable(); // وصف التقدم الفعلي في تنفيذ الإجراء
            $table->dateTime('created_at'); // تاريخ ووقت إنشاء الإجراء
            $table->dateTime('updated_at'); // تاريخ ووقت آخر تحديث للإجراء

            // قيد المفتاح الأجنبي المركب: يضمن أن الإجراء لا يخرج عن نطاق الخطة ومجالاتها المعتمدة
            $table->foreign(['plan_id', 'area_id'])
                ->references(['plan_id', 'area_id'])
                ->on('plan_improvement_areas');
        });
    }

    /**
     * إلغاء التهجير وحذف الجداول بترتيب عكسي آمن، مع إسقاط قيد الفحص أولاً.
     */
    public function down(): void
    {
        Schema::dropIfExists('improvement_actions');
        Schema::dropIfExists('plan_improvement_areas');
        Schema::dropIfExists('improvement_plans');

        // إسقاط قيد الفحص قبل حذف جدول مجالات التحسين
        DB::statement('ALTER TABLE improvement_areas DROP CHECK chk_improvement_areas_source');
        Schema::dropIfExists('improvement_areas');
    }
};
