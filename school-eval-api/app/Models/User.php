<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * نموذج المستخدم (User)
 * 
 * يمثل هذا الكيان المحوري حسابات المستخدمين في منصة تقويم جودة المدارس عبر كافة الأدوار
 * (مدارس، مشرفون تربويون، مسؤولو نظام، إلخ).
 * 
 * قواعد الأعمال الخاصة بالنموذج:
 * 1. قاعدة التبعية المؤسسية الحصرية (XOR): يرتبط المستخدم إما بمدرسة (school_id) أو بجهة وزارية (ministry_id)
 *    ولا يجوز الجمع بينهما للحساب الواحد؛ كما يمكن أن يكون كلاهما فارغًا لمستخدمي النظام العامين (system).
 * 2. المصادقة وتجزئة كلمة المرور: يستخدم النظام عمود `password_hash` لحفظ كلمة المرور المشفرة بدلاً من `password` الافتراضي،
 *    وتم تخصيص طريقة getAuthPasswordName() لتوجيه حارس المصادقة إليه.
 * 
 * الجدول: users
 * المفتاح الأساسي: user_id
 * الطوابع الزمنية: مفعلة افتراضيًا (created_at, updated_at)
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * اسم جدول قاعدة البيانات المرتبط بالنموذج.
     *
     * @var string
     */
    protected $table = 'users';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'user_id';

    /**
     * الحقول القابلة للإسناد الجماعي.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'school_id',
        'ministry_id',
        'username',
        'password_hash',
        'full_name',
        'email',
        'user_type',
        'status',
    ];

    /**
     * الحقول المخفية عند التحويل إلى مصفوفة أو كائن JSON.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password_hash',
    ];

    /**
     * تحويلات السمات (Attribute Casting).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'school_id' => 'integer',
            'ministry_id' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * تحديد اسم عمود كلمة المرور المستخدم في نظام مصادقة Laravel.
     *
     * @return string
     */
    public function getAuthPasswordName(): string
    {
        return 'password_hash';
    }

    /**
     * المدرسة التي يتبع لها المستخدم (إذا كان حساب مدرسة).
     *
     * @return BelongsTo
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class, 'school_id', 'school_id');
    }

    /**
     * الجهة الوزارية التي يتبع لها المستخدم (إذا كان حساباً وزارياً).
     *
     * @return BelongsTo
     */
    public function ministry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class, 'ministry_id', 'ministry_id');
    }

    /**
     * الأدوار الوظيفية الممنوحة للمستخدم (علاقة متعدد إلى متعدد عبر user_roles).
     *
     * @return BelongsToMany
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(
            Role::class,
            'user_roles',
            'user_id',
            'role_id',
            'user_id',
            'role_id'
        )->withPivot('assigned_at', 'revoked_at', 'active');
    }

    /**
     * سجلات ربط الأدوار الخاصة بالمستخدم (واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function userRoles(): HasMany
    {
        return $this->hasMany(UserRole::class, 'user_id', 'user_id');
    }

    /**
     * سجلات الجلسات الوظيفية وتتبع النشاط الخاصة بالمستخدم (واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function sessions(): HasMany
    {
        return $this->hasMany(Session::class, 'user_id', 'user_id');
    }

    /**
     * عمليات التقييم التي أنشأها المستخدم (واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function createdEvaluations(): HasMany
    {
        return $this->hasMany(Evaluation::class, 'created_by_user_id', 'user_id');
    }

    /**
     * نتائج التقييم للمؤشرات التي قام المستخدم برصد درجاتها وتقييمها (واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function evaluatedResults(): HasMany
    {
        return $this->hasMany(EvaluationResult::class, 'evaluator_user_id', 'user_id');
    }

    /**
     * الملاحظات العامة وملاحظات التوجيه التي دوّنها المستخدم (واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function notes(): HasMany
    {
        return $this->hasMany(Note::class, 'author_user_id', 'user_id');
    }

    /**
     * خطط التحسين التي أنشأها المستخدم (واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function createdImprovementPlans(): HasMany
    {
        return $this->hasMany(ImprovementPlan::class, 'created_by_user_id', 'user_id');
    }

    /**
     * طلبات تسليم التقييم والاعتماد المقدمة من المستخدم (واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function evaluationSubmissions(): HasMany
    {
        return $this->hasMany(EvaluationSubmission::class, 'submitted_by_user_id', 'user_id');
    }

    /**
     * ملاحظات المراجعة والتدقيق الداخلي التي كتبها المستخدم (واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function internalReviewNotes(): HasMany
    {
        return $this->hasMany(InternalReviewNote::class, 'author_user_id', 'user_id');
    }

    /**
     * ملاحظات مراجعة خطط التحسين المدونة بواسطة المستخدم (واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function planReviewNotes(): HasMany
    {
        return $this->hasMany(PlanReviewNote::class, 'author_user_id', 'user_id');
    }

    /**
     * ملاحظات المشرف الخارجي أو الوزاري المدونة بواسطة المستخدم (واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function supervisorNotes(): HasMany
    {
        return $this->hasMany(SupervisorNote::class, 'author_user_id', 'user_id');
    }

    /**
     * طلبات الاستيفاء التي أصدرها المشرف / المستخدم (واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function issuedCompletionRequests(): HasMany
    {
        return $this->hasMany(CompletionRequest::class, 'issued_by_user_id', 'user_id');
    }

    /**
     * الإشعارات الواردة للمستخدم (واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'recipient_user_id', 'user_id');
    }

    /**
     * طلبات التحليل الذكي للبيانات والمؤشرات التي طلبها المستخدم (واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function requestedAiAnalyses(): HasMany
    {
        return $this->hasMany(AiAnalysis::class, 'requested_by_user_id', 'user_id');
    }

    /**
     * الأدوار النشطة فقط للمستخدم (user_roles.active = true).
     *
     * @return BelongsToMany
     */
    public function activeRoles(): BelongsToMany
    {
        return $this->roles()->wherePivot('active', true);
    }

    /**
     * التحقق مما إذا كان المستخدم يملك دورًا نشطًا محددًا بالاسم.
     *
     * @param string $roleName
     * @return bool
     */
    public function hasRole(string $roleName): bool
    {
        return $this->activeRoles->contains('role_name', $roleName);
    }

    /**
     * استخراج قائمة أكواد الصلاحيات الممنوحة للمستخدم عبر كافة أدواره النشطة.
     *
     * @return array<int, string>
     */
    public function getPermissionCodes(): array
    {
        return $this->activeRoles
            ->loadMissing('permissions')
            ->pluck('permissions')
            ->flatten()
            ->pluck('permission_code')
            ->unique()
            ->values()
            ->all();
    }

    /**
     * التحقق مما إذا كان المستخدم يملك صلاحية محددة بالكود عبر أدواره النشطة.
     *
     * @param string $permissionCode
     * @return bool
     */
    public function hasPermission(string $permissionCode): bool
    {
        return in_array($permissionCode, $this->getPermissionCodes(), true);
    }
}

