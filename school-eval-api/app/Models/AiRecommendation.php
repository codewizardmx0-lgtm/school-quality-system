<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * نموذج توصية الذكاء الاصطناعي (AiRecommendation).
 *
 * يمثل التوصيات والمقترحات المنبثقة عن التحليل الذكي (مثل: تشخيص نقاط القوة، فرص التحسين،
 * التوصيات التطويرية، ومسودات إجراءات خطط التحسين).
 *
 * قاعدة الحوكمة والمراجعة البشرية الإلزامية (BR-AI-02):
 * تبقى جميع مخرجات وتوصيات الذكاء الاصطناعي في حالة مراجعة مبدئية (PendingReview)،
 * ولا يمكن ربطها رسميًا كإجراء تنفيذي معتمد (improvement_action_id) إلا بعد أن يقوم المستخدم
 * البشري بمراجعتها وقبولها صراحةً أو إدخال تعديلاته عليها وتوثيقها في (human_modifications)،
 * مع تحديث حالتها إلى (Accepted) أو (Modified)، أو استبعادها باختيار (Ignored).
 */
class AiRecommendation extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'ai_recommendations';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'recommendation_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'analysis_id',
        'improvement_action_id',
        'type',
        'title',
        'description',
        'priority',
        'human_modifications',
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
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * عملية التحليل الذكي المصدر لهذه التوصية.
     *
     * @return BelongsTo
     */
    public function analysis(): BelongsTo
    {
        return $this->belongsTo(AiAnalysis::class, 'analysis_id', 'analysis_id');
    }

    /**
     * الإجراء التنفيذي الرسمي الذي ربطت به هذه التوصية بعد القبول البشري.
     *
     * @return BelongsTo
     */
    public function improvementAction(): BelongsTo
    {
        return $this->belongsTo(ImprovementAction::class, 'improvement_action_id', 'action_id');
    }
}
