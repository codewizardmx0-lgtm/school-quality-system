<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * نموذج طريقة التحقق للمؤشر (IndicatorVerificationMethod).
 *
 * يمثل جدول الربط والتخصيص بين المؤشر وأداة التحقق المعتمدة،
 * ويوضح ما إذا كانت الأداة إلزامية للمؤشر مع إرشادات وضوابط الاستخدام،
 * ويحتوي على طابع زمني للإنشاء فقط (created_at).
 */
class IndicatorVerificationMethod extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'indicator_verification_methods';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'id';

    /**
     * تعطيل حقل تاريخ التحديث، حيث يحتوي الجدول على تاريخ الإنشاء فقط (created_at).
     */
    const UPDATED_AT = null;

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'indicator_id',
        'tool_id',
        'required',
        'usage_guidance',
        'created_at',
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
            'created_at' => 'datetime',
        ];
    }

    /**
     * المؤشر المرتبط بطريقة وأداة التحقق هذه.
     *
     * @return BelongsTo
     */
    public function indicator(): BelongsTo
    {
        return $this->belongsTo(Indicator::class, 'indicator_id', 'indicator_id');
    }

    /**
     * أداة التحقق المستخدمة للمؤشر.
     *
     * @return BelongsTo
     */
    public function tool(): BelongsTo
    {
        return $this->belongsTo(VerificationTool::class, 'tool_id', 'tool_id');
    }
}
