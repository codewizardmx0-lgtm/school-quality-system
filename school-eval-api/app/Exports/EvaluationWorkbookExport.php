<?php

namespace App\Exports;

use App\Models\Evaluation;
use App\Models\User;
use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class EvaluationWorkbookExport implements WithMultipleSheets, Export
{
    use Exportable;
    public function __construct(
        protected Evaluation $evaluation,
        protected ?User $user = null
    ) {}

    public function sheets(): array
    {
        return [
            new EvaluationResultsSheet($this->evaluation),
            new EvaluationEvidencesSheet($this->evaluation, $this->user),
            new EvaluationPlansSheet($this->evaluation),
        ];
    }
}
