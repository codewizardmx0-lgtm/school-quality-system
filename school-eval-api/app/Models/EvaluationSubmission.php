<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج محاولة رفع التقييم (EvaluationSubmission).
 *
 * يمثل محاولة تسليم ورفع مخرج تقرير التقييم إلى المستوى الوزاري بحالاته الخمس
 * (Draft, Submitted, UnderReview, NeedsCompletion, Completed).
 *
 * قاعدة العمل والتحقق (CHECK Constraint):
 * يخضع لقيد الفحص chk_submission_submitted_at:
 * ((status = 'Draft' AND submitted_at IS NULL) OR (status <> 'Draft' AND submitted_at IS NOT NULL))
 * حيث يكون تاريخ الرفع الفعلي submitted_at فارغاً (NULL) طالما المحاولة في حالة مسودة (Draft)،
 * وإلزامياً (NOT NULL) فور رفعها أو انتقالها إلى أي حالة أخرى.
 * كما أن صلاحية الرفع محصورة حصراً بمدير المدرسة (submitted_by_user_id).
 *
 * الطوابع الزمنية:
 * يتضمن updated_at فقط، بينما يتم تخزين تاريخ الإرسال في حقل submitted_at (const CREATED_AT = null).
 */
class EvaluationSubmission extends Model
{
    use HasFactory;

    /**
     * اسم الجدول المرتبط بالنموذج في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'evaluation_submissions';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'submission_id';

    /**
     * تعطيل عمود طابع الإنشاء الافتراضي؛ حيث يُستخدم submitted_at للرفع الفعلي.
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
        'report_id',
        'submitted_by_user_id',
        'attempt_no',
        'submitted_at',
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
            'attempt_no' => 'integer',
            'submitted_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * تقرير التقييم المرفوع في هذه المحاولة.
     *
     * @return BelongsTo
     */
    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class, 'report_id', 'report_id');
    }

    /**
     * مدير المدرسة الذي قام باعتماد ورفع هذه المحاولة.
     *
     * @return BelongsTo
     */
    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by_user_id', 'user_id');
    }

    /**
     * ملاحظات المشرف الوزاري الإدارية والتوجيهية على هذه المحاولة.
     *
     * @return HasMany
     */
    public function supervisorNotes(): HasMany
    {
        return $this->hasMany(SupervisorNote::class, 'submission_id', 'submission_id');
    }

    /**
     * طلبات الاستكمال الصادرة عن الوزارة في حال عدم اكتمال هذه المحاولة.
     *
     * @return HasMany
     */
    public function completionRequests(): HasMany
    {
        return $this->hasMany(CompletionRequest::class, 'submission_id', 'submission_id');
    }
}
