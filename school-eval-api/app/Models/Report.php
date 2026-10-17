<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج تقرير التقييم (Report).
 *
 * يمثل التقرير المولد لنتائج التقييم الذاتي المدرسي بحالاته (مسودة Draft أو نهائي Final).
 * يعتبر التقرير وثيقة المخرج الأساسية التي تُرفع للمستوى الوزاري، وتُدار من خلاله
 * محاولات التسليم وملاحظات المراجعة الداخلية لمدير المدرسة، والمرفقات المصاحبة.
 *
 * الطوابع الزمنية:
 * يتضمن updated_at فقط، بينما يتم تخزين تاريخ الإنشاء في حقل generated_at صراحة (const CREATED_AT = null).
 */
class Report extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'reports';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'report_id';

    /**
     * تعطيل عمود طابع الإنشاء الافتراضي؛ حيث يُستخدم generated_at بدلاً منه.
     */
    const CREATED_AT = null;

    /**
     * اسم عمود طابع التحديث الزمني.
     */
    const UPDATED_AT = 'updated_at';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'evaluation_id',
        'generated_at',
        'status',
    ];

    /**
     * تحويل خصائص النموذج إلى أنواع بيانات محددة (Casts).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'generated_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * ملف التقييم المصدر الذي تم توليد هذا التقرير منه.
     *
     * @return BelongsTo
     */
    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class, 'evaluation_id', 'evaluation_id');
    }

    /**
     * محاولات إرسال ورفع هذا التقرير إلى المستوى الوزاري.
     *
     * @return HasMany
     */
    public function submissions(): HasMany
    {
        return $this->hasMany(EvaluationSubmission::class, 'report_id', 'report_id');
    }

    /**
     * ملاحظات المراجعة الداخلية التي يدونها مدير المدرسة على هذا التقرير.
     *
     * @return HasMany
     */
    public function internalReviewNotes(): HasMany
    {
        return $this->hasMany(InternalReviewNote::class, 'report_id', 'report_id');
    }

    /**
     * المرفقات والملفات المصاحبة لهذا التقرير (مثل النسخ الموقعة أو الملحقات).
     *
     * @return HasMany
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class, 'target_id', 'report_id')
            ->where('target_type', 'report');
    }
}
