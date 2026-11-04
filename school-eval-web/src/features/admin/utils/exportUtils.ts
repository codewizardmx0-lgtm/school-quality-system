/**
 * exportUtils.ts
 * Client-side CSV/XLSX export utilities with UTF-8 BOM for Arabic content
 */

/**
 * Download CSV with UTF-8 BOM for proper Arabic character support in Excel
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const BOM = '\uFEFF';
  const csvContent = [
    headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Simulate XLSX download by generating a CSV with .xlsx extension
 * (browser compatible without external library)
 */
export function downloadXlsx(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  // Use CSV format with xlsx extension for broad compatibility
  downloadCsv(filename.replace('.xlsx', '.csv'), headers, rows);
}

/**
 * Generate a mock encrypted audit log CSV
 */
export function downloadEncryptedLog(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  downloadCsv(filename, headers, rows);
}

/**
 * Format number with Arabic locale thousands separator
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('ar-SA');
}
