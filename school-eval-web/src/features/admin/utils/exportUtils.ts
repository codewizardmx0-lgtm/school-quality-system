import * as XLSX from 'xlsx';

/**
 * exportUtils.ts
 * دوال التصدير المعتمدة بصيغة Microsoft Excel (.xlsx) مع دعم التوجيه العربي الأصيل (RTL).
 * ملاحظة إلزامية: تم حذف CSV نهائياً واعتماد Excel و PDF فقط لمنع مشاكل الترميز.
 */

/**
 * توليد اسم ملف التصدير القياسي متضمناً التاريخ والوقت وفق المتطلب:
 * الصيغة: اسم_التقرير_YYYY-MM-DD_HH-mm.xlsx أو .pdf
 */
export function formatExportFilename(reportName: string, ext: 'xlsx' | 'pdf' = 'xlsx'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  const cleanName = reportName.replace(/\.[^/.]+$/, '').trim();
  return `${cleanName}_${year}-${month}-${day}_${hours}-${minutes}.${ext}`;
}

export interface ExcelSchoolMetadata {
  schoolName?: string;
  schoolCode?: string;
  academicYear?: string;
  reportTitle?: string;
}

/**
 * تصدير البيانات إلى مصنف Microsoft Excel (.xlsx) مع ضبط اتجاه الورقة من اليمين لليسار (RTL).
 * يدعم إضافة ترويسة هوية المدرسة (الاسم، الرقم الوزاري، العام الدراسي) أعلى الجدول.
 */
export function exportToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
  metadata?: ExcelSchoolMetadata
): void {
  const wsData: (string | number)[][] = [];

  if (metadata?.schoolName || metadata?.schoolCode || metadata?.reportTitle) {
    if (metadata.reportTitle) {
      wsData.push([metadata.reportTitle]);
    }
    const metaParts: string[] = [];
    if (metadata.schoolName) metaParts.push(`المدرسة: ${metadata.schoolName}`);
    if (metadata.schoolCode) metaParts.push(`الرقم الوزاري/الرمز: ${metadata.schoolCode}`);
    if (metadata.academicYear) metaParts.push(`العام الدراسي: ${metadata.academicYear}`);
    metaParts.push(`تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')}`);
    wsData.push([metaParts.join('  |  ')]);
    wsData.push([]); // سطر فارغ فاصل قبل الجدول
  }

  wsData.push(headers);
  rows.forEach((row) => wsData.push(row.map((cell) => cell ?? '')));

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // ضبط اتجاه الورقة ليكون RTL متوافقاً مع اللغة العربية
  ws['!dir'] = 'rtl';

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'البيانات');

  const safeFilename = filename.endsWith('.xlsx')
    ? filename
    : `${filename.replace(/\.[^/.]+$/, '')}.xlsx`;

  XLSX.writeFile(wb, safeFilename);
}

/**
 * اسم بديل قياسي لتصدير ملفات Excel (.xlsx)
 */
export function downloadXlsx(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
  sheetName: string = 'البيانات'
): void {
  exportToExcel(filename, sheetName, headers, rows);
}

/**
 * تصدير سجل التدقيق الأمني بصيغة Excel مع حماية RTL
 */
export function downloadEncryptedLog(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  exportToExcel(filename, 'سجل التدقيق الأمني', headers, rows);
}

/**
 * تنسيق الأرقام بفاصلة الآلاف المعتمدة في اليمن
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('ar-YE').format(n);
}
