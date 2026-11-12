<?php

namespace App\Exports;

use App\Models\Evaluation;
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

class ImprovementPlansOverviewSheet implements FromCollection, WithHeadings, WithTitle, ShouldAutoSize, WithStyles, WithEvents, WithCustomStartCell
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
        return 'الخطط التطويرية المدرسية';
    }

    public function headings(): array
    {
        return [
            'نوع الخطة',
            'عنوان الخطة',
            'حالة الخطة',
            'تاريخ البدء',
            'تاريخ الانتهاء',
            'عدد مجالات التحسين',
            'عدد الإجراءات التنفيذية',
            'متوسط الإنجاز (%)',
            'وصف التقدم',
        ];
    }

    public function collection(): Collection
    {
        $schoolId = $this->evaluation->school_id;

        $plans = ImprovementPlan::query()
            ->where('school_id', $schoolId)
            ->with(['areas', 'actions'])
            ->orderBy('plan_id')
            ->get();

        $rows = [];

        foreach ($plans as $plan) {
            $planTypeLabel = match ($plan->plan_type) {
                ImprovementPlan::TYPE_ANNUAL_OPERATIONAL => 'الخطة التشغيلية السنوية',
                ImprovementPlan::TYPE_STAFF_DEVELOPMENT  => 'خطة التطوير المهني للكادر',
                default => 'خطة تحسين الجودة',
            };

            $statusLabel = match ($plan->status) {
                'Draft' => 'مسودة قيد الإعداد',
                'Approved' => 'معتمدة وفعالة',
                'Completed' => 'مكتملة الإنجاز',
                'UnderReview' => 'قيد المراجعة والاعتماد',
                default => $plan->status ?? 'مسودة',
            };

            $areasCount = $plan->areas->count();
            $actionsCount = $plan->actions->count();
            $avgProgress = $actionsCount > 0 ? round($plan->actions->avg('completion_percentage') ?? 0, 1) : 0;

            $rows[] = [
                'type'         => $planTypeLabel,
                'title'        => $plan->title,
                'status'       => $statusLabel,
                'start_date'   => $plan->start_date ? (string)$plan->start_date : '—',
                'end_date'     => $plan->end_date ? (string)$plan->end_date : '—',
                'areas_count'  => $areasCount,
                'actions_count'=> $actionsCount,
                'avg_progress' => $avgProgress . '%',
                'progress_desc'=> $plan->progress_description ?? 'قيد التنفيذ والمتابعة الدورية',
            ];
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
                    'startColor' => ['argb' => 'FF0D9488'], // Teal header
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
                $sheet->mergeCells('A1:I1');
                $sheet->setCellValue('A1', 'مصنف خطط ومقترحات التطوير — ' . $this->title());
                $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->getColor()->setARGB('FF0D9488');
                $sheet->getStyle('A1')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);

                // الصف 2: اسم المدرسة ورقمها
                $sheet->mergeCells('A2:E2');
                $sheet->setCellValue('A2', 'اسم المدرسة: ' . $schoolName);
                $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(11);

                $sheet->mergeCells('F2:I2');
                $sheet->setCellValue('F2', 'الرقم الوزاري: ' . $schoolCode);
                $sheet->getStyle('F2')->getFont()->setBold(true)->setSize(11);

                // الصف 3: العام وتاريخ التصدير
                $sheet->mergeCells('A3:E3');
                $sheet->setCellValue('A3', 'العام الدراسي: ' . $academicYear);
                $sheet->getStyle('A3')->getFont()->setSize(10);

                $sheet->mergeCells('F3:I3');
                $sheet->setCellValue('F3', 'تاريخ التصدير: ' . $dateStr);
                $sheet->getStyle('F3')->getFont()->setSize(10);

                $sheet->getStyle('A1:I3')->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                    ->getStartColor()->setARGB('FFF0FDFA');
                $sheet->getStyle('A1:I3')->getBorders()->getAllBorders()->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN)
                    ->getColor()->setARGB('FFCBD5E1');
            },
        ];
    }
}
