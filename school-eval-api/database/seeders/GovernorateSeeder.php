<?php

namespace Database\Seeders;

use App\Models\Governorate;
use Illuminate\Database\Seeder;

class GovernorateSeeder extends Seeder
{
    /**
     * بذر محافظات الجمهورية اليمنية الـ 22 كاملة.
     */
    public function run(): void
    {
        $governorates = [
            ['governorate_id' => 1,  'name_ar' => 'أمانة العاصمة',   'name_en' => "Sana'a City",    'code' => 'AMANA'],
            ['governorate_id' => 2,  'name_ar' => 'محافظة صنعاء',    'name_en' => "Sana'a",         'code' => 'SANA'],
            ['governorate_id' => 3,  'name_ar' => 'محافظة تعز',      'name_en' => 'Taiz',           'code' => 'TAIZ'],
            ['governorate_id' => 4,  'name_ar' => 'محافظة عدن',      'name_en' => 'Aden',           'code' => 'ADEN'],
            ['governorate_id' => 5,  'name_ar' => 'محافظة الحديدة',  'name_en' => 'Al Hudaydah',    'code' => 'HOD'],
            ['governorate_id' => 6,  'name_ar' => 'محافظة إب',       'name_en' => 'Ibb',            'code' => 'IBB'],
            ['governorate_id' => 7,  'name_ar' => 'محافظة ذمار',     'name_en' => 'Dhamar',         'code' => 'DHAM'],
            ['governorate_id' => 8,  'name_ar' => 'محافظة حضرموت',   'name_en' => 'Hadhramaut',     'code' => 'HDM'],
            ['governorate_id' => 9,  'name_ar' => 'محافظة حجة',      'name_en' => 'Hajjah',         'code' => 'HAJJ'],
            ['governorate_id' => 10, 'name_ar' => 'محافظة صعدة',     'name_en' => "Sa'dah",         'code' => 'SAAD'],
            ['governorate_id' => 11, 'name_ar' => 'محافظة عمران',    'name_en' => 'Amran',          'code' => 'AMR'],
            ['governorate_id' => 12, 'name_ar' => 'محافظة لحج',      'name_en' => 'Lahij',          'code' => 'LAHJ'],
            ['governorate_id' => 13, 'name_ar' => 'محافظة أبين',      'name_en' => 'Abyan',          'code' => 'ABY'],
            ['governorate_id' => 14, 'name_ar' => 'محافظة البيضاء',  'name_en' => 'Al Bayda',       'code' => 'BAYD'],
            ['governorate_id' => 15, 'name_ar' => 'محافظة شبوة',     'name_en' => 'Shabwah',        'code' => 'SHAB'],
            ['governorate_id' => 16, 'name_ar' => 'محافظة مأرب',     'name_en' => "Ma'rib",         'code' => 'MAR'],
            ['governorate_id' => 17, 'name_ar' => 'محافظة الجوف',    'name_en' => 'Al Jawf',        'code' => 'JAW'],
            ['governorate_id' => 18, 'name_ar' => 'محافظة المهرة',   'name_en' => 'Al Mahrah',      'code' => 'MAH'],
            ['governorate_id' => 19, 'name_ar' => 'محافظة المحويت',  'name_en' => 'Al Mahwit',      'code' => 'MAHW'],
            ['governorate_id' => 20, 'name_ar' => 'محافظة ريمة',     'name_en' => 'Raymah',         'code' => 'RAYM'],
            ['governorate_id' => 21, 'name_ar' => 'محافظة الضالع',   'name_en' => 'Al Dali',        'code' => 'DHAL'],
            ['governorate_id' => 22, 'name_ar' => 'محافظة سقطرى',    'name_en' => 'Socotra',        'code' => 'SOQ'],
        ];

        foreach ($governorates as $g) {
            Governorate::updateOrCreate(['governorate_id' => $g['governorate_id']], $g);
        }
    }
}
