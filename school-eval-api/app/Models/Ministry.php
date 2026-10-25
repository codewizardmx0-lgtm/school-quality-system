<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج الجهة الوزارية (Ministry)
 * 
 * يمثل هذا النموذج الإدارات والجهات التابعة لوزارة التربية والتعليم التي يتبع لها
 * المشرفون والمسؤولون الوزاريون القائمون على الرقابة والتقويم واعتماد الخطط.
 * 
 * الجدول: ministries
 * المفتاح الأساسي: ministry_id
 * الطوابع الزمنية: غير مفعلة (public $timestamps = false) وفق الملحق أ
 */
class Ministry extends Model
{
    use HasFactory;

    /**
     * اسم جدول قاعدة البيانات المرتبط بالنموذج.
     *
     * @var string
     */
    protected $table = 'ministries';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'ministry_id';

    /**
     * تعطيل الطوابع الزمنية الافتراضية (created_at / updated_at) وفق الملحق أ.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * الحقول القابلة للإسناد الجماعي.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'ministry_name',
        'description',
    ];

    /**
     * تحويلات السمات (Attribute Casting).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'ministry_id' => 'integer',
        ];
    }

    /**
     * المستخدمون والمشرفون التابعون للجهة الوزارية (علاقة واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'ministry_id', 'ministry_id');
    }
}
