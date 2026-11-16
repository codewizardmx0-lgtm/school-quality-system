<?php
$dirs = glob("docs/evidence_templates/STD-*/*");
$result = [];
foreach ($dirs as $d) {
    if (file_exists("$d/TEMPLATE.md")) {
        $lines = array_slice(file("$d/TEMPLATE.md"), 0, 12);
        $key = basename(dirname($d)) . "/" . basename($d);
        echo "=== $key ===\n";
        foreach ($lines as $l) {
            echo "  " . trim($l) . "\n";
        }
    }
}
