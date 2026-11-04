<?php

namespace App\Services;

use App\Models\Evaluation;
use App\Models\EvaluationCycle;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * خدمة إدارة وبث الإشعارات النظامية (In-App Notification Service).
 *
 * تتولى توثيق وبث التنبيهات في سجل الإشعارات الدائم (FR-GEN-05) لجميع الفاعلين
 * عند وقوع الأحداث المحورية: إطلاق الدورات، بدء التقييمات، تسليم التقييمات، وتدوين الملاحظات.
 */
class NotificationService
{
    /**
     * إرسال إشعار لمستخدم فردي.
     */
    public function send(
        int $recipientUserId,
        string $title,
        string $message,
        string $type,
        string $relatedEntityType,
        int $relatedEntityId
    ): Notification {
        return Notification::create([
            'recipient_user_id'   => $recipientUserId,
            'title'               => $title,
            'message'             => $message,
            'type'                => $type,
            'related_entity_type' => $relatedEntityType,
            'related_entity_id'   => $relatedEntityId,
            'is_read'             => false,
            'created_at'          => now(),
        ]);
    }

    /**
     * إرسال إشعار لمجموعة من المستخدمين.
     */
    public function sendBulk(
        array|Collection $recipientUserIds,
        string $title,
        string $message,
        string $type,
        string $relatedEntityType,
        int $relatedEntityId
    ): void {
        $now = now();
        $records = [];

        foreach ($recipientUserIds as $userId) {
            $records[] = [
                'recipient_user_id'   => $userId,
                'title'               => $title,
                'message'             => $message,
                'type'                => $type,
                'related_entity_type' => $relatedEntityType,
                'related_entity_id'   => $relatedEntityId,
                'is_read'             => false,
                'created_at'          => $now,
            ];
        }

        if (!empty($records)) {
            Notification::insert($records);
        }
    }

    /**
     * إشعار مديري ومقيمي المدارس المشاركة عند إطلاق دورة تقييمية جديدة.
     */
    public function notifyCycleLaunched(EvaluationCycle $cycle): void
    {
        $schoolIds = $cycle->participations()->pluck('school_id')->toArray();
        if (empty($schoolIds)) {
            return;
        }

        $userIds = User::whereIn('school_id', $schoolIds)
            ->where('status', 'Active')
            ->whereHas('roles', function ($q) {
                $q->whereIn('role_name', ['school_principal', 'school_evaluator']);
            })
            ->pluck('user_id')
            ->unique()
            ->toArray();

        $cycleName = $cycle->name ?? "الدورة التقييمية {$cycle->academic_year}";
        $title = 'إطلاق دورة تقييمية جديدة';
        $message = "تم إطلاق دورة التقييم المركزية «{$cycleName}» للعام الدراسي {$cycle->academic_year}. يمكن الآن للمدارس المشاركة بدء ملفات التقييم الذاتي.";

        $this->sendBulk($userIds, $title, $message, 'cycle_launched', 'evaluation_cycle', $cycle->cycle_id);
    }

    /**
     * إشعار مدير المدرسة والمشرفين الوزاريين عند بدء المقيّم لملف تقييم ذاتي جديد.
     */
    public function notifyEvaluationInitiated(Evaluation $evaluation, User $evaluator): void
    {
        $school = $evaluation->school;
        $cycle = $evaluation->cycle;
        $cycleName = $cycle?->name ?? "الدورة {$cycle?->academic_year}";
        $schoolName = $school?->school_name ?? 'المدرسة';

        // 1. إشعار مدير المدرسة
        $principals = User::where('school_id', $evaluation->school_id)
            ->where('status', 'Active')
            ->where('user_id', '!=', $evaluator->user_id)
            ->whereHas('roles', fn ($q) => $q->where('role_name', 'school_principal'))
            ->pluck('user_id')
            ->toArray();

        $principalTitle = 'بدء ملف تقييم ذاتي جديد';
        $principalMsg = "قام المقيّم {$evaluator->full_name} ببدء ملف التقييم الذاتي لمدرسة «{$schoolName}» ضمن دورة {$cycleName}.";
        $this->sendBulk($principals, $principalTitle, $principalMsg, 'evaluation_initiated', 'evaluation', $evaluation->evaluation_id);

        // 2. إشعار المشرفين الوزاريين
        $supervisors = User::where('status', 'Active')
            ->whereHas('roles', fn ($q) => $q->where('role_name', 'ministry_supervisor'))
            ->pluck('user_id')
            ->toArray();

        $supervisorTitle = 'بدء تقييم ذاتي لمدرسة';
        $supervisorMsg = "بدأت مدرسة «{$schoolName}» العمل على ملف التقييم الذاتي ضمن دورة {$cycleName}.";
        $this->sendBulk($supervisors, $supervisorTitle, $supervisorMsg, 'evaluation_initiated', 'evaluation', $evaluation->evaluation_id);
    }

    /**
     * إشعار المشرفين الوزاريين ومدير المدرسة عند تقديم التقييم الذاتي المكتمل.
     */
    public function notifyEvaluationSubmitted(Evaluation $evaluation, ?User $evaluator = null): void
    {
        $school = $evaluation->school;
        $cycle = $evaluation->cycle;
        $schoolName = $school?->school_name ?? 'المدرسة';
        $cycleName = $cycle?->name ?? "الدورة {$cycle?->academic_year}";

        // إشعار المشرفين الوزاريين
        $supervisors = User::where('status', 'Active')
            ->whereHas('roles', fn ($q) => $q->where('role_name', 'ministry_supervisor'))
            ->pluck('user_id')
            ->toArray();

        $title = 'تقديم التقييم الذاتي للمدرسة';
        $msg = "أكملت مدرسة «{$schoolName}» متطلبات التقييم الذاتي وقامت برفعه للمراجعة الإشرافية ضمن دورة {$cycleName}.";
        $this->sendBulk($supervisors, $title, $msg, 'evaluation_submitted', 'evaluation', $evaluation->evaluation_id);

        // إشعار مدير المدرسة إذا لم يكن هو من سلّم
        if ($evaluator) {
            $principals = User::where('school_id', $evaluation->school_id)
                ->where('status', 'Active')
                ->where('user_id', '!=', $evaluator->user_id)
                ->whereHas('roles', fn ($q) => $q->where('role_name', 'school_principal'))
                ->pluck('user_id')
                ->toArray();

            $pMsg = "تم إكمال ورفع ملف التقييم الذاتي للمدرسة بنجاح إلى الإشراف الوزاري بواسطة {$evaluator->full_name}.";
            $this->sendBulk($principals, $title, $pMsg, 'evaluation_submitted', 'evaluation', $evaluation->evaluation_id);
        }
    }
}
