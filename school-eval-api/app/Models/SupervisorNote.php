<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * نموذج ملاحظة المشرف الوزاري (SupervisorNote).
 *
 * يمثل التوجيهات والملاحظات الإشرافية والإدارية التي يسجلها المشرف الوزاري
 * على محاولة إرسال محددة لتقرير التقييم المدرسي.
 *
 * ملاحظة معمارية حول المتطلب FR-SUP-16:
 * يرتبط هذا النموذج بمحاولة الإرسال (submission_id) فقط وفقاً للتصميم وقاموس البيانات المعتمد،
 * ولا يرتبط مباشرة بمؤشر أو شاهد محدد، حيث أُرجئ حسم تعارض المتطلب FR-SUP-16 لدراسة مستقبلية
 * دون الإخلال بالمخطط الهيكلي المعتمد لقاعدة البيانات.
 */
class SupervisorNote extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'supervisor_notes';

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
        'submission_id',
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
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * محاولة الإرسال التي دُوِّنت عليها هذه الملاحظة الإشرافية.
     *
     * @return BelongsTo
     */
    public function submission(): BelongsTo
    {
        return $this->belongsTo(EvaluationSubmission::class, 'submission_id', 'submission_id');
    }

    /**
     * كاتب الملاحظة (المشرف الوزاري).
     *
     * @return BelongsTo
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_user_id', 'user_id');
    }
}
