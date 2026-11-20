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
        'school_id',
        'cycle_id',
        'completion_request_id',
        'author_user_id',
        'memo_type',
        'subject',
        'text',
        'is_visible_to_school',
    ];

    /**
     * تحويل خصائص النموذج إلى أنواع بيانات محددة (Casts).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_visible_to_school' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * محاولة الإرسال التي دُوِّنت عليها هذه الملاحظة الإشرافية (إن وجدت).
     *
     * @return BelongsTo
     */
    public function submission(): BelongsTo
    {
        return $this->belongsTo(EvaluationSubmission::class, 'submission_id', 'submission_id');
    }

    /**
     * المدرسة المعنية بالملاحظة أو الزيارة الميدانية.
     *
     * @return BelongsTo
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class, 'school_id', 'school_id');
    }

    /**
     * الدورة التقييمية المرتبطة بالملاحظة الإشرافية.
     *
     * @return BelongsTo
     */
    public function cycle(): BelongsTo
    {
        return $this->belongsTo(EvaluationCycle::class, 'cycle_id', 'cycle_id');
    }

    /**
     * طلب الاستكمال المعني بالملاحظة (إن وجد).
     *
     * @return BelongsTo
     */
    public function completionRequest(): BelongsTo
    {
        return $this->belongsTo(CompletionRequest::class, 'completion_request_id', 'request_id');
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
