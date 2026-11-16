<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * تنظيف الخطط القديمة المكررة وتفعيل الخطط الأساسية الثلاث
     */
    public function up(): void
    {
        // 1. حذف خطط التجربة الفارغة المحددة (26 و 27)
        DB::table('plan_improvement_areas')->whereIn('plan_id', [26, 27])->delete();
        DB::table('improvement_plans')->whereIn('plan_id', [26, 27])->delete();

        // 2. تفعيل الخطط الأساسية الثلاث لمدرسة الفاروق (23، 24، 25)
        DB::table('improvement_plans')
            ->whereIn('plan_id', [23, 24, 25])
            ->update([
                'status' => 'Active',
                'version_number' => 1,
                'version_tag' => 'خطة أساسية معتمدة',
            ]);

        // 3. مسح أي خطط مكررة فارغة من نفس النوع وضمان وجود خطة نشطة لكل نوع
        $schools = DB::table('improvement_plans')->select('school_id', 'cycle_id', 'plan_type')->distinct()->get();
        foreach ($schools as $item) {
            $plans = DB::table('improvement_plans')
                ->where('school_id', $item->school_id)
                ->where('cycle_id', $item->cycle_id)
                ->where('plan_type', $item->plan_type)
                ->orderByDesc('version_number')
                ->orderBy('plan_id')
                ->get();

            if ($plans->count() > 1) {
                // الخطة التي لديها إجراءات أو الأولى
                $primaryPlanId = null;
                foreach ($plans as $p) {
                    $hasActions = DB::table('improvement_actions')->where('plan_id', $p->plan_id)->exists();
                    if ($hasActions) {
                        $primaryPlanId = $p->plan_id;
                        break;
                    }
                }

                if (!$primaryPlanId) {
                    $primaryPlanId = $plans->first()->plan_id;
                }

                // تفعيل الخطة الأساسية
                DB::table('improvement_plans')
                    ->where('plan_id', $primaryPlanId)
                    ->update(['status' => 'Active']);

                // حذف الخطط الفارغة المكررة الأخرى إذا لم تكن تحوي إجراءات
                foreach ($plans as $p) {
                    if ($p->plan_id !== $primaryPlanId) {
                        $hasActions = DB::table('improvement_actions')->where('plan_id', $p->plan_id)->exists();
                        if (!$hasActions) {
                            DB::table('plan_improvement_areas')->where('plan_id', $p->plan_id)->delete();
                            DB::table('improvement_plans')->where('plan_id', $p->plan_id)->delete();
                        } else {
                            DB::table('improvement_plans')->where('plan_id', $p->plan_id)->update(['status' => 'Archived']);
                        }
                    }
                }
            } else if ($plans->count() === 1) {
                DB::table('improvement_plans')
                    ->where('plan_id', $plans->first()->plan_id)
                    ->where('status', 'Draft')
                    ->update(['status' => 'Active']);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op rollback for data cleanup
    }
};
