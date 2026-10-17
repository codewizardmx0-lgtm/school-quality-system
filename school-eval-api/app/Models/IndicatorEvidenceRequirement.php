<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * نموذج متطلب الشاهد للمؤشر (IndicatorEvidenceRequirement).
 *
 * يحدد نوع الشاهد أو الوثيقة المطلوبة كدليل لإثبات استيفاء مؤشر معين،
 * ويوضح ما إذا كان الشاهد إلزامياً أم اختيارياً والترتيب الموصى به للعرض.
 */
class IndicatorEvidenceRequirement extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'indicator_evidence_requirements';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'requirement_id';

    /**
     * تعطيل الطوابع الزمنية التلقائية (created_at, updated_at).
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
        'indicator_id',
        'standard_version_id',
        'title',
        'description',
        'required',
        'display_order',
    ];

    /**
     * تحويل خصائص النموذج إلى أنواع بيانات محددة (Casts).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'required' => 'boolean',
            'display_order' => 'integer',
        ];
    }

    /**
     * المؤشر المرتبط به هذا المتطلب من الشواهد.
     *
     * @return BelongsTo
     */
    public function indicator(): BelongsTo
    {
        return $this->belongsTo(Indicator::class, 'indicator_id', 'indicator_id');
    }

    /**
     * إصدار المعايير المرجعي المرتبط به هذا المتطلب.
     *
     * @return BelongsTo
     */
    public function standardVersion(): BelongsTo
    {
        return $this->belongsTo(StandardVersion::class, 'standard_version_id', 'version_id');
    }
}
