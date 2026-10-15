<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج طلب الاستكمال (CompletionRequest).
 *
 * يمثل طلب الاستكمال الرسمي الصادر عن المشرف الوزاري لإعادة ملف التقييم إلى المدرسة
 * لاستيفاء متطلبات أو أدلة أو تعديل بيانات غير مكتملة، ويتضمن تاريخ الحل والإغلاق وحالة الطلب (Open, Resolved).
 */
class CompletionRequest extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'completion_requests';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'request_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'submission_id',
        'issued_by_user_id',
        'resolved_at',
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
            'resolved_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * محاولة الإرسال التي صدر بخصوصها طلب الاستكمال.
     *
     * @return BelongsTo
     */
    public function submission(): BelongsTo
    {
        return $this->belongsTo(EvaluationSubmission::class, 'submission_id', 'submission_id');
    }

    /**
     * المشرف الوزاري الذي أصدر طلب الاستكمال.
     *
     * @return BelongsTo
     */
    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by_user_id', 'user_id');
    }

    /**
     * بنود وتفاصيل النواقص المحددة في طلب الاستكمال.
     *
     * @return HasMany
     */
    public function items(): HasMany
    {
        return $this->hasMany(CompletionRequestItem::class, 'request_id', 'request_id');
    }
}
