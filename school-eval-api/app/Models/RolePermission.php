<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * نموذج الربط بين الأدوار والصلاحيات (RolePermission)
 * 
 * يمثل هذا الكيان الوسيط (Pivot / Model) جدول الربط role_permissions الذي يمنح الصلاحيات الذرية
 * للأدوار الوظيفية داخل النظام، مع تسجيل تاريخ الإسناد assigned_at.
 * 
 * الجدول: role_permissions
 * المفتاح الأساسي المركب: ['role_id', 'permission_id']
 * التزايد التلقائي: غير مفعل (public $incrementing = false)
 * الطوابع الزمنية: غير مفعلة (public $timestamps = false) وفق الملحق أ
 */
class RolePermission extends Pivot
{
    /**
     * اسم جدول قاعدة البيانات المرتبط بالنموذج.
     *
     * @var string
     */
    protected $table = 'role_permissions';

    /**
     * المفتاح الأساسي المركب للجدول.
     *
     * @var array<int, string>
     */
    protected $primaryKey = ['role_id', 'permission_id'];

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
        'role_id',
        'permission_id',
        'assigned_at',
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
            'permission_id' => 'integer',
            'assigned_at' => 'datetime',
        ];
    }

    /**
     * الدور المرتبط بسجل الصلاحية (علاقة ينتمي إلى).
     *
     * @return BelongsTo
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id', 'role_id');
    }

    /**
     * الصلاحية المرتبطة بهذا الدور (علاقة ينتمي إلى).
     *
     * @return BelongsTo
     */
    public function permission(): BelongsTo
    {
        return $this->belongsTo(Permission::class, 'permission_id', 'permission_id');
    }
}
