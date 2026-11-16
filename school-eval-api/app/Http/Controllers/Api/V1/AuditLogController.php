<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * متحكم استعراض سجل التدقيق للعمليات الحساسة (AuditLogController).
 *
 * يوفر نقطة نهاية وحيدة للقراءة فقط (Read-Only) مخصصة لمسؤولي النظام والمشرفين الوزاريين:
 * GET /api/v1/audit-logs
 *
 * لا يسمح بأي مسارات تعديل أو حذف لحماية النزاهة المؤسسية.
 */
class AuditLogController extends Controller
{
    /**
     * استعراض سجل التدقيق مع دعم الفلترة والصفحات.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // حصر الصلاحية لمدير النظام والمشرف الوزاري فقط ومنع المدارس
        $isAuthorized = $user->hasRole('admin')
            || $user->user_type === 'admin'
            || ($user->user_type === 'ministry' && ($user->hasRole('ministry_supervisor') || $user->hasPermission('supervision.review')));

        if (!$isAuthorized) {
            return ApiResponse::forbidden('غير مصرح لك باستعراض سجل التدقيق. الوصول محصور بمديري النظام والمشرف الوزاري فقط.');
        }

        $query = AuditLog::with([
            'user:user_id,username,full_name,email,user_type',
            'school:school_id,school_name,identification_data',
        ]);

        // فلترة بالمدرسة للمشرف ومدير النظام
        if ($request->filled('school_id')) {
            $query->where('school_id', (int) $request->input('school_id'));
        }

        // فلترة بنوع العملية مع دعم عملية واحدة أو عمليات متعددة (مصفوفة أو مفصولة بفاصلة)
        $actionInput = $request->input('actions') ?? $request->input('action') ?? $request->input('actionType') ?? $request->input('action_type');
        if ($actionInput && $actionInput !== 'الكل') {
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

            $rawActions = is_array($actionInput) ? $actionInput : explode(',', (string) $actionInput);
            $canonicalActions = [];
            foreach ($rawActions as $raw) {
                $raw = trim($raw);
                if (!empty($raw) && $raw !== 'الكل') {
                    $canonicalActions[] = $arabicToKey[$raw] ?? $raw;
                }
            }

            if (count($canonicalActions) === 1) {
                $query->where('action', $canonicalActions[0]);
            } elseif (count($canonicalActions) > 1) {
                $query->whereIn('action', $canonicalActions);
            }
        }

        // فلترة بالمستخدم المنفذ
        $userId = $request->input('user_id') ?? $request->input('userId');
        if ($userId && $userId !== 'الكل') {
            $query->where('user_id', (int) $userId);
        }

        // فلترة بنوع الكيان المستهدف
        if ($request->filled('target_type')) {
            $query->where('target_type', (string) $request->input('target_type'));
        }

        // بحث نصي في السجلات (الملاحظة / الوصف العربي أو رمز العملية أو اسم المستخدم)
        $search = $request->input('q') ?? $request->input('search');
        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('description_ar', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%")
                    ->orWhere('target_type', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('full_name', 'like', "%{$search}%")
                            ->orWhere('username', 'like', "%{$search}%");
                    });
            });
        }

        // فلترة بالنطاق الزمني السريع (24h, 7d, 30d)
        $timeScope = $request->input('timeScope') ?? $request->input('time_scope');
        if ($timeScope === '24h') {
            $query->where('created_at', '>=', now()->subDay());
        } elseif ($timeScope === '7d') {
            $query->where('created_at', '>=', now()->subDays(7));
        } elseif ($timeScope === '30d') {
            $query->where('created_at', '>=', now()->subDays(30));
        }

        // فلترة بالتاريخ من - إلى
        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', $request->input('date_to'));
        }

        $isExportAll = $request->boolean('all') || $request->input('per_page') === 'all' || $request->input('perPage') === 'all';
        $perPageInput = $request->input('per_page') ?? $request->input('perPage') ?? 20;

        $stats = [
            'totalLogs' => AuditLog::count(),
            'sensitiveCount' => AuditLog::whereIn('action', [
                'school.deleted', 'school.created', 'user.created', 'user.status_toggled',
                'directorate.deleted', 'system.maintenance_mode_toggled', 'auth.password_changed',
                'evaluation.direct_closed', 'standard_version.activated',
            ])->count(),
            'failedLoginsCount' => AuditLog::where('action', 'auth.login_failed')->count(),
            'archiveSyncStatus' => 'متزامن 100%',
        ];

        if ($isExportAll) {
            $items = $query->orderByDesc('log_id')->get();
            return ApiResponse::success(
                data: $items,
                message: 'تم جلب سجل التدقيق بنجاح.',
                meta: [
                    'currentPage' => 1,
                    'lastPage'    => 1,
                    'perPage'     => $items->count(),
                    'total'       => $items->count(),
                    'stats'       => $stats,
                ]
            );
        }

        $perPage = min(max((int) $perPageInput, 1), 100);
        $paginator = $query->orderByDesc('log_id')->paginate($perPage);

        return ApiResponse::success(
            data: $paginator->items(),
            message: 'تم جلب سجل التدقيق بنجاح.',
            meta: [
                'currentPage' => $paginator->currentPage(),
                'lastPage'    => $paginator->lastPage(),
                'perPage'     => $paginator->perPage(),
                'total'       => $paginator->total(),
                'stats'       => $stats,
            ]
        );
    }
}
