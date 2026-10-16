<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج تحليل الذكاء الاصطناعي (AiAnalysis).
 *
 * يمثل سجل طلب وعملية التحليل الذكي للتقييم المدرسي، ويوثق نطاق المدخلات والملخص العام
 * وحالة المعالجة (Pending, Completed, Failed).
 *
 * مبادئ الحوكمة وصلاحية القراءة فقط (BR-AI-01):
 * يعمل المساعد الذكي بصلاحية القراءة فقط (Read-only) ولا يقوم بتعديل درجات أو نتائج التقييم
 * أو تغيير محتوى ملفات التقييم الرسمية إطلاقاً، وتقتصر مخرجاته على التحليل الإرشادي والتوصيات.
 */
class AiAnalysis extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'ai_analysis';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'analysis_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'evaluation_id',
        'requested_by_user_id',
        'analysis_date',
        'input_scope',
        'summary',
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
            'analysis_date' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * ملف التقييم الخاضع لعملية التحليل الذكي.
     *
     * @return BelongsTo
     */
    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class, 'evaluation_id', 'evaluation_id');
    }

    /**
     * المستخدم الذي طلب تشغيل التحليل بالذكاء الاصطناعي.
     *
     * @return BelongsTo
     */
    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id', 'user_id');
    }

    /**
     * مخرجات وتوصيات الذكاء الاصطناعي المتولدة عن هذه العملية التحليلية.
     *
     * @return HasMany
     */
    public function recommendations(): HasMany
    {
        return $this->hasMany(AiRecommendation::class, 'analysis_id', 'analysis_id');
    }
}
