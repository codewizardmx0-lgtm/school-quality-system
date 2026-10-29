<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * نموذج إحصاءات الكادر التعليمي والإداري للمدرسة (SchoolStaffMetric).
 *
 * يمثل الإحصاءات التجميعية السنوية لمنسوبي المدرسة (المعلمين، الإداريين، والخدمات)،
 * ويخدم حساب مؤشرات معيار المعلمين والكوادر الإدارية (STD-02) مثل المؤشرين 1-1-2 و 2-1-2.
 *
 * الجدول: school_staff_metrics
 * المفتاح الأساسي: id
 */
class SchoolStaffMetric extends Model
{
    use HasFactory;

    protected $table = 'school_staff_metrics';

    protected $fillable = [
        'school_id',
        'academic_year',
        'total_teachers',
        'qualified_teachers_count',
        'permanent_teachers_count',
        'matched_specialization_count',
        'total_admin_staff',
        'total_service_staff',
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
            'total_teachers' => 'integer',
            'qualified_teachers_count' => 'integer',
            'permanent_teachers_count' => 'integer',
            'matched_specialization_count' => 'integer',
            'total_admin_staff' => 'integer',
            'total_service_staff' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * المدرسة التابع لها هذا السجل الإحصائي.
     *
     * @return BelongsTo
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class, 'school_id', 'school_id');
    }
}
