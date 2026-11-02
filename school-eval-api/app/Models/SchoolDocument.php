<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * نموذج المستند المدرسي (SchoolDocument).
 *
 * يمثل الوعاء الوثائقي للمستند على مستوى المدرسة، ويحتوي على عنوان المستند
 * وتصنيفه والوصف وهوية منشئه. يمتلك المستند نسخاً وملفات فيزيائية متعددة
 * عبر علاقة DocumentVersion.
 */
class SchoolDocument extends Model
{
    use HasFactory;

    /**
     * اسم الجدول في قاعدة البيانات.
     *
     * @var string
     */
    protected $table = 'school_documents';

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
        'title',
        'document_type',
        'description',
        'created_by_user_id',
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
            'created_by_user_id' => 'integer',
            'created_at'         => 'datetime',
            'updated_at'         => 'datetime',
        ];
    }

    /**
     * المدرسة المالكة لهذا المستند (العزل المؤسسي).
     *
     * @return BelongsTo
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class, 'school_id', 'school_id');
    }

    /**
     * المستخدم الذي أنشأ المستند.
     *
     * @return BelongsTo
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id', 'user_id');
    }

    /**
     * جميع النسخ والملفات التاريخية المرفوعة لهذا المستند.
     *
     * @return HasMany
     */
    public function versions(): HasMany
    {
        return $this->hasMany(DocumentVersion::class, 'school_document_id', 'id');
    }

    /**
     * النسخة الحالية الفعالة للمستند (is_current = true).
     *
     * @return HasOne
     */
    public function currentVersion(): HasOne
    {
        return $this->hasOne(DocumentVersion::class, 'school_document_id', 'id')
            ->where('is_current', true);
    }

    /**
     * روابط الشواهد التقييمية المرتبطة بنسخ هذا المستند عبر التقييمات.
     *
     * @return HasManyThrough
     */
    public function evidenceLinks(): HasManyThrough
    {
        return $this->hasManyThrough(
            EvidenceLink::class,
            DocumentVersion::class,
            'school_document_id', // المفتاح الأجنبي على جدول document_versions
            'document_version_id', // المفتاح الأجنبي على جدول evidence_links
            'id',                  // المفتاح المحلي على جدول school_documents
            'id'                   // المفتاح المحلي على جدول document_versions
        );
    }
}
