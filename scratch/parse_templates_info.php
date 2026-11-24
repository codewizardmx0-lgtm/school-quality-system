<?php
$dirs = glob("docs/evidence_templates/STD-*/*");
$items = [];
foreach ($dirs as $d) {
    $tFile = "$d/TEMPLATE.md";
    if (!file_exists($tFile)) continue;
    $content = file_get_contents($tFile);
    $lines = explode("\n", $content);
    $firstLine = trim($lines[0] ?? '');
    $title = preg_replace('/^#\s*/', '', $firstLine);
    
    $folder = basename(dirname($d)) . "/" . basename($d);
    $subDir = basename($d);
    $std = basename(dirname($d));
    
    $subStd = '';
    $indicators = [];
    foreach ($lines as $l) {
        if (preg_match('/المعيار الفرعي:\*\*\s*(.*)/u', $l, $m)) {
            $subStd = trim($m[1]);
        }
        if (preg_match('/رمز المؤشر المرتبط:\*\*\s*(.*)/u', $l, $m)) {
            $rawInd = trim($m[1]);
            // extract all x-x-x
            preg_match_all('/(\d+[-.]\d+[-.]\d+)/', $rawInd, $matches);
            $indicators = $matches[0];
        }
    }
    
    echo "$subDir | $std | $title | " . implode(', ', $indicators) . "\n";
}
