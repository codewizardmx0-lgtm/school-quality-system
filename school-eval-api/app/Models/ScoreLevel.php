<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج مستوى التقدير (ScoreLevel).
 *
 * يمثل المستويات القياسية العامة للدرجات في إطار معايير محدد (مثل: 1 = غير ملائم، 2 = ملائم جزئياً،
 * 3 = ملائم، 4 = متميز)، وتُبنى عليها الواصفات التفسيرية التفصيلية لكل مؤشر.
 */
class ScoreLevel extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'score_levels';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'score_level_id';

    /**
     * تعطيل الطوابع الزمنية التلقائية (created_at, updated_at).
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
        'standard_version_id',
        'score_value',
        'label',
        'general_description',
        'display_order',
    ];

    /**
     * تحويل خصائص النموذج إلى أنواع بيانات محددة (Casts).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'score_value' => 'integer',
            'display_order' => 'integer',
        ];
    }

    /**
     * إصدار المعايير الذي ينتمي إليه هذا المستوى من التقدير.
     *
     * @return BelongsTo
     */
    public function version(): BelongsTo
    {
        return $this->belongsTo(StandardVersion::class, 'standard_version_id', 'version_id');
    }

    /**
     * الواصفات التفصيلية للمؤشرات المعتمدة على هذا المستوى من التقدير.
     *
     * @return HasMany
     */
    public function descriptors(): HasMany
    {
        return $this->hasMany(IndicatorScoreDescriptor::class, 'score_level_id', 'score_level_id');
    }
}
