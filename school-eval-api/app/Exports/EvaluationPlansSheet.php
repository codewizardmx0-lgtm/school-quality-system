<?php

namespace App\Exports;

use App\Models\Evaluation;
use App\Models\ImprovementPlan;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class EvaluationPlansSheet implements FromCollection, WithHeadings, WithTitle, ShouldAutoSize, WithStyles, WithEvents
{
    public function __construct(
        protected Evaluation $evaluation
    ) {}

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
                    'Done' => 'مكتمل ومنجز',
                    'InProgress' => 'قيد التنفيذ',
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
