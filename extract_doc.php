<?php
$files = glob(__DIR__ . '/docs/*.docx');
if (empty($files)) {
    echo "No docx files found in docs/\n";
    exit(1);
}

$zip = new ZipArchive();
if ($zip->open($files[0]) === true) {
    $xml = $zip->getFromName('word/document.xml');
    $zip->close();
    
    $dom = new DOMDocument();
    $dom->loadXML($xml);
    
    $output = '';
    $xpath = new DOMXPath($dom);
    $xpath->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');
    
    $body = $dom->getElementsByTagName('body')->item(0);
    foreach ($body->childNodes as $node) {
        if ($node->nodeName === 'w:p') {
            $text = trim($node->textContent);
            if (!empty($text)) {
                $output .= "[HEADING/TEXT] " . $text . "\n";
            }
        } elseif ($node->nodeName === 'w:tbl') {
            $output .= "\n=== TABLE START ===\n";
            $rows = $xpath->query('.//w:tr', $node);
            foreach ($rows as $row) {
                $cells = $xpath->query('.//w:tc', $row);
                $cellTexts = [];
                foreach ($cells as $cell) {
                    $cellTexts[] = trim($cell->textContent);
                }
                $output .= "| " . implode(" | ", $cellTexts) . " |\n";
            }
            $output .= "=== TABLE END ===\n\n";
        }
    }
    
    file_put_contents(__DIR__ . '/docs/data_dictionary_extracted.txt', $output);
    echo "Extracted successfully! Length: " . strlen($output) . " bytes\n";
} else {
    echo "Failed to open docx file: " . $files[0] . "\n";
}
