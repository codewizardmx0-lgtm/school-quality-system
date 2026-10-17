<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج الدور الوظيفي (Role)
 * 
 * يمثل هذا النموذج الأدوار الوظيفية داخل نظام تقويم جودة المدارس (مثل: مدير مدرسة،
 * مقيّم جودة، مشرف وزاري، مسؤول نظام).
 * يحدد الدور مجموعة الصلاحيات الممنوحة للمستخدمين واختصاصاتهم في المنصة (RBAC).
 * 
 * الجدول: roles
 * المفتاح الأساسي: role_id
 * الطوابع الزمنية: غير مفعلة (public $timestamps = false) وفق الملحق أ
 */
class Role extends Model
{
    use HasFactory;

    /**
     * اسم جدول قاعدة البيانات المرتبط بالنموذج.
     *
     * @var string
     */
    protected $table = 'roles';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'role_id';

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
        'role_name',
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
            'role_id' => 'integer',
        ];
    }

    /**
     * الصلاحيات الذرية الممنوحة لهذا الدور (علاقة متعدد إلى متعدد عبر role_permissions).
     *
     * @return BelongsToMany
     */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(
            Permission::class,
            'role_permissions',
            'role_id',
            'permission_id',
            'role_id',
            'permission_id'
        )->withPivot('assigned_at');
    }

    /**
     * المستخدمون المسند إليهم هذا الدور (علاقة متعدد إلى متعدد عبر user_roles).
     *
     * @return BelongsToMany
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'user_roles',
            'role_id',
            'user_id',
            'role_id',
            'user_id'
        )->withPivot('assigned_at', 'revoked_at', 'active');
    }

    /**
     * سجلات الربط المباشرة مع جدول أدوار المستخدمين (واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function userRoles(): HasMany
    {
        return $this->hasMany(UserRole::class, 'role_id', 'role_id');
    }

    /**
     * سجلات الربط المباشرة مع جدول صلاحيات الأدوار (واحد إلى متعدد).
     *
     * @return HasMany
     */
    public function rolePermissions(): HasMany
    {
        return $this->hasMany(RolePermission::class, 'role_id', 'role_id');
    }
}
