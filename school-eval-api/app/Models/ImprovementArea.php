<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج مجال التحسين (ImprovementArea).
 *
 * يمثل مجالات وفرص التحسين المستخلصة من نتائج التقييم الذاتي أو المؤشرات المدرسية،
 * ويحدد أولويات التطوير التي تبنى عليها خطط التحسين اللاحقة.
 *
 * قاعدة العمل والتحقق (CHECK Constraint):
 * يجب أن يرتبط مجال التحسين بمصدر رسمي واحد على الأقل، إما نتيجة تقييم لمؤشر محدد (result_id)
 * أو مؤشر مباشرة (indicator_id) وفق قيد الفحص chk_improvement_areas_source:
 * (result_id IS NOT NULL OR indicator_id IS NOT NULL).
 */
class ImprovementArea extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'improvement_areas';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'area_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'result_id',
        'indicator_id',
        'name',
        'description',
        'priority',
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
     * نتيجة التقييم التي انبثق عنها مجال التحسين (إن وجدت).
     *
     * @return BelongsTo
     */
    public function result(): BelongsTo
    {
        return $this->belongsTo(EvaluationResult::class, 'result_id', 'result_id');
    }

    /**
     * المؤشر المرتبط بمجال التحسين مباشرة (إن وجد).
     *
     * @return BelongsTo
     */
    public function indicator(): BelongsTo
    {
        return $this->belongsTo(Indicator::class, 'indicator_id', 'indicator_id');
    }

    /**
     * سجلات الربط الوسيطة مع خطط التحسين.
     *
     * @return HasMany
     */
    public function planImprovementAreas(): HasMany
    {
        return $this->hasMany(PlanImprovementArea::class, 'area_id', 'area_id');
    }

    /**
     * خطط التحسين التي أدرجت هذا المجال ضمن نطاق عملها.
     *
     * @return BelongsToMany
     */
    public function plans(): BelongsToMany
    {
        return $this->belongsToMany(
            ImprovementPlan::class,
            'plan_improvement_areas',
            'area_id',
            'plan_id',
            'area_id',
            'plan_id'
        );
    }
}
