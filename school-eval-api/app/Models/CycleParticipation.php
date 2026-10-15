<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * نموذج مشاركة المدرسة في دورة التقييم (CycleParticipation).
 *
 * يمثل جدول الربط المركزي بين المدارس ودورات التقييم المعتمدة،
 * حيث يمتلك مفتاحًا أساسيًا مركبًا من (cycle_id, school_id) لضمان عدم تكرار تسجيل
 * المدرسة أكثر من مرة في الدورة الواحدة.
 */
class CycleParticipation extends Model
{
    use HasFactory;

    /**
     * اسم جدول قاعدة البيانات المرتبط بالنموذج.
     *
     * @var string
     */
    protected $table = 'cycle_participations';

    /**
     * المفتاح الأساسي المركب للجدول.
     *
     * @var array<int, string>
     */
    protected $primaryKey = ['cycle_id', 'school_id'];

    /**
     * إلغاء الترقيم التلقائي للمفتاح الأساسي نظرًا لكونه مفتاحًا مركبًا.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'cycle_id',
        'school_id',
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
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * دورة التقييم المرتبطة بسجل المشاركة هذا.
     *
     * @return BelongsTo
     */
    public function cycle(): BelongsTo
    {
        return $this->belongsTo(EvaluationCycle::class, 'cycle_id', 'cycle_id');
    }

    /**
     * المدرسة المشاركة في هذه الدورة التقييمية.
     *
     * @return BelongsTo
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class, 'school_id', 'school_id');
    }
}
