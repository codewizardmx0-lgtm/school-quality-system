<?php

namespace App\Exports;

use App\Models\Evaluation;
use App\Models\EvaluationResult;
use App\Models\ImprovementPlan;
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

class ImprovementSuggestionsSheet implements FromCollection, WithHeadings, WithTitle, ShouldAutoSize, WithStyles, WithEvents, WithCustomStartCell
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
        return 'مقترحات التحسين والفجوات';
    }

    public function headings(): array
    {
        return [
            'رمز المؤشر',
            'اسم المؤشر',
            'المعيار الوطني',
            'الدرجة المرصودة',
            'الدرجة المستهدفة',
            'مقدار الفجوة',
            'الأولوية المقترحة',
            'حالة التبني',
            'الخطة الحاضنة',
            'مبررات واقتراح التحسين',
        ];
    }

    public function collection(): Collection
    {
        $results = EvaluationResult::query()
            ->where('evaluation_id', $this->evaluation->evaluation_id)
            ->with(['indicator.subStandard.standard', 'improvementAreas.plans'])
            ->get();

        $rows = [];

        foreach ($results as $res) {
            $ind = $res->indicator;
            if (!$ind) continue;

            $score = $res->score !== null ? (int)$res->score : null;
            // المقترحات تركز على المؤشرات ذات الفجوة أو المرصودة
            $targetScore = 3;
            $gap = $score !== null ? max(0, $targetScore - $score) : 3;

            $priority = match (true) {
                $score === 0 || $score === null => 'عالية جداً (P0)',
                $score === 1 => 'عالية (P1)',
                $score === 2 => 'متوسطة (P2)',
                default => 'منخفضة (مستوفى)',
            };

            $adoptedArea = $res->improvementAreas->first();
            $isAdopted = $adoptedArea !== null;
            $adoptionStatus = $isAdopted ? 'متبنى' : 'غير متبنى';

            $hostingPlans = $adoptedArea ? $adoptedArea->plans->pluck('title')->implode('، ') : '—';
            if ($isAdopted && empty($hostingPlans)) {
                $hostingPlans = 'مجال تحسين مستقل';
            }

            $suggestionText = match ($score) {
                0 => "توفير متطلبات البنية الأساسية والوثائق التنظيمية لمؤشر ({$ind->code}) وإدراجه كأولوية قصوى.",
                1 => "تنفيذ ورش تدريبية وتجهيز الأدوات المساندة لسد الفجوة في مؤشر ({$ind->code}).",
                2 => "تعزيز ممارسات التوثيق الدوري ورفع كفاءة تطبيق متطلبات مؤشر ({$ind->code}).",
                3 => "المؤشر مستوفٍ بدرجة متقدمة؛ يوصى باستدامة الممارسات وتحديث الشواهد سنوياً.",
                default => "مؤشر غير مرصود بعد؛ يرجى استكمال رصد التقييم وتحديد المتطلبات.",
            };

            $rows[] = [
                'code'           => $ind->code,
                'name'           => $ind->name,
                'standard'       => $ind->subStandard?->standard?->name ?? '—',
                'score'          => $score !== null ? $score : 'غير مرصود',
                'target'         => $targetScore,
                'gap'            => $gap,
                'priority'       => $priority,
                'status'         => $adoptionStatus,
                'plans'          => $hostingPlans,
                'suggestion'     => $suggestionText,
            ];
        }

        // فرز: الفجوات الأعلى أولاً
        usort($rows, fn($a, $b) => $b['gap'] <=> $a['gap']);

        return collect($rows);
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            6 => [
                'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'FF4F46E5'], // Indigo header
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
                $sheet->mergeCells('A1:J1');
                $sheet->setCellValue('A1', 'مصنف خطط ومقترحات التطوير — ' . $this->title());
                $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->getColor()->setARGB('FF4F46E5');
                $sheet->getStyle('A1')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);

                // الصف 2: اسم المدرسة ورقمها
                $sheet->mergeCells('A2:E2');
                $sheet->setCellValue('A2', 'اسم المدرسة: ' . $schoolName);
                $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(11);

                $sheet->mergeCells('F2:J2');
                $sheet->setCellValue('F2', 'الرقم الوزاري: ' . $schoolCode);
                $sheet->getStyle('F2')->getFont()->setBold(true)->setSize(11);

                // الصف 3: العام وتاريخ التصدير
                $sheet->mergeCells('A3:E3');
                $sheet->setCellValue('A3', 'العام الدراسي: ' . $academicYear);
                $sheet->getStyle('A3')->getFont()->setSize(10);

                $sheet->mergeCells('F3:J3');
                $sheet->setCellValue('F3', 'تاريخ التصدير: ' . $dateStr);
                $sheet->getStyle('F3')->getFont()->setSize(10);

                $sheet->getStyle('A1:J3')->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                    ->getStartColor()->setARGB('FFEEF2FF');
                $sheet->getStyle('A1:J3')->getBorders()->getAllBorders()->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN)
                    ->getColor()->setARGB('FFCBD5E1');
            },
        ];
    }
}
