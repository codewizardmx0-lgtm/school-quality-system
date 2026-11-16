<?php

namespace App\Exports;

use App\Models\Evaluation;
use App\Models\EvaluationResult;
use App\Models\Standard;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class EvaluationResultsSheet implements FromCollection, WithHeadings, WithTitle, ShouldAutoSize, WithStyles, WithEvents, WithCustomStartCell
{
    public function __construct(
        protected Evaluation $evaluation
    ) {}

    public function startCell(): string
    {
        return 'A6';
    }

    public function title(): string
    {
        return 'النتائج والمعايير';
    }

    public function headings(): array
    {
        return [
            'رمز المعيار',
            'اسم المعيار',
            'رمز المؤشر',
            'اسم المؤشر',
            'الدرجة المكتسبة (0-3)',
            'الوزن النسبي (%)',
            'المساهمة الموزونة (%)',
            'حالة الرصد',
        ];
    }

    public function collection(): Collection
    {
        $versionId = $this->evaluation->cycle?->version_id;

        $standards = Standard::query()
            ->when($versionId, fn($q) => $q->where('version_id', $versionId))
            ->with(['subStandards.indicators'])
            ->orderBy('standard_id')
            ->get();

        $resultsMap = EvaluationResult::query()
            ->where('evaluation_id', $this->evaluation->evaluation_id)
            ->get()
            ->keyBy('indicator_id');

        $rows = [];

        foreach ($standards as $std) {
            foreach ($std->subStandards as $sub) {
                foreach ($sub->indicators as $ind) {
                    $result = $resultsMap->get($ind->indicator_id);
                    $hasScore = ($result !== null && $result->completion_status === 'Completed' && $result->score !== null);
                    $rawScore = $hasScore ? (int) $result->score : null;
                    $weight = (float) $ind->weight;
                    $weightedScore = $hasScore ? round(($rawScore / 3.0) * ($weight), 2) : 0.0;

                    $rows[] = [
                        'standard_code' => $std->code,
                        'standard_name' => $std->name,
                        'indicator_code' => $ind->code,
                        'indicator_name' => $ind->name,
                        'score' => $hasScore ? $rawScore : 'غير مرصود',
                        'weight' => number_format($weight, 2) . '%',
                        'weighted_score' => $hasScore ? number_format($weightedScore, 2) . '%' : '—',
                        'status' => $hasScore ? 'مكتمل' : 'قيد التقييم',
                    ];
                }
            }
        }

        return collect($rows);
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            6 => [
                'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'FF0F766E'],
                ],
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $sheet->setRightToLeft(true);

                $this->evaluation->loadMissing(['school', 'cycle']);
                $school = $this->evaluation->school;
                $schoolName = $school?->school_name ?? $school?->name ?? 'مدرسة الفاروق الأساسية للبنين';
                $schoolCode = $school?->school_code ?? $school?->code ?? ('SCH-' . str_pad((string)($school?->school_id ?? 1), 3, '0', STR_PAD_LEFT));
                $academicYear = $this->evaluation->cycle?->academic_year ?? '2025/2026';
                $dateStr = now()->format('Y-m-d');

                // الصف 1: عنوان التقرير
                $sheet->mergeCells('A1:H1');
                $sheet->setCellValue('A1', 'نظام تقييم وضمان جودة المدارس — ' . $this->title());
                $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->getColor()->setARGB('FF0F766E');
                $sheet->getStyle('A1')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);

                // الصف 2: اسم المدرسة ورقمها
                $sheet->mergeCells('A2:D2');
                $sheet->setCellValue('A2', 'اسم المدرسة: ' . $schoolName);
                $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(11);

                $sheet->mergeCells('E2:H2');
                $sheet->setCellValue('E2', 'الرقم الوزاري / الكود: ' . $schoolCode);
                $sheet->getStyle('E2')->getFont()->setBold(true)->setSize(11);

                // الصف 3: العام الدراسي وتاريخ التصدير
                $sheet->mergeCells('A3:D3');
                $sheet->setCellValue('A3', 'العام الدراسي: ' . $academicYear);
                $sheet->getStyle('A3')->getFont()->setSize(10);

                $sheet->mergeCells('E3:H3');
                $sheet->setCellValue('E3', 'تاريخ التصدير: ' . $dateStr);
                $sheet->getStyle('E3')->getFont()->setSize(10);

                // تنسيق خلفية الترويسة العلوية
                $sheet->getStyle('A1:H3')->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                    ->getStartColor()->setARGB('FFF0FDF4');
                $sheet->getStyle('A1:H3')->getBorders()->getAllBorders()->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN)
                    ->getColor()->setARGB('FFCBD5E1');
            },
        ];
    }
}
