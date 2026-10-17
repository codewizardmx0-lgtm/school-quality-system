<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * نموذج الجلسة الوظيفية (Session)
 * 
 * يمثل هذا النموذج سجل تتبع الجلسات التشغيلية للمستخدمين وأوقات الدخول والخروج وفترات النشاط
 * وفق المتطلب الوظيفي (FR-GEN-02).
 * 
 * ملاحظة معمارية هامة:
 * هذا الكيان مخصص لسجل الأعمال (Business Session Log) لمراقبة الأمان والتدقيق الزمني،
 * وليس جدول الجلسات الافتراضي الخاص بإطار عمل Laravel لإدارة حالة HTTP.
 * 
 * الجدول: sessions
 * المفتاح الأساسي: session_id
 * الطوابع الزمنية: مفعلة افتراضيًا (created_at, updated_at)
 */
class Session extends Model
{
    use HasFactory;

    /**
     * اسم جدول قاعدة البيانات المرتبط بالنموذج.
     *
     * @var string
     */
    protected $table = 'sessions';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'session_id';

    /**
     * الحقول القابلة للإسناد الجماعي.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'session_token',
        'started_at',
        'ended_at',
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
            'session_id' => 'integer',
            'user_id' => 'integer',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'active' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * المستخدم صاحب الجلسة (علاقة ينتمي إلى).
     *
     * @return BelongsTo
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
}
