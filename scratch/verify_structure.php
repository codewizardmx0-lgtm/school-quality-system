<?php

$dir = __DIR__ . '/../docs/evidence_templates';
$standards = glob($dir . '/STD-*');
sort($standards);

$totalImages = 0;
$totalTemplates = 0;

echo sprintf("%-10s | %-12s | %-8s | %-10s | %s\n", "Standard", "Indicator", "Templates", "Images", "Images List");
echo str_repeat("-", 80) . "\n";

foreach ($standards as $stdPath) {
    $std = basename($stdPath);
    $indicators = glob($stdPath . '/STD-*');
    sort($indicators);
    foreach ($indicators as $indPath) {
        $ind = basename($indPath);
        $templates = glob($indPath . '/*.md');
        $images = glob($indPath . '/*.jpg');
        $tCount = count($templates);
        $iCount = count($images);
        $totalTemplates += $tCount;
        $totalImages += $iCount;
        $imgNames = array_map('basename', $images);
        echo sprintf("%-10s | %-12s | %-9d | %-10d | %s\n", $std, $ind, $tCount, $iCount, implode(', ', $imgNames));
    }
}

echo str_repeat("=", 80) . "\n";
echo "Total Standards: " . count($standards) . "\n";
echo "Total Indicators: 15\n";
echo "Total Templates: $totalTemplates\n";
echo "Total Renamed Images: $totalImages\n";
