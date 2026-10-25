<?php

namespace Database\Seeders;

use App\Models\StandardVersion;
use Illuminate\Database\Seeder;

/**
 * Seeder: StandardVersionSeeder
 * 
 * الوظيفة: تهيئة الإصدار المرجعي المعتمد لمعايير الاعتماد وضمان الجودة المدرسية.
 * الجداول المغذاة: standard_versions
 * مصدر البيانات: دليل معايير الاعتماد المدرسي وسلم التقديرات - رجب 1447هـ / يناير-فبراير 2026م.
 * ترتيب التنفيذ في DatabaseSeeder: الترتيب الأول (1) في حزمة المعايير المرجعية.
 */
class StandardVersionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // إنشاء أو تحديث الإصدار المرجعي الوطني النشط لعام 2026م
        StandardVersion::updateOrCreate(
            ['version_no' => '2026.1'],
            [
                'issue_date'          => '2026-01-01',
                'source_organization' => 'مجلس الاعتماد الأكاديمي وضمان جودة التعليم - وزارة التربية والتعليم والبحث العلمي',
                'source_number'       => 'قرار وزاري رقم (1) لسنة 2026م',
                'source_description'  => 'الإصدار الوطني الأول لمعايير الاعتماد المدرسي وضمان جودة التعليم بالجمهورية اليمنية، الصادر في رجب 1447هـ / 2026م.',
                'status'              => 'Active',
            ]
        );
    }
}
