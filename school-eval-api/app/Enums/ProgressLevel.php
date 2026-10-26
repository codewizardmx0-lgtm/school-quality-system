<?php

namespace App\Enums;

/**
 * مستويات التقدم لإجراءات خطة التحسين وفق متطلبات الشريحة الثالثة.
 *
 * قائمة مغلقة بالأكواد اللاتينية (لضمان توافق قاعدة البيانات وحيادية الحقول)،
 * مع توفير التسميات العربية المقابلة لها لعرضها في واجهات النظام والـ API.
 */
enum ProgressLevel: string
{
    case NotStarted  = 'NotStarted';
    case Limited     = 'Limited';
    case Moderate    = 'Moderate';
    case Significant = 'Significant';
    case Complete    = 'Complete';

    /**
     * التسمية العربية لمستوى التقدم.
     */
    public function label(): string
    {
        return match ($this) {
            self::NotStarted  => 'لم يبدأ',
            self::Limited     => 'تقدم محدود',
            self::Moderate    => 'تقدم متوسط',
            self::Significant => 'تقدم ملحوظ',
            self::Complete    => 'مكتمل',
        };
    }

    /**
     * إرجاع مصفوفة بجميع القيم الصالحة.
     *
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
