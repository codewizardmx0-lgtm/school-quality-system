<?php

namespace Database\Seeders;

use App\Models\CycleParticipation;
use App\Models\EvaluationCycle;
use App\Models\School;
use Illuminate\Database\Seeder;

/**
 * Seeder: CycleParticipationSeeder
 * 
 * الوظيفة: تسجيل مشاركة المدارس في الدورة التقييمية النشطة للعام الدراسي 2025/2026م.
 * الجداول المغذاة: cycle_participations
 * 
 * التحديثات والإضافات:
 *  - الحفاظ على تسجيل مشاركة المدرسة الأولى (مدرسة بلقيس الثانوية للبنات).
 *  - إضافة تسجيل مشاركة المدرسة الثانية (مدرسة الفاروق الأساسية للبنين) في نفس دورة التقييم النشطة،
 *    بهدف تمكين التقييم المقارن والمتعدد عبر المدارس المسجلة.
 *  - استخدام firstOrCreate لضمان عدم التكرار عند إعادة التشغيل.
 * 
 * ترتيب التنفيذ في DatabaseSeeder: الترتيب الثامن عشر (18).
 */
class CycleParticipationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $cycle = EvaluationCycle::where('academic_year', '2025/2026')->first();

        if (!$cycle) {
            return;
        }

        // تسجيل مشاركة المدارس الفعالة ضمن النطاق الجغرافي للدورة التقييمية
        $schoolsQuery = School::where('status', 'Active');
        if (!empty($cycle->scope_governorate)) {
            $schoolsQuery->where('governorate', $cycle->scope_governorate);
        }
        $schools = $schoolsQuery->get();

        foreach ($schools as $school) {
            CycleParticipation::firstOrCreate(
                [
                    'cycle_id'  => $cycle->cycle_id,
                    'school_id' => $school->school_id,
                ]
            );
        }
    }
}
