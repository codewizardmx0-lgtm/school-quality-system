<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج الصلاحية الذرية (Permission)
 * 
 * يمثل هذا النموذج الصلاحيات الدقيقة والذرية المحددة في النظام (مثل: evaluations.create, reports.view).
 * تُسند هذه الصلاحيات للأدوار الوظيفية عبر جدول الوسيط role_permissions للتحكم في عمليات المنصة (RBAC).
 * 
 * الجدول: permissions
 * المفتاح الأساسي: permission_id
 * الطوابع الزمنية: غير مفعلة (public $timestamps = false) وفق الملحق أ
 */
class Permission extends Model
{
    use HasFactory;

    /**
     * اسم جدول قاعدة البيانات المرتبط بالنموذج.
     *
     * @var string
     */
    protected $table = 'permissions';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'permission_id';

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
        'permission_code',
        'permission_name',
        'description',
    ];

    /**
     * تحويلات السمات (Attribute Casting).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'permission_id' => 'integer',
        ];
    }

    /**
     * الأدوار الوظيفية التي تمتلك هذه الصلاحية (علاقة متعدد إلى متعدد عبر role_permissions).
     *
     * @return BelongsToMany
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(
            Role::class,
            'role_permissions',
            'permission_id',
            'role_id',
            'permission_id',
            'role_id'
        )->withPivot('assigned_at');
    }

    /**
     * سجلات الربط المباشرة مع جدول صلاحيات الأدوار (واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function rolePermissions(): HasMany
    {
        return $this->hasMany(RolePermission::class, 'permission_id', 'permission_id');
    }
}
