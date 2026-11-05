/**
 * exportUtils.ts
 * Client-side CSV export utilities with UTF-8 BOM and sep=, directive for Excel
 */

/**
 * Download CSV with UTF-8 BOM and explicit sep=, directive for automatic
 * multi-column separation and flawless Arabic rendering in Microsoft Excel.
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const BOM = '\uFEFF';
  const SEP_DIRECTIVE = 'sep=,\r\n';

  const csvRows = [
    headers.map((h) => `"${String(h ?? '').replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ];

  const csvContent = csvRows.join('\r\n');
  const fullContent = BOM + SEP_DIRECTIVE + csvContent;

  const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8;' });
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
 * Legacy alias for downloadCsv (ensures compatibility with existing calls)
 */
export function downloadXlsx(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  downloadCsv(filename, headers, rows);
}

/**
 * Download encrypted audit log CSV
 */
export function downloadEncryptedLog(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  downloadCsv(filename, headers, rows);
}

/**
 * Format number with Arabic locale thousands separator
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('ar-YE').format(n);
}
