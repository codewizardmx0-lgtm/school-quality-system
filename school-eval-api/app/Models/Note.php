<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * نموذج الملاحظة التوثيقية على نتيجة التقييم (Note).
 *
 * يمثل الملاحظات النصية التي يدونها المقيم أو أعضاء فريق التقييم على نتيجة تقييم
 * مؤشر معين (EvaluationResult)، لتوثيق سياق التقدير، أو الصعوبات، أو التوصيات الأولية،
 * وترتبط بالمستخدم الذي كتبها (User).
 */
class Note extends Model
{
    use HasFactory;

    /**
     * اسم جدول قاعدة البيانات المرتبط بالنموذج.
     *
     * @var string
     */
    protected $table = 'notes';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'note_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'result_id',
        'author_user_id',
        'text',
    ];

    /**
     * تحويل خصائص النموذج إلى أنواع بيانات محددة (Casts).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'result_id' => 'integer',
            'author_user_id' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * نتيجة التقييم المرتبطة بهذه الملاحظة.
     *
     * @return BelongsTo
     */
    public function result(): BelongsTo
    {
        return $this->belongsTo(EvaluationResult::class, 'result_id', 'result_id');
    }

    /**
     * المستخدم كاتب ومؤلف هذه الملاحظة.
     *
     * @return BelongsTo
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_user_id', 'user_id');
    }
}
