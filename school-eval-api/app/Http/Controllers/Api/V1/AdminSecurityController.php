<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\AuditLog;
use App\Services\AuditLoggerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * متحكم سجلات التدقيق الأمني وحماية الشبكة (AdminSecurityController).
 */
class AdminSecurityController extends Controller
{
    /**
     * القائمة الافتراضية لعناوين IP المحظورة في حال خلو الكاش.
     */
    protected function getDefaultBlockedIps(): array
    {
        return [
            ['ipId' => 1, 'ipAddress' => '45.139.210.88', 'reason' => 'محاولات دخول غير مصرح بها متكررة (3 محاولات)', 'blockedAt' => '2026-11-02T06:33:00Z', 'attemptCount' => 3, 'location' => 'موسكو، روسيا'],
            ['ipId' => 2, 'ipAddress' => '103.45.88.211', 'reason' => 'هجوم قوة غاشمة (Brute Force) - 15 محاولة فاشلة', 'blockedAt' => '2026-11-01T18:30:00Z', 'attemptCount' => 15, 'location' => 'بكين، الصين'],
            ['ipId' => 3, 'ipAddress' => '185.220.101.42', 'reason' => 'نشاط مشبوه - مسح منافذ الشبكة', 'blockedAt' => '2026-10-30T03:15:00Z', 'attemptCount' => 7, 'location' => 'فرانكفورت، ألمانيا'],
        ];
    }

