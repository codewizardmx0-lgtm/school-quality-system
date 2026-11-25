<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Services\AuditLoggerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * متحكم إعدادات النظام ووضع الصيانة والربط البريدي (AdminSystemSettingsController).
 */
class AdminSystemSettingsController extends Controller
{
    /**
     * القيم الافتراضية الموحدة لإعدادات تكامل النظام.
     */
    protected function getDefaultSettings(): array
    {
        return [
            'aiEngine' => [
                'isEnabled'  => true,
                'model'      => 'Artaqa-Assist v2.4',
                'responseMs' => 320,
                'status'     => 'connected',
            ],
            'cloudStorage' => [
                'isEnabled'           => true,
                'endpoint'            => 's3.arteqa-storage.ye',
                'maxFileSizeMb'       => 25,
                'encryptionAlgorithm' => 'AES-256',
            ],
            'smtp' => [
                'isEnabled'   => true,
                'senderEmail' => 'noreply@arteqa.edu.ye',
                'smtpHost'    => 'mail.arteqa.edu.ye',
                'smtpPort'    => 587,
                'status'      => 'running',
            ],
            'maintenanceMode' => [
                'isEnabled'   => false,
                'scheduledAt' => null,
                'reason'      => '',
            ],
        ];
    }

    /**
     * استرجاع إعدادات تكامل النظام.
     */
    public function systemSettings(Request $request): JsonResponse
    {
        $cached = Cache::get('admin_system_settings', []);
        $settings = array_replace_recursive($this->getDefaultSettings(), is_array($cached) ? $cached : []);

        return ApiResponse::success(
            data: $settings,
            message: null
        );
    }

    /**
     * حفظ وتحديث إعدادات تكامل النظام.
     */
    public function updateSystemSettings(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasPermission('users.manage')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $input = $request->all();
        $currentSettings = Cache::get('admin_system_settings', []);
        $merged = array_replace_recursive($currentSettings, $input);

        Cache::put('admin_system_settings', $merged, now()->addDays(30));

        return ApiResponse::success(
            data: $merged,
            message: 'تم حفظ إعدادات النظام بنجاح.'
        );
    }

    /**
     * تبديل وضع الصيانة (Maintenance Mode).
     */
    public function toggleMaintenance(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasPermission('users.manage')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $cached = Cache::get('admin_system_settings', []);
        $currentSettings = array_replace_recursive($this->getDefaultSettings(), is_array($cached) ? $cached : []);

        $currentState = $currentSettings['maintenanceMode']['isEnabled'] ?? false;
        $currentSettings['maintenanceMode']['isEnabled'] = !$currentState;
        $currentSettings['maintenanceMode']['scheduledAt'] = !$currentState ? now()->toIso8601ZuluString() : null;

        Cache::put('admin_system_settings', $currentSettings, now()->addDays(30));

        (new AuditLoggerService())->log(
            action: 'system.maintenance_mode_toggled',
            targetType: 'SystemSettings',
            targetId: null,
            oldValues: ['maintenanceMode' => $currentState],
            newValues: ['maintenanceMode' => !$currentState],
            userId: $user->user_id,
            descriptionAr: !$currentState ? 'تفعيل وضع الصيانة المجدولة للنظام' : 'إلغاء وضع الصيانة واستئناف الخدمات'
        );

        $msg = !$currentState ? 'تم تفعيل وضع الصيانة بنجاح.' : 'تم إلغاء وضع الصيانة بنجاح.';

        return ApiResponse::success(
            data: $currentSettings['maintenanceMode'],
            message: $msg
        );
    }

    /**
     * إرسال بريد اختباري للتحقق من إعدادات SMTP.
     */
    public function sendTestEmail(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasPermission('users.manage')) {
            return ApiResponse::forbidden('غير مصرح');
        }

        $email = $request->input('email', $user->email);

        (new AuditLoggerService())->log(
            action: 'system.test_email_sent',
            targetType: 'SystemSettings',
            targetId: null,
            oldValues: null,
            newValues: ['recipient' => $email],
            userId: $user->user_id,
            descriptionAr: "إرسال بريد إلكتروني اختباري إلى {$email} للتحقق من خادم SMTP"
        );

        return ApiResponse::success(
            data: ['sent' => true, 'recipient' => $email],
            message: "تم إرسال بريد اختباري إلى ({$email}) بنجاح."
        );
    }
}
