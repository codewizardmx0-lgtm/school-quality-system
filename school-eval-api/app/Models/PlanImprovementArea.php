<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج ربط خطة التحسين بمجال التحسين (PlanImprovementArea).
 *
 * يمثل جدول الربط متعدد إلى متعدد (Many-to-Many) بين خطط التحسين المدرسية ومجالات التحسين.
 * كما يشكل المفتاح الأساسي المركب (plan_id, area_id) مرجعاً أجنبياً مركباً لجدول إجراءات
 * التحسين (improvement_actions)، مما يضمن عدم إنشاء أي إجراء تنفيذي خارج نطاق الخطة ومجالاتها المعتمدة.
 *
 * الطوابع الزمنية:
 * يتضمن created_at فقط دون updated_at مطابقة لقاموس البيانات والملحق أ.
 */
class PlanImprovementArea extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'plan_improvement_areas';

    /**
     * المفتاح الأساسي المركب للجدول.
     *
     * @var array<int, string>
     */
    protected $primaryKey = ['plan_id', 'area_id'];

    /**
     * المفتاح الأساسي ليس ترقيماً تلقائياً.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * اسم عمود طابع الإنشاء الزمني.
     */
    const CREATED_AT = 'created_at';

    /**
     * تعطيل عمود طابع التحديث الزمني لعدم وجوده في الجدول.
     */
    const UPDATED_AT = null;

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'plan_id',
        'area_id',
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
            'created_at' => 'datetime',
        ];
    }

    /**
     * خطة التحسين المرتبطة بهذا الربط.
     *
     * @return BelongsTo
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(ImprovementPlan::class, 'plan_id', 'plan_id');
    }

    /**
     * مجال التحسين المرتبط بهذا الربط.
     *
     * @return BelongsTo
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(ImprovementArea::class, 'area_id', 'area_id');
    }

    /**
     * الإجراءات التنفيذية المحكومة بهذا النطاق المشترك (خطة + مجال).
     *
     * @return HasMany
     */
    public function actions(): HasMany
    {
        return $this->hasMany(ImprovementAction::class, 'plan_id', 'plan_id')
            ->whereColumn('area_id', 'area_id');
    }
}
