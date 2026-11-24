<?php

$dir = __DIR__ . '/../docs/ملفات قد تفيد في المشروع';
$files = array_values(array_filter(scandir($dir), function($f) {
    return !in_array($f, ['.', '..']);
}));
sort($files);
echo "Total files: " . count($files) . "\n";
foreach ($files as $i => $f) {
    echo sprintf("%2d => %s\n", $i + 1, $f);
}
