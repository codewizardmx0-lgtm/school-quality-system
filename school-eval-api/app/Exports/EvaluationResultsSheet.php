<?php

namespace App\Exports;

use App\Models\Evaluation;
use App\Models\EvaluationResult;
use App\Models\Standard;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class EvaluationResultsSheet implements FromCollection, WithHeadings, WithTitle, ShouldAutoSize, WithStyles, WithEvents
{
    public function __construct(
        protected Evaluation $evaluation
    ) {}

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
            1 => [
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
                $event->sheet->getDelegate()->setRightToLeft(true);
            },
        ];
    }
}
