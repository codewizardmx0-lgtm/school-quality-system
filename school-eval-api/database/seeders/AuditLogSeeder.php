<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\School;
use App\Models\User;
use App\Services\AuditLoggerService;
use Illuminate\Database\Seeder;

/**
 * Seeder: AuditLogSeeder
 * 
 * الوظيفة: تغذية سجل التدقيق الأمني بأحداث حقيقية ومتنوعة من منظومة AuditLoggerService
 * تغطي كافة أنواع الأحداث والحسابات الحقيقية لتفعيل Pagination (> 20 سجل) وفلاتر الفاعل والنوع.
 */
class AuditLogSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('username', 'admin')->first();
        $principalBelqees = User::where('username', 'principal_belqees')->first();
        $evaluatorBelqees = User::where('username', 'quality_belqees')->first();
        $principalFarouq = User::where('username', 'principal_farouq')->first();
        $evaluatorFarouq = User::where('username', 'quality_farouq')->first();
        $supervisor = User::where('username', 'supervisor_ministry')->first();
        $standardsManager = User::where('username', 'standards_manager_ministry')->first();

        $belqees = School::where('identification_data', 'SCH-SANAA-2026-001')->first();
        $farouq = School::where('identification_data', 'SCH-TAIZ-2026-002')->first();

        $logs = [
            // 1
            [
                'user_id'     => $admin?->user_id,
                'school_id'   => null,
                'action'      => AuditLoggerService::ACTION_LOGIN_SUCCESS,
                'target_type' => 'App\Models\User',
                'target_id'   => $admin?->user_id,
                'old_values'  => null,
                'new_values'  => ['ip' => '192.168.1.10', 'auth_method' => 'sanctum_token'],
                'ip_address'  => '192.168.1.10',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0',
                'created_at'  => now()->subMinutes(10),
            ],
            // 2
            [
                'user_id'     => $evaluatorBelqees?->user_id,
                'school_id'   => $belqees?->school_id,
                'action'      => AuditLoggerService::ACTION_EVALUATION_SCORED,
                'target_type' => 'App\Models\EvaluationResult',
                'target_id'   => 101,
                'old_values'  => ['score' => 2],
                'new_values'  => ['score' => 3, 'indicator_id' => 14],
                'ip_address'  => '10.0.1.25',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/119.0',
                'created_at'  => now()->subMinutes(25),
            ],
            // 3
            [
                'user_id'     => $evaluatorBelqees?->user_id,
                'school_id'   => $belqees?->school_id,
                'action'      => AuditLoggerService::ACTION_EVALUATION_SUBMITTED,
                'target_type' => 'App\Models\Evaluation',
                'target_id'   => 1,
                'old_values'  => ['status' => 'InProgress'],
                'new_values'  => ['status' => 'Submitted'],
                'ip_address'  => '10.0.1.25',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/119.0',
                'created_at'  => now()->subMinutes(40),
            ],
            // 4
            [
                'user_id'     => $supervisor?->user_id,
                'school_id'   => $belqees?->school_id,
                'action'      => AuditLoggerService::ACTION_COMPLETION_CREATED,
                'target_type' => 'App\Models\CompletionRequest',
                'target_id'   => 5,
                'old_values'  => null,
                'new_values'  => ['reason' => 'شواهد المؤشر 2 غير مكتملة', 'deadline' => now()->addDays(7)->toDateString()],
                'ip_address'  => '172.16.0.4',
                'user_agent'  => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/119.0',
                'created_at'  => now()->subHours(1),
            ],
            // 5
            [
                'user_id'     => $standardsManager?->user_id,
                'school_id'   => null,
                'action'      => AuditLoggerService::ACTION_STANDARD_VERSION_ACTIVATED,
                'target_type' => 'App\Models\StandardVersion',
                'target_id'   => 1,
                'old_values'  => ['status' => 'Draft'],
                'new_values'  => ['status' => 'Active', 'version' => '3.0'],
                'ip_address'  => '172.16.0.12',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0',
                'created_at'  => now()->subHours(2),
            ],
            // 6
            [
                'user_id'     => $standardsManager?->user_id,
                'school_id'   => null,
                'action'      => AuditLoggerService::ACTION_STANDARD_VERSION_AUTO_ARCHIVED,
                'target_type' => 'App\Models\StandardVersion',
                'target_id'   => 2,
                'old_values'  => ['status' => 'Active'],
                'new_values'  => ['status' => 'Archived'],
                'ip_address'  => '172.16.0.12',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0',
                'created_at'  => now()->subHours(3),
            ],
            // 7
            [
                'user_id'     => $principalBelqees?->user_id,
                'school_id'   => $belqees?->school_id,
                'action'      => AuditLoggerService::ACTION_LOGIN_SUCCESS,
                'target_type' => 'App\Models\User',
                'target_id'   => $principalBelqees?->user_id,
                'old_values'  => null,
                'new_values'  => ['ip' => '10.0.1.15'],
                'ip_address'  => '10.0.1.15',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/118.0',
                'created_at'  => now()->subHours(4),
            ],
            // 8
            [
                'user_id'     => $principalBelqees?->user_id,
                'school_id'   => $belqees?->school_id,
                'action'      => AuditLoggerService::ACTION_PASSWORD_CHANGED,
                'target_type' => 'App\Models\User',
                'target_id'   => $principalBelqees?->user_id,
                'old_values'  => null,
                'new_values'  => ['updated_at' => now()->subHours(4)->toIso8601String()],
                'ip_address'  => '10.0.1.15',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/118.0',
                'created_at'  => now()->subHours(4)->addMinutes(5),
            ],
            // 9
            [
                'user_id'     => $evaluatorBelqees?->user_id,
                'school_id'   => $belqees?->school_id,
                'action'      => AuditLoggerService::ACTION_EVIDENCE_UNLINKED,
                'target_type' => 'App\Models\EvidenceLink',
                'target_id'   => 45,
                'old_values'  => ['attachment_id' => 12, 'indicator_id' => 8],
                'new_values'  => null,
                'ip_address'  => '10.0.1.25',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/119.0',
                'created_at'  => now()->subHours(5),
            ],
            // 10
            [
                'user_id'     => $supervisor?->user_id,
                'school_id'   => $belqees?->school_id,
                'action'      => AuditLoggerService::ACTION_COMPLETION_DEADLINE_EXTENDED,
                'target_type' => 'App\Models\CompletionRequest',
                'target_id'   => 5,
                'old_values'  => ['deadline' => now()->addDays(7)->toDateString()],
                'new_values'  => ['deadline' => now()->addDays(14)->toDateString()],
                'ip_address'  => '172.16.0.4',
                'user_agent'  => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/119.0',
                'created_at'  => now()->subHours(6),
            ],
            // 11
            [
                'user_id'     => $evaluatorBelqees?->user_id,
                'school_id'   => $belqees?->school_id,
                'action'      => AuditLoggerService::ACTION_COMPLETION_RESUBMITTED,
                'target_type' => 'App\Models\CompletionRequest',
                'target_id'   => 5,
                'old_values'  => ['status' => 'Pending'],
                'new_values'  => ['status' => 'Resubmitted'],
                'ip_address'  => '10.0.1.25',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/119.0',
                'created_at'  => now()->subHours(7),
            ],
            // 12
            [
                'user_id'     => $supervisor?->user_id,
                'school_id'   => $belqees?->school_id,
                'action'      => AuditLoggerService::ACTION_COMPLETION_CLOSED,
                'target_type' => 'App\Models\CompletionRequest',
                'target_id'   => 5,
                'old_values'  => ['status' => 'Resubmitted'],
                'new_values'  => ['status' => 'Closed'],
                'ip_address'  => '172.16.0.4',
                'user_agent'  => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/119.0',
                'created_at'  => now()->subHours(8),
            ],
            // 13
            [
                'user_id'     => $supervisor?->user_id,
                'school_id'   => $farouq?->school_id,
                'action'      => AuditLoggerService::ACTION_EVALUATION_DIRECT_CLOSED,
                'target_type' => 'App\Models\Evaluation',
                'target_id'   => 2,
                'old_values'  => ['status' => 'Submitted'],
                'new_values'  => ['status' => 'Completed'],
                'ip_address'  => '172.16.0.4',
                'user_agent'  => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/119.0',
                'created_at'  => now()->subHours(9),
            ],
            // 14
            [
                'user_id'     => $evaluatorFarouq?->user_id,
                'school_id'   => $farouq?->school_id,
                'action'      => AuditLoggerService::ACTION_LOGIN_SUCCESS,
                'target_type' => 'App\Models\User',
                'target_id'   => $evaluatorFarouq?->user_id,
                'old_values'  => null,
                'new_values'  => ['ip' => '10.0.2.14'],
                'ip_address'  => '10.0.2.14',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0',
                'created_at'  => now()->subHours(10),
            ],
            // 15
            [
                'user_id'     => $principalFarouq?->user_id,
                'school_id'   => $farouq?->school_id,
                'action'      => AuditLoggerService::ACTION_LOGIN_SUCCESS,
                'target_type' => 'App\Models\User',
                'target_id'   => $principalFarouq?->user_id,
                'old_values'  => null,
                'new_values'  => ['ip' => '10.0.2.10'],
                'ip_address'  => '10.0.2.10',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0',
                'created_at'  => now()->subHours(11),
            ],
            // 16
            [
                'user_id'     => null,
                'school_id'   => null,
                'action'      => AuditLoggerService::ACTION_LOGIN_FAILED,
                'target_type' => 'App\Models\User',
                'target_id'   => null,
                'old_values'  => null,
                'new_values'  => ['attempted_username' => 'root_hacker', 'reason' => 'Invalid credentials'],
                'ip_address'  => '45.139.210.88',
                'user_agent'  => 'Python-urllib/3.9',
                'created_at'  => now()->subHours(12),
            ],
            // 17
            [
                'user_id'     => $admin?->user_id,
                'school_id'   => null,
                'action'      => 'school.created',
                'target_type' => 'App\Models\School',
                'target_id'   => 10,
                'old_values'  => null,
                'new_values'  => ['school_name' => 'مدارس رواد اليمن الأهلية', 'school_type' => 'private'],
                'ip_address'  => '192.168.1.10',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0',
                'created_at'  => now()->subHours(13),
            ],
            // 18
            [
                'user_id'     => $admin?->user_id,
                'school_id'   => 1,
                'action'      => 'school.assigned_principal',
                'target_type' => 'App\Models\User',
                'target_id'   => $principalBelqees?->user_id,
                'old_values'  => ['school_id' => null],
                'new_values'  => ['school_id' => 1],
                'ip_address'  => '192.168.1.10',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0',
                'created_at'  => now()->subHours(14),
            ],
            // 19
            [
                'user_id'     => $admin?->user_id,
                'school_id'   => 1,
                'action'      => 'school.assigned_evaluator',
                'target_type' => 'App\Models\User',
                'target_id'   => $evaluatorBelqees?->user_id,
                'old_values'  => ['school_id' => null],
                'new_values'  => ['school_id' => 1],
                'ip_address'  => '192.168.1.10',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0',
                'created_at'  => now()->subHours(15),
            ],
            // 20
            [
                'user_id'     => $evaluatorFarouq?->user_id,
                'school_id'   => $farouq?->school_id,
                'action'      => AuditLoggerService::ACTION_EVALUATION_SCORED,
                'target_type' => 'App\Models\EvaluationResult',
                'target_id'   => 205,
                'old_values'  => null,
                'new_values'  => ['score' => 2, 'indicator_id' => 3],
                'ip_address'  => '10.0.2.14',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0',
                'created_at'  => now()->subHours(16),
            ],
            // 21
            [
                'user_id'     => $evaluatorBelqees?->user_id,
                'school_id'   => $belqees?->school_id,
                'action'      => AuditLoggerService::ACTION_LOGOUT,
                'target_type' => 'App\Models\User',
                'target_id'   => $evaluatorBelqees?->user_id,
                'old_values'  => null,
                'new_values'  => null,
                'ip_address'  => '10.0.1.25',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/119.0',
                'created_at'  => now()->subHours(17),
            ],
            // 22
            [
                'user_id'     => $principalBelqees?->user_id,
                'school_id'   => $belqees?->school_id,
                'action'      => AuditLoggerService::ACTION_LOGOUT,
                'target_type' => 'App\Models\User',
                'target_id'   => $principalBelqees?->user_id,
                'old_values'  => null,
                'new_values'  => null,
                'ip_address'  => '10.0.1.15',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/118.0',
                'created_at'  => now()->subHours(18),
            ],
            // 23
            [
                'user_id'     => $supervisor?->user_id,
                'school_id'   => null,
                'action'      => AuditLoggerService::ACTION_LOGIN_SUCCESS,
                'target_type' => 'App\Models\User',
                'target_id'   => $supervisor?->user_id,
                'old_values'  => null,
                'new_values'  => ['ip' => '172.16.0.4'],
                'ip_address'  => '172.16.0.4',
                'user_agent'  => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/119.0',
                'created_at'  => now()->subDays(1),
            ],
            // 24
            [
                'user_id'     => $standardsManager?->user_id,
                'school_id'   => null,
                'action'      => AuditLoggerService::ACTION_LOGIN_SUCCESS,
                'target_type' => 'App\Models\User',
                'target_id'   => $standardsManager?->user_id,
                'old_values'  => null,
                'new_values'  => ['ip' => '172.16.0.12'],
                'ip_address'  => '172.16.0.12',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0',
                'created_at'  => now()->subDays(1)->subHours(2),
            ],
            // 25
            [
                'user_id'     => $admin?->user_id,
                'school_id'   => null,
                'action'      => 'school.updated',
                'target_type' => 'App\Models\School',
                'target_id'   => 1,
                'old_values'  => ['school_name' => 'بلقيس للبنات'],
                'new_values'  => ['school_name' => 'مدرسة بلقيس الثانوية للبنات'],
                'ip_address'  => '192.168.1.10',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0',
                'created_at'  => now()->subDays(1)->subHours(4),
            ],
            // 26
            [
                'user_id'     => null,
                'school_id'   => null,
                'action'      => AuditLoggerService::ACTION_LOGIN_FAILED,
                'target_type' => 'App\Models\User',
                'target_id'   => null,
                'old_values'  => null,
                'new_values'  => ['attempted_username' => 'admin_test', 'reason' => 'Bad password'],
                'ip_address'  => '103.45.88.211',
                'user_agent'  => 'Go-http-client/1.1',
                'created_at'  => now()->subDays(2),
            ],
            // 27
            [
                'user_id'     => $admin?->user_id,
                'school_id'   => null,
                'action'      => AuditLoggerService::ACTION_LOGIN_SUCCESS,
                'target_type' => 'App\Models\User',
                'target_id'   => $admin?->user_id,
                'old_values'  => null,
                'new_values'  => ['ip' => '192.168.1.10'],
                'ip_address'  => '192.168.1.10',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/118.0',
                'created_at'  => now()->subDays(2)->subHours(3),
            ],
            // 28
            [
                'user_id'     => $admin?->user_id,
                'school_id'   => null,
                'action'      => AuditLoggerService::ACTION_LOGOUT,
                'target_type' => 'App\Models\User',
                'target_id'   => $admin?->user_id,
                'old_values'  => null,
                'new_values'  => null,
                'ip_address'  => '192.168.1.10',
                'user_agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/118.0',
                'created_at'  => now()->subDays(2)->subHours(1),
            ],
        ];

        foreach ($logs as $logData) {
            AuditLog::create($logData);
        }
    }
}
