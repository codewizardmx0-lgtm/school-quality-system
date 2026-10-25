<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * نموذج إسناد الأدوار للمستخدمين (UserRole)
 * 
 * يمثل هذا الكيان الوسيط (Pivot / Model) جدول الربط user_roles الذي يحدد الأدوار الممنوحة
 * لكل مستخدم مع سجل تاريخ الإسناد وتاريخ الإلغاء وحالة التفعيل (active).
 * 
 * الجدول: user_roles
 * المفتاح الأساسي المركب: ['user_id', 'role_id']
 * التزايد التلقائي: غير مفعل (public $incrementing = false)
 * الطوابع الزمنية: غير مفعلة (public $timestamps = false) وفق الملحق أ
 */
class UserRole extends Pivot
{
    /**
     * اسم جدول قاعدة البيانات المرتبط بالنموذج.
     *
     * @var string
     */
    protected $table = 'user_roles';

    /**
     * المفتاح الأساسي المركب للجدول.
     *
     * @var array<int, string>
     */
    protected $primaryKey = ['user_id', 'role_id'];

    /**
     * تعطيل خاصية التزايد التلقائي للمفتاح المركب.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * تعطيل الطوابع الزمنية الافتراضية (created_at / updated_at) وفق الملحق أ.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * الحقول القابلة للإسناد الجماعي.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'role_id',
        'assigned_at',
        'revoked_at',
        'active',
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
            'role_id' => 'integer',
            'assigned_at' => 'datetime',
            'revoked_at' => 'datetime',
            'active' => 'boolean',
        ];
    }

    /**
     * المستخدم المسند إليه الدور (علاقة ينتمي إلى).
     *
     * @return BelongsTo
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    /**
     * الدور الوظيفي المسند للمستخدم (علاقة ينتمي إلى).
     *
     * @return BelongsTo
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id', 'role_id');
    }
}
