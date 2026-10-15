<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * نموذج الإشعار (Notification).
 *
 * يمثل الإشعارات والتنبيهات الموجهة للمستخدمين داخل النظام (مثل: إطلاق دورة، إغلاق دورة،
 * طلب استكمال، اقتراب موعد إجراء تحسين، تفعيل إصدار معايير).
 *
 * القواعد المعمارية وسجل الإشعارات الدائم (FR-GEN-05):
 * 1. سجل الإشعارات دائم ومحفوظ في النظام ولا يُحذف، ليكون سجلاً تاريخياً موثقاً لجميع الأحداث.
 * 2. يرتبط الإشعار بالكيان المصدر المسبب له عبر علاقة متعددة الأشكال (Polymorphic Relation)
 *    باستخدام الحقلين (related_entity_type, related_entity_id) دون قيد مفتاح أجنبي مباشر.
 *
 * الطوابع الزمنية:
 * يتضمن created_at فقط دون updated_at (const UPDATED_AT = null)، مع تسجيل وقت القراءة في read_at.
 */
class Notification extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'notifications';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'notification_id';

    /**
     * اسم عمود طابع الإنشاء الزمني.
     */
    const CREATED_AT = 'created_at';

    /**
     * تعطيل عمود طابع التحديث الزمني؛ حيث تُرصد القراءة عبر read_at.
     */
    const UPDATED_AT = null;

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'recipient_user_id',
        'title',
        'message',
        'type',
        'related_entity_type',
        'related_entity_id',
        'is_read',
        'read_at',
        'created_at',
    ];

    /**
     * تحويل خصائص النموذج إلى أنواع بيانات محددة (Casts).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'read_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    /**
     * المستخدم المستلم لهذا الإشعار.
     *
     * @return BelongsTo
     */
    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_user_id', 'user_id');
    }

    /**
     * الكيان المصدر المرتبط بالحدث المنشئ للإشعار (علاقة متعددة الأشكال).
     *
     * @return MorphTo
     */
    public function relatedEntity(): MorphTo
    {
        return $this->morphTo(null, 'related_entity_type', 'related_entity_id');
    }
}
