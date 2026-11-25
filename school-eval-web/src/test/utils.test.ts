import { describe, it, expect } from 'vitest';
import {
  formatArabicDate,
  formatArabicTime,
  formatRelativeArabic,
  formatFileSize,
} from '../features/admin/utils/dateUtils';
import { formatExportFilename } from '../features/admin/utils/exportUtils';
import { getStandardTimestamp } from '../features/standards/utils/standardsExportUtils';
import { normalizeStandardVersion } from '../features/standards/api/standardsApi';

describe('dateUtils', () => {
  it('formats ISO timestamps into Arabic Gregorian dates', () => {
    const formatted = formatArabicDate('2026-09-18T12:00:00Z');
    expect(formatted).toContain('سبتمبر');
    expect(formatted).toContain('2026');
  });

  it('formats 12-hour Arabic times with ص/م marker', () => {
    const time = formatArabicTime('2026-09-18T14:30:00Z');
    expect(time).toMatch(/^\d{2}:\d{2} [صم]$/);
  });

  it('handles null or invalid relative dates gracefully', () => {
    expect(formatRelativeArabic(null)).toBe('—');
    expect(formatRelativeArabic('invalid-date')).toBe('—');
  });

  it('formats file sizes in Arabic units across thresholds', () => {
    expect(formatFileSize(512)).toBe('512 بايت');
    expect(formatFileSize(2048)).toBe('2.0 كيلوبايت');
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.00 ميغابايت');
  });
});

describe('export filenames and standards normalization', () => {
  it('generates timestamped .xlsx and .pdf export filenames without legacy extensions', () => {
    const xlsxName = formatExportFilename('تقرير_المعايير.csv', 'xlsx');
    expect(xlsxName).toMatch(/^تقرير_المعايير_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.xlsx$/);

    const pdfName = formatExportFilename('Executive_Report', 'pdf');
    expect(pdfName).toMatch(/^Executive_Report_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.pdf$/);
  });

  it('generates standard export timestamp matching YYYY-MM-DD_HH-mm', () => {
    expect(getStandardTimestamp()).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}$/);
  });

  it('normalizes snake_case and camelCase standard version responses', () => {
    const normalized = normalizeStandardVersion({
      version_id: 7,
      version_no: '2026.2',
      status: 'Active',
      standards_count: 7,
      indicators_count: 109,
      total_weight: 100,
    });

    expect(normalized.versionId).toBe(7);
    expect(normalized.versionNo).toBe('2026.2');
    expect(normalized.status).toBe('Active');
    expect(normalized.indicatorsCount).toBe(109);
    expect(normalized.totalWeight).toBe(100);
  });
});
