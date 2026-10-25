<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Models\Role;
use App\Models\Permission;
use App\Models\RolePermission;
use App\Models\School;
use App\Models\Ministry;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Session;
use App\Models\StandardVersion;
use App\Models\Standard;
use App\Models\SubStandard;
use App\Models\Indicator;
use App\Models\ScoreLevel;
use App\Models\IndicatorScoreDescriptor;
use App\Models\IndicatorEvidenceRequirement;
use App\Models\VerificationTool;
use App\Models\IndicatorVerificationMethod;
use App\Models\EvaluationCycle;
use App\Models\CycleParticipation;
use App\Models\Evaluation;
use App\Models\EvaluationResult;
use App\Models\Evidence;
use App\Models\EvidenceVersion;
use App\Models\Attachment;
use App\Models\Note;
use App\Models\EvaluationResultVerificationMethod;
use App\Models\ImprovementArea;
use App\Models\ImprovementPlan;
use App\Models\PlanImprovementArea;
use App\Models\ImprovementAction;
use App\Models\Report;
use App\Models\EvaluationSubmission;
use App\Models\InternalReviewNote;
use App\Models\PlanReviewNote;
use App\Models\SupervisorNote;
use App\Models\CompletionRequest;
use App\Models\CompletionRequestItem;
use App\Models\Notification;
use App\Models\AiAnalysis;
use App\Models\AiRecommendation;

class ModelsFillableTest extends TestCase
{
    /**
     * قائمة الموديلات الأربعين ومطابقتها.
     */
    protected array $models = [
        Role::class,
        Permission::class,
        RolePermission::class,
        School::class,
        Ministry::class,
        User::class,
        UserRole::class,
        Session::class,
        StandardVersion::class,
        Standard::class,
        SubStandard::class,
        Indicator::class,
        ScoreLevel::class,
        IndicatorScoreDescriptor::class,
        IndicatorEvidenceRequirement::class,
        VerificationTool::class,
        IndicatorVerificationMethod::class,
        EvaluationCycle::class,
        CycleParticipation::class,
        Evaluation::class,
        EvaluationResult::class,
        Evidence::class,
        EvidenceVersion::class,
        Attachment::class,
        Note::class,
        EvaluationResultVerificationMethod::class,
        ImprovementArea::class,
        ImprovementPlan::class,
        PlanImprovementArea::class,
        ImprovementAction::class,
        Report::class,
        EvaluationSubmission::class,
        InternalReviewNote::class,
        PlanReviewNote::class,
        SupervisorNote::class,
        CompletionRequest::class,
        CompletionRequestItem::class,
        Notification::class,
        AiAnalysis::class,
        AiRecommendation::class,
    ];

    /**
     * 1. التحقق من أن عدد الموديلات 40 بالتمام والكمال.
     */
    public function test_there_are_exactly_forty_models(): void
    {
        $this->assertCount(40, $this->models, 'يجب أن تحتوي المنظومة على 40 موديلاً بالتمام والكمال.');
    }

    /**
     * 2. التحقق من أن كل حقل في $fillable موجود فعلياً كعمود في جدول قاعدة البيانات.
     */
    public function test_fillable_attributes_exist_in_database_tables(): void
    {
        foreach ($this->models as $modelClass) {
            $model = new $modelClass();
            $table = $model->getTable();
            $fillables = $model->getFillable();

            $this->assertTrue(Schema::hasTable($table), "الجدول {$table} غير موجود في قاعدة البيانات.");

            $tableColumns = Schema::getColumnListing($table);

            foreach ($fillables as $attribute) {
                $this->assertContains(
                    $attribute,
                    $tableColumns,
                    "الموديل {$modelClass} يحتوي حقل fillable باسم '{$attribute}' غير موجود في جدول {$table}."
                );
            }
        }
    }

    /**
     * 3. التحقق من استثناء المفاتيح الأساسية التزايدية من $fillable لعدم إمكانية التلاعب بها.
     */
    public function test_auto_incrementing_primary_keys_are_guarded_from_fillable(): void
    {
        foreach ($this->models as $modelClass) {
            $model = new $modelClass();
            $pk = $model->getKeyName();

            // إذا كان المفتاح تزايدياً فردياً، يجب ألا يكون في fillable
            if (is_string($pk) && $model->getIncrementing()) {
                $this->assertNotContains(
                    $pk,
                    $model->getFillable(),
                    "الموديل {$modelClass} يحتوي على المفتاح التزايدي '{$pk}' داخل \$fillable وهذا يخالف حماية المفاتيح."
                );
            }
        }
    }

    /**
     * 4. التحقق من تطابق سياسة الطوابع الزمنية في كل موديل مع القاموس وخريطة الملحق (أ).
     */
    public function test_models_follow_timestamps_conventions(): void
    {
        // موديلات بدون timestamps إطلاقاً (13 موديلاً)
        $noTimestamps = [
            Role::class,
            Permission::class,
            RolePermission::class,
            School::class,
            Ministry::class,
            UserRole::class,
            ScoreLevel::class,
            IndicatorScoreDescriptor::class,
            IndicatorEvidenceRequirement::class,
            EvaluationResultVerificationMethod::class,
        ];

        foreach ($noTimestamps as $modelClass) {
            $model = new $modelClass();
            $this->assertFalse($model->usesTimestamps(), "الموديل {$modelClass} يجب أن يعطّل timestamps وفق القاموس.");
        }

        // موديلات بـ created_at فقط
        $createdAtOnly = [
            IndicatorVerificationMethod::class,
            PlanImprovementArea::class,
            Notification::class,
        ];

        foreach ($createdAtOnly as $modelClass) {
            $model = new $modelClass();
            $this->assertTrue($model->usesTimestamps());
            $this->assertNull($modelClass::UPDATED_AT, "الموديل {$modelClass} يجب أن يملك UPDATED_AT = null.");
            $this->assertEquals('created_at', $modelClass::CREATED_AT);
        }

        // موديلات بـ updated_at فقط
        $updatedAtOnly = [
            Report::class,
            EvaluationSubmission::class,
        ];

        foreach ($updatedAtOnly as $modelClass) {
            $model = new $modelClass();
            $this->assertTrue($model->usesTimestamps());
            $this->assertNull($modelClass::CREATED_AT, "الموديل {$modelClass} يجب أن يملك CREATED_AT = null.");
            $this->assertEquals('updated_at', $modelClass::UPDATED_AT);
        }
    }
}
