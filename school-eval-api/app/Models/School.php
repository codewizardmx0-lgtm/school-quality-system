<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج المدرسة (School)
 * 
 * يمثل هذا النموذج المؤسسة التعليمية (المدرسة) الخاضعة لعمليات التقويم والتحسين،
 * ويتضمن بياناتها التعريفية والجغرافية والمرحلة التعليمية وحالتها التشغيلية.
 * ترتبط المدرسة بالمستخدمين، دورات التقويم، عمليات التقييم، وخطط التحسين المدرسي.
 * 
 * الجدول: schools
 * المفتاح الأساسي: school_id
 * الطوابع الزمنية: غير مفعلة (public $timestamps = false) وفق الملحق أ
 */
class School extends Model
{
    use HasFactory;

    /**
     * اسم جدول قاعدة البيانات المرتبط بالنموذج.
     *
     * @var string
     */
    protected $table = 'schools';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'school_id';

    /**
     * تعطيل الطوابع الزمنية الافتراضية (created_at / updated_at) وفق الملحق أ.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * الحقول القابلة للإسناد الجماعي.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'school_name',
        'school_type',
        'educational_stage',
        'identification_data',
        'governorate_id',
        'directorate_id',
        'educational_district',
        'governorate',
        'status',
        'address',
        'phone',
        'email',
        'educational_admin',
        'building_type',
        'shift_type',
        'total_area',
        'built_up_area',
    ];

    /**
     * تحويلات السمات (Attribute Casting).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'school_id' => 'integer',
            'total_area' => 'decimal:2',
            'built_up_area' => 'decimal:2',
        ];
    }

    /**
     * منسوبو المدرسة من المستخدمين (علاقة واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'school_id', 'school_id');
    }

    /**
     * مدير المدرسة (علاقة واحد لواحد).
     */
    public function principal()
    {
        return $this->hasOne(User::class, 'school_id', 'school_id')
            ->whereHas('roles', fn ($q) => $q->where('role_name', 'school_principal'));
    }

    /**
     * مقيمو المدرسة (علاقة واحد لمتعدد).
     */
    public function evaluators()
    {
        return $this->hasMany(User::class, 'school_id', 'school_id')
            ->whereHas('roles', fn ($q) => $q->where('role_name', 'school_evaluator'));
    }

    /**
     * مشاركات المدرسة في دورات التقويم (علاقة واحد إلى متعدد عبر cycle_participations).
     *
     * @return HasMany
     */
    public function cycleParticipations(): HasMany
    {
        return $this->hasMany(CycleParticipation::class, 'school_id', 'school_id');
    }

    /**
     * دورات التقويم التي تشارك بها المدرسة (علاقة متعدد إلى متعدد عبر cycle_participations).
     *
     * @return BelongsToMany
     */
    public function cycles(): BelongsToMany
    {
        return $this->belongsToMany(
            EvaluationCycle::class,
            'cycle_participations',
            'school_id',
            'cycle_id',
            'school_id',
            'cycle_id'
        )->withPivot('created_at', 'updated_at');
    }

    /**
     * عمليات التقييم (الذاتي أو الخارجي) الخاصة بالمدرسة (علاقة واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function evaluations(): HasMany
    {
        return $this->hasMany(Evaluation::class, 'school_id', 'school_id');
    }

    /**
     * خطط التحسين المعتمدة أو قيد الإعداد للمدرسة (علاقة واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function improvementPlans(): HasMany
    {
        return $this->hasMany(ImprovementPlan::class, 'school_id', 'school_id');
    }

    /**
     * إحصاءات الكادر التعليمي والإداري للمدرسة عبر الأعوام (الشريحة 6).
     *
     * @return HasMany
     */
    public function staffMetrics(): HasMany
    {
        return $this->hasMany(SchoolStaffMetric::class, 'school_id', 'school_id');
    }

    /**
     * إحصاءات قيد وتوزيع الطلاب والفصول عبر الأعوام (الشريحة 6).
     *
     * @return HasMany
     */
    public function enrollmentMetrics(): HasMany
    {
        return $this->hasMany(SchoolEnrollmentMetric::class, 'school_id', 'school_id');
    }

    /**
     * مرافق وتجهيزات المدرسة التشغيلية (الشريحة 6).
     *
     * @return HasMany
     */
    public function facilities(): HasMany
    {
        return $this->hasMany(SchoolFacility::class, 'school_id', 'school_id');
    }

    /**
     * مستندات المدرسة المرفوعة في المستودع المؤسسي (U-24).
     *
     * @return HasMany
     */
    public function documents(): HasMany
    {
        return $this->hasMany(SchoolDocument::class, 'school_id', 'school_id');
    }

    /**
     * المحافظة التابعة لها المدرسة.
     */
    public function governorateModel(): BelongsTo
    {
        return $this->belongsTo(Governorate::class, 'governorate_id', 'governorate_id');
    }

    /**
     * المديرية التابعة لها المدرسة.
     */
    public function directorateModel(): BelongsTo
    {
        return $this->belongsTo(Directorate::class, 'directorate_id', 'directorate_id');
    }

    /**
     * روابط الشواهد الموثقة للمدرسة عبر التقييمات والمؤشرات (U-24).
     *
     * @return HasMany
     */
    public function evidenceLinks(): HasMany
    {
        return $this->hasMany(EvidenceLink::class, 'school_id', 'school_id');
    }
}
