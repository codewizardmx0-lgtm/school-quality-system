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

class EvaluationPlansSheet implements FromCollection, WithHeadings, WithTitle, ShouldAutoSize, WithStyles, WithEvents, WithCustomStartCell
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
        return 'خطط وإجراءات التحسين';
    }

    public function headings(): array
    {
        return [
            'نوع الخطة',
            'عنوان الخطة',
            'وصف الإجراء التنفيذي',
            'المؤشر المرتبط',
            'الفئة المستهدفة',
            'العدد المستهدف',
            'تاريخ الانتهاء المحدد',
            'نسبة الإنجاز (%)',
            'حالة الإجراء',
        ];
    }

    public function collection(): Collection
    {
        $schoolId = $this->evaluation->school_id;

        $plans = ImprovementPlan::query()
            ->where('school_id', $schoolId)
            ->with(['actions.area.indicator'])
            ->orderBy('plan_id')
            ->get();

        $rows = [];

        foreach ($plans as $plan) {
            $planTypeLabel = match ($plan->plan_type) {
                ImprovementPlan::TYPE_ANNUAL_OPERATIONAL => 'الخطة التشغيلية السنوية',
                ImprovementPlan::TYPE_STAFF_DEVELOPMENT  => 'خطة التطوير المهني للكادر',
                default => 'خطة تحسين الجودة',
            };

            if ($plan->actions->isEmpty()) {
                $rows[] = [
                    'plan_type'   => $planTypeLabel,
                    'plan_title'  => $plan->title,
                    'action_desc' => 'لا توجد إجراءات مسجلة بعد',
                    'indicator'   => '—',
                    'target_group'=> '—',
                    'target_count'=> '—',
                    'due_date'    => '—',
                    'completion'  => '0%',
                    'status'      => '—',
                ];
                continue;
            }

            foreach ($plan->actions as $action) {
                $statusLabel = match ($action->status) {
                    'Done', 'Completed' => 'مكتمل ومنجز',
                    'InProgress' => 'قيد التنفيذ والمتابعة',
                    'Pending' => 'معلق / بانتظار البدء',
                    'Cancelled' => 'ملغي',
                    default => 'مسودة',
                };

                $rows[] = [
                    'plan_type'    => $planTypeLabel,
                    'plan_title'   => $plan->title,
                    'action_desc'  => $action->title ?? $action->description,
                    'indicator'    => $action->area?->indicator ? "{$action->area->indicator->code} - {$action->area->indicator->name}" : 'عام',
                    'target_group' => $action->target_group ?? 'الكادر المدرسي',
                    'target_count' => $action->target_count ?? 1,
                    'due_date'     => $action->due_date ? (string) $action->due_date : 'غير محدد',
                    'completion'   => ($action->completion_percentage ?? 0) . '%',
                    'status'       => $statusLabel,
                ];
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
                $sheet->mergeCells('A1:I1');
                $sheet->setCellValue('A1', 'نظام تقييم وضمان جودة المدارس — ' . $this->title());
                $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->getColor()->setARGB('FF0F766E');
                $sheet->getStyle('A1')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);

                // الصف 2: اسم المدرسة ورقمها
                $sheet->mergeCells('A2:D2');
                $sheet->setCellValue('A2', 'اسم المدرسة: ' . $schoolName);
                $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(11);

                $sheet->mergeCells('E2:I2');
                $sheet->setCellValue('E2', 'الرقم الوزاري / الكود: ' . $schoolCode);
                $sheet->getStyle('E2')->getFont()->setBold(true)->setSize(11);

                // الصف 3: العام الدراسي وتاريخ التصدير
                $sheet->mergeCells('A3:D3');
                $sheet->setCellValue('A3', 'العام الدراسي: ' . $academicYear);
                $sheet->getStyle('A3')->getFont()->setSize(10);

                $sheet->mergeCells('E3:I3');
                $sheet->setCellValue('E3', 'تاريخ التصدير: ' . $dateStr);
                $sheet->getStyle('E3')->getFont()->setSize(10);

                // تنسيق خلفية الترويسة العلوية
                $sheet->getStyle('A1:I3')->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                    ->getStartColor()->setARGB('FFF0FDF4');
                $sheet->getStyle('A1:I3')->getBorders()->getAllBorders()->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN)
                    ->getColor()->setARGB('FFCBD5E1');
            },
        ];
    }
}
