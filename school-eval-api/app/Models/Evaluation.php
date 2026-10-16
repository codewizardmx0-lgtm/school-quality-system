<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج ملف التقييم الذاتي للمدرسة (Evaluation).
 *
 * يمثل ملف التقييم الذاتي الخاص بمدرسة محددة ضمن دورة تقييمية معينة.
 * يحتوي على نتائج التقييم للمؤشرات (EvaluationResult)، وتقارير المخرجات (Report)،
 * والتحليلات الذكية المدعومة بالذكاء الاصطناعي (AiAnalysis).
 * يفرض النظام قيد فريد يضمن وجود تقييم واحد فقط للمدرسة في الدورة الواحدة.
 */
class Evaluation extends Model
{
    use HasFactory;

    /**
     * اسم جدول قاعدة البيانات المرتبط بالنموذج.
     *
     * @var string
     */
    protected $table = 'evaluations';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'evaluation_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'cycle_id',
        'school_id',
        'created_by_user_id',
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
            'cycle_id' => 'integer',
            'school_id' => 'integer',
            'created_by_user_id' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * دورة التقييم المركزية التي يتبع لها ملف التقييم.
     *
     * @return BelongsTo
     */
    public function cycle(): BelongsTo
    {
        return $this->belongsTo(EvaluationCycle::class, 'cycle_id', 'cycle_id');
    }

    /**
     * المدرسة صاحبة ملف التقييم الذاتي.
     *
     * @return BelongsTo
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class, 'school_id', 'school_id');
    }

    /**
     * المستخدم منشئ ملف التقييم المدرسي.
     *
     * @return BelongsTo
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id', 'user_id');
    }

    /**
     * نتائج تقييم المؤشرات المسجلة ضمن هذا الملف.
     *
     * @return HasMany
     */
    public function results(): HasMany
    {
        return $this->hasMany(EvaluationResult::class, 'evaluation_id', 'evaluation_id');
    }

    /**
     * التقارير الرسمية المولدة لهذا التقييم الذاتي.
     *
     * @return HasMany
     */
    public function reports(): HasMany
    {
        return $this->hasMany(Report::class, 'evaluation_id', 'evaluation_id');
    }

    /**
     * تحليلات الذكاء الاصطناعي المجراة على نتائج هذا التقييم.
     *
     * @return HasMany
     */
    public function aiAnalyses(): HasMany
    {
        return $this->hasMany(AiAnalysis::class, 'evaluation_id', 'evaluation_id');
    }
}
