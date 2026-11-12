<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج نسخة المستند (DocumentVersion).
 *
 * يمثل الملف الفيزيائي الفعلي المرفوع للمستند المدرسي مع تتبع رقم الإصدار
 * المتسلسل والحجم ونوع MIME والمسار الفيزيائي الآمن.
 */
class DocumentVersion extends Model
{
    use HasFactory;

    /**
     * اسم الجدول في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'document_versions';

    /**
     * المفتاح الأساسي للجدول.
     *
     * @var string
     */
    protected $primaryKey = 'id';

    /**
     * الحقول القابلة للتعيين الجماعي.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'school_id',
        'school_document_id',
        'version_no',
        'is_current',
        'file_name',
        'storage_uri',
        'file_size',
        'mime_type',
        'notes',
    ];

    /**
     * تحويل خصائص النموذج إلى أنواع بيانات محددة.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'school_id'          => 'integer',
            'school_document_id' => 'integer',
            'version_no'         => 'integer',
            'is_current'         => 'boolean',
            'file_size'          => 'integer',
            'created_at'         => 'datetime',
            'updated_at'         => 'datetime',
        ];
    }

    /**
     * المستند المدرسي الأب الذي تتبعه هذه النسخة.
     *
     * @return BelongsTo
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(SchoolDocument::class, 'school_document_id', 'id');
    }

    /**
     * المدرسة المالكة للنسخة (عزل مؤسسي).
     *
     * @return BelongsTo
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class, 'school_id', 'school_id');
    }

    /**
     * روابط الشواهد التقييمية التي تستخدم هذه النسخة كدليل إثبات للمؤشرات.
     *
     * @return HasMany
     */
    public function evidenceLinks(): HasMany
    {
        return $this->hasMany(EvidenceLink::class, 'document_version_id', 'id');
    }
}
