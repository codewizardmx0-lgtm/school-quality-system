<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج إجراء التحسين التنفيذي (ImprovementAction).
 *
 * يمثل الإجراء التنفيذي المحدد في خطة التحسين المدرسية، ويحدد مسؤولية التنفيذ والجدول
 * الزمني وحالة الإنجاز والتقدم الفعلي.
 *
 * قاعدة العمل والمفتاح الأجنبي المركب (Composite Foreign Key):
 * يرتبط إجراء التحسين بجدول الربط (plan_improvement_areas) عبر مفتاح أجنبي مركب
 * FOREIGN KEY (plan_id, area_id) لضمان أن كل إجراء يقع بدقة داخل النطاق المحدد
 * لمجال التحسين المدرج في تلك الخطة دون انفصال أو تضارب.
 */
class ImprovementAction extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'improvement_actions';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'action_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'plan_id',
        'area_id',
        'title',
        'responsible_person_description',
        'start_date',
        'due_date',
        'status',
        'progress_description',
    ];

    /**
     * تحويل خصائص النموذج إلى أنواع بيانات محددة (Casts).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'due_date' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * خطة التحسين الحاوية لهذا الإجراء التنفيذي.
     *
     * @return BelongsTo
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(ImprovementPlan::class, 'plan_id', 'plan_id');
    }

    /**
     * مجال التحسين المستهدف بهذا الإجراء.
     *
     * @return BelongsTo
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(ImprovementArea::class, 'area_id', 'area_id');
    }

    /**
     * سجل الربط المركب (خطة + مجال) الذي يحكم وجود هذا الإجراء.
     *
     * @return BelongsTo
     */
    public function planArea(): BelongsTo
    {
        return $this->belongsTo(PlanImprovementArea::class, 'plan_id', 'plan_id')
            ->whereColumn('area_id', 'area_id');
    }

    /**
     * توصيات الذكاء الاصطناعي التي تم قبولها وتحويلها لدعم هذا الإجراء.
     *
     * @return HasMany
     */
    public function aiRecommendations(): HasMany
    {
        return $this->hasMany(AiRecommendation::class, 'improvement_action_id', 'action_id');
    }
}
