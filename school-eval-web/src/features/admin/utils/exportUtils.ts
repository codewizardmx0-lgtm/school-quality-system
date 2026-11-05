import * as XLSX from 'xlsx';

/**
 * exportUtils.ts
 * Real Excel (.xlsx) and CSV export utilities with native Arabic & RTL support
 */

/**
 * Export data to a real Microsoft Excel (.xlsx) workbook with native RTL Arabic sheet direction.
 */
export function exportToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const wsData = [
    headers,
    ...rows.map((row) => row.map((cell) => cell ?? '')),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set Right-to-Left (RTL) worksheet layout for flawless Arabic experience
  ws['!dir'] = 'rtl';

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'البيانات');

  const safeFilename = filename.endsWith('.xlsx')
    ? filename
    : filename.replace(/\.[^/.]+$/, '') + '.xlsx';

  XLSX.writeFile(wb, safeFilename);
}

/**
 * Download CSV with UTF-8 BOM and explicit sep=, directive for automatic
 * multi-column separation and flawless Arabic rendering in Microsoft Excel.
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  // Explicit UTF-8 Byte Order Mark (BOM: EF BB BF) as binary Uint8Array
  // Guarantees Excel recognizes Arabic encoding regardless of OS locale.
  const bomBytes = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const sepDirective = 'sep=,\r\n';

  const csvRows = [
    headers.map((h) => `"${String(h ?? '').replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ];

  const csvContent = sepDirective + csvRows.join('\r\n');

  const blob = new Blob([bomBytes, csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  // Ensure .csv extension for accurate delimiter association in Excel
  const safeFilename = filename.endsWith('.csv')
    ? filename
    : filename.replace(/\.[^/.]+$/, '') + '.csv';

  link.setAttribute('href', url);
  link.setAttribute('download', safeFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Standard alias for real .xlsx export
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
 * Download encrypted audit log (defaults to real Excel .xlsx)
 */
export function downloadEncryptedLog(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  exportToExcel(filename, 'سجل التدقيق الأمني', headers, rows);
}

/**
 * Format number with Arabic locale thousands separator
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('ar-YE').format(n);
}
