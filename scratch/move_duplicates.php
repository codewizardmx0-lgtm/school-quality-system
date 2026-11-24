<?php

$archiveDir = __DIR__ . '/../docs/evidence_templates/archive';
if (!is_dir($archiveDir)) {
    mkdir($archiveDir, 0777, true);
}

$duplicates = [
    __DIR__ . '/../docs/evidence_templates/STD-01/STD-01-2/STD-01-2_خطة_الإدارة_التعليمية_نسخة2.jpg',
    __DIR__ . '/../docs/evidence_templates/STD-02/STD-02-1/STD-02-1_خطة_شؤون_المعلمات_نسخة2.jpg'
];

foreach ($duplicates as $src) {
    if (file_exists($src)) {
        $dst = $archiveDir . '/' . basename($src);
        rename($src, $dst);
        echo "Moved to archive: " . basename($src) . "\n";
    } else {
        echo "File not found: $src\n";
    }
}
