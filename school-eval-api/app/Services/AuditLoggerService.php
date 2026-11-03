<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Request;

/**
 * خدمة تسجيل التدقيق المؤسسي للعمليات الحساسة (AuditLoggerService).
 *
 * تضمن تسجيل الأحداث والعمليات الأمنية والتقييمية الحساسة في جدول غير قابل للتعديل (Append-Only)
 * مع تصفية البيانات الحساسة تلقائياً (تجريد كلمات المرور والرموز المشفرة).
 */
class AuditLoggerService
{
    /**
     * قائمة المفاتيح المحظورة من التسجيل لضمان الخصوصية والأمان.
     *
     * @var array<int, string>
     */
    protected const SENSITIVE_KEYS = [
        'password',
        'password_hash',
        'current_password',
        'new_password',
        'new_password_confirmation',
        'token',
        'plainTextToken',
        'token_hash',
        'remember_token',
    ];

    /**
     * تسجيل عملية في سجل التدقيق.
     *
     * @param string $action
     * @param string|null $targetType
     * @param int|null $targetId
     * @param array<string, mixed>|null $oldValues
     * @param array<string, mixed>|null $newValues
     * @param int|null $userId
     * @param int|null $schoolId
     * @return AuditLog
     */
    public function log(
        string $action,
        ?string $targetType = null,
        ?int $targetId = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?int $userId = null,
        ?int $schoolId = null
    ): AuditLog {
        // تحديد المستخدم والمدرسة تلقائياً إن لم يتم تمريرهما صراحة
        $resolvedUserId = $userId ?? auth('sanctum')->id() ?? auth()->id();
        $currentUser = auth('sanctum')->user() ?? auth()->user();
        $resolvedSchoolId = $schoolId ?? $currentUser?->school_id;

        $sanitizedOld = $oldValues !== null ? $this->sanitizeData($oldValues) : null;
        $sanitizedNew = $newValues !== null ? $this->sanitizeData($newValues) : null;

        return AuditLog::create([
            'user_id'     => $resolvedUserId,
            'school_id'   => $resolvedSchoolId,
            'action'      => $action,
            'target_type' => $targetType,
            'target_id'   => $targetId,
            'old_values'  => $sanitizedOld,
            'new_values'  => $sanitizedNew,
            'ip_address'  => Request::ip(),
            'user_agent'  => Request::userAgent(),
            'created_at'  => now(),
        ]);
    }

    /**
     * تصفية المصفوفات لإزالة أي حقول حساسة (كلمات مرور أو رموز سرية).
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    protected function sanitizeData(array $data): array
    {
        $sanitized = [];

        foreach ($data as $key => $value) {
            if (in_array(strtolower((string) $key), self::SENSITIVE_KEYS, true)) {
                continue;
            }

            if (is_array($value)) {
                $sanitized[$key] = $this->sanitizeData($value);
            } else {
                $sanitized[$key] = $value;
            }
        }

        return $sanitized;
    }
}
