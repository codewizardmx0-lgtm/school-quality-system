<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;

/**
 * نموذج رابط الشاهد التقييمي (EvidenceLink).
 *
 * يمثل علاقة الاستدلال وإثبات المؤشر؛ حيث يربط نسخة مستند معينة بمؤشر محدد
 * داخل ملف تقييم محدد مع بيان التبرير وحالة اكتمال الرابط (draft أو completed).
 */
class EvidenceLink extends Model
{
    use HasFactory;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_COMPLETED = 'completed';

    /**
     * اسم الجدول في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'evidence_links';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'id';

    /**
     * الحقول القابلة للتعيين الجماعي.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'school_id',
        'evaluation_id',
        'evaluation_result_id',
        'indicator_id',
        'document_version_id',
        'action_id',
        'justification',
        'covered_requirements',
        'status',
    ];

    /**
     * تحويل خصائص النموذج إلى أنواع بيانات محددة.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'school_id'            => 'integer',
            'evaluation_id'        => 'integer',
            'evaluation_result_id' => 'integer',
            'indicator_id'         => 'integer',
            'document_version_id'  => 'integer',
            'action_id'            => 'integer',
            'covered_requirements' => 'array',
            'created_at'           => 'datetime',
            'updated_at'           => 'datetime',
        ];
    }

    /**
     * المدرسة المعنية بهذا الرابط التقييمي (عزل مؤسسي).
     *
     * @return BelongsTo
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class, 'school_id', 'school_id');
    }

    /**
     * ملف التقييم التابع له هذا الرابط.
     *
     * @return BelongsTo
     */
    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class, 'evaluation_id', 'evaluation_id');
    }

    /**
     * نتيجة التقييم المرتبطة بهذا الرابط (إن وجدت).
     *
     * @return BelongsTo
     */
    public function evaluationResult(): BelongsTo
    {
        return $this->belongsTo(EvaluationResult::class, 'evaluation_result_id', 'result_id');
    }

    /**
     * المؤشر المعياري المستهدف بهذا الرابط.
     *
     * @return BelongsTo
     */
    public function indicator(): BelongsTo
    {
        return $this->belongsTo(Indicator::class, 'indicator_id', 'indicator_id');
    }

    /**
     * نسخة المستند المستخدمة كشاهد إثبات.
     *
     * @return BelongsTo
     */
    public function documentVersion(): BelongsTo
    {
        return $this->belongsTo(DocumentVersion::class, 'document_version_id', 'id');
    }

    /**
     * المستند المدرسي الأب عبر نسخة المستند.
     *
     * @return HasOneThrough
     */
    public function document(): HasOneThrough
    {
        return $this->hasOneThrough(
            SchoolDocument::class,
            DocumentVersion::class,
            'id',                  // المفتاح المحلي على جدول document_versions
            'id',                  // المفتاح المحلي على جدول school_documents
            'document_version_id', // المفتاح الأجنبي على جدول evidence_links
            'school_document_id'   // المفتاح الأجنبي على جدول document_versions
        );
    }

    /**
     * إجراء التحسين المرتبط بهذا الشاهد التنفيذي (إن وجد).
     *
     * @return BelongsTo
     */
    public function action(): BelongsTo
    {
        return $this->belongsTo(ImprovementAction::class, 'action_id', 'action_id');
    }
}
