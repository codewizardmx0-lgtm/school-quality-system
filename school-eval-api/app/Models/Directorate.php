<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج المديرية التعليمية (Directorate).
 */
class Directorate extends Model
{
    use HasFactory;

    protected $table = 'directorates';
    protected $primaryKey = 'directorate_id';

    protected $fillable = [
        'governorate_id',
        'name_ar',
        'name_en',
        'code',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * المحافظة التابعة لها المديرية.
     */
    public function governorate(): BelongsTo
    {
        return $this->belongsTo(Governorate::class, 'governorate_id', 'governorate_id');
    }

    /**
     * المدارس المسجلة ضمن هذه المديرية.
     */
    public function schools(): HasMany
    {
        return $this->hasMany(School::class, 'directorate_id', 'directorate_id');
    }
}
