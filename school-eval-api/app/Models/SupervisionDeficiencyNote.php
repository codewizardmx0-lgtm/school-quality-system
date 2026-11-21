<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Model: SupervisionDeficiencyNote
 * سجل رصد النواقص وتصنيف العجز للمؤشرات الإشرافية الميدانية (FR-SUP-04)
 */
class SupervisionDeficiencyNote extends Model
{
    use HasFactory;

    protected $table = 'supervision_deficiency_notes';

    protected $fillable = [
        'evaluation_id',
        'submission_id',
        'indicator_id',
        'deficiency_category',
        'supervisor_note',
        'directives',
        'created_by',
    ];

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class, 'evaluation_id', 'evaluation_id');
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(EvaluationSubmission::class, 'submission_id', 'submission_id');
    }

    public function indicator(): BelongsTo
    {
        return $this->belongsTo(Indicator::class, 'indicator_id', 'indicator_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'user_id');
    }
}
