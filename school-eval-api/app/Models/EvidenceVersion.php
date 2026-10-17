<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج نسخة الشاهد التاريخية (EvidenceVersion).
 *
 * يمثل إصدارًا محددًا للشاهد يتم حفظه عند رفعه أو تحديثه أو استبداله استجابة لطلب استكمال.
 * 
 * قاعدة عمل هامة (Business Rule):
 * - قيد "نسخة واحدة فقط current=true لكل شاهد (evidence_id)" يُفرض ويُدار في طبقة التطبيق
 *   (Application / Service Layer / Model Hooks) وليس كقيد قاعدة بيانات فريد.
 * - عند اعتماد نسخة جديدة كـ current=true، يجب إلغاء تفعيل النسخ السابقة لتصبح false
 *   مع الاحتفاظ التام بسجل النسخ دون حذفها.
 */
class EvidenceVersion extends Model
{
    use HasFactory;

    /**
     * اسم جدول قاعدة البيانات المرتبط بالنموذج.
     *
     * @var string
     */
    protected $table = 'evidence_versions';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'evidence_version_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'evidence_id',
        'version_no',
        'current',
    ];

    /**
     * تحويل خصائص النموذج إلى أنواع بيانات محددة (Casts).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'evidence_id' => 'integer',
            'version_no' => 'integer',
            'current' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * الشاهد الأصل التابعة له هذه النسخة.
     *
     * @return BelongsTo
     */
    public function evidence(): BelongsTo
    {
        return $this->belongsTo(Evidence::class, 'evidence_id', 'evidence_id');
    }

    /**
     * الملفات والمرفقات المرفوعة الخاصة بهذه النسخة للشاهد.
     *
     * @return HasMany
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class, 'target_id', 'evidence_version_id')
            ->where('target_type', 'evidence_version');
    }
}
