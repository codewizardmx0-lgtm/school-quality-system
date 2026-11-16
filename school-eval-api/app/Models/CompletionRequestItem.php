<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * نموذج بند طلب الاستكمال (CompletionRequestItem).
 *
 * يمثل بنداً تفصيلياً لنقص محدد مطلوب استيفاؤه من المدرسة (سواء كان مؤشراً أو شاهداً)،
 * مع وصف المطلوب وحالة المعالجة للبند (Pending, Resolved).
 *
 * قاعدة العمل والتحقق (CHECK Constraint):
 * يخضع لقيد الفحص chk_completion_item_target:
 * (indicator_id IS NOT NULL OR evidence_id IS NOT NULL)
 * لضمان أن كل بند استكمال يستهدف مؤشراً أو شاهداً على الأقل (أو كليهما).
 */
class CompletionRequestItem extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'completion_request_items';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'request_item_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'request_id',
        'indicator_id',
        'evidence_link_id',
        'missing_description',
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
            'indicator_id' => 'integer',
            'evidence_link_id' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * طلب الاستكمال الحاوي لهذا البند.
     *
     * @return BelongsTo
     */
    public function request(): BelongsTo
    {
        return $this->belongsTo(CompletionRequest::class, 'request_id', 'request_id');
    }

    /**
     * المؤشر المستهدف بالنقص.
     *
     * @return BelongsTo
     */
    public function indicator(): BelongsTo
    {
        return $this->belongsTo(Indicator::class, 'indicator_id', 'indicator_id');
    }

    /**
     * رابط الشاهد المعين المستهدف بالنقص (إن وُجد).
     *
     * @return BelongsTo
     */
    public function evidenceLink(): BelongsTo
    {
        return $this->belongsTo(EvidenceLink::class, 'evidence_link_id', 'id');
    }

    /**
     * الفحص والتحول الآلي لحالة البند بناءً على استيفاء الشواهد المطلوبة.
     */
    public function refreshResolutionStatus(): string
    {
        // 1. إذا كان البند محدداً برابط شاهد معين
        if ($this->evidence_link_id) {
            $link = EvidenceLink::find($this->evidence_link_id);
            if ($link && strtolower($link->status ?? '') === 'completed') {
                if ($this->status !== 'resolved') {
                    $this->update(['status' => 'resolved']);
                }
                return 'resolved';
            }

            if ($this->status === 'resolved') {
                $this->update(['status' => 'pending']);
            }
            return $this->status;
        }

        // 2. إذا كان البند يستهدف كفاية المؤشر العام
        $evaluation = $this->request?->submission?->report?->evaluation;
        if ($evaluation && $this->indicator_id) {
            $sufficiencyService = app(\App\Services\EvidenceSufficiencyService::class);
            $indicator = Indicator::find($this->indicator_id);
            if ($indicator) {
                $result = EvaluationResult::where('evaluation_id', $evaluation->evaluation_id)
                    ->where('indicator_id', $this->indicator_id)
                    ->first();
                $requirements = IndicatorEvidenceRequirement::where('indicator_id', $this->indicator_id)->get();
                $evaluated = $sufficiencyService->evaluateIndicator($indicator, $result, $requirements);

                if (!empty($evaluated['is_sufficient'])) {
                    if ($this->status !== 'resolved') {
                        $this->update(['status' => 'resolved']);
                    }
                    return 'resolved';
                }
            }
        }

        if ($this->status === 'resolved') {
            $this->update(['status' => 'pending']);
        }

        return $this->status;
    }
}
