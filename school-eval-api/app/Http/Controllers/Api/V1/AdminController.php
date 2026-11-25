<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\SchoolResource;
use App\Http\Responses\ApiResponse;
use App\Models\AuditLog;
use App\Models\Directorate;
use App\Models\Role;
use App\Models\School;
use App\Models\User;
use App\Services\AuditLoggerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * متحكم وحدة مسؤول النظام المركزي (AdminController).
 *
 * يوفر العمليات الحية لإدارة الأدوار، إسناد المقيّمين ومديري المدارس،
 * وإحصاءات لوحة القيادة وتصدير التقرير التنفيذي.
 * تم فصل المديريات، الأمان، النسخ الاحتياطي، وإعدادات النظام إلى متحكمات متخصصة.
 */
class AdminController extends Controller
{
    /**
     * استرجاع كافة الأدوار الوظيفية المتاحة (RBAC Roles).
     */
    public function roles(Request $request): JsonResponse
    {
        $roles = Role::orderBy('role_id')->get()->map(function ($role) {
            $codeMap = [
                'admin'                       => 'SYS',
                'school_evaluator'            => 'S1',
                'school_principal'            => 'P1',
                'ministry_standards_manager'  => 'M2',
                'ministry_supervisor'         => 'A3',
            ];
            $arabicNameMap = [
                'admin'                       => 'مدير النظام المركزي',
                'school_evaluator'            => 'مقيم المدرسة',
                'school_principal'            => 'مدير المدرسة',
                'ministry_standards_manager'  => 'مسؤول إدارة المعايير',
                'ministry_supervisor'         => 'المشرف والمراجع الوزاري',
            ];
            $typeMap = [
                'admin'                       => 'system',
                'school_evaluator'            => 'school',
                'school_principal'            => 'school',
                'ministry_standards_manager'  => 'ministry',
                'ministry_supervisor'         => 'ministry',
            ];

            return [
                'roleId'      => $role->role_id,
                'roleName'    => $role->role_name,
                'roleNameAr'  => $arabicNameMap[$role->role_name] ?? $role->role_name,
                'roleCode'    => $codeMap[$role->role_name] ?? ('R-' . $role->role_id),
                'description' => $role->description ?? '',
                'userType'    => $typeMap[$role->role_name] ?? 'school',
            ];
        });

        return ApiResponse::success(
            data: $roles,
            message: 'تم استرجاع قائمة الأدوار بنجاح.'
        );
    }

    /**
     * إعادة تعيين كلمة مرور المستخدم وإصدار بيانات اعتماد مؤقتة.
     */
    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasPermission('users.manage')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $targetUser = User::find($id);
        if (!$targetUser) {
            return ApiResponse::notFound('المستخدم المطلوب غير موجود.');
        }

        $tempPassword = 'Arteqa@' . Str::random(8);
        $targetUser->update([
            'password_hash' => Hash::make($tempPassword),
        ]);

        (new AuditLoggerService())->log(
            action: 'user.password_reset',
            targetType: 'User',
            targetId: $targetUser->user_id,
            oldValues: null,
            newValues: ['tempPasswordIssued' => true],
            userId: $user->user_id,
            descriptionAr: "قام مسؤول النظام بإعادة تعيين كلمة المرور وتوليد كلمة مرور مؤقتة للمستخدم ({$targetUser->full_name})"
        );

