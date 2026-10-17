<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * نموذج المرفق / الملف المرفوع (Attachment).
 *
 * يمثل الملفات الرقمية المرفوعة في النظام والمخزنة في مسار آمن خارج مسار التنفيذ العام،
 * مع الاحتفاظ باسم الملف الأصلي ونوعه وحجمه بالبايت.
 *
 * علاقة متعددة الأشكال (Polymorphic Relation):
 * يرتبط هذا النموذج بعدة كيانات عبر حقلي (target_type, target_id) المفهرسين مركبًا:
 * 1. 'evidence_version': يرتبط بنسخة شاهد محددة (EvidenceVersion).
 * 2. 'report': يرتبط بملف تقرير صادر (Report).
 * لا يوجد قيد مفتاح أجنبي مباشر في قاعدة البيانات بل يُفرض ويُدار منطق الربط برمجيًا.
 */
class Attachment extends Model
{
    use HasFactory;

    /**
     * اسم جدول قاعدة البيانات المرتبط بالنموذج.
     *
     * @var string
     */
    protected $table = 'attachments';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'attachment_id';

    /**
     * الحقول القابلة للتعيين الجماعي (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'target_type',
        'target_id',
        'file_name',
        'file_type',
        'file_size',
        'storage_uri',
    ];

    /**
     * تحويل خصائص النموذج إلى أنواع بيانات محددة (Casts).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'target_id' => 'integer',
            'file_size' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * الكيان المستهدف المرتبط بالمرفق (علاقة متعددة الأشكال MorphTo).
     *
     * @return MorphTo
     */
    public function target(): MorphTo
    {
        return $this->morphTo(null, 'target_type', 'target_id');
    }

    /**
     * نسخة الشاهد المرتبطة بالمرفق عندما يكون target_type هو 'evidence_version'.
     *
     * @return BelongsTo
     */
    public function evidenceVersion(): BelongsTo
    {
        return $this->belongsTo(EvidenceVersion::class, 'target_id', 'evidence_version_id');
    }

    /**
     * ملف التقرير المرتبط بالمرفق عندما يكون target_type هو 'report'.
     *
     * @return BelongsTo
     */
    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class, 'target_id', 'report_id');
    }
}
