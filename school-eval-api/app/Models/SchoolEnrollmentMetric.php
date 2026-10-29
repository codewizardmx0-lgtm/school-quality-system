<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * نموذج إحصاءات قيد وتوزيع الطلاب والفصول (SchoolEnrollmentMetric).
 *
 * يمثل الإحصاءات التجميعية السنوية للطلبة والفصول موزعة حسب المرحلة والصف الدراسي،
 * ويخدم حساب مؤشرات البيئة المدرسية (STD-05) كالمؤشر 4-1-5 (الكثافة الصفية)
 * ومؤشرات رعاية الموهوبين (7-3) وذوي الاحتياجات الخاصة (16-1-5).
 *
 * الجدول: school_enrollment_metrics
 * المفتاح الأساسي: id
 */
class SchoolEnrollmentMetric extends Model
{
    use HasFactory;

    protected $table = 'school_enrollment_metrics';

    protected $fillable = [
        'school_id',
        'academic_year',
        'education_level',
        'grade_level',
        'classes_count',
        'male_students_count',
        'female_students_count',
        'special_needs_count',
        'talented_count',
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
            'classes_count' => 'integer',
            'male_students_count' => 'integer',
            'female_students_count' => 'integer',
            'special_needs_count' => 'integer',
            'talented_count' => 'integer',
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

    /**
     * إجمالي عدد الطلاب في هذا الصف (ذكور + إناث).
     *
     * @return int
     */
    public function getTotalStudentsAttribute(): int
    {
        return $this->male_students_count + $this->female_students_count;
    }
}
