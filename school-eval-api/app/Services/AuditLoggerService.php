<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Request;

/**
 * خدمة تسجيل التدقيق المؤسسي للعمليات الحساسة (AuditLoggerService).
 *
 * تضمن تسجيل الأحداث والعمليات الأمنية والتقييمية الحساسة في جدول غير قابل للتعديل (Append-Only)
 * مع تصفية البيانات الحساسة تلقائياً (تجريد كلمات المرور والرموز المشفرة).
 *
 * قائمة العمليات المعتمدة في النظام:
 * 1.  auth.login_success          - تسجيل دخول ناجح
 * 2.  auth.login_failed           - محاولة دخول فاشلة
 * 3.  auth.logout                 - تسجيل خروج
 * 4.  auth.password_changed       - تغيير كلمة المرور للمستخدم
 * 5.  evaluation.scored           - رصد درجات التقييم الذاتي
 * 6.  evaluation.submitted        - تسليم التقييم الذاتي
 * 7.  evaluation.direct_closed    - إغلاق مباشر للتقييم من المشرف
 * 8.  completion.created          - إنشاء طلب استكمال من المشرف
 * 9.  completion.deadline_extended- تمديد مهلة الاستكمال
 * 10. completion.resubmitted      - إعادة تسليم التقييم بعد الاستكمال
 * 11. completion.closed           - إغلاق طلب الاستكمال واعتماد التقييم
 * 12. evidence.unlinked           - فك ربط شاهد بمؤشر
 * 13. standard_version.activated   - تنشيط/إقرار إصدار معايير جديد (الشريحة 11 - ضابط G-23)
 * 14. standard_version.auto_archived - أرشفة تلقائية ذرية لإصدار معايير سابق (الشريحة 11 - ضابط G-23)
 */
class AuditLoggerService
{
    // ثوابت عمليات التدقيق المعتمدة
    public const ACTION_LOGIN_SUCCESS = 'auth.login_success';
    public const ACTION_LOGIN_FAILED = 'auth.login_failed';
    public const ACTION_LOGOUT = 'auth.logout';
    public const ACTION_PASSWORD_CHANGED = 'auth.password_changed';
    public const ACTION_EVALUATION_SCORED = 'evaluation.scored';
    public const ACTION_EVALUATION_SUBMITTED = 'evaluation.submitted';
    public const ACTION_EVALUATION_DIRECT_CLOSED = 'evaluation.direct_closed';
    public const ACTION_COMPLETION_CREATED = 'completion.created';
    public const ACTION_COMPLETION_DEADLINE_EXTENDED = 'completion.deadline_extended';
    public const ACTION_COMPLETION_RESUBMITTED = 'completion.resubmitted';
    public const ACTION_COMPLETION_CLOSED = 'completion.closed';
    public const ACTION_EVIDENCE_UNLINKED = 'evidence.unlinked';
    public const ACTION_STANDARD_VERSION_ACTIVATED = 'standard_version.activated';
    public const ACTION_STANDARD_VERSION_AUTO_ARCHIVED = 'standard_version.auto_archived';
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