        return ApiResponse::success(
            data: [
                'userId'       => $targetUser->user_id,
                'username'     => $targetUser->username,
                'tempPassword' => $tempPassword,
            ],
            message: 'تمت إعادة تعيين كلمة المرور بنجاح.'
        );
    }

    /**
     * إسناد مقيّم نشط إلى مدرسة محددة.
     */
    public function assignEvaluator(Request $request, int $schoolId): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasPermission('users.manage')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $validated = $request->validate([
            'userId' => 'required|integer|exists:users,user_id',
        ]);

        $school = School::find($schoolId);
        if (!$school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        $evaluator = User::find($validated['userId']);
        if (!$evaluator || $evaluator->status !== 'Active') {
            return ApiResponse::validationError([
                'userId' => ['يجب اختيار مقيّم نشط مسجل بالنظام.'],
            ]);
        }

        $hasEvaluatorRole = $evaluator->roles()->where('roles.role_name', 'school_evaluator')->exists();
        if (!$hasEvaluatorRole) {
            return ApiResponse::validationError([
                'userId' => ['المستخدم المحدد لا يحمل دور مقيّم مدرسة (school_evaluator).'],
            ]);
        }

        if ($evaluator->school_id && (int) $evaluator->school_id !== (int) $schoolId) {
            return ApiResponse::validationError([
                'userId' => ['المقيّم مسند بالفعل لمدرسة أخرى، ويجب فك ارتباطه أولاً قبل إسناده لهذه المدرسة.'],
            ]);
        }

        $evaluator->update([
            'school_id' => $school->school_id,
            'user_type' => 'school',
        ]);

        $evaluators = $school->evaluators()->get()->map(fn ($ev) => [
            'userId'   => $ev->user_id,
            'fullName' => $ev->full_name,
            'email'    => $ev->email,
        ])->toArray();
        Cache::put("school_evaluators_{$schoolId}", $evaluators, now()->addDays(30));

        (new AuditLoggerService())->log(
            action: 'school.assigned_evaluator',
            targetType: 'School',
            targetId: $schoolId,
            userId: $user->user_id,
            descriptionAr: "قام مسؤول النظام بإسناد مقيم الجودة ({$evaluator->full_name}) إلى مدرسة ({$school->school_name})"
        );

        return ApiResponse::success(
            data: (new SchoolResource($school->fresh()))->resolve($request),
            message: 'تم إسناد المقيّم إلى المدرسة بنجاح.'
        );
    }

    /**
     * إلغاء إسناد مقيم عن مدرسة محددة (unassignEvaluator).
     */
    public function unassignEvaluator(Request $request, int $schoolId): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasPermission('users.manage')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $validated = $request->validate([
            'userId' => 'required|integer|exists:users,user_id',
        ]);

        $school = School::find($schoolId);
        if (!$school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        $evaluator = User::where('user_id', $validated['userId'])
            ->where('school_id', $schoolId)
            ->first();

        if (!$evaluator) {
            return ApiResponse::validationError([
                'userId' => ['المستخدم المحدد غير مسند لهذه المدرسة.'],
            ]);
        }

        $hasActiveCycle = $school->cycles()->where('evaluation_cycles.status', 'Active')->exists()
            || $school->evaluations()->whereIn('status', ['InProgress', 'in_progress', 'Submitted', 'submitted', 'UnderReview', 'under_review'])->exists();

        $evaluatorsCount = User::where('school_id', $schoolId)
            ->whereHas('roles', fn ($q) => $q->where('roles.role_name', 'school_evaluator'))
            ->count();

        if ($hasActiveCycle && $evaluatorsCount <= 1) {
            return ApiResponse::validationError([
                'userId' => ['لا يمكن فك ارتباط المقيّم الوحيد للمدرسة أثناء وجود دورة تقييم نشطة.'],
            ]);
        }

        $evaluator->update(['school_id' => null]);

        $evaluators = $school->evaluators()->get()->map(fn ($ev) => [
            'userId'   => $ev->user_id,
            'fullName' => $ev->full_name,
            'email'    => $ev->email,
        ])->toArray();
        Cache::put("school_evaluators_{$schoolId}", $evaluators, now()->addDays(30));

        (new AuditLoggerService())->log(
            action: 'school.unassigned_evaluator',
            targetType: 'School',
            targetId: $schoolId,
            userId: $user->user_id,
            descriptionAr: "قام مسؤول النظام بفك ارتباط مقيم الجودة ({$evaluator->full_name}) عن مدرسة ({$school->school_name})"
        );

        return ApiResponse::success(
            data: (new SchoolResource($school->fresh()))->resolve($request),
            message: 'تم فك ارتباط المقيّم عن المدرسة بنجاح.'
        );
    }

    /**
     * إسناد مدير مدرسة محدد (assignPrincipal).
     */
    public function assignPrincipal(Request $request, int $schoolId): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasPermission('users.manage')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $validated = $request->validate([
            'userId' => 'required|integer|exists:users,user_id',
        ]);

        $school = School::find($schoolId);
        if (!$school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        $principal = User::find($validated['userId']);
        if (!$principal || $principal->status !== 'Active') {
            return ApiResponse::validationError([
                'userId' => ['يجب اختيار مدير نشط مسجل بالنظام.'],
            ]);
        }

        $hasPrincipalRole = $principal->roles()->where('roles.role_name', 'school_principal')->exists();
        if (!$hasPrincipalRole) {
            return ApiResponse::validationError([
                'userId' => ['المستخدم المحدد لا يحمل دور مدير مدرسة (school_principal).'],
            ]);
        }

        if ($principal->school_id && (int) $principal->school_id !== (int) $schoolId) {
            return ApiResponse::validationError([
                'userId' => ['المدير مسند بالفعل لمدرسة أخرى، ويجب فك ارتباطه أولاً قبل إسناده لهذه المدرسة.'],
            ]);
        }

        $previousPrincipals = User::where('school_id', $schoolId)
            ->where('user_id', '!=', $principal->user_id)
            ->whereHas('roles', fn ($q) => $q->where('roles.role_name', 'school_principal'))
            ->get();

        $message = 'تم إسناد مدير المدرسة بنجاح.';
        if ($previousPrincipals->isNotEmpty()) {
            $prevNames = $previousPrincipals->pluck('full_name')->join('، ');
            User::whereIn('user_id', $previousPrincipals->pluck('user_id'))->update(['school_id' => null]);
            $message = "تم إسناد المدير الجديد ({$principal->full_name}) وفك ارتباط المدير السابق ({$prevNames}) تلقائياً.";
        }

        $principal->update([
            'school_id' => $school->school_id,
            'user_type' => 'school',
        ]);

        (new AuditLoggerService())->log(
            action: 'school.assigned_principal',
            targetType: 'School',
            targetId: $schoolId,
            userId: $user->user_id,
            descriptionAr: "قام مسؤول النظام بإسناد مدير المدرسة ({$principal->full_name}) إلى مدرسة ({$school->school_name})"
        );

        return ApiResponse::success(
            data: (new SchoolResource($school->fresh()))->resolve($request),
            message: $message
        );
    }

    /**
     * فك ارتباط مدير المدرسة (unassignPrincipal).
     */
    public function unassignPrincipal(Request $request, int $schoolId): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasPermission('users.manage')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $school = School::find($schoolId);
        if (!$school) {
            return ApiResponse::notFound('المدرسة المطلوبة غير موجودة.');
        }

        $principal = User::where('school_id', $schoolId)
            ->whereHas('roles', fn ($q) => $q->where('roles.role_name', 'school_principal'))
            ->first();

        if ($principal) {
            $principal->update(['school_id' => null]);

            (new AuditLoggerService())->log(
                action: 'school.unassigned_principal',
                targetType: 'School',
                targetId: $schoolId,
                userId: $user->user_id,
                descriptionAr: "قام مسؤول النظام بفك ارتباط مدير المدرسة ({$principal->full_name}) عن مدرسة ({$school->school_name})"
            );
        }

        return ApiResponse::success(
            data: (new SchoolResource($school->fresh()))->resolve($request),
            message: 'تم فك ارتباط مدير المدرسة بنجاح.'
        );
    }

    /**
     * تصدير التقرير التنفيذي الشامل للوحة تحكم المسؤول بتنسيق PDF رسمي.
     */
    public function exportReportPdf(Request $request)
    {
        $user = $request->user();
        if (!$user->hasPermission('users.manage') && !$user->hasRole('admin') && !$user->hasPermission('schools.view')) {
            return ApiResponse::forbidden('غير مصرح لك بتصدير التقارير التنفيذية.');
        }

        $reportService = new \App\Services\AdminExecutiveReportService();
        $pdfContent = $reportService->generateExecutivePdf();

        $fileName = 'school_eval_executive_report_' . date('Y-m-d_H-i') . '.pdf';

        return response($pdfContent, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
            'Cache-Control'       => 'private, max-age=0, must-revalidate',
            'Pragma'              => 'public',
        ]);
    }

    /**
     * إحصاءات لوحة القيادة المركزية لمسؤول النظام (Dashboard KPI Stats).
     */
    public function dashboardStats(Request $request): JsonResponse
    {
        $totalSchools = School::count();
        $activeSchools = School::where('status', 'Active')->count();
        $totalUsers = User::count();
        $activeUsers = User::where('status', 'Active')->count();

        $readySchools = School::whereHas('users', fn ($q) => $q->whereHas('roles', fn ($r) => $r->where('roles.role_name', 'school_principal')))
            ->whereHas('users', fn ($q) => $q->whereHas('roles', fn ($r) => $r->where('roles.role_name', 'school_evaluator')))
            ->count();

        $readinessRate = $totalSchools > 0 ? round(($readySchools / $totalSchools) * 100, 1) : 0.0;

        $activeDirectoratesCount = Directorate::count();
        $latestBackup = collect(Cache::get('admin_backups', []))
            ->where('status', 'completed')
            ->sortByDesc('completedAt')
            ->first();
        $lastBackupTime = $latestBackup['completedAt'] ?? null;

        // قياس صحة قاعدة البيانات وزمن الاستجابة الفعلي
        $dbStatus = 'operational';
        $dbLatencyMs = 0.0;
        try {
            $t0 = microtime(true);
            DB::select('SELECT 1');
            $dbLatencyMs = round((microtime(true) - $t0) * 1000, 1);
        } catch (\Throwable) {
            $dbStatus = 'degraded';
        }

        // قياس الاستهلاك الفعلي لمجلد التخزين المحلي والنسخ الاحتياطية
        $storageBytes = 0;
        $storageRoot = storage_path('app');
        if (is_dir($storageRoot)) {
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($storageRoot, \FilesystemIterator::SKIP_DOTS)
            );
            foreach ($iterator as $fileInfo) {
                if ($fileInfo->isFile()) {
                    $storageBytes += $fileInfo->getSize();
                }
            }
        }
        $storageUsedMb = round($storageBytes / (1024 * 1024), 2);
        $storageLimitMb = 5120;
        $storageUsagePercent = min(100.0, round(($storageUsedMb / $storageLimitMb) * 100, 1));

        $backupsDir = storage_path('app/backups');
        $backupFilesCount = is_dir($backupsDir)
            ? count(array_filter(scandir($backupsDir) ?: [], fn ($f) => $f !== '.' && $f !== '..'))
            : 0;

        // قراءة إعدادات التكامل الحية من الكاش
        $cachedSettings = Cache::get('admin_system_settings', []);
        $cachedSettings = is_array($cachedSettings) ? $cachedSettings : [];
        $aiSettings = is_array($cachedSettings['aiEngine'] ?? null) ? $cachedSettings['aiEngine'] : [];
        $storageSettings = is_array($cachedSettings['cloudStorage'] ?? null) ? $cachedSettings['cloudStorage'] : [];
        $smtpSettings = is_array($cachedSettings['smtp'] ?? null) ? $cachedSettings['smtp'] : [];

        $aiEnabled = (bool) ($aiSettings['isEnabled'] ?? true);
        $aiModel = (string) ($aiSettings['model'] ?? 'Artaqa-Assist v2.4 (Deterministic Engine)');
        $aiStatus = $aiEnabled ? (string) ($aiSettings['status'] ?? 'connected') : 'disabled';

        $cloudStorageEnabled = (bool) ($storageSettings['isEnabled'] ?? false);
        $cloudEndpoint = (string) ($storageSettings['endpoint'] ?? 'storage/app (local)');

        $smtpEnabled = (bool) ($smtpSettings['isEnabled'] ?? !empty(config('mail.mailers.smtp.host')));
        $smtpHost = (string) ($smtpSettings['smtpHost'] ?? config('mail.mailers.smtp.host') ?? 'غير مهيأ');
        $smtpPort = (int) ($smtpSettings['smtpPort'] ?? config('mail.mailers.smtp.port') ?? 587);

        $blockedIps = Cache::get('admin_blocked_ips', []);
        $blockedIpsCount = is_array($blockedIps) ? count($blockedIps) : 0;
        $breachEventsCount = AuditLog::where('action', 'auth.login_failed')->count();
        $securityIndex = max(50.0, round(100.0 - min(40.0, $breachEventsCount * 1.5), 1));
        $infraStatus = ($dbStatus === 'operational' && $storageUsagePercent < 95.0) ? 'operational' : 'degraded';

        return ApiResponse::success(
            data: [
                'totalSchools'            => $totalSchools,
                'activeSchools'           => $activeSchools,
                'schoolsReadinessRate'    => $readinessRate,
                'totalUsers'              => $totalUsers,
                'activeUsers'             => $activeUsers,
                'securityIndex'           => $securityIndex,
                'infrastructureStatus'    => $infraStatus,
                'activeDirectoratesCount' => $activeDirectoratesCount,
                'blockedIpsCount'         => $blockedIpsCount,
                'lastBackupTime'          => $lastBackupTime,
                'systemHealth'            => [
                    'database' => $dbStatus,
                    'storage'  => $storageUsagePercent < 95.0 ? 'operational' : 'warning',
                    'aiEngine' => $aiStatus,
                    'smtp'     => $smtpEnabled ? 'running' : 'disabled',
                ],
                'systemHealthDetails'     => [
                    'databaseStatus'      => $dbStatus,
                    'databaseLatencyMs'   => $dbLatencyMs,
                    'databaseEngine'      => strtoupper((string) DB::connection()->getDriverName()),
                    'storageUsedMb'       => $storageUsedMb,
                    'storageLimitMb'      => $storageLimitMb,
                    'storageUsagePercent' => $storageUsagePercent,
                    'backupFilesCount'    => $backupFilesCount,
                    'cloudStorageEnabled' => $cloudStorageEnabled,
                    'cloudEndpoint'       => $cloudEndpoint,
                    'aiEnabled'           => $aiEnabled,
                    'aiModel'             => $aiModel,
                    'aiStatus'            => $aiStatus,
                    'smtpEnabled'         => $smtpEnabled,
                    'smtpHost'            => $smtpHost,
                    'smtpPort'            => $smtpPort,
                    'firewallEnabled'     => true,
                ],
            ],
            message: null
        );
    }
}
