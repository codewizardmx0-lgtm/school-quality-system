/**
 * dateUtils.ts
 * Arabic date/time formatting utilities (§6 - Dates stored as ISO 8601, displayed in Arabic Gregorian)
 */

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

/**
 * Format ISO 8601 date string to Arabic Gregorian long format
 * e.g. "2026-09-18T02:00:00Z" → "18 سبتمبر 2026"
 */
export function formatArabicDate(isoString: string): string {
  const date = new Date(isoString);
  const day = date.getDate();
  const month = ARABIC_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format ISO 8601 date to Arabic time format (12h)
 * e.g. "2026-09-18T14:30:00Z" → "02:30 م"
 */
export function formatArabicTime(isoString: string): string {
  const date = new Date(isoString);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const period = hours >= 12 ? 'م' : 'ص';
  hours = hours % 12 || 12;
  return `${hours.toString().padStart(2, '0')}:${minutes} ${period}`;
}

/**
 * Format ISO 8601 to combined Arabic date and time
 * e.g. "18 سبتمبر 2026 • 02:00 ص"
 */
export function formatArabicDateTime(isoString: string): string {
  return `${formatArabicDate(isoString)} • ${formatArabicTime(isoString)}`;
}

/**
 * Returns relative display (اليوم / أمس / date) with time
 * e.g. "اليوم • 04:30 م"
 */
export function formatRelativeArabic(isoString?: string | null): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeStr = formatArabicTime(isoString);
  if (dateDay.getTime() === today.getTime()) {
    return `اليوم • ${timeStr}`;
  } else if (dateDay.getTime() === yesterday.getTime()) {
    return `أمس • ${timeStr}`;
  }
  return formatArabicDateTime(isoString);
}

/**
 * Format file size bytes to human-readable Arabic string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} ميغابايت`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} غيغابايت`;
}

/**
 * Generate current ISO 8601 UTC timestamp
 */
export function nowIso(): string {
  return new Date().toISOString();
}
