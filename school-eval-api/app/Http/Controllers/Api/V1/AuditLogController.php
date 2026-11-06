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
            'school:school_id,school_name',
        ]);

        // فلترة بالمدرسة للمشرف ومدير النظام
        if ($request->filled('school_id')) {
            $query->where('school_id', (int) $request->input('school_id'));
        }

        // فلترة بنوع العملية
        $action = $request->input('action') ?? $request->input('actionType');
        if ($action && $action !== 'الكل') {
            $query->where('action', (string) $action);
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

        // فلترة بالتاريخ من - إلى
        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', $request->input('date_to'));
        }

        $isExportAll = $request->boolean('all') || $request->input('per_page') === 'all' || $request->input('perPage') === 'all';
        $perPageInput = $request->input('per_page') ?? $request->input('perPage') ?? 20;

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
            ]
        );
    }
}
