<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;

/**
 * فئة بناء استجابات الـ API بالصيغة الموحدة (conventions §3).
 *
 * البنية الإلزامية لكل استجابة:
 * {
 *   "data": ... | null,
 *   "message": "..." | null,
 *   "errors": {...} | null,
 *   "meta": {...} | null
 * }
 */
class ApiResponse
{
    /**
     * استجابة نجاح عامة (200 OK أو 201 Created).
     *
     * @param mixed $data
     * @param string|null $message
     * @param array<string, mixed>|null $meta
     * @param int $status
     * @return JsonResponse
     */
    public static function success(mixed $data = null, ?string $message = null, ?array $meta = null, int $status = 200): JsonResponse
    {
        return response()->json([
            'data'    => $data,
            'message' => $message,
            'errors'  => null,
            'meta'    => $meta,
        ], $status, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * استجابة إنشاء مورد بنجاح 201 Created.
     *
     * @param mixed $data
     * @param string|null $message
     * @param array<string, mixed>|null $meta
     * @return JsonResponse
     */
    public static function created(mixed $data = null, ?string $message = null, ?array $meta = null): JsonResponse
    {
        return self::success($data, $message, $meta, 201);
    }

    /**
     * استجابة خطأ تحقق مدخلات 422 Unprocessable Entity.
     *
     * @param array<string, array<int, string>> $errors
     * @param string $message
     * @return JsonResponse
     */
    public static function validationError(array $errors, string $message = 'البيانات المُدخلة غير صحيحة'): JsonResponse
    {
        return response()->json([
            'data'    => null,
            'message' => $message,
            'errors'  => $errors,
            'meta'    => null,
        ], 422, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * استجابة تعذر معالجة الطلب لتعارضه مع حالة السجل 422 Unprocessable Entity.
     *
     * @param string $message
     * @return JsonResponse
     */
    public static function unprocessable(string $message = 'لا يمكن إتمام العملية نظراً لوجود ارتباطات قائمة.'): JsonResponse
    {
        return self::error($message, 422);
    }

    /**
     * استجابة خطأ غير مصادَق 401 Unauthorized.
     *
     * @param string $message
     * @return JsonResponse
     */
    public static function unauthorized(string $message = 'يجب تسجيل الدخول للمتابعة.'): JsonResponse
    {
        return response()->json([
            'data'    => null,
            'message' => $message,
            'errors'  => null,
            'meta'    => null,
        ], 401, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * استجابة خطأ غير مصرح / خارج الصلاحية أو النطاق 403 Forbidden.
     * النص الإلزامي وفق NFR-SEC-03: «غير مصرح».
     *
     * @param string $message
     * @return JsonResponse
     */
    public static function forbidden(string $message = 'غير مصرح'): JsonResponse
    {
        return response()->json([
            'data'    => null,
            'message' => $message,
            'errors'  => null,
            'meta'    => null,
        ], 403, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * استجابة خطأ مورد غير موجود 404 Not Found.
     *
     * @param string $message
     * @return JsonResponse
     */
    public static function notFound(string $message = 'العنصر المطلوب غير موجود.'): JsonResponse
    {
        return response()->json([
            'data'    => null,
            'message' => $message,
            'errors'  => null,
            'meta'    => null,
        ], 404, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * استجابة تجاوز معدل الطلبات المسموح به 429 Too Many Requests (الشريحة 11).
     *
     * @param string $message
     * @param int $retryAfter
     * @return JsonResponse
     */
    public static function tooManyRequests(string $message = 'تم تجاوز الحد المسموح به من المحاولات. يرجى الانتظار والمحاولة لاحقًا.', int $retryAfter = 60): JsonResponse
    {
        return response()->json([
            'success'     => false,
            'data'        => null,
            'message'     => $message,
            'retry_after' => $retryAfter,
            'errors'      => [
                'throttle' => [$message],
            ],
            'meta'        => null,
        ], 429, [
            'Retry-After' => (string) $retryAfter,
        ], JSON_UNESCAPED_UNICODE);
    }

    /**
     * استجابة تعارض قيود تكاملية 409 Conflict.
     *
     * @param string $message
     * @return JsonResponse
     */
    public static function conflict(string $message = 'الطلب يتعارض مع بيانات قائمة بالفعل.'): JsonResponse
    {
        return response()->json([
            'data'    => null,
            'message' => $message,
            'errors'  => null,
            'meta'    => null,
        ], 409, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * استجابة خطأ خادم داخلي 500 Internal Server Error.
     *
     * @param string $message
     * @return JsonResponse
     */
    public static function serverError(string $message = 'حدث خطأ غير متوقع. حاول مرة أخرى لاحقًا.'): JsonResponse
    {
        return response()->json([
            'data'    => null,
            'message' => $message,
            'errors'  => null,
            'meta'    => null,
        ], 500, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * استجابة خطأ مخصص برمز حالة محدد (مثل 503 Service Unavailable).
     *
     * @param string $message
     * @param int $status
     * @param array<string, mixed>|null $errors
     * @return JsonResponse
     */
    public static function error(string $message = 'حدث خطأ في النظام', int $status = 500, ?array $errors = null): JsonResponse
    {
        return response()->json([
            'data'    => null,
            'message' => $message,
            'errors'  => $errors,
            'meta'    => null,
        ], $status, [], JSON_UNESCAPED_UNICODE);
    }
}
