<?php

namespace App\Exports;

use App\Models\Evaluation;
use App\Models\Evidence;
use App\Models\EvidenceLink;
use App\Models\User;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class EvaluationEvidencesSheet implements FromCollection, WithHeadings, WithTitle, ShouldAutoSize, WithStyles, WithEvents
{
    public function __construct(
        protected Evaluation $evaluation,
        protected ?User $user = null
    ) {}

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

        if ($links->isNotEmpty()) {
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

        // 2. مسار احتياطي للبيانات القديمة إن لم توجد روابط جديدة
        $evidences = Evidence::query()
            ->whereHas('result', fn($q) => $q->where('evaluation_id', $this->evaluation->evaluation_id))
            ->with(['indicator', 'reviewer.roles'])
            ->orderBy('indicator_id')
            ->get();

        foreach ($evidences as $ev) {
            $row = [
                'indicator_code' => $ev->indicator?->code ?? '—',
                'indicator_name' => $ev->indicator?->name ?? '—',
                'title'          => $ev->title,
                'document_type'  => $this->translateType($ev->evidence_type),
                'version_no'     => 'v1',
                'justification'  => $ev->description ?: '—',
                'status'         => $this->translateStatus($ev->status),
            ];

            if ($role === 'admin') {
                $row['notes'] = $ev->reviewer_notes ?: '—';
            } elseif ($role === 'school_principal') {
                $isPrincipal = $ev->reviewer && $ev->reviewer->hasRole('school_principal');
                $row['notes'] = $isPrincipal ? ($ev->reviewer_notes ?: '—') : '—';
            } elseif ($role === 'ministry_supervisor') {
                $isSupervisor = $ev->reviewer && $ev->reviewer->hasRole('ministry_supervisor');
                $row['notes'] = $isSupervisor ? ($ev->reviewer_notes ?: '—') : '—';
            }

            $row['created_at'] = $ev->created_at ? $ev->created_at->format('Y-m-d') : '—';

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

    protected function translateType(?string $type): string
    {
        return match ($type) {
            'file' => 'ملف وثائقي',
            'url'  => 'رابط خارجي',
            'text' => 'إقرار نصي',
            default => 'مرفق',
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
