<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج دورة التقييم المركزية (EvaluationCycle).
 *
 * يمثل دورة تقييمية مركزية على مستوى الوزارة والنظام، تُحدد وفق عام دراسي معين
 * وتاريخي بداية ونهاية، وترتبط بإصدار مرجعي معتمد للمعايير (StandardVersion).
 * تتيح الدورة للمدارس المشاركة فيها عبر جدول الربط (CycleParticipation)،
 * وتنشأ تحت مظلتها ملفات التقييم الذاتي للمدارس (Evaluation) وخطط التحسين (ImprovementPlan).
 */
class EvaluationCycle extends Model
{
    use HasFactory;

    /**
     * اسم جدول قاعدة البيانات المرتبط بالنموذج.
     *
     * @var string
     */
    protected $table = 'evaluation_cycles';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'cycle_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'version_id',
        'academic_year',
        'start_date',
        'end_date',
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
            'version_id' => 'integer',
            'start_date' => 'date',
            'end_date' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * خطاف التحقق الحتمي لمنع ربط دورة تقييم بإصدار ليس Approved (مُقرّ).
     */
    protected static function booted(): void
    {
        static::creating(function (EvaluationCycle $cycle) {
            if ($cycle->version_id) {
                $version = StandardVersion::find($cycle->version_id);
                if (!$version || !$version->isApproved()) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'version_id' => ['لا يمكن ربط دورة تقييم بإصدار غير مُقرّ.'],
                    ]);
                }
            }
        });
    }

    /**
     * إصدار المعايير الوطنية المعتمد الحاكم لهذه الدورة التقييمية.
     *
     * @return BelongsTo
     */
    public function version(): BelongsTo
    {
        return $this->belongsTo(StandardVersion::class, 'version_id', 'version_id');
    }

    /**
     * سجلات مشاركة المدارس المسجلة في هذه الدورة التقييمية.
     *
     * @return HasMany
     */
    public function participations(): HasMany
    {
        return $this->hasMany(CycleParticipation::class, 'cycle_id', 'cycle_id');
    }

    /**
     * المدارس المشاركة في هذه الدورة عبر جدول الربط المركزي cycle_participations.
     *
     * @return BelongsToMany
     */
    public function schools(): BelongsToMany
    {
        return $this->belongsToMany(
            School::class,
            'cycle_participations',
            'cycle_id',
            'school_id',
            'cycle_id',
            'school_id'
        )->withPivot('created_at', 'updated_at');
    }

    /**
     * ملفات التقييم الذاتي المنشأة للمدارس ضمن هذه الدورة التقييمية.
     *
     * @return HasMany
     */
    public function evaluations(): HasMany
    {
        return $this->hasMany(Evaluation::class, 'cycle_id', 'cycle_id');
    }

    /**
     * خطط التحسين والتطوير المدرسي المنبثقة عن هذه الدورة التقييمية.
     *
     * @return HasMany
     */
    public function improvementPlans(): HasMany
    {
        return $this->hasMany(ImprovementPlan::class, 'cycle_id', 'cycle_id');
    }
}
