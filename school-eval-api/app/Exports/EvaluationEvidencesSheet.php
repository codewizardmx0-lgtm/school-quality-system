<?php

namespace App\Exports;

use App\Models\Evaluation;
use App\Models\EvidenceLink;
use App\Models\User;
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

class EvaluationEvidencesSheet implements FromCollection, WithHeadings, WithTitle, ShouldAutoSize, WithStyles, WithEvents, WithCustomStartCell
{
    public function __construct(
        protected Evaluation $evaluation,
        protected ?User $user = null
    ) {}

    public function startCell(): string
    {
        return 'A6';
    }

    public function title(): string
    {
        return 'سجل الشواهد والوثائق';
    }

    public function headings(): array
    {
        $role = $this->getUserRole();

        $headings = [
            'رمز المؤشر',
            'اسم المؤشر',
            'اسم المستند',
            'نوع المستند',
            'رقم النسخة',
            'المبرر المستقل',
            'حالة الرابط',
        ];

        if ($role === 'admin') {
            $headings[] = 'ملاحظات المراجعة (الداخلية / الخارجية)';
        } elseif ($role === 'school_principal') {
            $headings[] = 'ملاحظات المراجعة الداخلية';
        } elseif ($role === 'ministry_supervisor') {
            $headings[] = 'ملاحظات المراجعة الإشرافية';
        }

        $headings[] = 'تاريخ الرفع';

        return $headings;
    }

    public function collection(): Collection
    {
        $role = $this->getUserRole();

        // 1. جلب الشواهد من المعمارية الجديدة: evidence_links و document_versions و school_documents
        $links = EvidenceLink::query()
            ->where('evaluation_id', $this->evaluation->evaluation_id)
            ->with(['indicator', 'documentVersion.document'])
            ->orderBy('indicator_id')
            ->get();

        $rows = [];

        foreach ($links as $link) {
            $doc = $link->documentVersion?->document;
            $row = [
                'indicator_code' => $link->indicator?->code ?? '—',
                'indicator_name' => $link->indicator?->name ?? '—',
                'title'          => $doc?->title ?? '—',
                'document_type'  => $this->translateDocumentType($doc?->document_type),
                'version_no'     => $link->documentVersion ? ('v' . $link->documentVersion->version_no) : '—',
                'justification'  => $link->justification ?: '—',
                'status'         => $this->translateStatus($link->status),
            ];

            if ($role === 'admin' || $role === 'school_principal' || $role === 'ministry_supervisor') {
                $row['notes'] = '—';
            }

            $row['created_at'] = $link->created_at ? $link->created_at->format('Y-m-d') : '—';

            $rows[] = $row;
        }

        return collect($rows);
    }

    protected function getUserRole(): string
    {
        if (!$this->user) {
            return 'guest';
        }

        if ($this->user->hasRole('admin') || $this->user->user_type === 'admin' || $this->user->user_type === 'system') {
            return 'admin';
        }
        if ($this->user->hasRole('ministry_supervisor')) {
            return 'ministry_supervisor';
        }
        if ($this->user->hasRole('school_principal')) {
            return 'school_principal';
        }

        return 'school_evaluator';
    }

    protected function translateDocumentType(?string $type): string
    {
        return match ($type) {
            'minutes' => 'محضر اجتماع',
            'plan'    => 'خطة عمل',
            'record'  => 'سجل مدرسي',
            'report'  => 'تقرير إنجاز',
            'board'   => 'لوحة إعلانات',
            'image'   => 'صورة فوتوغرافية',
            default   => 'أخرى / عام',
        };
    }

    protected function translateStatus(?string $status): string
    {
        return match (strtolower((string) $status)) {
            'completed', 'valid' => 'مقبول ومعتمد',
            'pending'            => 'قيد المراجعة',
            'rejected'           => 'مرفوض',
            'draft'              => 'مسودة',
            default              => $status ?: 'مسودة',
        };
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
