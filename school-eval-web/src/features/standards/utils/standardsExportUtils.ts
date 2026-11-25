/**
 * Standards Export Utilities
 * التصدير المكتبي وفق المادة §7 من دليل معايير الواجهات (UI_STANDARDS.md)
 * - حظر ملفات CSV تماماً.
 * - التصدير إلى Excel (.xlsx) حصرياً بتنسيق عربي RTL.
 * - تسمية قياسية زمنية: [report_name]_[YYYY-MM-DD]_[HH-mm].xlsx
 */

import * as XLSX from 'xlsx';
import type { StandardNode, StandardVersionDetail, StandardWeightItem } from '../api/standardsTypes';

export interface StandardsExportMetadata {
  versionNo?: string;
  versionName?: string;
  status?: string;
  issueDate?: string;
  sourceNumber?: string;
  sourceOrganization?: string;
}

/**
 * توليد الطابع الزمني الموحد بصيغة YYYY-MM-DD_HH-mm
 */
export function getStandardTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  return `${year}-${month}-${day}_${hours}-${minutes}`;
}

/**
 * تصدير هيكل الشجرة المعيارية إلى مصنف Excel (.xlsx) مع الترويسة الوزارية الرسمية وبيانات الإصدار
 */
export function exportStandardsTreeToExcel(
  treeData:
    | StandardVersionDetail
    | {
        versionName?: string;
        versionNo?: string;
        status?: string;
        issueDate?: string;
        sourceNumber?: string;
        sourceOrganization?: string;
        standards: StandardNode[];
      },
  metadata?: StandardsExportMetadata
): void {
  const rows: Array<Record<string, string | number>> = [];

  const standards = treeData.standards || [];

  standards.forEach((std, stdIdx) => {
    const stdNumber = stdIdx + 1;
    const subStandards = std.subStandards || [];

    if (subStandards.length === 0) {
      rows.push({
        'رقم المعيار': stdNumber,
        'كود المعيار': std.code,
        'اسم المعيار الرئيسي': std.name,
        'الوزن النسبي (%)': std.weight,
        'كود المجال الفرعي': '—',
        'اسم المجال الفرعي': '—',
        'كود المؤشر': '—',
        'نص المؤشر الرسمي': '—',
        'وزن المؤشر': '—',
        'أدوات التحقق الملزمة': '—',
      });
      return;
    }

    subStandards.forEach((sub) => {
      const indicators = sub.indicators || [];

      if (indicators.length === 0) {
        rows.push({
          'رقم المعيار': stdNumber,
          'كود المعيار': std.code,
          'اسم المعيار الرئيسي': std.name,
          'الوزن النسبي (%)': std.weight,
          'كود المجال الفرعي': sub.code,
          'اسم المجال الفرعي': sub.name,
          'كود المؤشر': '—',
          'نص المؤشر الرسمي': '—',
          'وزن المؤشر': '—',
          'أدوات التحقق الملزمة': '—',
        });
        return;
      }

      indicators.forEach((ind) => {
        const tools = ind.verificationTools?.join(' • ') || ind.verificationMethod || 'فحص وثائق وسجلات';

        rows.push({
          'رقم المعيار': stdNumber,
          'كود المعيار': std.code,
          'اسم المعيار الرئيسي': std.name,
          'الوزن النسبي (%)': std.weight,
          'كود المجال الفرعي': sub.code,
          'اسم المجال الفرعي': sub.name,
          'كود المؤشر': ind.code,
          'نص المؤشر الرسمي': ind.name,
          'وزن المؤشر': ind.weight || '—',
          'أدوات التحقق الملزمة': tools,
        });
      });
    });
  });

  const metaTree = treeData as Partial<StandardsExportMetadata>;
  // استخلاص بيانات الترويسة الرسمية (الملاحظة 10)
  const versionNo = metadata?.versionNo || metaTree.versionNo || '2026.1';
  const versionName = metadata?.versionName || metaTree.versionName || 'وثيقة المعايير الوطنية المطورة للتقويم المدرسي';
  const rawStatus = (metadata?.status || metaTree.status || 'Draft').toLowerCase();
  const statusLabel =
    rawStatus === 'active'
      ? 'مُقرّ ونافذ حاكم للدورة الجارية'
      : rawStatus === 'approved'
      ? 'مُقرّ ومجدول للدورة القادمة'
      : rawStatus === 'draft'
      ? 'مسودة قيد التطوير والمراجعة'
      : 'إصدار سابق مؤرشف';
  const issueDate = metadata?.issueDate || metaTree.issueDate || new Date().toISOString().split('T')[0];
  const sourceNumber = metadata?.sourceNumber || metaTree.sourceNumber || 'قرار وزاري رقم (14) لسنة 2026م';
  const sourceOrg = metadata?.sourceOrganization || metaTree.sourceOrganization || 'وزارة التربية والتعليم والبحث العلمي';
  const exportTimestamp = new Date().toLocaleString('ar-YE', { dateStyle: 'full', timeStyle: 'short' });

  // أسطر الترويسة الوزارية الرسمية
  const headerRows = [
    ['الجمهورية اليمنية - وزارة التربية والتعليم والبحث العلمي - قطاع المعايير والرقابة والجودة'],
    [`اسم الوثيقة: ${versionName} • رقم الإصدار: ${versionNo} • الحالة الرسمية: ${statusLabel}`],
    [`تاريخ الإصدار: ${issueDate} • قرار الإقرار الرسمي: ${sourceNumber} • الجهة المصدرة: ${sourceOrg}`],
    [`تاريخ وساعة التصدير المكتبي: ${exportTimestamp} • توثيق رسمي معتمد للمنظومة`],
    [], // سطر فاصل فارغ قبل بيانات الجدول
  ];

  // إنشاء ورقة العمل والمصنف
  const worksheet = XLSX.utils.aoa_to_sheet(headerRows);
  XLSX.utils.sheet_add_json(worksheet, rows, { origin: 'A6' });

  // إعداد اتجاه RTL للورقة
  worksheet['!dir'] = 'rtl';

  // ضبط عرض الأعمدة
  worksheet['!cols'] = [
    { wch: 12 }, // رقم المعيار
    { wch: 14 }, // كود المعيار
    { wch: 32 }, // اسم المعيار الرئيسي
    { wch: 16 }, // الوزن النسبي (%)
    { wch: 18 }, // كود المجال الفرعي
    { wch: 32 }, // اسم المجال الفرعي
    { wch: 22 }, // كود المؤشر
    { wch: 50 }, // نص المؤشر الرسمي
    { wch: 14 }, // وزن المؤشر
    { wch: 36 }, // أدوات التحقق الملزمة
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'شجرة المعايير والمؤشرات');

  // اسم الملف وفق القاعدة الصارمة: standards_structure_[YYYY-MM-DD]_[HH-mm].xlsx
  const filename = `standards_structure_${getStandardTimestamp()}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * تصدير جدول أوزان المعايير وتوزيعها إلى مصنف Excel (.xlsx) مع الترويسة الوزارية وبيانات الإصدار
 */
export function exportWeightsTableToExcel(
  weights: StandardWeightItem[],
  totalWeight: number,
  versionNo: string,
  metadata?: StandardsExportMetadata
): void {
  const rows: Array<Record<string, string | number>> = weights.map((w, index) => ({
    'الرقم': index + 1,
    'كود المعيار': w.code,
    'اسم المعيار الوطني': w.name,
    'الوزن النسبي الحالي (%)': w.weight,
    'عدد المجالات الفرعية': w.subStandardsCount || 0,
    'عدد المؤشرات التابعة': w.indicatorsCount || 0,
    'متوسط وزن المؤشر': w.subWeightPerIndicator || (w.indicatorsCount ? Math.round((w.weight / w.indicatorsCount) * 100) / 100 : '—'),
  }));

  // سطر الإجمالي
  rows.push({
    'الرقم': '—',
    'كود المعيار': 'الإجمالي',
    'اسم المعيار الوطني': 'مجموع الأوزان الموزعة على المعايير',
    'الوزن النسبي الحالي (%)': totalWeight,
    'عدد المجالات الفرعية': '—',
    'عدد المؤشرات التابعة': '—',
    'متوسط وزن المؤشر': totalWeight === 100 ? 'متزن 100% ✓' : 'غير متزن ⚠',
  });

  // استخلاص بيانات الترويسة الرسمية (الملاحظة 10)
  const rawStatus = (metadata?.status || 'Draft').toLowerCase();
  const statusLabel =
    rawStatus === 'active'
      ? 'مُقرّ ونافذ حاكم للدورة الجارية'
      : rawStatus === 'approved'
      ? 'مُقرّ ومجدول للدورة القادمة'
      : rawStatus === 'draft'
      ? 'مسودة قيد التطوير والمراجعة'
      : 'إصدار سابق مؤرشف';
  const issueDate = metadata?.issueDate || new Date().toISOString().split('T')[0];
  const sourceNumber = metadata?.sourceNumber || 'قرار وزاري رقم (14) لسنة 2026م';
  const sourceOrg = metadata?.sourceOrganization || 'وزارة التربية والتعليم والبحث العلمي';
  const exportTimestamp = new Date().toLocaleString('ar-YE', { dateStyle: 'full', timeStyle: 'short' });

  // أسطر الترويسة الوزارية الرسمية
  const headerRows = [
    ['الجمهورية اليمنية - وزارة التربية والتعليم والبحث العلمي - قطاع المعايير والرقابة والجودة'],
    [`جدول توزيع ومعايرة الأوزان النسبية للمعايير الوطنية • رقم الإصدار: ${versionNo} • الحالة: ${statusLabel}`],
    [`تاريخ الإصدار: ${issueDate} • قرار الإقرار الرسمي: ${sourceNumber} • الجهة: ${sourceOrg}`],
    [`تاريخ وساعة التصدير المكتبي: ${exportTimestamp} • إجمالي الوزن الموزع: ${totalWeight}% (${totalWeight === 100 ? 'متزن قانونياً ✓' : 'غير متزن ⚠'})`],
    [], // سطر فاصل فارغ قبل بيانات الجدول
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(headerRows);
  XLSX.utils.sheet_add_json(worksheet, rows, { origin: 'A6' });

  worksheet['!dir'] = 'rtl';
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 14 },
    { wch: 36 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `أوزان المعايير ${versionNo}`);

  const filename = `standards_weights_${getStandardTimestamp()}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
