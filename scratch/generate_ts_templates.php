<?php
$dirs = glob("docs/evidence_templates/STD-*/*");
sort($dirs);

$standardTitles = [
    'STD-01' => 'الإدارة المدرسية',
    'STD-02' => 'المعلمون والكوادر الإدارية والخدمية',
    'STD-03' => 'المتعلمون',
    'STD-04' => 'التعليم والتعلم',
    'STD-05' => 'البيئة المدرسية',
    'STD-06' => 'الشراكة المجتمعية',
    'STD-07' => 'ضمان الجودة والتحسين المستمر',
];

$items = [];

foreach ($dirs as $d) {
    $tFile = "$d/TEMPLATE.md";
    if (!file_exists($tFile)) continue;
    $content = file_get_contents($tFile);
    $lines = explode("\n", $content);
    $firstLine = trim($lines[0] ?? '');
    $title = preg_replace('/^#\s*/', '', $firstLine);
    
    $subDir = basename($d); // e.g. STD-01-1
    $std = basename(dirname($d)); // e.g. STD-01
    
    $indicators = [];
    $description = '';
    foreach ($lines as $l) {
        if (preg_match('/رمز المؤشر المرتبط:\*\*\s*(.*)/u', $l, $m)) {
            $rawInd = trim($m[1]);
            preg_match_all('/(\d+[-.]\d+[-.]\d+)/', $rawInd, $matches);
            $indicators = $matches[0];
        }
        if (empty($description) && preg_match('/^## ثانياً:\s*(.*)/u', $l, $m)) {
            $description = trim($m[1]);
        }
    }
    
    // Also include dot variants in indicators
    $allIndCodes = [];
    foreach ($indicators as $ind) {
        $hyphen = str_replace('.', '-', $ind);
        $dot = str_replace('-', '.', $ind);
        $allIndCodes[] = $hyphen;
        $allIndCodes[] = $dot;
    }
    $allIndCodes[] = $subDir;
    $allIndCodes = array_values(array_unique($allIndCodes));

    $fileName = preg_replace('/[^\w\x{0600}-\x{06FF}\-]/u', '_', $title);
    $fileName = trim(preg_replace('/_+/', '_', $fileName), '_') . "_{$subDir}.md";

    $items[] = [
        'id' => $subDir,
        'standardCode' => $std,
        'standardTitle' => $standardTitles[$std] ?? $std,
        'title' => $title,
        'fileName' => $fileName,
        'indicatorCodes' => $allIndCodes,
        'description' => $description ?: $title,
        'content' => $content,
    ];
}

$ts = "/**\n * قوالب الشواهد والأدلة الرسمية المعتمدة للاعتماد المدرسي\n * مولدة تلقائياً من وثائق قوالب مدرسة الأولى الأهلية (docs/evidence_templates)\n */\n\n";
$ts .= "export interface EvidenceTemplate {\n";
$ts .= "  id: string;\n";
$ts .= "  standardCode: string;\n";
$ts .= "  standardTitle: string;\n";
$ts .= "  title: string;\n";
$ts .= "  fileName: string;\n";
$ts .= "  indicatorCodes: string[];\n";
$ts .= "  description: string;\n";
$ts .= "  content: string;\n";
$ts .= "}\n\n";

$ts .= "export const EVIDENCE_TEMPLATES: EvidenceTemplate[] = " . json_encode($items, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . ";\n\n";

$ts .= <<<TS
/**
 * البحث عن القالب المناسب للمؤشر الحالي أو المعيار
 */
export function findEvidenceTemplate(
  indicatorCode?: string,
  standardCode?: string
): EvidenceTemplate | null {
  if (!indicatorCode && !standardCode) return null;

  if (indicatorCode) {
    const raw = indicatorCode.trim();
    const hyphen = raw.replace(/\./g, '-');
    const dot = raw.replace(/-/g, '.');

    // 1. تطابق مباشر دقيق مع كود المؤشر
    const exact = EVIDENCE_TEMPLATES.find(
      (t) =>
        t.indicatorCodes.includes(raw) ||
        t.indicatorCodes.includes(hyphen) ||
        t.indicatorCodes.includes(dot) ||
        t.id === hyphen ||
        t.id === raw
    );
    if (exact) return exact;

    // 2. تطابق مع معيار فرعي حسب بادئة المؤشر (e.g. 1-1, 1-2, 2-1, 4-1...)
    const prefixMatch = hyphen.match(/^(\d+-\d+)/);
    if (prefixMatch) {
      const subPrefix = prefixMatch[1]; // e.g. '1-1'
      const matched = EVIDENCE_TEMPLATES.find((t) =>
        t.indicatorCodes.some((code) => code.startsWith(subPrefix))
      );
      if (matched) return matched;
    }
  }

  // 3. تطابق مع المعيار الرئيسي (إرجاع أول قالب للمعيار)
  if (standardCode) {
    const std = standardCode.trim().toUpperCase();
    const stdClean = std.startsWith('STD-') ? std : `STD-\${std.padStart(2, '0')}`;
    const byStd = EVIDENCE_TEMPLATES.find((t) => t.standardCode === stdClean || t.standardCode === std);
    if (byStd) return byStd;
  }

  return null;
}

/**
 * جلب جميع القوالب المرتبطة بمعيار معين
 */
export function getTemplatesForStandard(standardCode?: string): EvidenceTemplate[] {
  if (!standardCode) return [];
  const std = standardCode.trim().toUpperCase();
  const stdClean = std.startsWith('STD-') ? std : `STD-\${std.padStart(2, '0')}`;
  return EVIDENCE_TEMPLATES.filter((t) => t.standardCode === stdClean || t.standardCode === std);
}

/**
 * تنزيل القالب كملف Markdown مع دعم كامل للترميز العربي UTF-8 BOM
 */
export function downloadTemplateFile(template: EvidenceTemplate): void {
  // إضافة BOM لضمان فتح الملف العربي في محرر النصوص و Word بشكل صحيح
  const blob = new Blob(['\\uFEFF' + template.content], {
    type: 'text/markdown;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = template.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
TS;

@mkdir('school-eval-web/src/features/evaluation/data', 0777, true);
file_put_contents('school-eval-web/src/features/evaluation/data/evidenceTemplates.ts', $ts);
echo "Generated evidenceTemplates.ts successfully. Count: " . count($items) . "\n";
