<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/**
 * نموذج سجل التدقيق المؤسسي للعمليات الحساسة (AuditLog).
 *
 * جدول غير قابل للتعديل أو الحذف (Append-only / Immutable) لتسجيل الأحداث الحساسة،
 * مثل عمليات المصادقة، رصد الدرجات، طلبات الاستكمال، وتغييرات الحالة.
 */
class AuditLog extends Model
{
    use HasFactory;

    /**
     * اسم الجدول في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'audit_logs';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'log_id';

    /**
     * إلغاء الطوابع الزمنية الافتراضية للارافيل (updated_at غير موجود).
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'school_id',
        'action',
        'description_ar',
        'target_type',
        'target_id',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
        'created_at',
    ];

    /**
     * تحويل خصائص النموذج إلى أنواع بيانات محددة (Casts).
     *
     * @var array<string, string>
     */
    protected $casts = [
        'user_id'     => 'integer',
        'school_id'   => 'integer',
        'target_id'   => 'integer',
        'old_values'  => 'array',
        'new_values'  => 'array',
        'created_at'  => 'datetime',
    ];

    /**
     * حماية السجل ضد التعديل أو الحذف البرمجي.
     */
    protected static function booted(): void
    {
        static::updating(function () {
            throw new LogicException('Audit logs are immutable and cannot be updated.');
        });

        static::deleting(function () {
            throw new LogicException('Audit logs are immutable and cannot be deleted.');
        });
    }

    /**
     * الوصف العربي الدقيق للعملية مع معالجة أي سجلات قديمة أو فارغة وتوليد شروحات ثرية وشاملة.
     *
     * @param string|null $value
     * @return string
     */
    public function getDescriptionArAttribute(?string $value): string
    {
        $genericDescriptions = [
            'إسناد مدير معتمد للمدرسة',
            'إسناد مقيم جودة للمدرسة',
            'فك ارتباط مدير المدرسة',
            'فك ارتباط مقيم الجودة عن المدرسة',
            'رصد درجة تقييم لمؤشر معايير الجودة',
            'إصدار طلب استكمال نواقص وشواهد المدرسة',
            'تمديد المهلة الزمنية لطلب الاستكمال',
            'إعادة تسليم متطلبات الاستكمال من مسؤول الجودة',
            'إغلاق واعتماد ملف الاستكمال بعد التدقيق',
            'رفع ملف التقييم الذاتي للاعتماد الوزاري',
            'إغلاق واعتماد التقييم مباشرة من المشرف الوزاري',
            'فك ارتباط وثيقة شاهد عن مؤشر المعايير',
            'تسجيل دخول ناجح إلى المنصة',
            'تسجيل خروج نظامي من الحساب',
            'محاولة دخول غير مصرح بها أو كلمة مرور خاطئة',
            'تغيير كلمة المرور الخاصة بالمستخدم',
            'تحديث البيانات الأساسية للمدرسة',
            'تفعيل وسريان وثيقة المعايير الوطنية رسمياً',
            'أرشفة تلقائية لإصدار معايير سابق',
        ];

        $isCorruptedLogin = $this->action === 'auth.login_success' && str_contains($value ?? '', 'تغيير كلمة المرور');

        if (!empty($value) && !$isCorruptedLogin && !in_array(trim($value), $genericDescriptions, true)) {
            return $value;
        }

        $service = app(\App\Services\AuditLoggerService::class);
        $user = $this->relationLoaded('user') ? $this->user : $this->user()->first();
        $school = $this->relationLoaded('school') ? $this->school : $this->school()->first();

        return $service->buildDetailedDescription(
            $this->action ?? '',
            $user,
            $school,
            $this->new_values,
            $this->old_values,
            $this->target_type,
            $this->target_id,
            $value
        );
    }

    /**
     * المستخدم المنفذ للعملية.
     *
     * @return BelongsTo<User, AuditLog>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    /**
     * المدرسة المرتبطة بالعملية المنفذة.
     *
     * @return BelongsTo<School, AuditLog>
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class, 'school_id', 'school_id');
    }
}
