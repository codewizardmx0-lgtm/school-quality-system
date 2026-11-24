<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * تغذية الأوزان الرسمية للمعايير الفرعية الـ 14 من وثيقة المعايير الوطنية.
     */
    public function up(): void
    {
        $weights = [
            'SUB-1-1' => 5.0,
            'SUB-1-2' => 10.0,
            'SUB-2-1' => 14.0,
            'SUB-2-2' => 6.0,
            'SUB-3-1' => 15.0,
            'SUB-4-1' => 5.0,
            'SUB-4-2' => 5.0,
            'SUB-4-3' => 5.0,
            'SUB-4-4' => 5.0,
            'SUB-5-1' => 10.0,
            'SUB-5-2' => 5.0,
            'SUB-6-1' => 5.0,
            'SUB-7-1' => 5.0,
            'SUB-7-2' => 5.0,
        ];

        foreach ($weights as $code => $weight) {
            DB::table('sub_standards')->where('code', $code)->update(['weight' => $weight]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('sub_standards')->update(['weight' => null]);
    }
};
