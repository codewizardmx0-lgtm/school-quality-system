<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Models\Attachment;
use App\Models\Notification;
use App\Models\User;
use App\Models\School;
use App\Models\StandardVersion;
use App\Models\Standard;
use App\Models\SubStandard;
use App\Models\Indicator;
use App\Models\EvaluationCycle;
use App\Models\Evaluation;
use App\Models\EvaluationResult;
use App\Models\Evidence;
use App\Models\EvidenceVersion;
use App\Models\Report;
use App\Models\IndicatorScoreDescriptor;
use App\Models\ScoreLevel;

class PolymorphicRelationsTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * اختبار العلاقة متعددة الأشكال لموديل Attachment مع EvidenceVersion و Report
     */
    public function test_attachment_polymorphic_relation_with_evidence_version_and_report(): void
    {
        // 1. تجهيز دورة ومعايير ومدرسة
        $version = StandardVersion::create([
            'version_no' => 'V_POLY_' . uniqid(),
            'issue_date' => '2026-01-01',
            'source_organization' => 'وزارة التربية',
            'status' => 'Active',
        ]);

        $scoreLevel = ScoreLevel::create([
            'standard_version_id' => $version->version_id,
            'score_value' => 3,
            'label' => 'متميز',
            'display_order' => 1,
        ]);

        $standard = Standard::create([
            'version_id' => $version->version_id,
            'code' => 'ST_P1',
            'name' => 'معيار البيئة المدرسية',
        ]);

        $subStandard = SubStandard::create([
            'standard_id' => $standard->standard_id,
            'code' => 'SUB_P1',
            'name' => 'الأمن والسلامة',
        ]);

        $indicator = Indicator::create([
            'sub_standard_id' => $subStandard->sub_standard_id,
            'code' => 'IND_P1',
            'name' => 'مخارج الطوارئ',
            'status' => 'Active',
        ]);

        $descriptor = IndicatorScoreDescriptor::create([
            'indicator_id' => $indicator->indicator_id,
            'score_level_id' => $scoreLevel->score_level_id,
            'standard_version_id' => $version->version_id,
            'label' => 'وصف ممتاز',
            'description' => 'المخارج واضحة ومطابقة للمعايير',
            'display_order' => 1,
            'is_active' => true,
        ]);

        $school = School::create([
            'school_name' => 'مدرسة تجارب متعددة الأشكال',
            'educational_stage' => 'Secondary',
            'educational_district' => 'الجنوب',
            'governorate' => 'عدن',
            'status' => 'Active',
        ]);

        $user = User::create([
            'username' => 'eval_poly_' . uniqid(),
            'password_hash' => bcrypt('password'),
            'full_name' => 'مقيم جودة',
            'email' => 'eval_poly_' . uniqid() . '@example.com',
            'user_type' => 'school',
            'school_id' => $school->school_id,
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

        $result = EvaluationResult::create([
            'evaluation_id' => $evaluation->evaluation_id,
            'indicator_id' => $indicator->indicator_id,
            'score_descriptor_id' => $descriptor->descriptor_id,
            'standard_version_id' => $version->version_id,
            'evaluator_user_id' => $user->user_id,
            'score' => 3,
            'completion_status' => 'Completed',
        ]);

        $evidence = Evidence::create([
            'result_id' => $result->result_id,
            'indicator_id' => $indicator->indicator_id,
            'title' => 'خطة الإخلاء',
            'description' => 'مخطط كروكي معتمد',
        ]);

        $evidenceVersion = EvidenceVersion::create([
            'evidence_id' => $evidence->evidence_id,
            'version_no' => 1,
            'current' => true,
        ]);

        $report = Report::create([
            'evaluation_id' => $evaluation->evaluation_id,
            'generated_at' => now()->format('Y-m-d H:i:s'),
            'status' => 'Draft',
        ]);

        // ربط مرفق بنسخة الشاهد
        $attachmentForEvidence = Attachment::create([
            'target_type' => 'evidence_version',
            'target_id' => $evidenceVersion->evidence_version_id,
            'file_name' => 'evacuation_plan.pdf',
            'file_type' => 'application/pdf',
            'file_size' => 204800,
            'storage_uri' => 'uploads/evidences/evacuation_plan.pdf',
        ]);

        // ربط مرفق بالتقرير
        $attachmentForReport = Attachment::create([
            'target_type' => 'report',
            'target_id' => $report->report_id,
            'file_name' => 'final_eval_report.pdf',
            'file_type' => 'application/pdf',
            'file_size' => 1048576,
            'storage_uri' => 'uploads/reports/final_eval_report.pdf',
        ]);

        // التحقق من العلاقة من جانب المرفق
        $this->assertEquals($evidenceVersion->evidence_version_id, $attachmentForEvidence->evidenceVersion->evidence_version_id);
        $this->assertEquals($report->report_id, $attachmentForReport->report->report_id);

        // التحقق من العلاقة من جانب الكيان الهدف
        $this->assertTrue($evidenceVersion->attachments->contains($attachmentForEvidence->attachment_id));
        $this->assertTrue($report->attachments->contains($attachmentForReport->attachment_id));
    }

    /**
     * اختبار العلاقة متعددة الأشكال لموديل Notification مع الكيان المرتبط (relatedEntity)
     */
    public function test_notification_polymorphic_relation(): void
    {
        $version = StandardVersion::create([
            'version_no' => 'VN_' . substr(uniqid(), -10),
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

        $user = User::create([
            'username' => 'notif_user_' . uniqid(),
            'password_hash' => bcrypt('password'),
            'full_name' => 'مستلم إشعار',
            'email' => 'notif_' . uniqid() . '@example.com',
            'user_type' => 'system',
            'status' => 'Active',
        ]);

        $notification = Notification::create([
            'recipient_user_id' => $user->user_id,
            'title' => 'انطلاق دورة تقييمية جديدة',
            'message' => 'تم فتح باب المشاركة في الدورة',
            'type' => 'cycle_launched',
            'related_entity_type' => 'evaluation_cycle',
            'related_entity_id' => $cycle->cycle_id,
            'is_read' => false,
            'created_at' => now()->format('Y-m-d H:i:s'),
        ]);

        $this->assertDatabaseHas('notifications', [
            'notification_id' => $notification->notification_id,
            'related_entity_type' => 'evaluation_cycle',
            'related_entity_id' => $cycle->cycle_id,
            'is_read' => 0,
        ]);

        $this->assertEquals($user->user_id, $notification->recipient->user_id);
        $this->assertTrue($user->notifications->contains($notification->notification_id));
    }
}
