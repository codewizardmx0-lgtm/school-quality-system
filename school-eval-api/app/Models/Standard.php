<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج المعيار الرئيسي (Standard).
 *
 * يمثل مجالاً أو معياراً رئيسياً من مجالات الجودة والتقويم المدرسي
 * (مثل: القيادة المدرسية، التعليم والتعلم، نواتج التعلم، البيئة المدرسية)،
 * ويتبع إصداراً محدداً من المعايير ويتفرع إلى معايير فرعية.
 */
class Standard extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'standards';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'standard_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'version_id',
        'code',
        'name',
        'description',
        'weight',
    ];

    /**
     * تحويل خصائص النموذج إلى أنواع بيانات محددة (Casts).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'weight' => 'decimal:2',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * إصدار المعايير المعتمد الذي ينتمي إليه هذا المعيار الرئيسي.
     *
     * @return BelongsTo
     */
    public function version(): BelongsTo
    {
        return $this->belongsTo(StandardVersion::class, 'version_id', 'version_id');
    }

    /**
     * المعايير الفرعية المتفرعة من هذا المعيار الرئيسي.
     *
     * @return HasMany
     */
    public function subStandards(): HasMany
    {
        return $this->hasMany(SubStandard::class, 'standard_id', 'standard_id');
    }
}
