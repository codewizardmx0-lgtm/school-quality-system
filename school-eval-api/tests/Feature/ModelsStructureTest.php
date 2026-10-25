<?php

namespace Tests\Feature;

use Tests\TestCase;
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

class ModelsStructureTest extends TestCase
{
    /**
     * التحقق من قدرة النظام على استنساخ كافة الموديلات الـ 40 ومطابقة جداولها ومفاتيحها الأساسية.
     */
    public function test_all_forty_models_can_be_instantiated_and_have_correct_tables(): void
    {
        $expectedModels = [
            Role::class => ['table' => 'roles', 'pk' => 'role_id'],
            Permission::class => ['table' => 'permissions', 'pk' => 'permission_id'],
            RolePermission::class => ['table' => 'role_permissions', 'pk' => ['role_id', 'permission_id']],
            School::class => ['table' => 'schools', 'pk' => 'school_id'],
            Ministry::class => ['table' => 'ministries', 'pk' => 'ministry_id'],
            User::class => ['table' => 'users', 'pk' => 'user_id'],
            UserRole::class => ['table' => 'user_roles', 'pk' => ['user_id', 'role_id']],
            Session::class => ['table' => 'sessions', 'pk' => 'session_id'],
            StandardVersion::class => ['table' => 'standard_versions', 'pk' => 'version_id'],
            Standard::class => ['table' => 'standards', 'pk' => 'standard_id'],
            SubStandard::class => ['table' => 'sub_standards', 'pk' => 'sub_standard_id'],
            Indicator::class => ['table' => 'indicators', 'pk' => 'indicator_id'],
            ScoreLevel::class => ['table' => 'score_levels', 'pk' => 'score_level_id'],
            IndicatorScoreDescriptor::class => ['table' => 'indicator_score_descriptors', 'pk' => 'descriptor_id'],
            IndicatorEvidenceRequirement::class => ['table' => 'indicator_evidence_requirements', 'pk' => 'requirement_id'],
            VerificationTool::class => ['table' => 'verification_tools', 'pk' => 'tool_id'],
            IndicatorVerificationMethod::class => ['table' => 'indicator_verification_methods', 'pk' => 'id'],
            EvaluationCycle::class => ['table' => 'evaluation_cycles', 'pk' => 'cycle_id'],
            CycleParticipation::class => ['table' => 'cycle_participations', 'pk' => ['cycle_id', 'school_id']],
            Evaluation::class => ['table' => 'evaluations', 'pk' => 'evaluation_id'],
            EvaluationResult::class => ['table' => 'evaluation_results', 'pk' => 'result_id'],
            Evidence::class => ['table' => 'evidences', 'pk' => 'evidence_id'],
            EvidenceVersion::class => ['table' => 'evidence_versions', 'pk' => 'evidence_version_id'],
            Attachment::class => ['table' => 'attachments', 'pk' => 'attachment_id'],
            Note::class => ['table' => 'notes', 'pk' => 'note_id'],
            EvaluationResultVerificationMethod::class => ['table' => 'evaluation_result_verification_methods', 'pk' => 'id'],
            ImprovementArea::class => ['table' => 'improvement_areas', 'pk' => 'area_id'],
            ImprovementPlan::class => ['table' => 'improvement_plans', 'pk' => 'plan_id'],
            PlanImprovementArea::class => ['table' => 'plan_improvement_areas', 'pk' => ['plan_id', 'area_id']],
            ImprovementAction::class => ['table' => 'improvement_actions', 'pk' => 'action_id'],
            Report::class => ['table' => 'reports', 'pk' => 'report_id'],
            EvaluationSubmission::class => ['table' => 'evaluation_submissions', 'pk' => 'submission_id'],
            InternalReviewNote::class => ['table' => 'internal_review_notes', 'pk' => 'note_id'],
            PlanReviewNote::class => ['table' => 'plan_review_notes', 'pk' => 'note_id'],
            SupervisorNote::class => ['table' => 'supervisor_notes', 'pk' => 'note_id'],
            CompletionRequest::class => ['table' => 'completion_requests', 'pk' => 'request_id'],
            CompletionRequestItem::class => ['table' => 'completion_request_items', 'pk' => 'request_item_id'],
            Notification::class => ['table' => 'notifications', 'pk' => 'notification_id'],
            AiAnalysis::class => ['table' => 'ai_analysis', 'pk' => 'analysis_id'],
            AiRecommendation::class => ['table' => 'ai_recommendations', 'pk' => 'recommendation_id'],
        ];

        $this->assertCount(40, $expectedModels, 'يجب أن يكون عدد الموديلات 40 موديلاً بالتمام.');

        foreach ($expectedModels as $modelClass => $meta) {
            $model = new $modelClass();
            $this->assertEquals($meta['table'], $model->getTable(), "الجدول في الموديل {$modelClass} غير مطابق.");
            $this->assertEquals($meta['pk'], $model->getKeyName(), "المفتاح الأساسي في الموديل {$modelClass} غير مطابق.");
        }
    }

    /**
     * التحقق من تعريف العلاقات الأساسية في الموديلات دون استثناءات.
     */
    public function test_model_relationships_can_be_called(): void
    {
        $user = new User();
        $this->assertNotNull($user->school());
        $this->assertNotNull($user->ministry());
        $this->assertNotNull($user->roles());

        $standard = new Standard();
        $this->assertNotNull($standard->version());
        $this->assertNotNull($standard->subStandards());

        $indicator = new Indicator();
        $this->assertNotNull($indicator->subStandard());
        $this->assertNotNull($indicator->scoreDescriptors());

        $evaluation = new Evaluation();
        $this->assertNotNull($evaluation->cycle());
        $this->assertNotNull($evaluation->school());
        $this->assertNotNull($evaluation->creator());

        $action = new ImprovementAction();
        $this->assertNotNull($action->plan());
        $this->assertNotNull($action->area());

        $submission = new EvaluationSubmission();
        $this->assertNotNull($submission->report());
        $this->assertNotNull($submission->submittedBy());

        $notification = new Notification();
        $this->assertNotNull($notification->recipient());
        $this->assertNotNull($notification->relatedEntity());
    }
}