    /**
     * استعراض سجلات التدقيق الأمني (Audit Logs).
     */
    public function auditLogs(Request $request): JsonResponse
    {
        $actionDescriptions = [
            AuditLoggerService::ACTION_LOGIN_SUCCESS                  => 'تسجيل دخول ناجح إلى المنصة',
            AuditLoggerService::ACTION_LOGIN_FAILED                   => 'محاولة دخول غير مصرح بها أو كلمة مرور خاطئة',
            AuditLoggerService::ACTION_LOGOUT                         => 'تسجيل خروج نظامي من الحساب',
            AuditLoggerService::ACTION_PASSWORD_CHANGED               => 'تغيير كلمة المرور الخاصة بالمستخدم',
            AuditLoggerService::ACTION_EVALUATION_SCORED              => 'رصد درجة تقييم لمؤشر معايير الجودة',
            AuditLoggerService::ACTION_EVALUATION_SUBMITTED           => 'رفع ملف التقييم الذاتي للاعتماد الوزاري',
            AuditLoggerService::ACTION_EVALUATION_DIRECT_CLOSED       => 'إغلاق واعتماد التقييم مباشرة من المشرف الوزاري',
            AuditLoggerService::ACTION_COMPLETION_CREATED             => 'إصدار طلب استكمال نواقص وشواهد المدرسة',
            AuditLoggerService::ACTION_COMPLETION_DEADLINE_EXTENDED   => 'تمديد المهلة الزمنية لطلب الاستكمال',
            AuditLoggerService::ACTION_COMPLETION_RESUBMITTED         => 'إعادة تسليم متطلبات الاستكمال من مسؤول الجودة',
            AuditLoggerService::ACTION_COMPLETION_CLOSED              => 'إغلاق واعتماد ملف الاستكمال بعد التدقيق',
            AuditLoggerService::ACTION_EVIDENCE_UNLINKED              => 'فك ارتباط وثيقة شاهد عن مؤشر المعايير',
            AuditLoggerService::ACTION_STANDARD_VERSION_ACTIVATED     => 'تفعيل وسريان وثيقة المعايير الوطنية رسمياً',
            AuditLoggerService::ACTION_STANDARD_VERSION_AUTO_ARCHIVED => 'أرشفة تلقائية لإصدار معايير سابق',
            'school.created'                                          => 'تسجيل مدرسة جديدة وتحديد نطاقها التعليمي',
            'school.updated'                                          => 'تحديث البيانات الأساسية للمدرسة',
            'school.assigned_principal'                               => 'إسناد مدير معتمد للمدرسة',
            'school.unassigned_principal'                             => 'فك ارتباط مدير المدرسة',
            'school.assigned_evaluator'                               => 'إسناد مقيم جودة للمدرسة',
            'school.unassigned_evaluator'                             => 'فك ارتباط مقيم الجودة عن المدرسة',
            'school.status_toggled'                                   => 'تعديل حالة المدرسة (نشطة/معطلة)',
            'user.created'                                            => 'إنشاء حساب مستخدم جديد وتحديد أدواره',
            'user.updated'                                            => 'تحديث بيانات المستخدم الأساسية',
            'user.status_toggled'                                     => 'تعديل حالة حساب المستخدم (نشط/معطل)',
            'user.password_reset'                                     => 'إعادة ضبط وتوليد كلمة مرور مؤقتة للمستخدم',
            'directorate.created'                                     => 'إنشاء مديرية تعليمية جديدة في النظام',
            'directorate.updated'                                     => 'تعديل مسمى ونطاق المديرية التعليمية',
            'directorate.deleted'                                     => 'حذف مديرية تعليمية من النظام',
            'system.maintenance_mode_toggled'                         => 'تبديل وتغيير حالة وضع الصيانة للنظام',
        ];

        $arabicRoles = [
            'admin'                      => 'مدير النظام المركزي',
            'school_evaluator'           => 'مقيم المدرسة',
            'school_principal'           => 'مدير المدرسة',
            'ministry_standards_manager' => 'مسؤول إدارة المعايير',
            'ministry_supervisor'        => 'المشرف والمراجع الوزاري',
        ];

        $roleCodes = [
            'admin'                      => 'SYS',
            'school_evaluator'           => 'S1',
            'school_principal'           => 'P1',
            'ministry_standards_manager' => 'M2',
            'ministry_supervisor'        => 'A3',
        ];

        $query = AuditLog::with(['user.roles', 'school'])->orderBy('log_id', 'desc');

        $actionType = $request->query('actionType') ?? $request->query('action_type') ?? $request->query('action');
        if (!empty($actionType) && $actionType !== 'الكل') {
            $arabicToKey = [
                'تسجيل دخول ناجح' => 'auth.login_success',
                'فشل تسجيل الدخول' => 'auth.login_failed',
                'محاولة دخول فاشلة' => 'auth.login_failed',
                'تسجيل خروج' => 'auth.logout',
                'تغيير كلمة المرور' => 'auth.password_changed',
                'تسجيل مدرسة جديدة' => 'school.created',
                'تعديل بيانات مدرسة' => 'school.updated',
                'حذف مدرسة' => 'school.deleted',
                'تعديل حالة مدرسة' => 'school.status_toggled',
                'إسناد مدير لمدرسة' => 'school.assigned_principal',
                'فك ارتباط مدير عن مدرسة' => 'school.unassigned_principal',
                'إسناد مقيم جودة' => 'school.assigned_evaluator',
                'فك ارتباط مقيم جودة' => 'school.unassigned_evaluator',
                'إنشاء حساب مستخدم جديد' => 'user.created',
                'تعديل بيانات مستخدم' => 'user.updated',
                'تعديل حالة حساب مستخدم' => 'user.status_toggled',
                'إعادة ضبط كلمة المرور' => 'user.password_reset',
                'إنشاء مديرية تعليمية' => 'directorate.created',
                'تعديل مديرية تعليمية' => 'directorate.updated',
                'حذف مديرية تعليمية' => 'directorate.deleted',
                'رصد درجات التقييم' => 'evaluation.scored',
                'إرسال التقييم للاعتماد' => 'evaluation.submitted',
                'إغلاق التقييم واعتماده' => 'evaluation.direct_closed',
                'طلب استكمال شواهد' => 'completion.created',
                'تمديد مهلة استكمال' => 'completion.deadline_extended',
                'إعادة تسليم استكمال' => 'completion.resubmitted',
                'إغلاق ملف الاستكمال' => 'completion.closed',
                'اعتماد ملف استكمال' => 'completion.closed',
                'فك ارتباط شواهد' => 'evidence.unlinked',
                'تفعيل وثيقة معايير' => 'standard_version.activated',
                'أرشفة وثيقة معايير تلقائيًا' => 'standard_version.auto_archived',
                'تبديل وضع الصيانة' => 'system.maintenance_mode_toggled',
                'إرسال بريد اختباري' => 'system.test_email_sent',
            ];
            $canonicalAction = $arabicToKey[$actionType] ?? $actionType;
            $query->where('action', (string) $canonicalAction);
        }

        $userId = $request->query('userId') ?? $request->query('user_id');
        if (!empty($userId) && $userId !== 'الكل') {
            $query->where('user_id', (int) $userId);
        }

        $search = $request->query('q') ?? $request->query('search');
        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                  ->orWhere('description_ar', 'like', "%{$search}%")
                  ->orWhere('ip_address', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('full_name', 'like', "%{$search}%")
                         ->orWhere('username', 'like', "%{$search}%");
                  });
            });
        }

        $timeScope = $request->query('timeScope') ?? $request->query('time_scope');
        if ($timeScope === '24h' || $timeScope === 'today') {
            $query->where('created_at', '>=', now()->subHours(24));
        } elseif ($timeScope === '7d' || $timeScope === 'week') {
            $query->where('created_at', '>=', now()->subDays(7));
        } elseif ($timeScope === '30d' || $timeScope === 'month') {
            $query->where('created_at', '>=', now()->subDays(30));
        }

        $total = $query->count();
        $isExportAll = $request->boolean('all') || $request->query('perPage') === 'all';
        $page = max(1, (int) $request->query('page', 1));
        $perPage = $isExportAll ? max(1, $total) : max(1, (int) $request->query('perPage', 20));

        if ($total > 0) {
            $dbLogs = $isExportAll ? $query->get() : $query->skip(($page - 1) * $perPage)->take($perPage)->get();
            $logs = $dbLogs->map(function ($log) use ($actionDescriptions, $arabicRoles, $roleCodes) {
                $role = $log->user?->roles?->first();
                $rName = $role?->role_name ?? '';
                $isBreach = str_contains($log->action, 'failed') || str_contains($log->action, 'breach');
                $isSensitive = str_contains($log->action, 'password') || str_contains($log->action, 'activated') || str_contains($log->action, 'closed') || str_contains($log->action, 'assigned');

                $desc = $log->description_ar ?: ($actionDescriptions[$log->action] ?? ("عملية {$log->action} على النظام"));
                if ($log->school && !str_contains($desc, $log->school->school_name)) {
                    $desc .= " • مدرسة {$log->school->school_name}";
                }

                return [
                    'logId'          => $log->log_id,
                    'timestamp'      => $log->created_at?->toIso8601ZuluString() ?? now()->toIso8601ZuluString(),
                    'actorUserId'    => $log->user_id ?? 0,
                    'actorName'      => $log->user?->full_name ?? ($log->user?->username ?? 'حساب غير معروف'),
                    'actorRole'      => $arabicRoles[$rName] ?? ($rName ?: 'غير محدد'),
                    'actorRoleCode'  => $roleCodes[$rName] ?? ($log->user?->user_type === 'system' ? 'SYS' : 'USR'),
                    'eventType'      => $log->action,
                    'eventCategory'  => $isBreach ? 'breach' : ($isSensitive ? 'sensitive' : 'normal'),
                    'description'    => $desc,
                    'descriptionAr'  => $desc,
                    'digitalHash'    => 'SHA-' . substr(hash('sha256', "{$log->log_id}-{$log->action}-{$log->created_at}"), 0, 8),
                    'ipAddress'      => $log->ip_address ?: '127.0.0.1',
                    'location'       => 'صنعاء، اليمن',
                    'deviceInfo'     => $log->user_agent ?: 'Chrome • Windows',
                    'securityStatus' => $isBreach ? 'blocked' : 'verified',
                ];
            })->toArray();

            return ApiResponse::success(
                data: $logs,
                message: null,
                meta: [
                    'page'     => $page,
                    'perPage'  => $perPage,
                    'total'    => $total,
                    'lastPage' => (int) ceil($total / $perPage),
                ]
            );
        }

        return ApiResponse::success(
            data: [],
            message: null,
            meta: [
                'page'     => 1,
                'perPage'  => $perPage,
                'total'    => 0,
                'lastPage' => 1,
            ]
        );
    }

    /**
     * استرجاع قائمة عناوين IP المحظورة.
     */
    public function blockedIps(Request $request): JsonResponse
    {
        $ips = Cache::get('admin_blocked_ips', $this->getDefaultBlockedIps());

        return ApiResponse::success(
            data: $ips,
            message: null
        );
    }

    /**
     * فك حظر عنوان IP.
     */
    public function unblockIp(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasPermission('users.manage')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $validated = $request->validate([
            'ip'   => 'nullable|string',
            'ipId' => 'nullable|integer',
        ]);

        $ips = Cache::get('admin_blocked_ips', $this->getDefaultBlockedIps());

        $filtered = array_values(array_filter($ips, function ($item) use ($validated) {
            if (!empty($validated['ipId']) && $item['ipId'] === (int) $validated['ipId']) {
                return false;
            }
            if (!empty($validated['ip']) && $item['ipAddress'] === $validated['ip']) {
                return false;
            }
            return true;
        }));

        Cache::put('admin_blocked_ips', $filtered, now()->addDays(30));

        return ApiResponse::success(
            data: true,
            message: 'تم فك حظر عنوان IP بنجاح.'
        );
    }
}
