<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * نموذج طريقة / أداة التحقق المستخدمة في نتيجة التقييم (EvaluationResultVerificationMethod).
 *
 * يمثل أداة التحقق الميدانية أو الوثائقية التي تم تطبيقها فعليًا لإثبات نتيجة مؤشر محدد
 * (مثل: المقابلات، فحص الوثائق، الملاحظة الصفية، الاستبانات)، رابطًا بين نتيجة التقييم
 * (EvaluationResult) وأداة التحقق (VerificationTool).
 * 
 * ملاحظة الطوابع الزمنية:
 * وفقًا للملحق (أ) في وثيقة الاتفاقيات (conventions.md)، هذا الجدول لا يحتوي على أي طوابع زمنية
 * (created_at أو updated_at)، لذا يتم تعطيلها تمامًا ($timestamps = false).
 */
class EvaluationResultVerificationMethod extends Model
{
    use HasFactory;

    /**
     * اسم جدول قاعدة البيانات المرتبط بالنموذج.
     *
     * @var string
     */
    protected $table = 'evaluation_result_verification_methods';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'id';

    /**
     * تعطيل الطوابع الزمنية التلقائية لعدم وجود created_at و updated_at في الجدول.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'evaluation_result_id',
        'tool_id',
    ];

    /**
     * تحويل خصائص النموذج إلى أنواع بيانات محددة (Casts).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'evaluation_result_id' => 'integer',
            'tool_id' => 'integer',
        ];
    }

    /**
     * نتيجة التقييم المطبقة عليها أداة التحقق.
     *
     * @return BelongsTo
     */
    public function evaluationResult(): BelongsTo
    {
        return $this->belongsTo(EvaluationResult::class, 'evaluation_result_id', 'result_id');
    }

    /**
     * أداة أو أسلوب التحقق المستخدم فعليًا في التقييم.
     *
     * @return BelongsTo
     */
    public function tool(): BelongsTo
    {
        return $this->belongsTo(VerificationTool::class, 'tool_id', 'tool_id');
    }
}
