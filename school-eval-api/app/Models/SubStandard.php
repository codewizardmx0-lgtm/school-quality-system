<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج المعيار الفرعي (SubStandard).
 *
 * يمثل تفريعاً تخصصياً لمعيار رئيسي محدد، ويحتوي بدوره على مجموعة من المؤشرات
 * القابلة للقياس والتقويم المباشر.
 */
class SubStandard extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'sub_standards';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'sub_standard_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'standard_id',
        'code',
        'name',
        'description',
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
     * المعيار الرئيسي الذي يتبعه هذا المعيار الفرعي.
     *
     * @return BelongsTo
     */
    public function standard(): BelongsTo
    {
        return $this->belongsTo(Standard::class, 'standard_id', 'standard_id');
    }

    /**
     * المؤشرات التفصيلية المرتبطة بهذا المعيار الفرعي.
     *
     * @return HasMany
     */
    public function indicators(): HasMany
    {
        return $this->hasMany(Indicator::class, 'sub_standard_id', 'sub_standard_id');
    }
}
