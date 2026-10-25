<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج المؤشر (Indicator).
 *
 * يمثل وحدة القياس الأساسية في نظام التقويم المدرسي، حيث يرتبط بمعيار فرعي
 * ويحدد الأداء المتوقع وشواهده وأدوات التحقق منه، بالإضافة إلى ارتباطه بنتائج التقييم
 * وخطط ومجالات التحسين.
 */
class Indicator extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'indicators';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'indicator_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'sub_standard_id',
        'code',
        'name',
        'description',
        'weight',
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
            'weight' => 'decimal:2',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * المعيار الفرعي الذي ينتمي إليه هذا المؤشر.
     *
     * @return BelongsTo
     */
    public function subStandard(): BelongsTo
    {
        return $this->belongsTo(SubStandard::class, 'sub_standard_id', 'sub_standard_id');
    }

    /**
     * الواصفات التفسيرية لدرجات التقدير الخاصة بهذا المؤشر (Rubric Descriptors).
     *
     * @return HasMany
     */
    public function scoreDescriptors(): HasMany
    {
        return $this->hasMany(IndicatorScoreDescriptor::class, 'indicator_id', 'indicator_id');
    }

    /**
     * متطلبات الأدلة والشواهد اللازمة لإثبات استيفاء هذا المؤشر.
     *
     * @return HasMany
     */
    public function evidenceRequirements(): HasMany
    {
        return $this->hasMany(IndicatorEvidenceRequirement::class, 'indicator_id', 'indicator_id');
    }

    /**
     * سجلات طرائق وأساليب التحقق المحددة لهذا المؤشر (نموذج وسيط).
     *
     * @return HasMany
     */
    public function verificationMethods(): HasMany
    {
        return $this->hasMany(IndicatorVerificationMethod::class, 'indicator_id', 'indicator_id');
    }

    /**
     * أدوات التحقق المعتمدة للتحقق من أداء هذا المؤشر (علاقة متعدد لمتعدد عبر جدول الربط).
     *
     * @return BelongsToMany
     */
    public function verificationTools(): BelongsToMany
    {
        return $this->belongsToMany(
            VerificationTool::class,
            'indicator_verification_methods',
            'indicator_id',
            'tool_id',
            'indicator_id',
            'tool_id'
        )->withPivot('id', 'required', 'usage_guidance', 'created_at');
    }

    /**
     * نتائج التقييم المسجلة لهذا المؤشر عبر مختلف الدورات والمدارس.
     *
     * @return HasMany
     */
    public function evaluationResults(): HasMany
    {
        return $this->hasMany(EvaluationResult::class, 'indicator_id', 'indicator_id');
    }

    /**
     * الشواهد والوثائق المرفوعة لدعم هذا المؤشر.
     *
     * @return HasMany
     */
    public function evidences(): HasMany
    {
        return $this->hasMany(Evidence::class, 'indicator_id', 'indicator_id');
    }

    /**
     * مجالات وفرص التحسين المرتبطة بهذا المؤشر المنبثقة من التقييم.
     *
     * @return HasMany
     */
    public function improvementAreas(): HasMany
    {
        return $this->hasMany(ImprovementArea::class, 'indicator_id', 'indicator_id');
    }

    /**
     * بنود طلبات الاستكمال المرتبطة بهذا المؤشر عند وجود نقص في الشواهد.
     *
     * @return HasMany
     */
    public function completionRequestItems(): HasMany
    {
        return $this->hasMany(CompletionRequestItem::class, 'indicator_id', 'indicator_id');
    }
}
