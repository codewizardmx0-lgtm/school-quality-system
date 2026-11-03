<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * نموذج ملاحظة مراجعة خطة التحسين (PlanReviewNote).
 *
 * يمثل التوجيهات والملاحظات الرقابية والتطويرية التي يسجلها مدير المدرسة
 * على مسودة خطة التحسين ومسارات تنفيذها قبل إقرارها أو أثناء متابعتها.
 */
class PlanReviewNote extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'plan_review_notes';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'note_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'plan_id',
        'author_user_id',
        'reviewer_role',
        'text',
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
     * خطة التحسين المدونة عليها هذه الملاحظة.
     *
     * @return BelongsTo
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(ImprovementPlan::class, 'plan_id', 'plan_id');
    }

    /**
     * كاتب الملاحظة (مدير المدرسة).
     *
     * @return BelongsTo
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_user_id', 'user_id');
    }
}
