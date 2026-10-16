<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج واصف درجة المؤشر (IndicatorScoreDescriptor).
 *
 * يمثل التوصيف التفصيلي المحدد لمستوى أداء مؤشر معين (Rubric Descriptor)،
 * لربط الدرجة الرقمية بوصف كيفي دقيق لسلوك وأداء المدرسة، وتستخدم لاختيار النتيجة المناسبة أثناء التقييم.
 */
class IndicatorScoreDescriptor extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'indicator_score_descriptors';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'descriptor_id';

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
        'indicator_id',
        'score_level_id',
        'standard_version_id',
        'label',
        'description',
        'display_order',
        'is_active',
    ];

    /**
     * تحويل خصائص النموذج إلى أنواع بيانات محددة (Casts).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'display_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * المؤشر المرتبط بهذا الواصف التفسيري.
     *
     * @return BelongsTo
     */
    public function indicator(): BelongsTo
    {
        return $this->belongsTo(Indicator::class, 'indicator_id', 'indicator_id');
    }

    /**
     * مستوى التقدير العام المرتبط بهذا الواصف.
     *
     * @return BelongsTo
     */
    public function scoreLevel(): BelongsTo
    {
        return $this->belongsTo(ScoreLevel::class, 'score_level_id', 'score_level_id');
    }

    /**
     * إصدار المعايير المرجعي المرتبط بهذا الواصف.
     *
     * @return BelongsTo
     */
    public function standardVersion(): BelongsTo
    {
        return $this->belongsTo(StandardVersion::class, 'standard_version_id', 'version_id');
    }

    /**
     * نتائج التقييم التي تم اختيار هذا الواصف التفسيري لتبرير درجتها.
     *
     * @return HasMany
     */
    public function evaluationResults(): HasMany
    {
        return $this->hasMany(EvaluationResult::class, 'score_descriptor_id', 'descriptor_id');
    }
}
