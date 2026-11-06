<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * نموذج المحافظة الجغرافية (Governorate).
 */
class Governorate extends Model
{
    use HasFactory;

    protected $table = 'governorates';
    protected $primaryKey = 'governorate_id';

    protected $fillable = [
        'name_ar',
        'name_en',
        'code',
    ];

    /**
     * المديريات التعليمية التابعة للمحافظة.
     */
    public function directorates(): HasMany
    {
        return $this->hasMany(Directorate::class, 'governorate_id', 'governorate_id');
    }

    /**
     * المدارس الواقعة ضمن نطاق المحافظة.
     */
    public function schools(): HasMany
    {
        return $this->hasMany(School::class, 'governorate_id', 'governorate_id');
    }
}
