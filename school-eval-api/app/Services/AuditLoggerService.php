<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use App\Models\School;
use App\Models\Indicator;
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
     * ترجمة وتفسير الإجراء بنص عربي واضح.
     */
    public function resolveActionDescription(string $action): string
    {
        $map = [
            self::ACTION_LOGIN_SUCCESS                 => 'تسجيل دخول ناجح إلى المنصة',
            self::ACTION_LOGIN_FAILED                  => 'محاولة دخول غير مصرح بها أو كلمة مرور خاطئة',
            self::ACTION_LOGOUT                        => 'تسجيل خروج نظامي من الحساب',
            self::ACTION_PASSWORD_CHANGED              => 'تغيير كلمة المرور الخاصة بالمستخدم',
            self::ACTION_EVALUATION_SCORED             => 'رصد درجة تقييم لمؤشر معايير الجودة',
            self::ACTION_EVALUATION_SUBMITTED          => 'رفع ملف التقييم الذاتي للاعتماد الوزاري',
            self::ACTION_EVALUATION_DIRECT_CLOSED      => 'إغلاق واعتماد التقييم مباشرة من المشرف الوزاري',
            self::ACTION_COMPLETION_CREATED            => 'إصدار طلب استكمال نواقص وشواهد المدرسة',
            self::ACTION_COMPLETION_DEADLINE_EXTENDED  => 'تمديد المهلة الزمنية لطلب الاستكمال',
            self::ACTION_COMPLETION_RESUBMITTED        => 'إعادة تسليم متطلبات الاستكمال من مسؤول الجودة',
            self::ACTION_COMPLETION_CLOSED             => 'إغلاق واعتماد ملف الاستكمال بعد التدقيق',
            self::ACTION_EVIDENCE_UNLINKED             => 'فك ارتباط وثيقة شاهد عن مؤشر المعايير',
            self::ACTION_STANDARD_VERSION_ACTIVATED    => 'تفعيل وسريان وثيقة المعايير الوطنية رسمياً',
            self::ACTION_STANDARD_VERSION_AUTO_ARCHIVED=> 'أرشفة تلقائية لإصدار معايير سابق',
            'school.created'                           => 'تسجيل مدرسة جديدة وتحديد نطاقها التعليمي',
            'school.updated'                           => 'تحديث البيانات الأساسية للمدرسة',
            'school.assigned_principal'                => 'إسناد مدير معتمد للمدرسة',
            'school.unassigned_principal'              => 'فك ارتباط مدير المدرسة',
            'school.assigned_evaluator'                => 'إسناد مقيم جودة للمدرسة',
            'school.unassigned_evaluator'              => 'فك ارتباط مقيم الجودة عن المدرسة',
            'directorate.created'                      => 'إنشاء مديرية تعليمية جديدة في النظام',
            'directorate.updated'                      => 'تعديل بيانات المديرية التعليمية',
            'directorate.deleted'                      => 'حذف مديرية تعليمية من النظام',
            'user.created'                             => 'إنشاء حساب مستخدم جديد وتحديد أدواره',
            'user.updated'                             => 'تحديث بيانات المستخدم',
            'user.status_toggled'                      => 'تعديل حالة حساب المستخدم (نشط/معطل)',
            'user.password_reset'                      => 'إعادة ضبط وتوليد كلمة مرور مؤقتة للمستخدم',
            'system.maintenance_mode_toggled'          => 'تبديل وتغيير حالة وضع الصيانة للنظام',
        ];

        return $map[$action] ?? "عملية {$action} على النظام";
    }

    /**
     * بناء وصف تفصيلي دقيق وشامل للعملية يجيب عن: (من، ماذا، على أي كيان، كيف، لماذا).
     *
     * @param string $action
     * @param User|null $actor
     * @param School|null $school
     * @param array<string, mixed>|null $newValues
     * @param array<string, mixed>|null $oldValues
     * @param string|null $targetType
     * @param int|null $targetId
     * @param string|null $existingDesc
     * @return string
     */
    public function buildDetailedDescription(
        string $action,
        ?User $actor = null,
        ?School $school = null,
        ?array $newValues = null,
        ?array $oldValues = null,
        ?string $targetType = null,
        ?int $targetId = null,
        ?string $existingDesc = null
    ): string {
        $actorName = $actor ? $actor->full_name : 'النظام';
        $schoolCode = '';
        if ($school) {
            $ident = $school->identification_data;
            $schoolCode = is_string($ident) ? $ident : ($ident['code'] ?? $ident['moe_code'] ?? "SCH-{$school->school_id}");
        }
        $schoolName = $school ? "{$school->school_name}" : 'المدرسة';
        $schoolFull = $school ? "{$schoolName} [{$schoolCode}]" : 'المدرسة';

        $new = $newValues ?? [];
        $old = $oldValues ?? [];
        $existing = $existingDesc ?? '';

        switch ($action) {
            case 'school.assigned_principal':
                $targetUser = $targetId ? User::find($targetId) : null;
                $principalName = $targetUser ? $targetUser->full_name : ($new['principal_name'] ?? 'مدير المدرسة');
                return "قام مسؤول النظام ({$actorName}) بإسناد الأستاذ ({$principalName}) كمدير معتمد لـ {$schoolFull} وتفعيل صلاحيات الإدارة المدرسية";

            case 'school.assigned_evaluator':
                $targetUser = $targetId ? User::find($targetId) : null;
                $evaluatorName = $targetUser ? $targetUser->full_name : ($new['evaluator_name'] ?? 'مقيم الجودة');
                return "قام مسؤول النظام ({$actorName}) بإسناد مقيم الجودة والاعتماد ({$evaluatorName}) لمتابعة وتقييم {$schoolFull} وتفعيل صلاحيات التقييم";

            case 'school.unassigned_principal':
                $targetUser = $targetId ? User::find($targetId) : null;
                $principalName = $targetUser ? $targetUser->full_name : 'مدير المدرسة';
                return "قام مسؤول النظام ({$actorName}) بفك ارتباط مدير المدرسة ({$principalName}) عن {$schoolFull}";

            case 'school.unassigned_evaluator':
                $targetUser = $targetId ? User::find($targetId) : null;
                $evaluatorName = $targetUser ? $targetUser->full_name : 'مقيم الجودة';
                return "قام مسؤول النظام ({$actorName}) بفك ارتباط مقيم الجودة ({$evaluatorName}) عن {$schoolFull}";

            case 'evaluation.scored':
                $indId = $new['indicator_id'] ?? null;
                $ind = $indId ? Indicator::find($indId) : null;
                $indText = $ind ? "المؤشر المعياري ({$ind->code})" : "مؤشر معايير الجودة";
                $score = $new['score'] ?? 0;
                $oldScoreText = isset($old['score']) ? " (التقدير السابق: {$old['score']})" : '';
                return "قام مقيم الجودة ({$actorName}) برصد التقدير ({$score}/3) لـ {$indText} في تقييم {$schoolFull}{$oldScoreText}";

            case 'completion.created':
                $reason = $new['reason'] ?? 'استيفاء الشواهد والمتطلبات الناقصة';
                $deadline = $new['deadline'] ?? 'غير محدد';
                return "قام المشرف الوزاري ({$actorName}) بإصدار طلب استكمال نواقص وشواهد لـ {$schoolFull} - المطلوب: ({$reason}) مع مهلة إنجاز حتى ({$deadline})";

            case 'completion.deadline_extended':
                $oldDeadline = $old['deadline'] ?? '';
                $newDeadline = $new['deadline'] ?? '';
                $diffText = $oldDeadline ? " حتى تاريخ ({$newDeadline}) بعد أن كانت ({$oldDeadline})" : " حتى تاريخ ({$newDeadline})";
                return "قام المشرف الوزاري ({$actorName}) بالموافقة على تمديد مهلة استكمال النواقص لـ {$schoolFull}{$diffText}";

            case 'completion.resubmitted':
                return "قام مسؤول الجودة والتقييم ({$actorName}) بإعادة تسليم ملف متطلبات الاستكمال لـ {$schoolFull} بعد استيفاء الشواهد المطلوبة";

            case 'completion.closed':
                return "قام المشرف الوزاري ({$actorName}) باعتماد الشواهد المستكملة وإغلاق ملف الاستكمال بنجاح لـ {$schoolFull}";

            case 'evaluation.direct_closed':
                return "قام المشرف الوزاري ({$actorName}) باعتماد التقييم الذاتي وإغلاقه مباشرة لـ {$schoolFull}";

            case 'evaluation.submitted':
                return "قام مسؤول التقييم ({$actorName}) برفع وتسليم ملف التقييم الذاتي لـ {$schoolFull} للاعتماد النهائي من الإدارة العامة للجودة";

            case 'evidence.unlinked':
                $indId = $old['indicator_id'] ?? null;
                $ind = $indId ? Indicator::find($indId) : null;
                $indText = $ind ? "المؤشر المعياري ({$ind->code})" : "مؤشر المعايير";
                return "قام مسؤول التقييم ({$actorName}) بفك ارتباط وثيقة شاهد عن {$indText} في تقييم {$schoolFull}";

            case 'auth.login_success':
                return "تسجيل دخول ناجح للمستخدم ({$actorName}) إلى المنصة عبر المتصفح";

            case 'auth.logout':
                return "تسجيل خروج نظامي للمستخدم ({$actorName}) وإنهاء جلسة العمل";

            case 'auth.login_failed':
                $attempted = $new['attempted_username'] ?? 'مجهول';
                return "محاولة دخول فاشلة باسم المستخدم ({$attempted}) - بيانات الاعتماد غير صحيحة أو الحساب غير مصرح له";

            case 'auth.password_changed':
                return "قام المستخدم ({$actorName}) بتحديث كلمة المرور لحسابه بنجاح وإلغاء الجلسات الأخرى النشطة";

            case 'system.maintenance_mode_toggled':
                $isMaint = !empty($new['maintenanceMode']);
                return $isMaint
                    ? "قام مسؤول النظام ({$actorName}) بتفعيل وضع الصيانة المجدولة وتعليق وصول المستخدمين العاديين"
                    : "قام مسؤول النظام ({$actorName}) بإلغاء وضع الصيانة وإعادة إتاحة المنظومة لكافة المدارس والمشرفين";

            case 'school.created':
                $name = $new['name'] ?? $new['school_name'] ?? 'مدرسة جديدة';
                return "قام مسؤول النظام ({$actorName}) بتسجيل مدرسة جديدة ({$name}) وتحديد نطاقها التعليمي";

            case 'school.updated':
                return "قام مسؤول النظام ({$actorName}) بتحديث البيانات الأساسية لـ {$schoolFull}";

            case 'school.status_toggled':
                if ($existing && !str_starts_with($existing, 'تعديل حالة')) {
                    return $existing;
                }
                $st = ($new['status'] ?? '') === 'Active' ? 'تفعيل' : 'تعطيل';
                return "قام مسؤول النظام ({$actorName}) بـ{$st} مدرسة ({$schoolName})";

            case 'school.deleted':
                return $existing ?: "قام مسؤول النظام ({$actorName}) بحذف مدرسة نهائياً لعدم وجود ارتباطات تشغيلية";

            case 'standard_version.activated':
                $ver = $new['version'] ?? '3.0';
                return "قام مسؤول المعايير ({$actorName}) بتفعيل واعتماد وثيقة المعايير الوطنية (الإصدار {$ver}) رسمياً على مستوى الجمهورية";

            case 'standard_version.auto_archived':
                $ver = $old['version'] ?? '2.0';
                return "أرشفة تلقائية ذرية لوثيقة المعايير الوطنية السابقة (الإصدار {$ver}) بعد اعتماد وسريان الإصدار الأحدث";

            case 'user.created':
                return $existing ?: "قام مسؤول النظام ({$actorName}) بإنشاء حساب مستخدم جديد وتحديد أدواره";

            case 'directorate.created':
                $name = $new['name'] ?? 'جديدة';
                return "قام مسؤول النظام ({$actorName}) بإنشاء مديرية تعليمية جديدة ({$name}) في المنظومة";

            case 'directorate.deleted':
                $name = $old['name'] ?? 'المديرية';
                return "قام مسؤول النظام ({$actorName}) بحذف المديرية التعليمية ({$name}) من المنظومة";

            default:
                return $existing ?: $this->resolveActionDescription($action);
        }
    }

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
     * @param string|null $descriptionAr
     * @return AuditLog
     */
    public function log(
        string $action,
        ?string $targetType = null,
        ?int $targetId = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?int $userId = null,
        ?int $schoolId = null,
        ?string $descriptionAr = null
    ): AuditLog {
        // تحديد المستخدم والمدرسة تلقائياً إن لم يتم تمريرهما صراحة
        $resolvedUserId = $userId ?? auth('sanctum')->id() ?? auth()->id();
        $currentUser = auth('sanctum')->user() ?? auth()->user();
        $resolvedSchoolId = $schoolId ?? $currentUser?->school_id;

        $sanitizedOld = $oldValues !== null ? $this->sanitizeData($oldValues) : null;
        $sanitizedNew = $newValues !== null ? $this->sanitizeData($newValues) : null;

        $actor = $resolvedUserId ? User::find($resolvedUserId) : $currentUser;
        $school = $resolvedSchoolId ? School::find($resolvedSchoolId) : null;

        $desc = $descriptionAr ?: $this->buildDetailedDescription(
            $action,
            $actor,
            $school,
            $sanitizedNew,
            $sanitizedOld,
            $targetType,
            $targetId
        );

        return AuditLog::create([
            'user_id'        => $resolvedUserId,
            'school_id'      => $resolvedSchoolId,
            'action'         => $action,
            'description_ar' => $desc,
            'target_type'    => $targetType,
            'target_id'      => $targetId,
            'old_values'     => $sanitizedOld,
            'new_values'     => $sanitizedNew,
            'ip_address'     => Request::ip(),
            'user_agent'     => Request::userAgent(),
            'created_at'     => now(),
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
