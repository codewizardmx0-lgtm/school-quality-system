<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج خطة التحسين المدرسي (ImprovementPlan).
 *
 * يمثل خطة تحسين وتطوير الأداء المدرسي المنبثقة عن نتائج دورة تقويم محددة لمدرسة معينة.
 * تهدف الخطة إلى معالجة مجالات الضعف وتعزيز نقاط القوة عبر إجراءات تنفيذية محددة ومؤطرة زمنياً.
 */
class ImprovementPlan extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'improvement_plans';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'plan_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'cycle_id',
        'school_id',
        'created_by_user_id',
        'title',
        'start_date',
        'end_date',
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
            'end_date' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * دورة التقييم المدرسية التي ترتبط بها هذه الخطة.
     *
     * @return BelongsTo
     */
    public function cycle(): BelongsTo
    {
        return $this->belongsTo(EvaluationCycle::class, 'cycle_id', 'cycle_id');
    }

    /**
     * المدرسة صاحبة خطة التحسين.
     *
     * @return BelongsTo
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class, 'school_id', 'school_id');
    }

    /**
     * المستخدم منشئ الخطة (مثل مدير المدرسة أو مسؤول الجودة).
     *
     * @return BelongsTo
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id', 'user_id');
    }

    /**
     * سجلات الربط الوسيطة مع مجالات التحسين المستهدفة بالخطة.
     *
     * @return HasMany
     */
    public function planImprovementAreas(): HasMany
    {
        return $this->hasMany(PlanImprovementArea::class, 'plan_id', 'plan_id');
    }

    /**
     * مجالات التحسين المدرجة ضمن نطاق هذه الخطة.
     *
     * @return BelongsToMany
     */
    public function areas(): BelongsToMany
    {
        return $this->belongsToMany(
            ImprovementArea::class,
            'plan_improvement_areas',
            'plan_id',
            'area_id',
            'plan_id',
            'area_id'
        );
    }

    /**
     * الإجراءات التنفيذية التفصيلية التابعة لهذه الخطة.
     *
     * @return HasMany
     */
    public function actions(): HasMany
    {
        return $this->hasMany(ImprovementAction::class, 'plan_id', 'plan_id');
    }

    /**
     * ملاحظات المراجعة الداخلية على خطة التحسين من قِبل الإدارة المدرسية.
     *
     * @return HasMany
     */
    public function reviewNotes(): HasMany
    {
        return $this->hasMany(PlanReviewNote::class, 'plan_id', 'plan_id');
    }
}
