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
