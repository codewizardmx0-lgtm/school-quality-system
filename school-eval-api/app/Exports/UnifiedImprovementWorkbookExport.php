<?php

namespace App\Exports;

use App\Models\Evaluation;
use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class UnifiedImprovementWorkbookExport implements WithMultipleSheets, Export
{
    use Exportable;

    public function __construct(
        protected Evaluation $evaluation
    ) {}

    public function sheets(): array
    {
        return [
            new ImprovementSuggestionsSheet($this->evaluation),
            new ImprovementPlansOverviewSheet($this->evaluation),
            new ImprovementActionsMatrixSheet($this->evaluation),
        ];
    }
}
