<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج إصدار معايير الجودة والتقويم المدرسي (StandardVersion).
 *
 * يمثل الإصدار المعتمد للإطار المرجعي للمعايير الوطنية، ومصدره وتاريخ إصداره وحالته
 * (مثل: مسودة، ساري، مؤرشف)، وترتبط به المعايير الرئيسية ومستويات التقدير ودورات التقييم.
 */
class StandardVersion extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'standard_versions';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'version_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'version_no',
        'issue_date',
        'source_organization',
        'source_number',
        'source_description',
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
            'issue_date' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * المعايير الرئيسية التابعة لهذا الإصدار المرجعي.
     *
     * @return HasMany
     */
    public function standards(): HasMany
    {
        return $this->hasMany(Standard::class, 'version_id', 'version_id');
    }

    /**
     * مستويات التقدير والدرجات المعرفة ضمن هذا الإصدار.
     *
     * @return HasMany
     */
    public function scoreLevels(): HasMany
    {
        return $this->hasMany(ScoreLevel::class, 'standard_version_id', 'version_id');
    }

    /**
     * الواصفات التفسيرية لدرجات المؤشرات المرتبطة بهذا الإصدار المرجعي.
     *
     * @return HasMany
     */
    public function indicatorScoreDescriptors(): HasMany
    {
        return $this->hasMany(IndicatorScoreDescriptor::class, 'standard_version_id', 'version_id');
    }

    /**
     * متطلبات الشواهد والأدلة لمؤشرات هذا الإصدار.
     *
     * @return HasMany
     */
    public function indicatorEvidenceRequirements(): HasMany
    {
        return $this->hasMany(IndicatorEvidenceRequirement::class, 'standard_version_id', 'version_id');
    }

    /**
     * دورات التقييم المدرسية التي تستند إلى هذا الإصدار.
     *
     * @return HasMany
     */
    public function evaluationCycles(): HasMany
    {
        return $this->hasMany(EvaluationCycle::class, 'version_id', 'version_id');
    }

    /**
     * نتائج التقييم المحسوبة ضمن سياق هذا الإصدار المرجعي.
     *
     * @return HasMany
     */
    public function evaluationResults(): HasMany
    {
        return $this->hasMany(EvaluationResult::class, 'standard_version_id', 'version_id');
    }
}
