<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Http\Responses\ApiResponse;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * متحكم إدارة واستعراض الإشعارات وسجل التنبيهات الدائم (FR-GEN-05).
 *
 * القواعد الأمنية:
 * 1. عزل صارم: لا يمكن لأي مستخدم استعراض أو تحديث حالة إشعار لا يخصه.
 * 2. محاولة الوصول لإشعار مستخدم آخر تُرجع 404 بدلاً من 403 لمنع كشف وجود السجلات.
 */
class NotificationController extends Controller
{
    /**
     * استعراض قائمة إشعارات المستخدم الحالي.
     *
     * GET /api/v1/notifications
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return ApiResponse::unauthorized();
        }

        $query = Notification::where('recipient_user_id', $user->user_id);

        if ($request->has('is_read')) {
            $isRead = filter_var($request->is_read, FILTER_VALIDATE_BOOLEAN);
            $query->where('is_read', $isRead);
        }

        $unreadCount = (clone $query)->where('is_read', false)->count();

        $limit = $request->integer('limit', 50);
        $notifications = $query->orderBy('created_at', 'desc')
            ->take($limit)
            ->get();

        return ApiResponse::success(
            data: NotificationResource::collection($notifications)->resolve($request),
            message: null,
            meta: [
                'unreadCount' => $unreadCount,
                'total'       => $notifications->count(),
            ]
        );
    }

    /**
     * استرجاع عدد الإشعارات غير المقروءة للمستخدم الحالي.
     *
     * GET /api/v1/notifications/unread-count
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return ApiResponse::unauthorized();
        }

        $count = Notification::where('recipient_user_id', $user->user_id)
            ->where('is_read', false)
            ->count();

        return ApiResponse::success(
            data: [
                'unreadCount' => $count,
            ],
            message: null
        );
    }

    /**
     * تحديد إشعار محدد كمقروء.
     *
     * PATCH /api/v1/notifications/{id}/read
     */
    public function markAsRead(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return ApiResponse::unauthorized();
        }

        $notification = Notification::find($id);

        // العزل المؤسسي والشخصي الصارم: إرجاع 404 إذا لم يكن الإشعار للمستخدم
        if (!$notification || (int) $notification->recipient_user_id !== (int) $user->user_id) {
            return ApiResponse::notFound('الإشعار المطلوب غير موجود.');
        }

        if (!$notification->is_read) {
            $notification->is_read = true;
            $notification->read_at = now();
            $notification->save();
        }

        return ApiResponse::success(
            data: (new NotificationResource($notification))->resolve($request),
            message: 'تم تحديد الإشعار كمقروء.'
        );
    }

    /**
     * تحديد كافة إشعارات المستخدم الحالي كمقروءة دفعة واحدة.
     *
     * POST /api/v1/notifications/mark-all-read
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return ApiResponse::unauthorized();
        }

        $updatedCount = Notification::where('recipient_user_id', $user->user_id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return ApiResponse::success(
            data: [
                'updatedCount' => $updatedCount,
            ],
            message: 'تم تحديد جميع الإشعارات كمقروءة بنجاح.'
        );
    }
}
