<?php

namespace App\Services;

use App\Http\Resources\SchoolResource;
use App\Models\EvaluationCycle;
use App\Models\School;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Facades\View;
use Mpdf\Config\ConfigVariables;
use Mpdf\Config\FontVariables;
use Mpdf\Mpdf;

/**
 * خدمة توليد التقرير التنفيذي الرسمي الشامل لمنصة ارتقاء للتقييم الذاتي والتحسين المدرسي بتنسيق PDF عبر محرك mPDF.
 */
class AdminExecutiveReportService
{
    /**
     * توليد محتوى PDF للتقرير التنفيذي الشامل.
     *
     * @return string الثنائي المشفر لملف الـ PDF
     */
    public function generateExecutivePdf(): string
    {
        // 1. جمع الإحصائيات العامة
        $totalSchools = School::count();
        $govSchools = School::where('school_type', 'government')->count();
        $pvtSchools = School::where('school_type', 'private')->count();

        $totalUsers = User::count();
        $activeUsers = User::where('status', 'Active')->count();

        // حساب المدارس الجاهزة: مدرسة بها مدير ومقيم مسندان معاً
        $readySchools = School::whereHas('users', fn ($q) => $q->whereHas('roles', fn ($r) => $r->where('roles.role_name', 'school_principal')))
            ->whereHas('users', fn ($q) => $q->whereHas('roles', fn ($r) => $r->where('roles.role_name', 'school_evaluator')))
            ->count();

        $readinessRate = $totalSchools > 0 ? round(($readySchools / $totalSchools) * 100, 1) : 0.0;

        // 2. جمع بيانات المديريات وتعداد المدارس الفعلي لكل منها من قاعدة البيانات
        $directorates = \App\Models\Directorate::with('governorate')
            ->where('is_active', true)
            ->get()
            ->map(function ($dir) {
                $name = $dir->name_ar;
                $shortName = str_replace('مديرية ', '', $name);

                $count = School::where(function ($q) use ($dir, $name, $shortName) {
                    $q->where('directorate_id', $dir->directorate_id)
                      ->orWhere('educational_district', $name)
                      ->orWhere('educational_district', $shortName);
                })->count();

                return [
                    'directorateId'   => $dir->directorate_id,
                    'directorateName' => $dir->name_ar,
                    'governorate'     => $dir->governorate?->name_ar ?? 'أمانة العاصمة',
                    'schoolCount'     => $count,
                ];
            })->toArray();

        // 3. جمع بيانات المدارس والكوادر المسندة
        $dummyRequest = Request::instance();
        $schools = School::with(['users.roles'])->get()->map(function ($school) use ($dummyRequest) {
            return (new SchoolResource($school))->toArray($dummyRequest);
        })->toArray();

        // 4. دورات التقييم المعتمدة
        $cycles = EvaluationCycle::all()->toArray();

        // 5. تجهيز بيانات العرض
        $now = Carbon::now();
        $viewData = [
            'generated_at'   => $now->locale('ar')->isoFormat('YYYY/MM/DD - HH:mm'),
            'ref_number'     => $now->format('Ymd') . '-' . substr(strval(crc32($totalSchools . $now->timestamp)), 0, 4),
            'digital_hash'   => substr(hash('sha256', "EVAL-REPORT-{$now->timestamp}-{$totalSchools}"), 0, 10),
            'total_schools'  => $totalSchools,
            'gov_schools'    => $govSchools,
            'pvt_schools'    => $pvtSchools,
            'total_users'    => $totalUsers,
            'active_users'   => $activeUsers,
            'ready_schools'  => $readySchools,
            'readiness_rate' => $readinessRate,
            'directorates'   => $directorates,
            'schools'        => $schools,
            'cycles'         => $cycles,
        ];

        $html = View::make('reports.admin_executive_report', $viewData)->render();

        // 6. تهيئة محرك mPDF
        $defaultConfig = (new ConfigVariables())->getDefaults();
        $fontDirs = $defaultConfig['fontDir'];

        $defaultFontConfig = (new FontVariables())->getDefaults();
        $fontData = $defaultFontConfig['fontdata'];

        $customFontsDir = resource_path('fonts');
        $hasAmiri = file_exists($customFontsDir . '/Amiri-Regular.ttf');

        $tempDir = storage_path('app/temp-mpdf');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $mpdfConfig = [
            'mode'             => 'utf-8',
            'format'           => 'A4',
            'orientation'      => 'P',
            'margin_left'      => 12,
            'margin_right'     => 12,
            'margin_top'       => 54,
            'margin_bottom'    => 20,
            'margin_header'    => 10,
            'margin_footer'    => 10,
            'autoScriptToLang' => true,
            'autoArabic'       => true,
            'autoLangToFont'   => true,
            'default_font'     => $hasAmiri ? 'amiri' : 'dejavusans',
            'tempDir'          => $tempDir,
        ];

        if ($hasAmiri) {
            $mpdfConfig['fontDir'] = array_merge($fontDirs, [$customFontsDir]);
            $mpdfConfig['fontdata'] = $fontData + [
                'amiri' => [
                    'R' => 'Amiri-Regular.ttf',
                    'B' => 'Amiri-Bold.ttf',
                ],
            ];
        }

        $mpdf = new Mpdf($mpdfConfig);
        $mpdf->SetDirectionality('rtl');
        $mpdf->SetTitle('التقرير التنفيذي الشامل - منصة ارتقاء للتقييم الذاتي والتحسين المدرسي');
        $mpdf->SetAuthor('منصة ارتقاء للتقييم الذاتي والتحسين المدرسي');
        $mpdf->WriteHTML($html);

        return $mpdf->Output('', 'S');
    }
}
