<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * مورد تحويل الإشعارات إلى صيغة JSON بنمط camelCase.
 */
class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'notificationId'    => $this->notification_id,
            'recipientUserId'   => $this->recipient_user_id,
            'title'             => $this->title,
            'message'           => $this->message,
            'type'              => $this->type,
            'relatedEntityType' => $this->related_entity_type,
            'relatedEntityId'   => $this->related_entity_id,
            'isRead'            => (bool) $this->is_read,
            'readAt'            => $this->read_at?->toIso8601ZuluString(),
            'createdAt'         => $this->created_at?->toIso8601ZuluString(),
        ];
    }
}
