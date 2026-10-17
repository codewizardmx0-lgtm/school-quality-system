<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج نتيجة تقييم المؤشر (EvaluationResult).
 *
 * يمثل جوهر عملية التقييم الذاتي، حيث يُسجل تقدير المدرسة لمؤشر محدد (0، 1، 2، 3)
 * وفق الوصف المعياري المعتمد (IndicatorScoreDescriptor) والإصدار المرجعي (StandardVersion).
 * ترتبط بكل نتيجة شواهد داعمة (Evidence)، وملاحظات نصية (Note)، وأدوات تحقق مستخدمة (VerificationTool)،
 * كما يمكن أن تشتق منها مجالات تحسين (ImprovementArea).
 */
class EvaluationResult extends Model
{
    use HasFactory;

    /**
     * اسم جدول قاعدة البيانات المرتبط بالنموذج.
     *
     * @var string
     */
    protected $table = 'evaluation_results';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'result_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'evaluation_id',
        'indicator_id',
        'score_descriptor_id',
        'standard_version_id',
        'evaluator_user_id',
        'score',
        'textual_result',
        'completion_status',
    ];

    /**
     * تحويل خصائص النموذج إلى أنواع بيانات محددة (Casts).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'evaluation_id' => 'integer',
            'indicator_id' => 'integer',
            'score_descriptor_id' => 'integer',
            'standard_version_id' => 'integer',
            'evaluator_user_id' => 'integer',
            'score' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * ملف التقييم الذاتي الذي تنتمي إليه هذه النتيجة.
     *
     * @return BelongsTo
     */
    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class, 'evaluation_id', 'evaluation_id');
    }

    /**
     * المؤشر المعياري المقيم في هذه النتيجة.
     *
     * @return BelongsTo
     */
    public function indicator(): BelongsTo
    {
        return $this->belongsTo(Indicator::class, 'indicator_id', 'indicator_id');
    }

    /**
     * واصف الدرجة ومستوى الأداء المختار لهذا المؤشر.
     *
     * @return BelongsTo
     */
    public function scoreDescriptor(): BelongsTo
    {
        return $this->belongsTo(IndicatorScoreDescriptor::class, 'score_descriptor_id', 'descriptor_id');
    }

    /**
     * الإصدار المرجعي للمعايير الوطنية الذي قُيمت النتيجة في سياقه.
     *
     * @return BelongsTo
     */
    public function standardVersion(): BelongsTo
    {
        return $this->belongsTo(StandardVersion::class, 'standard_version_id', 'version_id');
    }

    /**
     * المستخدم المقيم الذي قام بإدخال واعتماد هذا التقدير.
     *
     * @return BelongsTo
     */
    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluator_user_id', 'user_id');
    }

    /**
     * الشواهد والأدلة الداعمة المسجلة لهذه النتيجة.
     *
     * @return HasMany
     */
    public function evidences(): HasMany
    {
        return $this->hasMany(Evidence::class, 'result_id', 'result_id');
    }

    /**
     * الملاحظات التوثيقية المسجلة على هذه النتيجة.
     *
     * @return HasMany
     */
    public function notes(): HasMany
    {
        return $this->hasMany(Note::class, 'result_id', 'result_id');
    }

    /**
     * سجلات الربط لأساليب التحقق المستخدمة فعليًا في هذه النتيجة.
     *
     * @return HasMany
     */
    public function verificationMethods(): HasMany
    {
        return $this->hasMany(EvaluationResultVerificationMethod::class, 'evaluation_result_id', 'result_id');
    }

    /**
     * أدوات وأساليب التحقق المستخدمة فعليًا من خلال جدول الربط.
     *
     * @return BelongsToMany
     */
    public function verificationTools(): BelongsToMany
    {
        return $this->belongsToMany(
            VerificationTool::class,
            'evaluation_result_verification_methods',
            'evaluation_result_id',
            'tool_id',
            'result_id',
            'tool_id'
        );
    }

    /**
     * مجالات التحسين المستخلصة مباشرة من نتيجة هذا المؤشر.
     *
     * @return HasMany
     */
    public function improvementAreas(): HasMany
    {
        return $this->hasMany(ImprovementArea::class, 'result_id', 'result_id');
    }
}
