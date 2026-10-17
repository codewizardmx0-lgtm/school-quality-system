<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Models\School;
use App\Models\Ministry;
use App\Models\User;
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
use App\Models\Evaluation;
use App\Models\EvaluationResult;
use App\Models\Evidence;
use App\Models\EvidenceVersion;
use App\Models\Note;
use App\Models\EvaluationResultVerificationMethod;
use App\Models\ImprovementPlan;
use App\Models\ImprovementArea;
use App\Models\ImprovementAction;
use App\Models\Report;
use App\Models\EvaluationSubmission;
use App\Models\InternalReviewNote;
use App\Models\PlanReviewNote;
use App\Models\SupervisorNote;
use App\Models\CompletionRequest;
use App\Models\CompletionRequestItem;
use App\Models\AiAnalysis;
use App\Models\AiRecommendation;

class CoreEntitiesCreationAndRelationsTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * اختبار إنشاء السلسلة الهرمية الكاملة للإطار المرجعي والمعايير والمؤشرات والتحقق من العلاقات في الاتجاهين
     */
    public function test_standard_reference_hierarchy_creation_and_bidirectional_relations(): void
    {
        $version = StandardVersion::create([
            'version_no' => 'V_REF_' . substr(uniqid(), -10),
            'issue_date' => '2026-01-15',
            'source_organization' => 'وزارة التربية والتعليم',
            'status' => 'Active',
        ]);

        $scoreLevel = ScoreLevel::create([
            'standard_version_id' => $version->version_id,
            'score_value' => 2,
            'label' => 'جيد',
            'display_order' => 2,
        ]);

        $standard = Standard::create([
            'version_id' => $version->version_id,
            'code' => 'ST_01',
            'name' => 'التعليم والتعلّم',
            'weight' => 25.50,
        ]);

        $subStandard = SubStandard::create([
            'standard_id' => $standard->standard_id,
            'code' => 'SUB_01',
            'name' => 'استراتيجيات التدريس',
        ]);

        $indicator = Indicator::create([
            'sub_standard_id' => $subStandard->sub_standard_id,
            'code' => 'IND_01',
            'name' => 'تنوع استراتيجيات التدريس المتمركزة حول المتعلم',
            'weight' => 5.00,
            'status' => 'Active',
        ]);

        $descriptor = IndicatorScoreDescriptor::create([
            'indicator_id' => $indicator->indicator_id,
            'score_level_id' => $scoreLevel->score_level_id,
            'standard_version_id' => $version->version_id,
            'label' => 'تطبيق فعّال',
            'description' => 'المعلمون يطبقون استراتيجيات متنوعة بنسبة 70%',
            'display_order' => 2,
            'is_active' => true,
        ]);

        $evidenceReq = IndicatorEvidenceRequirement::create([
            'indicator_id' => $indicator->indicator_id,
            'standard_version_id' => $version->version_id,
            'title' => 'خطط الدروس الأسبوعية',
            'required' => true,
            'display_order' => 1,
        ]);

        $tool = VerificationTool::create([
            'name' => 'بطاقة ملاحظة تدريس',
            'tool_type' => 'observation_sheet',
            'approved' => true,
        ]);

        $method = IndicatorVerificationMethod::create([
            'indicator_id' => $indicator->indicator_id,
            'tool_id' => $tool->tool_id,
            'required' => true,
            'usage_guidance' => 'تطبق على 3 حصص دراسية على الأقل',
            'created_at' => now()->format('Y-m-d H:i:s'),
        ]);

        // التحقق من العلاقات في الاتجاهين
        $this->assertEquals($version->version_id, $standard->version->version_id);
        $this->assertTrue($version->standards->contains($standard->standard_id));

        $this->assertEquals($standard->standard_id, $subStandard->standard->standard_id);
        $this->assertTrue($standard->subStandards->contains($subStandard->sub_standard_id));

        $this->assertEquals($subStandard->sub_standard_id, $indicator->subStandard->sub_standard_id);
        $this->assertTrue($subStandard->indicators->contains($indicator->indicator_id));

        $this->assertEquals($indicator->indicator_id, $descriptor->indicator->indicator_id);
        $this->assertEquals($scoreLevel->score_level_id, $descriptor->scoreLevel->score_level_id);
        $this->assertTrue($indicator->scoreDescriptors->contains($descriptor->descriptor_id));

        $this->assertEquals($indicator->indicator_id, $evidenceReq->indicator->indicator_id);
        $this->assertTrue($indicator->evidenceRequirements->contains($evidenceReq->requirement_id));

        $this->assertEquals($indicator->indicator_id, $method->indicator->indicator_id);
        $this->assertEquals($tool->tool_id, $method->tool->tool_id);
        $this->assertTrue($indicator->verificationTools->contains($tool->tool_id));
    }

    /**
     * اختبار دورة التقييم والنتائج والشواهد والملاحظات ومسار المراجعات والاستكمال
     */
    public function test_evaluation_workflow_and_review_relations(): void
    {
        $school = School::create([
            'school_name' => 'مدرسة النهضة الثانوية ' . substr(uniqid(), -6),
            'educational_stage' => 'Secondary',
            'educational_district' => 'الغربية',
            'governorate' => 'صنعاء',
            'status' => 'Active',
        ]);

        $user = User::create([
            'username' => 'eval_usr_' . substr(uniqid(), -8),
            'password_hash' => bcrypt('password'),
            'full_name' => 'مقيم داخلي معتمد',
            'email' => 'eval_' . substr(uniqid(), -8) . '@example.com',
            'user_type' => 'school',
            'school_id' => $school->school_id,
            'status' => 'Active',
        ]);

        $version = StandardVersion::create([
            'version_no' => 'V_EVAL_' . substr(uniqid(), -10),
            'issue_date' => '2026-01-01',
            'source_organization' => 'وزارة التربية',
            'status' => 'Active',
        ]);

        $scoreLevel = ScoreLevel::create([
            'standard_version_id' => $version->version_id,
            'score_value' => 3,
            'label' => 'ممتاز',
            'display_order' => 1,
        ]);

        $standard = Standard::create([
            'version_id' => $version->version_id,
            'code' => 'ST_W1',
            'name' => 'القيادة والإدارة المدرسية',
        ]);

        $subStandard = SubStandard::create([
            'standard_id' => $standard->standard_id,
            'code' => 'SUB_W1',
            'name' => 'التطوير المهني',
        ]);

        $indicator = Indicator::create([
            'sub_standard_id' => $subStandard->sub_standard_id,
            'code' => 'IND_W1',
            'name' => 'تنفيذ برامج تدريب المعلمين',
            'status' => 'Active',
        ]);

        $descriptor = IndicatorScoreDescriptor::create([
            'indicator_id' => $indicator->indicator_id,
            'score_level_id' => $scoreLevel->score_level_id,
            'standard_version_id' => $version->version_id,
            'label' => 'وصف مكتمل',
            'description' => 'تم تدريب 100% من المعلمين',
            'display_order' => 1,
            'is_active' => true,
        ]);

        $cycle = EvaluationCycle::create([
            'version_id' => $version->version_id,
            'academic_year' => '2026/2027',
            'start_date' => '2026-09-01',
            'end_date' => '2027-06-30',
            'status' => 'Active',
        ]);

        $evaluation = Evaluation::create([
            'cycle_id' => $cycle->cycle_id,
            'school_id' => $school->school_id,
            'created_by_user_id' => $user->user_id,
            'status' => 'InProgress',
        ]);

        $result = EvaluationResult::create([
            'evaluation_id' => $evaluation->evaluation_id,
            'indicator_id' => $indicator->indicator_id,
            'score_descriptor_id' => $descriptor->descriptor_id,
            'standard_version_id' => $version->version_id,
            'evaluator_user_id' => $user->user_id,
            'score' => 3,
            'textual_result' => 'الأداء ممتاز والمستندات مكتملة',
            'completion_status' => 'Completed',
        ]);

        $evidence = Evidence::create([
            'result_id' => $result->result_id,
            'indicator_id' => $indicator->indicator_id,
            'title' => 'كشف حضور ورش العمل',
            'description' => 'كشوفات موقعة من المعلمين والمدرب',
        ]);

        $evidenceVersion = EvidenceVersion::create([
            'evidence_id' => $evidence->evidence_id,
            'version_no' => 1,
            'current' => true,
        ]);

        $note = Note::create([
            'result_id' => $result->result_id,
            'author_user_id' => $user->user_id,
            'text' => 'ملاحظة: التدريب شمل معمل الحاسوب أيضاً',
        ]);

        $report = Report::create([
            'evaluation_id' => $evaluation->evaluation_id,
            'generated_at' => now()->format('Y-m-d H:i:s'),
            'status' => 'Draft',
        ]);

        $internalNote = InternalReviewNote::create([
            'report_id' => $report->report_id,
            'author_user_id' => $user->user_id,
            'text' => 'مراجعة أولية معتمدة من مدير المدرسة',
        ]);

        $submission = EvaluationSubmission::create([
            'report_id' => $report->report_id,
            'submitted_by_user_id' => $user->user_id,
            'attempt_no' => 1,
            'submitted_at' => now()->format('Y-m-d H:i:s'),
            'status' => 'Submitted',
        ]);

        $supervisorNote = SupervisorNote::create([
            'submission_id' => $submission->submission_id,
            'author_user_id' => $user->user_id,
            'text' => 'التقرير بحاجة لاستيفاء نموذج تقييم الأثر التدريبي',
        ]);

        $completionReq = CompletionRequest::create([
            'submission_id' => $submission->submission_id,
            'issued_by_user_id' => $user->user_id,
            'status' => 'Open',
        ]);

        $item = CompletionRequestItem::create([
            'request_id' => $completionReq->request_id,
            'indicator_id' => $indicator->indicator_id,
            'evidence_id' => $evidence->evidence_id,
            'missing_description' => 'إرفاق استمارات قياس الأثر بعد التدريب',
            'status' => 'Pending',
        ]);

        // التحقق من صحة الربط والعلاقات في الاتجاهين
        $this->assertEquals($evaluation->evaluation_id, $result->evaluation->evaluation_id);
        $this->assertEquals($indicator->indicator_id, $result->indicator->indicator_id);
        $this->assertTrue($result->evidences->contains($evidence->evidence_id));
        $this->assertTrue($evidence->versions->contains($evidenceVersion->evidence_version_id));
        $this->assertEquals($evidenceVersion->evidence_version_id, $evidence->currentVersion->evidence_version_id);

        $this->assertTrue($result->notes->contains($note->note_id));
        $this->assertEquals($user->user_id, $note->author->user_id);

        $this->assertTrue($evaluation->reports->contains($report->report_id));
        $this->assertTrue($report->internalReviewNotes->contains($internalNote->note_id));
        $this->assertTrue($report->submissions->contains($submission->submission_id));
        $this->assertTrue($submission->supervisorNotes->contains($supervisorNote->note_id));
        $this->assertTrue($submission->completionRequests->contains($completionReq->request_id));
        $this->assertTrue($completionReq->items->contains($item->request_item_id));
        $this->assertEquals($indicator->indicator_id, $item->indicator->indicator_id);
        $this->assertEquals($evidence->evidence_id, $item->evidence->evidence_id);
    }

    /**
     * اختبار عمليات الذكاء الاصطناعي والتوصيات والحاكمية البشرية
     */
    public function test_ai_analysis_and_recommendations_relations(): void
    {
        $school = School::create([
            'school_name' => 'مدرسة الذكاء الاصطناعي ' . substr(uniqid(), -6),
            'educational_stage' => 'Secondary',
            'educational_district' => 'الوسطى',
            'governorate' => 'الحديدة',
            'status' => 'Active',
        ]);

        $user = User::create([
            'username' => 'ai_user_' . substr(uniqid(), -8),
            'password_hash' => bcrypt('password'),
            'full_name' => 'مشرف تقييم الذكاء',
            'email' => 'ai_' . substr(uniqid(), -8) . '@example.com',
            'user_type' => 'school',
            'school_id' => $school->school_id,
            'status' => 'Active',
        ]);

        $version = StandardVersion::create([
            'version_no' => 'V_AI_' . substr(uniqid(), -10),
            'issue_date' => '2026-01-01',
            'source_organization' => 'وزارة التربية',
            'status' => 'Active',
        ]);

        $cycle = EvaluationCycle::create([
            'version_id' => $version->version_id,
            'academic_year' => '2026/2027',
            'start_date' => '2026-09-01',
            'end_date' => '2027-06-30',
            'status' => 'Active',
        ]);

        $evaluation = Evaluation::create([
            'cycle_id' => $cycle->cycle_id,
            'school_id' => $school->school_id,
            'created_by_user_id' => $user->user_id,
            'status' => 'InProgress',
        ]);

        $aiAnalysis = AiAnalysis::create([
            'evaluation_id' => $evaluation->evaluation_id,
            'requested_by_user_id' => $user->user_id,
            'analysis_date' => now()->format('Y-m-d H:i:s'),
            'input_scope' => 'results',
            'summary' => 'تحليل شامل لنقاط القوة والضعف في المدرسة',
            'status' => 'Completed',
        ]);

        $recommendation = AiRecommendation::create([
            'analysis_id' => $aiAnalysis->analysis_id,
            'type' => 'recommendation',
            'title' => 'تعزيز التعليم الرقمي',
            'description' => 'تزويد الفصول بأجهزة عرض تفاعلية',
            'priority' => 'High',
            'status' => 'PendingReview',
        ]);

        $this->assertEquals($evaluation->evaluation_id, $aiAnalysis->evaluation->evaluation_id);
        $this->assertEquals($user->user_id, $aiAnalysis->requestedBy->user_id);
        $this->assertTrue($aiAnalysis->recommendations->contains($recommendation->recommendation_id));
        $this->assertEquals($aiAnalysis->analysis_id, $recommendation->analysis->analysis_id);
    }
}
