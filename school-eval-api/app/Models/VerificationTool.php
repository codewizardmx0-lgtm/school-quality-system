<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج أداة التحقق (VerificationTool).
 *
 * يمثل أدوات ووسائل جمع البيانات والتحقق المعتمدة في التقويم المدرسي
 * (مثل: الملاحظة الصفية، المقابلة الفردية، استبانة أولياء الأمور، مراجعة الوثائق)،
 * وحالة اعتمادها ومدى صلاحيتها للاستخدام.
 */
class VerificationTool extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'verification_tools';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'tool_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'tool_type',
        'description',
        'approved',
    ];

    /**
     * تحويل خصائص النموذج إلى أنواع بيانات محددة (Casts).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'approved' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * طرائق التحقق والربط التي تستخدم هذه الأداة مع المؤشرات.
     *
     * @return HasMany
     */
    public function indicatorVerificationMethods(): HasMany
    {
        return $this->hasMany(IndicatorVerificationMethod::class, 'tool_id', 'tool_id');
    }

    /**
     * المؤشرات التي تستخدم أداة التحقق هذه (علاقة متعدد لمتعدد).
     *
     * @return BelongsToMany
     */
    public function indicators(): BelongsToMany
    {
        return $this->belongsToMany(
            Indicator::class,
            'indicator_verification_methods',
            'tool_id',
            'indicator_id',
            'tool_id',
            'indicator_id'
        );
    }

    /**
     * أدوات التحقق المستخدمة فعلياً والموثقة ضمن نتائج التقييم.
     *
     * @return HasMany
     */
    public function evaluationResultVerificationMethods(): HasMany
    {
        return $this->hasMany(EvaluationResultVerificationMethod::class, 'tool_id', 'tool_id');
    }
}
