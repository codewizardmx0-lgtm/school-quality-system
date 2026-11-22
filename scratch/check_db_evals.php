<?php
require __DIR__ . '/../school-eval-api/vendor/autoload.php';
$app = require_once __DIR__ . '/../school-eval-api/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\School;
use App\Models\Evaluation;
use App\Models\EvaluationCycle;

echo "--- Evaluation Cycles ---\n";
foreach (EvaluationCycle::all() as $c) {
    echo "Cycle ID: {$c->cycle_id} | Name: {$c->name} | Academic Year: {$c->academic_year} | Status: {$c->status} | Version ID: {$c->version_id}\n";
}

echo "\n--- Schools with Evaluations ---\n";
foreach (School::all() as $s) {
    $evals = Evaluation::where('school_id', $s->school_id)->get();
    echo "School ID: {$s->school_id} | Name: {$s->name} | Governorate: {$s->governorate} | Evals: {$evals->count()}\n";
    foreach ($evals as $ev) {
        $cycle = $ev->cycle;
        echo "   -> Eval ID: {$ev->evaluation_id} | Cycle ID: {$ev->cycle_id} | Cycle Name: {$cycle?->name} | Year: {$cycle?->academic_year} | Status: {$ev->status} | Results count: " . $ev->results()->count() . "\n";
    }
}
