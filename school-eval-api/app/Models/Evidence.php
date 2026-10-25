<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * نموذج الشاهد / الدليل الداعم (Evidence).
 *
 * يمثل الشاهد الوثائقي أو الميداني الذي تقدمه المدرسة لإثبات استحقاق درجة المؤشر،
 * ويتضمن العنوان والوصف ومبررات الدلالة. يمتلك الشاهد سجل نسخ تاريخية (EvidenceVersion)
 * لتتبع التعديلات والاستبدال أثناء دورة الاستكمال مع الاحتفاظ بالنسخ السابقة دون حذف،
 * كما يمكن أن يرتبط ببنود طلبات الاستكمال (CompletionRequestItem).
 */
class Evidence extends Model
{
    use HasFactory;

    /**
     * اسم جدول قاعدة البيانات المرتبط بالنموذج.
     *
     * @var string
     */
    protected $table = 'evidences';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'evidence_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'result_id',
        'indicator_id',
        'title',
        'description',
        'justification',
    ];

    /**
     * تحويل خصائص النموذج إلى أنواع بيانات محددة (Casts).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'result_id' => 'integer',
            'indicator_id' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * نتيجة التقييم التي يدعمها هذا الشاهد.
     *
     * @return BelongsTo
     */
    public function result(): BelongsTo
    {
        return $this->belongsTo(EvaluationResult::class, 'result_id', 'result_id');
    }

    /**
     * المؤشر المرتبط بسياق هذا الشاهد.
     *
     * @return BelongsTo
     */
    public function indicator(): BelongsTo
    {
        return $this->belongsTo(Indicator::class, 'indicator_id', 'indicator_id');
    }

    /**
     * جميع النسخ التاريخية المسجلة لهذا الشاهد.
     *
     * @return HasMany
     */
    public function versions(): HasMany
    {
        return $this->hasMany(EvidenceVersion::class, 'evidence_id', 'evidence_id');
    }

    /**
     * النسخة الحالية الفعالة والمعتمدة للشاهد (current = true).
     *
     * @return HasOne
     */
    public function currentVersion(): HasOne
    {
        return $this->hasOne(EvidenceVersion::class, 'evidence_id', 'evidence_id')
            ->where('current', true);
    }

    /**
     * بنود طلبات الاستكمال التي تشير إلى هذا الشاهد لطلب تحديثه أو استبداله.
     *
     * @return HasMany
     */
    public function completionRequestItems(): HasMany
    {
        return $this->hasMany(CompletionRequestItem::class, 'evidence_id', 'evidence_id');
    }
}
