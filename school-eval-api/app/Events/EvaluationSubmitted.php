<?php

namespace App\Events;

use App\Models\Evaluation;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * حدث تقديم وإغلاق التقييم الذاتي المدرسي (EvaluationSubmitted).
 *
 * يُطلق هذا الحدث عند اكتمال رصد كافة درجات المؤشرات واستيفاء الشواهد
 * وتحويل حالة ملف التقييم إلى Completed وقفل العمليات التعديلية (BR-SCH-03).
 */
class EvaluationSubmitted
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * ملف التقييم المكتمل.
     *
     * @var Evaluation
     */
    public Evaluation $evaluation;

    /**
     * المستخدم الذي نفّذ عملية الإغلاق والتقديم.
     *
     * @var User|null
     */
    public ?User $user;

    /**
     * إنشاء نسخة جديدة من الحدث.
     *
     * @param Evaluation $evaluation
     * @param User|null $user
     */
    public function __construct(Evaluation $evaluation, ?User $user = null)
    {
        $this->evaluation = $evaluation;
        $this->user = $user;
    }
}
