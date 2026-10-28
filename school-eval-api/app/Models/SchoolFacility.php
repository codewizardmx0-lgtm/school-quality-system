<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * نموذج مرافق وتجهيزات المدرسة التشغيلية (SchoolFacility).
 *
 * يمثل مرافق المدرسة (الفصول، المعامل، المكتبات، دورات المياه، تجهيزات السلامة...)،
 * ويخدم حساب مؤشرات البيئة المدرسية (STD-05) كالمؤشرات 5-1-5 و 6-1-5 و 7-1-5 و 13-1-5.
 *
 * الجدول: school_facilities
 * المفتاح الأساسي: facility_id
 */
class SchoolFacility extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'school_facilities';

    protected $primaryKey = 'facility_id';

    protected $fillable = [
        'school_id',
        'facility_type',
        'name',
        'count',
        'is_usable',
        'details',
    ];

    /**
     * تحويلات السمات.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'school_id' => 'integer',
            'count' => 'integer',
            'is_usable' => 'boolean',
            'details' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * المدرسة التابع لها المرفق.
     *
     * @return BelongsTo
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class, 'school_id', 'school_id');
    }
}
