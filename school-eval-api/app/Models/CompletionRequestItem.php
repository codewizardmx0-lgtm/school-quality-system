<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * نموذج بند طلب الاستكمال (CompletionRequestItem).
 *
 * يمثل بنداً تفصيلياً لنقص محدد مطلوب استيفاؤه من المدرسة (سواء كان مؤشراً أو شاهداً)،
 * مع وصف المطلوب وحالة المعالجة للبند (Pending, Resolved).
 *
 * قاعدة العمل والتحقق (CHECK Constraint):
 * يخضع لقيد الفحص chk_completion_item_target:
 * (indicator_id IS NOT NULL OR evidence_id IS NOT NULL)
 * لضمان أن كل بند استكمال يستهدف مؤشراً أو شاهداً على الأقل (أو كليهما).
 */
class CompletionRequestItem extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'completion_request_items';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'request_item_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'request_id',
        'indicator_id',
        'evidence_id',
        'missing_description',
        'status',
    ];

    /**
     * تحويل خصائص النموذج إلى أنواع بيانات محددة (Casts).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * طلب الاستكمال الحاوي لهذا البند.
     *
     * @return BelongsTo
     */
    public function request(): BelongsTo
    {
        return $this->belongsTo(CompletionRequest::class, 'request_id', 'request_id');
    }

    /**
     * المؤشر المستهدف بالنقص (إن وُجد).
     *
     * @return BelongsTo
     */
    public function indicator(): BelongsTo
    {
        return $this->belongsTo(Indicator::class, 'indicator_id', 'indicator_id');
    }

    /**
     * الشاهد أو الدليل المستهدف بالنقص (إن وُجد).
     *
     * @return BelongsTo
     */
    public function evidence(): BelongsTo
    {
        return $this->belongsTo(Evidence::class, 'evidence_id', 'evidence_id');
    }
}
