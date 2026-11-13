<?php

namespace App\Exports;

use App\Models\Evaluation;
use App\Models\ImprovementAction;
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

class ImprovementActionsMatrixSheet implements FromCollection, WithHeadings, WithTitle, ShouldAutoSize, WithStyles, WithEvents, WithCustomStartCell
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
        return 'مصفوفة الإجراءات التنفيذية';
    }

    public function headings(): array
    {
        return [
            'الخطة الحاضنة',
            'مجال التحسين',
            'المؤشر المرتبط',
            'نص الإجراء التنفيذي',
            'مسؤول التنفيذ',
            'الفئة المستهدفة',
            'العدد المستهدف',
            'الموارد المطلوبة',
            'مؤشر التحقق',
            'تاريخ البدء',
            'تاريخ الانتهاء',
            'نسبة الإنجاز (%)',
            'حالة الإجراء',
        ];
    }

    public function collection(): Collection
    {
        $schoolId = $this->evaluation->school_id;

        $actions = ImprovementAction::query()
            ->whereHas('plan', fn($q) => $q->where('school_id', $schoolId))
            ->with(['plan', 'area.indicator'])
            ->orderBy('action_id')
            ->get();

        $rows = [];

        foreach ($actions as $action) {
            $planTitle = $action->plan?->title ?? 'خطة عامة';
            $areaTitle = $action->area?->name ?? 'مجال عام';
            $indCode = $action->area?->indicator?->code ?? '—';
            $indName = $action->area?->indicator?->name ?? '';
            $indicatorStr = $indName ? "({$indCode}) {$indName}" : $indCode;

            $statusLabel = match ($action->status) {
                'Done', 'Completed' => 'مكتمل ومنجز',
                'InProgress' => 'قيد التنفيذ والمتابعة',
                'Pending' => 'معلق / بانتظار البدء',
                'Cancelled' => 'ملغي',
                default => 'مجدول / لم يبدأ',
            };

            $rows[] = [
                'plan'           => $planTitle,
                'area'           => $areaTitle,
                'indicator'      => $indicatorStr,
                'description'    => $action->description,
                'responsible'    => $action->responsible_person ?? 'فريق التطوير المدرسي',
                'target_group'   => $action->target_group ?? 'الكادر المدرسي والطلاب',
                'target_count'   => $action->target_count ?? 1,
                'resources'      => $action->required_resources ?? 'موارد المدرسة المتاحة',
                'evidence'       => $action->success_indicator ?? 'محضر توثيقي أو شاهد إنجاز',
                'start_date'     => $action->start_date ? (string)$action->start_date : '—',
                'due_date'       => $action->due_date ? (string)$action->due_date : '—',
                'progress'       => ($action->completion_percentage ?? 0) . '%',
                'status'         => $statusLabel,
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
                    'startColor' => ['argb' => 'FF1E293B'], // Slate header
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
                $sheet->mergeCells('A1:M1');
                $sheet->setCellValue('A1', 'مصنف خطط ومقترحات التطوير — ' . $this->title());
                $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->getColor()->setARGB('FF1E293B');
                $sheet->getStyle('A1')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);

                // الصف 2: اسم المدرسة ورقمها
                $sheet->mergeCells('A2:F2');
                $sheet->setCellValue('A2', 'اسم المدرسة: ' . $schoolName);
                $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(11);

                $sheet->mergeCells('G2:M2');
                $sheet->setCellValue('G2', 'الرقم الوزاري: ' . $schoolCode);
                $sheet->getStyle('G2')->getFont()->setBold(true)->setSize(11);

                // الصف 3: العام وتاريخ التصدير
                $sheet->mergeCells('A3:F3');
                $sheet->setCellValue('A3', 'العام الدراسي: ' . $academicYear);
                $sheet->getStyle('A3')->getFont()->setSize(10);

                $sheet->mergeCells('G3:M3');
                $sheet->setCellValue('G3', 'تاريخ التصدير: ' . $dateStr);
                $sheet->getStyle('G3')->getFont()->setSize(10);

                $sheet->getStyle('A1:M3')->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                    ->getStartColor()->setARGB('FFF8FAFC');
                $sheet->getStyle('A1:M3')->getBorders()->getAllBorders()->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN)
                    ->getColor()->setARGB('FFCBD5E1');
            },
        ];
    }
}
