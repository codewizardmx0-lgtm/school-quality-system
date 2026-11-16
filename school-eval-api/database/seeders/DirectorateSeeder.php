<?php

namespace Database\Seeders;

use App\Models\Directorate;
use Illuminate\Database\Seeder;

class DirectorateSeeder extends Seeder
{
    /**
     * بذر مديريات أمانة العاصمة العشر كاملة ومديريات تعز.
     */
    public function run(): void
    {
        $directorates = [
            // أمانة العاصمة (governorate_id = 1) - المديريات العشر كاملة
            ['directorate_id' => 1,  'governorate_id' => 1, 'name_ar' => 'مديرية التحرير',       'name_en' => 'At Tahrir',        'code' => 'TAHR', 'is_active' => true],
            ['directorate_id' => 2,  'governorate_id' => 1, 'name_ar' => 'مديرية الصافية',       'name_en' => 'As Safiyah',       'code' => 'SAFI', 'is_active' => true],
            ['directorate_id' => 3,  'governorate_id' => 1, 'name_ar' => 'مديرية الوحدة',         'name_en' => 'Al Wahdah',        'code' => 'WAHD', 'is_active' => true],
            ['directorate_id' => 4,  'governorate_id' => 1, 'name_ar' => 'مديرية معين',          'name_en' => 'Ma\'in',           'code' => 'MAIN', 'is_active' => true],
            ['directorate_id' => 5,  'governorate_id' => 1, 'name_ar' => 'مديرية السبعين',       'name_en' => 'As Sab\'in',       'code' => 'SABN', 'is_active' => true],
            ['directorate_id' => 6,  'governorate_id' => 1, 'name_ar' => 'مديرية الثورة',        'name_en' => 'Ath Thawrah',      'code' => 'THAW', 'is_active' => true],
            ['directorate_id' => 7,  'governorate_id' => 1, 'name_ar' => 'مديرية شعوب',          'name_en' => 'Shu\'ub',          'code' => 'SHUB', 'is_active' => true],
            ['directorate_id' => 8,  'governorate_id' => 1, 'name_ar' => 'مديرية آزال',          'name_en' => 'Azal',             'code' => 'AZAL', 'is_active' => true],
            ['directorate_id' => 9,  'governorate_id' => 1, 'name_ar' => 'مديرية صنعاء القديمة', 'name_en' => 'Old City of Sana\'a', 'code' => 'OLDS', 'is_active' => true],
            ['directorate_id' => 10, 'governorate_id' => 1, 'name_ar' => 'مديرية بني الحارث',   'name_en' => 'Bani Al Harith',   'code' => 'HART', 'is_active' => true],

            // محافظة تعز (governorate_id = 3)
            ['directorate_id' => 11, 'governorate_id' => 3, 'name_ar' => 'مديرية المظفر',        'name_en' => 'Al Mudhaffar',     'code' => 'MUDH', 'is_active' => true],
            ['directorate_id' => 12, 'governorate_id' => 3, 'name_ar' => 'مديرية القاهرة',       'name_en' => 'Al Qahirah',       'code' => 'QAHI', 'is_active' => true],
            ['directorate_id' => 13, 'governorate_id' => 3, 'name_ar' => 'مديرية صالة',         'name_en' => 'Salh',             'code' => 'SALH', 'is_active' => true],
        ];

        foreach ($directorates as $d) {
            Directorate::updateOrCreate(['directorate_id' => $d['directorate_id']], $d);
        }
    }
}
